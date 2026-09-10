# Newsletters

Newsletter lifecycle, subscribers, content, and reactions.

## Create (`newsletterCreate`)

Create a WhatsApp newsletter (channel).

`POST /baileys/newsletters/newsletterCreate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `name` | yes | string |
| `description` | no | string |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Stable identifier in the namespace implied by its surrounding object."
    },
    "owner": {
      "type": "string",
      "description": "Primary owner identifier returned by WhatsApp; it may be a LID."
    },
    "name": {
      "type": "string",
      "description": "Human-visible name returned by WhatsApp."
    },
    "description": {
      "type": "string",
      "description": "string"
    },
    "invite": {
      "type": "string",
      "description": "string"
    },
    "creation_time": {
      "type": "number",
      "description": "number"
    },
    "subscribers": {
      "type": "number",
      "description": "number"
    },
    "picture": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "string"
        },
        "directPath": {
          "type": "string",
          "description": "string"
        },
        "mediaKey": {
          "type": "string",
          "description": "string"
        },
        "id": {
          "type": "string",
          "description": "Stable identifier in the namespace implied by its surrounding object."
        }
      },
      "additionalProperties": false,
      "description": "{ url?: string; directPath?: string; mediaKey?: string; id?: string; }"
    },
    "verification": {
      "type": "string",
      "enum": [
        "VERIFIED",
        "UNVERIFIED"
      ],
      "description": "\"VERIFIED\" | \"UNVERIFIED\""
    },
    "reaction_codes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "description": "string"
          },
          "count": {
            "type": "number",
            "description": "number"
          }
        },
        "required": [
          "code",
          "count"
        ],
        "additionalProperties": false,
        "description": "{ code: string; count: number; }"
      },
      "description": "{ code: string; count: number; }[]"
    },
    "mute_state": {
      "type": "string",
      "enum": [
        "ON",
        "OFF"
      ],
      "description": "\"ON\" | \"OFF\""
    },
    "thread_metadata": {
      "type": "object",
      "properties": {
        "creation_time": {
          "type": "number",
          "description": "number"
        },
        "name": {
          "type": "string",
          "description": "Human-visible name returned by WhatsApp."
        },
        "description": {
          "type": "string",
          "description": "string"
        }
      },
      "additionalProperties": false,
      "description": "{ creation_time?: number; name?: string; description?: string; }"
    }
  },
  "required": [
    "id",
    "name"
  ],
  "additionalProperties": false,
  "description": "NewsletterMetadata"
}
```

## Update (`newsletterUpdate`)

Execute the update WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterUpdate/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `updates` | yes | NewsletterUpdate |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Subscribers (`newsletterSubscribers`)

Execute the subscribers WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterSubscribers/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "subscribers": {
      "type": "number",
      "description": "number"
    }
  },
  "required": [
    "subscribers"
  ],
  "additionalProperties": false,
  "description": "{ subscribers: number; }"
}
```

## Metadata (`newsletterMetadata`)

Get newsletter details using its JID or invite code.

`POST /baileys/newsletters/newsletterMetadata/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `type` | yes | "invite" \| "jid" |
| `key` | yes | string |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Stable identifier in the namespace implied by its surrounding object."
    },
    "owner": {
      "type": "string",
      "description": "Primary owner identifier returned by WhatsApp; it may be a LID."
    },
    "name": {
      "type": "string",
      "description": "Human-visible name returned by WhatsApp."
    },
    "description": {
      "type": "string",
      "description": "string"
    },
    "invite": {
      "type": "string",
      "description": "string"
    },
    "creation_time": {
      "type": "number",
      "description": "number"
    },
    "subscribers": {
      "type": "number",
      "description": "number"
    },
    "picture": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "string"
        },
        "directPath": {
          "type": "string",
          "description": "string"
        },
        "mediaKey": {
          "type": "string",
          "description": "string"
        },
        "id": {
          "type": "string",
          "description": "Stable identifier in the namespace implied by its surrounding object."
        }
      },
      "additionalProperties": false,
      "description": "{ url?: string; directPath?: string; mediaKey?: string; id?: string; }"
    },
    "verification": {
      "type": "string",
      "enum": [
        "VERIFIED",
        "UNVERIFIED"
      ],
      "description": "\"VERIFIED\" | \"UNVERIFIED\""
    },
    "reaction_codes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "code": {
            "type": "string",
            "description": "string"
          },
          "count": {
            "type": "number",
            "description": "number"
          }
        },
        "required": [
          "code",
          "count"
        ],
        "additionalProperties": false,
        "description": "{ code: string; count: number; }"
      },
      "description": "{ code: string; count: number; }[]"
    },
    "mute_state": {
      "type": "string",
      "enum": [
        "ON",
        "OFF"
      ],
      "description": "\"ON\" | \"OFF\""
    },
    "thread_metadata": {
      "type": "object",
      "properties": {
        "creation_time": {
          "type": "number",
          "description": "number"
        },
        "name": {
          "type": "string",
          "description": "Human-visible name returned by WhatsApp."
        },
        "description": {
          "type": "string",
          "description": "string"
        }
      },
      "additionalProperties": false,
      "description": "{ creation_time?: number; name?: string; description?: string; }"
    }
  },
  "required": [
    "id",
    "name"
  ],
  "additionalProperties": false,
  "description": "NewsletterMetadata"
}
```

## Follow (`newsletterFollow`)

Execute the follow WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterFollow/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Unfollow (`newsletterUnfollow`)

Execute the unfollow WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterUnfollow/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Mute (`newsletterMute`)

Execute the mute WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterMute/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Unmute (`newsletterUnmute`)

Execute the unmute WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterUnmute/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Update Name (`newsletterUpdateName`)

Execute the update name WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterUpdateName/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `name` | yes | string |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Update Description (`newsletterUpdateDescription`)

Execute the update description WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterUpdateDescription/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `description` | yes | string |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Update Picture (`newsletterUpdatePicture`)

Execute the update picture WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterUpdatePicture/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `content` | yes | WAMediaUpload |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## Remove Picture (`newsletterRemovePicture`)

Execute the remove picture WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterRemovePicture/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "unknown"
}
```

## React Message (`newsletterReactMessage`)

Add or remove an emoji reaction on a newsletter message.

`POST /baileys/newsletters/newsletterReactMessage/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `serverId` | yes | string |
| `reaction` | no | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Fetch Messages (`newsletterFetchMessages`)

Load messages published by a newsletter.

`POST /baileys/newsletters/newsletterFetchMessages/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `count` | yes | number |
| `since` | yes | number |
| `after` | yes | number |

Response `result` structure:

```json
{
  "description": "any"
}
```

## Subscribe Newsletter Updates (`subscribeNewsletterUpdates`)

Execute the subscribe newsletter updates WhatsApp capability and return its typed result.

`POST /baileys/newsletters/subscribeNewsletterUpdates/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "type": "object",
  "properties": {
    "duration": {
      "type": "string",
      "description": "string"
    }
  },
  "required": [
    "duration"
  ],
  "additionalProperties": false,
  "description": "{ duration: string; }"
}
```

## Admin Count (`newsletterAdminCount`)

Execute the admin count WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterAdminCount/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "type": "number",
  "description": "number"
}
```

## Change Owner (`newsletterChangeOwner`)

Execute the change owner WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterChangeOwner/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `newOwnerJid` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Demote (`newsletterDemote`)

Execute the demote WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterDemote/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |
| `userJid` | yes | string |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Delete (`newsletterDelete`)

Execute the delete WhatsApp capability and return its typed result.

`POST /baileys/newsletters/newsletterDelete/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `jid` | yes | Full WhatsApp JID, for example 15551234567@s.whatsapp.net or 120363000000000000@g.us. |

Response `result` structure:

```json
{
  "description": "void"
}
```
