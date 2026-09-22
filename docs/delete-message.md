# Delete a message for everyone

Use `DELETE /chat/deleteMessageForEveryone/{instanceName}` to revoke a message from WhatsApp. The route detects whether the original message belongs to the connected account or to another group participant, chooses the strongest valid WhatsApp revoke mode, and waits for a server acknowledgement before reporting success.

## Ownership detection

The API resolves the operation in this order:

1. If the original message exists in the instance-scoped `Message` table, its stored `key.fromMe`, chat JID, and participant JID are authoritative.
2. Otherwise, an explicit `fromMe` value is used as a compatibility override.
3. Otherwise, a group request with `participant` is treated as another participant's message and uses group-admin deletion.
4. Otherwise, the message is treated as one sent by the connected account.

The response reports the selected `deletion.target` and `deletion.ownershipSource`. Clients normally should omit `fromMe` and let the API detect the correct mode.

## Permissions and limitations

- A message sent by the connected account can be revoked in a direct chat or group, subject to WhatsApp's deletion window and server policy.
- Another participant's group message can be revoked only when the connected account is a group admin. The original participant JID is required.
- WhatsApp does not permit revoking another person's incoming direct message for everyone. The API returns `CANNOT_REVOKE_INCOMING_DIRECT_MESSAGE` instead of a misleading pending success.
- The API cannot elevate a non-admin account. When group metadata identifies the connected account as a non-admin, the request returns `GROUP_ADMIN_REQUIRED`.

## Recommended request

When message storage is enabled, only the message ID and chat JID are needed:

```http
DELETE /chat/deleteMessageForEveryone/chabad-info
apikey: YOUR_GLOBAL_API_KEY
Content-Type: application/json

{
  "id": "3A222167F7B463F69944",
  "remoteJid": "120363043342036080@g.us"
}
```

When the original message is not stored, copy the participant identities from the `MESSAGES_UPSERT` webhook key:

```json
{
  "id": "3A222167F7B463F69944",
  "remoteJid": "120363043342036080@g.us",
  "participant": "184353602666626@lid",
  "participantAlt": "972559128260@s.whatsapp.net"
}
```

`participantAlt` helps identity resolution, but the WhatsApp revoke protobuf itself contains only `remoteJid`, `fromMe`, `id`, and `participant`. This is why retaining extra LID metadata alone did not fix incomplete revoke keys in earlier releases.

## Confirmed response

The route no longer treats Baileys's immediate `PENDING` object as proof of deletion. It listens for the outgoing revoke message's WhatsApp server acknowledgement. Only then does it update the local message state, emit `MESSAGES_DELETE`, and return success:

```json
{
  "status": "SERVER_ACK",
  "deletion": {
    "requestedMessageId": "3A222167F7B463F69944",
    "target": "GROUP_PARTICIPANT_MESSAGE",
    "ownershipSource": "ARCHIVED_MESSAGE_KEY",
    "submitted": true,
    "serverAcknowledged": true,
    "status": "SERVER_ACK"
  }
}
```

If no acknowledgement arrives within ten seconds, the API returns `DELETE_NOT_ACKNOWLEDGED` and does not mark the local message as deleted.

## n8n node

In `n8n-nodes-evolution-api-en` 4.3.1 or newer, choose **Auto Detect** for **Message Ownership**. For a group message, map these webhook values when available:

- **Contact**: `{{$json.data.key.remoteJid}}`
- **Message ID**: `{{$json.data.key.id}}`
- **Original Participant JID**: `{{$json.data.key.participant}}`
- **Participant Alternate JID**: `{{$json.data.key.participantAlt}}`

The node throws an error for an unconfirmed `PENDING` response instead of returning `success: true`.
