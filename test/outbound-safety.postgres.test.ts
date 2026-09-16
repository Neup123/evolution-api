import assert from 'node:assert/strict';

import { PrismaClient } from '@prisma/client';

import { OutboundSafetyService } from '../src/api/services/outbound-safety.service';

async function main() {
  if (!process.env.DATABASE_CONNECTION_URI) throw new Error('DATABASE_CONNECTION_URI is required');
  const prisma = new PrismaClient();
  const name = `outbound-safety-test-${Date.now()}`;
  const instance = await prisma.instance.create({ data: { name } });
  try {
    const service = new OutboundSafetyService(prisma as any);
    const policy = {
      enabled: true,
      typing: { enabled: false },
      rateLimit: { minimumIntervalMs: 0 },
      duplicate: { enabled: true, windowSeconds: 60 },
      outreach: { enabled: false },
    };
    const message = { conversation: 'Database-backed duplicate test' };

    const first = await service.begin(instance.id, '15551234567@s.whatsapp.net', message, policy);
    assert.equal(first.allowed, true);
    if (first.allowed) await service.sent(instance.id, first.auditId);

    const instanceDailyLimit = await service.begin(
      instance.id,
      '15557654321@s.whatsapp.net',
      { conversation: 'A different message for the daily limit' },
      { ...policy, rateLimit: { minimumIntervalMs: 0, instancePerDay: 1 } },
    );
    assert.deepEqual(instanceDailyLimit, {
      allowed: false,
      code: 'instance_daily_limit',
      retryAfterSeconds: 86400,
    });

    const duplicate = await service.begin(instance.id, '15551234567@s.whatsapp.net', message, policy);
    assert.deepEqual(duplicate, { allowed: false, code: 'duplicate_message', retryAfterSeconds: 60 });

    const fuzzyFirst = await service.begin(
      instance.id,
      '15551234568@s.whatsapp.net',
      { conversation: 'Your scheduled appointment is tomorrow at 10:00.' },
      { ...policy, duplicate: { enabled: true, windowSeconds: 60, similarityThresholdPercent: 70 } },
    );
    assert.equal(fuzzyFirst.allowed, true);
    if (fuzzyFirst.allowed) await service.sent(instance.id, fuzzyFirst.auditId);
    const fuzzyDuplicate = await service.begin(
      instance.id,
      '15551234568@s.whatsapp.net',
      { conversation: 'Your scheduled appointment is tomorrow at 10:30.' },
      { ...policy, duplicate: { enabled: true, windowSeconds: 60, similarityThresholdPercent: 70 } },
    );
    assert.deepEqual(fuzzyDuplicate, { allowed: false, code: 'duplicate_message', retryAfterSeconds: 60 });

    const rows = await prisma.outboundMessageAudit.findMany({ where: { instanceId: instance.id } });
    assert.equal(rows.length, 5);
    assert.deepEqual(rows.map((row) => row.status).sort(), ['BLOCKED', 'BLOCKED', 'BLOCKED', 'SENT', 'SENT']);

    const outreachPolicy = {
      enabled: true,
      typing: { enabled: false },
      rateLimit: { minimumIntervalMs: 0, instancePerDay: 1000 },
      duplicate: { enabled: false },
      outreach: { enabled: true, newOrDormantRecipientsPerDay: 1, dormantAfterDays: 180 },
    };
    const firstNew = await service.begin(
      instance.id,
      '15550000001@s.whatsapp.net',
      { conversation: 'Hello one' },
      outreachPolicy,
    );
    assert.equal(firstNew.allowed, true);
    if (firstNew.allowed) await service.sent(instance.id, firstNew.auditId);

    const secondNew = await service.begin(
      instance.id,
      '15550000002@s.whatsapp.net',
      { conversation: 'Hello two' },
      outreachPolicy,
    );
    assert.deepEqual(secondNew, { allowed: false, code: 'outreach_recipient_limit', retryAfterSeconds: 86400 });

    await service.recordActivity(instance.id, '15550000003@s.whatsapp.net', false, new Date());
    const reply = await service.begin(
      instance.id,
      '15550000003@s.whatsapp.net',
      { conversation: 'Reply' },
      outreachPolicy,
    );
    assert.equal(reply.allowed, true);
    if (reply.allowed) await service.sent(instance.id, reply.auditId);

    const engagement = await prisma.recipientEngagement.findUnique({
      where: { instanceId_recipient: { instanceId: instance.id, recipient: '15550000003@s.whatsapp.net' } },
    });
    assert.ok(engagement?.lastInboundAt);
    const outreachBlock = await prisma.outboundMessageAudit.findFirst({
      where: { instanceId: instance.id, reason: 'outreach_recipient_limit' },
    });
    assert.equal(outreachBlock?.recipientCategory, 'NEW');
  } finally {
    await prisma.instance.delete({ where: { id: instance.id } });
    const remaining = await prisma.outboundMessageAudit.count({ where: { instanceId: instance.id } });
    assert.equal(remaining, 0);
    await prisma.$disconnect();
  }
  console.log('outbound-safety-postgres-tests-pass');
}

void main();
