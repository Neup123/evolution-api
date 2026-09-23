import { AutomationSafetySettings } from '@api/dto/settings.dto';
import { PrismaRepository } from '@api/repository/repository.service';
import { createHash } from 'crypto';

export const DEFAULT_AUTOMATION_SAFETY: Required<AutomationSafetySettings> = {
  enabled: false,
  typing: {
    enabled: true,
    minMs: 500,
    maxMs: 5000,
    charactersPerSecond: 18,
    jitterPercent: 10,
    presence: 'composing',
    applyToMediaCaptions: true,
  },
  rateLimit: {
    instancePerMinute: 60,
    instancePerDay: 5000,
    recipientPerMinute: 10,
    recipientPerDay: 250,
    minimumIntervalMs: 750,
    maxConcurrentSends: 4,
  },
  outreach: { enabled: true, newOrDormantRecipientsPerDay: 50, dormantAfterDays: 180 },
  quietHours: { enabled: false, start: '22:00', end: '08:00', timeZone: 'UTC' },
  duplicate: { enabled: true, windowSeconds: 30, similarityThresholdPercent: 100 },
  suppression: { recipients: [], allowlistEnabled: false, allowedRecipients: [] },
  failurePause: { enabled: true, threshold: 5, pauseSeconds: 300 },
  audit: { retentionDays: 90 },
};

export type NormalizedAutomationSafety = typeof DEFAULT_AUTOMATION_SAFETY;

export type OutboundSafetyDecision =
  | { allowed: true; auditId: string; delayMs: number; presence: 'composing' | 'recording' }
  | { allowed: false; code: string; retryAfterSeconds?: number };

const inFlightByInstance = new Map<string, number>();
const lastCleanupByInstance = new Map<string, number>();
const beginLocksByInstance = new Map<string, Promise<void>>();

export function normalizeAutomationSafety(value?: AutomationSafetySettings | null): NormalizedAutomationSafety {
  const typing = { ...DEFAULT_AUTOMATION_SAFETY.typing, ...(value?.typing ?? {}) };
  typing.maxMs = Math.max(typing.minMs, typing.maxMs);
  return {
    enabled: value?.enabled ?? DEFAULT_AUTOMATION_SAFETY.enabled,
    typing,
    rateLimit: { ...DEFAULT_AUTOMATION_SAFETY.rateLimit, ...(value?.rateLimit ?? {}) },
    outreach: { ...DEFAULT_AUTOMATION_SAFETY.outreach, ...(value?.outreach ?? {}) },
    quietHours: { ...DEFAULT_AUTOMATION_SAFETY.quietHours, ...(value?.quietHours ?? {}) },
    duplicate: { ...DEFAULT_AUTOMATION_SAFETY.duplicate, ...(value?.duplicate ?? {}) },
    suppression: {
      recipients: [...new Set((value?.suppression?.recipients ?? []).map(normalizeRecipient).filter(Boolean))],
      allowlistEnabled: value?.suppression?.allowlistEnabled ?? false,
      allowedRecipients: [
        ...new Set((value?.suppression?.allowedRecipients ?? []).map(normalizeRecipient).filter(Boolean)),
      ],
    },
    failurePause: { ...DEFAULT_AUTOMATION_SAFETY.failurePause, ...(value?.failurePause ?? {}) },
    audit: { ...DEFAULT_AUTOMATION_SAFETY.audit, ...(value?.audit ?? {}) },
  };
}

function normalizeRecipient(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s()+-]/g, '');
}

function isDirectRecipient(recipient: string): boolean {
  return /@(s\.whatsapp\.net|lid)$/.test(recipient);
}

function messageHasMedia(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  for (const [key, child] of Object.entries(value)) {
    if (/^(image|video|audio|document|sticker|ptv)(message)?$/i.test(key)) return true;
    if (messageHasMedia(child)) return true;
  }
  return false;
}

export function extractOutboundText(message: unknown, includeMediaCaptions = true): string {
  const fragments: string[] = [];
  const hasMedia = messageHasMedia(message);

  const visit = (value: unknown, key = '') => {
    if (typeof value === 'string' && /^(conversation|text|caption|description|title|footer(Text)?)$/i.test(key)) {
      if (includeMediaCaptions || !hasMedia || !/caption/i.test(key)) fragments.push(value);
      return;
    }
    if (!value || typeof value !== 'object' || Buffer.isBuffer(value)) return;
    if (Array.isArray(value)) {
      value.forEach((child) => visit(child, key));
      return;
    }
    Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
  };

  visit(message);
  return fragments.join('\n').trim();
}

export function normalizeDuplicateText(text: string): string {
  return text.normalize('NFKC').toLocaleLowerCase('und').replace(/\s+/gu, ' ').trim();
}

/**
 * Creates a privacy-preserving 64-bit SimHash from normalized character trigrams.
 * The original message cannot be reconstructed from this fingerprint.
 */
export function createSimilarityFingerprint(text: string): string | null {
  const normalized = normalizeDuplicateText(text);
  if (!normalized) return null;
  const padded = `  ${normalized}  `;
  const features = new Map<string, number>();
  for (let index = 0; index <= padded.length - 3; index += 1) {
    const feature = padded.slice(index, index + 3);
    features.set(feature, (features.get(feature) ?? 0) + 1);
  }
  const weights = Array.from({ length: 64 }, () => 0);
  for (const [feature, weight] of features) {
    const digest = createHash('sha256').update(feature).digest();
    for (let bit = 0; bit < 64; bit += 1) {
      const set = (digest[Math.floor(bit / 8)] & (1 << (7 - (bit % 8)))) !== 0;
      weights[bit] += set ? weight : -weight;
    }
  }
  let fingerprint = 0n;
  weights.forEach((weight, bit) => {
    if (weight >= 0) fingerprint |= 1n << BigInt(63 - bit);
  });
  return fingerprint.toString(16).padStart(16, '0');
}

export function fingerprintSimilarityPercent(left: string, right: string): number {
  if (!/^[0-9a-f]{16}$/i.test(left) || !/^[0-9a-f]{16}$/i.test(right)) return 0;
  let difference = BigInt(`0x${left}`) ^ BigInt(`0x${right}`);
  let differentBits = 0;
  while (difference) {
    difference &= difference - 1n;
    differentBits += 1;
  }
  return ((64 - differentBits) / 64) * 100;
}

export function calculateTypingDelay(
  textLength: number,
  policy: NormalizedAutomationSafety,
  random: () => number = Math.random,
): number {
  if (!policy.enabled || !policy.typing.enabled || textLength <= 0) return 0;
  const base = (textLength / policy.typing.charactersPerSecond) * 1000;
  const jitter = (random() * 2 - 1) * (policy.typing.jitterPercent / 100);
  return Math.round(Math.min(policy.typing.maxMs, Math.max(policy.typing.minMs, base * (1 + jitter))));
}

export function isQuietHours(policy: NormalizedAutomationSafety, now = new Date()): boolean {
  if (!policy.enabled || !policy.quietHours.enabled || policy.quietHours.start === policy.quietHours.end) return false;
  let hour: number;
  let minute: number;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: policy.quietHours.timeZone,
    }).formatToParts(now);
    hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
    minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  } catch {
    hour = now.getUTCHours();
    minute = now.getUTCMinutes();
  }
  const current = hour * 60 + minute;
  const [startHour, startMinute] = policy.quietHours.start.split(':').map(Number);
  const [endHour, endMinute] = policy.quietHours.end.split(':').map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  return start < end ? current >= start && current < end : current >= start || current < end;
}

export class OutboundSafetyService {
  constructor(private readonly repository: PrismaRepository) {}

  public preflightBlockCode(
    recipient: string,
    rawPolicy?: AutomationSafetySettings | null,
  ): 'recipient_suppressed' | 'recipient_not_allowed' | 'quiet_hours' | null {
    const policy = normalizeAutomationSafety(rawPolicy);
    if (!policy.enabled) return null;
    const normalizedRecipient = normalizeRecipient(recipient);
    const recipientMatches = (candidate: string) =>
      candidate === normalizedRecipient || candidate === normalizedRecipient.split('@')[0];
    if (policy.suppression.recipients.some(recipientMatches)) return 'recipient_suppressed';
    if (policy.suppression.allowlistEnabled && !policy.suppression.allowedRecipients.some(recipientMatches)) {
      return 'recipient_not_allowed';
    }
    if (isQuietHours(policy)) return 'quiet_hours';
    return null;
  }

  public async begin(
    instanceId: string,
    recipient: string,
    message: unknown,
    rawPolicy?: AutomationSafetySettings | null,
  ): Promise<OutboundSafetyDecision> {
    const previous = beginLocksByInstance.get(instanceId) ?? Promise.resolve();
    let unlock: () => void;
    const lock = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    const queued = previous.then(() => lock);
    beginLocksByInstance.set(instanceId, queued);
    await previous;
    try {
      return await this.evaluate(instanceId, recipient, message, rawPolicy);
    } finally {
      unlock();
      if (beginLocksByInstance.get(instanceId) === queued) beginLocksByInstance.delete(instanceId);
    }
  }

  /** Records relationship activity independently of optional message-archive persistence. */
  public async recordActivity(
    instanceId: string,
    recipient: string,
    fromMe: boolean,
    occurredAt: Date = new Date(),
  ): Promise<void> {
    const normalizedRecipient = normalizeRecipient(recipient);
    if (!isDirectRecipient(normalizedRecipient)) return;
    const firstField = fromMe ? 'firstOutboundAt' : 'firstInboundAt';
    const lastField = fromMe ? 'lastOutboundAt' : 'lastInboundAt';
    await this.repository.recipientEngagement.upsert({
      where: { instanceId_recipient: { instanceId, recipient: normalizedRecipient } },
      create: {
        instanceId,
        recipient: normalizedRecipient,
        [firstField]: occurredAt,
        [lastField]: occurredAt,
      },
      update: {
        [lastField]: occurredAt,
      },
    });
  }

  private async evaluate(
    instanceId: string,
    recipient: string,
    message: unknown,
    rawPolicy?: AutomationSafetySettings | null,
  ): Promise<OutboundSafetyDecision> {
    const policy = normalizeAutomationSafety(rawPolicy);
    const normalizedRecipient = normalizeRecipient(recipient);
    const text = extractOutboundText(message, policy.typing.applyToMediaCaptions);
    const messageHash = text ? createHash('sha256').update(text).digest('hex') : null;
    const messageFingerprint = text ? createSimilarityFingerprint(text) : null;
    const messageType = messageHasMedia(message) ? 'media' : text ? 'text' : 'other';

    if (!policy.enabled) {
      return { allowed: true, auditId: '', delayMs: 0, presence: policy.typing.presence };
    }

    await this.cleanup(instanceId, policy);

    const preflightBlockCode = this.preflightBlockCode(normalizedRecipient, policy);
    if (preflightBlockCode) {
      return this.block(instanceId, normalizedRecipient, messageHash, messageType, preflightBlockCode);
    }

    const active = inFlightByInstance.get(instanceId) ?? 0;
    if (active >= policy.rateLimit.maxConcurrentSends) {
      return this.block(instanceId, normalizedRecipient, messageHash, messageType, 'concurrency_limit', 1);
    }

    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60_000);
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const countable = { in: ['PENDING', 'SENT'] };
    const engagement = isDirectRecipient(normalizedRecipient)
      ? await this.repository.recipientEngagement.findUnique({
          where: { instanceId_recipient: { instanceId, recipient: normalizedRecipient } },
        })
      : null;
    const activeSince = new Date(now.getTime() - policy.outreach.dormantAfterDays * 86_400_000);
    const recipientCategory = !isDirectRecipient(normalizedRecipient)
      ? 'NON_DIRECT'
      : engagement?.lastInboundAt && engagement.lastInboundAt >= activeSince
        ? 'ENGAGED'
        : engagement?.lastInboundAt
          ? 'DORMANT'
          : 'NEW';

    const [instanceMinute, instanceDay, recipientMinute, recipientDay, lastSent, duplicateCandidates, recentFailures] =
      await Promise.all([
        this.repository.outboundMessageAudit.count({
          where: { instanceId, requestedAt: { gte: minuteAgo }, status: countable },
        }),
        this.repository.outboundMessageAudit.count({
          where: { instanceId, requestedAt: { gte: dayAgo }, status: countable },
        }),
        this.repository.outboundMessageAudit.count({
          where: { instanceId, recipient: normalizedRecipient, requestedAt: { gte: minuteAgo }, status: countable },
        }),
        this.repository.outboundMessageAudit.count({
          where: { instanceId, recipient: normalizedRecipient, requestedAt: { gte: dayAgo }, status: countable },
        }),
        this.repository.outboundMessageAudit.findFirst({
          where: { instanceId, recipient: normalizedRecipient, status: 'SENT' },
          orderBy: { sentAt: 'desc' },
        }),
        messageHash && policy.duplicate.enabled
          ? this.repository.outboundMessageAudit.findMany({
              where: {
                instanceId,
                recipient: normalizedRecipient,
                status: 'SENT',
                sentAt: { gte: new Date(now.getTime() - policy.duplicate.windowSeconds * 1000) },
              },
              select: { messageHash: true, messageFingerprint: true },
            })
          : Promise.resolve([]),
        policy.failurePause.enabled
          ? this.repository.outboundMessageAudit.findMany({
              where: { instanceId, status: { in: ['SENT', 'FAILED'] } },
              orderBy: { requestedAt: 'desc' },
              take: policy.failurePause.threshold,
            })
          : Promise.resolve([]),
      ]);

    if (
      recentFailures.length === policy.failurePause.threshold &&
      recentFailures.every((entry) => entry.status === 'FAILED')
    ) {
      const resumeAt = recentFailures[0].requestedAt.getTime() + policy.failurePause.pauseSeconds * 1000;
      if (resumeAt > now.getTime()) {
        return this.block(
          instanceId,
          normalizedRecipient,
          messageHash,
          messageType,
          'failure_circuit_open',
          Math.ceil((resumeAt - now.getTime()) / 1000),
          recipientCategory,
        );
      }
    }
    if (instanceMinute >= policy.rateLimit.instancePerMinute) {
      const oldest = await this.repository.outboundMessageAudit.findFirst({
        where: { instanceId, requestedAt: { gte: minuteAgo }, status: countable },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      });
      return this.block(
        instanceId,
        normalizedRecipient,
        messageHash,
        messageType,
        'instance_rate_limit',
        this.retryAfterWindow(oldest?.requestedAt, 60_000, now),
        recipientCategory,
      );
    }
    if (instanceDay >= policy.rateLimit.instancePerDay) {
      const oldest = await this.repository.outboundMessageAudit.findFirst({
        where: { instanceId, requestedAt: { gte: dayAgo }, status: countable },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      });
      return this.block(
        instanceId,
        normalizedRecipient,
        messageHash,
        messageType,
        'instance_daily_limit',
        this.retryAfterWindow(oldest?.requestedAt, 86_400_000, now),
        recipientCategory,
      );
    }
    if (recipientMinute >= policy.rateLimit.recipientPerMinute) {
      const oldest = await this.repository.outboundMessageAudit.findFirst({
        where: {
          instanceId,
          recipient: normalizedRecipient,
          requestedAt: { gte: minuteAgo },
          status: countable,
        },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      });
      return this.block(
        instanceId,
        normalizedRecipient,
        messageHash,
        messageType,
        'recipient_rate_limit',
        this.retryAfterWindow(oldest?.requestedAt, 60_000, now),
        recipientCategory,
      );
    }
    if (recipientDay >= policy.rateLimit.recipientPerDay) {
      const oldest = await this.repository.outboundMessageAudit.findFirst({
        where: {
          instanceId,
          recipient: normalizedRecipient,
          requestedAt: { gte: dayAgo },
          status: countable,
        },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      });
      return this.block(
        instanceId,
        normalizedRecipient,
        messageHash,
        messageType,
        'recipient_daily_limit',
        this.retryAfterWindow(oldest?.requestedAt, 86_400_000, now),
        recipientCategory,
      );
    }
    if (lastSent?.sentAt) {
      const remaining = policy.rateLimit.minimumIntervalMs - (now.getTime() - lastSent.sentAt.getTime());
      if (remaining > 0) {
        return this.block(
          instanceId,
          normalizedRecipient,
          messageHash,
          messageType,
          'minimum_interval',
          Math.ceil(remaining / 1000),
          recipientCategory,
        );
      }
    }
    const duplicate = duplicateCandidates.some(
      (candidate) =>
        candidate.messageHash === messageHash ||
        (policy.duplicate.similarityThresholdPercent < 100 &&
          messageFingerprint &&
          candidate.messageFingerprint &&
          fingerprintSimilarityPercent(messageFingerprint, candidate.messageFingerprint) >=
            policy.duplicate.similarityThresholdPercent),
    );
    if (duplicate) {
      return this.block(
        instanceId,
        normalizedRecipient,
        messageHash,
        messageType,
        'duplicate_message',
        policy.duplicate.windowSeconds,
        recipientCategory,
        messageFingerprint,
      );
    }

    if (policy.outreach.enabled && (recipientCategory === 'NEW' || recipientCategory === 'DORMANT')) {
      const alreadyCounted = engagement?.lastOutreachAt && engagement.lastOutreachAt >= dayAgo;
      if (!alreadyCounted) {
        const outreachCount = await this.repository.recipientEngagement.count({
          where: { instanceId, lastOutreachAt: { gte: dayAgo } },
        });
        if (outreachCount >= policy.outreach.newOrDormantRecipientsPerDay) {
          const oldest = await this.repository.recipientEngagement.findFirst({
            where: { instanceId, lastOutreachAt: { gte: dayAgo } },
            orderBy: { lastOutreachAt: 'asc' },
            select: { lastOutreachAt: true },
          });
          return this.block(
            instanceId,
            normalizedRecipient,
            messageHash,
            messageType,
            'outreach_recipient_limit',
            this.retryAfterWindow(oldest?.lastOutreachAt, 86_400_000, now),
            recipientCategory,
          );
        }
        await this.repository.recipientEngagement.upsert({
          where: { instanceId_recipient: { instanceId, recipient: normalizedRecipient } },
          create: { instanceId, recipient: normalizedRecipient, lastOutreachAt: now },
          update: { lastOutreachAt: now },
        });
      }
    }

    const delayMs = normalizedRecipient.includes('@broadcast')
      ? 0
      : calculateTypingDelay(Array.from(text).length, policy);
    const audit = await this.repository.outboundMessageAudit.create({
      data: {
        instanceId,
        recipient: normalizedRecipient,
        messageHash,
        messageFingerprint,
        messageType,
        status: 'PENDING',
        recipientCategory,
        delayMs,
      },
    });
    inFlightByInstance.set(instanceId, active + 1);
    return { allowed: true, auditId: audit.id, delayMs, presence: policy.typing.presence };
  }

  public async sent(instanceId: string, auditId: string): Promise<void> {
    try {
      if (auditId) {
        await this.repository.outboundMessageAudit.update({
          where: { id: auditId },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } finally {
      if (auditId) this.release(instanceId);
    }
  }

  public async failed(instanceId: string, auditId: string, reason?: string): Promise<void> {
    void reason;
    try {
      if (auditId) {
        await this.repository.outboundMessageAudit.update({
          where: { id: auditId },
          data: { status: 'FAILED', reason: 'send_failed' },
        });
      }
    } finally {
      if (auditId) this.release(instanceId);
    }
  }

  private release(instanceId: string) {
    const active = inFlightByInstance.get(instanceId) ?? 0;
    if (active <= 1) inFlightByInstance.delete(instanceId);
    else inFlightByInstance.set(instanceId, active - 1);
  }

  private retryAfterWindow(oldest: Date | null | undefined, windowMs: number, now: Date): number {
    if (!oldest) return Math.ceil(windowMs / 1000);
    return Math.max(1, Math.ceil((oldest.getTime() + windowMs - now.getTime()) / 1000));
  }

  private async block(
    instanceId: string,
    recipient: string,
    messageHash: string | null,
    messageType: string,
    reason: string,
    retryAfterSeconds?: number,
    recipientCategory?: string,
    messageFingerprint: string | null = null,
  ): Promise<OutboundSafetyDecision> {
    await this.repository.outboundMessageAudit.create({
      data: {
        instanceId,
        recipient,
        messageHash,
        messageFingerprint,
        messageType,
        status: 'BLOCKED',
        reason,
        recipientCategory,
      },
    });
    return { allowed: false, code: reason, retryAfterSeconds };
  }

  private async cleanup(instanceId: string, policy: NormalizedAutomationSafety): Promise<void> {
    const now = Date.now();
    if (now - (lastCleanupByInstance.get(instanceId) ?? 0) < 3_600_000) return;
    lastCleanupByInstance.set(instanceId, now);
    await this.repository.outboundMessageAudit.deleteMany({
      where: { instanceId, requestedAt: { lt: new Date(now - policy.audit.retentionDays * 86_400_000) } },
    });
  }
}
