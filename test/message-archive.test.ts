import assert from 'node:assert/strict';

import {
  acknowledgementTimestamps,
  alternateJid,
  mergeMessageArchiveState,
  messageArchiveStateFromStatus,
  messageUpdateIdentity,
} from '../src/api/services/message-archive.service';
import { getAvailableNumbers } from '../src/utils/jidOptions';

assert.deepEqual(getAvailableNumbers('12142238715@s.whatsapp.net'), ['12142238715@s.whatsapp.net']);
assert.deepEqual(getAvailableNumbers('230687726690306@lid'), ['230687726690306@lid']);
assert.equal(messageArchiveStateFromStatus('PENDING', true, 'LOCAL_OUTBOUND'), 'PROVISIONAL');
assert.equal(messageArchiveStateFromStatus('PENDING', false, 'WHATSAPP_EVENT'), 'AUTHORITATIVE');
assert.equal(messageArchiveStateFromStatus('SERVER_ACK', true, 'LOCAL_OUTBOUND'), 'SERVER_ACCEPTED');
assert.equal(mergeMessageArchiveState('DELIVERED', 'SERVER_ACCEPTED'), 'DELIVERED');
assert.equal(mergeMessageArchiveState('SERVER_ACCEPTED', 'AUTHORITATIVE'), 'SERVER_ACCEPTED');
assert.equal(mergeMessageArchiveState('PROVISIONAL', 'READ'), 'READ');
assert.equal(mergeMessageArchiveState('PROVISIONAL', 'FAILED'), 'FAILED');
assert.equal(mergeMessageArchiveState('FAILED', 'DELIVERED'), 'DELIVERED');
assert.equal(mergeMessageArchiveState('READ', 'FAILED'), 'READ');
assert.equal(alternateJid('12142238715@s.whatsapp.net', '230687726690306@lid'), '230687726690306@lid');
assert.equal(alternateJid('12142238715@s.whatsapp.net', '12142238715@s.whatsapp.net'), null);
assert.equal(
  messageUpdateIdentity('ABC', 'SERVER_ACK', '230687726690306@lid'),
  'ABC:SERVER_ACK:230687726690306@lid:',
);

const now = new Date('2026-09-16T10:00:00.000Z');
assert.deepEqual(acknowledgementTimestamps('SERVER_ACCEPTED', now), { serverAcceptedAt: now });
assert.deepEqual(acknowledgementTimestamps('READ', now), {
  serverAcceptedAt: now,
  deliveredAt: now,
  readAt: now,
});

console.log('message archive tests passed');
