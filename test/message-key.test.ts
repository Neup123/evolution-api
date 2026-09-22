import assert from 'node:assert/strict';

import { hydrateMessageKey, preserveMessageKey } from '../src/api/services/message-key.service';

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
