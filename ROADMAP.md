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
