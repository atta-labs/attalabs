---
name: vada-mcp-server
description: Vāda MCP server — dual-mode Claude integration and deliberation tools
---

# `@vada/mcp-server` — MCP Server

## Context

The MCP server exposes Vāda's deliberation capabilities as MCP tools. Any MCP-compatible client (Claude.ai, Claude Desktop, Cursor, etc.) can invoke these tools to run deliberations and consultations. The server loads all YAML specs at startup and holds them in memory for the server lifetime.

Location: `apps/vada-ai/mcp-server/src/`

---

## File Structure

```
apps/vada-ai/mcp-server/src/
├── server.ts               # MCP server setup; registers all tools
├── spec-registry.ts        # Loads all 7 YAMLs at startup; lookupSpec / listPublicSpecs
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

`spec-registry.ts` is the authoritative map of all public deliberation specs.

```ts
import { lookupSpec, listPublicSpecs } from './spec-registry'

// Lookup by full spec ID
const spec = lookupSpec('sparring-v1')

// Lookup by short alias
const spec = lookupSpec('sparring')      // ALIASES['sparring'] → 'sparring-v1'
const spec = lookupSpec('crucible')      // → 'crucible-v1'
const spec = lookupSpec('war-room')      // → 'war-room-v1'
const spec = lookupSpec('a0')            // → 'a0-baseline-v1'
const spec = lookupSpec('a1')            // → 'a1-baseline-v1'

// All non-experimental specs (for tool description generation)
const specs = listPublicSpecs()
```

All 7 YAMLs are loaded at startup. A malformed YAML causes a startup crash — preferable to a runtime error mid-session.

SPECS loaded: `crucible-v1`, `sparring-v1`, `war-room-v1`, `a0-baseline-v1`, `a1-baseline-v1`, `brokered-trio-v1`, `brokered-quartet-v1`.

Note: `brokered-trio-v1` and `brokered-quartet-v1` are loaded but have no short-name alias — they are not exposed as named options in `vada__deliberate`. They exist for future use.

---

## Session Logger

`session-logger.ts` writes a row to the `sessions` table after every completed call. Both tools call `logSession()`. Fields logged: tool name, reviewer profile string, question, response, cost estimate, tokens, duration, session title, context, current leaning, stakes, origin, share token.

---

## Adding a New Public Spec

1. Create `apps/vada-ai/yamls/<name>-v1.yaml`
2. Add to the `SPECS` record in `spec-registry.ts`:
   ```ts
   'my-spec-v1': loadYaml('my-spec-v1.yaml'),
   ```
3. If it should be addressable by a short name from `vada__deliberate`, add an ALIAS:
   ```ts
   'my-spec': 'my-spec-v1',
   ```
4. Write a verify script in `apps/vada-ai/web/scripts/verify-<name>-port.ts` following the `verify-sparring-port.ts` pattern:
   ```ts
   const spec = loadSpec(readFileSync(join(process.cwd(), '../yamls/my-spec-v1.yaml'), 'utf-8'))
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
- ❌ Forgetting to add to `SPECS` in `spec-registry.ts` — new YAML files are not auto-discovered
- ❌ Logging session before the deliberation completes — always log after `adapter.execute()` returns

---

## When you need more context

- YAML schema and authoring: **vada-yaml-authoring** skill + `apps/vada-ai/specs/yaml-schema-reference.md`
- Agent definitions: **atta-teams** skill (`apps/vada-ai/agents/src/`)
- Plan compilation: **atta-engine** skill
- LangGraph execution: **atta-adapter-langgraph** skill
- Brokered mode concepts: **vada-brokered** skill
