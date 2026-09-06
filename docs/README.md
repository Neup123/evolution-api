# Evolution API Baileys 7 guide

This fork exposes the installed Baileys 7 socket API as stable HTTP routes while preserving Evolution API's existing routes. Use the live Swagger UI at `/docs` for a form-based request editor; its source file is [`openapi.yaml`](./openapi.yaml).

## Start here

1. Create and connect an Evolution API instance.
2. In Swagger, choose **Authorize** and enter the global API key. Swagger sends it in the `apikey` header.
3. Use a typed, grouped Baileys route. Swagger shows each method argument as a separate named input. Known enum values are dropdowns, primitive arrays accept repeated values, and structured inputs accept JSON. Positional `args` JSON is not needed.

`GET /baileys/methods/{instanceName}` returns the authoritative method registry for the installed version.

## Baileys routes

| Group | Purpose |
| --- | --- |
| `communities` | Community membership, groups, invites, and settings. |
| `business` | Business profile, catalogs, products, and collections. |
| `messages` | Messages, media, receipts, calls, and history. |
| `newsletters` | Channels/newsletters, subscribers, reactions, and metadata. |
| `groups` | Group creation, participants, invitations, and settings. |
| `account` | Profile, privacy, presence, contacts, labels, and quick replies. |
| `advanced` | Protocol-level, cryptographic, query, and binary operations. |

Every typed route has this shape:

```text
POST /baileys/{group}/{method}/{instanceName}
```

For example, remove a participant from a community:

```json
POST /baileys/communities/communityParticipantsUpdate/my-instance
apikey: YOUR_GLOBAL_API_KEY

{
  "jid": "120363000000000000@g.us",
  "participants": ["5511999999999@s.whatsapp.net"],
  "action": "remove"
}
```

The older `POST /baileys/{method}/{instanceName}` route with `{ "args": [] }` remains available for compatibility, but is deprecated in Swagger. For bytes, use `{ "$base64": "AAECAw==" }` in requests and expect the same envelope in responses.

The manager's **Webhooks** page provides an **Add destination** button, independent event selectors for every destination, and the complete event list below. Its sidebar links open this server's Swagger UI and this fork's documentation.

## Multiple webhooks per instance

`POST /webhook/set/{instanceName}` and `GET /webhook/find/{instanceName}` remain unchanged for existing integrations. Use these routes for multiple destinations:

```text
POST /webhook/set-many/{instanceName}
GET  /webhook/find-all/{instanceName}
```

`set-many` atomically replaces the destination list:

```json
{
  "webhooks": [
    {
      "enabled": true,
      "url": "https://automation.example/webhooks/whatsapp",
      "events": ["MESSAGES_UPSERT", "GROUP_PARTICIPANTS_UPDATE"],
      "headers": { "Authorization": "Bearer example" },
      "byEvents": false,
      "base64": false
    },
    {
      "enabled": true,
      "url": "https://audit.example/events",
      "events": [],
      "byEvents": true
    }
  ]
}
```

An empty `events` list means all supported events. With `byEvents: true`, a `MESSAGES_UPSERT` delivery uses a suffix such as `/messages-upsert`.

The migration copies every legacy `Webhook` row into `WebhookEndpoint` with the same ID. Updating the legacy one-webhook route keeps its corresponding destination synchronized, so existing instances need no reconfiguration.

## Baileys event coverage

All events exposed by the installed Baileys event map are available for local and global webhooks, except `contacts.set`, which Baileys 7 no longer emits. In addition to the established message, contact, chat, group, call, label, presence, and connection events, the API relays history status, LID mapping, media updates, reactions, receipts, group join requests/member tags, blocklist updates, newsletter events, message capping, chat locks, and settings updates. `CREDS_UPDATE` contains only instance metadata and never credentials.

## Baileys references

This is a REST adapter, not a replacement for Baileys behavior. See [Baileys documentation](https://baileys.wiki/) for JIDs, events, and protocol concepts, and the [Baileys repository](https://github.com/WhiskeySockets/Baileys) for source-level details and migration notes. Baileys is unofficial; use WhatsApp automation responsibly and in line with WhatsApp's terms.
