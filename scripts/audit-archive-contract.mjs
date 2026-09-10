import fs from 'node:fs';

import YAML from 'yaml';

const router = fs.readFileSync('src/api/routes/archive.router.ts', 'utf8');
const guide = fs.readFileSync('docs/archive.md', 'utf8');
const openapi = YAML.parse(fs.readFileSync('docs/openapi.yaml', 'utf8'), { maxAliasCount: -1 });
const operations = [
  ['get', '/status', '/archive/status'],
  ['get', '/events/:instanceName', '/archive/events/{instanceName}'],
  ['get', '/messages/:instanceName', '/archive/messages/{instanceName}'],
  ['get', '/contacts/:instanceName', '/archive/contacts/{instanceName}'],
  ['get', '/chats/:instanceName', '/archive/chats/{instanceName}'],
  ['get', '/groups/:instanceName', '/archive/groups/{instanceName}'],
  ['get', '/media/:instanceName', '/archive/media/{instanceName}'],
  ['get', '/messages/:instanceName/:messageId/revisions', '/archive/messages/{instanceName}/{messageId}/revisions'],
  ['get', '/receipts/:instanceName', '/archive/receipts/{instanceName}'],
  ['get', '/reactions/:instanceName', '/archive/reactions/{instanceName}'],
  ['get', '/memberships/:instanceName', '/archive/memberships/{instanceName}'],
  ['get', '/calls/:instanceName', '/archive/calls/{instanceName}'],
  ['get', '/sync-gaps/:instanceName', '/archive/sync-gaps/{instanceName}'],
  ['get', '/policies', '/archive/policies'],
  ['put', '/policies', '/archive/policies'],
  ['post', '/backfill/:instanceName', '/archive/backfill/{instanceName}'],
  ['post', '/purges/preview/:instanceName', '/archive/purges/preview/{instanceName}'],
  ['post', '/purges/confirm', '/archive/purges/confirm'],
  ['get', '/purges/tombstones/:instanceName', '/archive/purges/tombstones/{instanceName}'],
  ['post', '/verify/:instanceName', '/archive/verify/{instanceName}'],
];

for (const [method, route, documented] of operations) {
  if (!router.includes(`.${method}('${route}'`)) throw new Error(`Archive router is missing ${method.toUpperCase()} ${route}`);
  if (!openapi.paths?.[documented]?.[method]) throw new Error(`OpenAPI is missing ${method.toUpperCase()} ${documented}`);
  if (!guide.includes(documented)) throw new Error(`Archive guide is missing ${documented}`);
}
for (const schema of ['ArchiveStatus', 'ArchiveEvent', 'ArchiveMedia', 'ArchiveMessageHistory', 'ArchiveReceipt', 'ArchiveReaction', 'ArchiveMembership', 'ArchiveCall', 'ArchiveSyncGap', 'ArchivePolicyInput', 'ArchivePolicy', 'ArchivePurgeCriteria', 'ArchivePurgePreview', 'ArchiveTombstone']) {
  if (!openapi.components?.['x-archive-schemas']?.[schema]) throw new Error(`OpenAPI is missing ${schema}`);
}
console.log(`Audited ${operations.length} archive operations and their response contracts successfully.`);
