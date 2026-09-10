# Calls & messages

Messages, receipts, calls, media, and history.

## Send Message Ack (`sendMessageAck`)

Send or apply message ack using the connected WhatsApp account and return the server result.

`POST /baileys/messages/sendMessageAck/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `node` | yes | BinaryNode |
| `errorCode` | no | number |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Send Retry Request (`sendRetryRequest`)

Send or apply retry request using the connected WhatsApp account and return the server result.

`POST /baileys/messages/sendRetryRequest/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `node` | yes | BinaryNode |
| `forceIncludeKeys` | no | boolean |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Reject Call (`rejectCall`)

Remove or revoke reject call using the connected WhatsApp account and return the server result.

`POST /baileys/messages/rejectCall/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `callId` | yes | string |
| `callFrom` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch Message History (`fetchMessageHistory`)

Request older messages for a chat from linked WhatsApp devices.

`POST /baileys/messages/fetchMessageHistory/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `count` | yes | number |
| `oldestMsgKey` | yes | WAMessageKey |
| `oldestMsgTimestamp` | yes | any |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Request Placeholder Resend (`requestPlaceholderResend`)

Create or request request placeholder resend using the connected WhatsApp account and return the server result.

`POST /baileys/messages/requestPlaceholderResend/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `messageKey` | yes | WAMessageKey |
| `msgData` | no | Partial<WAMessage> |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Issue Privacy Tokens (`issuePrivacyTokens`)

Send or apply privacy tokens using the connected WhatsApp account and return the server result.

`POST /baileys/messages/issuePrivacyTokens/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jids` | yes | string[] |
| `timestamp` | no | number |

Response `result` structure:

```json
{
  "description": "any"
}
```

## Relay Message (`relayMessage`)

Relay an already constructed protocol message to a WhatsApp JID.

`POST /baileys/messages/relayMessage/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `message` | yes | IMessage |
| `options` | yes | MessageRelayOptions |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Send Receipt (`sendReceipt`)

Send a delivery, read, played, or other receipt for a message.

`POST /baileys/messages/sendReceipt/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `participant` | yes | Participant WhatsApp JIDs, each including the @s.whatsapp.net suffix. |
| `messageIds` | yes | string[] |
| `type` | yes | MessageReceiptType |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Send Receipts (`sendReceipts`)

Send the same receipt for multiple messages.

`POST /baileys/messages/sendReceipts/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `keys` | yes | WAMessageKey[] |
| `type` | yes | MessageReceiptType |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Read Messages (`readMessages`)

Mark one or more WhatsApp messages as read.

`POST /baileys/messages/readMessages/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `keys` | yes | WAMessageKey[] |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Refresh Media Conn (`refreshMediaConn`)

Execute the refresh media conn WhatsApp capability and return its typed result.

`POST /baileys/messages/refreshMediaConn/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `forceGet` | no | boolean |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "auth": {
      "type": "string",
      "description": "string"
    },
    "ttl": {
      "type": "number",
      "description": "number"
    },
    "hosts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "hostname": {
            "type": "string",
            "description": "string"
          },
          "maxContentLengthBytes": {
            "type": "number",
            "description": "number"
          }
        },
        "required": [
          "hostname",
          "maxContentLengthBytes"
        ],
        "additionalProperties": false,
        "description": "{ hostname: string; maxContentLengthBytes: number; }"
      },
      "description": "{ hostname: string; maxContentLengthBytes: number; }[]"
    },
    "fetchDate": {
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
    }
  },
  "required": [
    "auth",
    "ttl",
    "hosts",
    "fetchDate"
  ],
  "additionalProperties": false,
  "description": "MediaConnInfo"
}
```

## Get Media Host (`getMediaHost`)

Retrieve media host using the connected WhatsApp account and return the server result.

`POST /baileys/messages/getMediaHost/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Fetch Privacy Settings (`fetchPrivacySettings`)

Get the connected account privacy settings.

`POST /baileys/messages/fetchPrivacySettings/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `force` | no | Bypass Baileys in-memory privacy state when true. Omit or false for its normal cached query behavior. |

Response `result` structure:

```json
{
  "type": "object",
  "additionalProperties": true,
  "description": "{ [_: string]: string; }"
}
```

## Send Peer Data Operation Message (`sendPeerDataOperationMessage`)

Send or apply peer data operation message using the connected WhatsApp account and return the server result.

`POST /baileys/messages/sendPeerDataOperationMessage/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `pdoMessage` | yes | IPeerDataOperationRequestMessage |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Update Member Label (`updateMemberLabel`)

Update member label using the connected WhatsApp account and return the server result.

`POST /baileys/messages/updateMemberLabel/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `memberLabel` | yes | string |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Update Media Message (`updateMediaMessage`)

Re-upload or refresh media data for a message whose media is unavailable.

`POST /baileys/messages/updateMediaMessage/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `message` | yes | WAMessage |

Response `result` structure:

```json
{
  "description": "WAMessage"
}
```

## Send Message (`sendMessage`)

Send a Baileys message payload directly to a chat or group.

`POST /baileys/messages/sendMessage/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `content` | yes | AnyMessageContent |
| `options` | no | MiscMessageGenerationOptions |

Response `result` structure:

```json
{
  "description": "WAMessage"
}
```
