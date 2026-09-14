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

    const rows = await prisma.outboundMessageAudit.findMany({ where: { instanceId: instance.id } });
    assert.equal(rows.length, 3);
    assert.deepEqual(
      rows.map((row) => row.status).sort(),
      ['BLOCKED', 'BLOCKED', 'SENT'],
    );
  } finally {
    await prisma.instance.delete({ where: { id: instance.id } });
    const remaining = await prisma.outboundMessageAudit.count({ where: { instanceId: instance.id } });
    assert.equal(remaining, 0);
    await prisma.$disconnect();
  }
  console.log('outbound-safety-postgres-tests-pass');
}

void main();
