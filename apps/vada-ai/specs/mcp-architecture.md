# Vāda MCP Architecture — Hosted Target

**Status:** Target architecture. Implementation pending.
**Owner:** Vāda
**Last updated:** May 2026

---

## Purpose

This document is the engineering source of truth for Vāda's hosted MCP server. It describes how the server should be built, how users authenticate, how provider keys are managed, and how the two tools work end-to-end.

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

**Storage:** keys are stored hashed in the database using bcrypt. The plaintext key is shown to the user exactly once at creation and cannot be recovered afterward.

**Revocation:** users can revoke individual keys from Settings → MCP at any time. A revoked key is rejected immediately on the next request.

**Multiple keys:** users may create multiple keys (e.g., one per client, one per environment). Each key is independently revocable.

### Why API keys, not OAuth

MCP OAuth support across clients is inconsistent as of mid-2026. Some clients implement the full OAuth device flow; others support only static tokens. API keys work with every MCP client that supports hosted servers — they are a Bearer token in a header, nothing else required on the client side.

OAuth adds meaningful complexity (authorization server, token exchange, refresh) and buys little in practice when clients cannot reliably use it. This decision should be reconsidered for V2 once the MCP ecosystem matures.

---

## Provider key management (BYOK)

### The trust model

The hosted MCP server requires a fundamentally different key model than the web app.

The web app uses **browser-only BYOK**: keys are encrypted with a passkey-derived key and stored in IndexedDB on the user's device. They are never stored at rest on Vāda's servers. When a deliberation runs, the browser sends the key in the request body (transit-only exposure). Server cannot decrypt keys it has never seen.

The hosted MCP server cannot use that model. An MCP client (e.g., Claude Desktop on a different machine) has no access to the user's browser IndexedDB and no passkey context. The server must hold a copy of the provider key that it can decrypt at request time, without the user being present.

This is a **deliberate trust escalation**. Users must explicitly opt in to hosted key storage. The web app BYOK path remains available for users who prefer the higher-privacy model.

### Storage schema

Table: `user_provider_keys`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Primary key |
| `user_id` | text | Clerk user ID |
| `provider` | text | `anthropic`, `google`, `openai`, `xai` |
| `key_ciphertext` | text | Encrypted key material |
| `key_iv` | text | IV / nonce used for encryption |
| `kms_key_id` | text | Reference to the KMS key used for envelope encryption |
| `created_at` | timestamp | When the key was first stored |
| `updated_at` | timestamp | When the key was last rotated |

One row per provider per user. Updating a key overwrites the row.

**Envelope encryption:** key material is encrypted with a data key that is itself encrypted by a KMS-managed master key. The `key_ciphertext` column holds the encrypted provider key; the data key is derived or wrapped via KMS. KMS provider is TBD (candidates: AWS KMS, GCP Cloud KMS, HashiCorp Vault).

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

1. MCP client sends an HTTP POST to `https://vada.attalabs.dev/api/mcp` with JSON-RPC body and `Authorization: Bearer <vada_pk_...>` header.
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

## What this replaces / supplements

The hosted server **supplements** the local stdio server; it does not replace it. Users who prefer full local control, zero network dependency, or the web app BYOK model can continue using the stdio server.

The hosted server is the path for users who:
- Want plug-and-play MCP without local setup
- Are on a machine where running a Node process is inconvenient
- Want deliberation history synced to their Vāda account regardless of which MCP client they use
- Prefer centralized key management over per-machine env var configuration

---

## Implementation phases

**Phase 1 — Foundation**
- MCP route handler at `apps/vada-ai/web/src/app/api/mcp/route.ts`
- Streamable HTTP transport (POST + SSE)
- Request parsing and JSON-RPC dispatch

**Phase 2 — Authentication**
- `vada_api_keys` DB table (key hash, user ID, label, revoked flag, timestamps)
- Key generation UI in Settings → MCP
- Bearer token validation middleware

**Phase 3 — Provider key storage**
- `user_provider_keys` DB table
- KMS integration (provider selection TBD)
- Key save/update/delete UI in Settings → API Keys (Hosted MCP)

**Phase 4 — Tool execution**
- Wire `vada__consult` and `vada__deliberate` to the hosted handler
- Decryption → provider SDK instantiation → tool execution
- Session logging to existing `sessions` table

**Phase 5 — Session URLs**
- Fix `vada.ai` hardcode bug in stdio server (separate PR)
- Confirm production domain for hosted server session URLs

**Phase 6 — Hardening**
- Rate limiting (limits TBD)
- KMS unavailability handling and retries
- Error tracking integration (ensure provider keys are scrubbed from payloads)
- Audit log for key access events (retention policy TBD)

---

## Open questions

1. **KMS provider:** AWS KMS, GCP Cloud KMS, or HashiCorp Vault? Decision gates Phase 3. Needs to account for where Vercel functions run and latency budget for key decryption.

2. **Rate limits:** what are the per-key and per-user limits for tool invocations? Limits affect product positioning (free tier, paid tier) and are TBD pending pricing decisions.

3. **Per-key scoping:** should individual API keys be scopeable to specific tools only (e.g., a key that can only call `vada__consult` but not `vada__deliberate`)? Useful for embedded integrations. Not designed yet.

4. **Audit log retention:** how long should per-request audit log entries be kept? Regulatory considerations TBD.

5. **API key character count and format:** `vada_pk_` prefix is confirmed. Exact random segment length and alphabet (URL-safe base64? hex? alphanumeric?) are TBD.

6. **Key rotation policy:** no automatic rotation is planned yet. Should there be a recommended rotation cadence, or expiry-by-default behavior? TBD.

7. **Production domain:** hosted server currently targets `vada.attalabs.dev`. If/when the product moves to `vada.ai`, session URLs and endpoint documentation will need updating. Confirm before public launch.

8. **Domain expert availability:** the `domain_expert` reviewer role in `vada__consult` is currently feature-flagged. Whether it is available on the hosted server by default, or gated by plan, is TBD.
