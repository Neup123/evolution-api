# Outbound automation safety and pacing

Evolution API can apply a content-preserving policy to every outbound Baileys send performed through the normal message methods, n8n, or a configured chatbot. The feature is disabled by default and configured per instance at **Manager → Instance → Settings → Automation safety & pacing** or through `POST /settings/set/{instanceName}`.

This feature is for traffic safety, recipient protection, and predictable user experience. It does not edit message bodies, insert spelling mistakes, modify URLs, or claim that an automated message was written by a person.

## Processing order

1. Normalize the submitted recipient and reject a suppressed or non-allowlisted target before any WhatsApp number lookup.
2. Resolve eligible recipients to their canonical WhatsApp JID, then re-check recipient policy and quiet hours.
3. Check the in-process concurrency ceiling.
4. Check the persistent failure circuit, instance and recipient limits, minimum interval, and exact duplicate fingerprint.
5. Create a `PENDING` audit row.
6. Calculate a bounded typing-indicator duration from visible text or caption length. A request's explicit `delay` remains authoritative when it is longer.
7. Send the message without changing its content.
8. Mark the audit row `SENT` or `FAILED`.

Rejected requests return HTTP `429` with a machine-readable policy code and, when meaningful, `retryAfterSeconds`. Quiet-hour requests are rejected rather than silently held, so callers retain control of scheduling and idempotency.

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
    "quietHours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00",
      "timeZone": "Europe/Athens"
    },
    "duplicate": { "enabled": true, "windowSeconds": 30 },
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
| `quietHours.enabled` | boolean | Enforce the configured local-time window. |
| `quietHours.start`, `quietHours.end` | `HH:MM` | Half-open quiet window. Overnight windows such as 22:00–08:00 are supported. Equal values disable the window. |
| `quietHours.timeZone` | IANA name | Time zone such as `UTC`, `Europe/Athens`, or `America/New_York`. Invalid names fall back to UTC at runtime. |
| `duplicate.enabled` | boolean | Block the same exact visible text fingerprint to the same recipient. |
| `duplicate.windowSeconds` | 1–86,400 | Rolling duplicate window. Media without visible text is not fingerprinted. |
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
| `messageType` | `text`, `media`, or `other`. |
| `status` | `PENDING`, `SENT`, `FAILED`, or `BLOCKED`. |
| `reason` | Stable failure or policy code, with a 100-character maximum. Raw transport errors are not persisted. |
| `delayMs` | Automatically calculated indicator duration. |
| `requestedAt`, `sentAt` | Request and successful-delivery timestamps. |

Policy block codes are `recipient_suppressed`, `recipient_not_allowed`, `quiet_hours`, `concurrency_limit`, `failure_circuit_open`, `instance_rate_limit`, `instance_daily_limit`, `recipient_rate_limit`, `recipient_daily_limit`, `minimum_interval`, and `duplicate_message`.

## Operational notes

- Rolling limits and duplicate/failure checks use PostgreSQL or MySQL audit rows and therefore survive restarts. The concurrency count is process-local; use conservative rolling limits when running multiple API replicas.
- Automatic retries are intentionally not performed after an uncertain WhatsApp send because retrying without a confirmed idempotency key can duplicate a message. Workflow callers should retry only clearly rejected pre-send requests.
- The settings migration is automatic during normal Evolution API startup. Back up the database before every application upgrade as usual.
