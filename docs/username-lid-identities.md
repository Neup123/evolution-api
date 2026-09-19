# WhatsApp username and LID identities

WhatsApp can display a username while withholding a phone number. Baileys rc14 represents the actionable account identity as a JID, usually an `@lid` JID. The username is display identity, not a destination string.

## Join requests

A join request may look like:

```json
{
  "jid": "153081895514146@lid",
  "request_method": "invite_link",
  "request_time": "1787745115",
  "username": "ruchamaschuman"
}
```

Use `jid` for `groupRequestParticipantsUpdate` and for messaging. Preserve `username` for display. Do not attempt to recover a phone number. A server-returned LID is authoritative for that instance.

```json
{
  "jid": "120363043342036080@g.us",
  "participants": ["153081895514146@lid"],
  "action": "approve"
}
```

```json
{
  "number": "153081895514146@lid",
  "text": "Your request was approved."
}
```

Authoritative LIDs observed in `groupRequestParticipantsList` are retained in memory and in instance-scoped local-read snapshots, so normal sending can continue after a process restart. An arbitrary, unobserved LID is still rejected.

## Raw usernames

Do not pass a raw username such as `@ruchamaschuman` to message routes. It is not a phone number or a JID. The API returns HTTP 400 with code `username_resolution_required`. Resolve the username through WhatsApp to an authoritative LID first. If WhatsApp returns no mapping, return a mapping-unavailable failure rather than guessing.

## Message-key validation

Delete, reaction, and quote operations require the exact WhatsApp message key. `remoteJid` must be a full WhatsApp JID, not an Evolution database row ID. A malformed delete key now returns HTTP 400 with code `invalid_whatsapp_jid` instead of leaking an internal decoder error.

## Baileys operation errors

Operation errors include a stable code and method-specific remediation:

- `baileys_connection_unavailable`: reconnect the WhatsApp instance, then retry a safe read after the connection is open.
- `baileys_operation_failed`: check permissions and resource identifiers. JID advice is included only for methods that take a JID-like parameter.

Do not automatically retry approve/reject or other mutations after throttling. Their remote state may have changed even when the caller did not receive a successful response.

## Compatibility

Phone-number JIDs continue to work. This change adds LID support without fabricating PN/LID mappings. Clients that previously submitted a raw `@username` or a database row ID as `remoteJid` now receive an earlier, clearer HTTP 400.

## Verification

```sh
npx tsc --noEmit
npm run lint:check
npm run test:message-archive
npm run test:outbound-safety
npm run audit:baileys-docs
npm run audit:runtime-openapi
```
