# Vāda BYOK Architecture — Design Spec

**Date:** 2026-04-17
**Status:** Approved for implementation
**Related:** `apps/vada-ai/specs/v2/vada-byok-principles.md` (user-facing principles, locked copy)

---

## Summary

Replace Vāda's current server-held-keys architecture with a structural BYOK architecture where the browser holds the user's API keys and calls model providers directly. The Vāda server becomes a stateless orchestrator that composes prompts and tracks session state but never receives, stores, or transmits any provider credential. The principles doc at `/trust` becomes true by construction, not by policy.

## Problem

The current architecture violates every claim in `vada-byok-principles.md`:

- `POST /api/deliberation/start` accepts `apiKey` / `apiKeys` in its Zod schema — keys flow from browser to server on every start.
- `user_api_keys` table persists encrypted keys server-side with `upsertUserApiKey` / `getDecryptedApiKey` helpers.
- Server-side engine (`agents.ts`) instantiates Vercel AI SDK clients (`createAnthropic({ apiKey })`, `createOpenAI`, `createGoogle`, `createGroq`, `createOpenRouter`) and calls providers directly from Vercel lambdas.
- Ephemeral in-memory server maps (`storeEphemeralKey` / `storeEphemeralProviderKey`) hold plaintext keys during a session.
- `validateModelConfig` probes providers from the server with the user's key.
- Browser stores keys in `localStorage` via `packages/models/src/storage.ts`.

`MOCK_MODE = true` masks this today because no real provider calls run, but the code path is wired end-to-end. The instant MOCK_MODE is flipped, every principle on `/trust` is false.

## Goals

1. Zero plaintext key persistence anywhere — not localStorage, not sessionStorage, not cookies, not DB, not logs.
2. Zero key transmission from browser to Vāda server — in request bodies, query strings, headers, cookies, or any other channel.
3. Zero server-side provider API calls — the Vāda server never calls `api.anthropic.com` etc. on behalf of a user.
4. Structural enforcement — the database schema, route input schemas, and server code organization make it **impossible** to hold or transmit a user key without a deliberate architectural regression that `grep` will catch.
5. First-class UX — passkey-encrypted storage for return visits (Touch ID / Face ID / Windows Hello), graceful fallback to in-memory-only when passkey is unsupported or declined, clear sign-out vs forget-device semantics.
6. Shared foundation — build the browser-side identity package for reuse by Vitakka and Attā later (Vāda is the first consumer).

## Non-Goals

- Server-side encrypted cloud sync of keys (explicitly rejected — violates the story).
- Cross-device P2P sync via QR code (future feature; referenced in principles doc but out of scope).
- Team / org-level shared keys (enterprise feature, not for V1).
- Migrating existing users' DB-stored keys to the new system (V1 dropping the table is acceptable; users re-enter).
- Changing the deliberation semantics (rounds, agents, conclusion protocol) — purely an architectural refactor, same behavior.

---

## Architecture

### The fork: pull-based orchestration (approved)

The existing SSE-driven server loop is replaced with a pull-based REST loop driven by the browser. The browser asks the server "what's next?", gets a command (compose-prompt-plus-model), executes the provider call locally with its own key, streams tokens into its own UI, then reports the result back to the server. The server advances the state machine and returns the next command on the following pull.

Rationale:

- **Better streaming UX than today.** Today: provider → server → browser (two network hops per token). New: provider → browser (one hop). Token latency drops.
- **Stateless server.** No long-lived lambda, no cross-lambda coordination (no Redis, no Neon LISTEN/NOTIFY), no SSE plumbing. A perfect fit for Vercel serverless.
- **Idempotent resume by construction.** State is the single source of truth in the DB. Reload = browser calls `/next` again and receives the same command until the browser succeeds in reporting a turn result. No in-flight reconciliation problem.
- **Clean abort semantics.** Browser cancels the in-flight `AbortController`, stops calling `/next`. Nothing to unwind on the server.

### Endpoints

Three new server endpoints replace the SSE stream:

| Endpoint | Method | Purpose | Body |
|----------|--------|---------|------|
| `/api/deliberation/[id]/next` | POST | Browser pulls the next command. Server reads session state, composes prompt, returns a command. Idempotent. | — |
| `/api/deliberation/[id]/turn` | POST | Browser reports a successful turn result. Server writes transcript, advances state, returns updated session state. | `{ turnId, content }` |
| `/api/deliberation/[id]/turn-error` | POST | Browser reports a provider error (401/429/etc.). Server marks a transient error flag for UI, does not advance state. | `{ turnId, error }` |

Deleted endpoints:

- `/api/deliberation/[id]/stream/route.ts` — replaced by `/next` + `/turn`.
- `/api/settings/api-keys/route.ts` — no server-side key storage.

Modified endpoint:

- `/api/deliberation/start/route.ts` — removes `apiKey` and `apiKeys` from Zod schema. Also removes `provider`/`modelId`/`agentModels` key-coupling: the start route only needs the question, agents, and model assignments (provider + modelId per agent). Server has no way to validate model connectivity without a key — validation moves to the browser pre-start.

### Command shape

```ts
type NextCommand =
  | {
      type: 'run_agent'
      turnId: string
      agent: string
      round: number
      model: { provider: RouteProvider; modelId: string }
      systemPrompt: string
      userPrompt: string
    }
  | {
      type: 'run_conclusion'
      turnId: string
      phase: 'synthesize' | 'audit' | 'revise' | 'reaudit'
      model: { provider: RouteProvider; modelId: string }
      systemPrompt: string
      userPrompt: string
      expected: 'json' | 'verdict'
    }
  | { type: 'state_change'; state: 'ROUND_2' | 'ROUND_3' | 'CONCLUDING' | ... }
  | { type: 'terminal'; terminal_state: 'CLEAN' | 'REVISED' | 'UNCONVERGED' | 'SPARRING_COMPLETE' }
  | { type: 'done' }
```

Neither `/next` nor `/turn` ever accepts or emits an API key. The server emits fully composed prompts (system + user); the browser executes them against the specified model using its local key. Prompt composition stays server-side — prompt IP (Synthesizer schema, Blind Critic framing, Universal Anchor) does not ship to the client bundle.

### Server/browser split

**Stays server-side:**

- `src/engine/prompts/*` — prompt composition (unchanged)
- `src/engine/schemas.ts` — agent configs and roles (unchanged)
- `src/engine/workflow.ts` — rewritten as a pure `getNextCommand(sessionId): NextCommand` function called from `/next`. No while-loop, no SSE, no model calls.
- `src/engine/rounds/*` and `src/engine/conclusion/*` — rewritten to *compose prompts and return commands*, not invoke agents.
- `src/db/*` — unchanged apart from dropping `user_api_keys` table.

**Deleted from server:**

- `src/engine/agents.ts` — the `createDeliberationAgent`, `createConclusionAgent`, `createBlindCriticAgent`, `validateModelConfig`, `resolveModel`, and Mastra/AI-SDK provider factories. Mock agents also removed; mocking moves to browser.
- `src/engine/stream.ts` — the `SSEEmitter` class.
- `src/engine/pending-keys.ts` — ephemeral server key map.
- `src/engine/retry.ts` — moves to browser (that's where the call happens).
- `src/app/api/deliberation/[id]/stream/route.ts`
- `src/app/api/settings/api-keys/route.ts`
- `src/db/settings-queries.ts` — the `upsertUserApiKey` / `getDecryptedApiKey` / `deleteUserApiKey` functions.
- `src/lib/crypto.ts` — server-side encryption helpers. The server has no keys to encrypt.
- `user_api_keys` table in the Drizzle schema + a drop migration.

**New on server:**

- `src/engine/orchestrator.ts` — exposes `getNextCommand(sessionId, userId): NextCommand`. Reads session state, composes, returns a single command.
- `src/engine/turn.ts` — exposes `recordTurn(sessionId, userId, { turnId, content })` and `recordTurnError(sessionId, userId, { turnId, error })`. Writes transcript rows, advances state machine atomically.
- `src/db/queries.ts` additions — `getSessionForUser(sessionId, userId)` helper that returns the session only if it belongs to the user, or null. All session-bearing endpoints use this.

**New browser-side — `packages/identity`:**

```
packages/identity/
├── package.json
├── src/
│   ├── index.ts              # Barrel export
│   ├── storage.ts            # IndexedDB read/write, encryption, clear
│   ├── passkey.ts            # WebAuthn PRF create/get
│   ├── crypto.ts             # Web Crypto AES-GCM wrappers
│   ├── keymap.ts             # ApiKeyMap type + helpers
│   ├── invoke.ts             # runAgentCall({ prompt, systemPrompt, model, apiKey, signal })
│   ├── retry.ts              # Exponential backoff
│   ├── errors.ts             # classifyProviderError(err)
│   ├── mock.ts               # Browser-side mock invoke (dev only, UI-visible)
│   └── react.tsx             # IdentityProvider + useIdentity hook
└── tests/
```

**Consumed by Vāda:**

- `apps/vada-ai/web/src/app/layout.tsx` — wraps app in `<IdentityProvider>`.
- `apps/vada-ai/web/src/app/deliberation/[id]/components/useDeliberation.ts` — rewritten from SSE consumer into pull-loop driver. Uses `useIdentity()` for the key map and `runAgentCall` for provider execution.
- `apps/vada-ai/web/src/app/deliberate/components/QuestionInput.tsx` — reads `useIdentity().providers` for UI.
- `apps/vada-ai/web/src/components/KeyUnlockDialog.tsx` (new) — the locked/unlocked/forget-device UI.

**Deleted from browser side:**

- `packages/models/src/storage.ts` — the localStorage key helpers. `getStoredApiKey` / `storeApiKey` / `removeStoredApiKey` are removed; callers migrate to `useIdentity()`.

### Streaming UX

The browser receives a command, looks up the provider key, calls `runAgentCall` which internally uses `@ai-sdk/anthropic` (or `@ai-sdk/openai`, etc.) with `dangerouslyAllowBrowser: true` and a detailed comment referencing `/trust`. The call returns a `ReadableStream<string>` of token deltas. The browser pipes these into React state (`onDelta(agent, round, delta)`), which `MessageCard` renders exactly as today. On stream end, the browser POSTs `/turn` with the full text. The `streamed` / `thinking` / `complete` UI states are driven locally by the browser's own stream lifecycle.

### Abort semantics

Each `runAgentCall` accepts an `AbortSignal`. The `useDeliberation` hook creates a fresh `AbortController` per turn, stored in a ref. User navigates away / clicks stop / unmounts → abort fires → provider call cancels → no `/turn` POST → session state unchanged. Reload → `/next` returns the same command (idempotent). If the browser's provider call succeeds but the `/turn` POST fails (network blip), the result is lost — on reload, the turn re-runs. Turns are not that expensive; this is acceptable for V1. (Future optimization: IndexedDB a "pending turn" before POST.)

### Error handling across the browser/server boundary

Provider errors (401, 403, 404, 429, transport) are classified in the browser by `errors.ts` into a structured result:

```ts
{ kind: 'invalid_key' | 'rate_limit' | 'model_not_found' | 'transient' | 'unknown',
  userMessage: string,
  provider: RouteProvider,
  recoverable: boolean }
```

For recoverable kinds (`transient`, `rate_limit` with retry-after), `retry.ts` handles backoff without surfacing to user. Non-recoverable kinds surface to UI:

- `invalid_key` → inline prompt "Your {provider} key looks invalid — update it?" with inline re-entry. After update, user can retry the turn.
- `model_not_found` → "The model `{modelId}` was not found for {provider}. Pick a different model for this agent."
- `unknown` → "{provider} call failed. Try again or change this agent's model."

Errors are reported to the server via `/turn-error` with the classified user message. The server stores nothing key-related; it just records that the current command failed and does not advance state. Retries are browser-driven.

### Missing-key validation

Before the first `/next` call, the browser collects the set of providers required by:

- Every round agent's model config
- The Synthesizer's model (configured or defaulted)
- The Blind Critic's model
- The Revision model

…and checks them against the in-memory `ApiKeyMap`. If any provider is missing, the UI blocks the deliberation start with inline resolution: add the missing key, or swap that specific model to a provider the user has. No provider key is ever guessed or defaulted silently.

The validation runs at "Start Deliberation" time, not at key-entry time. Users may configure keys for providers they don't use in this specific deliberation.

### Passkey-encrypted storage

Follows `claude-code-passkey-storage.md` in `apps/vada-ai/specs/v2/`. Key points:

- Single IndexedDB record per user: `{ credentialId, encryptedKeys, iv, providers, createdAt, updatedAt }`.
- WebAuthn PRF extension: create via `navigator.credentials.create` with `authenticatorSelection: { userVerification: 'required', residentKey: 'required' }` and `extensions: { prf: {} }`. Derive 256-bit AES-GCM key from PRF output using fixed salt `vada-api-keys-v1`.
- AES-GCM: fresh 12-byte IV per encryption. Never reuse. Web Crypto API only, no third-party crypto libraries.
- PRF unsupported → in-memory fallback, no hardcoded key ever.
- `providers` stored in plaintext (it's the list of configured provider names, not key material); `encryptedKeys` is the ciphertext of the `ApiKeyMap` JSON.
- Add/update/remove a provider key: decrypt blob → mutate map → fresh IV → re-encrypt → update `providers` → write. No biometric prompt mid-session once the map is unlocked.

### Sign-out / forget-device behavior

Three distinct user actions with three distinct outcomes:

| Action | Memory | IndexedDB | Next visit |
|--------|--------|-----------|------------|
| **Sign out (lock)** | Cleared | Preserved | Unlock with passkey |
| **Forget this device** | Cleared | Deleted | Start fresh — re-enter keys |
| **Tab close** | Cleared (automatic) | Preserved | Unlock with passkey |

"Forget this device" requires a confirmation dialog with explicit language:

> Your stored API keys on this device will be permanently deleted. You will need to re-enter them to use Vāda on this device again. Your passkey in your OS keychain will not be deleted automatically — remove it there separately if you want to.

The key-management UI shows a visible state indicator: **Locked** / **Unlocked** / **No keys stored**.

### Session ownership (pre-existing issue, fixed as part of this work)

Today's `GET /api/sessions/[id]` and `/api/deliberation/[id]/stream` authenticate the Clerk user but do **not** verify the session belongs to them. Session IDs are UUIDv4 (random, unguessable per `defaultRandom()`) so the exposure is limited to guessing, leaked URLs, or a compromised session ID — but the endpoints should still enforce ownership. Fixed as part of this refactor:

- New helper: `getSessionForUser(sessionId, userId)` in `db/queries.ts` that returns the session only if `session.userId === userId`, else null.
- Every endpoint that takes a session ID from the URL uses this helper: `/api/sessions/[id]`, `/api/sessions/[id]/export`, `/api/deliberation/[id]/next`, `/api/deliberation/[id]/turn`, `/api/deliberation/[id]/turn-error`, `/api/deliberation/[id]/intervene`.
- Response for a non-owned or non-existent session: 404 (not 403 — don't leak existence).

### Mock mode (redesigned, UI-visible)

Today: `MOCK_MODE = true` in `engine/agents.ts` silently returns canned responses server-side. This silence is exactly what masked the BYOK architectural bug. The new mock mode:

- Lives in `packages/identity/src/mock.ts` (browser-side).
- Triggered by `NEXT_PUBLIC_VADA_MOCK_MODE=true` env var, or a dev-only toggle in the UI.
- When active, an **always-visible banner** at the top of the app reads: `DEV MODE — no real provider calls are being made`.
- `runAgentCall` dispatches to `mockInvoke` instead of the real AI SDK client when the flag is set.
- No silent fallback: if a user hits any production surface with mock mode accidentally enabled, the banner makes it impossible to miss.

### CSP and CORS

CSP `connect-src` must allow:

```
https://api.anthropic.com
https://api.openai.com
https://generativelanguage.googleapis.com
https://api.groq.com
https://openrouter.ai
```

CSP headers are updated in the NextWebShell / middleware during implementation — not as a follow-up. A CSP that blocks provider calls will make the product look broken for reasons nobody traces immediately.

CORS on each provider (Anthropic, OpenAI, Google, Groq, OpenRouter) is open for browser calls as of late 2025. Verified with a curl probe during implementation with a real user key (some providers have org-tier CORS differences).

### Bundle size

Shipping `@ai-sdk/anthropic` + `@ai-sdk/openai` + `@ai-sdk/google` + `@ai-sdk/groq` + `@openrouter/ai-sdk-provider` to the browser adds ~100–150KB gzipped. Acceptable for V1. No premature code-splitting; if it becomes a measurable problem later, split per-provider on demand.

### `/trust` page

Published at `/trust` (confirmed over `/security` for positive framing consistent with the principles doc voice). The page renders `apps/vada-ai/specs/v2/vada-byok-principles.md` content verbatim — copy is locked. Not published until all verification gates pass.

---

## Verification gates

Before `/trust` goes live, every gate must pass:

### Gate 1: Schema grep

```bash
grep -ri "api_key\|apiKey\|anthropic_key\|openai_key\|provider_key\|credential\|secret\|token" \
  packages/*/db apps/*/db apps/*/src/db
```

Zero hits in any user-related table or column definition. (Matches inside `packages/identity/src` are expected — it's the browser-side identity package.) Clerk auth tokens on the user table are fine — those are not provider keys.

### Gate 2: Route grep

Check every Next.js route handler and every Zod input schema. No route accepts a provider API key as input. The orchestration pattern is browser-calls-provider-directly — server-calls-provider is forbidden.

```bash
grep -rn "apiKey\|api_key" apps/*/web/src/app/api/
```

The only acceptable hits are in route *handlers* that may reference keys as something to reject, or in comments. No hits in any `z.object({...})` or route input definition.

### Gate 3: Six UI states manually tested

1. No stored credential, no session keys (first-time user)
2. Stored credential exists, not unlocked (return user)
3. Unlocked, keys in memory (active session)
4. Passkey not supported in browser (Firefox likely)
5. Passkey unlock failed (retry flow)
6. Passkey deleted from OS / credential not found (recovery flow)

### Gate 4: Sign-out behavior tested

- "Sign out" clears memory, preserves encrypted blob — verified with DevTools IndexedDB inspector
- "Forget this device" clears both memory AND IndexedDB, with correct confirmation dialog
- Tab close clears memory, preserves encrypted blob

### Gate 5: Browser compatibility

Tested (not claimed — actually tested):

- Chrome on macOS (reference implementation, PRF works)
- Safari on macOS (partial PRF, verify behavior)
- Chrome on iOS (synced passkey, cross-browser same-device)
- Firefox on any OS (likely falls through to in-memory; verify fallback actually works, not crashes)

### Gate 6: End-to-end real deliberation

With mock mode OFF and a real Anthropic/OpenAI key entered by a real browser user:

- Deliberation completes
- Network tab shows calls to `api.anthropic.com` (etc.) directly from the browser, never via Vāda's origin
- Network tab shows no outbound server request containing the key string
- Server logs show no key material

---

## Implementation order

Execute in this order. Each step should be verifiable in isolation before moving on.

1. **Session ownership helper + endpoint hardening.** Add `getSessionForUser`, wire into existing endpoints. Pre-existing fix, independently verifiable.
2. **Server architecture inversion.** Add `orchestrator.ts` + `turn.ts`, new `/next` and `/turn` endpoints. Rewrite `workflow.ts` / `rounds/*` / `conclusion/*` to return commands instead of calling agents. Delete `stream/route.ts`, `stream.ts`, `pending-keys.ts`, server-side `agents.ts` AI-SDK code, `retry.ts`. At this point the server is dormant for deliberation — intentional.
3. **DB schema removal.** Drop `user_api_keys` table + migration. Delete `settings-queries.ts` key functions, `settings/api-keys/route.ts`, `lib/crypto.ts`. Remove `apiKey` / `apiKeys` from `start/route.ts` Zod schema.
4. **`packages/identity` scaffold.** New package, minimal surface: in-memory key map, `IdentityProvider`, `useIdentity` hook, `runAgentCall` with real AI SDK clients + `dangerouslyAllowBrowser: true`, `classifyProviderError`, `retry.ts`, browser-side mock.
5. **Browser integration — in-memory only.** Rewrite `useDeliberation.ts` as a pull-loop. Remove `packages/models/src/storage.ts` localStorage helpers. Key entry UI uses `useIdentity()`. At this point a full deliberation works end-to-end browser-driven, keys in React state only.
6. **Passkey persistence.** Add `storage.ts`, `passkey.ts`, `crypto.ts` in `packages/identity`. Add unlock / save-with-passkey / forget-device UI flows. IndexedDB integration.
7. **Missing-key validation.** Collect provider set from agent + conclusion + audit + revision models, check against `ApiKeyMap`, block start with inline resolution if incomplete.
8. **CSP + mock-mode banner.** Update CSP `connect-src`, add the always-visible mock-mode banner.
9. **`/trust` page.** Render the principles doc content verbatim.
10. **Verification gate pass.** Run all six gates. Do not merge until all pass. Do not publish `/trust` until all pass.

---

## Risks (acknowledged, mitigated)

| Risk | Mitigation |
|------|-----------|
| `dangerouslyAllowBrowser: true` flag | Set with inline comment referencing the BYOK principles. The flag is named for the anti-pattern (embedding dev's own key in client JS). Our usage is the opposite — the user's own key in the user's own browser. |
| CORS from providers | Verified via curl with a real user key during implementation, per provider. |
| Bundle size | 100-150KB accepted for V1. Code-splitting deferred. |
| CSP blocking provider calls | Updated as part of implementation step 8, not as follow-up. |
| Silent mock masking bugs (repeat failure mode) | Mock mode is explicit, UI-visible banner, opt-in by env var. |
| Conclusion models need keys too | Missing-key validation covers Synthesizer / Blind Critic / Revision, not just round agents. |
| Session ownership | New `getSessionForUser` helper enforced on every session-bearing route. |
| User losing keys (no server recovery) | Documented in the principles doc as a tradeoff. "Forget this device" dialog makes consequences explicit. |
| Network error between provider success and `/turn` POST | Turn re-runs on reload. Acceptable for V1; future optimization is a "pending turn" IndexedDB record. |

---

## Open questions — none blocking

All questions in the design presentation have been answered. Proceeding to implementation plan.
