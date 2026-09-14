# Runtime actions and webhook reloads

## Instance actions

The Manager dashboard calls the same public API routes as other clients:

| Action | Route | Successful response | Failure behavior |
|---|---|---|---|
| Refresh | `GET /instance/fetchInstances?instanceId=...` | Current persisted instance object and counts. This is read-only. | Non-2xx response is shown in the Manager. |
| Restart | `POST /instance/restart/{instanceName}` | `{ "instance": { "instanceName": "...", "status": "open|connecting" }, "action": "restart_completed|reconnect_started" }` | Missing instances and unobserved transitions return HTTP 400. A closed instance starts reconnection instead of reporting a false success. |
| Disconnect | `DELETE /instance/logout/{instanceName}` | `{ "status": "SUCCESS", "error": false, "response": { "message": "Instance logged out" } }` | Already-closed instances return HTTP 400; transport/logout failures return HTTP 500. |

The Manager disables all three action buttons while one is running, animates the refresh indicator, reloads instance data after mutations, and displays success or failure notifications. Restart waits up to ten seconds for an actual Baileys state/client transition; it no longer returns a successful HTTP 200 containing `{ error: true }`.

Disconnect removes the saved WhatsApp session credentials. Restart does not. Use disconnect only when a new QR/pairing login is intended.

## Webhook runtime application

`POST /webhook/set/{instanceName}` and `POST /webhook/set-many/{instanceName}` commit the database change and then await a runtime reload before returning. Delivery always reads the current endpoint rows for each event. The cached runtime flags used for media base64 enrichment are recalculated from all enabled `WebhookEndpoint` rows, with the legacy single `Webhook` row used only when no endpoint rows exist.

Therefore changing a URL, headers, events, enabled state, by-event routing, or base64 option does not require an API/container restart. Startup also awaits the same reload, preventing early events from observing uninitialized flags.

`set-many` is full replacement: endpoints omitted from its request are deleted. Use `GET /webhook/find/{instanceName}` after a save to verify the persisted endpoint set.
