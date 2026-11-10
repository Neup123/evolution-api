# Emergency build plan: Baileys rc14 QR pairing restoration

## Incident and boundaries

Issue #52 records the 2026-11-10 18:10 Europe/Athens production `chabad-info` termination (401/LOGOUT; `connectionStatus=close`), and the inability to re-pair by QR in pinned Baileys 7.0.0-rc14 ([Baileys#2737](https://github.com/WhiskeySockets/Baileys/issues/2737)). Required deployability: before Friday **2026-11-13 16:52 Europe/Athens**. Re-pairing is an operational step *after* deployment; this code PR must not deploy, merge, or contact the live instance.

## Patch source and exact scope

Use the compiled `patches/baileys+7.0.0-rc14.patch` from [evolution-foundation/evolution-api PR #2727](https://github.com/evolution-foundation/evolution-api/pull/2727), author cloviscoli, for exactly pinned `baileys@7.0.0-rc14`. The original file includes:
- [Baileys#2765](https://github.com/WhiskeySockets/Baileys/pull/2765): `companion_reg_refresh` handling, rotating a fresh 32-byte adv secret only for unregistered companions; `creds.update` and re-render of the current QR without spending a reference or changing the QR timer.
- [Baileys#2602](https://github.com/WhiskeySockets/Baileys/pull/2602): ignore `link_code_companion_reg` missing `primary_identity_pub`.

**Documented one-line adaptation:** PR #2727's patch file does *not* include [Baileys#2749](https://github.com/WhiskeySockets/Baileys/pull/2749). Add its upstream `sendMessageAck` fix in compiled `messages-recv.js`: `authState.creds.me?.id` instead of unconditional `authState.creds.me.id`. This allows acknowledgement before login. No other source changes.

## Implementation

1. Include `patch-package@^8.0.1` in `devDependencies` with a synchronized npm lockfile.
2. Preserve existing `postinstall` libsignal logging patch and append `patch-package --error-on-fail` (a failed patch must fail installation).
3. Copy `patches/` before `npm ci` in the Docker builder and keep install logs visible; the final image inherits patched `node_modules`.
4. Leave the Baileys version in manifest and lockfile exactly `7.0.0-rc14`; do not touch Evolution 2.4.0 or unrelated code.

## Verification gates — record actual output on the PR

```bash
rm -rf node_modules
npm ci                         # require: baileys@7.0.0-rc14 ✔
npm run build                   # tsc --noEmit && tsup
grep -nE 'companion_reg_refresh|handleCompanionRegRefresh' node_modules/baileys/lib/Socket/socket.js node_modules/baileys/lib/Utils/companion-reg-client-utils.js
grep -nE 'primary_identity_pub|creds[.]me[?][.]id' node_modules/baileys/lib/Socket/messages-recv.js
npx tsx ./test/connection-recovery.test.ts
npx tsx ./test/socket-watchdog.test.ts
npx tsx ./test/disconnection-fields.test.ts
```

Additionally verify builder `npm ci` in Docker and actual GitHub PR checks. Never claim green without actual execution evidence. If unavailable, report **not verified**.

## Removal condition

Remove the patch **once a published Baileys release containing #2765 ships**, after testing that release and separately reviewing the dependency bump. An upstream PR merge alone is not sufficient.
