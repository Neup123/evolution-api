import assert from 'node:assert/strict';

const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const apiKey = process.env.EVOLUTION_API_KEY;
const instance = process.env.EVOLUTION_INSTANCE;
if (!baseUrl || !apiKey || !instance) {
  throw new Error('Set EVOLUTION_API_URL, EVOLUTION_API_KEY, and EVOLUTION_INSTANCE');
}

async function request(path, body, method = 'POST') {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { apikey: apiKey, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${JSON.stringify(value)}`);
  return { value, source: response.headers.get('x-evolution-data-source') };
}

const privacy = await request(`/baileys/messages/fetchPrivacySettings/${instance}`, {});
assert.ok(privacy.value.result && typeof privacy.value.result === 'object');

const compactGroups = await request(`/baileys/groups/groupFetchAllParticipating/${instance}?live=true`, {
  includeParticipants: false,
});
const groups = Object.values(compactGroups.value.result ?? {});
assert.ok(groups.length > 0, 'Connected account returned no participating groups');
assert.ok(groups.every((group) => !('participants' in group)), 'Compact group response contains participants');

const regular = groups.find((group) => !group.isCommunity && !group.isCommunityAnnounce && !group.linkedParent);
assert.ok(regular?.id, 'No regular group was available for the read audit');
const liveMetadata = await request(`/baileys/groups/groupMetadata/${instance}?live=true`, { jid: regular.id });
const participants = liveMetadata.value.result?.participants ?? [];
assert.ok(
  participants.every(
    (participant) =>
      participant.canonicalJid &&
      participant.identifierType &&
      (!String(participant.id).endsWith('@lid') || participant.lid === participant.id),
  ),
  'Group participant identifiers were not normalized',
);
const cachedMetadata = await request(`/baileys/groups/groupMetadata/${instance}`, { jid: regular.id });
assert.equal(cachedMetadata.source, 'local');

const community = groups.find((group) => group.isCommunity);
if (community?.id) {
  const linked = await request(`/baileys/communities/communityFetchLinkedGroups/${instance}?live=true`, {
    jid: community.id,
  });
  assert.ok(Array.isArray(linked.value.result?.linkedGroups));
  assert.ok(
    linked.value.result.linkedGroups.every(
      (group) => group.metadataComplete === false || (group.creation != null && group.owner != null),
    ),
    'A linked group claimed complete metadata while creation or owner was absent',
  );
}

const legacyGroups = await request(`/group/fetchAllGroups/${instance}?getParticipants=false&live=true`, undefined, 'GET');
assert.ok(Array.isArray(legacyGroups.value) && legacyGroups.value.length > 0);
assert.ok(legacyGroups.value.every((group) => !('participants' in group)));

const catalog = await request(`/baileys/business/getCatalog/${instance}?live=true`, { options: { limit: 10 } });
if ((catalog.value.result?.products ?? []).length === 0) {
  assert.equal(catalog.value.diagnostics?.empty, true, 'Empty catalog response lacks diagnostics');
}

console.log(
  JSON.stringify({
    privacy: 'ok',
    groups: groups.length,
    participantIdentifiers: participants.length,
    linkedCommunityChecked: Boolean(community),
    legacyCompactGroups: legacyGroups.value.length,
    catalogProducts: catalog.value.result?.products?.length ?? 0,
    catalogDiagnostic: Boolean(catalog.value.diagnostics),
    localCacheHit: cachedMetadata.source === 'local',
  }),
);
