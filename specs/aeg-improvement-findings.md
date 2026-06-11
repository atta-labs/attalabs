# AEG model — improvement findings (running log)

**Status:** draft · living reference · OUT of the AEG flow (a backlog of model improvements, not the model itself)

This file captures **candidate improvements to AEG the model** discovered in real time while *using* AEG — most often while planning or running an iteration and hitting a place where the model is thin, silent, or wrong. It exists because the repo is the source of truth: a finding that lives only in a conversation does not exist by AEG's own rules, and is lost when context compacts.

Each entry is a **candidate**, not a ratified change. When one is worked, it becomes a Type-1-sized decision (new/changed role behavior or artifact) against `aeg-root/roles/*.md`, `aeg-root/iterations/README.md`, the `brief-authoring` skill, or `aeg-root/state-machine.md`, with its own `D-###` entry. Until then it lives here so it is not lost.

Source discussion: the Herald Bulk Audit planning session (June 2026), the first iteration deliberately run as a "special" planning prototype to surface exactly these gaps.

---

## How to use this file

- **Add a finding the moment it surfaces** — don't wait for the end of a session. One paragraph is enough.
- Each finding: what's thin/wrong in the model today · the proposed addition · where it lands (which doc) · status.
- When a finding is implemented, mark it `IMPLEMENTED (D-###)` and leave it here as history (append-only spirit).

---

## Findings

### F1 — The task should carry a `Planner's rationale` (persist the planner's durable conclusions)

**Status:** OPEN · candidate · highest priority of this batch
**Lands in:** `aeg-root/iterations/README.md` (the task/Issue shape) + `aeg-root/roles/planner.md` (the planner must write it) + `aeg-root/skills/brief-authoring/SKILL.md` (the brief inherits it)

**The gap.** Today the planner's output is topology only — title, project(s), depends-on, conflicts-with. But to *decide* those boundaries the planner must reason deeply about architecture, complexity, and entanglement (e.g. "engine migration + endpoint unification are one task because `runSingleMatch` is the shared seam"). That reasoning is **thrown away** purely because "it's not the planner's job to persist it." The Brief Author then re-derives the same architectural conclusions cold. That is a real loss.

**The distinction that resolves it.** The planner produces two kinds of knowledge: **durable conclusions** (why this is one task not three; the dependency *rationale*; rough complexity/sizing; suggested agent-class) which do NOT decay, and **perishable detail** (exact signatures, file lists, line-level specifics) which DO decay because earlier tasks change them before this one runs. The earlier "decay" argument for keeping the plan lean applies ONLY to the perishable detail. The durable conclusions must be kept.

**The proposed addition.** Add a `Planner's rationale` section to the task (the thin Issue + optionally a note in the topology file): a short, durable record of the architectural conclusions that justify the task's boundary, size, dependencies, and **suggested agent-class** — NOT the perishable execution detail. The Brief Author then *starts from* this rationale and adds only the just-in-time specifics. The planner stays lean on perishable detail; it persists its reasoning.

Example (Herald task 1):
```
Planner's rationale:
- One task, not two: runSingleMatch is the shared seam — migrating the cell
  and unifying the endpoint touch the same code; splitting means refactoring
  the cell twice.
- Two projects (herald + engine): verification-coupled — the only proof the
  engine migration is correct is Herald's audit running on it.
- Size: bounded — one cell, one endpoint, one YAML flow. Right for one PR.
- Suggested agent-class: high-capability (multi-file refactor across a
  package boundary).
```

### F2 — `planner.md` must state that sizing requires deep technical analysis (the "too big?" tests)

**Status:** OPEN · candidate
**Lands in:** `aeg-root/roles/planner.md`

**The gap.** `planner.md` presents split-vs-combine as a quick relational judgment. But you cannot know a task is the right size without digging into its internals — "is this too big?" is not answerable from topology. The role doc is silent on this, which understates what the planner must actually do and risks oversized tasks slipping through.

**The proposed addition.** State explicitly that the planner performs deep per-task technical analysis to validate sizing/boundaries (even though it persists only the conclusions — see F1). Add the **"too big?" tests** a task must pass before it's allowed onto the list:
1. **One verification story** — a reviewer can confirm correctness in one coherent check. (Needs three unrelated proofs → three tasks.)
2. **One agent can hold it** — fits a single agent's working context without juggling unrelated concerns.
3. **Bounded file surface** — touches a nameable, bounded set of files, not "and wherever else."
4. **Single failure mode** — if it fails, one diagnosable failure, not many.
A task failing any test is too big and must be split.

### F3 — `brief-authoring` should mandate tech-dependency + tech-surface + agent-selection-with-reasoning as required sections

**Status:** OPEN · candidate
**Lands in:** `aeg-root/skills/brief-authoring/SKILL.md`

**The gap.** The Principal's theory of governance: **prompt-writing is the key act of controlling AI.** The brief is the prompt. Today `brief-authoring` requires context, scope, stop conditions, a doc-update list, and a `For:` (agent) line — but it does NOT make first-class the things that most determine whether the agent does the right, controlled thing: an explicit **technical-dependency identification** (does this need a new engine export? a migration? a vendor-registry entry?), a **tech-surface map** (the files/APIs/schemas it will touch), and a **declared agent/model with reasoning** (not just a name — *why* this model).

**The proposed addition.** Make those three first-class required brief sections. Crucially, they **build on F1's `Planner's rationale`** rather than starting cold — the brief inherits the planner's durable conclusions (boundary, suggested agent-class) and adds the just-in-time perishable detail (current signatures, exact files, final model pick). This is where prompt-writing-as-governance is operationalized.

### F4 — Agent/model selection: plan-time class vs brief-time pick

**Status:** OPEN · candidate (partly resolved by F1 + F3)
**Lands in:** `aeg-root/roles/planner.md` + `aeg-root/skills/brief-authoring/SKILL.md`

**The gap / resolution.** Is "which agent/model runs this" a planner decision or a brief decision? The F1/F3 split answers it: the planner suggests the **agent-class** at plan time (part of sizing — "is this too big for a fast model?"), recorded in `Planner's rationale`; the Brief Author confirms the **final pick** at brief time against current reality. Carry as a finding so the two role docs state this consistently when F1/F3 are implemented.

---

## The planner↔brief seam (the synthesizing principle behind F1–F4)

The model is fuzzy on who-does-what between Planner and Brief Author. The principle these findings converge on, to be written into both role docs:

- **Both roles do a full deep technical pass** — there is no "shallow planner, deep brief." The difference is *purpose* and *what persists*.
- **Planner's pass → purpose: find the seams.** Persists: topology + durable conclusions (`Planner's rationale`). Discards: perishable line-level detail (it'll be stale by execution).
- **Brief's pass → purpose: execute one piece, now.** Inherits the planner's rationale; adds current perishable detail (files, signatures, final model). Lands in the PR body.
- **The unit of planner output is the task** — a row in the topology file + a thin forge Issue. The brief is NOT the planner's output; it is written just-in-time by the Brief Author at dispatch.

---

*When any finding here is implemented, log the corresponding `D-###` in `aeg-project/decisions.md`, update the target doc, and mark the finding `IMPLEMENTED (D-###)` above.*
