# Vāda · BYOK Architecture (Current State)

**Status:** Implementation reality as of May 6, 2026.
**Last major change:** May 4, 2026 — single-source-keys reversal (D-028) and hosted MCP shipped (D-029). See `vada-decisions.md` for the architectural decision history.

This document describes how BYOK actually works in Vāda today.

---

## Architecture history (one paragraph)

Before May 4, 2026, Vāda used a transit-mode model: provider API keys were encrypted in your browser via a passkey-derived AES-256-GCM key (stored in IndexedDB), and transited Vāda's server in cleartext request bodies during deliberation runs. The server held them only in memory for the duration of a single request. This model gave a strong "no key at rest on our servers" story but constrained Vāda to web-app-only deliberation — an MCP client running on Claude Desktop or Cursor cannot reach a user's browser IndexedDB or passkey.

On May 4, 2026, the hosted MCP server shipped (D-029), which required server-side decryptable provider keys to call provider APIs on the user's behalf. A brief intermediate architecture (PRs #9-10) tried to maintain both stores with synchronization, but the UX implications — especially the lock-icon "Sign out / Forget device" affordances on the deliberate page that no longer reflected reality once the server held a copy of every key — surfaced a sync bug within minutes of feature use. PR #13 (single-source-keys reversal) demoted IndexedDB from canonical key storage and made server-side `user_provider_keys` the single source of truth.

The current model is **server-side at rest, decrypted per-request**: provider keys are envelope-encrypted in `user_provider_keys`, decrypted only inside the API route handler for the duration of the LLM call, then garbage-collected. This is a deliberate trust escalation from the prior model — Vāda's server holds an encrypted copy of your keys it can decrypt — and is documented honestly here rather than papered over.

---

## What Vāda does today

You bring your own API keys. They are stored in Vāda's database, **envelope-encrypted at rest** in the `user_provider_keys` table. The encryption is bound to your user identity (your Clerk `clerkId` is the AAD on every ciphertext), so a row swap between users is detectable on decrypt. The master key is held in the `MASTER_ENCRYPTION_KEY` environment variable on Vāda's production deployment; KMS migration is reserved as future work via the `kms_key_id` column on each row.

When you run a deliberation — whether through the web app or through hosted MCP — Vāda's server fetches your encrypted key for the relevant provider, decrypts it inside the request handler using the master key, calls the provider on your behalf, and lets the plaintext key go out of scope. The plaintext is never logged, never persisted, never returned in any response body or error payload.

---

## Where keys live, end-to-end

### At rest (Vāda's database)

- **Table:** `user_provider_keys` (defined in `packages/db/src/schema/keys.ts`, ecosystem-shared per D-030)
- **One row per `(clerk_id, provider)` pair.** Providers: `anthropic`, `google`, `openai`, `xai`.
- **Columns:** `id`, `user_id`, `provider`, `key_ciphertext`, `key_iv`, `kms_key_id`, `created_at`, `updated_at`.
- **Encryption:** AES-256-GCM. The data key is derived from the master key in `MASTER_ENCRYPTION_KEY` env var; AAD on each ciphertext is the user's `clerkId`. Implementation in `packages/crypto/`.
- **`kms_key_id` versioning:** carries a version identity (`'env:v1'` in current shipped state) so that a future migration to KMS-managed master keys can be performed per-row without breaking existing ciphertexts.

### Storage schema (api_keys — for hosted MCP authentication)

Separate from provider keys. The `api_keys` table holds Vāda API keys (`vada_*`) used as bearer tokens by MCP clients. Stored as SHA-256 hex digests with a unique index on `key_hash` — direct lookup, no bcrypt. Plaintext is shown once at creation and not recoverable. See D-029 for the full hosted MCP authentication architecture.

### In transit and in request memory

When you click Deliberate on the web app, or when an MCP client (e.g., Claude.ai connected via hosted MCP) sends a tool call:

1. Server receives the request.
   - Web app: authenticated by Clerk session cookie.
   - MCP: authenticated by `Authorization: Bearer vada_...` header → SHA-256 hashed → looked up in `api_keys` → user resolved.
2. Server reads the encrypted provider key row(s) needed for the request from `user_provider_keys` by `clerkId`.
3. Server decrypts the key(s) in the request handler using `MASTER_ENCRYPTION_KEY` and AAD of the user's `clerkId`. Decryption fails loud if AAD doesn't match.
4. Provider SDK is instantiated with the plaintext key in memory. LLM call(s) happen.
5. Plaintext key leaves scope. The route handler returns. GC collects.

The plaintext key is **never**:
- Logged (structured or unstructured)
- Returned in any response body or error payload
- Written to a database column, cache, or temporary storage
- Included in error tracking payloads

### Other paths

- **Probe** (validate a key at save time before storing it server-side) — direct browser → provider call via `dangerouslyAllowBrowser: true`. Lives in `@atta/identity`'s `probeProviderKey`. Used by the model picker dialog and reviewer config modal to confirm a typed key is responsive before persisting it server-side.
- **Ollama discovery** — direct browser → `localhost:11434/api/tags`. Lives in `@atta/identity`'s `fetchInstalledOllamaModels`. Local Ollama auth is whatever the user's local Ollama setup uses; Vāda doesn't see those keys.

### `@atta/identity` package — what survived

The `@atta/identity` package is preserved and still mounted in production via `IdentityProvider` in both `apps/vada-ai/web/src/app/layout.tsx` and `apps/atta-ai/web/src/app/layout.tsx`. Its surviving role:

- `probeProviderKey` — pre-save key validation (browser-direct provider ping)
- `fetchInstalledOllamaModels` — Ollama discovery (browser-direct local request)
- `useIdentity` hook — used by `MigrationPrompt`, the judge benchmark hook, the shared model picker
- `MigrationPrompt` — one-time UX surface for users with pre-reversal IndexedDB-stored keys, prompting them to migrate

What the package no longer does: hold canonical provider keys, store keys at rest in IndexedDB, gate deliberation runs on a passkey unlock.

---

## Trust model — explicit accounting

This is a **deliberate trust escalation** compared to the pre-May-4 architecture. You should know what changed:

1. **Vāda's server holds an encrypted copy of your provider keys it can decrypt.** Pre-May-4, the server never had a copy at rest. Today it does. This is the cost of supporting hosted MCP — there is no other way for an MCP client running on a separate machine to make provider calls on your behalf.

2. **The encryption is real, but operators control the master key.** Master key lives in `MASTER_ENCRYPTION_KEY` on Vercel. AAD-binding to `clerkId` prevents row swaps. KMS migration would harden this further; that's V2 work.

3. **Decryption only happens inside request handlers.** No cron jobs decrypt. No analytics decrypt. The only code paths that decrypt are: `/api/deliberation/[id]/workflow/run` (web app) and `/api/mcp` (hosted MCP). Both decrypt only the keys needed for the specific request.

4. **What this means for your threat model:**
   - A Vāda operator with database access AND `MASTER_ENCRYPTION_KEY` access can decrypt your keys. Two-key compromise required.
   - A Vāda compromise during a request window exposes any keys decrypted in that handler's memory. Same as before for in-flight requests, with the added detail that this is now a category we ship intentionally rather than a known wart.
   - Subpoena reaching Vāda for stored data CAN compel decryption; pre-May-4 there was nothing at rest to compel. This is honest, not a dealbreaker.
   - `MigrationPrompt` is shipped for users with pre-May-4 IndexedDB keys; once migrated, the IndexedDB copy is removed.

---

## What Vāda stores in addition to encrypted keys

- Your deliberation questions
- Round transcripts (each agent's turns)
- Conclusions (recommendation, key condition, unresolved points)
- Terminal state per deliberation (Clean / Revised / Unconverged)
- User account metadata via Clerk (Clerk ID, email, etc.)
- Model assignments per agent role (in localStorage; no longer DB-backed per D-027)
- Vāda API keys for hosted MCP — SHA-256 hashed (`api_keys` table)
- Session logs from hosted MCP invocations (`mcp_sessions` table)

---

## Cross-device behavior

Because keys are now stored server-side, switching devices is transparent — your keys follow your account. This is a behavior change from the pre-May-4 model, where each device had its own IndexedDB copy.

- **First-time on a new device:** sign in. Your keys are already there.
- **Lost device:** keys remain in Vāda's database, available from any other signed-in device.
- **Key rotation:** rotate at the provider, update in Vāda Settings → API Keys. Vāda has no visibility into upstream rotation.

---

## How to verify these claims yourself

- **Hosted MCP route:** `apps/vada-ai/web/src/app/api/mcp/route.ts` — bearer auth + provider key decryption + tool dispatch in one file.
- **Bearer validation:** `packages/auth/src/api-key-auth.ts`'s `verifyApiKeyBearer` — SHA-256 hash + DB lookup.
- **API key generation:** `packages/crypto/src/api-keys.ts`'s `generateApiKey` — random base64url + SHA-256 hash.
- **Provider key envelope encryption:** `packages/crypto/` — AES-256-GCM with AAD = `clerkId`.
- **DB schema:** `packages/db/src/schema/keys.ts` — `apiKeys`, `userProviderKeys`, `mcpSessions` table definitions.
- **Web app deliberation route:** `apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts` — note that the route no longer accepts `apiKey` in the body; it reads encrypted keys from DB and decrypts inside the handler.
- **Network tab:** during a deliberation, the browser POSTs only the question and configuration to Vāda. The provider call happens server-side.

---

## Where this design wants to go

Future hardening, captured for completeness:

- **KMS migration (V2):** move the master key from `MASTER_ENCRYPTION_KEY` env var to a KMS-managed key. The `kms_key_id` column is reserved for this — per-row migration without breaking existing ciphertexts.
- **Audit log for key access events:** record per-decryption events (which clerkId, which provider, which route) for security audit. Retention policy TBD.
- **Per-key tool scoping:** restrict an individual `api_keys` row to specific tools (e.g., a key authorized for `vada__consult` but not `vada__deliberate`). Useful for embedded integrations.
- **Hosted MCP rate limiting:** per-user / per-key invocation caps. Pricing-tier dependent.

These are V2 work, not V1 commitments.

---

## Related documents

- `vada-decisions.md` — D-028 (single-source-keys reversal), D-029 (hosted MCP architecture), D-030 (shared `@atta/ui/account` + ecosystem-shared schemas)
- `mcp-architecture.md` — full hosted MCP architecture spec
- `vada-byok-gap-report.md` — historical gap analysis from April 30; mostly superseded by D-028
- `.claude/skills/auth/SKILL.md` — Clerk auth model
- `.claude/skills/database/SKILL.md` — Drizzle patterns + ecosystem-shared tables
- `.claude/skills/vada-mcp-server/SKILL.md` — MCP server (both surfaces) implementation guide
