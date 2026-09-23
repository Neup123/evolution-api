import assert from 'node:assert/strict';

import { PrismaClient } from '@prisma/client';

import { OutboundMessageQueueService } from '../src/api/services/outbound-message-queue.service';

async function main() {
  if (!process.env.DATABASE_CONNECTION_URI) throw new Error('DATABASE_CONNECTION_URI is required');
  const prisma = new PrismaClient();
  const instance = await prisma.instance.create({ data: { name: `outbound-queue-test-${Date.now()}` } });
  try {
    const service = new OutboundMessageQueueService(prisma as any);
    const queued = await service.enqueueText(
      instance.id,
      '15551234567@s.whatsapp.net',
      { number: '15551234567', text: 'Persist this exact queued text.' },
      'outreach_recipient_limit',
      60,
      {
        enabled: true,
        rateLimit: { instancePerDay: 10, recipientPerDay: 5, minimumIntervalMs: 0 },
      },
    );
    assert.equal(queued.queued, true);
    assert.equal(queued.messageWasSent, false);
    assert.equal(queued.deliveryStatus, 'PENDING');
    assert.equal(queued.final, false);

    const stored = await prisma.outboundMessageQueue.findUnique({ where: { id: queued.queueId } });
    assert.deepEqual(stored?.payload, {
      data: { number: '15551234567', text: 'Persist this exact queued text.' },
      isIntegration: false,
    });

    await prisma.outboundMessageQueue.update({
      where: { id: queued.queueId },
      data: { scheduledAt: new Date(Date.now() - 1000) },
    });
    const claimed = await service.claimNext(instance.id);
    assert.equal(claimed?.id, queued.queueId);
    assert.equal(claimed?.status, 'PROCESSING');
    assert.equal(claimed?.attempts, 1);

    const retry = await service.rescheduleOrReject(queued.queueId, 'minimum_interval', 30);
    assert.equal(retry.rescheduled, true);
    assert.equal((await service.snapshot(instance.id)).pendingCount, 1);

    const cleared = await service.clear(instance.id);
    assert.equal(cleared.deletedCount, 1);
    assert.equal(await prisma.outboundMessageQueue.count({ where: { instanceId: instance.id } }), 0);
  } finally {
    await prisma.instance.delete({ where: { id: instance.id } });
    assert.equal(await prisma.outboundMessageQueue.count({ where: { instanceId: instance.id } }), 0);
    await prisma.$disconnect();
  }
  console.log('outbound-message-queue-postgres-tests-pass');
}

void main();
