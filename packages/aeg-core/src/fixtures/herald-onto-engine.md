# Iteration: herald-onto-engine — June 2026

**Goal (execution, not product-why):** onboard **Herald onto `@atta/engine`** — express Herald's auditor as a **flow YAML the engine runs** (exactly as Vāda's agents are YAMLs the engine runs), then build **Bulk Audit** (N CVs × M JDs → one forensic report per pair) on top, and finally make the auditor a **tool-using YAML agent** (it gathers its own GitHub evidence) — which requires first **building custom client-side tool execution into the shared engine.** The durable, multi-project win is Herald stopping being special: one engine runs every product's agents, defined declaratively in YAML — including their tools.

**Center of gravity:** Herald-as-an-engine-consumer, plus one genuine **shared-engine capability** (custom tool execution, task 7a). `@atta/engine` is the shared substrate; Vāda is the first consumer, Herald becomes the second. The migration (task 1) consumes the engine unchanged; the tool work (7a) **extends** it (Vāda in blast radius, additive). Bulk Audit and the tool-using auditor are downstream of the migration.

> **Re-scope note (June 12 — Brief Author dig, severity:strategy):** the original plan had a task **3a "add multi-vendor structured output to the engine."** The task-1 briefing dig **overturned its premise** and 3a was **dropped (#87 closed not-planned).** Findings: (1) the engine already runs any vendor in a YAML (text) today; (2) the only gap was the narrow `outputSchema` typed-object path on non-Anthropic vendors; (3) **Herald doesn't need it** — its auditor prompt already requests JSON-as-text and parses it, like Vāda. So the *migration* (task 1) is purely Herald-side, zero engine change, any vendor. Structured-output-on-other-vendors is an optional *future* engine enhancement, backlogged, not here.

> **Task 7 split into 7a + 7b (June 13 — Principal decision, readiness-gate catch):** the original task 7 ("auditor gets a GitHub tool") assumed the engine could already run **custom client-side tools.** The planning dig (`node-executor.ts` + `graph-state.ts`) **proved it cannot** — the adapter supports only **provider-native server tools** (the classifier *allocates* tools; the vendor executes them; there is no loop where the engine pauses, runs an app-supplied function, and feeds the result back). So "give Herald a tool" is two things: **7a — build custom client-side tool execution into `@atta/adapter-langgraph`** (shared engine, **Vāda in blast radius**, additive/opt-in), and **7b — Herald defines its GitHub tool in the YAML** (depends on 7a). Split by verification coupling: 7a is provable with a trivial throwaway tool; 7b proves it in production with the real GitHub tool. This was the planner's readiness gate working — it refused to plan 7 as a "small Herald task" once the dig showed it required shared-engine work.

**Repo:** attalabs (`daniboomerang/atta.ai`)   ·   **Team Leader:** Dani

> **Status is derived from the forge, not stored here.** This file is topology + the planner's durable rationale only. No PR numbers, no dates, no status. Issues are cut: task → Issue mapping below is fixed; live status is `gh pr list` / the Issue/PR state, never written here.

> **This tranche is a working demonstration of the model catching its own errors.** It was the first deliberate planning prototype (F1–F6, global D-042); then the **Brief Author dig caught a mis-scoped task** (3a dropped, June 12); then the **planner readiness gate caught a hidden shared-engine dependency** (task 7 split into 7a/7b, June 13). Twice, the dig overturned a premise before a wrong brief shipped. The full Planner's rationale lives in each task's Issue body; the per-task summaries below are for topology reading.

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
| 7a | Custom client-side tool execution in `@atta/engine` (shared) | #102 | engine, vada, herald | — | — |
| 7b | Herald auditor uses a GitHub tool defined in its YAML | #103 | herald | 1, 7a | — |

*(Task 3a — "multi-vendor structured output in the engine" — removed; #87 closed not-planned. Task 7 split into 7a/7b — see the split note above.)*

**Wave structure (max concurrency, derived from the edges):**
- **Wave 1 (lead):** **1 (#88)** — Herald auditor onto the engine. Clean single lead; everything Herald-side builds on it. **7a (#102) can also start in wave 1** — it's pure engine work (no `depends-on`), independent of the migration, so it may run in parallel with task 1 from the start. (Sequencing 7a early is attractive: it's the highest-risk/highest-value shared work and unblocks 7b.)
- **Wave 2 (after 1 merged — parallel):** 2 (#89, endpoint unification) and 3b (#90, BYOK UI + model selector) — different surfaces, no conflict; depend on task 1 only.
- **Wave 3 (after 2 merged — parallel):** 4 (#91, matrix UI) and 6 (#93, rate limit) — different surfaces (UI vs `/api/audit` middleware).
- **Wave 4 (after 4 merged):** 5 (#92, polymorphic inputs) — builds on the matrix.
- **7b (#103)** runs once **both 1 and 7a** are merged — the last Herald-side step (depends-on 1 + 7a). Naturally lands late.

Max concurrency: up to 3 (e.g. task 1 + 7a + an unblocked sibling). The hard serial points are wave 1 (task 1) for the Herald chain and 7a→7b for the tool chain.

**Dispatch order:** 1 (#88) is the Herald wave-1 lead; **7a (#102) is independently dispatchable now** (no deps) and is the long pole for the tool feature, so starting it early is sensible. Assigning an Issue promotes it `backlog → todo`; a Developer then writes the brief just-in-time from its Planner's rationale (per the planner-brief contract), opens `task/herald-onto-engine/<n>`, and opens the PR with the brief in the body.

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

Herald settings save keys for multiple vendors + a model picker for the audit. (Depends on task 1 only; vendor support is inherent in the engine, so the selector simply offers the vendors the user has keys for.) Reuse `@atta/ui/account` `ProviderKeysSection`; don't rebuild. Respects D-033 (whose key, orthogonal to which vendor). Mid. *Full rationale: Issue #90.*

### Task 4 — N×M matrix UI · Issue #91
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** 2, 5

The actual "bulk" feature: accept N CVs × M JDs, render a grid of one report per pair through `/api/audit`. The matrix doesn't exist yet (today `/bulk-audit` is single-pair-capable). Real grid state (async per-pair partial/loading/error). Mid-to-high. *Full rationale: Issue #91.*

### Task 5 — Polymorphic inputs · Issue #92
**Project(s):** herald · **Depends-on:** 2, 4 · **Conflicts-with:** 2, 4

JD as link|text; CV as text|.md|.pdf|published profile, normalized into the audit text, wired into the matrix + endpoint. `.pdf` extraction and link-fetch are the real work. **Trap:** link-fetch is outbound (SSRF/abuse — validate/scope); `.pdf` library choice; profile input resolves through Herald's own data. Mid. *Full rationale: Issue #92.*

### Task 6 — Per-key rate limit / cap on profile audits · Issue #93
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** —

Close the D-033 hole (strangers spend the owner's key budget). Per-key cap at the `/api/audit` layer (Upstash Redis backbone). **Operational dependency, not a code blocker:** Upstash creds expired — ship with graceful degradation; enforcement needs the creds. Parallelizes with wave 3. Mid. Stop-and-escalate `severity:product` if it needs a D-033 policy change. *Full rationale: Issue #93.*

### Task 7a — Custom client-side tool execution in `@atta/engine` · Issue #102 · **shared engine, Vāda in blast radius**
**Project(s):** engine, vada, herald · **Depends-on:** — · **Conflicts-with:** —

Build **custom client-side function-tool execution** into the adapter (`@atta/adapter-langgraph`). Today the adapter supports **provider-native server tools only** — the classifier *allocates* tools and the vendor executes them; there is **no loop** where the model emits a `tool_use`, the engine pauses, runs an app-supplied TypeScript function, and feeds the result back (proven by `node-executor.ts` + `graph-state.ts`: `toolUseHistory` is "best-effort — server tools don't emit countable tool_use blocks"). 7a adds: a YAML-declared **custom tool**, a registration surface for app-supplied tool implementations, and the call→tool→call execution loop. **Shared-engine change → Vāda in blast radius → additive/opt-in is mandatory** (an agent with no custom tools behaves byte-identically to today; that's the Vāda-safety guarantee). One verification story: a flow with a trivial custom tool (e.g. `add`) runs the loop and the registered fn executes. **Independently verifiable** with a throwaway tool → clean split from 7b. High. **Stop-and-escalate `severity:strategy`** if the loop can't be made additive (forces a change to the shared call path that alters Vāda) — that's a Type 1 engine-architecture decision for the Principal. *Full rationale: Issue #102.*

### Task 7b — Herald auditor uses a GitHub tool defined in its YAML · Issue #103 · **last (depends on 7a)**
**Project(s):** herald · **Depends-on:** 1, 7a · **Conflicts-with:** —

Define Herald's **GitHub signal tool in the auditor YAML** and register its implementation, so the agent **gathers its own evidence** instead of Herald pre-fetching it (Principal intent: agents own their tools; apps stop pre-fetching). The YAML agent gains a `tools` entry + a tool-using classifier mode; Herald registers the tool's body via the surface **7a** builds; `extractSignals` is retired as a pre-fetch. **Reuse `signals.ts` as the tool's implementation — don't rewrite the GitHub-walking.** The **NO-FIT gate stays Herald code.** Preserve a timeout/budget (today's 3s → the tool budget); the no-GitHub case must still produce a valid audit. **depends-on 1** (must be a YAML agent first) **and 7a** (the engine must support custom tools first). Herald-only surface (7a carried the engine blast radius). Mid. **Stop-and-escalate** if audit quality drops materially vs. pre-fetch (may keep pre-fetch), or if 7a's tool surface proves insufficient (`severity:strategy` back to 7a). *Full rationale: Issue #103.*

---

## Open questions / notes for dispatch

- **Issues:** #88–#93, #102 (7a), #103 (7b) live (#87/3a closed not-planned). Assigning an Issue is the `backlog → todo` promotion.
- **One genuine shared-engine change this tranche: 7a** (custom tool execution), Vāda in blast radius, additive/opt-in. Everything else is Herald-side. The *migration* (task 1) consumes the engine unchanged; if task 1 finds a hidden engine gap, that's a `severity:strategy` escalation (not assumed).
- **The tool chain is 1 → 7a → 7b:** task 1 makes the auditor a YAML agent (signals pre-fetched); 7a gives the engine the ability to run custom tools (shared); 7b moves Herald's signal-gathering into the agent as a YAML-declared tool. End state: maximal "logic in the YAML, not code," with the agent owning its own evidence-gathering.
- **Structured-output-on-other-vendors** (the old 3a) is backlogged as an optional future engine enhancement, not required by Herald.
- **This tranche is the model catching its own errors twice:** 3a dropped (Brief Author dig, June 12) and task 7 split into 7a/7b (planner readiness gate, June 13) — both before a wrong brief shipped.
