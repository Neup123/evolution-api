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
    public readonly code: 'outbound_queue_instance_capacity' | 'outbound_queue_recipient_capacity',
    public readonly retryAfterSeconds: number,
  ) {
    super('Outbound queue plus recently sent messages reached the configured daily limit.');
  }
}

export class OutboundMessageQueueService {
  constructor(private readonly repository: PrismaRepository) {}

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
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const queuedStatuses = ['PENDING', 'PROCESSING'];

    await this.repository.outboundMessageQueue.deleteMany({
      where: {
        instanceId,
        status: 'FAILED',
        requestedAt: { lt: new Date(now.getTime() - policy.audit.retentionDays * 86_400_000) },
      },
    });

    const [recentInstanceMessages, recentRecipientMessages, queuedInstance, queuedRecipient, lastQueued] =
      await Promise.all([
        this.repository.outboundMessageAudit.count({
          where: { instanceId, requestedAt: { gte: dayAgo }, status: 'SENT' },
        }),
        this.repository.outboundMessageAudit.count({
          where: {
            instanceId,
            recipient,
            requestedAt: { gte: dayAgo },
            status: 'SENT',
          },
        }),
        this.repository.outboundMessageQueue.count({ where: { instanceId, status: { in: queuedStatuses } } }),
        this.repository.outboundMessageQueue.count({
          where: { instanceId, recipient, status: { in: queuedStatuses } },
        }),
        this.repository.outboundMessageQueue.findFirst({
          where: { instanceId, status: { in: queuedStatuses } },
          orderBy: { scheduledAt: 'desc' },
          select: { scheduledAt: true },
        }),
      ]);

    if (recentInstanceMessages + queuedInstance >= policy.rateLimit.instancePerDay) {
      throw new OutboundQueueCapacityError('outbound_queue_instance_capacity', 86_400);
    }
    if (recentRecipientMessages + queuedRecipient >= policy.rateLimit.recipientPerDay) {
      throw new OutboundQueueCapacityError('outbound_queue_recipient_capacity', 86_400);
    }

    const requestedSchedule = now.getTime() + Math.max(1, retryAfterSeconds) * 1000;
    const afterExistingQueue = lastQueued
      ? lastQueued.scheduledAt.getTime() + Math.max(1, policy.rateLimit.minimumIntervalMs)
      : requestedSchedule;
    const scheduledAt = new Date(Math.max(requestedSchedule, afterExistingQueue));

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
