# Iteration: vada-production-v1 — June–July 2026
Lifecycle: active

Goal: Make Vāda production-ready. Migrate all YAMLs into `packages/agents/` with tools
equipped from day one; add Fusion as a first-class team (real + native pattern); run a
DRACO-style benchmark across all teams + Fusion on identical prompts; replace
`CalculatorStats` estimates with measured cost/time/tokens/quality on the Teams page;
add SmartTextInput and deliberation UI tool support. Exit bar: tool-equipped reviewers,
4+ teams in catalog, repeatable benchmark, Teams page shows measured stats publicly.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

Previously completed in vada-agents-v2 (carry-forward, not re-dispatched):
- Task 3 (trust page rewrite) — merged PR #146 ✅
- Task 4 (homepage rewrite) — merged PR #147 ✅

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|------------|------------|----------------|
| S0 | Tools/MCP capability spike — determine what agents can be equipped with (in-process custom tools, per-vendor web search, external MCP servers); produce capability matrix + recommended substrate approach | #TBD | vada, engine, adapter | — | — |
| 1 | YAML migration + bug fixes + tool equipping — all 9 YAMLs to `packages/agents/`; Vāda thin consumer; fix Reviewers ERROR + Sparring duplicate-Critic; equip reviewers maximally with web search + reachable MCPs across vendors; update YAML-location refs | #TBD | vada, engine, adapter | S0, herald-agents-v2/2 | — |
| 2 | Stale spec cleanup — vada-state.md full rewrite, CLAUDE.md, teams-catalog stale refs, byok refs, backlog | #TBD | vada | 1 | — |
| 3 | Tool/MCP substrate — generalize tool support in the adapter so any YAML can declare tools/MCPs; OpenRouter plugin-param passthrough | #TBD | vada, engine, adapter, herald | S0, 1 | — |
| 4 | `vada-fusion` (real Fusion) — single-agent YAML routed through `vendor: openrouter`, `model: openrouter/fusion`; add `OPENROUTER_API_KEY` | #TBD | vada | 1 | — |
| 5 | `vada-fusion-native` — own parallel-panel → synthesizer → audit flow; tool-equipped; adopt Fusion techniques (web-off synthesis, partial-coverage + blind-spots categories, gating) | #TBD | vada, engine, adapter | 3 | — |
| 6 | SmartTextInput — extract multi-kind input from Herald's Jd/CvInputControl into `@atta/ui`; wire into Vāda `/deliberate`; Herald wrappers internal-only refactor, external props unchanged | #TBD | vada, herald, atta | 1 | herald-agents-v2/4 |
| 7 | Deliberation UI tool/MCP support — YAML declares `required_inputs`; UI validates context-completeness before dispatch; tool-equipped YAMLs runnable end-to-end | #TBD | vada, engine | 3, 6 | — |
| 8 | Reviewers prompt iteration — B-3b + B-3c; Principal-driven loop; incorporate Fusion techniques; patch vada-reviewers-spec.md §8 phantom consensus | #TBD | vada | 1 | — |
| 9 | Benchmark harness — repeatable runner across all conditions (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW, FUSION-default, FUSION-native); capture measured cost/latency/tokens; structured DB storage; implement §6a comparison protocol | #TBD | vada | 1, 4 | — |
| 10 | Quality audit — DRACO-style weighted rubric; blind LLM judge (not a panelist) + second-judge sanity check; negative marking; per-question-type breakdown; full conditions matrix | #TBD | vada | 8, 9 | — |
| 11 | Benchmark run + results doc — execute; document; decide fate of rounds teams from data | #TBD | vada | 10 | — |
| 12 | Teams page = live measured stats — replace `CalculatorStats` with measured cost/time/tokens/quality per team from DB; reconcile with `/bench`; public | #TBD | vada | 11 | — |
| 13 | Production hardening — hosted MCP hardening (E8–E12), error states, observability confirmed, Reviewers ERROR fully closed | #TBD | vada, engine, adapter | 3, 11 | — |

## Planner's rationale

### Task S0 — Tools/MCP capability spike
**Boundary:** Read-only investigation across `packages/adapter-langgraph` and
`packages/engine`. Determine precisely what can be equipped today:
(a) In-process custom tools — confirmed working via D-047. Shape: handler registered on
`LangGraphAdapter`, spec declared in YAML `custom_tools`. Anthropic vendor path only (the
`runAnthropicCustomToolLoop` is Anthropic-specific).
(b) Per-vendor web search — `packages/models/src/vendors.ts` has 12 vendors. Gemini, GPT,
Grok all expose native web search / grounding tools via their SDKs. Check: does the adapter's
`google-genai` branch and `openai-compat` branch support tool-use responses today? Can a YAML
declare `tools: [web_search]` and have the adapter pass it through?
(c) External MCP servers — the adapter has no MCP client today. What would it take?
Deliverable: one findings doc at `apps/vada-ai/specs/tools-capability-spike.md`. Include
a recommended substrate approach for T3. Spike flag: true.
**Sizing:** Read-only, one findings doc. No production code.
**Project(s) + blast radius:** vada, engine, adapter (read-only — no changes).
**Dependency rationale:** None. Runs first, in parallel with anything. T1 and T3 gate on it.
**Traps to avoid:** Do not implement anything. Findings only. If the answer is "MCP needs a
new engine schema field," flag it — it resizes T3.
**Suggested agent-class:** high — cross-layer reading, architectural judgment.
**Stop-and-escalate:** If external MCP support requires a new engine schema field, escalate
`severity:strategy` — that changes T3's blast radius significantly.

---

### Task 1 — YAML migration + bug fixes + tool equipping
**Boundary:** Three concerns in one PR (D-B says tools during migration):
(a) Move all 9 Vāda YAMLs from `apps/vada-ai/web/yamls/` into per-agent packages under
`packages/agents/` following EXACTLY the shape of `packages/agents/forensic-hiring-auditor/`.
Rewire the deliberation route as a thin consumer. Update YAML-location refs in
`vada-state.md` and `vada-backlog.md`.
(b) Fix the two known bugs: Reviewers ERROR (diagnose from real logs, don't guess — reproduce
first; may be provider-key routing or Clerk/BYOK); Sparring duplicate-Critic (diagnose, fix).
(c) Equip the reviewer agents maximally with tools using S0's recommendations. Per D-B,
price is not a constraint — quality is. Gemini reviewers get Google grounding/search if
the adapter supports it; GPT reviewers get web search; Grok reviewers get X/web search.
If S0 reveals the adapter cannot pass vendor-native web search today, implement the minimum
adapter change needed to enable it for reviewers — or stop-and-escalate if it requires a
shared-contract change beyond the adapter's current extension points.
NOT in scope: new Fusion teams, SmartTextInput, deliberation UI changes.
**Sizing:** Large. One PR. Single verification story (`vada__deliberate` returns a result on
the new package AND reviewers can invoke web search tools). Bounded but complex — three
concerns means three independent failure modes. Agent-class: high.
**Project(s) + blast radius:** vada (primary, deliberation route rewired), engine (re-verify
herald audit still works — no engine files should change), adapter (may change for web-search
passthrough — herald must re-verify), aeg-core (YAML location changes — verify parsers still
pass). NOT in blast radius: herald app code (the forensic-hiring-auditor package is already
migrated; this task doesn't touch it).
**Dependency rationale:** Depends on S0 (need the capability findings before equipping tools)
and herald-agents-v2/2 (package shape + glob already established by that PR — don't
re-establish it, follow it).
**Traps to avoid:** Copy the package shape EXACTLY from `packages/agents/forensic-hiring-
auditor/` — do not reinvent. Do NOT attempt to fix Reviewers ERROR without first reading
real logs or reproducing locally. Do NOT conflate bug diagnosis with bug fix — diagnose
first, fix second, note the diagnosis in the PR body. Do NOT change `@atta/engine`
shared contracts. If tool equipping requires a shared adapter contract change, that
portion belongs in T3, not T1 — split the PR if needed and escalate.
**Suggested agent-class:** high.
**Stop-and-escalate:** If Reviewers ERROR is Clerk/BYOK (not routing/SDK), escalate
`severity:strategy` before fixing. If tool equipping requires engine schema changes,
escalate `severity:strategy` — that belongs in T3.

---

### Task 2 — Stale spec cleanup
**Boundary:** Full rewrite of `apps/vada-ai/specs/vada-state.md` (last meaningful update
May 4-5; predates engine migration, shared keys UI, current routes, YAML catalog).
Update `apps/vada-ai/CLAUDE.md`, `vada-teams-catalog/02-mcp-tool-interface.md` (stale
`apiKey` body param), `04-caller-claude-protocol.md` ("Caller Claude owns synthesis"
reversed by D-016), `vada-byok-principles.md` (browser-only model). Update
`vada-backlog.md` non-YAML items. Read current code before rewriting (audit mode, D-004).
NOT in scope: `vada-reviewers-spec.md` (patched in T8 when the prompt iteration touches it).
**Sizing:** Doc-only. One PR. Bounded (6–7 files).
**Project(s) + blast radius:** vada only.
**Dependency rationale:** Depends on T1 — vada-state.md must reflect where YAMLs now live
and which tools are equipped.
**Suggested agent-class:** mid — doc rewrite.
**Stop-and-escalate:** If auditing reveals a behavioral gap not in any spec or decision log,
flag it in the PR body as a new Issue rather than silently patching.

---

### Task 3 — Tool/MCP substrate
**Boundary:** Generalize tool support in the adapter and engine so any YAML can declare
tools/MCPs and they are dispatched across vendors. Based on S0's recommendations.
Specifically: (a) vendor-native tool passthrough — if S0 found gaps in how google-genai and
openai-compat branches handle tool-use responses, fix them here; (b) per-YAML tool
declarations beyond the current `custom_tools` (e.g. `mcp_servers`, `native_tools`);
(c) OpenRouter plugin-param passthrough (`plugins`, `models` body params) so a future
`FUSION-matched` condition can configure Fusion's panel via the adapter.
Also: minimal observability hook — if the adapter has no structured logging of per-call
cost/tokens/model, add a callback or event so the benchmark harness (T9) can capture
measured data. If Langfuse or equivalent is already wired anywhere in the monorepo, thread
it here; if not, a lightweight in-memory event emitter is sufficient for T9's needs —
Langfuse integration is a follow-up.
**Sizing:** Large. One PR. Blast radius is shared — re-verify herald audit + vada deliberate.
**Project(s) + blast radius:** vada, engine, adapter, herald (re-verify both consumers).
**Dependency rationale:** Depends on S0 (recommendations drive the implementation) and T1
(Vāda must be on the new package structure before testing tool dispatch through it).
**Traps to avoid:** Do NOT hardcode vendor-specific tool syntax in the engine — the engine
is content-agnostic. Tool declarations are YAML data; the adapter interprets them per
vendor. If a new YAML schema field is needed (e.g. `mcp_servers`), that IS a shared-engine
contract change — escalate first.
**Suggested agent-class:** high.
**Stop-and-escalate:** If supporting external MCP servers requires a new `@atta/engine`
flow-schema field, escalate `severity:strategy` before implementing — Vāda + Herald blast
radius.

---

### Task 4 — `vada-fusion` (real Fusion)
**Boundary:** Create `packages/agents/vada-fusion/`. A single-agent YAML routed through
`vendor: openrouter`, `model: openrouter/fusion`. OpenRouter is already a registered vendor
in `packages/models/src/vendors.ts` (`sdkShape: openai-compat`, `baseURL:
https://openrouter.ai/api/v1`, bearer). Add `OPENROUTER_API_KEY` to the Vāda env. Wire
the new team into the catalog. The deliberation route calls `vada-fusion.run()` exactly
like any other team.
This is the "commodity honest baseline" — the engine executes it, but Fusion's panel +
tools are OpenRouter's, opaque to us. This is correct and intentional: it is the benchmark
baseline that proves our own native approach is better.
NOT in scope: plugin-mode Fusion (FUSION-matched condition) — that requires T3's OpenRouter
plugin passthrough and is deferred.
**Sizing:** Small. One PR. Single-agent YAML + env var + catalog wire-up.
**Project(s) + blast radius:** vada only (new package, no existing code changes beyond
catalog registration).
**Dependency rationale:** Depends on T1 (package shape established, deliberation route
already a thin consumer).
**Suggested agent-class:** mid.
**Stop-and-escalate:** If `openrouter/fusion` returns a non-standard response shape the
adapter cannot parse, escalate `severity:strategy` — may need an adapter branch.

---

### Task 5 — `vada-fusion-native`
**Boundary:** Create `packages/agents/vada-fusion-native/`. Our own Fusion pattern:
parallel panel → synthesizer → audit flow, tool-equipped, with the Fusion techniques the
session identified as improvements over the current reviewers: (a) web-off synthesis — the
final synthesis call has web tools OFF (all freshness lives in the panel responses);
(b) two new synthesizer output categories — "partial coverage" (topic raised by some
reviewers but not all) and "blind spots none of the reviewers raised"; (c) gating — the
flow declares a depth guard that stops recursion. The panel agents use the same
multi-vendor web-search tooling from T3/T4. The synthesizer is our own (existing
synthesizer YAML extended with the two new categories). Wire into catalog.
**Sizing:** Large. One PR. New multi-agent YAML + new package + catalog wire.
**Project(s) + blast radius:** vada (new package, catalog), adapter (tool-equipped agents
go through the T3 substrate).
**Dependency rationale:** Depends on T3 (tool substrate must be ready for the panel agents
to use web search) and implicitly on T4 (the native flow is built to compare against real
Fusion — having T4 live lets the Brief Author refine the native shape).
**Traps to avoid:** Do not attempt to replicate Fusion's internal judge prompt (it's opaque).
The native flow uses our own synthesizer prompt, improved with the two new categories. The
comparison is our synthesis discipline vs their judge prompt on our tooling vs their
tooling.
**Suggested agent-class:** high.
**Stop-and-escalate:** If the `vada-fusion-native` shape requires a new YAML schema
construct not currently in the engine (e.g. gating declarations), escalate
`severity:strategy`.

---

### Task 6 — SmartTextInput
**Boundary:** Extract the generic multi-kind input pattern from Herald's `JdInputControl.tsx`
and `CvInputControl.tsx` into `@atta/ui` as a domain-neutral component. Herald wrappers
refactored to consume it internally — EXTERNAL PROP API UNCHANGED, `BulkAudit.tsx` not
touched. Wire into Vāda's `/deliberate` input.
**Sizing:** One PR. Two consumers (Vāda + Herald internal). Bounded.
**Project(s) + blast radius:** vada (new deliberation input), herald (internal refactor —
external API stable), atta (hub may consume `@atta/ui` — verify tokens unaffected). Engine
NOT in blast radius.
**Dependency rationale:** Depends on T1 (Vāda deliberation route stable before rewiring
input). Conflicts-with herald-agents-v2/4 — serialize: this task merges first, then
herald-agents-v2/4 consumes the extracted component.
**Traps to avoid:** Keep the component domain-neutral — no CV/JD terminology in `@atta/ui`.
Labels, placeholders, accepted file types are all props. Do NOT change external prop
interface of `JdInputControl` or `CvInputControl`.
**Suggested agent-class:** mid.
**Stop-and-escalate:** If extraction requires `@atta/ui` Tailwind v4 token changes with
wider blast radius, escalate `severity:strategy`.

---

### Task 7 — Deliberation UI tool/MCP support
**Boundary:** Refactor Vāda's `/deliberate` page to support tool-equipped YAMLs. YAML
declares `required_inputs`; UI reads them and shows the right input fields before dispatch
(context-completeness validation). Tool-equipped YAMLs are runnable end-to-end from the UI.
Coupling is YAML → UI, one direction. Do NOT hardcode any specific tool — the architecture
supports any registered tool.
**Sizing:** Large. One PR.
**Project(s) + blast radius:** vada (deliberation UI), engine (tool dispatch), adapter
(in blast radius — re-verify herald audit).
**Dependency rationale:** Depends on T3 (tool substrate must be in place) and T6
(SmartTextInput for the new input fields).
**Traps to avoid:** If context-completeness validation requires a new YAML `required_inputs`
schema field not in `@atta/engine`'s flow-schema, escalate `severity:strategy` before
implementing.
**Suggested agent-class:** high.

---

### Task 8 — Reviewers prompt iteration
**Boundary:** B-3b (Reviewer system prompt, rev-5 spec §4.1.1) + B-3c (Synthesizer system
prompt, §4.1.2). Principal-driven judgment loop. Incorporate Fusion techniques: adopt the
partial-coverage and blind-spots categories in the Synthesizer; add the phantom-consensus
guard to `vada-reviewers-spec.md` §8 (the gap the spec currently lacks). Deliverable:
improved reviewer + synthesizer YAMLs in `packages/agents/` with iteration history
documented.
**Sizing:** Research + prompt iteration. Principal-in-the-loop. One PR.
**Project(s) + blast radius:** vada only (YAMLs in `packages/agents/`).
**Dependency rationale:** Depends on T1 — reviewers must be tool-equipped and on the new
package before iterating their prompts.
**Suggested agent-class:** high.
**Stop-and-escalate:** If Reviewers ERROR from T1 is not fully resolved, stop and report —
cannot iterate on a broken team.

---

### Task 9 — Benchmark harness
**Boundary:** A repeatable runner that executes every team condition on identical prompts
and captures measured cost/latency/tokens in the existing DB (reconcile with `/bench`
route's `listBenchmarkRuns`/`getBenchmarkStats` pattern — reuse the same DB schema and
queries, do not invent a new storage layer). Conditions matrix:
- A0 — single baseline (A0 model, direct)
- A1 — single baseline (A1 model, direct)
- VR-NS — vada-reviewers, no synthesis
- VR-S-same — vada-reviewers-synthesis, same-vendor
- VR-S-cross — vada-reviewers-synthesis, cross-vendor
- MW — multi-round (sparring or war-room, whichever is least broken) — for the fate decision
- FUSION-default — vada-fusion (real Fusion via OpenRouter)
- FUSION-native — vada-fusion-native

Per D-C, metrics captured per run: measured cost ($), latency (ms), input tokens, output
tokens. Quality score is added by T10's quality audit.
Implement the §6a comparison protocol: define per-condition what artifact is judged and
what common input each team receives. A0/A1 generate fresh answers; reviewer teams improve
a draft. Pin this before any runs.
**Sizing:** Harness build + first dry run. One PR.
**Project(s) + blast radius:** vada (scripts + DB). No shared package changes.
**Dependency rationale:** Depends on T1 (teams in packages) and T4 (vada-fusion must
exist to run the FUSION-default condition).
**Suggested agent-class:** high.
**Stop-and-escalate:** If OpenAI + xAI + OpenRouter keys are not in Vercel, the cross-vendor
conditions cannot run. Stop and flag — Principal must add them.

---

### Task 10 — Quality audit
**Boundary:** Design and implement the DRACO-style weighted rubric for Vāda's deliberation
task set. Criteria adapted for deliberation/judgment tasks (not only deep-research). Key
requirements from §6b: (a) fixed task set, (b) weighted criteria with NEGATIVE WEIGHT for
wrong answers, (c) BLIND LLM judge — a model NOT in the panelists (e.g. Sonnet judging
Gemini/GPT/Grok panels), (d) second-judge sanity check, (e) per-question-type breakdown.
Run the quality audit across all T9 conditions. Produce quality scores per condition.
**Sizing:** Research + evaluation design + runs. Principal-in-the-loop for judging.
One PR (rubric + results).
**Project(s) + blast radius:** vada only.
**Dependency rationale:** Depends on T8 (prompt-iterated reviewers must be in place — a
benchmark on un-iterated prompts gives no signal) and T9 (harness must exist to run
conditions).
**Suggested agent-class:** high.
**Stop-and-escalate:** DRACO is a deep-research benchmark — reviewers will score poorly
until T1's tool-equipping is verified live. If reviewers are not using web tools in
practice by the time T10 runs, flag it and run the benchmark anyway (the data proves
the point about tool necessity).

---

### Task 11 — Benchmark run + results doc
**Boundary:** Execute the full benchmark (T9 harness + T10 quality audit) across all
conditions. Produce the results document. **Decide the fate of the rounds teams** (sparring,
crucible, war-room) from the data — if MW condition confirms they degrade, retire them from
the catalog (move YAMLs to an `archived/` sub-dir); if they surprise, keep them. The
decision is data-driven, not pre-decided.
**Sizing:** Execution + document. One PR (results + fate decision).
**Project(s) + blast radius:** vada only.
**Dependency rationale:** Depends on T10.
**Suggested agent-class:** high. Principal-in-the-loop (final arbiter on fate decision).
**Stop-and-escalate:** If keys not in Vercel, stop and flag.

---

### Task 12 — Teams page = live measured stats
**Boundary:** Replace `CalculatorStats.tsx` with a `BenchmarkStats` component that reads
measured cost/time/tokens/quality from the DB (the same store T9/T10 populate and `/bench`
reads from). Per D-D, results are public on the Vāda website. Per Q5, no private-first
phase — ship measured stats directly. Add a "Quality" column to the per-team stats.
Reconcile the `/bench` route (per-run log) with the Teams page (per-team aggregates) —
they share the same DB, the Teams page shows aggregates, `/bench` shows the run log.
Keep both; they serve different purposes.
**Sizing:** UI + DB query. One PR. Bounded to teams surface + DB queries.
**Project(s) + blast radius:** vada only.
**Dependency rationale:** Depends on T11 — the data must exist before the display is meaningful.
**Suggested agent-class:** mid–high.
**Stop-and-escalate:** If the DB schema from T9 doesn't support per-team aggregates cleanly,
escalate — may need a migration or a view.

---

### Task 13 — Production hardening
**Boundary:** Hosted MCP hardening (items E8–E12 from the backlog — check
`apps/vada-ai/specs/vada-backlog.md` for current list), error states for tool-equipped
runs (what happens when a tool call fails mid-deliberation), observability confirmed
(the T3 hook is wired and emitting data), Reviewers ERROR fully closed (verify from
production logs post-T1). NOT in scope: new features.
**Sizing:** Varies by findings. One PR per concern if needed, or one consolidated PR.
**Project(s) + blast radius:** vada, engine, adapter (as applicable).
**Dependency rationale:** Depends on T3 (observability hook) and T11 (benchmark run may
surface hardening gaps that weren't visible before real load).
**Suggested agent-class:** high.
**Stop-and-escalate:** Any hardening item that requires a new shared-engine interface,
escalate `severity:strategy`.

## Backlog (this iteration, not yet dispatched)

- `FUSION-matched` condition — Fusion configured with the same panel + judge models as
  VR-S-cross, isolating synthesis prompt discipline vs their judge prompt. Requires T3's
  OpenRouter plugin passthrough to be proven and stable. Fast-follow after T13.
- Regulation → AEG mechanism mapping doc (EU AI Act / SLSA) turning benchmark output
  into compliance evidence — deferred, noted in D-030.
- `aeg.sh generate-skills` step to rebuild `.claude/` harness view — deferred.

## Cross-iteration dependencies

- T1 depends on herald-agents-v2/2 (package shape + glob established).
- T6 conflicts-with herald-agents-v2/4 (SmartTextInput extraction must merge first).
- T3 touches the shared adapter — herald audit must be re-verified (blast radius).

## Definition of done (exit criteria per D-E)

- All 9 YAMLs in `packages/agents/`; Vāda is a thin consumer; Reviewers ERROR + Sparring
  duplicate-Critic bugs closed.
- Reviewers tool-equipped (web search + reachable MCPs) across all vendors.
- Catalog: vada-reviewers, vada-reviewers-synthesis, vada-fusion, vada-fusion-native
  (+ existing baseline agents). At least 4 deliberation teams.
- Repeatable benchmark exists; all teams + Fusion measured on identical prompts for
  cost/latency/tokens/quality; blind-judge quality audit; per-question-type breakdown.
- Teams page shows measured stats (not estimates); public.
- Rounds-team fate decided from benchmark data.
- Deliberation UI supports tool-equipped YAMLs with context-completeness validation.
- Specs/state docs current. Hosted MCP hardened. Observability wired.
