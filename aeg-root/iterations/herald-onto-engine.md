# Iteration: herald-onto-engine — June 2026

**Goal (execution, not product-why):** onboard **Herald onto `@atta/engine`** and **grow the shared engine to support multi-vendor structured output** — with Herald's **Bulk Audit** (N CVs × M JDs → one forensic report per pair) as the feature that proves it. The durable, multi-project work is the engine maturing (every current and future consumer benefits); Bulk Audit is the specific Herald feature riding on top.

**Center of gravity:** the engine. `@atta/engine` is a shared substrate (Vāda is one consumer, Herald becomes the second). This iteration makes the engine do multi-vendor structured output and makes Herald its second consumer. Bulk Audit is downstream of both.

**Repo:** attalabs (`daniboomerang/atta.ai`)   ·   **Team Leader:** Dani

> **Status is derived from the forge, not stored here.** This file is topology + the planner's durable rationale only. No PR numbers, no dates, no status. Issues are cut: task → Issue mapping below is fixed; live status is `gh pr list` / the Issue/PR state, never written here.

> **This is the first iteration run as a deliberate planning prototype** — every task carries a `Planner's rationale` block (model addition F1, now ratified — global D-042) and a suggested agent-class (F4). The sizing reflects a deep code dig (F2) that overturned a backlog claim (F5): multi-vendor structured output is a shared-engine change with every engine consumer (today, Vāda) in the blast radius, not "just UI." The full Planner's rationale lives in each task's Issue body; the per-task summaries below are retained for topology reading.

---

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|-----------|------------|----------------|
| 1 | Migrate Herald audit cell (`runSingleMatch`) onto `@atta/engine` | #88 | herald, engine | — | 3a |
| 2 | Endpoint unification → one `/api/audit` cell runner | #89 | herald | 1 | 4, 5 |
| 3a | Add multi-vendor structured output to the engine (Google + OpenAI-compat) | #87 | engine, vada, herald | — | 1 |
| 3b | Herald multi-vendor BYOK UI + audit model selector | #90 | herald | 1, 3a | — |
| 4 | N×M matrix UI (Bulk Audit accepts N CVs × M JDs, renders per-pair grid) | #91 | herald | 2 | 2, 5 |
| 5 | Polymorphic inputs (JD link/text; CV text/.md/.pdf/published profile) | #92 | herald | 2, 4 | 2, 4 |
| 6 | Per-key rate limit / cap on profile audits (D-033 abuse surface) | #93 | herald | 2 | — |

**Wave structure (max concurrency, derived from the edges):**
- **Wave 1 (serialized pair):** 1 and 3a both touch the engine's structured-output path → they conflict. Run **3a (#87) then 1 (#88)** (3a makes the engine multi-vendor-capable; 1 migrates Herald onto the already-capable engine, avoiding a second pass).
- **Wave 2 (after 1 + 3a merged — parallel):** 2 (#89, endpoint unification) and 3b (#90, BYOK UI) — different surfaces (routing vs settings), no conflict.
- **Wave 3 (after 2 merged — parallel):** 4 (#91, matrix UI) and 6 (#93, rate limit) — different surfaces (UI vs `/api/audit` middleware).
- **Wave 4 (after 4 merged):** 5 (#92, polymorphic inputs) — builds on the matrix.

Max concurrency: 2 (waves 2 and 3). The hard serial point is wave 1 (engine), which is correct — everything builds on the engine being ready.

**Dispatch order:** 3a (#87) is the wave-1 lead. Assigning it promotes it `backlog → todo`; a Developer then writes the brief just-in-time from its Planner's rationale (per the planner-brief contract), opens `task/herald-onto-engine/3a`, and opens the PR with the brief in the body.

---

## Task details (Planner's rationale lives in each Issue body — summaries here for topology)

### Task 1 — Migrate Herald audit cell (`runSingleMatch`) onto `@atta/engine` · Issue #88
**Project(s):** herald, engine · **Depends-on:** — · **Conflicts-with:** 3a

Herald's ONE AI call (skeptical-auditor match) moves from direct `generateText()` + TS-string prompt + manual parse/retry to a Flow YAML (`solo`, structured) via `loadFlow` + `compileFlow`. `extractSignals()` / SHA-256 cache / `buildPartialReport()` stay. Vāda app code NOT touched; the engine IS exercised (YAML machinery already in `@atta/engine` from the schema-2.0 refactor). **Trap:** do not use `loadYamlFromCatalog` (hardcodes `apps/vada-ai/yamls`) — use `loadFlow(readFileSync(...))`. Conflicts with 3a; 3a lands first. High-capability. Stop-and-escalate if the solo structured path is broken for Herald (engine gap, `severity:strategy`). *Full rationale: Issue #88.*

### Task 2 — Endpoint unification → one `/api/audit` cell runner · Issue #89
**Project(s):** herald · **Depends-on:** 1 · **Conflicts-with:** 4, 5

Fold `/api/match` + `/api/recruiter/batch` into one `/api/audit` whose unit of work is the engine-backed `runSingleMatch`; repoint `BulkAudit`. Separate from task 1 by verification story/failure mode/files; the "don't migrate twice" concern is handled by *ordering* (depends-on 1), not by welding routing into the migration. Mid-to-high. *Full rationale: Issue #89.*

### Task 3a — Add multi-vendor structured output to the engine · Issue #87
**Project(s):** engine, vada, herald · **Depends-on:** — · **Conflicts-with:** 1

The F5 finding. In `packages/adapter-langgraph/src/llm.ts`, structured output exists only on the Anthropic `sdkShape`; `google-genai` + `openai-compat` return `structured: undefined`. The engine must gain it for non-Anthropic vendors. **Shared file — every consumer (today Vāda) is in the blast radius and must be re-verified;** prefer additive vendor branches (re-verify only) over a shared-contract change (would need consumer edits → escalate). Must produce a per-vendor capability matrix. High-capability. Conflicts with 1; lands first. *Full rationale: Issue #87.*

### Task 3b — Herald multi-vendor BYOK UI + audit model selector · Issue #90
**Project(s):** herald · **Depends-on:** 1, 3a · **Conflicts-with:** —

Herald settings save keys for multiple vendors + a model picker for the audit, filtered to structured-output-capable models per 3a's matrix. Reuse `@atta/ui/account` `ProviderKeysSection`; don't rebuild. The genuinely-"mostly UI" half (only this, not 3a). Respects D-033 (whose key, orthogonal to which vendor). Mid. *Full rationale: Issue #90.*

### Task 4 — N×M matrix UI · Issue #91
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** 2, 5

The actual "bulk" feature: accept N CVs × M JDs, render a grid of one report per pair through `/api/audit`. The matrix doesn't exist yet (today `/bulk-audit` is single-pair-capable). Real grid state (async per-pair partial/loading/error). Mid-to-high. *Full rationale: Issue #91.*

### Task 5 — Polymorphic inputs · Issue #92
**Project(s):** herald · **Depends-on:** 2, 4 · **Conflicts-with:** 2, 4

JD as link|text; CV as text|.md|.pdf|published profile, normalized into the audit text, wired into the matrix + endpoint. `.pdf` extraction and link-fetch are the real work. **Trap:** link-fetch is outbound (SSRF/abuse — validate/scope); `.pdf` library choice; profile input resolves through Herald's own data. Mid. *Full rationale: Issue #92.*

### Task 6 — Per-key rate limit / cap on profile audits · Issue #93
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** —

Close the D-033 hole (strangers spend the owner's key budget). Per-key cap at the `/api/audit` layer (Upstash Redis backbone). **Operational dependency, not a code blocker:** Upstash creds expired — ship with graceful degradation; enforcement needs the creds. Parallelizes with wave 3. Mid. Stop-and-escalate `severity:product` if it needs a D-033 policy change. *Full rationale: Issue #93.*

---

## Open questions / notes for dispatch

- **Issues are cut** (#87–#93); the topology above is live. Assigning an Issue is the `backlog → todo` promotion.
- **3a-first within wave 1:** 3a (#87, engine gains multi-vendor structured output) before 1 (#88, Herald migrates onto it), so Herald targets a complete engine and avoids a second migration pass.
- **Per-vendor structured-output capability matrix** (from 3a / #87) is a real artifact this iteration must produce — it gates which models 3b's (#90) selector may offer. Not every vendor/model supports structured output.
- **This iteration prototyped F1–F6**, now ratified into the model (global D-042: `planner.md`, `brief-authoring`, `iterations/README.md` §4, the `planner-brief` contract, `state-machine.md`). The next test is execution: do the rationale blocks make the briefs sharper and steer agents around the documented traps?
