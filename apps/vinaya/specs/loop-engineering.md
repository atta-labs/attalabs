# Loop Engineering — proposal (NOT ratified)

**Status:** proposal / design capture. Nothing here is decided. This doc preserves the thinking from the 2026-07-19 session so it survives to a future planning pass. It is not a spec to build against until a Type-1 decision ratifies the model.

**Scope:** how "loop engineering" scales AEG + Vinaya — where the loop lives, what it does, the vocabulary it forces, and how it graduates safely. Companion to the `iteration → tranche` rename (which is a prerequisite, see below).

---

## The one-line idea

A **loop** is a small external driver that automates the dispatch-verify-merge grind a human does today by hand. It *calls* Vinaya and dispatches agents; it is not baked into the model. AEG/Vinaya already work by hand — the loop just stops you pressing the buttons yourself.

## Why the loop is external (the "external ring")

AEG is **deliberately orchestrator-independent** (D-029, D-038): *"a tool may know AEG; AEG does not know the tool."* AEG is a black box that must run by hand on any repo with zero orchestration tooling. The project has repeatedly refused to bake orchestration in:

- Market-scan (D-030) explicitly **rejected** runner/orchestrator features (CI auto-fix loops, kanban, port allocation) *for the model* — tool-layer or invariant-violating.
- `vinaya worktree` was **cut** from the CLI as "orchestration smell" (D-090).
- **Cetana — the one orchestrator product — was retired** (D-095) and deleted (#576).

So a dispatch-loop engine inside AEG or the Vinaya checker would resurrect exactly what was just deleted. The loop must sit **on top**, reading AEG state, never contained by it. That preserves D-029: the loop is one optional tool that speaks AEG.

**AEG's role in loop engineering is not the runner — it's the sensors and setpoints.** Forge-derived typed state (`@atta/aeg-core` derivation) + structured recovery prompts are what make *any* outer loop safe to run. The actuator (the thing that dispatches agents) lives outside and is swappable: Claude Code's `/loop`, a CI job, a cron, a thin future runner.

## The loop primitive already ships

Ring-0 **self-correction** (D-100) is live today: every `vinaya check` failure emits `agent_recovery_prompt` — a corrective instruction addressed to the model that will act on it, then re-run. That is a closed control loop at check granularity. Loop engineering is the outward extension of this primitive.

## The ring model (graduation, not a big bang)

Vinaya config already reserves `ring1_forgeWriteInterception` and `ring2_asyncAudits`. The loop is the outer expression of that ring model:

| Ring | What loops | Status | Human still owns |
|------|-----------|--------|------------------|
| **0** | One check: fail → `agent_recovery_prompt` → fix → re-check | **shipped** (D-100) | nothing — fully auto |
| **1** | The task loop: read state → `vinaya check dispatch-readiness` → dispatch agent → gates → ring-0 recovery → merge → archive → next | proposed | tranche open/close |
| **2** | Async audit loops (skeptical passes off the main dispatch thread) | proposed | audit disposition |
| **meta** | The tranche loop: one tranche closes → next opens | proposed | open/close + **Type-1 ratification** |

**Safety line:** keep tranche open/close and Type-1 ratification human until ring 1 is proven, exactly as the manual-flow-first stance already says (decisions.md line ~419: "first cut is human-in-the-loop… automation is future work once the manual flow is proven"). Earn each ring outward.

## Why AEG is unusually loop-ready

A real loop needs machine-checkable **exit predicates**. AEG already has them, forge-derived and mechanized (they are the Archivist entry-gate + `checkDispatchReadiness`):

- task terminal = merged / dropped / moved
- tranche terminal = milestone closed + no open task work
- dispatch eligibility = `dispatch-readiness` (rationale gate + deps merged + no conflicting in-flight PR + prior tranche archived)

The hard part of loop engineering — "when does a pass stop?" — is already solved in the model.

## What's missing to build ring 1

1. **Selection policy** — `checkDispatchReadiness` says what's *eligible*; there's no "which eligible task next." Today the Principal picks. A policy (topological order? cheapest-first? conflict-avoiding parallel fill?) is new.
2. **Continue-vs-stop authority** — reuse **ratification windows** as the human-in-the-loop checkpoint; don't invent a new one.
3. **Guards** — per-pass token/cost/time ceiling; concurrency cap. `conflicts-with` edges already give parallel-dispatch collision avoidance.

## Vocabulary the loop forces (prerequisite: the rename)

Adding loops makes the `iteration → tranche` rename **mandatory**, because a loop genuinely iterates — two objects would both claim the word "iteration":

| Concept | Name | Note |
|---------|------|------|
| The running cadence (ring 1/2) | **loop** | the engine/driver |
| One turn of the loop | **iteration** | reclaimed — genuinely cyclic |
| The bounded, operator-cut batch of tasks | **tranche** | the cargo a turn advances; greps clean; product-orthogonal |

`loop` iterates; each `iteration` advances a `tranche`; a tranche closes when its milestone closes. Three words, zero collision. (Runner-up for the batch was `run`, rejected on grep-hygiene — `rg run` is catastrophic noise in a govern-by-grep repo, same failure that killed `lot`.)

## User experience (ring 1, target)

1. You cut a **tranche** — pick the related tasks to run together.
2. `vinaya loop <tranche>` (illustrative) — press start.
3. The loop reads the forge, asks Vinaya what's dispatchable, hands the next eligible task to a coding agent, which opens the PR.
4. Vinaya's gates run. On failure the loop feeds the failure's `agent_recovery_prompt` straight back — the agent self-corrects, no human.
5. Green → merge → next task. **Studio** shows it live: tasks flipping todo → in-flight → merged, one **iteration** of the loop per turn.
6. It pauses at judgment points (a Type-1 decision, tranche close) and asks you. You approve or steer; it resumes.
7. Last task merges → loop closes the tranche → stops.

You plan the cut, press start, supervise, approve the few human moments.

## Open questions (for the planning pass)

- Does the loop driver live as a `vinaya` subcommand, or as a separate optional tool, to keep the Vinaya checker orchestration-free? (Cetana's death + the `worktree` cut lean toward *separate/optional*, not a core `vinaya` verb.)
- Selection policy: deterministic topological, or pluggable?
- Ring-1 guard defaults (token/time ceilings, concurrency).
- How Studio renders a *running* loop vs. static forge state (live vs. derived).
- Is "meta / tranche loop" ever allowed to be non-human, or is opening a tranche permanently a human act?

---

*Captured 2026-07-19. Reference: D-029, D-030, D-038, D-090, D-095, D-100. Prerequisite: iteration→tranche rename tranche.*
