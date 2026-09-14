import assert from 'node:assert/strict';

import {
  calculateTypingDelay,
  extractOutboundText,
  isQuietHours,
  normalizeAutomationSafety,
  OutboundSafetyService,
} from '../src/api/services/outbound-safety.service';

async function main() {
  const message = {
    conversation: 'Keep https://example.com/A1 and code ZX-42 exactly unchanged.',
  };
  assert.equal(extractOutboundText(message), message.conversation);

  const policy = normalizeAutomationSafety({
    enabled: true,
    typing: { minMs: 500, maxMs: 5000, charactersPerSecond: 10, jitterPercent: 10 },
  });
  assert.equal(calculateTypingDelay(20, policy, () => 0.5), 2000);
  assert.equal(calculateTypingDelay(1, policy, () => 0), 500);
  assert.equal(calculateTypingDelay(1000, policy, () => 1), 5000);

  const overnight = normalizeAutomationSafety({
    enabled: true,
    quietHours: { enabled: true, start: '22:00', end: '08:00', timeZone: 'UTC' },
  });
  assert.equal(isQuietHours(overnight, new Date('2026-09-14T23:00:00Z')), true);
  assert.equal(isQuietHours(overnight, new Date('2026-09-14T12:00:00Z')), false);

  const rows: any[] = [];
  const repository = {
    outboundMessageAudit: {
      create: async ({ data }: any) => {
        const row = { id: `audit-${rows.length + 1}`, requestedAt: new Date(), sentAt: null, ...data };
        rows.push(row);
        return row;
      },
      deleteMany: async () => ({ count: 0 }),
    },
  } as any;
  const service = new OutboundSafetyService(repository);
  assert.equal(
    service.preflightBlockCode('15550000000@s.whatsapp.net', {
      enabled: true,
      suppression: { allowlistEnabled: true, allowedRecipients: ['15551111111'] },
    }),
    'recipient_not_allowed',
  );
  const blocked = await service.begin('instance-1', '15551234567@s.whatsapp.net', message, {
    enabled: true,
    suppression: { recipients: ['15551234567'] },
  });
  assert.deepEqual(blocked, { allowed: false, code: 'recipient_suppressed', retryAfterSeconds: undefined });
  assert.equal(rows[0].status, 'BLOCKED');
  assert.equal(rows[0].reason, 'recipient_suppressed');

  const notAllowed = await service.begin('instance-allowlist', '15550000000@s.whatsapp.net', message, {
    enabled: true,
    suppression: { allowlistEnabled: true, allowedRecipients: ['15551111111'] },
  });
  assert.deepEqual(notAllowed, { allowed: false, code: 'recipient_not_allowed', retryAfterSeconds: undefined });
  assert.equal(rows[1].reason, 'recipient_not_allowed');

  const disabled = await service.begin('instance-1', '15550000000@s.whatsapp.net', message, { enabled: false });
  assert.equal(disabled.allowed, true);
  assert.equal(rows.length, 2);

  console.log('outbound-safety-tests-pass');
}

void main();
