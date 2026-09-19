# Settings templates

Settings templates are live shared settings for local-data-cache behavior and Automation Safety & Pacing. General instance behavior (`rejectCall` through `readStatus`) and WhatsApp Archive configuration remain instance settings.

## Precedence

The highest applicable level wins:

1. per-request `settingsTemplateId`
2. group or contact assignment matching the request recipient
3. instance default assignment
4. existing instance settings and server defaults

Editing a template changes subsequent requests for every binding that references it. Assignments never copy template data. Instances with no template binding preserve their existing behavior.

## API

Global template operations use the API key:

- `POST /settings-template/create`
- `POST /settings-template/edit`
- `POST /settings-template/duplicate`
- `DELETE /settings-template/delete`
- `GET /settings-template/list`

Instance-scoped assignment operations additionally use the instance guards:

- `POST /settings-template/assign/{instanceName}` with `{ "templateId", "scope": "instance|group|contact", "target"? }`
- `DELETE /settings-template/unassign/{instanceName}` with `{ "scope", "target"? }`
- `GET /settings-template/bindings/{instanceName}`

`target` is omitted for an instance default. Group targets must be full `@g.us` JIDs. Contact targets must be full non-group WhatsApp identifiers. Send-message requests can supply `settingsTemplateId`; local-read requests can supply it as a query parameter.

Example:

```json
{
  "name": "careful outreach",
  "settings": {
    "localReadTtlSeconds": 120,
    "automationSafety": {
      "enabled": true,
      "rateLimit": { "recipientPerMinute": 2 },
      "typing": { "enabled": true, "minMs": 400, "maxMs": 1200 }
    }
  }
}
```
