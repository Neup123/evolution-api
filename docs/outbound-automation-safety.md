# Outbound automation safety and pacing

Evolution API can apply a content-preserving policy to every outbound Baileys send performed through the normal message methods, n8n, or a configured chatbot. The feature is disabled by default and configured per instance at **Manager → Instance → Settings → Automation safety & pacing** or through `POST /settings/set/{instanceName}`.

This feature is for traffic safety, recipient protection, and predictable user experience. It does not edit message bodies, insert spelling mistakes, modify URLs, or claim that an automated message was written by a person.

## Processing order

1. Normalize the submitted recipient and reject a suppressed or non-allowlisted target before any WhatsApp number lookup.
2. Resolve eligible recipients to their canonical WhatsApp JID, then re-check recipient policy and quiet hours.
3. Check the in-process concurrency ceiling.
4. Classify direct recipients as `NEW`, `DORMANT`, or `ENGAGED` from persisted inbound history. Groups and broadcasts are `NON_DIRECT`.
5. Check the unique new/dormant-recipient quota, persistent failure circuit, instance and recipient limits, minimum interval, and configured duplicate-similarity threshold.
6. Reserve a new/dormant recipient in the rolling outreach window and create a `PENDING` audit row.
7. Calculate a bounded typing-indicator duration from visible text or caption length. A request's explicit `delay` remains authoritative when it is longer.
8. Send the message without changing its content.
9. Mark the audit row `SENT` or `FAILED`.
10. For `sendText`, persist transiently blocked work in the internal queue instead of requiring the caller to retry.

For `POST /message/sendText/{instanceName}`, transient cooldown decisions return a successful queued response. The queue stores the original text request, survives restarts, and re-runs the current safety policy immediately before delivery. Other send methods continue to return HTTP `429` when blocked.

Permanent decisions still return HTTP `429`. These include invalid destinations, suppression, allowlist rejection, quiet hours, and deliberate duplicate blocking. The API never queues a request that policy says must not be sent.

```json
{
  "status": 429,
  "error": "Too Many Requests",
  "response": {
    "message": [
      {
        "code": "recipient_rate_limit",
        "retryAfterSeconds": 60,
        "message": "Outbound message blocked by the instance automation safety policy."
      }
    ]
  }
}
```

`retryAfterSeconds` is omitted for permanent decisions such as suppression or a missing allowlist entry. The API does not return a `Retry-After` HTTP header; automation should read the JSON field.

## Internal text-message queue

The queue is used for these transient block codes:

- `concurrency_limit`
- `failure_circuit_open`
- `instance_rate_limit`
- `instance_daily_limit`
- `recipient_rate_limit`
- `recipient_daily_limit`
- `outreach_recipient_limit`
- `minimum_interval`

An accepted queued response looks like this:

```json
{
  "accepted": true,
  "queued": true,
  "messageWasSent": false,
  "deliveryStatus": "PENDING",
  "final": false,
  "queueId": "cm...",
  "status": "PENDING",
  "reason": "outreach_recipient_limit",
  "position": 1,
  "scheduledAt": "2026-09-24T11:00:00.000Z",
  "retryAfterSeconds": 86400
}
```

HTTP acceptance is not delivery confirmation. Callers and n8n workflows must use `messageWasSent`, not HTTP success alone. A queued response always has `messageWasSent: false`, `deliveryStatus: "PENDING"`, and `final: false`.

The database is the durable source of truth. The worker runs inside Evolution API and therefore works with or without RabbitMQ. A restart or temporary WhatsApp disconnect does not discard pending rows; processing resumes after the instance reconnects.

Unlike the hash-only audit table, the queue must retain the complete `sendText` request and its integration-routing context so it can deliver it later with the same behavior. Successful and cleared rows are deleted immediately. Failed rows remain visible for diagnosis and are removed after the configured `audit.retentionDays` period during subsequent queue activity.

Queue admission counts recent `SENT` audit rows together with pending/processing queue rows. It rejects the new request when that combined total reaches any configured finite capacity: instance per minute/day, recipient per minute/day, or unique new/dormant outreach recipients per day. Pacing controls such as typing delay and `minimumIntervalMs` schedule work but do not reduce queue capacity. In-flight immediate sends remain protected by the ordinary safety reservation and concurrency checks.

Capacity errors return HTTP `429` with a specific code (`outbound_queue_instance_minute_capacity`, `outbound_queue_instance_daily_capacity`, `outbound_queue_recipient_minute_capacity`, `outbound_queue_recipient_daily_capacity`, or `outbound_queue_outreach_daily_capacity`) and include `scope`, `window`, `limit`, `sent`, `queued`, `total`, and an expiry-based `retryAfterSeconds` value.

The queue also has a bounded scheduling horizon. If the calculated send time for a new item is more than `OUTBOUND_QUEUE_MAX_TAIL_GAP_SECONDS` after the current queue tail, the API rejects it with HTTP `429` and code `outbound_queue_wait_too_long`. The response includes `queueTailAt`, `requestedSendAt`, `gapSeconds`, and `maxGapSeconds`. The default maximum gap is 120 seconds. This guard is not applied when the queue is empty.

Immediately before actual delivery, Evolution resolves the current settings template again and re-runs every safety rule. This includes changes caused by direct sends using an override template while the item was waiting. A temporary block is returned to `PENDING` only when its recalculated schedule remains inside the configured queue horizon. If the wait is too long, or a permanent rule now rejects the message, the item becomes `FAILED` with the policy code and diagnostic details; it is not treated as sent.

### Inspect the queue

`GET /message/outboundQueue/{instanceName}?limit=100`

```json
{
  "pendingCount": 2,
  "processingCount": 0,
  "failedCount": 0,
  "nextSendAt": "2026-09-24T11:00:00.000Z",
  "estimatedEmptyAt": "2026-09-24T11:00:01.000Z",
  "items": [
    {
      "id": "cm...",
      "recipient": "15551234567@s.whatsapp.net",
      "status": "PENDING",
      "reason": "outreach_recipient_limit",
      "attempts": 0,
      "requestedAt": "2026-09-23T11:00:00.000Z",
      "scheduledAt": "2026-09-24T11:00:00.000Z",
      "lastError": null
    }
  ]
}
```

`nextSendAt` and `estimatedEmptyAt` are estimates. They can move when policy settings, recipient history, failures, or additional queued work change.

### Clear the queue

`DELETE /message/outboundQueue/{instanceName}`

```json
{
  "cleared": true,
  "deletedCount": 2,
  "processingAtClearTime": 0,
  "note": "All queued messages were deleted before delivery."
}
```

Clear removes pending and failed entries immediately. If `processingAtClearTime` is non-zero, a request already handed to WhatsApp may complete and cannot be recalled.

Use `GET /settings/outbound-audit/{instanceName}?limit=100&status=BLOCKED&recipient=...` to inspect the newest audit rows. `limit` is capped at 500 and filters are optional.

## Complete settings structure

```json
{
  "automationSafety": {
    "enabled": true,
    "typing": {
      "enabled": true,
      "minMs": 500,
      "maxMs": 5000,
      "charactersPerSecond": 18,
      "jitterPercent": 10,
      "presence": "composing",
      "applyToMediaCaptions": true
    },
    "rateLimit": {
      "instancePerMinute": 60,
      "instancePerDay": 5000,
      "recipientPerMinute": 10,
      "recipientPerDay": 250,
      "minimumIntervalMs": 750,
      "maxConcurrentSends": 4
    },
    "outreach": {
      "enabled": true,
      "newOrDormantRecipientsPerDay": 50,
      "dormantAfterDays": 180
    },
    "quietHours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00",
      "timeZone": "Europe/Athens"
    },
    "duplicate": {
      "enabled": true,
      "windowSeconds": 30,
      "similarityThresholdPercent": 100
    },
    "suppression": {
      "recipients": ["15551234567@s.whatsapp.net", "120363000000000000@g.us"],
      "allowlistEnabled": false,
      "allowedRecipients": []
    },
    "failurePause": { "enabled": true, "threshold": 5, "pauseSeconds": 300 },
    "audit": { "retentionDays": 90 }
  }
}
```

All nested objects and fields are optional when using the HTTP API; omitted fields use the defaults shown above.

| Field | Allowed value | Meaning |
|---|---|---|
| `enabled` | boolean | Master switch. `false` bypasses this entire layer and does not create outbound-safety audit rows. |
| `typing.enabled` | boolean | Show a presence indicator before sends containing visible text. |
| `typing.minMs`, `typing.maxMs` | 0–20,000 | Lower and upper duration bounds. `minMs` must not exceed `maxMs`. |
| `typing.charactersPerSecond` | 1–100 | Converts Unicode text length to an indicator duration. It never changes the text. |
| `typing.jitterPercent` | 0–25 | Small bounded variation used to spread simultaneous traffic bursts. |
| `typing.presence` | `composing`, `recording` | Presence value sent during the interval. |
| `typing.applyToMediaCaptions` | boolean | Include caption length for media sends. |
| `rateLimit.instancePerMinute` | 1–10,000 | Rolling one-minute accepted-send ceiling for the instance. |
| `rateLimit.instancePerDay` | 1–1,000,000 | Rolling 24-hour accepted-send ceiling for the instance. |
| `rateLimit.recipientPerMinute` | 1–1,000 | Rolling one-minute ceiling for one canonical recipient. |
| `rateLimit.recipientPerDay` | 1–100,000 | Rolling 24-hour ceiling for one recipient. |
| `rateLimit.minimumIntervalMs` | 0–600,000 | Required interval after the last successful send to the recipient. |
| `rateLimit.maxConcurrentSends` | 1–100 | Per-process in-flight ceiling. Persistent rolling limits still apply across restarts. |
| `outreach.enabled` | boolean | Limit unique direct recipients that are new or dormant. This sub-policy defaults to enabled whenever the master policy is enabled. |
| `outreach.newOrDormantRecipientsPerDay` | 1–100,000 | Unique new/dormant direct recipients accepted in a rolling 24-hour window. Repeated messages to the same person count once. |
| `outreach.dormantAfterDays` | 1–3,650 | A contact is engaged when their latest inbound message is newer than this boundary; otherwise they are dormant. |
| `quietHours.enabled` | boolean | Enforce the configured local-time window. |
| `quietHours.start`, `quietHours.end` | `HH:MM` | Half-open quiet window. Overnight windows such as 22:00–08:00 are supported. Equal values disable the window. |
| `quietHours.timeZone` | IANA name | Time zone such as `UTC`, `Europe/Athens`, or `America/New_York`. Invalid names fall back to UTC at runtime. |
| `duplicate.enabled` | boolean | Block exact or sufficiently similar visible text sent to the same recipient. |
| `duplicate.windowSeconds` | 1–86,400 | Rolling time window. Every successful send to the recipient inside it is checked; there is no fixed message-count limit. Media without visible text is not fingerprinted. |
| `duplicate.similarityThresholdPercent` | 1–100 | Minimum approximate similarity that is blocked. `100` (default) preserves exact-only behavior. Lower values add near-duplicate detection; `85` is a practical starting point and should be tuned against real traffic. |
| `suppression.recipients` | string array | Numbers or JIDs that automated sends must never target. Comparison is normalized and case-insensitive. |
| `suppression.allowlistEnabled` | boolean | Opt-in mode that rejects every recipient not present in `allowedRecipients`. |
| `suppression.allowedRecipients` | string array | Numbers or JIDs permitted when allowlist mode is enabled. Comparison is normalized and case-insensitive. |
| `failurePause.enabled` | boolean | Temporarily stop sends after consecutive recorded failures. |
| `failurePause.threshold` | 1–100 | Number of most recent instance attempts that must all have failed. |
| `failurePause.pauseSeconds` | 1–86,400 | Circuit-open interval measured from the newest failure. |
| `audit.retentionDays` | 1–3,650 | Retention for `OutboundMessageAudit`. Cleanup runs at most hourly per active instance. |

## Audit record

`OutboundMessageAudit` is instance-scoped and deleted if its operational instance is deleted. Each row contains:

| Field | Meaning |
|---|---|
| `recipient` | Normalized target number or JID. |
| `messageHash` | SHA-256 of exact visible text/caption, or null for non-text sends. The message body itself is not duplicated in this table. |
| `messageFingerprint` | Non-reversible 64-bit SimHash of normalized character trigrams, or null for non-text and legacy rows. It supports approximate comparison without retaining another message-body copy. |
| `messageType` | `text`, `media`, or `other`. |
| `status` | `PENDING`, `SENT`, `FAILED`, or `BLOCKED`. |
| `reason` | Stable failure or policy code, with a 100-character maximum. Raw transport errors are not persisted. |
| `recipientCategory` | `NEW`, `DORMANT`, `ENGAGED`, or `NON_DIRECT`; null for a block decided before relationship lookup. |
| `delayMs` | Automatically calculated indicator duration. |
| `requestedAt`, `sentAt` | Request and successful-delivery timestamps. |

Policy block codes are `recipient_suppressed`, `recipient_not_allowed`, `quiet_hours`, `concurrency_limit`, `failure_circuit_open`, `instance_rate_limit`, `instance_daily_limit`, `recipient_rate_limit`, `recipient_daily_limit`, `outreach_recipient_limit`, `minimum_interval`, and `duplicate_message`.

## Relationship semantics

- An inbound message immediately makes a direct contact `ENGAGED`, even when operational message saving is disabled.
- After `dormantAfterDays` without another inbound message, that contact becomes `DORMANT`.
- Outbound-only history never makes a contact engaged. This prevents a first unsolicited send from bypassing the quota on subsequent days.
- Groups (`@g.us`) and broadcasts (`@broadcast`) never consume the unique-person quota. The ordinary message-rate and concurrency controls still apply.
- Existing archived direct-message history is backfilled automatically during migration. `RecipientEngagement` then maintains first/last inbound and outbound timestamps without scanning the full message archive on every send.
- A new/dormant target is reserved when its send is accepted, so concurrent attempts cannot exceed the limit merely because transport completion is pending. A failed attempt still counts as targeted for that rolling window.

## Operational notes

- Rolling limits and duplicate/failure checks use PostgreSQL or MySQL audit rows and therefore survive restarts. The concurrency count is process-local; use conservative rolling limits when running multiple API replicas.
- Similarity comparison normalizes Unicode compatibility forms, letter case, and repeated whitespace, then compares a 64-bit character-trigram SimHash. The displayed percentage is an approximate fingerprint similarity, not an edit-distance guarantee. Exact SHA-256 equality is always blocked regardless of the configured percentage.
- Audit rows created before the similarity migration have no similarity fingerprint. They still participate in exact matching, but near-duplicate matching starts with sends recorded after the upgrade.
- The internal queue retries only messages rejected before WhatsApp delivery by a queueable safety decision. It does not automatically retry an uncertain transport send, because doing so without a confirmed idempotency key can duplicate a message.
- The settings migration is automatic during normal Evolution API startup. Back up the database before every application upgrade as usual.
- See [Defensive detection of automation disguise](./defensive-automation-detection.md) for safe teaching examples and detection guidance.
