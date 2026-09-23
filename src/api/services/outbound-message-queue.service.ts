import { SendTextDto } from '@api/dto/sendMessage.dto';
import { AutomationSafetySettings } from '@api/dto/settings.dto';
import { PrismaRepository } from '@api/repository/repository.service';

import { normalizeAutomationSafety } from './outbound-safety.service';

export const QUEUEABLE_OUTBOUND_SAFETY_CODES = new Set([
  'concurrency_limit',
  'failure_circuit_open',
  'instance_rate_limit',
  'instance_daily_limit',
  'minimum_interval',
  'outreach_recipient_limit',
  'recipient_rate_limit',
  'recipient_daily_limit',
]);

export type OutboundQueueSnapshot = {
  pendingCount: number;
  processingCount: number;
  failedCount: number;
  nextSendAt: Date | null;
  estimatedEmptyAt: Date | null;
  items: Array<{
    id: string;
    recipient: string;
    status: string;
    reason: string | null;
    attempts: number;
    requestedAt: Date;
    scheduledAt: Date;
    lastError: string | null;
  }>;
};

export class OutboundQueueCapacityError extends Error {
  constructor(
    public readonly code:
      | 'outbound_queue_instance_minute_capacity'
      | 'outbound_queue_instance_daily_capacity'
      | 'outbound_queue_recipient_minute_capacity'
      | 'outbound_queue_recipient_daily_capacity'
      | 'outbound_queue_outreach_daily_capacity',
    public readonly retryAfterSeconds: number,
    public readonly details: {
      scope: 'instance' | 'recipient' | 'outreach';
      window: 'minute' | 'day';
      limit: number;
      sent: number;
      queued: number;
      total: number;
    },
  ) {
    super(
      `Outbound queue capacity reached for ${details.scope} ${details.window} limit ` +
        `(${details.sent} sent + ${details.queued} queued = ${details.total}; limit ${details.limit}).`,
    );
  }
}

export class OutboundQueueWaitTooLongError extends Error {
  public readonly code = 'outbound_queue_wait_too_long';

  constructor(
    public readonly retryAfterSeconds: number,
    public readonly details: {
      queueTailAt: Date;
      requestedSendAt: Date;
      gapSeconds: number;
      maxGapSeconds: number;
    },
  ) {
    super(
      `Outbound message was not queued because its send time would be ${details.gapSeconds}s after the queue tail; ` +
        `the configured maximum is ${details.maxGapSeconds}s.`,
    );
  }
}

export class OutboundMessageQueueService {
  constructor(
    private readonly repository: PrismaRepository,
    private readonly maxTailGapMs = 120_000,
  ) {}

  public async enqueueText(
    instanceId: string,
    recipient: string,
    payload: SendTextDto,
    reason: string,
    retryAfterSeconds: number,
    rawPolicy?: AutomationSafetySettings | null,
    isIntegration = false,
  ) {
    const policy = normalizeAutomationSafety(rawPolicy);
    const now = new Date();
    const minuteAgo = new Date(now.getTime() - 60_000);
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const queuedStatuses = ['PENDING', 'PROCESSING'];

    await this.repository.outboundMessageQueue.deleteMany({
      where: {
        instanceId,
        status: 'FAILED',
        requestedAt: { lt: new Date(now.getTime() - policy.audit.retentionDays * 86_400_000) },
      },
    });

    const [
      instanceMinuteRows,
      instanceDayRows,
      recipientMinuteRows,
      recipientDayRows,
      queuedInstance,
      queuedRecipient,
      queuedOutreachRecipients,
      recentOutreachRecipients,
      lastQueued,
    ] = await Promise.all([
      this.repository.outboundMessageAudit.findMany({
        where: { instanceId, requestedAt: { gte: minuteAgo }, status: 'SENT' },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
      this.repository.outboundMessageAudit.findMany({
        where: { instanceId, requestedAt: { gte: dayAgo }, status: 'SENT' },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
      this.repository.outboundMessageAudit.findMany({
        where: { instanceId, recipient, requestedAt: { gte: minuteAgo }, status: 'SENT' },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
      this.repository.outboundMessageAudit.findMany({
        where: { instanceId, recipient, requestedAt: { gte: dayAgo }, status: 'SENT' },
        orderBy: { requestedAt: 'asc' },
        select: { requestedAt: true },
      }),
      this.repository.outboundMessageQueue.count({ where: { instanceId, status: { in: queuedStatuses } } }),
      this.repository.outboundMessageQueue.count({
        where: { instanceId, recipient, status: { in: queuedStatuses } },
      }),
      this.repository.outboundMessageQueue.findMany({
        where: { instanceId, status: { in: queuedStatuses }, reason: 'outreach_recipient_limit' },
        distinct: ['recipient'],
        select: { recipient: true },
      }),
      this.repository.recipientEngagement.findMany({
        where: { instanceId, lastOutreachAt: { gte: dayAgo } },
        orderBy: { lastOutreachAt: 'asc' },
        select: { recipient: true, lastOutreachAt: true },
      }),
      this.repository.outboundMessageQueue.findFirst({
        where: { instanceId, status: { in: queuedStatuses } },
        orderBy: { scheduledAt: 'desc' },
        select: { scheduledAt: true },
      }),
    ]);

    const capacity = (
      code: OutboundQueueCapacityError['code'],
      scope: OutboundQueueCapacityError['details']['scope'],
      window: OutboundQueueCapacityError['details']['window'],
      limit: number,
      sentRows: Array<{ requestedAt?: Date; lastOutreachAt?: Date | null }>,
      queued: number,
    ) => {
      const sent = sentRows.length;
      if (sent + queued < limit) return;
      const oldest = sentRows[0]?.requestedAt ?? sentRows[0]?.lastOutreachAt;
      const windowMs = window === 'minute' ? 60_000 : 86_400_000;
      const retryAfterSeconds = oldest
        ? Math.max(1, Math.ceil((oldest.getTime() + windowMs - now.getTime()) / 1000))
        : Math.ceil(windowMs / 1000);
      throw new OutboundQueueCapacityError(code, retryAfterSeconds, {
        scope,
        window,
        limit,
        sent,
        queued,
        total: sent + queued,
      });
    };

    capacity(
      'outbound_queue_instance_minute_capacity',
      'instance',
      'minute',
      policy.rateLimit.instancePerMinute,
      instanceMinuteRows,
      queuedInstance,
    );
    capacity(
      'outbound_queue_instance_daily_capacity',
      'instance',
      'day',
      policy.rateLimit.instancePerDay,
      instanceDayRows,
      queuedInstance,
    );
    capacity(
      'outbound_queue_recipient_minute_capacity',
      'recipient',
      'minute',
      policy.rateLimit.recipientPerMinute,
      recipientMinuteRows,
      queuedRecipient,
    );
    capacity(
      'outbound_queue_recipient_daily_capacity',
      'recipient',
      'day',
      policy.rateLimit.recipientPerDay,
      recipientDayRows,
      queuedRecipient,
    );

    if (reason === 'outreach_recipient_limit' && policy.outreach.enabled) {
      const queuedRecipients = new Set(queuedOutreachRecipients.map((row) => row.recipient));
      const queuedOutreach = queuedRecipients.has(recipient) ? queuedRecipients.size - 1 : queuedRecipients.size;
      capacity(
        'outbound_queue_outreach_daily_capacity',
        'outreach',
        'day',
        policy.outreach.newOrDormantRecipientsPerDay,
        recentOutreachRecipients,
        queuedOutreach,
      );
    }

    const requestedSchedule = now.getTime() + Math.max(1, retryAfterSeconds) * 1000;
    const afterExistingQueue = lastQueued
      ? lastQueued.scheduledAt.getTime() + Math.max(1, policy.rateLimit.minimumIntervalMs)
      : requestedSchedule;
    const scheduledAt = new Date(Math.max(requestedSchedule, afterExistingQueue));

    if (lastQueued) {
      const gapMs = scheduledAt.getTime() - lastQueued.scheduledAt.getTime();
      if (gapMs > this.maxTailGapMs) {
        throw new OutboundQueueWaitTooLongError(Math.max(1, Math.ceil(gapMs / 1000)), {
          queueTailAt: lastQueued.scheduledAt,
          requestedSendAt: scheduledAt,
          gapSeconds: Math.ceil(gapMs / 1000),
          maxGapSeconds: Math.floor(this.maxTailGapMs / 1000),
        });
      }
    }

    const item = await this.repository.outboundMessageQueue.create({
      data: {
        instanceId,
        recipient,
        payload: JSON.parse(JSON.stringify({ data: payload, isIntegration })),
        settingsTemplateId: payload.settingsTemplateId || null,
        reason,
        scheduledAt,
      },
    });
    const position =
      (await this.repository.outboundMessageQueue.count({
        where: {
          instanceId,
          status: { in: queuedStatuses },
          scheduledAt: { lte: item.scheduledAt },
        },
      })) || 1;

    return {
      queued: true,
      queueId: item.id,
      status: item.status,
      reason,
      position,
      scheduledAt: item.scheduledAt,
      retryAfterSeconds: Math.max(1, Math.ceil((item.scheduledAt.getTime() - now.getTime()) / 1000)),
    };
  }

  public async snapshot(instanceId: string, limit = 100): Promise<OutboundQueueSnapshot> {
    const safeLimit = Math.min(500, Math.max(1, Number(limit) || 100));
    const [pendingCount, processingCount, failedCount, items, nextPending, lastPending] = await Promise.all([
      this.repository.outboundMessageQueue.count({ where: { instanceId, status: 'PENDING' } }),
      this.repository.outboundMessageQueue.count({ where: { instanceId, status: 'PROCESSING' } }),
      this.repository.outboundMessageQueue.count({ where: { instanceId, status: 'FAILED' } }),
      this.repository.outboundMessageQueue.findMany({
        where: { instanceId, status: { in: ['PENDING', 'PROCESSING', 'FAILED'] } },
        orderBy: [{ scheduledAt: 'asc' }, { requestedAt: 'asc' }],
        take: safeLimit,
        select: {
          id: true,
          recipient: true,
          status: true,
          reason: true,
          attempts: true,
          requestedAt: true,
          scheduledAt: true,
          lastError: true,
        },
      }),
      this.repository.outboundMessageQueue.findFirst({
        where: { instanceId, status: { in: ['PENDING', 'PROCESSING'] } },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      }),
      this.repository.outboundMessageQueue.findFirst({
        where: { instanceId, status: { in: ['PENDING', 'PROCESSING'] } },
        orderBy: { scheduledAt: 'desc' },
        select: { scheduledAt: true },
      }),
    ]);
    return {
      pendingCount,
      processingCount,
      failedCount,
      nextSendAt: nextPending?.scheduledAt ?? null,
      estimatedEmptyAt: lastPending?.scheduledAt ?? null,
      items,
    };
  }

  public async clear(instanceId: string) {
    const processingCount = await this.repository.outboundMessageQueue.count({
      where: { instanceId, status: 'PROCESSING' },
    });
    const result = await this.repository.outboundMessageQueue.deleteMany({ where: { instanceId } });
    return {
      cleared: true,
      deletedCount: result.count,
      processingAtClearTime: processingCount,
      note:
        processingCount > 0
          ? 'Pending rows were deleted. A message already handed to WhatsApp may still complete.'
          : 'All queued messages were deleted before delivery.',
    };
  }

  public async claimNext(instanceId: string) {
    const now = new Date();
    await this.repository.outboundMessageQueue.updateMany({
      where: {
        instanceId,
        status: 'PROCESSING',
        lockedAt: { lt: new Date(now.getTime() - 300_000) },
      },
      data: { status: 'PENDING', lockedAt: null },
    });
    const candidate = await this.repository.outboundMessageQueue.findFirst({
      where: { instanceId, status: 'PENDING', scheduledAt: { lte: now } },
      orderBy: [{ scheduledAt: 'asc' }, { requestedAt: 'asc' }],
    });
    if (!candidate) return null;
    const claim = await this.repository.outboundMessageQueue.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PROCESSING', lockedAt: now, attempts: { increment: 1 } },
    });
    if (claim.count !== 1) return null;
    return this.repository.outboundMessageQueue.findUnique({ where: { id: candidate.id } });
  }

  public async complete(id: string): Promise<void> {
    await this.repository.outboundMessageQueue.deleteMany({ where: { id } });
  }

  public async reschedule(id: string, reason: string, retryAfterSeconds: number, lastError?: string): Promise<void> {
    await this.repository.outboundMessageQueue.updateMany({
      where: { id },
      data: {
        status: 'PENDING',
        reason,
        scheduledAt: new Date(Date.now() + Math.max(1, retryAfterSeconds) * 1000),
        lockedAt: null,
        lastError: lastError?.slice(0, 4000) ?? null,
      },
    });
  }

  public async fail(id: string, error: string): Promise<void> {
    await this.repository.outboundMessageQueue.updateMany({
      where: { id },
      data: { status: 'FAILED', lockedAt: null, lastError: error.slice(0, 4000) },
    });
  }
}
