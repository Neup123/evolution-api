# Instance settings reference

The manager displays these values under **Instance → Settings**. `GET /settings/find/{instanceName}` reads them and `POST /settings/set/{instanceName}` replaces the supplied values.

| Setting | Type | Meaning |
|---|---|---|
| `rejectCall` | boolean | Reject incoming WhatsApp calls. |
| `msgCall` | string, optional | Message sent when a call is rejected. |
| `groupsIgnore` | boolean | Ignore incoming group messages. This also prevents those ignored events from reaching normal processing. |
| `alwaysOnline` | boolean | Keep account presence online while connected. |
| `readMessages` | boolean | Mark incoming messages read automatically. |
| `readStatus` | boolean | Mark viewed status posts read automatically. |
| `syncFullHistory` | boolean | Request the history WhatsApp makes available during a new pairing. It cannot guarantee recovery of all older WhatsApp history. |
| `wavoipToken` | string, optional | WA VoIP integration token. Changing it reconnects the socket. |
| `localReadTtlSeconds` | integer or null | Default lifetime, in seconds, of this instance's reusable PostgreSQL read snapshots. Range 0–2,592,000; null uses the environment default. |
| `localReadTtlOverrides` | object or null | Exact method-name to TTL map, such as `{"groupMetadata":3600,"fetchStatus":60}`. It takes priority over the instance default. |

The local-read precedence order is method override for this instance, instance default, environment method override, and environment default. `live=true` always bypasses a snapshot. Missing, expired, and method-relevant empty results fetch WhatsApp live and save the observation.

Archive capture and purge settings are separate because they require `ARCHIVE_API_KEY`. They appear lower on the same manager page and are fully documented in [the archive reference](./archive.md).
