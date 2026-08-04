# Vāda MCP Architecture — Hosted Target

Status: ratified

**Status:** Shipped (May 4, 2026 — PRs #9 + #10). Phase 5 (stdio session URL fix) and Phase 6 (rate limiting, audit log retention, hardening) remain as future work.
**Owner:** Vāda
**Last updated:** May 8, 2026

---

## Purpose

This document is the engineering source of truth for Vāda's hosted MCP server as shipped. It describes how the server is built, how users authenticate, how provider keys are managed, and how the two tools work end-to-end. Phases 1-4 of the original implementation plan are complete; Phases 5 and 6 are future work, marked at the bottom of the document.

The hosted MCP server brings Vāda's deliberation capabilities to any MCP client — Claude Desktop, Cursor, IDEs, custom agents — without requiring users to run a local process or manage dependencies.

---

## Architecture overview

The hosted server is a single Next.js API route deployed to Vercel:

```
https://vada.attalabs.dev/api/mcp
```

Transport: **Streamable HTTP** per the MCP specification. A single URL handles both directions:

- Client → server: HTTP POST with JSON-RPC request body
- Server → client: SSE in the response body (streamed as the request completes)

This matches the current MCP spec's recommended transport for hosted servers and works without WebSocket infrastructure.

The route handler authenticates the request using a Vāda API key, decrypts the user's stored provider key(s) for the duration of the request, runs the requested tool, and streams the result back.

---

## Authentication

### Vāda API key

Users generate API keys in **Settings → MCP** in the Vāda web app. The key is used to authenticate MCP clients to the hosted server.

**Key format:** `vada_pk_` prefix followed by a random string. Exact character count and alphabet are TBD.

**Transmission:** every MCP request must include the header:

```
Authorization: Bearer <key>
```

**Storage:** keys are stored hashed in the `api_keys` database table using SHA-256 (hex digest). Lookup at request time computes SHA-256 of the bearer token and queries by the indexed `key_hash` column — no bcrypt cost per request. The plaintext key is shown to the user exactly once at creation and cannot be recovered afterward. Implemented in `packages/crypto/src/api-keys.ts` (`generateApiKey`, `hashApiKey`) and `packages/auth/src/api-key-auth.ts` (`verifyApiKeyBearer`).

**Revocation:** users can revoke individual keys from Settings → MCP at any time. A revoked key is rejected immediately on the next request.

**Multiple keys:** users may create multiple keys (e.g., one per client, one per environment). Each key is independently revocable.

### Why API keys, not OAuth

MCP OAuth support across clients is inconsistent as of mid-2026. Some clients implement the full OAuth device flow; others support only static tokens. API keys work with every MCP client that supports hosted servers — they are a Bearer token in a header, nothing else required on the client side.

OAuth adds meaningful complexity (authorization server, token exchange, refresh) and buys little in practice when clients cannot reliably use it. This decision should be reconsidered for V2 once the MCP ecosystem matures.

**Update May 7-8, 2026 — known issue with Claude.ai's connector broker.** Empirically, Claude.ai's web interface fails to connect to self-hosted MCP servers using bearer-token authentication, returning broker errors of the form `ofid_*` ("Couldn't reach the MCP server"). The same Vāda hosted MCP endpoint at `https://vada.attalabs.dev/api/mcp` works correctly via Claude Code CLI (`claude mcp add --transport http --header "Authorization: Bearer vada_..."`) but is rejected by Claude.ai's custom connector flow before reaching the server. By contrast, vendor-hosted MCP servers using OAuth (notably GitHub at `api.githubcopilot.com/mcp/`) connect successfully from Claude.ai. This appears to be a code-path difference inside Anthropic's broker, not an issue with Vāda's server. Workaround for Vāda users today: Claude Code CLI is the working integration path. Future hardening (Track E12 in `atta-plan.md`) may add OAuth as an alternative to bearer-token auth — same endpoint, different authentication mechanism — to recover Claude.ai web compatibility if it remains broken on Anthropic's side. Empirically confirmed May 7-8, 2026.

---

## Provider key management (BYOK)

### The trust model

The hosted MCP server requires a fundamentally different key model than the web app.

The web app uses **browser-only BYOK**: keys are encrypted with a passkey-derived key and stored in IndexedDB on the user's device. They are never stored at rest on Vāda's servers. When a deliberation runs, the browser sends the key in the request body (transit-only exposure). Server cannot decrypt keys it has never seen.

The hosted MCP server cannot use that model. An MCP client (e.g., Claude Desktop on a different machine) has no access to the user's browser IndexedDB and no passkey context. The server must hold a copy of the provider key that it can decrypt at request time, without the user being present.

This is a **deliberate trust escalation**. Users must explicitly opt in to hosted key storage. The web app BYOK path remains available for users who prefer the higher-privacy model.

### Storage schema

Table: `user_provider_keys` (defined in `packages/db/src/schema/keys.ts` as ecosystem-shared)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | text | Clerk user ID |
| `provider` | text | `anthropic`, `google`, `openai`, `xai` |
| `key_ciphertext` | text | Encrypted key material (envelope-encrypted) |
| `key_iv` | text | IV / nonce used for encryption |
| `kms_key_id` | text | Version/identity of the encryption key used; `'env:v1'` in current shipped state, reserved for future KMS migration |
| `created_at` | timestamp | When the key was first stored |
| `updated_at` | timestamp | When the key was last rotated |

One row per provider per user. Updating a key overwrites the row.

**Envelope encryption (current shipped state):** AES-256-GCM. The data key is derived from a master key held in the `MASTER_ENCRYPTION_KEY` environment variable on Vercel production (32 bytes, base64-encoded). Additional Authenticated Data (AAD) on each ciphertext binds it to the user's `clerkId`, so a row-swap between users is detectable on decrypt. The `kms_key_id` column carries a version identity (`'env:v1'`) so that a future migration to KMS-managed master keys can be performed per-row without breaking existing ciphertexts. Implemented in `packages/crypto/`. Note: this is NOT KMS-managed in V1 — KMS migration is deferred to V2.

### Decryption discipline

Provider keys are decrypted only inside the MCP request handler, for the minimum duration required to complete the LLM call:

1. Request is authenticated (Vāda API key validated).
2. Handler fetches the encrypted key row for the required provider.
3. Handler calls KMS to decrypt the data key (or performs envelope unwrap).
4. Provider SDK is instantiated with the plaintext key in memory.
5. LLM call completes.
6. Plaintext key leaves scope; GC collects it.

The plaintext key is **never**:
- Logged (structured or unstructured)
- Returned in any response body or error payload
- Written to a database column, cache, or temporary storage
- Included in error tracking payloads (Sentry or equivalent must be configured to scrub request bodies that may contain decrypted material)

### What this is not

Hosted BYOK is not the same as the web app BYOK model. In the web app, Vāda's server never sees the plaintext key at rest. In the hosted model, the server stores an encrypted copy it can decrypt. Users must understand and accept this difference before opting in.

The web app BYOK path (browser IndexedDB, passkey encryption) remains the default for users who run deliberations through the web UI. Hosted storage is opt-in, surfaced only in Settings → API Keys (Hosted MCP).

---

## Tool surface

The hosted server exposes the same two tools as the local stdio server. Tool names and input/output shapes are identical between the two surfaces. Provider key sourcing is the only behavioral difference.

### vada__consult

Single-shot reviewer chain. The caller specifies a question, context, and a set of reviewers (2–5, with distinct roles). Each reviewer responds independently in parallel or sequence. The tool returns all reviewer responses and a session URL.

**Reviewer roles:** `strategist`, `critic`, `devils_advocate`, `domain_expert` (domain expert availability TBD per hosting plan).

**Optional inputs:** `session_title`, `current_leaning`, `stakes`, `spec_id` (to route to a specific deliberation spec from the catalog).

**Returns:** array of reviewer responses, `session_id`, `session_url`, and cost breakdown.

### vada__deliberate

Rounds-based team deliberation. The caller specifies a question and optionally a team name. The server looks up the team's spec from the YAML catalog, runs the full deliberation (multiple agents, multiple rounds, synthesis), and returns the final conclusion.

**Optional inputs:** `team` (defaults to `sparring` if omitted).

**Returns:** synthesized conclusion text, structured output (when the spec defines an output schema), `session_id`, `session_url`, `terminal_state`, and cost breakdown.

---

## Request lifecycle

1. MCP client sends an HTTP POST to `https://vada.attalabs.dev/api/mcp` with JSON-RPC body and `Authorization: Bearer <vada_...>` header.
2. Route handler extracts the bearer token and looks up the hashed key in the database. If not found or revoked, returns `401 Unauthorized`.
3. Handler resolves the user ID from the key record.
4. Handler identifies the provider(s) required for the requested tool and team/spec combination.
5. Handler fetches the encrypted provider key row(s) from `user_provider_keys` for the resolved user. If a required provider key is missing, returns `400 Bad Request` with a message indicating which provider key needs to be configured.
6. Handler calls KMS to decrypt the data key and derives the plaintext provider key in memory.
7. Handler executes the tool (`vada__consult` or `vada__deliberate`), streaming partial results as SSE events in the response body.
8. On completion, the session is logged to the database (question, transcript, cost, session ID). Plaintext key is out of scope.
9. Handler returns the final JSON-RPC result. Session URL (`https://vada.attalabs.dev/s/{sessionId}`) is included in the response.

---

## Session URLs

Sessions created by the hosted MCP server are accessible at:

```
https://vada.attalabs.dev/s/{sessionId}
```

This is the same URL scheme as the web app sessions on the staging/dev domain. The `sessionId` is a UUID generated at the end of each tool invocation.

**Known bug in the local stdio server:** the current stdio server hardcodes `vada.ai` (production domain) as the session URL base. This will be fixed separately. The hosted server must use `vada.attalabs.dev` as shown above; the correct domain for production will be confirmed before launch.

---

## Failure modes

| Condition | HTTP status | Response |
|-----------|-------------|----------|
| Missing or invalid Vāda API key | `401 Unauthorized` | `{"error": "invalid_api_key"}` |
| Revoked Vāda API key | `401 Unauthorized` | `{"error": "revoked_api_key"}` |
| Required provider key not configured | `400 Bad Request` | `{"error": "missing_provider_key", "provider": "<name>"}` |
| Input validation failure (tool arguments) | `400 Bad Request` | `{"error": "validation_error", "details": [...]}` |
| Rate limit exceeded | `429 Too Many Requests` | `{"error": "rate_limit_exceeded"}` — limits TBD |
| Engine failure (deliberation error mid-run) | `500 Internal Server Error` | `{"error": "engine_error"}` — generic; internal details logged, not returned |
| Database unavailable | `503 Service Unavailable` | `{"error": "service_unavailable"}` |
| KMS unavailable | `503 Service Unavailable` | `{"error": "service_unavailable"}` — key cannot be decrypted, request cannot proceed |

All error responses are JSON. No raw stack traces or internal identifiers are returned to the client.

---

## Comparison with local stdio server

| Dimension | Hosted (`/api/mcp`) | Local stdio (`@vada/mcp-server`) |
|-----------|---------------------|----------------------------------|
| Transport | Streamable HTTP (POST + SSE) | stdio (JSON-RPC over stdin/stdout) |
| Installation | None — configured as remote MCP server URL | `npm install` / `npx`, local process |
| Authentication | Vāda API key (Bearer header) | None (runs as local user) |
| Provider keys | Encrypted at rest, decrypted per-request | Passed as env vars (`ANTHROPIC_API_KEY`, etc.) |
| Session URLs | `https://vada.attalabs.dev/s/{id}` | Hardcoded (bug — `vada.ai`) |
| Tool names | `vada__consult`, `vada__deliberate` | `vada__consult`, `vada__deliberate` |
| Input/output shape | Identical to stdio | Reference implementation |
| YAML catalog | Shared (same specs) | Shared (same specs) |
| Usage tracking | Server-side, per-user | Local only (DB if configured) |
| Availability | Requires Vāda account | Requires provider API keys in env |

---

## Known integration issues

### Claude.ai web custom connector — broker bug

**Status:** Active issue on Anthropic's side (May 7-8, 2026 confirmation). Workaround available via Claude Code CLI.

**Symptom:** Adding `https://vada.attalabs.dev/api/mcp` as a custom connector in Claude.ai (Settings → Connectors) fails with broker errors of the form `ofid_*` ("Couldn't reach the MCP server"). The failure occurs before Anthropic's broker forwards the request to Vāda's server — Vāda receives no traffic for these failed connections.

**Scope:** The same Vāda endpoint works correctly when added to Claude Code CLI:

```
claude mcp add --transport http vada https://vada.attalabs.dev/api/mcp \
  --header "Authorization: Bearer vada_<your_key>"
```

Cursor, ChatGPT custom connectors, and other MCP clients have not been comprehensively tested but appear to work via different connector flows.

**Cause (inferred):** Different code paths inside Anthropic's connector broker for self-hosted bearer-auth MCP servers vs vendor-hosted OAuth-using MCP servers. GitHub's hosted MCP at `api.githubcopilot.com/mcp/` connects successfully from Claude.ai web via OAuth, suggesting the OAuth path is healthier than the bearer-token path for self-hosted servers right now.

**Workaround for Vāda users today:** Use Claude Code CLI for hosted MCP integration. The local stdio server (`@vada/mcp-server`) remains available for users who prefer that path.

**Future work (Track E12 in `atta-plan.md`):** Add OAuth flow as an alternative to bearer-token authentication on the hosted MCP endpoint. Users who want to connect from Claude.ai web could opt into OAuth, which exercises a different code path on Anthropic's broker and is empirically more reliable. The bearer-token path remains the default for non-Claude.ai-web clients (which work today). This is hardening, not a v1 priority — gated on whether Claude.ai web adoption matters for Vāda users in practice.

---

## What this replaces / supplements

The hosted server **supplements** the local stdio server; it does not replace it. Users who prefer full local control, zero network dependency, or the web app BYOK model can continue using the stdio server.

The hosted server is the path for users who:
- Want plug-and-play MCP without local setup
- Are on a machine where running a Node process is inconvenient
- Want deliberation history synced to their Vāda account regardless of which MCP client they use
- Prefer centralized key management over per-machine env var configuration

---

## Implementation phases — current status

**Phases 1-4 are complete and live in production as of May 4, 2026.** Phases 5 and 6 remain as future work.

**Phase 1 — Foundation** ✅ Complete (PR #9, May 4, 2026)
- MCP route handler at `apps/vada-ai/web/src/app/api/mcp/route.ts`
- Streamable HTTP transport (POST + SSE)
- Request parsing and JSON-RPC dispatch

**Phase 2 — Authentication** ✅ Complete (PR #10, May 4, 2026)
- `api_keys` DB table (key hash, user ID, label, revoked flag, timestamps)
- Key generation UI in Settings → API Keys
- Bearer token validation via `verifyApiKeyBearer` in `packages/auth/src/api-key-auth.ts`

**Phase 3 — Provider key storage** ✅ Complete (PR #10, May 4, 2026)
- `user_provider_keys` DB table
- Envelope encryption via `MASTER_ENCRYPTION_KEY` env var; KMS migration deferred to V2 (`kms_key_id` field reserved)
- Key save/update/delete UI in Settings → API Keys

**Phase 4 — Tool execution** ✅ Complete (PR #10, May 4, 2026)
- Wire `vada__consult` and `vada__deliberate` to the hosted handler
- Decryption → provider SDK instantiation → tool execution
- Session logging to existing `sessions` table

**Phase 5 — Session URLs** (future work)
- Fix `vada.ai` hardcode bug in stdio server (separate PR)
- Confirm production domain for hosted server session URLs

**Phase 6 — Hardening** (future work)
- Rate limiting (limits TBD)
- KMS unavailability handling and retries
- Error tracking integration (ensure provider keys are scrubbed from payloads)
- Audit log for key access events (retention policy TBD)
- OAuth as an alternative to bearer-token authentication (Track E12 — addresses Claude.ai web broker bug; see "Known integration issues" above)

---

## Open questions

1. ~~**KMS provider:**~~ **Resolved (May 4, 2026):** No KMS in V1. Master key held in `MASTER_ENCRYPTION_KEY` env var on Vercel; envelope encryption with AAD-bound ciphertexts. KMS migration deferred to V2 — `kms_key_id` column on `user_provider_keys` carries a version identity (`'env:v1'` currently) to support per-row migration when KMS is adopted.

2. **Rate limits:** what are the per-key and per-user limits for tool invocations? Limits affect product positioning (free tier, paid tier) and are TBD pending pricing decisions.

3. **Per-key scoping:** should individual API keys be scopeable to specific tools only (e.g., a key that can only call `vada__consult` but not `vada__deliberate`)? Useful for embedded integrations. Not designed yet.

4. **Audit log retention:** how long should per-request audit log records be kept? Regulatory considerations TBD.

5. ~~**API key character format:**~~ **Resolved (May 4, 2026):** `vada_<base64url(32 random bytes)>` — the `vada_` prefix plus 32 bytes of base64url-encoded entropy is the format (note: the originally-planned `vada_pk_` prefix was not used; the shipped prefix is `vada_`). Implementation in `packages/crypto/src/api-keys.ts`'s `generateApiKey`. Per-product keys would mint analogous prefixes (`vitakka_`, etc.) via the `product` column on the `api_keys` table.

6. **Key rotation policy:** no automatic rotation is planned yet. Should there be a recommended rotation cadence, or expiry-by-default behavior? TBD.

7. ~~**Production domain:**~~ **Resolved (May 4, 2026):** `vada.attalabs.dev` is the production endpoint. Migration to `vada.ai` is a separate future question and would require its own coordinated update across this doc, the stdio server's session URL hardcode, and external integrations.

8. **Domain expert availability:** the `domain_expert` reviewer role in `vada__consult` is currently feature-flagged. Whether it is available on the hosted server by default, or gated by plan, is TBD.

9. **OAuth alternative for Claude.ai web compatibility:** Anthropic's connector broker bug (see "Known integration issues") prevents Claude.ai web users from connecting to hosted Vāda via bearer-token auth. Workaround is Claude Code CLI. Whether to invest in OAuth as an alternative authentication mechanism on the hosted endpoint is gated on (a) whether Anthropic fixes the broker bug, and (b) whether Claude.ai web adoption is a priority. Tracked as Track E12 in `atta-plan.md`. Empirically confirmed May 7-8, 2026.
