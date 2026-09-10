# Local-first read-through API

Evolution API v4.1 can satisfy eligible WhatsApp reads from persistent, instance-scoped database snapshots. This reduces calls to WhatsApp while preserving the existing JSON response body.

## Request behavior

For an eligible operation, the API follows this order:

1. Build a cache key from the instance, method, and normalized arguments.
2. Return a complete, relevant snapshot while it is within its configured TTL.
3. On a missing, empty, irrelevant, or expired result, make one live WhatsApp request and persist the successful result.
4. Return live failures to the caller. Expired data is never used as a silent fallback.

Concurrent misses for the same key share one in-process live request. Snapshots remain isolated between Evolution instances.

Use either `?live=true` or `"live": true` in the JSON body to bypass a stored snapshot. The body field is control metadata and is not forwarded to Baileys.

Grouped Baileys responses include:

| Header | Meaning |
| --- | --- |
| `X-Evolution-Data-Source: local` | A fresh database snapshot supplied the response. |
| `X-Evolution-Data-Source: live` | WhatsApp supplied the response. |
| `X-Evolution-Data-Age` | Whole seconds since the local snapshot was fetched. Present only for local responses. |

Traditional Evolution routes preserve their previous response bodies and do not add a response envelope.

## Eligible operations

Traditional Evolution routes:

| Area | Operations |
| --- | --- |
| Chat | Check WhatsApp numbers, fetch profile picture, fetch profile, fetch business profile, fetch privacy settings |
| Group | Find group information, fetch all groups, find participants |

Grouped Baileys methods:

| Area | Methods |
| --- | --- |
| Communities | `communityMetadata`, `communityFetchLinkedGroups`, `communityRequestParticipantsList`, `communityInviteCode`, `communityGetInviteInfo`, `communityFetchAllParticipating` |
| Business | `getOrderDetails`, `getCatalog`, `getCollections`, `getBusinessProfile` |
| Newsletters | `newsletterSubscribers`, `newsletterMetadata`, `newsletterFetchMessages`, `newsletterAdminCount` |
| Groups | `groupMetadata`, `groupRequestParticipantsList`, `groupInviteCode`, `groupGetInviteInfo`, `groupFetchAllParticipating` |
| Account and privacy | `getBotListV2`, `fetchBlocklist`, `fetchStatus`, `fetchDisappearingDuration`, `fetchAccountReachoutTimelock`, `fetchNewChatMessageCap`, `onWhatsapp`, `profilePictureUrl` |

Chat, contact, message, and status searches that already query Evolution's normalized tables continue to be database-local and do not use `LocalReadSnapshot`.

Methods with process-local streams, callbacks, socket lifecycle control, or an inherently mutating effect remain live-only.

## Configuration

```dotenv
DATABASE_READ_THROUGH_ENABLED=true
DATABASE_READ_THROUGH_TTL_SECONDS=3600
DATABASE_READ_THROUGH_TTL_OVERRIDES={"fetchStatus":300,"groupMetadata":1800}
```

- `DATABASE_READ_THROUGH_ENABLED=false` makes every eligible request live.
- `DATABASE_READ_THROUGH_TTL_SECONDS` is the non-negative default TTL.
- `DATABASE_READ_THROUGH_TTL_OVERRIDES` maps exact internal method names to non-negative TTLs in seconds. Invalid JSON or invalid values are ignored.
- A TTL of `0` permits reuse only during the snapshot's creation second; use `live=true` when a guaranteed bypass is required.

Each instance can override the environment defaults in **Manager → Instance → Settings → Local data cache** or through `POST /settings/set/{instanceName}`:

```json
{
  "localReadTtlSeconds": 900,
  "localReadTtlOverrides": {"groupMetadata": 3600, "fetchStatus": 60}
}
```

Precedence is method override for the instance, instance default, environment method override, then environment default. The maximum accepted TTL is 30 days. Empty catalogs, collections, and profile-picture results are stored as observations but do not suppress the next live lookup.

## Persistence and migration

Provider-specific migrations run automatically during the normal container startup. The v4.1 migration adds per-instance TTL fields to `Setting`; the earlier v3 migration creates `LocalReadSnapshot` and recreates `IsOnWhatsapp` with an instance foreign key and instance-scoped uniqueness.

The `IsOnWhatsapp` recreation intentionally clears legacy global number-cache rows. They are rebuilt on demand and can no longer leak identity results between instances. This is one reason the release is a breaking major version.

Each snapshot records the instance, method, deterministic argument hash, JSON result, completeness flag, and fetch timestamp. Deleting an instance cascades to its snapshots.

## Consistency and invalidation

Relevant group, community, newsletter, product, privacy, profile, status, blocklist, settings, and LID-mapping mutations/events invalidate or replace affected snapshots. Invalidation is deliberately broader than a single argument key when a mutation can change multiple views.

This is a bounded-staleness model, not a transactional mirror of WhatsApp. Set short TTL overrides or force a live read for decisions that require immediate remote state, such as authorizing a participant from current group membership.

## Errors and identity rules

- An uncached LID cannot be inferred offline and is not reported as a valid contact.
- Profile and number lookups surface connection failures instead of returning invented success data.
- A profile-picture `null` is cached only when WhatsApp actually reports that no picture exists; transport failures are errors.
- A forced live failure never falls back to an older snapshot.

## API examples

```http
POST /baileys/groups/groupMetadata/my-instance
apikey: YOUR_API_KEY
Content-Type: application/json

{"jid":"120363000000000000@g.us"}
```

Force the same operation live:

```http
POST /baileys/groups/groupMetadata/my-instance?live=true
apikey: YOUR_API_KEY
Content-Type: application/json

{"jid":"120363000000000000@g.us"}
```

The v3 Baileys API exposes only grouped routes. Replace the removed `/baileys/{method}/{instanceName}` form and positional `args` with `/baileys/{group}/{method}/{instanceName}` and named inputs.

## Deployment and rollback

Deploy in this order: database migration, Evolution API v3, then the v2 n8n node. Verify a live request first, repeat it and confirm `X-Evolution-Data-Source: local`, then test `live=true` and confirm `live`.

Before rollback, stop v3 writers. Older application versions do not understand the new instance-scoped number-cache schema. Restore a pre-v3 database backup or supply a reviewed reverse migration; do not run mixed v2/v3 API replicas against the migrated database.
