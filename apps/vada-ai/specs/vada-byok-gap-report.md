# Vāda · BYOK Gap Report

Status: retired

**Status:** Historical (April 30, 2026 framework, mostly superseded May 4, 2026).
**Resolution:** All four gaps have been addressed, though not all on the paths originally proposed. See "Resolution status" block immediately below. Document retained for historical record; current architecture is described in `vada-byok-principles.md`.
**Original purpose:** Catalog the gap between the original BYOK promise and the April 30 implementation. Sequence the work needed to close it.
**Audit basis:** Sonnet investigation report, April 30, 2026.

---

## Resolution status (May 6, 2026)

- **Gap 1 (server-side key transit):** Closed by the single-source-keys reversal (May 4). The Path A vs Path B framework no longer applies — Vāda did not move to browser-direct calls (Path A), nor did it harden transit-mode (Path B). Instead: keys are now server-side encrypted at rest, decrypted only inside request handlers (Path C, not enumerated in report). This was driven by the requirement to ship hosted MCP, which mandates server-decryptable keys.
- **Gap 2 (multi-vendor adapter):** Closed May 1, 2026. `packages/adapter-langgraph/src/llm.ts` now routes by model prefix (claude-* → Anthropic, gemini-* → Google, gpt-*/o4-* → OpenAI, grok-* → xAI) using per-vendor official SDKs.
- **Gap 3 (implementation hygiene in `@atta/identity`):** Mostly moot. The package is preserved but no longer holds canonical provider keys. Hygiene items 3a-3e described in this report were specific to the IndexedDB-as-canonical-store architecture; with that role demoted, the issues no longer apply in their original form. If the surviving utilities (`probeProviderKey`, `fetchInstalledOllamaModels`, `MigrationPrompt`) develop new hygiene needs, they can be addressed individually.
- **Gap 4 (`packages/identity/src/invoke.ts` dead code):** No longer relevant in the form described. The "browser-direct V2" path the file was a seed for is no longer the design direction — V2 hardening directions are different (KMS migration, audit log, per-key scoping). The file's status now is: review at convenience, delete or document per current relevance.

The rest of this document is preserved as-is for historical context. **Do not treat its recommendations as current.** Current architecture is documented in `vada-byok-principles.md` (rewritten May 6, 2026) and the relevant archived-decision records.

---

## TL;DR

1. **Keys transit Vāda's server.** Original spec promised browser-direct provider calls. Implementation routes through Vāda's server. **High-priority gap.**
2. **LangGraph adapter is Anthropic-only.** UI shows OpenAI / Google / etc., but the adapter imports only `@anthropic-ai/sdk`. **Honesty/UX gap.**
3. **Several minor implementation hygiene issues** in `@atta/identity`. **Low priority.**
4. **Dead code that would have honored the original promise** (`packages/identity/src/invoke.ts`). Decision needed: revive or delete.

---

## Gap 1 — Server-side key transit (CRITICAL)

### What the original promise was

From the previous version of `vada-byok-principles.md`:

> "API calls to model providers (Anthropic, OpenAI, Google, Mistral, DeepSeek, xAI, Meta, etc.) are made directly from your browser, not from Vāda's servers. Your browser authenticates to the provider using your key. Vāda's servers never see the key, never proxy the request, never intercept the response in transit."

### What's actually happening

The deliberation start path:

1. Browser POSTs `{ apiKey, ... }` to `/api/deliberation/[id]/workflow/run`
2. Server (`workflow/run/route.ts:149-154`) extracts `apiKey` from request body
3. Server constructs `new LangGraphAdapter({ apiKey })`
4. Adapter (`packages/adapter-langgraph/src/llm.ts`) constructs `new Anthropic({ apiKey: key })`
5. Server-side SDK calls `api.anthropic.com`, streams responses back to browser

Same pattern in three benchmark routes: `benchmark/baseline`, `benchmark/judge`, `benchmark/v2-judge`.

### Why this is a real risk, not theoretical

- **Vercel platform logs.** Misconfigured request logging captures bodies. We have not audited Vercel project settings for body redaction.
- **Error tracking.** If Sentry or similar is added later, default capture will include request bodies unless explicitly scoped.
- **Server compromise.** A compromise during the request window exposes in-flight keys. The structural BYOK promise was specifically that this attack surface would not exist.
- **Subpoena reach.** Compelled disclosure of in-flight requests could surface keys.
- **Cold-cache memory dumps.** Edge function memory hygiene is the platform's, not ours.

The whole point of the structural BYOK design was to make these risks impossible by architecture. The current implementation makes them possible-but-policy-bound, which is the weaker story the spec explicitly rejected.

### Two paths to close the gap

**Path A — Honor the original spec (browser-direct)**

Move provider API calls out of the server. Two flavors:

A1: **Browser-side LangGraph orchestration.** Run the LangGraph adapter in the browser. All model calls originate from `dangerouslyAllowBrowser: true` SDK clients. Server orchestrates control-plane only (state, persistence, SSE multiplexing if needed). The dead `packages/identity/src/invoke.ts` is the seed for this path.

- Pro: matches the original architectural promise exactly. No transit risk. Cleanest story.
- Con: large change. LangGraph state machines run client-side. Browser tab close mid-deliberation = state loss unless explicit checkpointing. Cross-tab coordination becomes harder. Edge cases in long-running deliberations need handling.
- Estimated effort: weeks (refactor `packages/adapter-langgraph` for browser execution; rewire deliberation flow; handle persistence and reconnection).

A2: **Hybrid — control plane on server, model calls in browser.** Server orchestrates the LangGraph state machine and decides which agent runs next. When an agent needs to call a model, the server signals the browser via SSE, the browser makes the API call directly, sends the response back to the server, server advances the state machine.

- Pro: keeps server orchestration; isolates the network hop for keys.
- Con: significant added complexity in the streaming protocol. Latency cost (server → browser → provider → browser → server per agent turn). Reconnection logic gets fiddly.
- Estimated effort: weeks. Possibly worse than A1 in maintenance burden.

**Path B — Soften the spec (transit-mode BYOK)**

Accept that keys transit the server. Harden the path:

- Audit Vercel project settings for request-body redaction in access logs.
- Add explicit request-body scrubbing for any future error tracking integration.
- Add a code-level `Symbol`-based marker that flags `apiKey`-containing objects to prevent accidental logging.
- Document the transit-mode posture clearly to users.
- Contractual/legal: add subpoena and law-enforcement transparency commitments.
- Consider a pluggable proxy mode where users with extreme requirements can run their own browser-direct mode (the dead code becomes a feature, opt-in).

- Pro: honest about reality, manageable effort, compatible with current stack.
- Con: weaker story. "Encrypted at rest, transits server in cleartext briefly" is not as defensible as "server never sees keys."
- Estimated effort: days for the hardening work; ongoing for documentation.

### Recommendation

**Short-term (this week or next):** Path B hardening — audit logs, scope error tracking, document the transit-mode reality. The updated spec (`vada-byok-principles.md` companion to this doc) already does the documentation half.

**V2 / next architectural pass:** Path A1 (full browser-direct). The dead code already exists. The story aligns with the differentiator. Sequence after Vāda has paying users and a stable production traffic baseline.

**Don't do nothing.** The current state is a mismatch between marketing and implementation. Either align the implementation (Path A) or align the marketing (Path B). Updated principles doc is the marketing alignment.

---

## Gap 2 — LangGraph adapter is Anthropic-only

### What the UI implies

Model picker (`packages/ui/libraries/basic/installed/model-picker.tsx`) renders models from Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, xAI, Meta, and Ollama. User can select any model for any agent.

### What the adapter does

`packages/adapter-langgraph/src/llm.ts` imports only `@anthropic-ai/sdk`. Every agent dispatch instantiates `new Anthropic({ apiKey: key })`. There is no routing layer that selects an SDK by provider.

If the user selects, say, GPT-5 for the Strategist agent, the deliberation will:
- Server receives the OpenAI API key in the request body
- LangGraph adapter calls `new Anthropic({ apiKey: <openai-key> })`
- Anthropic SDK calls `api.anthropic.com` with the OpenAI key
- Anthropic API rejects with auth error
- Deliberation fails

OR, depending on the implementation detail in `LangGraphAdapterConfig`, the adapter may fall back to `process.env.ANTHROPIC_API_KEY` (the Vāda server's own key, if set), in which case the deliberation runs but on Anthropic's models — not what the user selected. This is worse: silent provider override.

### Two paths to close

**Option 1: Add a multi-provider routing layer to `packages/adapter-langgraph`**

- Use Vercel AI SDK's `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, etc., with provider-routing logic per `ModelRef`.
- Adapter accepts an `ApiKeyMap` (provider-keyed) instead of a single `apiKey` string.
- `workflow/run/route.ts` accepts `{ apiKeys: ApiKeyMap }` instead of `{ apiKey: string }`.
- Identity layer already produces `ApiKeyMap` — wiring is straightforward.

Estimated effort: 2-3 days. This is the right answer.

**Option 2: Restrict the UI to Anthropic-only**

- Filter the model picker to Anthropic providers only.
- Document that V1 is Anthropic-only.

Estimated effort: hours. Honest but kills the BYOK multi-provider story.

### Recommendation

**Option 1.** The user-facing promise of multi-provider deliberation is core to Vāda's positioning ("deliberate with diverse models"). Anthropic-only V1 weakens the demo and the value prop. Multi-provider routing is contained, well-trodden territory (Vercel AI SDK exists for this).

Sequence: do this before any major Path A work above. Multi-provider routing in the current server-side architecture is the prerequisite for either A1 or A2.

---

## Gap 3 — Implementation hygiene in `@atta/identity`

These are low-priority but worth fixing in a single janitorial pass.

### 3a — `createdAt` overwrites on every key mutation

`packages/identity/src/react.tsx` re-encrypt effect:

```ts
const now = Date.now()
await saveCredential({
  ...
  createdAt: now,
  updatedAt: now
})
```

Should be:
```ts
const cred = await loadCredential()
await saveCredential({
  ...
  createdAt: cred?.createdAt ?? Date.now(),
  updatedAt: Date.now()
})
```

Or better, only set `createdAt` in `savePasskey`, not in the re-encrypt effect.

### 3b — `user.id` is random per passkey creation

`createPasskeyWithPrf` generates a fresh 16-byte `user.id`. Multiple passkey creations are unlinked in the OS keychain. Should be the user's Clerk ID (encoded as bytes) so all passkeys for a given user are linked under one identity.

```ts
// Current
user: {
  id: crypto.getRandomValues(new Uint8Array(16)),
  name: 'Vāda User',
  displayName: 'Vāda API Keys'
}

// Better
user: {
  id: new TextEncoder().encode(clerkUserId),
  name: clerkUserEmail,
  displayName: 'Vāda API Keys'
}
```

This requires plumbing the Clerk user ID into `createPasskeyWithPrf`, which means touching the `IdentityProvider` props or adding a context. Manageable.

### 3c — `updatePasskey` is misleadingly named

`useIdentityBanner.ts:69-85` exports `updatePasskey` but the function does not call `navigator.credentials.create`. It triggers unlock + re-encrypt only. Either:
- Rename to `refreshKeys` or `reEncryptKeys` (matches actual behavior)
- Implement actual passkey rotation (delete old credential, create new, re-encrypt under new PRF)

Recommend rename. Rotation is rare; if needed, add a separately-named explicit flow.

### 3d — No KDF between PRF and AES key

PRF output is used directly as raw AES-256 key material. WebAuthn PRF spec says PRF output is suitable for direct use, but a PBKDF2/HKDF round adds defense-in-depth at minimal cost. Standard cryptographic hygiene.

```ts
// Add HKDF-SHA256 expansion before importKey('raw', ...)
```

Low priority but cheap.

### 3e — Persistence failures silently swallowed

`re-encrypt useEffect` in `react.tsx`:

```ts
} catch {
  // Persistence failure — in-memory session keeps working; next mutation will retry
}
```

User has no signal that their newly-typed key is not actually persisted. UX-wise, surface a non-blocking warning ("Could not save to encrypted storage — keys remain in this session only").

---

## Gap 4 — Dead code: `packages/identity/src/invoke.ts`

Implements browser-direct provider invocation with `dangerouslyAllowBrowser: true`. Never imported in the production flow.

This is the seed for Path A1 (browser-direct architecture). Two options:

- **Keep it.** Document explicitly that it is the staging ground for V2 architecture. Add a comment to the file. Don't delete.
- **Delete it.** Cleaner codebase. If/when V2 architecture happens, write fresh.

**Recommendation: keep it.** The fact that this code exists and was clearly written with the original architecture in mind is signal. Future-self or future-collaborator deleting it would lose context. Add a header comment:

```ts
// invoke.ts — browser-direct provider invocation.
// This is the staging path for the V2 architecture where deliberation calls
// originate browser-side (no server transit). Currently UNUSED in production —
// the server-side LangGraph adapter handles invocation today. See
// vada-byok-gap-report.md for the migration plan.
```

---

## Sequencing recommendation

**Now (this week):**
- Update `vada-byok-principles.md` with current-state truth (already drafted).
- Add this gap report to `apps/vada-ai/specs/`.
- Audit Vercel logging settings for request-body redaction (Path B hardening, day-one item).

**Soon (1-2 weeks):**
- Multi-provider routing in `packages/adapter-langgraph` (Gap 2 Option 1). Prerequisite for almost anything else.
- Implementation hygiene pass in `@atta/identity` (Gaps 3a-3e). Half-day to a day.
- Document `invoke.ts` as the V2 staging ground (Gap 4).

**V2 (post-revenue, post-stability):**
- Path A1 — full browser-direct architecture. Realigns implementation with original BYOK promise.

**Never (unless we hear something major):**
- Path A2 — hybrid orchestration. Higher complexity than A1 with no clear advantage.

---

## What this gap report does NOT cover

- Anything outside the BYOK key-handling layer.
- Performance, scaling, billing, MCP integration, the broader Vāda product surface.
- The `vada-byok-principles.md` aspirational version (now archived under that filename or moved to a future-state doc as Principal decides).

---

## Open decisions for Principal

1. **Path A vs Path B for Gap 1.** My recommendation: B short-term, A1 V2. Confirm or override.
2. **Multi-provider routing approach.** Option 1 vs Option 2 for Gap 2. My recommendation: Option 1.
3. **`invoke.ts` keep vs delete.** My recommendation: keep with documentation.
4. **Where this report lives.** `apps/vada-ai/specs/vada-byok-gap-report.md` is my recommendation, alongside the updated principles doc.
5. **Whether the original aspirational `vada-byok-principles.md` should be preserved separately** (e.g. as `vada-byok-principles-v1-aspirational.md`) so the team's original architectural intent isn't lost.

---

## Audit trail

- Investigation source: full Sonnet read-only audit, April 30, 2026, captured in conversation transcript.
- Files inspected: `packages/identity/src/*` (full), `apps/vada-ai/web/src/app/api/**/route.ts` (full), `packages/adapter-langgraph/src/llm.ts`, `packages/db/src/schema.ts`.
- Server-side audit: confirmed no DB columns for keys, no `SETTINGS_ENCRYPTION_KEY` usage, no key-accepting routes beyond the four enumerated in Gap 1.
