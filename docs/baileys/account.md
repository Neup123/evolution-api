# Account & privacy

Account, presence, profile, privacy, contacts, labels, and quick replies.

## Create Call Link (`createCallLink`)

Create or request call link using the connected WhatsApp account and return the server result.

`POST /baileys/account/createCallLink/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `type` | yes | "audio" \| "video" |
| `event` | no | { startTime: number; } |
| `timeoutMs` | no | number |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Get Bot List V2 (`getBotListV2`)

Retrieve bot list v2 using the connected WhatsApp account and return the server result.

`POST /baileys/account/getBotListV2/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "jid": {
        "type": "string",
        "description": "Full WhatsApp address including its @s.whatsapp.net, @lid, @g.us, or @newsletter suffix."
      },
      "personaId": {
        "type": "string",
        "description": "string"
      }
    },
    "required": [
      "jid",
      "personaId"
    ],
    "additionalProperties": false,
    "description": "BotListInfo"
  },
  "description": "BotListInfo[]"
}
```

## Send Presence Update (`sendPresenceUpdate`)

Set account presence, such as available, unavailable, composing, or recording.

`POST /baileys/account/sendPresenceUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `type` | yes | WAPresence |
| `toJid` | no | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Presence Subscribe (`presenceSubscribe`)

Subscribe to live presence updates for a contact.

`POST /baileys/account/presenceSubscribe/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `toJid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch Blocklist (`fetchBlocklist`)

Get all WhatsApp accounts blocked by the connected account.

`POST /baileys/account/fetchBlocklist/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "string",
    "description": "string"
  },
  "description": "string[]"
}
```

## Fetch Status (`fetchStatus`)

Retrieve status using the connected WhatsApp account and return the server result.

`POST /baileys/account/fetchStatus/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jids` | no | string[] |

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "Stable identifier in the namespace implied by its surrounding object."
      }
    },
    "required": [
      "id"
    ],
    "additionalProperties": false,
    "description": "USyncQueryResultList"
  },
  "description": "USyncQueryResultList[]"
}
```

## Fetch Disappearing Duration (`fetchDisappearingDuration`)

Retrieve disappearing duration using the connected WhatsApp account and return the server result.

`POST /baileys/account/fetchDisappearingDuration/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jids` | no | string[] |

Response `result` structure:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "description": "Stable identifier in the namespace implied by its surrounding object."
      }
    },
    "required": [
      "id"
    ],
    "additionalProperties": false,
    "description": "USyncQueryResultList"
  },
  "description": "USyncQueryResultList[]"
}
```

## Update Profile Picture (`updateProfilePicture`)

Update profile picture using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateProfilePicture/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `content` | yes | WAMediaUpload |
| `dimensions` | no | { width: number; height: number; } |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Remove Profile Picture (`removeProfilePicture`)

Remove or revoke profile picture using the connected WhatsApp account and return the server result.

`POST /baileys/account/removeProfilePicture/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Profile Status (`updateProfileStatus`)

Update profile status using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateProfileStatus/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `status` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Profile Name (`updateProfileName`)

Update profile name using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateProfileName/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `name` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Block Status (`updateBlockStatus`)

Block or unblock a WhatsApp contact.

`POST /baileys/account/updateBlockStatus/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `action` | yes | Action performed by Update Block Status. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Disable Link Previews Privacy (`updateDisableLinkPreviewsPrivacy`)

Update disable link previews privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateDisableLinkPreviewsPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `isPreviewsDisabled` | yes | boolean |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Call Privacy (`updateCallPrivacy`)

Update call privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateCallPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyCallValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Messages Privacy (`updateMessagesPrivacy`)

Update messages privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateMessagesPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyMessagesValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Last Seen Privacy (`updateLastSeenPrivacy`)

Update last seen privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateLastSeenPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Online Privacy (`updateOnlinePrivacy`)

Update online privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateOnlinePrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyOnlineValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Profile Picture Privacy (`updateProfilePicturePrivacy`)

Update profile picture privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateProfilePicturePrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Status Privacy (`updateStatusPrivacy`)

Update status privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateStatusPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Read Receipts Privacy (`updateReadReceiptsPrivacy`)

Update read receipts privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateReadReceiptsPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAReadReceiptsValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Groups Add Privacy (`updateGroupsAddPrivacy`)

Update groups add privacy using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateGroupsAddPrivacy/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `value` | yes | WAPrivacyGroupAddValue |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Update Default Disappearing Mode (`updateDefaultDisappearingMode`)

Update default disappearing mode using the connected WhatsApp account and return the server result.

`POST /baileys/account/updateDefaultDisappearingMode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `duration` | yes | number |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Get Business Profile (`getBusinessProfile`)

Retrieve business profile using the connected WhatsApp account and return the server result.

`POST /baileys/account/getBusinessProfile/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "anyOf": [
    {
      "description": "void"
    },
    {
      "type": "object",
      "properties": {
        "description": {
          "type": "string",
          "description": "string"
        },
        "email": {
          "type": "string",
          "description": "string"
        },
        "business_hours": {
          "type": "object",
          "properties": {
            "timezone": {
              "type": "string",
              "description": "string"
            },
            "config": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": true,
                "description": "WABusinessHoursConfig"
              },
              "description": "WABusinessHoursConfig[]"
            },
            "business_config": {
              "type": "array",
              "items": {
                "type": "object",
                "additionalProperties": true,
                "description": "WABusinessHoursConfig"
              },
              "description": "WABusinessHoursConfig[]"
            }
          },
          "additionalProperties": false,
          "description": "{ timezone?: string; config?: WABusinessHoursConfig[]; business_config?: WABusinessHoursConfig[]; }"
        },
        "website": {
          "type": "array",
          "items": {
            "type": "string",
            "description": "string"
          },
          "description": "string[]"
        },
        "category": {
          "type": "string",
          "description": "string"
        },
        "wid": {
          "type": "string",
          "description": "string"
        },
        "address": {
          "type": "string",
          "description": "string"
        }
      },
      "required": [
        "description",
        "email",
        "business_hours",
        "website"
      ],
      "additionalProperties": false,
      "description": "WABusinessProfile"
    }
  ],
  "description": "void | WABusinessProfile"
}
```

## Resync App State (`resyncAppState`)

Update resync app state using the connected WhatsApp account and return the server result.

`POST /baileys/account/resyncAppState/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `collections` | yes | readonly ("critical_block" \| "critical_unblock_low" \| "regular_high" \| "regular_low" \| "regular")[] |
| `isInitialSync` | yes | boolean |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Chat Modify (`chatModify`)

Archive, unarchive, mute, pin, clear, or delete a chat.

`POST /baileys/account/chatModify/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `mod` | yes | ChatModification |
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Clean Dirty Bits (`cleanDirtyBits`)

Remove or revoke dirty bits using the connected WhatsApp account and return the server result.

`POST /baileys/account/cleanDirtyBits/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `type` | yes | "account_sync" \| "groups" |
| `fromTimestamp` | no | string \| number |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Add Or Edit Contact (`addOrEditContact`)

Create or request or edit contact using the connected WhatsApp account and return the server result.

`POST /baileys/account/addOrEditContact/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `contact` | yes | IContactAction |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Remove Contact (`removeContact`)

Remove or revoke contact using the connected WhatsApp account and return the server result.

`POST /baileys/account/removeContact/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Add Label (`addLabel`)

Create or request label using the connected WhatsApp account and return the server result.

`POST /baileys/account/addLabel/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `labels` | yes | LabelActionBody |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Add Chat Label (`addChatLabel`)

Create or request chat label using the connected WhatsApp account and return the server result.

`POST /baileys/account/addChatLabel/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `labelId` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Remove Chat Label (`removeChatLabel`)

Remove or revoke chat label using the connected WhatsApp account and return the server result.

`POST /baileys/account/removeChatLabel/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `labelId` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Add Message Label (`addMessageLabel`)

Create or request message label using the connected WhatsApp account and return the server result.

`POST /baileys/account/addMessageLabel/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `messageId` | yes | string |
| `labelId` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Remove Message Label (`removeMessageLabel`)

Remove or revoke message label using the connected WhatsApp account and return the server result.

`POST /baileys/account/removeMessageLabel/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `messageId` | yes | string |
| `labelId` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Star (`star`)

Update star using the connected WhatsApp account and return the server result.

`POST /baileys/account/star/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `messages` | yes | { id: string; fromMe?: boolean; }[] |
| `star` | yes | boolean |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Add Or Edit Quick Reply (`addOrEditQuickReply`)

Create or request or edit quick reply using the connected WhatsApp account and return the server result.

`POST /baileys/account/addOrEditQuickReply/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `quickReply` | yes | QuickReplyAction |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Remove Quick Reply (`removeQuickReply`)

Remove or revoke quick reply using the connected WhatsApp account and return the server result.

`POST /baileys/account/removeQuickReply/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `timestamp` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch Account Reachout Timelock (`fetchAccountReachoutTimelock`)

Retrieve account reachout timelock using the connected WhatsApp account and return the server result.

`POST /baileys/account/fetchAccountReachoutTimelock/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "isActive": {
      "type": "boolean",
      "description": "boolean"
    },
    "timeEnforcementEnds": {
      "type": "object",
      "properties": {
        "toString": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => string"
        },
        "toDateString": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => string"
        },
        "toTimeString": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => string"
        },
        "toLocaleString": {
          "type": "object",
          "additionalProperties": true,
          "description": "{ (): string; (locales?: string | string[], options?: DateTimeFormatOptions): string; (locales?: LocalesArgument, options?: DateTimeFormatOptions): string; }"
        },
        "toLocaleDateString": {
          "type": "object",
          "additionalProperties": true,
          "description": "{ (): string; (locales?: string | string[], options?: DateTimeFormatOptions): string; (locales?: LocalesArgument, options?: DateTimeFormatOptions): string; }"
        },
        "toLocaleTimeString": {
          "type": "object",
          "additionalProperties": true,
          "description": "{ (): string; (locales?: string | string[], options?: DateTimeFormatOptions): string; (locales?: LocalesArgument, options?: DateTimeFormatOptions): string; }"
        },
        "valueOf": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getTime": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getFullYear": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCFullYear": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getMonth": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCMonth": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getDate": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCDate": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getDay": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCDay": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getHours": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCHours": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getMinutes": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCMinutes": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getSeconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCSeconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getMilliseconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getUTCMilliseconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "getTimezoneOffset": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => number"
        },
        "setTime": {
          "type": "object",
          "additionalProperties": true,
          "description": "(time: number) => number"
        },
        "setMilliseconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "(ms: number) => number"
        },
        "setUTCMilliseconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "(ms: number) => number"
        },
        "setSeconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "(sec: number, ms?: number) => number"
        },
        "setUTCSeconds": {
          "type": "object",
          "additionalProperties": true,
          "description": "(sec: number, ms?: number) => number"
        },
        "setMinutes": {
          "type": "object",
          "additionalProperties": true,
          "description": "(min: number, sec?: number, ms?: number) => number"
        },
        "setUTCMinutes": {
          "type": "object",
          "additionalProperties": true,
          "description": "(min: number, sec?: number, ms?: number) => number"
        },
        "setHours": {
          "type": "object",
          "additionalProperties": true,
          "description": "(hours: number, min?: number, sec?: number, ms?: number) => number"
        },
        "setUTCHours": {
          "type": "object",
          "additionalProperties": true,
          "description": "(hours: number, min?: number, sec?: number, ms?: number) => number"
        },
        "setDate": {
          "type": "object",
          "additionalProperties": true,
          "description": "(date: number) => number"
        },
        "setUTCDate": {
          "type": "object",
          "additionalProperties": true,
          "description": "(date: number) => number"
        },
        "setMonth": {
          "type": "object",
          "additionalProperties": true,
          "description": "(month: number, date?: number) => number"
        },
        "setUTCMonth": {
          "type": "object",
          "additionalProperties": true,
          "description": "(month: number, date?: number) => number"
        },
        "setFullYear": {
          "type": "object",
          "additionalProperties": true,
          "description": "(year: number, month?: number, date?: number) => number"
        },
        "setUTCFullYear": {
          "type": "object",
          "additionalProperties": true,
          "description": "(year: number, month?: number, date?: number) => number"
        },
        "toUTCString": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => string"
        },
        "toISOString": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => string"
        },
        "toJSON": {
          "type": "object",
          "additionalProperties": true,
          "description": "(key?: any) => string"
        },
        "getVarDate": {
          "type": "object",
          "additionalProperties": true,
          "description": "() => VarDate"
        }
      },
      "required": [
        "toString",
        "toDateString",
        "toTimeString",
        "toLocaleString",
        "toLocaleDateString",
        "toLocaleTimeString",
        "valueOf",
        "getTime",
        "getFullYear",
        "getUTCFullYear",
        "getMonth",
        "getUTCMonth",
        "getDate",
        "getUTCDate",
        "getDay",
        "getUTCDay",
        "getHours",
        "getUTCHours",
        "getMinutes",
        "getUTCMinutes",
        "getSeconds",
        "getUTCSeconds",
        "getMilliseconds",
        "getUTCMilliseconds",
        "getTimezoneOffset",
        "setTime",
        "setMilliseconds",
        "setUTCMilliseconds",
        "setSeconds",
        "setUTCSeconds",
        "setMinutes",
        "setUTCMinutes",
        "setHours",
        "setUTCHours",
        "setDate",
        "setUTCDate",
        "setMonth",
        "setUTCMonth",
        "setFullYear",
        "setUTCFullYear",
        "toUTCString",
        "toISOString",
        "toJSON",
        "getVarDate"
      ],
      "additionalProperties": false,
      "description": "Date"
    },
    "enforcementType": {
      "type": "string",
      "enum": [
        "BIZ_COMMERCE_VIOLATION_ALCOHOL",
        "BIZ_COMMERCE_VIOLATION_ADULT",
        "BIZ_COMMERCE_VIOLATION_ANIMALS",
        "BIZ_COMMERCE_VIOLATION_BODY_PARTS_FLUIDS",
        "BIZ_COMMERCE_VIOLATION_DATING",
        "BIZ_COMMERCE_VIOLATION_DIGITAL_SERVICES_PRODUCTS",
        "BIZ_COMMERCE_VIOLATION_DRUGS",
        "BIZ_COMMERCE_VIOLATION_DRUGS_ONLY_OTC",
        "BIZ_COMMERCE_VIOLATION_GAMBLING",
        "BIZ_COMMERCE_VIOLATION_HEALTHCARE",
        "BIZ_COMMERCE_VIOLATION_REAL_FAKE_CURRENCY",
        "BIZ_COMMERCE_VIOLATION_SUPPLEMENTS",
        "BIZ_COMMERCE_VIOLATION_TOBACCO",
        "BIZ_COMMERCE_VIOLATION_VIOLENT_CONTENT",
        "BIZ_COMMERCE_VIOLATION_WEAPONS",
        "BIZ_QUALITY",
        "DEFAULT",
        "WEB_COMPANION_ONLY"
      ],
      "description": "ReachoutTimelockEnforcementType"
    }
  },
  "additionalProperties": false,
  "description": "ReachoutTimelockState"
}
```

## Fetch New Chat Message Cap (`fetchNewChatMessageCap`)

Retrieve new chat message cap using the connected WhatsApp account and return the server result.

`POST /baileys/account/fetchNewChatMessageCap/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "total_quota": {
      "type": "number",
      "description": "number"
    },
    "used_quota": {
      "type": "number",
      "description": "number"
    },
    "cycle_start_timestamp": {
      "type": "string",
      "description": "string"
    },
    "cycle_end_timestamp": {
      "type": "string",
      "description": "string"
    },
    "server_sent_timestamp": {
      "type": "string",
      "description": "string"
    },
    "ote_status": {
      "type": "string",
      "enum": [
        "NOT_ELIGIBLE",
        "ELIGIBLE",
        "ACTIVE_IN_CURRENT_CYCLE",
        "EXHAUSTED"
      ],
      "description": "NewChatMessageCappingOTEStatusType"
    },
    "mv_status": {
      "type": "string",
      "enum": [
        "NOT_ELIGIBLE",
        "NOT_ACTIVE",
        "ACTIVE",
        "ACTIVE_UPGRADE_AVAILABLE"
      ],
      "description": "NewChatMessageCappingMVStatusType"
    },
    "capping_status": {
      "type": "string",
      "enum": [
        "NONE",
        "FIRST_WARNING",
        "SECOND_WARNING",
        "CAPPED"
      ],
      "description": "NewChatMessageCappingStatusType"
    }
  },
  "additionalProperties": false,
  "description": "NewChatMessageCapInfo"
}
```
