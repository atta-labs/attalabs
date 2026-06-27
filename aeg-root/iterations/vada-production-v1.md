# Iteration: vada-production-v1 — June–July 2026
Lifecycle: active

Goal: Make Vāda production-ready. Migrate all YAMLs into `packages/agents/`; equip
reviewer tools in T3a after the T3 substrate lands; add Fusion as a first-class team
(real + native pattern); run a DRACO-style benchmark across all teams + Fusion on
identical prompts; replace `CalculatorStats` estimates with measured cost/time/tokens/quality
on the Teams page; add SmartTextInput and deliberation UI tool support. Exit bar:
tool-equipped reviewers, 4+ teams in catalog, repeatable benchmark, Teams page shows
measured stats publicly.

Repo: daniboomerang/attalabs · Team Leader: Claude (web)

Previously completed in vada-agents-v2 (carry-forward, not re-dispatched):
- Task 3 (trust page rewrite) — merged PR #146 ✅
- Task 4 (homepage rewrite) — merged PR #147 ✅

## Tasks (topology)

| #   | Task                                                                                                                                                                         | Issue | Project(s)              | Depends-on       | Conflicts-with |
|-----|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------|-------------------------|------------------|----------------|
| S0  | Tools/MCP capability spike — determine what agents can be equipped with (in-process custom tools, per-vendor web search, external MCP servers); produce capability matrix + recommended substrate approach | #174  | vada, engine, adapter   | —                | —              |
| 1   | YAML migration + bug fixes — all 9 YAMLs to `packages/agents/`; Vāda thin consumer; fix Reviewers ERROR + Sparring duplicate-Critic; update YAML-location refs. Tool-equipping moved to T3a (see D-053). | #175  | vada, engine            | #174, #168       | —              |
| 2   | Stale spec cleanup — vada-state.md full rewrite, CLAUDE.md, teams-catalog stale refs, byok refs, backlog                                                                      | #176  | vada                    | #175             | —              |
| 3   | Tool/MCP substrate — generalize tool support in the adapter so any YAML can declare tools/MCPs; OpenRouter plugin-param passthrough                                           | #177  | vada, engine, adapter, herald | #174, #175 | —              |
| 3a  | Equip reviewers — give Gemini/GPT/Grok reviewer agents web search + reachable vendor-native tools using T3 substrate; tool config declarative in YAML, not hardcoded in the route | #178  | vada, adapter           | #177             | —              |
| 4   | `vada-fusion` (real Fusion) — single-agent YAML routed through `vendor: openrouter`, `model: openrouter/fusion`; add `OPENROUTER_API_KEY`                                    | #179  | vada                    | #175             | —              |
| 5   | `vada-fusion-native` — own parallel-panel → synthesizer → audit flow; tool-equipped; adopt Fusion techniques (web-off synthesis, partial-coverage + blind-spots categories, gating) | #180  | vada, adapter           | #177             | —              |
| 6   | SmartTextInput — extract multi-kind input from Herald's JD/CvInputControl into `@atta/ui`; wire into Vāda `/deliberate`; Herald wrappers internal-only refactor, external props unchanged | #181  | vada, herald, atta      | #175             | #170 (herald-agents-v2/4) |
| 7   | Deliberation UI tool/MCP support — YAML declares `required_inputs`; UI validates context-completeness before dispatch; tool-equipped YAMLs runnable end-to-end                | #182  | vada, engine, adapter   | #177, #181       | —              |
| 8   | Reviewers prompt iteration — B-3b + B-3c; Principal-driven loop; incorporate Fusion techniques; patch vada-reviewers-spec.md §8 phantom consensus                             | #183  | vada                    | #178             | —              |
| 9   | Benchmark harness — repeatable runner across all conditions (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW, FUSION-default, FUSION-native); capture measured cost/latency/tokens; structured DB storage; implement §6a comparison protocol | #184  | vada                    | #175, #179       | —              |
| 10  | Quality audit — DRACO-style weighted rubric; blind LLM judge (not a panelist) + second-judge sanity check; negative marking; per-question-type breakdown; full conditions matrix | #185  | vada                    | #183, #184       | —              |
| 11  | Benchmark run + results doc — execute; document; decide fate of rounds teams from data                                                                                        | #186  | vada                    | #185             | —              |
| 12  | Teams page = live measured stats — replace `CalculatorStats` with measured cost/time/tokens/quality per team from DB; reconcile with `/bench`; public                         | #187  | vada                    | #186             | —              |
| 13  | Production hardening — hosted MCP hardening (E8–E12), error states, observability confirmed, Reviewers ERROR fully closed                                                     | #188  | vada, engine, adapter   | #177, #186       | —              |
| 6a  | Deliberate-page production UX — frontier-chat hero input, morphing Configure↔Submit, dropdown restyle + short labels (kills Council "reviewers" misnomer), team-identity Configure modal, tool-badge corner glyph + `badgeLeft` slot, `RouteAwareFooter` Vāda-only | —     | vada, @atta/ui          | #181             | —              |
| 6b  | Council teams + CouncilFeed view — `vada-council` + `vada-council-synthesis` YAMLs (D-035 vada-local); N-column results view (`CouncilFeed`) with vendor-color spheres (`resolveVendorColor → VENDORS[v].color`), completion-fill streaming, locked `{ agreements, disagreements, bottomLine }` synthesis contract; per-spec routing | —     | vada, packages/agents   | #175             | —              |
| 6c  | `SmartPromptInput` dependency-injection governance — shared composite resolves no library; consumers inject primitives (Vāda from `@atta/ui`, Herald from `useComponents()`); native first-paint fallbacks; closes #213; ratifies D-064 | —     | @atta/ui, vada, herald  | #181             | T6 (absorbed)  |

> **Note:** 6a/6b/6c were absorbed into the in-flight T6 branch under explicit Principal instruction ("keep the deliberate-page work atomic"). They are forge-derived as part of PR #207 (the original tool-badges PR). Topology-only here per AEG convention — status / PR numbers live on the forge.

## Out-of-iteration (landed on this branch by Principal decision, NOT part of `vada-production-v1`)

- **TextReveal component** — added to the `@atta/ui` contract and all four libraries; wired into the Deliberate empty-state hero. Merged in from the sibling branch `task/vada-production-v1/text-reveal`.
- **Herald `JDInput` refactor** — switched to the new `bare` `Textarea` variant aligned with Vāda; supersedes the earlier "Herald byte-identical" note from the PR's initial scope. Belongs in a future Herald-iteration topology if regression-tested as an architectural change.
- **Admin theme-editor routing fix** (`tools/admin`) — commit `a8a0f5c6`. Kept on this branch per maintainer instruction; carries one Herald owner-tree file under the Doc-waiver in the PR body. Not a Vāda task.
- **Sanity CMS theme contrast fixes** — Obsidian, Cobalt, KPOP Demon Hunter, Sage, Storm. Non-code, WCAG AA. Not a Vāda task.

## Backlog (this iteration, not yet dispatched)

- `FUSION-matched` condition — Fusion configured with the same panel + judge models as
  VR-S-cross, isolating synthesis prompt discipline vs their judge prompt. Requires T3's
  OpenRouter plugin passthrough to be proven and stable. Fast-follow after T13.
- External MCP server equipping (Option C) — agents declare `mcp_servers`; requires a new
  `@atta/engine` flow-schema field (`FlowAgentSchema` + `FlowAgent` + `compile-flow.ts`
  propagation) with blast radius across Vāda + Herald. Deferred — needs a deliberate
  engine-schema decision before dispatch. Conforms-to: D-053.
- Regulation → AEG mechanism mapping doc (EU AI Act / SLSA) turning benchmark output
  into compliance evidence — deferred, noted in D-030.
- `aeg.sh generate-skills` step to rebuild `.claude/` harness view — deferred.

## Cross-iteration dependencies

- T1 (#175) depends on herald-agents-v2/2 (#168) — package shape + glob already established.
- T6 (#181) conflicts-with herald-agents-v2/4 (#170) — SmartTextInput extraction must merge first.
- T3 (#177) touches the shared adapter — herald audit must be re-verified (blast radius).

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
