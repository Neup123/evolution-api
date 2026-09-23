import assert from 'node:assert/strict';

import {
  OutboundMessageQueueService,
  OutboundQueueCapacityError,
  QUEUEABLE_OUTBOUND_SAFETY_CODES,
} from '../src/api/services/outbound-message-queue.service';

async function main() {
  const rows: any[] = [];
  let recentInstanceMessages = 2;
  let recentRecipientMessages = 1;
  const repository = {
    outboundMessageAudit: {
      count: async ({ where }: any) => (where.recipient ? recentRecipientMessages : recentInstanceMessages),
    },
    outboundMessageQueue: {
      count: async ({ where }: any) =>
        rows.filter(
          (row) =>
            row.instanceId === where.instanceId &&
            (!where.recipient || row.recipient === where.recipient) &&
            (!where.status ||
              row.status === where.status ||
              (where.status.in && where.status.in.includes(row.status))) &&
            (!where.scheduledAt?.lte || row.scheduledAt <= where.scheduledAt.lte),
        ).length,
      findFirst: async ({ where, orderBy }: any) => {
        const matches = rows.filter(
          (row) =>
            row.instanceId === where.instanceId &&
            (!where.status ||
              row.status === where.status ||
              (where.status.in && where.status.in.includes(row.status))) &&
            (!where.scheduledAt?.lte || row.scheduledAt <= where.scheduledAt.lte),
        );
        const direction = Array.isArray(orderBy) ? orderBy[0].scheduledAt : orderBy.scheduledAt;
        return matches.sort((left, right) =>
          direction === 'desc'
            ? right.scheduledAt.getTime() - left.scheduledAt.getTime()
            : left.scheduledAt.getTime() - right.scheduledAt.getTime(),
        )[0] ?? null;
      },
      findMany: async ({ where, take }: any) =>
        rows
          .filter((row) => where.status.in.includes(row.status))
          .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
          .slice(0, take),
      create: async ({ data }: any) => {
        const row = {
          id: `queue-${rows.length + 1}`,
          status: 'PENDING',
          attempts: 0,
          requestedAt: new Date(),
          lockedAt: null,
          lastError: null,
          ...data,
        };
        rows.push(row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of rows) {
          if (where.id && row.id !== where.id) continue;
          if (where.instanceId && row.instanceId !== where.instanceId) continue;
          if (where.status && typeof where.status === 'string' && row.status !== where.status) continue;
          row.status = data.status ?? row.status;
          row.lockedAt = data.lockedAt === undefined ? row.lockedAt : data.lockedAt;
          row.scheduledAt = data.scheduledAt ?? row.scheduledAt;
          row.reason = data.reason ?? row.reason;
          row.lastError = data.lastError ?? row.lastError;
          if (data.attempts?.increment) row.attempts += data.attempts.increment;
          count += 1;
        }
        return { count };
      },
      findUnique: async ({ where }: any) => rows.find((row) => row.id === where.id) ?? null,
      deleteMany: async ({ where }: any) => {
        const before = rows.length;
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (
            (!where.id || rows[index].id === where.id) &&
            (!where.instanceId || rows[index].instanceId === where.instanceId) &&
            (!where.status || rows[index].status === where.status)
          ) {
            rows.splice(index, 1);
          }
        }
        return { count: before - rows.length };
      },
    },
  } as any;

  const service = new OutboundMessageQueueService(repository);
  assert.equal(QUEUEABLE_OUTBOUND_SAFETY_CODES.has('outreach_recipient_limit'), true);
  assert.equal(QUEUEABLE_OUTBOUND_SAFETY_CODES.has('recipient_suppressed'), false);
  assert.equal(QUEUEABLE_OUTBOUND_SAFETY_CODES.has('duplicate_message'), false);

  const first = await service.enqueueText(
    'instance-1',
    '15551234567@s.whatsapp.net',
    { number: '15551234567', text: 'First queued message' },
    'outreach_recipient_limit',
    60,
    { enabled: true, rateLimit: { instancePerDay: 10, recipientPerDay: 5, minimumIntervalMs: 1000 } },
  );
  assert.equal(first.queued, true);
  assert.equal(first.position, 1);

  const second = await service.enqueueText(
    'instance-1',
    '15557654321@s.whatsapp.net',
    { number: '15557654321', text: 'Second queued message' },
    'instance_rate_limit',
    60,
    { enabled: true, rateLimit: { instancePerDay: 10, recipientPerDay: 5, minimumIntervalMs: 1000 } },
  );
  assert.equal(second.position, 2);
  assert.ok(second.scheduledAt.getTime() > first.scheduledAt.getTime());

  const snapshot = await service.snapshot('instance-1');
  assert.equal(snapshot.pendingCount, 2);
  assert.equal(snapshot.processingCount, 0);
  assert.equal(snapshot.nextSendAt?.getTime(), first.scheduledAt.getTime());
  assert.equal(snapshot.estimatedEmptyAt?.getTime(), second.scheduledAt.getTime());

  recentInstanceMessages = 10;
  await assert.rejects(
    () =>
      service.enqueueText(
        'instance-1',
        '15550000000@s.whatsapp.net',
        { number: '15550000000', text: 'Over capacity' },
        'instance_daily_limit',
        60,
        { enabled: true, rateLimit: { instancePerDay: 10, recipientPerDay: 5 } },
      ),
    (error: any) => error instanceof OutboundQueueCapacityError && error.code === 'outbound_queue_instance_capacity',
  );
  recentInstanceMessages = 2;
  recentRecipientMessages = 1;

  const claimed = await service.claimNext('instance-1');
  assert.equal(claimed, null, 'future work should not be claimed early');

  const cleared = await service.clear('instance-1');
  assert.equal(cleared.deletedCount, 2);
  assert.equal((await service.snapshot('instance-1')).pendingCount, 0);

  console.log('outbound-message-queue-tests-pass');
}

void main();
