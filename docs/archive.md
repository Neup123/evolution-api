# WhatsApp archive

Evolution API 4 can maintain an audit-grade WhatsApp archive in PostgreSQL while the existing operational tables continue to serve local-first reads. The archive is optional, append-only during normal operation, encrypted at the application boundary, and independent of an Evolution instance lifecycle.

This is an archive of the information observed by the connected client. WhatsApp does not guarantee that a newly linked client can recover all older history. The integrity result therefore proves what Evolution captured; it does not claim that WhatsApp supplied events it never synchronized.

## Deployment and migration

The Docker entrypoint already runs `prisma migrate deploy` before starting Evolution API. For a standard Compose upgrade, select the v4 image, keep the same PostgreSQL volume/connection, add the archive variables below, and recreate the API container. No manual SQL is needed. Take a `pg_dump` before any major upgrade; migrations change the database and are not a backup.

The archive is PostgreSQL-only in v4. MySQL continues to support the operational/local-first data model, but `ARCHIVE_ENABLED=true` is ignored with a warning. PgBouncer installations use the same PostgreSQL archive schema.

```dotenv
ARCHIVE_ENABLED=true
ARCHIVE_MASTER_KEY=BASE64_32_BYTE_KEY
ARCHIVE_API_KEY=SEPARATE_LONG_RANDOM_KEY
ARCHIVE_API_SCOPES=archive:read,archive:media,archive:export,archive:verify,archive:policy,archive:admin
ARCHIVE_CONFIRM_TTL_SECONDS=900
ARCHIVE_S3_PREFIX=whatsapp-archive
ARCHIVE_DEFAULT_POLICY={"capture":{"events":true,"messages":true,"contacts":true,"chats":true,"groups":true,"calls":true,"receipts":true,"reactions":true},"media":{"mode":"all"},"retentionDays":null}
```

Generate the master key with `openssl rand -base64 32`. Back it up separately from PostgreSQL. Losing it permanently makes encrypted payloads unreadable. Archive endpoints require the ordinary `apikey` header and `x-archive-key`. Object Lock/versioning is recommended for the S3-compatible bucket, but the API does not refuse to start if it is unavailable.

## Data structure

| Table | Durable purpose |
| --- | --- |
| `ArchiveAccount` | Stable archive identity plus the immutable last-sequence/head-hash checkpoint; no cascading foreign key to the operational instance. |
| `ArchivePolicy` | Versioned general, entity, account, or JID capture policy. |
| `ArchiveEvent` | Ordered encrypted event payload, searchable projection, payload hash, and hash-chain links. |
| `ArchiveMessage` / `ArchiveMessageRevision` | Stable message head plus chronological edits/deletes and searchable projections. |
| `ArchiveReceipt` / `ArchiveReaction` | Per-message delivery/read and reaction observations with timestamps. |
| `ArchiveMedia` | Message/media relationship, type, MIME type, size, object key, content hash, and storage state. |
| `ArchiveIdentityMapping` | Time-bounded PN JID ↔ LID JID observations. Both forms are preserved. |
| `ArchiveEntityRevision` | Contact, chat, and group snapshot history. |
| `ArchiveGroupMembership` | Participant/role state observations over time. |
| `ArchiveCall` | Call peer, group, status, media mode, and occurrence time. |
| `ArchiveSyncGap` | Known incomplete history-sync observations; absence never implies WhatsApp completeness. |
| `ArchivePurgePreview` | Expiring preview and hashed one-time confirmation secret. |
| `ArchivePurgeJob` | Purge criteria, counts, state, completion, and failure detail. |
| `ArchivePurgeTombstone` | HMAC-signed, content-free proof that a defined range was deleted. |
| `ArchiveAccessLog` | Allowed and denied scoped-key authorization attempts for archive reads/administration. |

`ArchiveEvent.sequence` is a PostgreSQL `BIGINT`; WhatsApp timestamps are stored as `TIMESTAMPTZ(6)`. Raw payloads use AES-256-GCM with a new 96-bit IV per record. Searchable projections contain only common fields such as JID, message ID, direction, text, status, participant, and display name. A policy that captures nothing still stores an excluded non-content receipt containing event type, time, entity classification, and a keyed HMAC-SHA-256 payload fingerprint. The keyed fingerprint prevents captured secret material from becoming an offline password verifier.

## Policy inheritance

Policies are merged from least to most specific:

1. `general` (`selector: {}`)
2. `entity` (`selector: {"entityType":"group"}`)
3. `account` (`selector: {"instanceName":"support"}` or an archive account ID)
4. `jid` (`selector: {"instanceName":"support","jid":"120363...@g.us"}`)

The most-specific matching value wins. New or changed policies apply prospectively. They never silently rewrite or delete older records; use the purge preview/confirm flow when a stricter policy should apply retroactively.

Policy document fields:

```json
{
  "capture": {
    "events": true,
    "messages": true,
    "contacts": true,
    "chats": true,
    "groups": true,
    "calls": true,
    "receipts": true,
    "reactions": true
  },
  "media": {
    "mode": "all",
    "types": ["image", "document"]
  },
  "directions": ["incoming", "outgoing"],
  "retentionDays": null,
  "recovery": { "enabled": false, "since": "2026-01-01T00:00:00Z" }
}
```

`media.mode` is `all`, `images`, `metadata`, or `none`. An explicit `types` list can select additional types. `retentionDays: null` means indefinite retention. Automatic retention execution is intentionally not enabled in v4: deletion always uses an inspectable purge job.

## HTTP contract

Every success is JSON. Validation/authentication errors use Evolution API's normal JSON error envelope. List endpoints accept `limit` from 1–1000. Dates are ISO-8601 strings.

### Status

`GET /archive/status?instanceName=optional`

Scope: `archive:read`.

```json
{
  "enabled": true,
  "provider": "postgresql",
  "accounts": [{
    "id": "uuid", "instanceName": "support", "ownerJid": "1555@s.whatsapp.net",
    "createdAt": "2026-09-09T12:00:00.000Z", "updatedAt": "2026-09-09T12:00:00.000Z",
    "events": 1234, "media": 45, "lastSequence": "1234", "lastCapturedAt": "2026-09-09T12:00:00.000Z"
  }]
}
```

### Events and entity views

`GET /archive/events/{instanceName}` supports `eventType`, `entityType`, `entityJid`, `groupJid`, `from`, `before`, `limit`, and `includePayload=true`. Scope is `archive:read`; decrypted payload inclusion requires `archive:export`.

`GET /archive/messages/{instanceName}`, `GET /archive/contacts/{instanceName}`, `GET /archive/chats/{instanceName}`, and `GET /archive/groups/{instanceName}` are filtered event views. They accept the same time/JID/event filters and require `archive:read`.

```json
[ {
  "id": "uuid", "accountId": "uuid", "instanceName": "support", "sequence": "42",
  "eventType": "messages.upsert", "entityType": "message", "entityJid": "1555@s.whatsapp.net",
  "messageId": "ABC", "occurredAt": "2026-09-09T12:00:00.000Z", "capturedAt": "2026-09-09T12:00:00.010Z",
  "projection": {"text":"hello","fromMe":false,"participant":null,"status":null},
  "payloadHash": "hmac-sha256", "previousHash": "sha256", "recordHash": "sha256", "excluded": false,
  "purgeJobId": null
}]
```

When requested with export scope, `payload` contains the decrypted original webhook `data`. Ciphertext, IV, and authentication tag are never returned.

### Media

`GET /archive/media/{instanceName}` accepts `entityJid`, `groupJid`, `mediaType`, `state`, and `limit`. Scope: `archive:media`.

```json
[{"id":"uuid","accountId":"uuid","eventId":"uuid","messageId":"ABC","entityJid":"120363...@g.us","mediaType":"image","mimeType":"image/jpeg","objectKey":"whatsapp-archive/...","contentHash":"hmac-sha256","sizeBytes":"2048","state":"stored","createdAt":"2026-09-09T12:00:00.000Z","purgedAt":null}]
```

### Normalized history views

`GET /archive/messages/{instanceName}/{messageId}/revisions?chatJid=optional` returns `{message,revisions[]}` with every observed message projection in chronological revision order.

`GET /archive/receipts/{instanceName}` and `GET /archive/reactions/{instanceName}` accept `messageId`, `entityJid`, and `limit` and return timestamped message receipt/reaction observations.

`GET /archive/memberships/{instanceName}` accepts `groupJid`, `participantJid`, and `limit`. Each row contains `state`, optional `role`, `sourceEventId`, `validFrom`, and `validTo`.

`GET /archive/calls/{instanceName}` accepts `peerJid`, `groupJid`, and `limit`. `GET /archive/sync-gaps/{instanceName}` accepts `status`, `entityJid`, and `limit`. All normalized history views require `archive:read`; their exact response properties are defined in OpenAPI.

### Policies

`GET /archive/policies` returns all versions. `PUT /archive/policies` creates a policy when `id` is omitted and increments its version when `id` exists. Scope: `archive:policy`.

```json
{
  "id": "optional-uuid",
  "scope": "jid",
  "selector": {"instanceName":"support","jid":"120363...@g.us"},
  "policy": {"capture":{"messages":true},"media":{"mode":"images"}},
  "effectiveAt": "2026-09-09T12:00:00.000Z"
}
```

The response is the stored `ArchivePolicy`, including `version`, `enabled`, `createdAt`, and `updatedAt`.

### Existing database backfill

`POST /archive/backfill/{instanceName}` with `{"limit":10000}` imports existing operational messages, contacts, and chats in chronological order. Scope: `archive:admin`. It is controlled and bounded; rerunning it creates new archive observations, so do not use it as a periodic sync.

```json
{"instanceName":"support","imported":{"messages":400,"contacts":100,"chats":80},"truncated":false}
```

This endpoint never asks WhatsApp for missing history. A live recovery endpoint is deliberately absent until it can report Baileys sync gaps and user-visible recovery limits instead of implying completeness.

### Purge preview and confirmation

`POST /archive/purges/preview/{instanceName}` requires `archive:admin`. At least one selector is required.

```json
{
  "before": "2026-01-01T00:00:00Z",
  "groupJid": "120363...@g.us",
  "eventTypes": ["messages.upsert"],
  "mediaOnly": false
}
```

`entityJid` selects any chat/contact/group. `groupJid` must end in `@g.us`. `before` removes history older than that instant. `mediaOnly` preserves events and deletes only matching media. A group purge removes group events and its archive media; shared contact identities are retained because they are not scoped to the group.

```json
{
  "previewId":"uuid", "confirmationToken":"one-time-secret", "expiresAt":"2026-09-09T12:15:00.000Z",
  "criteria":{"groupJid":"120363...@g.us"}, "summary":{"events":100,"media":12}
}
```

Confirm exactly that preview with `POST /archive/purges/confirm`:

```json
{"previewId":"uuid","confirmationToken":"one-time-secret"}
```

```json
{"jobId":"uuid","status":"completed","summary":{"events":100,"media":12,"deletedRanges":[{"start":"1","end":"100","previousHash":null,"lastHash":"sha256"}]},"tombstone":{"id":"uuid","criteriaHash":"sha256","tombstoneHash":"hmac-sha256","createdAt":"2026-09-09T12:01:00.000Z"}}
```

Confirmation deletes referenced S3 objects before committing database deletion. If an object deletion fails, the database content remains. Signed `deletedRanges` preserve only sequence and hash-chain boundaries, allowing verification to distinguish an authorized purge from arbitrary row deletion without retaining message content. The token expires after `ARCHIVE_CONFIRM_TTL_SECONDS` and only its hash is stored.

`GET /archive/purges/tombstones/{instanceName}` requires `archive:verify` and returns content-free deletion proofs in reverse chronological order.

### Integrity verification

`POST /archive/verify/{instanceName}` requires `archive:verify`.

```json
{"valid":true,"accountId":"uuid","checkedEvents":1134,"checkedTombstones":1,"head":"sha256","tombstoneHead":"hmac-sha256"}
```

On failure the response remains HTTP 200 with `valid:false` and either `failedAtSequence` or `failedTombstone`, allowing monitoring without treating a completed verification run as a transport error.

## Webhook and response coverage

Archive capture is called before external WebSocket, queue, webhook, Pusher, and Kafka delivery. The archive therefore does not depend on n8n availability. It accepts the exact `eventData.data` documented for all Evolution events. The complete field-by-field webhook structures, required fields, examples, n8n expressions, and event names are maintained in [AsyncAPI](./asyncapi.yaml) and the [webhook guide](./webhooks.md). The runtime renders them at `/webhooks/docs`.

The grouped Baileys request and response structures remain in [OpenAPI](./openapi.yaml) and the runtime Swagger UI at `/docs`. Archive projections do not replace those responses; they provide stable searchable views while encrypted payload export retains the exact observed event structure.

## Backups and restore

Use both:

- scheduled `pg_dump`/restore tests for PostgreSQL metadata, ciphertext, indexes, policies, and tombstones;
- versioned S3-compatible object replication/backups for media.

A PostgreSQL dump alone is not a complete media backup when `ArchiveMedia.objectKey` refers to S3. Restore the database, object store, archive master key, and archive API key separately. Run `/archive/verify/{instanceName}` after restore.
