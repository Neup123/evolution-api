# Connection-stability bundle — build plan

**Repository:** `Neup123/evolution-api` (Core fork, v5.5.3).  
**Base:** `main` at `f1ccc8f3a0aabf62b4540dfc4cd87812d03a5d94` (includes #53).  
**Tracking issue:** [#54](https://github.com/Neup123/evolution-api/issues/54).  
**Scope:** source-side lifecycle/timeout/zombie cleanup plus one regenerated `baileys@7.0.0-rc14` patch. No deployment or merge.

## Implementation sequence

1. **Preserve credentials** — `shouldReconnectAfterClose()` treats 408 as retryable for `authState.state.creds.registered === true`; an unregistered 408 remains terminal. A 401 only receives a transient exception when a same-service `CB:stream:error` 515 was seen within 30,000 ms. Capture the stream event before registering other socket handlers.
2. **Bound reconnect** — reuse the fork's existing generation fence, single-flight retry, 30-second attempt deadline, and reset-on-open. Add full jitter with capped exponential delay (60,000 ms maximum) and immediate status 515 restart. Dispose previous socket listeners and then close/end it before calling `makeWASocket`; do not logout or delete credentials during reconnect.
3. **Bound sends** — route direct `sendMessage` and `relayMessage` calls, including the dynamic relay API path, through `withSendTimeout`. Default 60,000 ms; override with positive finite `EVOLUTION_SEND_TIMEOUT_MS`. A timeout bounds the caller's wait, **not** the in-progress Baileys mutex operation. Avoid blind automatic retry after a timeout.
4. **Allow zombie deletion** — if `deleteInstance` calls logout on a dead socket and that throws, warn and continue to the canonical `remove.instance` event. Do not swallow unrelated failures in the rest of the controller.
5. **Monotonic WA version** — keep #53's `patch-package --error-on-fail` integration and all QR/registration hunks. Add isolated #2777 hunks to the same `patches/baileys+7.0.0-rc14.patch`; the vendored `lib/Utils/wa-version.js` and declaration are adapted from [chaeulso/baileys](https://github.com/chaeulso/baileys/blob/master/docs/BUGFIXES.md). Use `resolveWaWebVersion()` in socket creation. The cache lives by default at `<cwd>/instances/wa-web-version.json`, on the existing `/evolution/instances` Docker volume, with optional `EVOLUTION_WA_VERSION_CACHE_PATH` override. Fetch failures, non-200s, unparsable revisions and older CDN revisions never downgrade a cached version. Cache persists across restarts.
6. **Tests / evidence / review** — no merge or image publication until the clean install, build, executable tests and output inspection below pass in a dependency-equipped runner.

## Dependencies and verification

Use an environment with internet access to npm and the repository checked out at the PR head. The active Chat tool execution environment cannot reach the npm registry or github.com from its shell; connector-level source and patch inspections **do not substitute for running the checks**.

```bash
rm -rf node_modules
npm ci 2>&1 | tee /tmp/evolution-npm-ci.log
grep -F 'baileys@7.0.0-rc14' /tmp/evolution-npm-ci.log
npm run build

# Existing fork suites (only the first has a package.json script):
npm run test:connection-recovery
npx tsx test/socket-watchdog.test.ts
npx tsx test/disconnection-fields.test.ts

# Compiled service/bundled source checks (actual paths may vary by tsup output):
grep -R -nE 'shouldReconnectAfterClose|registered|lastStream515At|stream515GraceMs' dist
grep -R -nE 'ceilingMs|Math.random|withSendTimeout|WhatsApp send timed out' dist
grep -R -nE 'remove.instance|Zombie socket logout failed' dist
grep -R -nE 'resolveWaWebVersion|readVersionCache|writeVersionCache|cachedWaWebVersion' node_modules/baileys/lib/Utils
grep -R -n 'companion_reg_refresh' node_modules/baileys/lib
```

The generated `dist` may minify symbols: compare emitted strings and inspect output chunks; missing exact identifiers due to bundling is not automatically a failure, but missing behavior is. Confirm that `npm ci` displays `patch-package` applying the complete patch to `baileys@7.0.0-rc14` and exits successfully. A failed patch must stop install. Verify both paid and unpaired 408 cases, 515 then 401 within/outside 30s, recovery from 428, one-socket teardown, timeout rejection, and zombie cleanup. Review CI on the PR directly; no checks is not success.

## Provenance and intentional exclusions

- FAFAzin / VENDORA stability work, referenced in [Evolution #2501](https://github.com/evolution-foundation/evolution-api/pull/2501): **do not** carry its unconditional 408 no-reconnect or unrelated logout reliability changes. The user's referenced `VENDORA-PATCHES.md` and `docs/brain/reconnect-freeze.md` paths were unavailable in the public FAFAzin default branch when inspected; use the #2501 discussion as supporting context and verify against private copies if supplied.
- [Evolution #2509](https://github.com/evolution-foundation/evolution-api/pull/2509): 30-second stream-515 / trailing-401 guard.
- [Evolution #2520](https://github.com/evolution-foundation/evolution-api/pull/2520): zombie deletion even when logout fails. Merged upstream but not present in this fork's base.
- [Baileys #2777](https://github.com/WhiskeySockets/Baileys/issues/2777) / [chaeulso BUGFIXES](https://github.com/chaeulso/baileys/blob/master/docs/BUGFIXES.md): monotonic resolver and persistent cache. The #53 QR fix (#2765/#2602/#2749-line) is preserved.
- **Skip #2784**: its `query()`/init-query and pre-key retry changes cut across unrelated socket/chats modules and are not required to resolve the four incident classes; carrying them without live verification would broaden this surgical PR.

## Upstream removal gates

Remove each Evolution workaround only when a tested **2.3.x** release has that precise behavior; #2520 on upstream `develop` alone is insufficient. Remove Baileys #2777 hunks only when an explicitly tested, compatible future Baileys version contains monotonic persisted version resolution. Independently keep #53's QR pairing patch until the upstream package contains it. The pin remains **exactly `7.0.0-rc14`** in this PR.
