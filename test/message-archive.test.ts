import assert from 'node:assert/strict';

import {
  acknowledgementTimestamps,
  alternateJid,
  mergeMessageArchiveState,
  messageArchiveStateFromStatus,
  messageUpdateIdentity,
} from '../src/api/services/message-archive.service';
import { getAvailableNumbers } from '../src/utils/jidOptions';
import {
  AuthoritativeLidRegistry,
  normalizeGroupJoinRequestIdentity,
  normalizeParticipantIdentity,
  responseContainsAuthoritativeLid,
  validateMessageKeyRemoteJid,
  validateOutboundIdentifier,
} from '../src/utils/whatsappIdentity';

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
assert.equal(messageUpdateIdentity('ABC', 'SERVER_ACK', '230687726690306@lid'), 'ABC:SERVER_ACK:230687726690306@lid:');

const now = new Date('2026-09-16T10:00:00.000Z');
assert.deepEqual(acknowledgementTimestamps('SERVER_ACCEPTED', now), { serverAcceptedAt: now });
assert.deepEqual(acknowledgementTimestamps('READ', now), {
  serverAcceptedAt: now,
  deliveredAt: now,
  readAt: now,
});

assert.deepEqual(normalizeParticipantIdentity({ id: '123456@lid' }), {
  id: '123456@lid',
  username: null,
  lid: '123456@lid',
  phoneNumber: null,
  phoneNumberDigits: null,
  canonicalJid: '123456@lid',
  identifierType: 'lid',
  identityResolved: false,
  resolutionReason: 'lid_only',
  participantDigits: '123456',
});
assert.deepEqual(
  normalizeParticipantIdentity(
    {
      id: '15551234567@s.whatsapp.net',
      username: 'alice',
      phoneNumber: '15551234567@s.whatsapp.net',
      lid: '123456@lid',
    },
    '123456@lid',
  ),
  {
    id: '123456@lid',
    username: 'alice',
    lid: '123456@lid',
    phoneNumber: '15551234567@s.whatsapp.net',
    phoneNumberDigits: '15551234567',
    canonicalJid: '15551234567@s.whatsapp.net',
    identifierType: 'lid',
    identityResolved: true,
    resolutionReason: 'phone_number_available',
    participantDigits: '123456',
  },
);

assert.deepEqual(normalizeParticipantIdentity({ id: '987654@lid', username: 'private.user' }), {
  id: '987654@lid',
  username: 'private.user',
  lid: '987654@lid',
  phoneNumber: null,
  phoneNumberDigits: null,
  canonicalJid: '987654@lid',
  identifierType: 'lid',
  identityResolved: false,
  resolutionReason: 'username_lid_only',
  participantDigits: '987654',
});

assert.deepEqual(
  normalizeGroupJoinRequestIdentity({
    jid: '153081895514146@lid',
    request_method: 'invite_link',
    request_time: '1787745115',
    username: 'ruchamaschuman',
  }),
  {
    jid: '153081895514146@lid',
    request_method: 'invite_link',
    request_time: '1787745115',
    username: 'ruchamaschuman',
    lid: '153081895514146@lid',
    phoneNumber: null,
    canonicalJid: '153081895514146@lid',
    identifierType: 'lid',
    identityResolved: true,
    resolutionReason: 'username_lid_available',
  },
);

const authoritativeLids = new AuthoritativeLidRegistry();
assert.equal(authoritativeLids.has('153081895514146@lid'), false);
authoritativeLids.observeJoinRequests([
  {
    jid: '153081895514146@lid',
    request_method: 'invite_link',
    request_time: '1787745115',
    username: 'ruchamaschuman',
  },
]);
assert.equal(authoritativeLids.has('153081895514146@lid'), true);
assert.equal(authoritativeLids.has('999999999999999@lid'), false);

const joinRequestResponse = {
  method: 'groupRequestParticipantsList',
  result: [
    {
      jid: '153081895514146@lid',
      request_method: 'invite_link',
      request_time: '1787745115',
      username: 'ruchamaschuman',
    },
  ],
};
assert.equal(responseContainsAuthoritativeLid(joinRequestResponse, '153081895514146@lid'), true);
assert.equal(responseContainsAuthoritativeLid(joinRequestResponse, '999999999999999@lid'), false);

assert.deepEqual(validateOutboundIdentifier('@ruchamaschuman'), {
  valid: false,
  code: 'username_resolution_required',
  message:
    'A raw WhatsApp username cannot be used as a message destination. Resolve it to an authoritative @lid JID first.',
});
assert.deepEqual(validateOutboundIdentifier('153081895514146@lid'), { valid: true });
assert.deepEqual(validateMessageKeyRemoteJid('cmu6ntvfo000hmy8lj1yo1yy1'), {
  valid: false,
  code: 'invalid_whatsapp_jid',
  message:
    'remoteJid must be a full WhatsApp JID such as 15551234567@s.whatsapp.net, 153081895514146@lid, or 120363000000000000@g.us.',
});
assert.deepEqual(validateMessageKeyRemoteJid('153081895514146@lid'), { valid: true });

console.log('message archive tests passed');
