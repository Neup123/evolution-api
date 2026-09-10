# Communities

Community creation, membership, invitations, and settings.

## Metadata (`communityMetadata`)

Get a parent community name, description, participants, and settings. Use Group Metadata for regular groups.

`POST /baileys/communities/communityMetadata/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

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

## Create (`communityCreate`)

Create a WhatsApp community with a subject and description.

`POST /baileys/communities/communityCreate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `subject` | yes | string |
| `body` | yes | string |

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

## Create Group (`communityCreateGroup`)

Create a group inside an existing community and add participants.

`POST /baileys/communities/communityCreateGroup/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `subject` | yes | string |
| `participants` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |
| `parentCommunityJid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

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

## Leave (`communityLeave`)

Execute the leave WhatsApp capability and return its typed result.

`POST /baileys/communities/communityLeave/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `id` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Subject (`communityUpdateSubject`)

Execute the update subject WhatsApp capability and return its typed result.

`POST /baileys/communities/communityUpdateSubject/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `subject` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Link Group (`communityLinkGroup`)

Execute the link group WhatsApp capability and return its typed result.

`POST /baileys/communities/communityLinkGroup/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `groupJid` | yes | string |
| `parentCommunityJid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Unlink Group (`communityUnlinkGroup`)

Execute the unlink group WhatsApp capability and return its typed result.

`POST /baileys/communities/communityUnlinkGroup/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `groupJid` | yes | string |
| `parentCommunityJid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch Linked Groups (`communityFetchLinkedGroups`)

List groups linked to a community and enrich partial WhatsApp rows with cached full group metadata.

`POST /baileys/communities/communityFetchLinkedGroups/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "communityJid": {
      "type": "string",
      "description": "string"
    },
    "isCommunity": {
      "type": "boolean",
      "description": "Whether the metadata represents a parent community."
    },
    "linkedGroups": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "type": "string",
            "description": "Stable identifier in the namespace implied by its surrounding object."
          },
          "subject": {
            "type": "string",
            "description": "Human-visible group, community, newsletter, or item title."
          },
          "creation": {
            "type": "number",
            "description": "Unix timestamp in seconds when the entity was created."
          },
          "owner": {
            "type": "string",
            "description": "Primary owner identifier returned by WhatsApp; it may be a LID."
          },
          "size": {
            "type": "number",
            "description": "Number of participants or returned items reported by WhatsApp."
          },
          "metadataComplete": {
            "type": "boolean",
            "description": "Whether Evolution successfully enriched the partial linked-group row with group metadata."
          }
        },
        "required": [
          "id",
          "subject",
          "creation",
          "owner",
          "size"
        ],
        "additionalProperties": false,
        "description": "{ id: string; subject: string; creation: number; owner: string; size: number; }"
      },
      "description": "{ id: string; subject: string; creation: number; owner: string; size: number; }[]"
    }
  },
  "required": [
    "communityJid",
    "isCommunity",
    "linkedGroups"
  ],
  "additionalProperties": false,
  "description": "{ communityJid: string; isCommunity: boolean; linkedGroups: { id: string; subject: string; creation: number; owner: string; size: number; }[]; }"
}
```

## Request Participants List (`communityRequestParticipantsList`)

List membership approval requests reported for a community. Group and subgroup join queues use the Group operation.

`POST /baileys/communities/communityRequestParticipantsList/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

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

## Request Participants Update (`communityRequestParticipantsUpdate`)

Execute the request participants update WhatsApp capability and return its typed result.

`POST /baileys/communities/communityRequestParticipantsUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `participants` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |
| `action` | yes | Action performed by Community Request Participants Update. |

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

## Participants Update (`communityParticipantsUpdate`)

Execute the participants update WhatsApp capability and return its typed result.

`POST /baileys/communities/communityParticipantsUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `participants` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |
| `action` | yes | Action performed by Community Participants Update. |

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

## Update Description (`communityUpdateDescription`)

Execute the update description WhatsApp capability and return its typed result.

`POST /baileys/communities/communityUpdateDescription/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `description` | no | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Invite Code (`communityInviteCode`)

Execute the invite code WhatsApp capability and return its typed result.

`POST /baileys/communities/communityInviteCode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Revoke Invite (`communityRevokeInvite`)

Execute the revoke invite WhatsApp capability and return its typed result.

`POST /baileys/communities/communityRevokeInvite/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Accept Invite (`communityAcceptInvite`)

Execute the accept invite WhatsApp capability and return its typed result.

`POST /baileys/communities/communityAcceptInvite/{instanceName}`

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

## Revoke Invite V4 (`communityRevokeInviteV4`)

Execute the revoke invite v4 WhatsApp capability and return its typed result.

`POST /baileys/communities/communityRevokeInviteV4/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `communityJid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `invitedJid` | yes | string |

Response `result` structure:

```json
{
  "type": "boolean",
  "description": "boolean"
}
```

## Accept Invite V4 (`communityAcceptInviteV4`)

Execute the accept invite v4 WhatsApp capability and return its typed result.

`POST /baileys/communities/communityAcceptInviteV4/{instanceName}`

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

## Get Invite Info (`communityGetInviteInfo`)

Execute the get invite info WhatsApp capability and return its typed result.

`POST /baileys/communities/communityGetInviteInfo/{instanceName}`

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

## Toggle Ephemeral (`communityToggleEphemeral`)

Execute the toggle ephemeral WhatsApp capability and return its typed result.

`POST /baileys/communities/communityToggleEphemeral/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `ephemeralExpiration` | yes | number |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Setting Update (`communitySettingUpdate`)

Execute the setting update WhatsApp capability and return its typed result.

`POST /baileys/communities/communitySettingUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `setting` | yes | "announcement" \| "not_announcement" \| "locked" \| "unlocked" |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Member Add Mode (`communityMemberAddMode`)

Execute the member add mode WhatsApp capability and return its typed result.

`POST /baileys/communities/communityMemberAddMode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `mode` | yes | "admin_add" \| "all_member_add" |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Join Approval Mode (`communityJoinApprovalMode`)

Execute the join approval mode WhatsApp capability and return its typed result.

`POST /baileys/communities/communityJoinApprovalMode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Parent community JID ending in @g.us. A regular group or subgroup JID is not accepted unless the operation explicitly says otherwise. |
| `mode` | yes | "on" \| "off" |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch All Participating (`communityFetchAllParticipating`)

Execute the fetch all participating WhatsApp capability and return its typed result.

`POST /baileys/communities/communityFetchAllParticipating/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "type": "object",
  "additionalProperties": true,
  "description": "{ [_: string]: GroupMetadata; }"
}
```
