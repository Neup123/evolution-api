# Delete a message

Use `DELETE /chat/deleteMessageForEveryone/{instanceName}` to delete one WhatsApp message with the strongest permission available. The route name is retained for compatibility, but callers do not choose the scope:

1. A message sent by the connected account is deleted for everyone.
2. Another participant's group message is deleted for everyone when the connected account is a group admin.
3. Another person's direct message is deleted for the connected account only.
4. Another participant's group message is deleted for the connected account only when the account is not a group admin.
5. If a delete-for-everyone submission is not confirmed, the route falls back to delete-for-me.

The response always states the applied `deletion.scope`. `EVERYONE` means WhatsApp acknowledged the revoke. `ME` means WhatsApp accepted the app-state patch used to remove the message from the connected account and its linked devices.

## Request fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | Yes | Original `data.key.id`. |
| `remoteJid` | Yes | Original `data.key.remoteJid`. For groups this is the **group JID**, never the participant JID. |
| `participant` | Recommended for groups | Original `data.key.participant`, commonly an LID. |
| `participantAlt` | Optional | Original `data.key.participantAlt`, commonly the phone-number JID. |
| `messageTimestamp` | Fallback | Original `data.messageTimestamp` in Unix seconds. It is required for delete-for-me only when Evolution cannot find the stored message. |
| `deleteMedia` | No | Whether delete-for-me also removes locally stored media. Defaults to `true`. |
| `fromMe` | Compatibility only | Normally omit it. The archived message key remains authoritative. |

Example for a group message:

```json
{
  "id": "3EB0154DD79F8A3DFF054D",
  "remoteJid": "120363410369941696@g.us",
  "participant": "151672961659093@lid",
  "participantAlt": "972553049308@s.whatsapp.net",
  "messageTimestamp": 1790062631,
  "deleteMedia": true
}
```

Do not put `participant`, `participantAlt`, the Evolution database row ID, or the webhook envelope's `sender` in `remoteJid`.

## Response: deleted for everyone

```json
{
  "status": 2,
  "deletion": {
    "requestedMessageId": "3EB0154DD79F8A3DFF054D",
    "scope": "EVERYONE",
    "target": "OTHER_PARTICIPANT_MESSAGE",
    "ownershipSource": "ARCHIVED_MESSAGE_KEY",
    "submitted": true,
    "appStatePatchAccepted": false,
    "serverAcknowledged": true,
    "everyoneAttempted": true,
    "everyoneConfirmed": true,
    "status": "SERVER_ACK"
  }
}
```

## Response: deleted for me

```json
{
  "status": "APP_STATE_PATCH_ACCEPTED",
  "deletion": {
    "requestedMessageId": "3EB0154DD79F8A3DFF054D",
    "scope": "ME",
    "target": "OTHER_PARTICIPANT_MESSAGE",
    "ownershipSource": "ARCHIVED_MESSAGE_KEY",
    "fallbackReason": "INCOMING_DIRECT_MESSAGE",
    "submitted": true,
    "appStatePatchAccepted": true,
    "serverAcknowledged": false,
    "everyoneAttempted": false,
    "everyoneConfirmed": false,
    "status": "APP_STATE_PATCH_ACCEPTED"
  }
}
```

Possible fallback reasons are `INCOMING_DIRECT_MESSAGE`, `GROUP_ADMIN_REQUIRED`, `GROUP_PARTICIPANT_REQUIRED`, and `EVERYONE_NOT_CONFIRMED`.

Delete-for-me uses Baileys `chatModify({ deleteForMe })`. Unlike a revoke, this app-state operation does not create an outgoing protocol message with a message-status acknowledgement. The API therefore reports `appStatePatchAccepted` separately instead of pretending it received `SERVER_ACK`.

## n8n mapping

When an n8n Webhook node provides the standard `body` wrapper, use:

- **Chat JID (Contact or Group)**: `{{ $json.body.data.key.remoteJid }}`
- **Message ID**: `{{ $json.body.data.key.id }}`
- **Original Participant JID**: `{{ $json.body.data.key.participant }}`
- **Participant Alternate JID**: `{{ $json.body.data.key.participantAlt }}`
- **Message Timestamp**: `{{ $json.body.data.messageTimestamp }}`

If a previous node has already unwrapped `body`, remove `.body` from those expressions.

## Swagger

Swagger presents the request schema as individual guided fields through `application/x-www-form-urlencoded`. Select `application/json` from the request content-type menu only when you want the advanced raw JSON editor. Both modes use the same validation schema.
