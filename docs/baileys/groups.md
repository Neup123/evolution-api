# Groups

Group creation, membership, invitations, and settings.

## Metadata (`groupMetadata`)

Get the subject, description, owner, participants, and settings of a group.

`POST /baileys/groups/groupMetadata/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Stable identifier in the namespace implied by its surrounding object."
    },
    "notify": {
      "type": "string",
      "description": "string"
    },
    "addressingMode": {
      "type": "string",
      "enum": [
        "pn",
        "lid"
      ],
      "description": "Identifier namespace WhatsApp expects for group addressing: pn or lid."
    },
    "owner": {
      "type": "string",
      "description": "Primary owner identifier returned by WhatsApp; it may be a LID."
    },
    "ownerPn": {
      "type": "string",
      "description": "Owner phone-number JID when WhatsApp exposes the LID-to-PN mapping."
    },
    "ownerUsername": {
      "type": "string",
      "description": "Owner username identifier when WhatsApp exposes one."
    },
    "owner_country_code": {
      "type": "string",
      "description": "string"
    },
    "subject": {
      "type": "string",
      "description": "Human-visible group, community, newsletter, or item title."
    },
    "subjectOwner": {
      "type": "string",
      "description": "Identifier of the account that last changed the subject."
    },
    "subjectOwnerPn": {
      "type": "string",
      "description": "string"
    },
    "subjectOwnerUsername": {
      "type": "string",
      "description": "string"
    },
    "subjectTime": {
      "type": "number",
      "description": "Unix timestamp in seconds when the subject was last changed."
    },
    "creation": {
      "type": "number",
      "description": "Unix timestamp in seconds when the entity was created."
    },
    "desc": {
      "type": "string",
      "description": "Human-visible description text."
    },
    "descOwner": {
      "type": "string",
      "description": "string"
    },
    "descOwnerPn": {
      "type": "string",
      "description": "string"
    },
    "descOwnerUsername": {
      "type": "string",
      "description": "string"
    },
    "descId": {
      "type": "string",
      "description": "WhatsApp identifier of the current description revision."
    },
    "descTime": {
      "type": "number",
      "description": "number"
    },
    "linkedParent": {
      "type": "string",
      "description": "Parent community JID when this group is a community subgroup."
    },
    "restrict": {
      "type": "boolean",
      "description": "boolean"
    },
    "announce": {
      "type": "boolean",
      "description": "boolean"
    },
    "memberAddMode": {
      "type": "boolean",
      "description": "boolean"
    },
    "joinApprovalMode": {
      "type": "boolean",
      "description": "boolean"
    },
    "isCommunity": {
      "type": "boolean",
      "description": "Whether the metadata represents a parent community."
    },
    "isCommunityAnnounce": {
      "type": "boolean",
      "description": "Whether this is the default announcements group of a community."
    },
    "size": {
      "type": "number",
      "description": "Number of participants or returned items reported by WhatsApp."
    },
    "participants": {
      "type": "array",
      "items": {
        "description": "GroupParticipant"
      },
      "description": "Participant records. Identifier namespaces are explained in docs/baileys/identifiers.md."
    },
    "ephemeralDuration": {
      "type": "number",
      "description": "number"
    },
    "inviteCode": {
      "type": "string",
      "description": "string"
    },
    "author": {
      "type": "string",
      "description": "string"
    },
    "authorPn": {
      "type": "string",
      "description": "string"
    },
    "authorUsername": {
      "type": "string",
      "description": "string"
    }
  },
  "required": [
    "id",
    "owner",
    "subject",
    "participants"
  ],
  "additionalProperties": false,
  "description": "GroupMetadata"
}
```

## Create (`groupCreate`)

Create a WhatsApp group and add the supplied participants.

`POST /baileys/groups/groupCreate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `subject` | yes | string |
| `participants` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Stable identifier in the namespace implied by its surrounding object."
    },
    "notify": {
      "type": "string",
      "description": "string"
    },
    "addressingMode": {
      "type": "string",
      "enum": [
        "pn",
        "lid"
      ],
      "description": "Identifier namespace WhatsApp expects for group addressing: pn or lid."
    },
    "owner": {
      "type": "string",
      "description": "Primary owner identifier returned by WhatsApp; it may be a LID."
    },
    "ownerPn": {
      "type": "string",
      "description": "Owner phone-number JID when WhatsApp exposes the LID-to-PN mapping."
    },
    "ownerUsername": {
      "type": "string",
      "description": "Owner username identifier when WhatsApp exposes one."
    },
    "owner_country_code": {
      "type": "string",
      "description": "string"
    },
    "subject": {
      "type": "string",
      "description": "Human-visible group, community, newsletter, or item title."
    },
    "subjectOwner": {
      "type": "string",
      "description": "Identifier of the account that last changed the subject."
    },
    "subjectOwnerPn": {
      "type": "string",
      "description": "string"
    },
    "subjectOwnerUsername": {
      "type": "string",
      "description": "string"
    },
    "subjectTime": {
      "type": "number",
      "description": "Unix timestamp in seconds when the subject was last changed."
    },
    "creation": {
      "type": "number",
      "description": "Unix timestamp in seconds when the entity was created."
    },
    "desc": {
      "type": "string",
      "description": "Human-visible description text."
    },
    "descOwner": {
      "type": "string",
      "description": "string"
    },
    "descOwnerPn": {
      "type": "string",
      "description": "string"
    },
    "descOwnerUsername": {
      "type": "string",
      "description": "string"
    },
    "descId": {
      "type": "string",
      "description": "WhatsApp identifier of the current description revision."
    },
    "descTime": {
      "type": "number",
      "description": "number"
    },
    "linkedParent": {
      "type": "string",
      "description": "Parent community JID when this group is a community subgroup."
    },
    "restrict": {
      "type": "boolean",
      "description": "boolean"
    },
    "announce": {
      "type": "boolean",
      "description": "boolean"
    },
    "memberAddMode": {
      "type": "boolean",
      "description": "boolean"
    },
    "joinApprovalMode": {
      "type": "boolean",
      "description": "boolean"
    },
    "isCommunity": {
      "type": "boolean",
      "description": "Whether the metadata represents a parent community."
    },
    "isCommunityAnnounce": {
      "type": "boolean",
      "description": "Whether this is the default announcements group of a community."
    },
    "size": {
      "type": "number",
      "description": "Number of participants or returned items reported by WhatsApp."
    },
    "participants": {
      "type": "array",
      "items": {
        "description": "GroupParticipant"
      },
      "description": "Participant records. Identifier namespaces are explained in docs/baileys/identifiers.md."
    },
    "ephemeralDuration": {
      "type": "number",
      "description": "number"
    },
    "inviteCode": {
      "type": "string",
      "description": "string"
    },
    "author": {
      "type": "string",
      "description": "string"
    },
    "authorPn": {
      "type": "string",
      "description": "string"
    },
    "authorUsername": {
      "type": "string",
      "description": "string"
    }
  },
  "required": [
    "id",
    "owner",
    "subject",
    "participants"
  ],
  "additionalProperties": false,
  "description": "GroupMetadata"
}
```

## Leave (`groupLeave`)

Execute the leave WhatsApp capability and return its typed result.

`POST /baileys/groups/groupLeave/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | WhatsApp group JID ending in @g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Subject (`groupUpdateSubject`)

Execute the update subject WhatsApp capability and return its typed result.

`POST /baileys/groups/groupUpdateSubject/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `subject` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Request Participants List (`groupRequestParticipantsList`)

List pending requests from people who want to join a group.

`POST /baileys/groups/groupRequestParticipantsList/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "additionalProperties": true,
    "description": "{ [key: string]: string; }"
  },
  "description": "{ [key: string]: string; }[]"
}
```

## Request Participants Update (`groupRequestParticipantsUpdate`)

Approve or reject pending group join requests.

`POST /baileys/groups/groupRequestParticipantsUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `participants` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |
| `action` | yes | Action performed by Group Request Participants Update. |

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "description": "WhatsApp operation, delivery, membership, catalog, or account state for this record."
      },
      "jid": {
        "type": "string",
        "description": "Full WhatsApp address including its @s.whatsapp.net, @lid, @g.us, or @newsletter suffix."
      }
    },
    "required": [
      "status",
      "jid"
    ],
    "additionalProperties": false,
    "description": "{ status: string; jid: string; }"
  },
  "description": "{ status: string; jid: string; }[]"
}
```

## Participants Update (`groupParticipantsUpdate`)

Add, remove, promote, or demote participants in a group.

`POST /baileys/groups/groupParticipantsUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `participants` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |
| `action` | yes | Action performed by Group Participants Update. |

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "description": "WhatsApp operation, delivery, membership, catalog, or account state for this record."
      },
      "jid": {
        "type": "string",
        "description": "Full WhatsApp address including its @s.whatsapp.net, @lid, @g.us, or @newsletter suffix."
      },
      "content": {
        "type": "object",
        "properties": {
          "tag": {
            "type": "string",
            "description": "string"
          },
          "attrs": {
            "type": "object",
            "additionalProperties": true,
            "description": "{ [key: string]: string; }"
          },
          "content": {
            "oneOf": [
              {
                "type": "string"
              },
              {
                "type": "object",
                "properties": {
                  "$base64": {
                    "type": "string",
                    "format": "byte"
                  }
                },
                "required": [
                  "$base64"
                ],
                "additionalProperties": false
              }
            ],
            "description": "string | BinaryNode[] | Uint8Array<ArrayBufferLike>"
          }
        },
        "required": [
          "tag",
          "attrs"
        ],
        "additionalProperties": false,
        "description": "BinaryNode"
      }
    },
    "required": [
      "status",
      "jid",
      "content"
    ],
    "additionalProperties": false,
    "description": "{ status: string; jid: string; content: BinaryNode; }"
  },
  "description": "{ status: string; jid: string; content: BinaryNode; }[]"
}
```

## Update Description (`groupUpdateDescription`)

Execute the update description WhatsApp capability and return its typed result.

`POST /baileys/groups/groupUpdateDescription/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `description` | no | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Invite Code (`groupInviteCode`)

Execute the invite code WhatsApp capability and return its typed result.

`POST /baileys/groups/groupInviteCode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Revoke Invite (`groupRevokeInvite`)

Execute the revoke invite WhatsApp capability and return its typed result.

`POST /baileys/groups/groupRevokeInvite/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Accept Invite (`groupAcceptInvite`)

Execute the accept invite WhatsApp capability and return its typed result.

`POST /baileys/groups/groupAcceptInvite/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `code` | yes | Invite code only, without the chat.whatsapp.com URL prefix. |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Revoke Invite V4 (`groupRevokeInviteV4`)

Execute the revoke invite v4 WhatsApp capability and return its typed result.

`POST /baileys/groups/groupRevokeInviteV4/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `groupJid` | yes | WhatsApp group JID ending in @g.us. |
| `invitedJid` | yes | string |

Response `result` structure:

```json
{
  "type": "boolean",
  "description": "boolean"
}
```

## Accept Invite V4 (`groupAcceptInviteV4`)

Execute the accept invite v4 WhatsApp capability and return its typed result.

`POST /baileys/groups/groupAcceptInviteV4/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `key` | yes | string \| WAMessageKey |
| `inviteMessage` | yes | IGroupInviteMessage |

Response `result` structure:

```json
{
  "description": "any"
}
```

## Get Invite Info (`groupGetInviteInfo`)

Execute the get invite info WhatsApp capability and return its typed result.

`POST /baileys/groups/groupGetInviteInfo/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `code` | yes | Invite code only, without the chat.whatsapp.com URL prefix. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Stable identifier in the namespace implied by its surrounding object."
    },
    "notify": {
      "type": "string",
      "description": "string"
    },
    "addressingMode": {
      "type": "string",
      "enum": [
        "pn",
        "lid"
      ],
      "description": "Identifier namespace WhatsApp expects for group addressing: pn or lid."
    },
    "owner": {
      "type": "string",
      "description": "Primary owner identifier returned by WhatsApp; it may be a LID."
    },
    "ownerPn": {
      "type": "string",
      "description": "Owner phone-number JID when WhatsApp exposes the LID-to-PN mapping."
    },
    "ownerUsername": {
      "type": "string",
      "description": "Owner username identifier when WhatsApp exposes one."
    },
    "owner_country_code": {
      "type": "string",
      "description": "string"
    },
    "subject": {
      "type": "string",
      "description": "Human-visible group, community, newsletter, or item title."
    },
    "subjectOwner": {
      "type": "string",
      "description": "Identifier of the account that last changed the subject."
    },
    "subjectOwnerPn": {
      "type": "string",
      "description": "string"
    },
    "subjectOwnerUsername": {
      "type": "string",
      "description": "string"
    },
    "subjectTime": {
      "type": "number",
      "description": "Unix timestamp in seconds when the subject was last changed."
    },
    "creation": {
      "type": "number",
      "description": "Unix timestamp in seconds when the entity was created."
    },
    "desc": {
      "type": "string",
      "description": "Human-visible description text."
    },
    "descOwner": {
      "type": "string",
      "description": "string"
    },
    "descOwnerPn": {
      "type": "string",
      "description": "string"
    },
    "descOwnerUsername": {
      "type": "string",
      "description": "string"
    },
    "descId": {
      "type": "string",
      "description": "WhatsApp identifier of the current description revision."
    },
    "descTime": {
      "type": "number",
      "description": "number"
    },
    "linkedParent": {
      "type": "string",
      "description": "Parent community JID when this group is a community subgroup."
    },
    "restrict": {
      "type": "boolean",
      "description": "boolean"
    },
    "announce": {
      "type": "boolean",
      "description": "boolean"
    },
    "memberAddMode": {
      "type": "boolean",
      "description": "boolean"
    },
    "joinApprovalMode": {
      "type": "boolean",
      "description": "boolean"
    },
    "isCommunity": {
      "type": "boolean",
      "description": "Whether the metadata represents a parent community."
    },
    "isCommunityAnnounce": {
      "type": "boolean",
      "description": "Whether this is the default announcements group of a community."
    },
    "size": {
      "type": "number",
      "description": "Number of participants or returned items reported by WhatsApp."
    },
    "participants": {
      "type": "array",
      "items": {
        "description": "GroupParticipant"
      },
      "description": "Participant records. Identifier namespaces are explained in docs/baileys/identifiers.md."
    },
    "ephemeralDuration": {
      "type": "number",
      "description": "number"
    },
    "inviteCode": {
      "type": "string",
      "description": "string"
    },
    "author": {
      "type": "string",
      "description": "string"
    },
    "authorPn": {
      "type": "string",
      "description": "string"
    },
    "authorUsername": {
      "type": "string",
      "description": "string"
    }
  },
  "required": [
    "id",
    "owner",
    "subject",
    "participants"
  ],
  "additionalProperties": false,
  "description": "GroupMetadata"
}
```

## Toggle Ephemeral (`groupToggleEphemeral`)

Execute the toggle ephemeral WhatsApp capability and return its typed result.

`POST /baileys/groups/groupToggleEphemeral/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `ephemeralExpiration` | yes | number |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Setting Update (`groupSettingUpdate`)

Execute the setting update WhatsApp capability and return its typed result.

`POST /baileys/groups/groupSettingUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `setting` | yes | "announcement" \| "not_announcement" \| "locked" \| "unlocked" |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Member Add Mode (`groupMemberAddMode`)

Execute the member add mode WhatsApp capability and return its typed result.

`POST /baileys/groups/groupMemberAddMode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `mode` | yes | "admin_add" \| "all_member_add" |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Join Approval Mode (`groupJoinApprovalMode`)

Execute the join approval mode WhatsApp capability and return its typed result.

`POST /baileys/groups/groupJoinApprovalMode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | WhatsApp group JID ending in @g.us. |
| `mode` | yes | "on" \| "off" |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch All Participating (`groupFetchAllParticipating`)

List every group and community in which the connected account participates, optionally omitting participant arrays.

`POST /baileys/groups/groupFetchAllParticipating/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `includeParticipants` | no | Include each group participant array. Set false for a compact response and fewer transferred fields. |

Response `result` structure:

```json
{
  "type": "object",
  "additionalProperties": true,
  "description": "{ [_: string]: GroupMetadata; }"
}
```
