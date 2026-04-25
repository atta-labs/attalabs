# Attā AI — Roadmap

Vāda is the active product. Phases below track its delivery arc from Mastra removal through public launch.

---

## Phase 1 — LangGraph Foundation ✅ COMPLETE

**Commits:** `2b140a9` → `5eff459`

- Added LangGraph route handler behind `VADA_USE_LANGGRAPH` flag
- Implemented `onNodeComplete` execution hook in `LangGraphAdapter`
- Moved `resolveModel` to `@atta/models`; inlined conclusion schema
- Removed Mastra fallback — LangGraph is sole deliberation path
- Deleted Mastra bench scripts, workflow, orchestrator, agents files
- Removed `@atta/orchestration` package
- Removed `@mastra/*` from `package.json`

---

## Phase 2 — Package Architecture ✅ COMPLETE

**Commits:** `5adf1e9` → `ffee750`

- Renamed `@atta/mcp-server` → `@vada/mcp-server`; `@atta/teams` → `@vada/teams`
- Consolidated engine agent configs into `@vada/agents`
- Extracted `Agent` type into `@atta/agents` package
- Enriched `@vada/agents` with display metadata (`VadaAgentDef`)
- Split display metadata into `@vada/agents-ui`; later re-merged after review
- Moved `@vada/agents`, `@vada/teams`, `@vada/mcp-server` into `apps/vada-ai/`
- Deleted orphaned `engine/prompts/` directory

---

## Phase 2.5 — Teams/Agents Cleanup ✅ COMPLETE

**Commits:** `bb42bef` → `cf4894d`

- Deleted `@vada/agents-ui` package (merged back into `@vada/agents`)
- Deleted empty `apps/vada-ai/mcp` scaffold
- Consolidated agent UI components into `components/agents/`
- Restored War Room team (`warRoom`) and wired `selectTeam()` in workflow route
- Updated three stale skill files (`atta-teams`, `atta-adapter-langgraph`, `atta-engine`)
- Created `vada-brokered` skill

---

## Phase 3 — Scope Investigation 🔍 NEXT

Audit `@atta/engine` and `packages/adapter-langgraph` against the current code before touching them.

- Read compiled Plan shapes against actual `types.ts`
- Confirm node ID scheme in engine matches adapter + mcp-server consumers
- Identify any dead code in `packages/engine/src/`
- Document findings before any changes

---

## Phase 4 — Engine Refactor

- Align `@atta/engine` types with current adapter usage
- Validate compiler test coverage (fixture tests per workflow kind)
- Ensure `validate.ts` covers all current validation rules
- No runtime dependencies may enter engine

---

## Phase 5 — Specs Update

- Rewrite `apps/vada-ai/web/CLAUDE.md` (Mastra → LangGraph reality)
- Update `apps/vada-ai/CLAUDE.md` (add brokered-deliberation and engine spec entries)
- Update READMEs for `apps/vada-ai/` and `apps/vada-ai/web/`
- Move `specs/engine/mastra-audit.md` → `specs/legacy/`

---

## Phase 6 — Brokered V1 (MCP)

Scope defined in `apps/vada-ai/specs/brokered-deliberation/`.

- `vada__consult` MCP tool — dispatches 2-N reviewers in parallel
- Reviewer profiles: Strategist, Critic, Devil's Advocate (+ Domain Expert behind flag)
- Session persistence to Postgres via `@atta/db`
- Partial failure handling
- `vada__deliberate` (Autonomous mode) — queued after Brokered
- `vada__list_teams`, `vada__get_session` — queued

---

## Phase 7.2 — YAML Spec Refactor ✅ COMPLETE

**Commits:** `50c1d89` → `8aa3ad4`, `7a2a715`

Replace all TypeScript deliberation flow definitions with YAML files; make the engine mode-agnostic with zero branches on workflow type.

**Phase A — Add YAML layer (non-breaking):**
- Created `apps/vada-ai/yamls/` with 7 specs: sparring, crucible, war-room, a0, a1, brokered-trio, brokered-quartet
- Added `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts` to `@atta/engine`
- Added `compileSpec(spec, question, model?) → Plan` and `specToTeam()` to engine public API
- Added `spec-registry.ts` to MCP server (startup fail-fast; `lookupSpec`, `listPublicSpecs`)
- Migrated `deliberate.ts` and web workflow route to use `compileSpec`
- Behavioral verification: 5 scripts passed (A0/A1, Brokered, Sparring, Crucible)

**Phase B — Delete TypeScript layer:**
- Deleted `apps/vada-ai/teams/` (`@vada/teams` package, 12 files, 325 lines)
- Deleted `teams-registry.ts`, `reviewer-profiles.ts` from MCP server
- Removed `compile()` from engine public exports; `workflowType` from Plan interface
- Removed adapter backward-compat code; removed legacy classifier name-substring hard rule
- Migrated `consult.ts` to build inline `DeliberationSpec` + call `compileSpec()`
- Re-ran 5 behavioral verifications — all passed
- Typecheck: 18/18, 0 errors

---

## Phase 7 — Pre-Launch Requirements

Required before public launch. Order TBD.

- **MOAT-A:** vada.ai dashboard — full transcript view, cost attribution, audit trail
- **MOAT-B:** One verticalized team + 100+ validated corpus questions, benchmarked vs A0/A1
- Both Brokered and Autonomous MCP tools shipping and tested
- Benchmark data showing measurable improvement over single-shot baselines

---

## Post-Launch Watch Metric

Autonomous mode usage share at 6 months:
- ≥ 20%: healthy
- 10–20%: investigate escalation UX, pricing, onboarding
- < 10%: thesis failure; reconsider positioning
