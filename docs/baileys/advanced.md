# Advanced protocol

Low-level protocol, cryptographic, query, and binary operations.

## App Patch (`appPatch`)

Execute the app patch WhatsApp capability and return its typed result.

`POST /baileys/advanced/appPatch/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `patchCreate` | yes | WAPatchCreate |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Query (`query`)

Send a low-level WhatsApp binary query. Intended for advanced protocol integrations.

`POST /baileys/advanced/query/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `node` | yes | BinaryNode |
| `timeoutMs` | no | number |

Response `result` structure:

```json
{
  "description": "any"
}
```

## Send Raw Message (`sendRawMessage`)

Send a low-level raw WhatsApp message. Intended for advanced protocol integrations.

`POST /baileys/advanced/sendRawMessage/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `data` | yes | Uint8Array<ArrayBufferLike> \| Buffer<ArrayBufferLike> |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Upload Pre Keys (`uploadPreKeys`)

Execute the upload pre keys WhatsApp capability and return its typed result.

`POST /baileys/advanced/uploadPreKeys/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `count` | no | number |

Response `result` structure:

```json
{
  "description": "void"
}
```

## Upload Pre Keys To Server If Required (`uploadPreKeysToServerIfRequired`)

Execute the upload pre keys to server if required WhatsApp capability and return its typed result.

`POST /baileys/advanced/uploadPreKeysToServerIfRequired/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "description": "void"
}
```

## Digest Key Bundle (`digestKeyBundle`)

Execute the digest key bundle WhatsApp capability and return its typed result.

`POST /baileys/advanced/digestKeyBundle/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "description": "void"
}
```

## Rotate Signed Pre Key (`rotateSignedPreKey`)

Update rotate signed pre key using the connected WhatsApp account and return the server result.

`POST /baileys/advanced/rotateSignedPreKey/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "description": "void"
}
```

## Request Pairing Code (`requestPairingCode`)

Generate a pairing code for linking without scanning a QR code.

`POST /baileys/advanced/requestPairingCode/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `phoneNumber` | yes | string |
| `customPairingCode` | no | string |

Response `result` structure:

```json
{
  "type": "string",
  "description": "string"
}
```

## Send Unified Session (`sendUnifiedSession`)

Send or apply unified session using the connected WhatsApp account and return the server result.

`POST /baileys/advanced/sendUnifiedSession/{instanceName}`

Request body: `{}`.

Response `result` structure:

```json
{
  "description": "void"
}
```

## Send WAMBuffer (`sendWAMBuffer`)

Send or apply wambuffer using the connected WhatsApp account and return the server result.

`POST /baileys/advanced/sendWAMBuffer/{instanceName}`

| Field | Required | Meaning |
|---|---:|---|
| `wamBuffer` | yes | Buffer<ArrayBufferLike> |

Response `result` structure:

```json
{
  "description": "any"
}
```
