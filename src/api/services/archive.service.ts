import { PrismaRepository } from '@api/repository/repository.service';
import { Archive, ConfigService, Database, S3 } from '@config/env.config';
import { Logger } from '@config/logger.config';
import { Prisma } from '@prisma/client';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'crypto';

class ArchiveHttpException {
  constructor(status: number, error: string, messages: unknown[]) {
    throw { status, error, message: messages.length ? messages : undefined };
  }
}

class BadRequestException extends ArchiveHttpException {
  constructor(...messages: unknown[]) {
    super(400, 'Bad Request', messages);
  }
}

class ForbiddenException extends ArchiveHttpException {
  constructor(...messages: unknown[]) {
    super(403, 'Forbidden', messages);
  }
}

class NotFoundException extends ArchiveHttpException {
  constructor(...messages: unknown[]) {
    super(404, 'Not Found', messages);
  }
}

type ArchiveEventInput = {
  instanceName: string;
  event: string;
  data: unknown;
  dateTime?: string;
  sender?: string;
};

export type ArchivePolicyDocument = {
  capture?: Record<string, boolean>;
  media?: { mode?: 'all' | 'images' | 'none' | 'metadata'; types?: string[] };
  directions?: Array<'incoming' | 'outgoing'>;
  retentionDays?: number | null;
  recovery?: { enabled?: boolean; since?: string };
};

type PurgeCriteria = {
  before?: string;
  entityJid?: string;
  groupJid?: string;
  eventTypes?: string[];
  mediaOnly?: boolean;
};

const categoryFor = (event: string) => {
  const upper = event.toUpperCase();
  if (upper.includes('MESSAGE_RECEIPT')) return 'receipts';
  if (upper.includes('REACTION')) return 'reactions';
  if (upper.includes('MESSAGE')) return 'messages';
  if (upper.includes('CONTACT')) return 'contacts';
  if (upper.includes('CHAT')) return 'chats';
  if (upper.includes('GROUP')) return 'groups';
  if (upper.includes('CALL')) return 'calls';
  return 'events';
};

const entityFor = (event: string) => {
  const category = categoryFor(event);
  return category === 'messages' || category === 'receipts' || category === 'reactions'
    ? 'message'
    : category.replace(/s$/, '');
};

const firstObject = (value: unknown): Record<string, any> => {
  if (Array.isArray(value)) return firstObject(value[0]);
  return value && typeof value === 'object' ? (value as Record<string, any>) : {};
};

const deepMerge = (base: Record<string, any>, next: Record<string, any>): Record<string, any> => {
  const result = { ...base };
  for (const [key, value] of Object.entries(next || {})) {
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? deepMerge((result[key] as Record<string, any>) || {}, value as Record<string, any>)
        : value;
  }
  return result;
};

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

export class ArchiveService {
  private readonly logger = new Logger('ArchiveService');
  private readonly config: Archive;
  private readonly provider: string;
  private readonly key?: Buffer;
  private readonly s3?: S3;

  constructor(
    private readonly prisma: PrismaRepository,
    configService: ConfigService,
    private readonly deleteArchiveObject?: (objectKey: string) => Promise<unknown>,
  ) {
    this.config = configService.get<Archive>('ARCHIVE');
    this.provider = configService.get<Database>('DATABASE').PROVIDER;
    this.s3 = configService.get<S3>('S3');
    if (this.config.MASTER_KEY) {
      const decoded = Buffer.from(this.config.MASTER_KEY, 'base64');
      this.key = decoded.length === 32 ? decoded : undefined;
    }
    if (this.config.ENABLED && this.provider !== 'postgresql' && this.provider !== 'psql_bouncer') {
      this.logger.warn('WhatsApp archive is PostgreSQL-only; capture is disabled for this provider.');
    }
    if (this.config.ENABLED && !this.key) {
      this.logger.error('ARCHIVE_MASTER_KEY must be a base64-encoded 32-byte key; archive capture will fail closed.');
    }
  }

  public isEnabled() {
    return this.config.ENABLED && (this.provider === 'postgresql' || this.provider === 'psql_bouncer');
  }

  public async authorize(key: string | undefined, requiredScope: string) {
    const actorHash = this.hash(Buffer.from(key || 'missing'));
    const audit = async (result: 'allowed' | 'denied') =>
      this.prisma.archiveAccessLog.create({
        data: {
          id: randomUUID(),
          operation: 'authorize',
          scope: requiredScope,
          actorHash,
          parameters: {},
          result,
        },
      });
    if (!this.config.API_KEY) {
      await audit('denied');
      throw new ForbiddenException('Archive API key is not configured');
    }
    if (!key) {
      await audit('denied');
      throw new ForbiddenException('Missing x-archive-key header');
    }
    const actual = Buffer.from(key);
    const expected = Buffer.from(this.config.API_KEY);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      await audit('denied');
      throw new ForbiddenException('Invalid archive API key');
    }
    if (!this.config.API_SCOPES.includes(requiredScope) && !this.config.API_SCOPES.includes('archive:admin')) {
      await audit('denied');
      throw new ForbiddenException(`Archive key does not include ${requiredScope}`);
    }
    await audit('allowed');
  }

  public async capture(input: ArchiveEventInput): Promise<void> {
    if (!this.isEnabled()) return;
    if (!this.key) throw new Error('Archive encryption key is invalid');

    const raw = firstObject(input.data);
    const entityType = entityFor(input.event);
    const entityJid = this.extractJid(raw);
    const messageId = raw?.key?.id || raw?.id || raw?.messageId || null;
    const occurredAt = this.extractDate(raw, input.dateTime);
    const account = await this.prisma.archiveAccount.upsert({
      where: { instanceName: input.instanceName },
      create: { id: randomUUID(), instanceName: input.instanceName, ownerJid: input.sender || null },
      update: { ownerJid: input.sender || undefined },
    });
    const policy = await this.resolvePolicy(account.id, input.instanceName, entityType, entityJid);
    const category = categoryFor(input.event);
    const direction = (raw?.key?.fromMe ?? raw?.fromMe) ? 'outgoing' : 'incoming';
    const retain =
      policy.capture?.[category] !== false &&
      policy.capture?.events !== false &&
      (!policy.directions?.length || policy.directions.includes(direction));
    const serialized = Buffer.from(JSON.stringify(input.data ?? null));
    const payloadHash = this.hash(serialized);
    const projection = retain ? this.project(input.event, entityType, entityJid, messageId, raw) : {};
    const encrypted = retain ? this.encrypt(serialized) : undefined;

    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${account.id}))`;
      const last = await tx.archiveEvent.findFirst({
        where: { accountId: account.id },
        orderBy: { sequence: 'desc' },
        select: { sequence: true, recordHash: true },
      });
      const sequence = (last?.sequence || 0n) + 1n;
      const eventId = randomUUID();
      const recordHash = this.hash(
        Buffer.from(
          [
            account.id,
            sequence.toString(),
            input.event,
            occurredAt.toISOString(),
            payloadHash,
            last?.recordHash || '',
          ].join('|'),
        ),
      );
      await tx.archiveEvent.create({
        data: {
          id: eventId,
          accountId: account.id,
          instanceName: input.instanceName,
          sequence,
          eventType: input.event,
          entityType,
          entityJid,
          messageId,
          occurredAt,
          projection,
          payloadCiphertext: encrypted?.ciphertext,
          payloadIv: encrypted?.iv,
          payloadTag: encrypted?.tag,
          payloadHash,
          previousHash: last?.recordHash,
          recordHash,
          excluded: !retain,
        },
      });
      await tx.archiveAccount.update({
        where: { id: account.id },
        data: { lastSequence: sequence, headHash: recordHash },
      });
      if (retain)
        await this.captureDerived(
          tx,
          account.id,
          eventId,
          input.event,
          entityType,
          entityJid,
          messageId,
          raw,
          policy,
          occurredAt,
          sequence,
        );
    });
  }

  public async status(instanceName?: string) {
    const where = instanceName ? { instanceName } : {};
    const accounts = await this.prisma.archiveAccount.findMany({ where, orderBy: { instanceName: 'asc' } });
    const result = await Promise.all(
      accounts.map(async (account) => {
        const [events, media, last] = await Promise.all([
          this.prisma.archiveEvent.count({ where: { accountId: account.id } }),
          this.prisma.archiveMedia.count({ where: { accountId: account.id, purgedAt: null } }),
          this.prisma.archiveEvent.findFirst({ where: { accountId: account.id }, orderBy: { sequence: 'desc' } }),
        ]);
        return {
          ...account,
          events,
          media,
          lastSequence: account.lastSequence.toString(),
          lastCapturedAt: last?.capturedAt || null,
        };
      }),
    );
    return { enabled: this.isEnabled(), provider: this.provider, accounts: result };
  }

  public async listEvents(instanceName: string, query: Record<string, any>, includePayload = false) {
    const account = await this.account(instanceName);
    const take = Math.min(Math.max(Number(query.limit) || 100, 1), 1000);
    const where: Prisma.ArchiveEventWhereInput = {
      accountId: account.id,
      entityType: query.entityType || undefined,
      entityJid: query.entityJid || query.groupJid || undefined,
      eventType: query.eventType || undefined,
      occurredAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lt: query.before ? new Date(query.before) : undefined,
      },
    };
    const rows = await this.prisma.archiveEvent.findMany({ where, orderBy: { sequence: 'desc' }, take });
    return rows.map((row) => ({
      ...row,
      sequence: row.sequence.toString(),
      payload: includePayload && !row.excluded ? this.decrypt(row) : undefined,
      payloadCiphertext: undefined,
      payloadIv: undefined,
      payloadTag: undefined,
    }));
  }

  public async listMedia(instanceName: string, query: Record<string, any>) {
    const account = await this.account(instanceName);
    const take = Math.min(Math.max(Number(query.limit) || 100, 1), 1000);
    const rows = await this.prisma.archiveMedia.findMany({
      where: {
        accountId: account.id,
        entityJid: query.entityJid || query.groupJid || undefined,
        mediaType: query.mediaType || undefined,
        state: query.state || undefined,
        purgedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((row) => ({ ...row, sizeBytes: row.sizeBytes?.toString() || null }));
  }

  public async messageHistory(instanceName: string, messageId: string, chatJid?: string) {
    const account = await this.account(instanceName);
    const message = await this.prisma.archiveMessage.findFirst({
      where: { accountId: account.id, waMessageId: messageId, chatJid: chatJid || undefined },
    });
    if (!message) throw new NotFoundException('Archived message not found');
    const revisions = await this.prisma.archiveMessageRevision.findMany({
      where: { archiveMessageId: message.id },
      orderBy: { revision: 'asc' },
    });
    return { message, revisions };
  }

  public async listReceipts(instanceName: string, query: Record<string, any>) {
    const account = await this.account(instanceName);
    return this.prisma.archiveReceipt.findMany({
      where: {
        accountId: account.id,
        waMessageId: query.messageId || undefined,
        chatJid: query.entityJid || undefined,
      },
      orderBy: { occurredAt: 'desc' },
      take: this.take(query.limit),
    });
  }

  public async listReactions(instanceName: string, query: Record<string, any>) {
    const account = await this.account(instanceName);
    return this.prisma.archiveReaction.findMany({
      where: {
        accountId: account.id,
        waMessageId: query.messageId || undefined,
        chatJid: query.entityJid || undefined,
      },
      orderBy: { occurredAt: 'desc' },
      take: this.take(query.limit),
    });
  }

  public async listMemberships(instanceName: string, query: Record<string, any>) {
    const account = await this.account(instanceName);
    return this.prisma.archiveGroupMembership.findMany({
      where: {
        accountId: account.id,
        groupJid: query.groupJid || undefined,
        participantJid: query.participantJid || undefined,
      },
      orderBy: { validFrom: 'desc' },
      take: this.take(query.limit),
    });
  }

  public async listCalls(instanceName: string, query: Record<string, any>) {
    const account = await this.account(instanceName);
    return this.prisma.archiveCall.findMany({
      where: { accountId: account.id, peerJid: query.peerJid || undefined, groupJid: query.groupJid || undefined },
      orderBy: { occurredAt: 'desc' },
      take: this.take(query.limit),
    });
  }

  public async listSyncGaps(instanceName: string, query: Record<string, any>) {
    const account = await this.account(instanceName);
    return this.prisma.archiveSyncGap.findMany({
      where: { accountId: account.id, status: query.status || undefined, entityJid: query.entityJid || undefined },
      orderBy: { createdAt: 'desc' },
      take: this.take(query.limit),
    });
  }

  public async listTombstones(instanceName: string) {
    const account = await this.account(instanceName);
    return this.prisma.archivePurgeTombstone.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async backfill(instanceName: string, limit = 10000) {
    if (!this.isEnabled()) throw new BadRequestException('Archive is not enabled');
    const instance = await this.prisma.instance.findUnique({ where: { name: instanceName } });
    if (!instance) throw new NotFoundException('Instance not found');
    const bounded = Math.min(Math.max(limit, 1), 100000);
    const [messages, contacts, chats] = await Promise.all([
      this.prisma.message.findMany({
        where: { instanceId: instance.id },
        orderBy: { messageTimestamp: 'asc' },
        take: bounded,
      }),
      this.prisma.contact.findMany({
        where: { instanceId: instance.id },
        orderBy: { createdAt: 'asc' },
        take: bounded,
      }),
      this.prisma.chat.findMany({ where: { instanceId: instance.id }, orderBy: { createdAt: 'asc' }, take: bounded }),
    ]);
    for (const message of messages)
      await this.capture({
        instanceName,
        event: 'archive.backfill.message',
        data: message,
        dateTime: new Date(message.messageTimestamp * 1000).toISOString(),
        sender: instance.ownerJid,
      });
    for (const contact of contacts)
      await this.capture({
        instanceName,
        event: 'archive.backfill.contact',
        data: contact,
        dateTime: contact.createdAt?.toISOString(),
        sender: instance.ownerJid,
      });
    for (const chat of chats)
      await this.capture({
        instanceName,
        event: 'archive.backfill.chat',
        data: chat,
        dateTime: chat.createdAt?.toISOString(),
        sender: instance.ownerJid,
      });
    return {
      instanceName,
      imported: { messages: messages.length, contacts: contacts.length, chats: chats.length },
      truncated: messages.length === bounded || contacts.length === bounded || chats.length === bounded,
    };
  }

  public async listPolicies() {
    return this.prisma.archivePolicy.findMany({ orderBy: [{ scope: 'asc' }, { effectiveAt: 'desc' }] });
  }

  public async putPolicy(data: {
    id?: string;
    scope: string;
    selector?: Record<string, unknown>;
    policy: ArchivePolicyDocument;
    effectiveAt?: string;
  }) {
    if (!['general', 'entity', 'account', 'jid'].includes(data.scope))
      throw new BadRequestException('Invalid policy scope');
    if (!data.policy || typeof data.policy !== 'object') throw new BadRequestException('policy is required');
    const previous = data.id ? await this.prisma.archivePolicy.findUnique({ where: { id: data.id } }) : null;
    if (data.id && !previous) throw new NotFoundException('Policy version not found');
    return this.prisma.archivePolicy.create({
      data: {
        id: randomUUID(),
        scope: data.scope,
        selector: (data.selector || {}) as Prisma.InputJsonValue,
        policy: data.policy as Prisma.InputJsonValue,
        effectiveAt: data.effectiveAt ? new Date(data.effectiveAt) : new Date(),
        version: (previous?.version || 0) + 1,
      },
    });
  }

  public async previewPurge(instanceName: string, criteria: PurgeCriteria) {
    this.validatePurgeCriteria(criteria);
    const account = await this.account(instanceName);
    const where = this.purgeWhere(account.id, criteria);
    const selectedEventIds = criteria.eventTypes?.length
      ? (await this.prisma.archiveEvent.findMany({ where, select: { id: true } })).map((event) => event.id)
      : null;
    const [events, media] = await Promise.all([
      criteria.mediaOnly ? Promise.resolve(0) : this.prisma.archiveEvent.count({ where }),
      this.prisma.archiveMedia.count({
        where: selectedEventIds
          ? { accountId: account.id, eventId: { in: selectedEventIds } }
          : this.mediaPurgeWhere(account.id, criteria),
      }),
    ]);
    const token = randomBytes(32).toString('base64url');
    const preview = await this.prisma.archivePurgePreview.create({
      data: {
        id: randomUUID(),
        accountId: account.id,
        criteria: criteria as Prisma.InputJsonValue,
        summary: { events, media },
        confirmationHash: this.hash(Buffer.from(token)),
        expiresAt: new Date(Date.now() + this.config.CONFIRM_TTL_SECONDS * 1000),
      },
    });
    return {
      previewId: preview.id,
      confirmationToken: token,
      expiresAt: preview.expiresAt,
      criteria,
      summary: { events, media },
    };
  }

  public async confirmPurge(previewId: string, token: string) {
    const preview = await this.prisma.archivePurgePreview.findUnique({ where: { id: previewId } });
    if (!preview) throw new NotFoundException('Purge preview not found');
    if (preview.expiresAt <= new Date()) throw new BadRequestException('Purge preview expired');
    if (preview.confirmationHash !== this.hash(Buffer.from(token || '')))
      throw new ForbiddenException('Invalid confirmation token');
    const consumed = await this.prisma.archivePurgeJob.findUnique({ where: { previewId } });
    if (consumed) throw new BadRequestException('Purge preview has already been consumed');
    const criteria = preview.criteria as PurgeCriteria;
    const selectedEventIds = criteria.eventTypes?.length
      ? (
          await this.prisma.archiveEvent.findMany({
            where: this.purgeWhere(preview.accountId, criteria),
            select: { id: true },
          })
        ).map((event) => event.id)
      : null;
    const mediaWhere: Prisma.ArchiveMediaWhereInput = selectedEventIds
      ? { accountId: preview.accountId, eventId: { in: selectedEventIds } }
      : this.mediaPurgeWhere(preview.accountId, criteria);
    const media = await this.prisma.archiveMedia.findMany({
      where: mediaWhere,
      select: { id: true, objectKey: true },
    });
    for (const item of media) {
      if (item.objectKey) {
        if (!this.deleteArchiveObject) throw new BadRequestException('Archive object deletion is unavailable');
        const deletion = await this.deleteArchiveObject(item.objectKey);
        if (deletion instanceof Error)
          throw new BadRequestException(`Unable to delete archive object ${item.objectKey}`);
      }
    }
    const jobId = randomUUID();
    const criteriaHash = this.hash(Buffer.from(canonicalJson(criteria)));
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.archivePurgeJob.create({
        data: {
          id: jobId,
          accountId: preview.accountId,
          previewId,
          criteria: preview.criteria,
          summary: preview.summary,
          status: 'running',
        },
      });
      const deletedMedia = await tx.archiveMedia.deleteMany({
        where: mediaWhere,
      });
      const targetEvents = criteria.mediaOnly
        ? []
        : await tx.archiveEvent.findMany({
            where: this.purgeWhere(preview.accountId, criteria),
            select: { id: true, sequence: true, previousHash: true, recordHash: true },
            orderBy: { sequence: 'asc' },
          });
      const eventIds = targetEvents.map((event) => event.id);
      const revisions = eventIds.length
        ? await tx.archiveMessageRevision.findMany({
            where: { accountId: preview.accountId, eventId: { in: eventIds } },
            select: { archiveMessageId: true },
          })
        : [];
      const affectedMessageIds = [...new Set(revisions.map((revision) => revision.archiveMessageId))];
      const deletedRevisions = eventIds.length
        ? await tx.archiveMessageRevision.deleteMany({
            where: { accountId: preview.accountId, eventId: { in: eventIds } },
          })
        : { count: 0 };
      const orphanMessageIds: string[] = [];
      for (const archiveMessageId of affectedMessageIds) {
        if ((await tx.archiveMessageRevision.count({ where: { archiveMessageId } })) === 0)
          orphanMessageIds.push(archiveMessageId);
      }
      const deletedMessages = orphanMessageIds.length
        ? await tx.archiveMessage.deleteMany({ where: { id: { in: orphanMessageIds } } })
        : { count: 0 };
      const deletedReceipts = eventIds.length
        ? await tx.archiveReceipt.deleteMany({ where: { accountId: preview.accountId, eventId: { in: eventIds } } })
        : { count: 0 };
      const deletedReactions = eventIds.length
        ? await tx.archiveReaction.deleteMany({ where: { accountId: preview.accountId, eventId: { in: eventIds } } })
        : { count: 0 };
      const deletedEntities = eventIds.length
        ? await tx.archiveEntityRevision.deleteMany({
            where: { accountId: preview.accountId, eventId: { in: eventIds } },
          })
        : { count: 0 };
      const deletedMemberships = eventIds.length
        ? await tx.archiveGroupMembership.deleteMany({
            where: { accountId: preview.accountId, sourceEventId: { in: eventIds } },
          })
        : { count: 0 };
      const deletedCalls = eventIds.length
        ? await tx.archiveCall.deleteMany({ where: { accountId: preview.accountId, eventId: { in: eventIds } } })
        : { count: 0 };
      const deletedGaps = eventIds.length
        ? await tx.archiveSyncGap.deleteMany({ where: { accountId: preview.accountId, sourceEvent: { in: eventIds } } })
        : { count: 0 };
      const deletedEvents = criteria.mediaOnly
        ? { count: 0 }
        : await tx.archiveEvent.deleteMany({ where: this.purgeWhere(preview.accountId, criteria) });
      const previous = await tx.archivePurgeTombstone.findFirst({
        where: { accountId: preview.accountId },
        orderBy: { createdAt: 'desc' },
      });
      const summary = {
        events: deletedEvents.count,
        media: deletedMedia.count,
        messages: deletedMessages.count,
        messageRevisions: deletedRevisions.count,
        receipts: deletedReceipts.count,
        reactions: deletedReactions.count,
        entityRevisions: deletedEntities.count,
        memberships: deletedMemberships.count,
        calls: deletedCalls.count,
        syncGaps: deletedGaps.count,
        deletedRanges: this.deletedRanges(targetEvents),
      };
      const tombstoneHash = this.sign(
        Buffer.from(
          [preview.accountId, jobId, criteriaHash, canonicalJson(summary), previous?.tombstoneHash || ''].join('|'),
        ),
      );
      const tombstone = await tx.archivePurgeTombstone.create({
        data: {
          id: randomUUID(),
          accountId: preview.accountId,
          purgeJobId: jobId,
          criteriaHash,
          deletedSummary: summary,
          previousHash: previous?.tombstoneHash,
          tombstoneHash,
        },
      });
      await tx.archivePurgeJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date(), summary },
      });
      return { jobId, status: 'completed', summary, tombstone };
    });
  }

  public async verify(instanceName: string) {
    const account = await this.account(instanceName);
    const events = await this.prisma.archiveEvent.findMany({
      where: { accountId: account.id },
      orderBy: { sequence: 'asc' },
    });
    const tombstones = await this.prisma.archivePurgeTombstone.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'asc' },
    });
    let tombstonePrevious: string | null = null;
    const deletedSegments: Array<{
      start: bigint;
      end: bigint;
      previousHash: string | null;
      lastHash: string;
      tombstoneId: string;
    }> = [];
    for (const tombstone of tombstones) {
      const expected = this.sign(
        Buffer.from(
          [
            account.id,
            tombstone.purgeJobId,
            tombstone.criteriaHash,
            canonicalJson(tombstone.deletedSummary),
            tombstonePrevious || '',
          ].join('|'),
        ),
      );
      if (tombstone.previousHash !== tombstonePrevious || tombstone.tombstoneHash !== expected) {
        return { valid: false, accountId: account.id, failedTombstone: tombstone.id };
      }
      const summary = tombstone.deletedSummary as Record<string, unknown>;
      const ranges = Array.isArray(summary.deletedRanges) ? summary.deletedRanges : [];
      let rangeCount = 0n;
      for (const value of ranges) {
        const range = value as Record<string, unknown>;
        if (
          typeof range.start !== 'string' ||
          !/^\d+$/.test(range.start) ||
          typeof range.end !== 'string' ||
          !/^\d+$/.test(range.end) ||
          (range.previousHash !== null && typeof range.previousHash !== 'string') ||
          typeof range.lastHash !== 'string'
        ) {
          return { valid: false, accountId: account.id, failedTombstone: tombstone.id };
        }
        const start = BigInt(range.start);
        const end = BigInt(range.end);
        if (start < 1n || end < start) return { valid: false, accountId: account.id, failedTombstone: tombstone.id };
        deletedSegments.push({
          start,
          end,
          previousHash: range.previousHash as string | null,
          lastHash: range.lastHash,
          tombstoneId: tombstone.id,
        });
        rangeCount += end - start + 1n;
      }
      if (rangeCount !== BigInt(Number(summary.events) || 0))
        return { valid: false, accountId: account.id, failedTombstone: tombstone.id };
      tombstonePrevious = tombstone.tombstoneHash;
    }

    const retainedSegments: Array<{
      start: bigint;
      end: bigint;
      previousHash: string | null;
      lastHash: string;
      eventSequence: string;
    }> = [];
    for (const event of events) {
      const expected = this.hash(
        Buffer.from(
          [
            account.id,
            event.sequence.toString(),
            event.eventType,
            event.occurredAt.toISOString(),
            event.payloadHash,
            event.previousHash || '',
          ].join('|'),
        ),
      );
      if (event.recordHash !== expected) {
        return { valid: false, accountId: account.id, failedAtSequence: event.sequence.toString() };
      }
      retainedSegments.push({
        start: event.sequence,
        end: event.sequence,
        previousHash: event.previousHash,
        lastHash: event.recordHash,
        eventSequence: event.sequence.toString(),
      });
    }

    const chain = [...deletedSegments, ...retainedSegments].sort((a, b) => (a.start < b.start ? -1 : 1));
    let expectedSequence = 1n;
    let expectedPrevious: string | null = null;
    for (const segment of chain) {
      if (segment.start !== expectedSequence || segment.previousHash !== expectedPrevious) {
        return {
          valid: false,
          accountId: account.id,
          failedAtSequence: expectedSequence.toString(),
          reason: 'Sequence gap is not covered by a valid purge tombstone',
        };
      }
      expectedSequence = segment.end + 1n;
      expectedPrevious = segment.lastHash;
    }
    if (expectedSequence !== account.lastSequence + 1n || expectedPrevious !== account.headHash) {
      return {
        valid: false,
        accountId: account.id,
        failedAtSequence: expectedSequence.toString(),
        reason: 'Archive head does not match the immutable account checkpoint',
      };
    }
    return {
      valid: true,
      accountId: account.id,
      checkedEvents: events.length,
      checkedTombstones: tombstones.length,
      head: expectedPrevious,
      tombstoneHead: tombstonePrevious,
    };
  }

  private async resolvePolicy(accountId: string, instanceName: string, entityType: string, jid: string | null) {
    const policies = await this.prisma.archivePolicy.findMany({
      where: { enabled: true, effectiveAt: { lte: new Date() } },
      orderBy: { effectiveAt: 'asc' },
    });
    const rank: Record<string, number> = { general: 0, entity: 1, account: 2, jid: 3 };
    const matches = policies
      .filter((entry) => {
        const selector = entry.selector as Record<string, any>;
        if (entry.scope === 'general') return true;
        if (entry.scope === 'entity') return selector.entityType === entityType;
        if (entry.scope === 'account')
          return selector.accountId === accountId || selector.instanceName === instanceName;
        if (entry.scope === 'jid')
          return selector.jid === jid && (!selector.instanceName || selector.instanceName === instanceName);
        return false;
      })
      .sort((a, b) => rank[a.scope] - rank[b.scope]);
    return matches.reduce(
      (resolved, entry) => deepMerge(resolved, entry.policy as Record<string, any>),
      this.config.DEFAULT_POLICY,
    ) as ArchivePolicyDocument;
  }

  private async captureDerived(
    tx: Prisma.TransactionClient,
    accountId: string,
    eventId: string,
    event: string,
    entityType: string,
    entityJid: string | null,
    messageId: string | null,
    raw: Record<string, any>,
    policy: ArchivePolicyDocument,
    occurredAt: Date,
    sequence: bigint,
  ) {
    const upper = event.toUpperCase();
    const projection = this.project(event, entityType, entityJid, messageId, raw);
    if (entityType === 'message' && messageId && entityJid && categoryFor(event) === 'messages') {
      const existing = await tx.archiveMessage.findUnique({
        where: { accountId_chatJid_waMessageId: { accountId, chatJid: entityJid, waMessageId: messageId } },
      });
      const revision = (existing?.latestRevision || 0) + 1;
      const archiveMessage = await tx.archiveMessage.upsert({
        where: { accountId_chatJid_waMessageId: { accountId, chatJid: entityJid, waMessageId: messageId } },
        create: {
          id: randomUUID(),
          accountId,
          waMessageId: messageId,
          chatJid: entityJid,
          participantJid: raw?.key?.participant || raw?.participant || null,
          fromMe: raw?.key?.fromMe ?? raw?.fromMe ?? null,
          messageType: raw.messageType || Object.keys(raw.message || {})[0] || null,
          sentAt: occurredAt,
          firstEventId: eventId,
          latestRevision: revision,
          deletedAt: upper.includes('DELETE') ? occurredAt : null,
        },
        update: { latestRevision: revision, deletedAt: upper.includes('DELETE') ? occurredAt : undefined },
      });
      await tx.archiveMessageRevision.create({
        data: {
          id: randomUUID(),
          accountId,
          archiveMessageId: archiveMessage.id,
          eventId,
          revision,
          projection,
          occurredAt,
        },
      });
    }
    if (categoryFor(event) === 'receipts') {
      await tx.archiveReceipt.create({
        data: {
          id: randomUUID(),
          accountId,
          eventId,
          waMessageId: messageId,
          chatJid: entityJid,
          participantJid: raw.participant || raw.userJid || null,
          status: raw.status || raw.type || null,
          occurredAt,
        },
      });
    }
    if (categoryFor(event) === 'reactions') {
      const reaction = raw.reaction?.text ?? raw.text ?? raw.reaction ?? null;
      await tx.archiveReaction.create({
        data: {
          id: randomUUID(),
          accountId,
          eventId,
          waMessageId: messageId,
          chatJid: entityJid,
          participantJid: raw.participant || raw.key?.participant || null,
          reaction: typeof reaction === 'string' ? reaction : null,
          removed: reaction === '' || reaction === null,
          occurredAt,
        },
      });
    }
    if (['contact', 'chat', 'group'].includes(entityType) && entityJid) {
      await tx.archiveEntityRevision.create({
        data: { id: randomUUID(), accountId, eventId, entityType, entityJid, sequence, projection, occurredAt },
      });
    }
    if (upper.includes('GROUP_PARTICIPANTS') && entityJid) {
      const participants = raw.participants || (raw.participant ? [raw.participant] : []);
      for (const participant of participants) {
        const participantJid = typeof participant === 'string' ? participant : participant?.id || participant?.jid;
        if (!participantJid) continue;
        await tx.archiveGroupMembership.create({
          data: {
            id: randomUUID(),
            accountId,
            groupJid: entityJid,
            participantJid,
            role: raw.action === 'promote' ? 'admin' : raw.action === 'demote' ? 'member' : null,
            state: ['remove', 'leave'].includes(raw.action) ? 'left' : 'active',
            sourceEventId: eventId,
            validFrom: occurredAt,
          },
        });
      }
    }
    if (entityType === 'call') {
      await tx.archiveCall.create({
        data: {
          id: randomUUID(),
          accountId,
          eventId,
          callId: raw.id || raw.callId || null,
          peerJid: raw.from || raw.peerJid || entityJid,
          groupJid: raw.groupJid || null,
          status: raw.status || raw.event || null,
          video: raw.isVideo ?? raw.video ?? null,
          occurredAt,
        },
      });
    }
    if (
      upper.includes('MESSAGING_HISTORY_STATUS') &&
      raw.status &&
      !['complete', 'completed', 'success'].includes(String(raw.status).toLowerCase())
    ) {
      await tx.archiveSyncGap.create({
        data: {
          id: randomUUID(),
          accountId,
          sourceEvent: eventId,
          entityJid,
          gapType: 'history_sync',
          status: 'open',
          details: projection,
        },
      });
    }
    if (event.toUpperCase().includes('LID_MAPPING')) {
      await tx.archiveIdentityMapping.create({
        data: {
          id: randomUUID(),
          accountId,
          pnJid: raw.pn || raw.pnJid || null,
          lidJid: raw.lid || raw.lidJid || null,
          sourceEvent: eventId,
        },
      });
    }
    const media = raw.message || raw;
    const mediaEntry = Object.entries(media).find(([key]) => /(image|video|audio|document|sticker)Message/i.test(key));
    if (!mediaEntry) return;
    const mediaType = mediaEntry[0].replace(/Message$/i, '').toLowerCase();
    const mode = policy.media?.mode || 'all';
    const selected =
      mode === 'all' ||
      mode === 'metadata' ||
      (mode === 'images' && mediaType === 'image') ||
      policy.media?.types?.includes(mediaType);
    if (!selected || mode === 'none') return;
    const details = firstObject(mediaEntry[1]);
    const objectKey = this.objectKeyFromUrl(raw.message?.mediaUrl || raw.mediaUrl);
    await tx.archiveMedia.create({
      data: {
        id: randomUUID(),
        accountId,
        eventId,
        messageId,
        entityJid,
        mediaType,
        mimeType: details.mimetype || null,
        objectKey: objectKey || details.fileName || null,
        contentHash: details.fileSha256 ? this.hash(Buffer.from(String(details.fileSha256))) : null,
        sizeBytes: details.fileLength ? BigInt(details.fileLength) : null,
        state: details.fileName || objectKey ? 'stored' : 'metadata_only',
      },
    });
  }

  private project(
    eventType: string,
    entityType: string,
    entityJid: string | null,
    messageId: string | null,
    raw: Record<string, any>,
  ) {
    const message = raw.message || {};
    const text = message.conversation || message.extendedTextMessage?.text || raw.body || raw.text || null;
    return {
      eventType,
      entityType,
      entityJid,
      messageId,
      text,
      fromMe: raw.key?.fromMe ?? raw.fromMe ?? null,
      participant: raw.key?.participant || raw.participant || null,
      pushName: raw.pushName || raw.name || null,
      status: raw.status || raw.update?.status || null,
    };
  }

  private extractJid(raw: Record<string, any>): string | null {
    return (
      raw?.key?.remoteJid || raw?.remoteJid || raw?.groupJid || raw?.jid || (raw?.id?.includes?.('@') ? raw.id : null)
    );
  }

  private extractDate(raw: Record<string, any>, fallback?: string) {
    const timestamp = raw.messageTimestamp || raw.timestamp;
    if (timestamp) {
      const numeric = Number(timestamp);
      if (Number.isFinite(numeric)) return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
    }
    const date = fallback ? new Date(fallback) : new Date();
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  private encrypt(payload: Buffer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    return { ciphertext: Buffer.concat([cipher.update(payload), cipher.final()]), iv, tag: cipher.getAuthTag() };
  }

  private decrypt(row: {
    payloadCiphertext: Uint8Array | null;
    payloadIv: Uint8Array | null;
    payloadTag: Uint8Array | null;
  }) {
    if (!row.payloadCiphertext || !row.payloadIv || !row.payloadTag || !this.key) return null;
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(row.payloadIv));
    decipher.setAuthTag(Buffer.from(row.payloadTag));
    return JSON.parse(
      Buffer.concat([decipher.update(Buffer.from(row.payloadCiphertext)), decipher.final()]).toString('utf8'),
    );
  }

  private hash(value: Buffer) {
    return createHash('sha256').update(value).digest('hex');
  }

  private objectKeyFromUrl(value?: string): string | null {
    if (!value || !this.s3?.BUCKET_NAME) return null;
    try {
      const segments = new URL(value).pathname.split('/').filter(Boolean);
      const bucketIndex = segments.indexOf(this.s3.BUCKET_NAME);
      return bucketIndex >= 0 ? decodeURIComponent(segments.slice(bucketIndex + 1).join('/')) : null;
    } catch {
      return null;
    }
  }

  private sign(value: Buffer) {
    if (!this.key) throw new Error('Archive encryption key is invalid');
    return createHmac('sha256', this.key).update(value).digest('hex');
  }

  private async account(instanceName: string) {
    const account = await this.prisma.archiveAccount.findUnique({ where: { instanceName } });
    if (!account) throw new NotFoundException('Archive account not found');
    return account;
  }

  private validatePurgeCriteria(criteria: PurgeCriteria) {
    if (!criteria?.before && !criteria?.entityJid && !criteria?.groupJid && !criteria?.eventTypes?.length) {
      throw new BadRequestException('A purge must specify before, entityJid, groupJid, or eventTypes');
    }
    if (criteria.before && Number.isNaN(new Date(criteria.before).getTime()))
      throw new BadRequestException('before must be an ISO date');
    if (criteria.groupJid && !criteria.groupJid.endsWith('@g.us'))
      throw new BadRequestException('groupJid must end with @g.us');
    if (criteria.mediaOnly && criteria.eventTypes?.length)
      throw new BadRequestException('mediaOnly cannot be combined with eventTypes');
  }

  private purgeWhere(accountId: string, criteria: PurgeCriteria): Prisma.ArchiveEventWhereInput {
    return {
      accountId,
      entityJid: criteria.groupJid || criteria.entityJid || undefined,
      eventType: criteria.eventTypes?.length ? { in: criteria.eventTypes } : undefined,
      occurredAt: criteria.before ? { lt: new Date(criteria.before) } : undefined,
    };
  }

  private mediaPurgeWhere(accountId: string, criteria: PurgeCriteria): Prisma.ArchiveMediaWhereInput {
    return {
      accountId,
      entityJid: criteria.groupJid || criteria.entityJid || undefined,
      createdAt: criteria.before ? { lt: new Date(criteria.before) } : undefined,
    };
  }

  private take(value: unknown) {
    return Math.min(Math.max(Number(value) || 100, 1), 1000);
  }

  private deletedRanges(events: Array<{ sequence: bigint; previousHash: string | null; recordHash: string }>) {
    const ranges: Array<{ start: string; end: string; previousHash: string | null; lastHash: string }> = [];
    for (const event of events) {
      const previous = ranges[ranges.length - 1];
      if (previous && BigInt(previous.end) + 1n === event.sequence) {
        previous.end = event.sequence.toString();
        previous.lastHash = event.recordHash;
      } else {
        ranges.push({
          start: event.sequence.toString(),
          end: event.sequence.toString(),
          previousHash: event.previousHash,
          lastHash: event.recordHash,
        });
      }
    }
    return ranges;
  }
}
