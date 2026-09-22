import assert from 'node:assert/strict';

import {
  buildDeleteMessageKey,
  hydrateMessageKey,
  preserveMessageKey,
  resolveDeleteMessageOwnership,
} from '../src/api/services/message-key.service';

const groupLidKey = {
  id: '3EB0A_MESSAGE',
  fromMe: true,
  remoteJid: '120363000000000000@g.us',
  remoteJidAlt: '120363000000000000@g.us',
  participant: '230687726690306@lid',
  participantAlt: '12142238715@s.whatsapp.net',
  addressingMode: 'lid',
};

const preserved = preserveMessageKey(groupLidKey);
assert.deepEqual(preserved, groupLidKey);
assert.notEqual(preserved, groupLidKey);
assert.equal(preserved.participant, '230687726690306@lid');
assert.equal(preserved.participantAlt, '12142238715@s.whatsapp.net');
assert.equal(preserved.addressingMode, 'lid');

const directLidKey = {
  id: '3EB0B_MESSAGE',
  fromMe: false,
  remoteJid: '230687726690306@lid',
  remoteJidAlt: '12142238715@s.whatsapp.net',
};
assert.deepEqual(preserveMessageKey(directLidKey), directLidKey);

console.log('message key tests passed');

const partialGroupDelete = {
  id: '3EB0A_MESSAGE',
  fromMe: false,
  remoteJid: '120363000000000000@g.us',
  participant: '230687726690306@lid',
};
const hydrated = hydrateMessageKey(partialGroupDelete, groupLidKey);
assert.equal(hydrated.id, partialGroupDelete.id);
assert.equal(hydrated.remoteJid, groupLidKey.remoteJid);
assert.equal(hydrated.participant, groupLidKey.participant);
assert.equal(hydrated.participantAlt, groupLidKey.participantAlt);
assert.equal(hydrated.addressingMode, groupLidKey.addressingMode);
assert.equal(hydrated.fromMe, groupLidKey.fromMe);
assert.deepEqual(hydrateMessageKey(partialGroupDelete), partialGroupDelete);

const deleteKey = buildDeleteMessageKey(partialGroupDelete, groupLidKey);
assert.deepEqual(deleteKey, {
  id: partialGroupDelete.id,
  remoteJid: groupLidKey.remoteJid,
  fromMe: groupLidKey.fromMe,
  participant: groupLidKey.participant,
});
assert.equal('participantAlt' in deleteKey, false);
assert.equal('addressingMode' in deleteKey, false);

const deleteKeyWithRowParticipant = buildDeleteMessageKey(
  { id: 'MESSAGE_WITHOUT_KEY_PARTICIPANT', remoteJid: groupLidKey.remoteJid, fromMe: false },
  { id: 'MESSAGE_WITHOUT_KEY_PARTICIPANT', remoteJid: groupLidKey.remoteJid, fromMe: false },
  '972500000000@s.whatsapp.net',
);
assert.equal(deleteKeyWithRowParticipant.participant, '972500000000@s.whatsapp.net');

assert.deepEqual(resolveDeleteMessageOwnership({ id: 'OWN_DIRECT', remoteJid: '972500000001@s.whatsapp.net' }), {
  fromMe: true,
  source: 'INFERRED_CONNECTED_ACCOUNT',
});
assert.deepEqual(
  resolveDeleteMessageOwnership({
    id: 'OTHER_GROUP',
    remoteJid: groupLidKey.remoteJid,
    participant: groupLidKey.participant,
  }),
  { fromMe: false, participant: groupLidKey.participant, source: 'INFERRED_GROUP_PARTICIPANT' },
);
assert.equal(
  resolveDeleteMessageOwnership(
    { id: 'REQUEST_DISAGREES', remoteJid: groupLidKey.remoteJid, fromMe: false },
    groupLidKey,
  ).source,
  'ARCHIVED_MESSAGE_KEY',
);
