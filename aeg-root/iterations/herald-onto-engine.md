# Iteration: herald-onto-engine — June 2026

**Goal (execution, not product-why):** onboard **Herald onto `@atta/engine`** — express Herald's auditor as a **flow YAML the engine runs** (exactly as Vāda's agents are YAMLs the engine runs), then build **Bulk Audit** (N CVs × M JDs → one forensic report per pair) on top, and finally make the auditor a **tool-using YAML agent** (it gathers its own GitHub evidence). The durable, multi-project win is Herald stopping being special: one engine runs every product's agents, defined declaratively in YAML — including their tools.

**Center of gravity:** Herald-as-an-engine-consumer. `@atta/engine` is the shared substrate; Vāda is the first consumer, Herald becomes the second. **The engine is used as-is — not modified** (it already runs all 12 vendors as text, proven by `apps/vada-ai/yamls/brokered-quartet.yaml`, and already has the tool machinery Vāda's agents use). Bulk Audit and the tool-using auditor are downstream of the migration.

> **Re-scope note (June 12 — Brief Author dig, severity:strategy):** the original plan had a task **3a "add multi-vendor structured output to the engine."** The task-1 briefing dig **overturned its premise** and 3a was **dropped (#87 closed not-planned).** Findings: (1) the engine already runs any vendor in a YAML (text) today; (2) the only gap was the narrow `outputSchema` typed-object path on non-Anthropic vendors; (3) **Herald doesn't need it** — its auditor prompt already requests JSON-as-text and parses it, like Vāda. So Herald-onto-engine is **purely Herald-side, zero engine change, any vendor.** Structured-output-on-other-vendors is an optional *future* engine enhancement, backlogged, not here.

> **Task 7 added (June 12 — Principal intent):** "agents own their tools in the YAML; apps stop pre-fetching context." Task 7 makes the auditor a **tool-using** YAML agent (it calls a GitHub tool to gather evidence, retiring `extractSignals` as a pre-fetch). The engine's tool machinery already exists (Vāda's agents use `classifier`); task 7 consumes it. Sequenced last (depends on the migration; highest-vision/highest-risk).

**Repo:** attalabs (`daniboomerang/atta.ai`)   ·   **Team Leader:** Dani

> **Status is derived from the forge, not stored here.** This file is topology + the planner's durable rationale only. No PR numbers, no dates, no status. Issues are cut: task → Issue mapping below is fixed; live status is `gh pr list` / the Issue/PR state, never written here.

> **This was the first iteration run as a deliberate planning prototype** (F1–F6, global D-042). It is now also the first iteration where the **Brief Author dig caught a mis-scoped task and corrected the plan** (the conversational protocol + planner-brief contract working as designed): 3a's premise was wrong, surfaced at brief time as `severity:strategy`, the plan looped back one step, 3a was removed. The full Planner's rationale lives in each task's Issue body; the per-task summaries below are retained for topology reading.

---

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|-----------|------------|----------------|
| 1 | Herald auditor → `solo` YAML run by `@atta/engine` | #88 | herald, engine | — | — |
| 2 | Endpoint unification → one `/api/audit` cell runner | #89 | herald | 1 | 4, 5 |
| 3b | Herald multi-vendor BYOK UI + audit model selector | #90 | herald | 1 | — |
| 4 | N×M matrix UI (Bulk Audit accepts N CVs × M JDs, renders per-pair grid) | #91 | herald | 2 | 2, 5 |
| 5 | Polymorphic inputs (JD link/text; CV text/.md/.pdf/published profile) | #92 | herald | 2, 4 | 2, 4 |
| 6 | Per-key rate limit / cap on profile audits (D-033 abuse surface) | #93 | herald | 2 | — |
| 7 | Auditor agent gets a GitHub tool (signal-gathering moves into the YAML agent) | #102 | herald, engine | 1 | — |

*(Task 3a — "multi-vendor structured output in the engine" — removed; #87 closed not-planned. See the re-scope note above.)*

**Wave structure (max concurrency, derived from the edges):**
- **Wave 1 (lead, solo):** **1 (#88)** — Herald auditor onto the engine. No conflict now that 3a is gone; clean single lead. Everything builds on Herald running through the engine.
- **Wave 2 (after 1 merged — parallel):** 2 (#89, endpoint unification), 3b (#90, BYOK UI + model selector), and **7 (#102, tool-using auditor)** — three different surfaces (routing / settings / the auditor YAML's tool config), no conflict; all depend only on task 1. (7 may also be sequenced later by preference — it's the highest-risk; depends-on 1 is its only hard constraint.)
- **Wave 3 (after 2 merged — parallel):** 4 (#91, matrix UI) and 6 (#93, rate limit) — different surfaces (UI vs `/api/audit` middleware).
- **Wave 4 (after 4 merged):** 5 (#92, polymorphic inputs) — builds on the matrix.

Max concurrency: 3 (wave 2). The hard serial point is wave 1 (task 1), which is correct — everything builds on Herald being an engine consumer.

**Dispatch order:** 1 (#88) is the wave-1 lead. Assigning it promotes it `backlog → todo`; a Developer then writes the brief just-in-time from its Planner's rationale (per the planner-brief contract), opens `task/herald-onto-engine/1`, and opens the PR with the brief in the body.

---

## Task details (Planner's rationale lives in each Issue body — summaries here for topology)

### Task 1 — Herald auditor → `solo` YAML run by `@atta/engine` · Issue #88 · **wave-1 lead**
**Project(s):** herald, engine · **Depends-on:** — · **Conflicts-with:** —

Migrate Herald's **one auditor LLM call** from bespoke `generateText()` + TS-string prompt + manual parse onto the engine, by expressing the auditor as a **`solo` flow YAML** (`loadFlow` + `compileFlow`), exactly as Vāda runs its agents. **Only the LLM call moves.** `extractSignals()` (the GitHub fetch, `signals.ts`), the SHA-256 cache, and `buildPartialReport()` / the JSON parse **stay as Herald code** — the engine runs agents, not GitHub fetches. **Maximize what lives in the YAML:** the prompt (`SKEPTICAL_AUDITOR_PROMPT` moves *into* the YAML, deleted from `prompts.ts`), the model, and the message/output-instruction all live in `herald-auditor.yaml`; only `MATCH_REPORT_SCHEMA` stays in code as the shared parse contract (interpolated into the YAML prompt as a `{{schema}}` customVar). Vendor-agnostic: the YAML names the model, the engine already runs all 12 vendors as text, Herald's prompt already asks for JSON-as-text and parses it → **no engine change, any vendor.** Engine is *consumed*, not modified (Vāda not touched). **Traps:** don't use `loadYamlFromCatalog` (hardcodes `apps/vada-ai/yamls`) — use `loadFlow(readFileSync(...))`; don't add `outputSchema`/structured (prompt-instructed JSON, like today); keep signals/cache/parse AND the NO-FIT gate as Herald code. High-capability. **Stop-and-escalate `severity:strategy`** if running Herald through the engine requires *changing* `@atta/engine` (real engine gap → Vāda enters blast radius). *Full rationale: Issue #88.*

### Task 2 — Endpoint unification → one `/api/audit` cell runner · Issue #89
**Project(s):** herald · **Depends-on:** 1 · **Conflicts-with:** 4, 5

Fold `/api/match` + `/api/recruiter/batch` into one `/api/audit` whose unit of work is the engine-backed auditor (from task 1); repoint `BulkAudit`. Separate from task 1 by verification story/failure mode/files; the "don't migrate twice" concern is handled by *ordering* (depends-on 1), not by welding routing into the migration. Mid-to-high. *Full rationale: Issue #89.*

### Task 3b — Herald multi-vendor BYOK UI + audit model selector · Issue #90
**Project(s):** herald · **Depends-on:** 1 · **Conflicts-with:** —

Herald settings save keys for multiple vendors + a model picker for the audit. (Now depends on task 1 only — the old dependency on 3a is gone; vendor support is inherent in the engine, so the selector simply offers the vendors the user has keys for.) Reuse `@atta/ui/account` `ProviderKeysSection`; don't rebuild. Respects D-033 (whose key, orthogonal to which vendor). Mid. *Full rationale: Issue #90.*

### Task 4 — N×M matrix UI · Issue #91
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** 2, 5

The actual "bulk" feature: accept N CVs × M JDs, render a grid of one report per pair through `/api/audit`. The matrix doesn't exist yet (today `/bulk-audit` is single-pair-capable). Real grid state (async per-pair partial/loading/error). Mid-to-high. *Full rationale: Issue #91.*

### Task 5 — Polymorphic inputs · Issue #92
**Project(s):** herald · **Depends-on:** 2, 4 · **Conflicts-with:** 2, 4

JD as link|text; CV as text|.md|.pdf|published profile, normalized into the audit text, wired into the matrix + endpoint. `.pdf` extraction and link-fetch are the real work. **Trap:** link-fetch is outbound (SSRF/abuse — validate/scope); `.pdf` library choice; profile input resolves through Herald's own data. Mid. *Full rationale: Issue #92.*

### Task 6 — Per-key rate limit / cap on profile audits · Issue #93
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** —

Close the D-033 hole (strangers spend the owner's key budget). Per-key cap at the `/api/audit` layer (Upstash Redis backbone). **Operational dependency, not a code blocker:** Upstash creds expired — ship with graceful degradation; enforcement needs the creds. Parallelizes with wave 3. Mid. Stop-and-escalate `severity:product` if it needs a D-033 policy change. *Full rationale: Issue #93.*

### Task 7 — Auditor agent gets a GitHub tool · Issue #102 · **last (Phase 2)**
**Project(s):** herald, engine · **Depends-on:** 1 · **Conflicts-with:** —

Give the auditor agent a **GitHub tool defined in the YAML** so it gathers its own evidence, retiring `extractSignals` as a deterministic pre-fetch — the deeper "self-contained in the YAML" end state (Principal intent: agents own their tools; apps stop pre-fetching). The auditor YAML gains a `tools` entry + a tool-using classifier mode (`auto`/`always_tools`); the engine's existing tool machinery runs it. **The tool's implementation IS today's `extractSignals` logic — reuse it, don't rewrite the GitHub-walking.** The **NO-FIT gate stays Herald code** (giving the agent a tool never moves business-rule enforcement into the model). Preserve a timeout/budget (today's 3s becomes the tool budget); the no-GitHub case must still produce a valid audit. **depends-on 1** (must be a YAML agent first). High. **Stop-and-escalate `severity:strategy`** if it needs an engine/adapter change (not just consuming the tool machinery → Vāda blast radius), or if audit quality drops materially under the agentic-tool model (may stay pre-fetch). Separate from task 1 deliberately — a behavior redesign with its own verification story; folding it into the migration would break task 1's single-verification-story sizing. *Full rationale: Issue #102.*

---

## Open questions / notes for dispatch

- **Issues:** #88–#93 + #102 live (#87/3a closed not-planned). Assigning an Issue is the `backlog → todo` promotion.
- **No engine change planned in this iteration.** The engine is consumed as-is (including its tool machinery for task 7). If task 1 or task 7 finds a real engine gap, that's a `severity:strategy` escalation that would re-open engine-scope work (and put Vāda in the blast radius) — not assumed.
- **Structured-output-on-other-vendors** (the old 3a) is backlogged as an optional future engine enhancement (typed-object ergonomics), not required by Herald.
- **Task 1 → Task 7 is the Herald-on-engine arc:** task 1 makes the auditor a YAML agent (signals pre-fetched); task 7 makes it a *tool-using* YAML agent (signals self-gathered). Maximal "logic in the YAML, not code."
- **This iteration prototyped F1–F6** (global D-042) **and** the first Brief-Author-catches-mis-scoped-task correction (3a dropped at brief time). The model worked: the dig caught the stale premise before a wrong brief shipped.
