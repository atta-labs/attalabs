> **Historical note:** This plan was implemented in Phase 6. The architecture it describes was subsequently refactored in Phase 7.2 (YAML refactor). See `ROADMAP.md` for current state and `specs/yaml-schema-reference.md` for the current architecture. Read below for historical context only.

# 06 — Implementation Plan (V1 Status + Remaining Work)

Status: retired

## What this document is

A status report on Brokered V1 implementation plus the remaining work required before Brokered can ship as a polished product.

**Superseded:** The original doc 06 described a 7-commit plan using direct `Promise.allSettled` dispatch, with reviewer personas, partial failure handling, and tool description as discrete commits. That plan assumed Brokered would bypass `@atta/engine`. The actual architecture goes through the engine via `BrokeredWorkflow` (see doc 01). Most of that plan's infrastructure concerns are now solved by the engine + adapter.

This document reflects what's actually built and what's left.

---

## V1 status

### What's built (Phase 4 complete)

**Engine support for Brokered flows:**
- `BrokeredWorkflow` type in `@atta/engine/types.ts`
- `compileBrokered` produces sequential Plans: `__start__ → reviewer-0 → reviewer-1 → ... → reviewer-N-1`
- Validation: 2-5 agents, parallel must be false in V1
- `LangGraphAdapter.buildSuccessfulConclusion` handles Brokered plans (no terminal synthesizer, content assembled from reviewer outputs)
- Live integration test `verify-brokered-port.ts` passes

**Vāda team config:**
- `brokeredTrio` team in `@vada/teams`: Strategist + Critic + Devil's Advocate
- Uses `BrokeredWorkflow` with messageTemplate

**MCP tool:**
- `vada__consult` wired to `BrokeredWorkflow`
- Accepts `brief` and `reviewers[]`
- Returns per-reviewer `responses[]`
- Session persistence to Postgres via `@atta/db`

**Verified end-to-end:**
- Live test: 3 reviewers, CLEAN terminal state, $0.06 per run
- Session recorded in DB
- Transcript contains reviewer outputs in order

### What's left for V1 polish (Phase 6)

The engine/adapter/team/tool plumbing works. What remains is the product layer — making Brokered a polished tool that Caller Claude can use well.

---

## Remaining V1 work

### 1. Tool description teaching Caller Claude how to use Brokered

**Current state:** `vada__consult` has a minimal tool description. Caller Claude may not know when to invoke it, how to write briefs, or what to expect back.

**Required:** Expand the tool description to ~1200 words covering:
- When to invoke (explicit triggers, recognized triggers)
- When NOT to invoke (counter-triggers)
- The reviewer roster and each persona's role
- How to write briefs (context, question, current leaning, stakes, per-reviewer notes)
- Reviewer selection guidance
- What to expect back (structured responses per reviewer)
- How to synthesize responses for the user
- How to handle failures

See doc 02 for the full tool description text.

**File:** `apps/vada-ai/mcp-server/src/tools/consult.ts` — update the `description` field in the tool registration.

**Effort:** Small. Copy content from doc 02 into the tool description block.

---

### 2. Reviewer persona system prompts

**Current state:** `@vada/agents` contains Strategist, Critic, Devil's Advocate system prompts from prior work. These were designed for Crucible's multi-round debate. Brokered is single-shot advisory — the prompts may need tuning.

**Required:** Validate that the current system prompts produce sharp Brokered output. Specifically check:
- Do reviewers hedge less when responding in Brokered context (no other reviewers to react to)?
- Do required output sections (Key Points / Risks / Recommendation) come through cleanly?
- Are forbidden phrases actually absent from output?

**Process:** Run 5-10 test briefs through `vada__consult`, evaluate output quality against criteria in doc 03. If prompts need tuning, update agent definitions in `apps/vada-ai/agents/src/`.

**Effort:** Evaluation is a few hours. Prompt tuning (if needed) is a few hours more. Can be combined with item 5 (experiments) as a single R&D cycle.

**File:** `apps/vada-ai/agents/src/{strategist,critic,devils-advocate}.ts`

---

### 3. Input schema with strict validation

**Current state:** `vada__consult` accepts `brief` and `reviewers[]`. Validation shape TBD against current implementation.

**Required per doc 02:**
- `context`: string, min 50 chars
- `question`: string, min 10 chars
- `reviewers`: enum array, 2-5 items, distinct roles
- `current_leaning`: optional, strongly encouraged
- `stakes`: optional, strongly encouraged
- `notes_per_reviewer`: optional per-reviewer guidance
- `session_title`: optional, for dashboard display

**On validation failure:** Return structured error with specific field hints, not generic error.

**File:** `apps/vada-ai/mcp-server/src/tools/consult.ts` — add Zod validation schema.

**Effort:** Small. Single file change.

---

### 4. Session persistence schema additions

**Current state:** `mcp_sessions` table captures basic session info (user_id, tool_name, transcript, cost_cents, duration_ms, terminal_state, created_at).

**Required per doc 07 (UI spec):**
- `session_title` column for dashboard display
- `context`, `current_leaning`, `stakes` columns (extracted from brief)
- `origin` column (claude-desktop / cursor / claude-code / claude-ai / other)
- `is_shared` boolean
- `share_token` for public share URLs

**Origin detection:** MCP client sends `clientInfo` in the handshake. Capture at server init, map to origin string, pass to session writes.

**File:** `apps/vada-ai/db/src/schema/mcp-sessions.ts` (migration) + tool handler updates to populate new columns.

**Effort:** Medium. DB migration + schema update + handler updates. Maybe half a day.

---

### 5. Domain Expert persona behind feature flag

**Current state:** Not built.

**Required:** Add Domain Expert agent to `@vada/agents`. Parameterized system prompt (requires `domain` parameter). Add a second team config (e.g., `brokeredQuartet`) that includes Domain Expert. Feature flag controls availability.

**File:** `apps/vada-ai/agents/src/domain-expert.ts` (new) + `apps/vada-ai/teams/src/teams/brokered-quartet.ts` (new) + flag check in validation.

**Effort:** Small. Following the existing agent + team patterns.

---

### 6. Loud partial failure handling

**Current state:** Plan execution is all-or-nothing. If one reviewer fails, the whole plan fails.

**Required:** When parallel execution lands (Phase 4.5), partial failure becomes possible and needs explicit handling:
- Successful reviewers' responses still return
- Failed reviewers marked with status + error message
- `status: 'partial'` vs `'complete'` vs `'failed'` in response

**Dependency:** Requires parallel execution first.

**Effort:** Part of Phase 4.5. Tracked there.

---

### 7. Dashboard consumption of new data

**Current state:** Dashboard read-only, reads from `mcp_sessions`.

**Required:** Once item 4 adds new columns, dashboard reads and displays them. See doc 07 for full UI spec.

**File:** `apps/vada-ai/web/src/app/(main)/brokered/consultations/` components.

**Effort:** Deferred to doc 07 implementation work. Not part of V1 MCP-side work.

---

## V1 shipping criteria

Brokered V1 ships when:

- ✅ Engine supports BrokeredWorkflow (Phase 4 complete)
- ✅ MCP tool `vada__consult` works end-to-end (Phase 4 complete)
- ⏳ Tool description teaches Caller Claude how to use it well (item 1)
- ⏳ Reviewer personas validated for single-shot output (item 2)
- ⏳ Input validation returns structured errors (item 3)
- ⏳ Session persistence captures rich metadata (item 4)
- ⏳ Domain Expert available behind flag (item 5)

Not required for V1:
- Parallel execution (Phase 4.5)
- Partial failure handling (tied to parallel)
- Dashboard feature parity with doc 07 (own workstream)
- Web UI integration (deferred until DB schema supports Brokered state)

---

## Suggested commit sequence for remaining items

**Commit 1: Expand tool description.** Copy doc 02's tool description into `vada__consult`. Small, high-impact.

**Commit 2: Add Zod input validation.** Structured errors on validation failure. Clean field-by-field.

**Commit 3: DB schema migration.** Add `session_title`, `context`, `current_leaning`, `stakes`, `origin`, `is_shared`, `share_token` to `mcp_sessions`. Migration commit.

**Commit 4: Tool handler populates new columns.** Read from brief, write to session. MCP origin detection.

**Commit 5: Domain Expert agent + brokeredQuartet team.** Add behind feature flag.

**Commit 6: Prompt validation pass.** Run sample briefs, evaluate quality, tune prompts if needed. Document findings in a short note.

**Commit 7: Final smoke test.** Run verify-brokered-port.ts against all changes. Run a real `vada__consult` call from Claude Desktop. Verify session appears in dashboard.

Typecheck + verify scripts between every commit. Each commit self-contained and reviewable.

**Estimated total effort:** 1-2 days depending on prompt validation depth.

---

## What this replaces

The original doc 06 described:
- 7 commits centered on building parallel dispatch from scratch
- Persona registry, tool schema, dispatch parallel handler, session persistence, tool description, feature flag, smoke tests

Phase 4 made most of that moot:
- The engine handles dispatch (via `compileBrokered` + adapter)
- Session persistence works (via `@atta/db`)
- Team config system already existed
- Parallel is deferred to Phase 4.5

What survived from the original plan and moved forward:
- Tool description expansion (item 1)
- Input validation (item 3)
- Domain Expert feature flag (item 5)
- Session persistence enrichment (item 4)

The original plan was right about what the product needs; it was wrong about the implementation path. The engine-based approach is cleaner and requires less new code.
