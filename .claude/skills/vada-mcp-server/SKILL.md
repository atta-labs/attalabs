---
name: vada-mcp-server
description: Vāda MCP server — two surfaces: local stdio (current) and hosted HTTP (target). Both expose vada__consult and vada__deliberate tools routed to YAML catalog specs. Load when implementing MCP tools, adding catalog specs, or building/debugging either surface.
paths:
  - "apps/vada-ai/web/mcp/**"
  - "apps/vada-ai/mcp-server/**"
---

# `@vada/mcp-server` — MCP Server

## Two surfaces

Vāda's MCP server exists as two distinct surfaces that share the same tool surface — the same two tools (`vada__consult`, `vada__deliberate`) routing to the same YAML catalog — but differ in transport, authentication, and key management. The local stdio server is the current implementation; the hosted HTTP server is the documented target architecture, not yet built.

1. **Local stdio server (current implementation — see below)**
   - Runs on user's machine via `bun run`
   - User-supplied env vars for provider keys
   - Sessions log to user-configured `DATABASE_URL`
   - Used for: local dev, internal testing, users who want full local control

2. **Hosted HTTP server (live in production since May 4, 2026 — see `apps/vada-ai/specs/mcp-architecture.md`)**
   - Endpoint: `https://vada.attalabs.dev/api/mcp`
   - Transport: Streamable HTTP (POST + SSE response stream) per MCP spec
   - Auth: Vāda API key (bearer token in `Authorization` header)
   - BYOK: provider keys envelope-encrypted at rest (AES-256-GCM, env-var master key), decrypted per-request
   - Sessions log to Vāda's production DB
   - Used for: AI assistants (Claude.ai, Cursor, etc.), clients that can't run local processes
   - Status: shipped May 4, 2026 (PRs #9 + #10). Phases 1-4 of the original implementation plan are complete. Phase 5 (session URL fix) and Phase 6 (hardening: rate limiting, audit log) remain as future work.

Both surfaces expose the same two tools (`vada__consult`, `vada__deliberate`) and route to the same YAML catalog. Transport and key management differ; tool input/output shapes do not.

---

## Local stdio server (current implementation)

## Context

The MCP server exposes Vāda's deliberation capabilities as MCP tools. Any MCP-compatible client (Claude.ai, Claude Desktop, Cursor, etc.) can invoke these tools to run deliberations and consultations. YAML specs are auto-discovered from the catalog directory (`apps/vada-ai/yamls/`) using `readdirSync`; `validateAllSpecs()` runs at startup to fail fast on malformed YAMLs.

Location: `apps/vada-ai/mcp-server/src/`

---

## File Structure

```
apps/vada-ai/mcp-server/src/
├── server.ts               # MCP server setup; registers all tools
├── spec-registry.ts        # Dynamic YAML discovery; lookupSpec / listPublicSpecs / validateAllSpecs
├── session-logger.ts       # Writes session logs to Postgres via @atta/db
└── tools/
    ├── consult.ts          # vada__consult — builds inline BrokeredWorkflow spec from reviewer profiles
    └── deliberate.ts       # vada__deliberate — uses lookupSpec + compileSpec for catalog team specs
```

The hosted HTTP server lives at:

```
apps/vada-ai/web/src/app/api/mcp/route.ts   # Next.js Route Handler — Streamable HTTP transport, bearer auth, dispatches the same tools
```

It uses the same `consult.ts` / `deliberate.ts` tool implementations as the stdio server (composed differently for HTTP), and the route adds a bearer-validation step (`verifyApiKeyBearer` from `@atta/auth`) before dispatch and a provider-key decryption step (envelope decryption from `@atta/crypto`) inside the request handler.

---

## Tools

### `vada__consult` — Single-Shot Reviewer Chain

Caller selects reviewers by role (`strategist`, `critic`, `devils_advocate`, `domain_expert`), provides a question with context, and each reviewer responds independently with no cross-visibility. No rounds, no synthesis, no audit.

`consult.ts` builds an inline `DeliberationSpec` (of type `BrokeredWorkflow`) at call time from the reviewer specs. It does NOT use `spec-registry.ts`. It calls `compileSpec()` directly on the constructed spec.

Key behaviors:
- Validates input with Zod (structured shape with `context` field, or legacy shape with `brief`)
- Composes the question from `context + question + current_leaning + stakes`
- Builds `reviewers[]` entries with per-reviewer `notes` appended to message template if provided
- Passes `classifier: { mode: 'skip' }` for all agents (single-shot, no classifier overhead)
- Logs the session to Postgres via `session-logger.ts`

Agent source: agents are imported from `@vada/agents` (`apps/vada-ai/agents/`). The `reviewerProfiles` map in `consult.ts` maps role name strings to agent definitions.

### `vada__deliberate` — Rounds-Based Team Deliberation

Caller provides a question and a team name. The server looks up the named YAML spec from the catalog and runs a full deliberation (rounds + synthesis + audit + revision).

`deliberate.ts` calls `lookupSpec(teamName)` from `spec-registry.ts`, then `compileSpec(spec, question, model)`.

---

## Spec Registry

`spec-registry.ts` provides dynamic access to the YAML catalog. It delegates to `@atta/engine` for discovery — adding a YAML file to `apps/vada-ai/yamls/` is sufficient for it to be accessible.

```ts
import { lookupSpec, listPublicSpecs } from './spec-registry'

// Lookup by full spec ID (auto-discovered from filesystem)
const spec = lookupSpec('sparring')
const spec = lookupSpec('crucible')
const spec = lookupSpec('war-room')

// Lookup by short alias (explicit ALIASES map: a0, a1 only)
const spec = lookupSpec('a0')            // ALIASES['a0'] → 'a0-baseline'
const spec = lookupSpec('a1')            // ALIASES['a1'] → 'a1-baseline'

// All non-experimental specs (for tool description generation)
const specs = listPublicSpecs()
```

`validateAllSpecs()` runs at startup. A malformed YAML causes a startup crash — preferable to a runtime error mid-session.

Current catalog: `crucible`, `sparring`, `war-room`, `a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet`.

`brokered-trio` and `brokered-quartet` have no short-name alias — they are accessible by full id but not exposed as named options in `vada__deliberate`.

---

## Session Logger

`session-logger.ts` writes a row to the `sessions` table after every completed call. Both tools call `logSession()`. Fields logged: tool name, reviewer profile string, question, response, cost estimate, tokens, duration, session title, context, current leaning, stakes, origin, share token.

---

## Adding a New Public Spec

1. Create `apps/vada-ai/yamls/<name>.yaml` (no `-v1` suffix — see D-025)
2. The spec is **auto-discovered** — no changes to `spec-registry.ts` needed
3. If it should be addressable by a short alias from `vada__deliberate`, add to the `ALIASES` map:
   ```ts
   'my-alias': 'my-spec',
   ```
4. Write a verify script in `apps/vada-ai/web/scripts/verify-<name>-port.ts` following `verify-sparring-port.ts`:
   ```ts
   import { loadYamlFromCatalog, compileSpec } from '@atta/engine'
   const spec = loadYamlFromCatalog('my-spec')
   const plan = compileSpec(spec, question, model)
   const conclusion = await adapter.execute({ plan, customVars: {} })
   ```
5. Run the verify script to confirm it executes end-to-end

---

## Adding a New Reviewer Profile to `vada__consult`

1. Create agent in `apps/vada-ai/agents/src/agents/<profile>.ts`
2. Export from `apps/vada-ai/agents/src/index.ts`
3. Add to `reviewerProfiles` map in `consult.ts`
4. Add role enum value to `ReviewerSpecSchema` in `consult.ts`
5. Update `vada__consult` tool description

---

## Anti-patterns

- ❌ Importing from `@vada/teams` — that package is deleted
- ❌ Calling `compile()` directly — use `compileSpec(spec, question, model)` from `@atta/engine`
- ❌ Modifying YAML files to add tool names without verifying the tool exists in the adapter registry
- ❌ Manually adding to a SPECS object in `spec-registry.ts` — the registry is now dynamic; just create the YAML file
- ❌ Logging session before the deliberation completes — always log after `adapter.execute()` returns

---

## When you need more context

- YAML schema and authoring: **vada-yaml-authoring** skill + `apps/vada-ai/specs/yaml-schema-reference.md`
- Agent definitions: **atta-teams** skill (`apps/vada-ai/agents/src/`)
- Plan compilation: **atta-engine** skill
- LangGraph execution: **atta-adapter-langgraph** skill

---

## Hosted HTTP server (shipped — May 4, 2026)

Brief summary only. Full architecture detail lives in `apps/vada-ai/specs/mcp-architecture.md` — read that file for the complete spec; do not duplicate here.

**Authentication:**
- Vāda API key passed as `Authorization: Bearer <vada_...>` header
- Key generated in Settings → API Keys; stored as SHA-256 hex digest in `api_keys` table; revocable per-key
- Per-request validation via `verifyApiKeyBearer` in `packages/auth/src/api-key-auth.ts`; user identity (`clerkId`) resolved from the looked-up row

**Provider keys (BYOK):**
- User configures provider keys in Settings → API Keys
- Encrypted at rest in the `user_provider_keys` table with envelope encryption (AES-256-GCM, AAD-bound to `clerkId`, master key from `MASTER_ENCRYPTION_KEY` env var; `kms_key_id` column reserved for future KMS migration)
- Decrypted only inside the request handler for the duration of the LLM call — never logged, never persisted in plaintext
- Same store backs the web app's deliberate page (single canonical key store as of D-028; the prior browser-only IndexedDB BYOK was demoted from canonical role on May 4, 2026)

**Request lifecycle (brief):**
- Client POST → bearer token validation → provider key decryption → engine execution → SSE stream back → session log
- Session URL format: `https://vada.attalabs.dev/s/{sessionId}`

**Differences from local stdio:**
- No env vars (auth via API key)
- No local process (HTTP transport)
- Keys server-managed (vs env var — different trust model)
- Tool surface identical

**For full architecture detail:** `apps/vada-ai/specs/mcp-architecture.md`
