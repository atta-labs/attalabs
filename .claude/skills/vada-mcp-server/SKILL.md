---
name: vada-mcp-server
description: Vāda MCP server — dual-mode Claude integration and deliberation tools
---

# `@vada/mcp-server` — MCP Server

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
    ├── consult.ts          # vada__consult — Brokered mode; builds inline DeliberationSpec
    └── deliberate.ts       # vada__deliberate — Autonomous mode; uses lookupSpec + compileSpec
```

---

## Tools

### `vada__consult` — Brokered Mode

Caller Claude selects reviewers by role (`strategist`, `critic`, `devils_advocate`, `domain_expert`), provides a question with context, and each reviewer responds independently with no cross-visibility. No rounds, no synthesis, no audit.

`consult.ts` builds an inline `DeliberationSpec` at call time from the reviewer specs. It does NOT use `spec-registry.ts`. It calls `compileSpec()` directly on the constructed spec.

Key behaviors:
- Validates input with Zod (structured shape with `context` field, or legacy shape with `brief`)
- Composes the question from `context + question + current_leaning + stakes`
- Builds `reviewers[]` entries with per-reviewer `notes` appended to message template if provided
- Passes `classifier: { mode: 'skip' }` for all agents (single-shot, no classifier overhead)
- Logs the session to Postgres via `session-logger.ts`

Agent source: agents are imported from `@vada/agents` (`apps/vada-ai/agents/`). The `reviewerProfiles` map in `consult.ts` maps role name strings to agent definitions.

### `vada__deliberate` — Autonomous Mode

Caller provides a question and a team name. The server looks up the named spec and runs a full autonomous deliberation (rounds + synthesis + audit + revision).

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
- Brokered mode concepts: **vada-brokered** skill
