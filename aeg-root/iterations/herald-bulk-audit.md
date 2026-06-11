# Iteration: herald-bulk-audit — June 2026

**Goal (execution, not product-why):** ship Herald **Bulk Audit** — N CVs × M job descriptions → one forensic match report per pair — running on `@atta/engine` with real multi-vendor model choice. End to end: the audit cell migrated onto the engine, the engine able to produce structured output on multiple vendors, one unified `/api/audit` endpoint, the N×M matrix UI, multi-vendor BYOK + model selector, polymorphic inputs, and the profile-audit abuse cap closed.

**Repo:** attalabs (`daniboomerang/atta.ai`)   ·   **Team Leader:** Dani

> **Status is derived from the forge, not stored here.** This file is topology + the planner's durable rationale only. No PR numbers, no dates, no status. Issue numbers are placeholders (`#TBD`) until the Issues are created at dispatch time.

> **This is the first iteration run as a deliberate planning prototype** — every task carries a `Planner's rationale` block (candidate model addition F1) and a suggested agent-class (F4). The sizing reflects a deep code dig (F2) that overturned a backlog claim (F5): multi-vendor structured output is a shared-engine change with Vāda in the blast radius, not "just UI."

---

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|-----------|------------|----------------|
| 1 | Migrate Herald audit cell (`runSingleMatch`) onto `@atta/engine` | #TBD | herald, engine | — | 3a |
| 2 | Endpoint unification → one `/api/audit` cell runner | #TBD | herald | 1 | 4, 5 |
| 3a | Add multi-vendor structured output to the engine (Google + OpenAI-compat) | #TBD | engine, vada, herald | — | 1 |
| 3b | Herald multi-vendor BYOK UI + audit model selector | #TBD | herald | 1, 3a | — |
| 4 | N×M matrix UI (Bulk Audit accepts N CVs × M JDs, renders per-pair grid) | #TBD | herald | 2 | 2, 5 |
| 5 | Polymorphic inputs (JD link/text; CV text/.md/.pdf/published profile) | #TBD | herald | 2, 4 | 2, 4 |
| 6 | Per-key rate limit / cap on profile audits (D-033 abuse surface) | #TBD | herald | 2 | — |

**Wave structure (max concurrency, derived from the edges):**
- **Wave 1 (serialized pair):** 1 and 3a both touch the engine's structured-output path → they conflict. Run **3a then 1** (3a makes the engine multi-vendor-capable; 1 migrates Herald onto the already-capable engine, avoiding a second pass).
- **Wave 2 (after 1 + 3a merged — parallel):** 2 (endpoint unification) and 3b (BYOK UI) — different surfaces (routing vs settings), no conflict.
- **Wave 3 (after 2 merged — parallel):** 4 (matrix UI) and 6 (rate limit) — different surfaces (UI vs `/api/audit` middleware).
- **Wave 4 (after 4 merged):** 5 (polymorphic inputs) — builds on the matrix.

Max concurrency: 2 (waves 2 and 3). The hard serial point is wave 1 (engine), which is correct — everything builds on the engine being ready.

---

## Task details (with Planner's rationale — candidate F1)

### Task 1 — Migrate Herald audit cell (`runSingleMatch`) onto `@atta/engine`
**Project(s):** herald, engine · **Depends-on:** — · **Conflicts-with:** 3a

**Planner's rationale:**
- **Boundary:** Herald's ONE AI call (the skeptical-auditor match). Replace the direct `generateText()` / TS-string-prompt / manual-parse-retry with a Flow YAML (`apps/herald-ai/yamls/herald-auditor.yaml`, `solo` shape, `output_format: structured`) run via `loadFlow` + `compileFlow` through the LangGraph adapter. `extractSignals()`, the SHA-256 cache, and `buildPartialReport()` fallback stay untouched.
- **Vāda app code is NOT touched; the engine IS exercised.** The YAML machinery (`loadFlow`, `compileFlow`, `flow-schema`, `validate-flow`) already lives in `@atta/engine` (extracted in the schema-2.0 refactor, PRs #40/#41/#47/#48). Herald imports it directly. **Trap to avoid:** do NOT use `catalog-loader.ts`'s `loadYamlFromCatalog` — it hardcodes `apps/vada-ai/yamls` and would couple Herald to Vāda's directory. Use `loadFlow(readFileSync(<herald's own yaml>))` directly.
- **Two projects (herald + engine):** verification-coupled — the only proof the engine path works for Herald is Herald's audit producing the same forensic report through `@atta/engine`'s solo + structured path. Herald is the first non-Vāda consumer, so this validates the engine from a fresh caller.
- **Conflicts with 3a:** both touch the engine's structured-output path. Serialize. 3a lands first so this migration targets an already-multi-vendor-capable engine.
- **Known engine smells to verify (from herald-backlog + code dig):** (1) the structured-output adapter path for `solo` — verify it works for a fresh caller; (2) `compileFlow` called with `question=""` and inputs via `customVars`; (3) `catalog-loader` is Vāda-specific — avoid it (above).
- **Suggested agent-class:** high-capability — multi-file, crosses the herald↔engine boundary, navigates engine unknowns. Not a fast-model job.
- **Stop-and-escalate:** if the solo structured-output path is broken or missing for Herald's use, that's an engine gap → STOP, escalate `severity:strategy` (don't hack around it in Herald).

### Task 2 — Endpoint unification → one `/api/audit` cell runner
**Project(s):** herald · **Depends-on:** 1 · **Conflicts-with:** 4, 5

**Planner's rationale:**
- **Boundary:** fold `/api/match` (profile audit) and `/api/recruiter/batch` (bulk) into a single `/api/audit` endpoint whose unit of work is the per-pair cell `runSingleMatch` (now engine-backed after task 1). `BulkAudit` currently still calls `/api/recruiter/batch`; repoint it.
- **Why separate from task 1 (not combined):** different verification story ("two routes converge on one cell" vs "the cell runs through the engine"), different failure mode, different files. The backlog's "don't migrate the cell twice" concern is satisfied by *ordering* (this depends-on 1), not by welding routing into the migration.
- **Depends-on 1:** the unified endpoint must run the engine-backed cell, so the migration lands first.
- **Conflicts-with 4 and 5:** the matrix UI (4) and polymorphic inputs (5) build on this endpoint's request/response shape — they must not be in flight while the endpoint contract is changing. Serialize them behind this.
- **Suggested agent-class:** mid-to-high — a contained routing refactor against an existing cell; less unknown than task 1.

### Task 3a — Add multi-vendor structured output to the engine (Google + OpenAI-compat)
**Project(s):** engine, vada, herald · **Depends-on:** — · **Conflicts-with:** 1

**Planner's rationale (the F5 finding — overturns the backlog's "just UI" claim):**
- **Boundary:** in `packages/adapter-langgraph/src/llm.ts`, structured output (`agent.outputSchema` → forced JSON) exists **only** on the Anthropic `sdkShape`. The `google-genai` and `openai-compat` paths return `structured: undefined`. Herald's audit needs structured output, and multi-vendor is required **"for sure"** (Principal). So the engine MUST gain structured output for non-Anthropic vendors (Google's responseSchema/JSON-mode; OpenAI-compat's response_format / json_schema; honest per-vendor about which support it).
- **VĀDA IS IN THE BLAST RADIUS.** `llm.ts` is a **shared** file Vāda runs on. This task MUST re-verify Vāda's deliberations still run, and may require editing Vāda's call sites IF the structured-output contract changes (vs. purely additive new vendor branches). Vāda is listed as a project for that reason — the Reviewer must check Vāda, not just Herald. **Aim for additive** (new branches that only fire for non-Anthropic + outputSchema) so Vāda hits its existing untouched path → re-verify only, no Vāda edit.
- **Three projects (engine, vada, herald):** the change is in the shared engine (engine); Vāda consumes the changed file (vada, re-verified); Herald is the consumer that needs it (herald, the driving requirement).
- **Conflicts-with 1:** both edit the engine's structured-output path. Serialize; this lands first.
- **Suggested agent-class:** high-capability — shared-package change across three SDK shapes with a cross-product regression surface.
- **Stop-and-escalate:** if making non-Anthropic structured output work requires changing the **shared `outputSchema` contract** (not just additive per-vendor branches), that's a Type-1-sized engine change with real Vāda impact → escalate `severity:strategy` before proceeding. Also: some vendors/models may not support structured output at all — decide (and document) the per-vendor capability matrix; offering a model that can't do structured output for a structured audit is a footgun.

### Task 3b — Herald multi-vendor BYOK UI + audit model selector
**Project(s):** herald · **Depends-on:** 1, 3a · **Conflicts-with:** —

**Planner's rationale:**
- **Boundary:** make Herald's settings support saving keys for multiple vendors (not just Anthropic) and let the user pick the model for the audit. Today `(app)/settings/page.tsx` only reads `keys.anthropic` → a single `hasAnthropicKey` boolean, no model picker. The per-user encrypted store already holds all 12 vendors (`@atta/crypto` + `getProviderKeys`), so this is UI + wiring **once 3a makes the engine actually able to run those vendors with structured output.**
- **Reuse, don't rebuild:** Vāda's `@atta/ui/account` `ProviderKeysSection` is the multi-vendor key UI — reuse it rather than building new. Add a model selector on the audit surface (or a default in settings) resolved against the vendor registry (`packages/models/src/vendors.ts`), **filtered to models that support structured output** per 3a's capability matrix.
- **Depends-on 1 AND 3a:** needs the audit running through the engine (1) and the engine able to do multi-vendor structured output (3a). Offering a model picker before 3a would let users pick models that silently can't produce the structured report.
- **Respects D-033:** key resolution (profile audits → owner's key; bulk → logged-in user's key) is about *whose* key, orthogonal to *which vendor*. Don't change it.
- **This is the genuinely-"mostly UI" part** the backlog described — but only THIS half (3b), not the engine half (3a). The split is the F5 correction.
- **Suggested agent-class:** mid — reuse an existing component + a selector + registry wiring. Contained, Herald-only.

### Task 4 — N×M matrix UI
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** 2, 5

**Planner's rationale:**
- **Boundary:** the actual "bulk" feature. The Bulk Audit surface accepts **N CVs × M JDs** and renders a grid/matrix of one forensic report per pair, replacing the current single-pair view. Runs each cell through the unified `/api/audit` (task 2).
- **This is the missing feature:** today `/bulk-audit` exists as a route with a single-pair-capable component; the N×M matrix that makes it "Bulk" does not exist yet.
- **Depends-on 2:** renders results from the unified endpoint; needs its request/response shape settled.
- **Conflicts-with 2 and 5:** shares the Bulk Audit input/result components with the endpoint contract (2) and the input parsers (5). Serialize.
- **Suggested agent-class:** mid-to-high — real UI state (a grid of async per-pair results, partial/loading/error states), but Herald-only and bounded.

### Task 5 — Polymorphic inputs
**Project(s):** herald · **Depends-on:** 2, 4 · **Conflicts-with:** 2, 4

**Planner's rationale:**
- **Boundary:** accept JD as link | pasted text, and CV as pasted text | .md | .pdf | a candidate's published Herald profile. Normalize each input kind into the text the audit cell consumes, wired into the matrix (task 4) and the unified endpoint (task 2).
- **Depends-on 2 and 4:** needs the endpoint contract (2) and the matrix surface (4) to wire inputs into.
- **Conflicts-with 2 and 4:** touches the same Bulk Audit input components. Serialize behind the matrix.
- **Note:** .pdf extraction and link-fetch are the real work here (the rest is text). Watch for: link-fetch is an outbound network call (SSRF/abuse surface — validate/scope it); .pdf parsing library choice.
- **Suggested agent-class:** mid — bounded, Herald-only, but with two non-trivial parsers (.pdf, link-fetch).

### Task 6 — Per-key rate limit / cap on profile audits
**Project(s):** herald · **Depends-on:** 2 · **Conflicts-with:** —

**Planner's rationale:**
- **Boundary:** close the D-033 abuse surface — strangers running audits on a published profile spend the **owner's** key budget. Add a per-key rate limit / cap on profile audits at the `/api/audit` layer (Upstash Redis is already the rate-limit backbone, though creds are currently expired — see herald-backlog "Smaller / open").
- **Depends-on 2:** the cap lives at the unified `/api/audit` endpoint, so it lands after the endpoint exists.
- **No conflicts:** it's middleware/accounting at the endpoint layer — different surface from the matrix (4) and inputs (5), so it parallelizes with wave 3.
- **In-scope rationale:** the moment Bulk Audit is live and profiles are publicly auditable, this hole is real (owner pays for strangers' audits). Cheap to close, parallelizes for free.
- **Operational dependency (NOT a code blocker):** Upstash creds must be provisioned for the limit to actually enforce (herald-backlog flags expired creds). The code can ship with graceful degradation; enforcement needs the creds.
- **Suggested agent-class:** mid — contained middleware + Redis accounting.

---

## Open questions / notes for dispatch

- **Issue numbers** are `#TBD` — created when each task is dispatched (Planner assigns at that point). The topology (edges) is fixed; the Issues are not yet cut.
- **3a-first within wave 1:** 3a (engine gains multi-vendor structured output) before 1 (Herald migrates onto it), so Herald targets a complete engine and avoids a second migration pass.
- **Per-vendor structured-output capability matrix** (from 3a) is a real artifact this iteration must produce — it gates which models 3b's selector may offer. Not every vendor/model supports structured output.
- **This iteration is also the F1–F5 prototype.** If the `Planner's rationale` blocks above prove their worth in execution (briefs start from them, agents avoid the documented traps), that's the evidence to ratify F1/F2 into `planner.md` + `iterations/README.md` as a permanent AEG upgrade (its own `D-###`).
