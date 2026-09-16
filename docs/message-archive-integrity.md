# Operational message integrity

Evolution API 5.1 treats the mutable `Message` table as a canonical local message index instead of assuming that every successful send call is WhatsApp history. This protects workflows that use `POST /chat/findMessages/{instanceName}` to decide whether a message was really delivered.

This operational table is separate from the encrypted append-only archive documented in [WhatsApp archive](./archive.md). The operational table is optimized for current application queries; the archive preserves every observed event and revision for audit and backup purposes.

## Evidence lifecycle

| `archiveState` | Meaning | Delivery proof? |
|---|---|---:|
| `PROVISIONAL` | Evolution called Baileys and stored the immediate local send result. WhatsApp has not acknowledged it. | no |
| `SERVER_ACCEPTED` | WhatsApp returned `SERVER_ACK`. The server accepted the message, but a recipient device has not confirmed delivery. | no |
| `AUTHORITATIVE` | The row came from an inbound WhatsApp event or history sync. For incoming messages this proves WhatsApp supplied the event. | not for an outgoing recipient |
| `DELIVERED` | A `DELIVERY_ACK` was observed. | yes |
| `READ` | A read acknowledgement was observed. | yes |
| `PLAYED` | A played acknowledgement was observed for supported media. | yes |
| `FAILED` | Sending or acknowledgement reported failure. | no |

The state is monotonic: a late `PENDING` or `SERVER_ACK` cannot replace `DELIVERED`, `READ`, or `PLAYED`. `serverAcceptedAt`, `deliveredAt`, and `readAt` keep the first observed time for each stage. `Message.status` advances for both incoming and outgoing messages; older releases accidentally skipped the outgoing update.

## Identity and idempotency

`waMessageId` is the WhatsApp message key ID. New rows are unique by `(instanceId, waMessageId)`, so a local send result, a later WhatsApp event, history sync, and acknowledgements converge on one row.

`remoteJid` preserves the first observed address. `remoteJidAlt` preserves a second PN or LID address for the same message. Searches for either address check both columns and the compatible fields inside `key`. Evolution never replaces one identity with the other or invents a phone number from a LID.

`IsOnWhatsapp.jidOptions` now stores each complete JID exactly once. The former helper could create values such as `number@s.whatsapp.net@s.whatsapp.net`; migration 5.1 repairs those values. The `lid` column contains the actual `number@lid` value or null, never the literal marker `"lid"`.

The same identity rule applies to group participant webhooks: the local part of `123456@lid` is not a phone number. `GROUP_PARTICIPANTS_UPDATE.participantsData.phoneNumber` is now a verified full PN JID or null, and `identityResolved` tells consumers whether that PN mapping exists. See [WhatsApp identifiers, contacts, groups, and channels](./baileys/identifiers.md).

Acknowledgement rows use a stable identity made from instance, WhatsApp message ID, status, remote JID, and participant. Duplicate event delivery therefore cannot create repeated future `MessageUpdate` rows.

## Origin

`archiveOrigin` records how the canonical row began:

- `LOCAL_OUTBOUND`: immediate result of an Evolution/Baileys send operation.
- `WHATSAPP_EVENT`: message received through the Baileys event stream.
- `HISTORY_SYNC`: message supplied by WhatsApp history synchronization.
- `LEGACY`: row created before provenance tracking existed.

Origin is descriptive and is not delivery evidence. In particular, `LOCAL_OUTBOUND` plus `PROVISIONAL` must never be interpreted as a sent or delivered WhatsApp message.

## Search contract

`POST /chat/findMessages/{instanceName}` reads the local database only. The complete request and response schema is available in Swagger at `/docs`.

```json
{
  "where": {
    "key": {
      "remoteJid": "12142238715@s.whatsapp.net",
      "fromMe": true
    },
    "messageTimestamp": {
      "gte": "2026-09-01T00:00:00Z",
      "lte": "2026-09-30T23:59:59Z"
    }
  },
  "page": 1,
  "offset": 50
}
```

```json
{
  "messages": {
    "total": 1,
    "pages": 1,
    "currentPage": 1,
    "records": [{
      "id": "database-row-id",
      "waMessageId": "3EB02DACE4F1F7EAEDADCA",
      "key": {
        "id": "3EB02DACE4F1F7EAEDADCA",
        "remoteJid": "12142238715@s.whatsapp.net",
        "fromMe": true
      },
      "remoteJid": "12142238715@s.whatsapp.net",
      "remoteJidAlt": "230687726690306@lid",
      "pushName": null,
      "messageType": "conversation",
      "message": { "conversation": "Example" },
      "messageTimestamp": 1789542377,
      "instanceId": "instance-id",
      "source": "web",
      "contextInfo": null,
      "status": "DELIVERY_ACK",
      "archiveOrigin": "LOCAL_OUTBOUND",
      "archiveState": "DELIVERED",
      "serverAcceptedAt": "2026-09-16T07:06:18.000Z",
      "deliveredAt": "2026-09-16T07:06:20.000Z",
      "readAt": null,
      "MessageUpdate": [
        { "status": "SERVER_ACK" },
        { "status": "DELIVERY_ACK" }
      ]
    }]
  }
}
```

Automation must require `archiveState` of `DELIVERED`, `READ`, or `PLAYED`, or a corresponding `MessageUpdate[].status`, before treating an outgoing message as delivered. `SERVER_ACK` is not sufficient.

## Upgrade and legacy rows

The normal container entrypoint runs the PostgreSQL or MySQL migration automatically before the API starts. No manual SQL is required; keep the database volume and connection unchanged and take a normal database backup before upgrading.

The migration is non-destructive. It fills identity and provenance only where the old data is unambiguous. Historical duplicate WhatsApp IDs remain readable with `waMessageId: null` instead of deleting or merging evidence. All newly observed traffic uses the canonical constraints. This release is intentionally focused on correct future behavior rather than guessing how conflicting historical rows should be rewritten.

Run `npm run test:message-archive`, `npm run build`, and `npm run audit:baileys-docs` when changing these rules. The PostgreSQL and MySQL migration chains must also be tested on empty databases; PostgreSQL should additionally be tested against a temporary production copy when legacy data is available.
