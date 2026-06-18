Lifecycle: complete

# Iteration: vada-agents-v2 — June–July 2026

Goal: Migrate all Vāda YAMLs into `packages/agents/` (following the pattern established by
herald-agents-v2), make Vāda a thin consumer, fix known bugs, refine Reviewers prompt,
run the first benchmark, rewrite the homepage, extract SmartTextInput to @atta/ui, and
build tool/MCP support into the deliberation UI.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

## Tasks (topology)

| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |
|---|------|-------|------------|------------|----------------|
| 1 | Vāda YAML migration + bug fixes — all YAMLs to `packages/agents/`, Vāda thin consumer, fix Reviewers ERROR + Sparring duplicate Critic, update YAML-location refs in vada-state.md + backlog | #TBD | vada, engine, aeg-core | herald-agents-v2/2 | — |
| 2 | Stale spec cleanup — vada-state.md full rewrite, CLAUDE.md, teams-catalog stale refs, byok refs, backlog non-YAML items | #TBD | vada | 1 | — |
| 3 | Trust page rewrite — replace browser-only BYOK framing with server-side at-rest model (post D-028/D-029) | #TBD | vada | — | — |
| 4 | Homepage rewrite — remove engine/YAML/closed-room sections; new structure: what it is → why it works → try it → MCP/developer; remove EcosystemSection (Atta/Vitakka not public); update NegationsSection copy to remove "no tools" hardcoding | #TBD | vada | — | — |
| 5 | SmartTextInput — extract generic multi-kind input pattern (tabs: paste text / URL / file upload) from `apps/herald-ai/web/src/components/audit/{JdInputControl,CvInputControl}.tsx` into `@atta/ui` as a domain-neutral component; wire into Vāda `/deliberate` input | #TBD | vada, herald | 1 | herald-agents-v2/4 |
| 6 | Reviewers prompt iteration — B-3b (Reviewer system-prompt) + B-3c (Synthesizer system-prompt); Principal-driven judgment loop: run vada__consult, read responses, judge, tweak, re-run | #TBD | vada | 1 | — |
| 7 | Agent tools + MCP support — deliberation UI refactor to support tool-equipped YAMLs; context-completeness validation (YAML declares required inputs, UI validates before dispatch); `forensic-hiring-auditor` callable as a tool from a Vāda deliberation agent | #TBD | vada, engine, aeg-core | 1, 5 | — |
| 8 | First benchmark run — B-4: six conditions per test case (A0, A1, VR-NS, VR-S-same, VR-S-cross); manual judging; per-question-type breakdown; validates the whole iteration's refactor | #TBD | vada | 6 | — |

## Planner's rationale

### Task 1 — Vāda YAML migration + bug fixes
**Boundary:** Move all 9 Vāda YAMLs from `apps/vada-ai/web/yamls/` into per-agent packages
under `packages/agents/` (e.g. `packages/agents/vada-reviewers/`, `packages/agents/a0-baseline/`,
etc.), following the package shape established by herald-agents-v2/2. Rewire Vāda's deliberation
route to consume from the new packages. Fix the two known bugs IN THE SAME PR since the agent
will be reading and running every YAML: (a) Reviewers team ERROR (provider keys / SDK routing
— diagnose and fix); (b) Sparring duplicate Critic message (diagnose and fix). Update YAML-
location references in `apps/vada-ai/specs/vada-state.md` and `vada-backlog.md` (the subset
that mentions YAML paths — full spec cleanup is task 2).
NOT in scope: Vāda homepage (task 4), trust page (task 3), SmartTextInput (task 5),
deliberation tool support (task 7).
**Sizing:** Large but bounded. One PR. Single verification story (`vada__deliberate` returns
a result on the new package). Bounded (new packages + vada route + 2 bug fixes + YAML-path
refs). Single failure mode (migration breaks deliberation). Passes all four tests.
**Project(s) + blast radius:** vada (primary consumer, deliberation route rewired), engine
(in blast radius — re-verify vada deliberation and herald audit both still work after any
shared package reads change), aeg-core (YAML location changes — verify `parseIteration` and
`parseLedger` still pass; verify any YAML catalog discovery still works).
**Dependency rationale:** Depends on herald-agents-v2/2 — the package shape and conventions
for `packages/agents/<name>/` are established by the Herald migration. Vāda follows that
pattern, not invents a new one. Cannot start until herald-agents-v2/2 is merged.
**Traps to avoid:** Follow the EXACT package shape established by `packages/agents/forensic-
hiring-auditor/` — same directory structure, same export pattern, same `loadFlow` usage.
Do NOT use `loadYamlFromCatalog` with hardcoded paths. Do NOT change `@atta/engine` or
`@atta/adapter-langgraph` shared contracts. For the Reviewers ERROR bug: read the actual
error from production logs or reproduce locally before coding a fix — do not guess.
**Suggested agent-class:** high — multi-package migration, two bug fixes requiring diagnosis,
shared blast radius.
**Stop-and-escalate:** If fixing either bug requires changing `@atta/engine` or
`@atta/adapter-langgraph` shared contracts, escalate `severity:strategy` — that changes the
blast radius significantly. If the Reviewers ERROR diagnosis reveals it is a Clerk/BYOK
issue (not a routing issue), escalate `severity:strategy` before fixing.

---

### Task 2 — Stale spec cleanup
**Boundary:** Full rewrite of `apps/vada-ai/specs/vada-state.md` (last meaningful update
May 4-5; does not reflect engine migration, shared keys UI, vendor registry, current routes,
or current YAML catalog state). Update `apps/vada-ai/CLAUDE.md` (Settings tab still shows
Teams tab). Update `apps/vada-ai/specs/vada-teams-catalog/` stale files: `02-mcp-tool-
interface.md` (old `apiKey` body param — route now reads from DB by `clerkId`),
`04-caller-claude-protocol.md` ("Caller Claude owns synthesis" reversed by D-016).
Update BYOK references in `vada-byok-principles.md` that still describe the browser-only
model. Update `vada-backlog.md` non-YAML items (YAML-location refs were updated in task 1).
NOT in scope: vada-reviewers-spec.md (too large for this task; patch opportunistically when
touched), vada-product-spec.md + vada-product-recognitions.md (legacy, not in active use).
**Sizing:** Doc-only. One PR. Bounded (6-7 files). Mid-capability — research required to
verify current state before rewriting.
**Project(s) + blast radius:** vada only.
**Dependency rationale:** Depends on task 1 — the YAML-location migration must land first
so that vada-state.md can correctly describe where YAMLs now live.
**Traps to avoid:** Read the current code and routes before rewriting specs — do not write
specs that describe how things used to work. Use audit mode (current code wins, D-004).
**Suggested agent-class:** mid — doc rewrite, no architecture.
**Stop-and-escalate:** If auditing the current code reveals a behavioral gap not captured
in any spec or decision log, flag it in the PR body as a new issue rather than silently
patching it into a spec.

---

### Task 3 — Trust page rewrite
**Boundary:** Rewrite `apps/vada-ai/web/src/app/(main)/trust/` content. Replace the browser-
only BYOK framing (pre-May 4) with the current server-side at-rest model (AES-256-GCM,
envelope-encrypted, AAD-bound to clerkId, per vada-decisions.md D-028 + D-029). Pure
content rewrite — no route changes, no component architecture changes.
**Sizing:** Small. One PR. Content only.
**Project(s) + blast radius:** vada only. No dependencies.
**Suggested agent-class:** mid — prose rewriting.
**Stop-and-escalate:** None anticipated.

---

### Task 4 — Homepage rewrite
**Boundary:** Replace the current homepage sections with a simpler, product-focused structure.
Remove: `PositioningSection` (YAML/engine explanation), `MechanismSection` (Atta Engine /
compileFlow diagram), `EcosystemSection` (Atta + Vitakka brands not public yet).
Replace with: (1) updated hero copy (keep canvas animation, update tagline to be concrete
about what Vāda does); (2) what it is — simple, no YAML, no engine; (3) why it works —
the deliberation insight (models disagree when uncertain; disagreement is the signal);
(4) try it CTA; (5) MCP / developer section (one small section, link to /mcp).
Update `NegationsSection` copy: remove "no tools / no web access / no integrations"
hardcoded claims — these are YAML decisions, not Vāda product decisions. Replace with
honest negations about what Vāda is NOT (not a chatbot, not a workflow, not trying to
be helpful — trying to be right).
NOT in scope: route changes, new CMS content, component library changes.
**Sizing:** UI rewrite. One PR. Bounded to homepage components.
**Project(s) + blast radius:** vada only. No dependencies.
**Traps to avoid:** Do NOT add CMS dependencies. Keep the homepage component-local and
static — no async CMS fetches for the new sections. The `EcosystemSection` CMS fetch
(Atta/Vitakka branding) is deleted, not replaced.
**Suggested agent-class:** mid — component rewrite, no architecture.
**Stop-and-escalate:** None anticipated.

---

### Task 5 — SmartTextInput
**Boundary:** Extract the generic multi-kind input pattern from Herald's `JdInputControl.tsx`
and `CvInputControl.tsx` into `@atta/ui` as a domain-neutral `SmartTextInput` (or
`MultiKindInput`) component. The pattern: tabs to switch input kind (paste text / URL /
file upload), a textarea or input or file slot per kind, controlled state. Wire the new
component into Vāda's `/deliberate` page input (question field + optional context). Herald's
`JdInputControl` and `CvInputControl` should be refactored to consume the shared component.
NOT in scope: per-audit model override, Herald Bulk Audit UX redesign (herald-agents-v2/4).
**Sizing:** One PR. Two consumers (Vāda + Herald refactored to use it). Bounded to @atta/ui
+ vada deliberate page + herald audit controls.
**Project(s) + blast radius:** vada (new deliberation input), herald (JdInputControl +
CvInputControl refactored), engine (in blast radius — @atta/ui change; verify Vāda still
deliberates and Herald still audits).
**Dependency rationale:** Depends on task 1 (Vāda deliberation route must be stable before
rewiring its input). Conflicts-with herald-agents-v2/4 (both touch Herald's audit input
components; serialize — this task merges first, then herald-agents-v2/4 consumes the
extracted component).
**Traps to avoid:** Keep the component domain-neutral — no CV/JD terminology in `@atta/ui`.
Labels, placeholders, accepted file types are all props, not hardcoded. Herald passes its
domain labels; Vāda passes its domain labels.
**Suggested agent-class:** mid — component extraction, two consumers.
**Stop-and-escalate:** If extracting the component requires changes to `@atta/ui`'s existing
Tailwind v4 token system or shadcn component wiring that have a wider blast radius, escalate
`severity:strategy`.

---

### Task 6 — Reviewers prompt iteration
**Boundary:** B-3b: run `vada__consult` with `spec_id: "vada-reviewers"`, read 3 reviewer
responses, judge behavior against the rev 5 spec §4.1.1 criteria, tweak system prompt in
the YAML, re-run. B-3c: same loop for the synthesizer (rev 5 spec §4.1.2). This is a
Principal-driven judgment loop — the Developer sets up the tooling and initial test run;
the Principal evaluates and iterates on the prompts. Deliverable: improved reviewer and
synthesizer YAMLs in `packages/agents/` with the iteration history documented.
**Sizing:** Research + prompt iteration. Principal-in-the-loop. One PR.
**Project(s) + blast radius:** vada only (YAMLs in packages/agents/).
**Dependency rationale:** Depends on task 1 — the YAMLs must be in their new package home
before iterating on them.
**Suggested agent-class:** high — prompt judgment, evaluation, iteration history.
**Stop-and-escalate:** If the Reviewers ERROR from task 1 is not fully resolved and the
team still errors during B-3b runs, stop and report — cannot iterate on a broken team.

---

### Task 7 — Agent tools + MCP support
**Boundary:** Refactor the Vāda deliberation UI (`/deliberate` page) to support tool-equipped
YAMLs. If a YAML declares `required_inputs` or `custom_tools`, the UI must: (a) show the
right input fields before dispatch (context-completeness validation — the user must supply
what the agent needs); (b) pass tool handlers to the adapter for custom tools. Wire up
`forensic-hiring-auditor` as a callable tool from a Vāda deliberation agent (a new
demonstration YAML that uses it). This is the realization of the "Vāda agents can use MCP
tools" vision.
**Sizing:** Large. One PR. This is the most complex task in the iteration — it touches the
UI input layer, the adapter wiring, and requires a new demonstration YAML.
**Project(s) + blast radius:** vada (deliberation UI + new YAML), engine (in blast radius —
the tool dispatch path goes through the adapter), aeg-core (if YAML schema changes for
`required_inputs` — assess).
**Dependency rationale:** Depends on task 1 (Vāda on new package structure) and task 5
(SmartTextInput must exist for the new input fields). Serialized last because it is the
most ambitious task and benefits from everything else landing first.
**Traps to avoid:** Do NOT require the YAML author to know the UI implementation — the YAML
declares `required_inputs` (declarative); the UI reads them and renders the right fields.
The coupling is YAML → UI (one direction). Do NOT hardcode Herald as the only tool — the
architecture must support any registered tool.
**Suggested agent-class:** high — architectural judgment, multi-layer change, new YAML design.
**Stop-and-escalate:** If making the UI context-completeness validation generic requires
a new YAML schema field not currently in `@atta/engine`'s flow-schema, escalate
`severity:strategy` — that is a shared-engine change with Vāda + Herald blast radius.

---

### Task 8 — First benchmark run
**Boundary:** B-4: six conditions per test case — A0 baseline, A1 baseline, VR-NS (Vāda
Reviewers no synthesis), VR-S-same (synthesis, same-vendor), VR-S-cross (synthesis, cross-
vendor), MW-where-available (multi-round where available). Manual judging by Claude in fresh
context; Dani final arbiter. Per-question-type breakdown required. Documents whether the
iteration's refactor (YAML migration + bug fixes + prompt iteration) improved output quality.
This is the validation layer for the whole iteration.
**Sizing:** Research + benchmark execution. One PR (results doc). Principal-in-the-loop.
**Project(s) + blast radius:** vada only.
**Dependency rationale:** Depends on task 6 (prompt iteration must complete first — benchmarking
against an un-iterated prompt gives no meaningful signal about whether the iteration improved
quality).
**Suggested agent-class:** high — judgment, synthesis, multi-model evaluation.
**Stop-and-escalate:** If the OpenAI + xAI keys are not yet added to Vercel (manual work
item in `now.md`), the cross-vendor benchmark conditions cannot run. Stop and flag — the
Principal must add the keys before dispatch.

## Backlog (this iteration, not yet dispatched)

- vada-reviewers-spec.md §8 patch (phantom consensus not in locked decisions) — patch
  opportunistically if touched, otherwise defer.
- Fate of experimental YAMLs (crucible, sparring, war-room) — decide after benchmark data.
- Hosted MCP hardening (E8-E12) — deferred, post-benchmark.

## Cross-iteration dependencies

- Task 1 here depends on herald-agents-v2/2 (package structure established first).
- Task 5 here conflicts-with herald-agents-v2/4. Serialize: vada-agents-v2/5 merges first,
  then herald-agents-v2/4 consumes the extracted @atta/ui component.
- Tasks 3 and 4 have no dependencies — can run from day 1 in parallel with everything.
