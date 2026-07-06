# AEG model — improvement findings (running log)

**Status:** draft · living reference · OUT of the AEG flow (a backlog of model improvements, not the model itself)

This file captures **candidate improvements to AEG the model** discovered in real time while *using* AEG — most often while planning or running an iteration and hitting a place where the model is thin, silent, or wrong. It exists because the repo is the source of truth: a finding that lives only in a conversation does not exist by AEG's own rules, and is lost when context compacts.

Each entry is a **candidate** until written into the model. When one is worked, it is written into the target doc (`aeg-root/roles/*.md`, `aeg-root/iterations/README.md`, the `brief-authoring` skill, or `aeg-root/state-machine.md`) and marked **WRITTEN INTO MODEL** here, with a pointer to where. A formal `D-###` decision entry can follow when the change warrants ratification ceremony; for governance-detail additions the Principal directed they go straight into the model in real time (this session).

Source discussion: the Herald → engine planning session (June 2026), the first iteration deliberately run as a "special" planning prototype to surface exactly these gaps.

---

## How to use this file

- **Add a finding the moment it surfaces** — don't wait for the end of a session. One paragraph is enough.
- Each finding: what's thin/wrong in the model today · the proposed addition · where it lands (which doc) · status.
- When a finding is written into the model, mark it **WRITTEN INTO MODEL** with the target doc, and leave it here as history.

---

## Findings

### F1 — The task carries a `Planner's rationale` (persist the planner's durable conclusions)

**Status:** ✅ WRITTEN INTO MODEL (2026-06-11) → `aeg-root/roles/planner.md` §"The Planner's rationale (mandatory, one block per task)". Mandatory block with required fields (boundary, sizing, blast radius, dependency rationale, traps-to-avoid, agent-class, stop-and-escalate); a task without it is refused. Still TODO: mirror the task/Issue shape note into `iterations/README.md` §4, and the "brief inherits the rationale" line into `brief-authoring` (see F3).

**The gap (kept for history).** The planner's output was topology only — title, project(s), depends-on, conflicts-with. But to *decide* those boundaries the planner reasons deeply about architecture, complexity, and entanglement. That reasoning was **thrown away** because "it's not the planner's job to persist it," forcing the Brief Author to re-derive it cold and letting the executing agent walk into traps the planner already saw.

**The distinction (now in the model).** Two kinds of knowledge: **durable conclusions** (why one task not three; dependency rationale; sizing; blast radius; traps; agent-class) which do NOT decay, and **perishable detail** (exact signatures, file lists, line-level specifics) which DO decay. Persist the durable; the brief re-derives the perishable just-in-time.

### F2 — Sizing requires deep technical analysis (the "too big?" tests)

**Status:** ✅ WRITTEN INTO MODEL (2026-06-11) → `aeg-root/roles/planner.md` §"You MUST dig deep to size" + the four "too big?" tests + a hard gate refusing to size without reading the code.

**The gap (kept for history).** `planner.md` presented split-vs-combine as a quick relational judgment. But you cannot know a task is the right size without digging into its internals — "is this too big?" is not answerable from topology. The doc was silent on this, risking oversized tasks.

**Now in the model.** The planner must read the actual code before emitting any task list; a plan made without it is malformed and refused. The four tests: (1) one verification story, (2) one agent can hold it, (3) bounded file surface, (4) single failure mode. Fail any → split.

### F3 — `brief-authoring` should mandate tech-dependency + tech-surface + agent-selection-with-reasoning as required sections

**Status:** OPEN · candidate · the one still-open finding
**Lands in:** `aeg-root/skills/brief-authoring/SKILL.md`

**The gap.** The Principal's theory of governance: **prompt-writing is the key act of controlling AI.** The brief is the prompt. Today `brief-authoring` requires context, scope, stop conditions, a doc-update list, and a `For:` (agent) line — but it does NOT make first-class an explicit **technical-dependency identification**, a **tech-surface map** (files/APIs/schemas it will touch), and a **declared agent/model with reasoning**.

**The proposed addition.** Make those three first-class required brief sections. They **build on F1's `Planner's rationale`** (now in the model) rather than starting cold — the brief inherits the planner's durable conclusions (boundary, blast radius, traps, agent-class) and adds the just-in-time perishable detail (current signatures, exact files, final model pick). This operationalizes prompt-writing-as-governance. **Next action:** write this into the `brief-authoring` skill.

### F4 — Agent/model selection: plan-time class vs brief-time pick

**Status:** ✅ WRITTEN INTO MODEL (2026-06-11) → `aeg-root/roles/planner.md` §"Agent/model selection: class at plan time, final pick at brief time". The planner suggests the agent-**class** at plan time (recorded in the rationale, part of sizing); the Brief Author confirms the final **model pick** at brief time. The brief-time half also belongs in `brief-authoring` (folds into F3).

### F5 — The planner's deep dig overturns a backlog sizing claim; shared-package change pulls all consumers into scope

**Status:** ✅ WRITTEN INTO MODEL (2026-06-11) → `aeg-root/roles/planner.md` §"The shared-package blast-radius rule" (mandatory, with the Vāda worked example + a hard gate) and §"A backlog's sizing/scope hints are inputs, not facts".

**What happened (the Herald case, kept for history).** The Herald backlog asserted multi-vendor BYOK is *"mostly a UI + plumbing job."* The dig into `packages/adapter-langgraph/src/llm.ts` overturned it: structured output exists **only on the Anthropic sdkShape** (`google-genai` and `openai-compat` return `structured: undefined`); Herald needs structured output and multi-vendor was confirmed required; therefore the feature forces a change to the **shared** `llm.ts`, and Vāda (which runs on it) enters the blast radius.

**The two rules now in the model:**
1. **A backlog's sizing/scope hints are inputs, not facts** — the planner verifies against code; the dig overrides the backlog.
2. **A shared-package change pulls every consumer into the task's `Project(s)` and review scope** — even when the consumer's app code isn't edited, because the Reviewer must verify it. Omitting a consumer is a sizing error the planner refuses and corrects.

This is also why "task 3 = multi-vendor BYOK (mostly UI)" split into **3a** (engine structured output — `engine, vada, herald`) and **3b** (Herald BYOK UI — `herald`, depends on 3a). See the iteration file `aeg-root/iterations/herald-onto-engine.md`.

### F6 — Iteration naming convention

**Status:** ✅ WRITTEN INTO MODEL (2026-06-11) → `aeg-root/iterations/README.md` §4 "Naming an iteration" + `aeg-root/roles/planner.md` §"Naming the iteration". Name the center-of-gravity / shared-infra work, not the narrowest downstream feature; a name must not imply narrower scope than `Project(s)`. Worked example: `herald-onto-engine`, not `herald-bulk-audit`.

---

## The planner↔brief seam (the synthesizing principle behind F1–F4)

Now reflected in `planner.md` (the rationale is the hand-off) and to be completed in `brief-authoring` (F3):

- **Both roles do a full deep technical pass** — there is no "shallow planner, deep brief." The difference is *purpose* and *what persists*.
- **Planner's pass → purpose: find the seams.** Persists: topology + durable conclusions (`Planner's rationale`). Discards: perishable line-level detail.
- **Brief's pass → purpose: execute one piece, now.** Inherits the planner's rationale; adds current perishable detail (files, signatures, final model). Lands in the PR body.
- **The unit of planner output is the task** — a row in the topology file + a thin forge Issue (now carrying the rationale). The brief is NOT the planner's output; it is written just-in-time by the Brief Author at dispatch.

---

## Remaining open work

- **F3** — write the tech-dependency + tech-surface + agent-selection-with-reasoning required sections into `aeg-root/skills/brief-authoring/SKILL.md`, inheriting from the Planner's rationale. (The brief-time half of F4 folds in here.)
- **F1 mirrors** — add the rationale to the task/Issue shape in `iterations/README.md` §4, and the "brief inherits the rationale" line in `brief-authoring`.
- Optional: a consolidated `D-###` in `packages/governance/decisions.md` recording the planner-discipline upgrade (F1/F2/F4/F5/F6) for ratification-trail completeness.
