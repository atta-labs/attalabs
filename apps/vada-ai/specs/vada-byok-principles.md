# Vāda · BYOK Architecture (Current State)

**Status:** Implementation reality as of April 30, 2026.
**Audit basis:** `brief-byok-architecture-investigation.md` (Sonnet investigation, April 30, 2026).
**Companion doc:** `vada-byok-gap-report.md` — what needs to change to honor the original BYOK promise.

This document describes how BYOK actually works in Vāda today. It supersedes the earlier `vada-byok-principles.md` which described the intended architecture; the gap between intent and reality is captured in the companion gap report.

---

## What Vāda does today

You bring your own API keys. Vāda encrypts them in your browser with a passkey-derived key. The keys are usable only on the device you set them up on. Your account on Vāda's server has no copy of them.

When you run a deliberation, your browser sends the relevant API key to Vāda's server in the request body. Vāda's server uses that key in memory for the duration of the request to call the model provider. The server does not persist the key.

This is **transit-mode BYOK** — keys never sit at rest on our servers, but they do pass through during request handling.

---

## Where keys live, end-to-end

### At rest (your device)

When you save your keys with a passkey:

- **Storage:** browser IndexedDB, database `atta-identity`, store `credentials`, single record keyed `'primary'`.
- **Encryption:** AES-256-GCM. Key derived from your authenticator's WebAuthn PRF output (`new TextEncoder().encode('vada-api-keys-v1')` as PRF salt). The first 32 bytes of PRF output become the AES key, imported as a non-extractable `CryptoKey`. No PBKDF2/HKDF stretching between PRF and AES key.
- **IV:** fresh 12-byte random IV per encryption. Stored alongside ciphertext.
- **Plaintext metadata stored next to the ciphertext:** the list of providers that have keys (so the UI can show locked/unlocked indicators without unlocking). This is by design — provider names are not secrets.
- **Per-origin scope:** WebAuthn `rpId` is `window.location.hostname` at call time. Keys saved on `vada.attalabs.dev` are not reachable from other Atta subdomains or from `attalabs.test` (local dev).
- **Forget-device:** clears the IndexedDB record. Does not remove the OS-level passkey from the keychain (you must remove that manually if you want to fully reset).

### In your browser memory (during a session)

`@atta/identity` runs an `IdentityProvider` React context. It exposes:

- `state.keys` — `ApiKeyMap`, the in-memory plaintext key-by-provider map. Empty unless unlocked or freshly typed.
- `state.providers` — `RouteProvider[]`, the plaintext list saved alongside the ciphertext.
- `state.kind` — one of `initializing | no-stored-credential | locked | unlocked`.

State transitions:

```
initializing  → no-stored-credential : nothing in IndexedDB
initializing  → locked               : record found in IndexedDB
locked        → unlocked             : passkey biometric → PRF → AES → decrypt
locked        → no-stored-credential : forget-device
unlocked      → locked               : sign-out (when stored credential exists)
unlocked      → no-stored-credential : sign-out (no credential) or forget-device
no-stored-cred → unlocked            : save-with-passkey on a key just typed
```

The provider re-encrypts and writes to IndexedDB on every change to `state.keys` while `state.kind === 'unlocked'`. Persistence failures are silent — memory keeps working, next mutation retries.

### In transit (browser → Vāda server)

When you click Deliberate (or Run benchmark, or invoke the judge), the browser:

1. Reads the relevant key from `identity.state.keys[provider]`.
2. POSTs the key in the request body to one of these routes:
   - `/api/deliberation/[id]/workflow/run`
   - `/api/benchmark/baseline`
   - `/api/benchmark/judge`
   - `/api/benchmark/v2-judge`
3. The route extracts `apiKey` from the body, instantiates the provider SDK, calls the provider, streams responses back to the browser.
4. The key is held in request-scoped Node.js memory for the duration of the request and is not persisted.

Other paths bypass the server:
- **Probe** (validate a key at save time) — direct browser → provider call via `dangerouslyAllowBrowser: true`.
- **Ollama discovery** — direct browser → `localhost:11434/api/tags`.

### Server-side persistence audit

Confirmed by the April 30 investigation:
- No DB column anywhere has API keys, secrets, or credentials. Schema search across `packages/db/src/` returned no matches.
- Settings API endpoint `/api/settings` returns `apiKeys: []` always.
- No `SETTINGS_ENCRYPTION_KEY` usage anywhere in code (declared in `.env` but not read).
- No server-side encryption code path exists for keys (because nothing is stored to encrypt).

---

## Important caveats — read before relying on the BYOK story

1. **Keys transit Vāda's server in cleartext request bodies.** This means:
   - Vercel platform-level access logs could capture them if logging is misconfigured.
   - A server compromise during a request window exposes in-flight keys.
   - Error tracking (Sentry, etc.) could capture request bodies if not scoped to exclude `apiKey`.
   - Subpoena reaching Vāda mid-request could capture an in-flight key.
   - These are real risks even though no key is stored at rest.

2. **The LangGraph adapter is Anthropic-only.** `packages/adapter-langgraph/src/llm.ts` imports only `@anthropic-ai/sdk`. If a user selects OpenAI / Google / Mistral / DeepSeek / xAI / Meta in the UI, the Anthropic SDK is still called with that provider's key, which will fail. There is no provider routing layer in the adapter today.

3. **`packages/identity/src/invoke.ts` is dead code.** It implements a browser-direct provider call using `dangerouslyAllowBrowser: true`. It was the architecture that would have honored the original "browser-direct" promise. It is not imported anywhere in the production deliberation flow.

4. **No KDF between PRF and AES key.** PRF output is used directly as raw AES key material. WebAuthn PRF specifies that PRF output is suitable for direct use as key material, but a PBKDF2/HKDF round would be defense-in-depth.

5. **No link between WebAuthn `user.id` and Clerk user ID.** Each `createPasskeyWithPrf` call generates a fresh random 16-byte `user.id`. If the user creates multiple passkeys, they appear in the OS keychain as indistinguishable entries.

6. **`createdAt` is overwritten on every key mutation.** The `StoredCredential.createdAt` field is set to `Date.now()` every time the re-encrypt effect fires, so it does not reflect when the passkey was originally created.

7. **`updatePasskey` in `useIdentityBanner.ts` does not create a new passkey.** It triggers unlock + re-encrypt only. The name is misleading.

---

## What Vāda does store on the server

- Your deliberation questions
- Round transcripts (each agent's turns)
- Conclusions (recommendation, key condition, unresolved points)
- Terminal state per deliberation (Clean / Revised / Unconverged)
- User account metadata via Clerk (Clerk ID, email, etc.)
- Model assignments per agent role

None of the above includes API keys, provider credentials, or secrets.

---

## Cross-device and recovery

- **First-time on a new device:** enter API keys, optionally save with a passkey on that device. Each device is a sovereign identity.
- **Lost passkey / cleared browser data:** keys are unrecoverable. Vāda has no copy.
- **Key rotation:** rotate at the provider, update in Vāda. Vāda has no visibility into upstream rotation.

---

## How to verify these claims yourself

- **DB schema:** `grep -rn "api_key\|apiKey\|credential\|secret" packages/db/src/` — should return no key-related columns.
- **API surface:** check route handlers under `apps/vada-ai/web/src/app/api/`. Routes that accept `apiKey` in the body: `deliberation/[id]/workflow/run/route.ts`, `benchmark/baseline/route.ts`, `benchmark/judge/route.ts`, `benchmark/v2-judge/route.ts`. No other route accepts a key.
- **Server-side provider calls:** search for SDK instantiation with user keys: `grep -rn "new Anthropic" packages/ apps/`. Hits in `packages/adapter-langgraph/src/llm.ts` and benchmark routes.
- **Browser-direct calls:** the probe at `packages/identity/src/probe.ts` (key validation) and Ollama at `packages/identity/src/ollama.ts`. Deliberation traffic does NOT go browser-direct today.
- **Network tab:** during a deliberation, the request to your provider goes from your browser to `vada.attalabs.dev/api/deliberation/[id]/workflow/run`. The actual `api.anthropic.com` call originates from Vāda's server, not your browser.

---

## Where this design wants to go

The current architecture is one phase of a planned evolution. The original BYOK principles document described a future state where:
- Provider API calls originate browser-side
- Server has no exposure to keys, even in transit
- LangGraph orchestration is split: control plane on server, model invocation on client

That future state is captured in `vada-byok-gap-report.md` as the work that needs to happen to get there. Until that work is done, this document is the truth of what Vāda is.
