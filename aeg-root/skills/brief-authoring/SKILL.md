---
name: brief-authoring
description: Rules for authoring task briefs dispatched to Developer agents. Load when writing or reviewing a brief. Covers required sections, inheriting the Planner's rationale via the planner-brief contract, the mandatory technical-dependency / tech-surface-map / agent-selection-with-reasoning sections, the optional Ticket/Project fields, model selection, the model integration (tier field, principal_delegate, Type 1/2 declaration, lock acknowledgment), the mandatory worktree-first step, the brief-lands-in-the-PR-body rule, the explicit documentation-update list, the post-PR review passes, and anti-patterns.
---

<!-- CANONICAL SOURCE (D-039). This file is the canonical home of the `brief-authoring` skill, inside the AEG unit (aeg-root/skills/). The copy at .claude/skills/brief-authoring/SKILL.md is a GENERATED VIEW produced by `aeg generate-skills` for the agent harness that loads from .claude/ — edit THIS file, then regenerate; never edit the generated view by hand. -->

# Brief Authoring Rules

Every task brief the Team Leader writes or dispatches must follow these rules. They exist because vague briefs produce vague work, and well-structured briefs can be handed to any Developer agent — a coding agent dispatched by an automation layer, or a direct paste — with no additional context.

**This skill is Brief Author mode.** Load it when the Team Leader is authoring or reviewing a brief. Do not load for strategy/architecture (Strategist mode) or for planning a whole iteration (Planner mode — see `aeg-root/roles/planner.md`).

**Where the brief lives.** The brief is the task's full execution context. It is **pasted to the Developer, not committed**, and it **lands in the PR body** when the Developer opens the PR — that is its permanent, durable home, read by the Reviewer and Archivist. A brief is **never** put in the task's forge Issue (the Issue holds identity + metadata + the Planner's rationale, not the brief; a brief there would go stale before work starts). Context lives entirely in the brief: if it isn't in the brief, it doesn't exist.

**The brief is the prompt, and the prompt is where control over the agent lives.** Brief authoring is the single highest-leverage governance act in AEG: a precise brief makes a capable agent do exactly the right thing; a vague one makes the same agent improvise. Treat every required section below as a control surface, not paperwork.

---

## Start from the Planner's rationale — governed by the Planner→Brief contract

Every task you author a brief for arrives with a **Planner's rationale** (in the Issue body and the iteration file — see `roles/planner.md`). You are the **consumer side** of the **`aeg-root/contracts/planner-brief.md`** contract — the single source of truth for what crosses the Planner→Brief Author seam. That contract maps every field the Planner emits to the exact brief section that consumes it. **Read the contract; consume every right-column mapping — drop no field.**

The contract's field-by-field mapping (authoritative version lives in the contract; reproduced here for convenience — if they ever differ, the contract wins):

| Planner emits (rationale) | You consume it in |
|---|---|
| Boundary | Context (§2) + Technical Surface Map (§4) |
| Sizing | re-confirm only; if your dig finds it no longer fits → stop-and-escalate |
| Project(s) + blast radius | `Project:` field + blast-radius re-verification (§8) |
| Dependency rationale | Technical Dependencies (§3) |
| Traps to avoid | Context (§2) + Constraints (§10) |
| Suggested agent-class | `For:` + `Reason:` header (confirm/deviate; you make the final pick) |
| Stop-and-escalate | Stop conditions (§9) |

**Read it first and build on it. Do not start from a blank page.** The division of labor is deliberate:
- The **Planner** did a deep technical pass to find the seams and persisted the *durable* conclusions (which don't decay) — that's the contract's producer side.
- You do your own deep pass now, at dispatch, to add the *perishable* detail that has to be current (exact signatures, the precise file list, the final model pick) — because the codebase has moved since planning.

So the brief = the planner's rationale (inherited via the contract) + the current execution detail (you add). You are not re-deciding the boundary or the blast radius; you are turning the planner's conclusions into an executable prompt against today's code. If your dig contradicts the planner's rationale (the code moved enough to change the boundary or break the sizing), that is a `severity:strategy` stop-and-escalate back toward the Planner, **not** a silent override.

---

## Required sections (in order)

### 1. Header block

```
**For:** [model + environment, e.g., "Sonnet (a coding-agent CLI on a dev machine, interactive session)"]
**Reason:** [why this model/environment was chosen — see "Agent/model selection" below]
**Owner:** [who owns the task — the Principal, by default]
**Goal:** [one sentence: what ships]
```

### 2. Context — read before doing anything

Full background the executor needs:
- What the project is and what state it's in
- What was previously validated (reference prototypes, prior PRs, experiments)
- Why this work is happening now (not "later")
- What's locked and should not be relitigated
- Relevant decisions already made (reference decision-log entries by log + number)
- **The Planner's rationale for this task** (inherited via the contract — boundary, blast radius, traps, stop conditions). Carry it forward; the executor must see the planner's reasoning, not just the goal.

Length: as long as needed. This section prevents the executor re-deriving architecture that's already decided.

### 3. Technical dependencies (mandatory — the "what must already exist" map)

**List every technical precondition this task depends on, by name.** This is distinct from the forge `depends-on` edge (which is task→task); this is the *code/system* dependencies. It is where the Planner's **Dependency rationale** (the *why* of each edge) becomes the concrete *what-must-exist*. The executor must know what it is building on. Identify and state:
- **New shared exports/APIs it needs** — does this task require a function, type, or export that another task is adding to a shared package? (If yes, that's a `depends-on` and the export must exist at dispatch.)
- **Schema/migration preconditions** — does it need a DB column, a migration, a vendor-registry entry, a config key that must be present first?
- **Capability preconditions** — does it rely on a capability that may not exist yet (e.g. "structured output on this vendor")? If the capability is being added by a dependency task, say so and confirm it merged.
- **External services / credentials** — what must be provisioned and authenticated (keys, tokens, endpoints) for the task to run *and* to be verified?

A task whose technical dependencies aren't all satisfiable at dispatch is **not dispatchable** — STOP and surface it.

### 4. Technical surface map (mandatory — the "what this touches" map)

**Name the bounded set of files, packages, APIs, and schemas this task will create or modify.** This is the perishable detail the planner deliberately left to brief-time — derive it now, against the current codebase, starting from the planner's **Boundary**. It must be a *nameable, bounded* surface (if you cannot bound it, the task is too big — kick back to the Planner). Include:
- The exact files/dirs to create or modify (paths).
- The shared packages touched and — echoing the planner's blast radius — the consumers that must be re-verified.
- The APIs/schemas/contracts read or changed.
- What is explicitly **out of surface** (adjacent files the executor must NOT touch).

This map is what makes "only the expected files changed" checkable at review (Section 8) and what stops scope creep.

### 5. Pre-flight checks

Numbered checklist. **The first pre-flight step is always creating a worktree — no exceptions.**

#### Step 0 (mandatory, verbatim) — create the worktree

Every brief's pre-flight begins with the worktree command. Never write a brief that assumes the executor is already in the right place, and never tell it to "create a branch" without first creating a worktree:

```
git worktree add .worktrees/task/<iteration>/<n> -b task/<iteration>/<n> origin/main && cd .worktrees/task/<iteration>/<n>
```

The branch convention is `task/<iteration>/<n>` — this is what lets any role derive the task's status from the forge (branch exists, PR open, merged). When dispatched by an automation layer, the layer creates this worktree for you; the brief still states the command explicitly so a manual paste behaves identically.

This is non-negotiable because work done on the wrong branch or in a dirty main checkout is the most common, most expensive avoidable failure.

#### Remaining pre-flight checks

After the worktree exists, verify: working dir clean (`git status`); branch correct (`git log --oneline -3` shows `origin/main` as parent); target dir does/doesn't exist as required; required tools present at the right version; external services authenticated; reference material accessible; **every technical dependency from Section 3 is actually present** (the new export exists, the migration ran, the capability is live). **Also verify the dispatch gates against the forge:** every `depends-on` task's PR is merged, and no `conflicts-with` sibling's PR is open. Each check has a clear pass/fail; on failure the executor STOPs and reports.

### 6. Numbered parts with numbered tasks

Break work into Parts (major areas) and numbered tasks within each. Each task specifies: exact files to create/modify (from the Section 4 surface map); exact function/type signatures (not prose); constraints (no auto-remove, no extra tools, no UI in V0); verification steps. Do NOT leave implementation details to the executor's judgment unless you explicitly trust it and say so.

### 7. Documentation-update list (explicit, tier-tied)

Do not leave documentation as an implication of the tier checklist. **List the exact doc artifacts this brief must touch, by name.** This is what `verify-docs` (a real gate — Section 10) and the code-reviewer check against.

- **Tier 0** — usually none. State "No doc updates required (Tier 0)."
- **Tier 1** — name each: which spec(s) reflect the new behavior, which skill(s) if a convention shifted, `docs-index.md` if files were added/removed/renamed.
- **Tier 3** — all Tier 1 items, plus: the exact decision log (`aeg-project/decisions.md` or which `apps/*/specs/*-decisions.md`) and the D-### to append; which state docs change (`state.md`, `now.md`, `changelog.md`, the iteration file, per-project backlogs); whether a `Lock: YES` entry is created. **Never** list `roadmap.md` — it's retired; roadmap planning lives outside AEG.

A Tier 1+ brief with an empty doc-update list is malformed.

### 8. Verification before claiming done

Typecheck passes; lint passes; tests pass; production build passes (catches stricter resolution typecheck misses); manual smoke tests; **every consumer named in the blast radius (Section 4) re-verified** (a shared-package change must prove it didn't regress the other consumers — that's what putting them in `Project(s)` was for); the repo's `verify-docs --pr` gate passes (real gate — D-027); `git diff main --stat` confirms only expected files (the Section 4 surface) were touched. *(The exact commands are this repo's toolchain — substitute the repo's declared equivalents; the obligations are universal.)*

### 9. Stop conditions

Explicit list that causes STOP-and-report rather than improvising: pre-flight failures (incl. worktree couldn't be created); a technical dependency from Section 3 not actually present; a dispatch gate not satisfied (a `depends-on` PR not merged, or a `conflicts-with` sibling's PR open); the executor's own dig contradicts the inherited Planner's rationale (boundary moved / sizing broke — escalate `severity:strategy`); the task's stop-and-escalate condition from the Planner's rationale is hit; design gap discovered; test fails after multiple attempts; about to touch files outside the Section 4 surface; any destructive action not explicitly authorized.

### 10. Constraints

What the executor must NOT do: off-limits branches/paths (the out-of-surface set from Section 4); explicitly deferred features (do not add); the planner's **traps to avoid** turned into explicit "do NOT do X; do Y instead"; forbidden patterns (skipping verification hooks, an unapproved datastore, auto-remove); and — always — **never write status anywhere** (status is derived from the forge) and **never add execution metadata to the iteration file**.

### 11. Deliverable

What the executor opens/commits/creates at the end:
- PR title (exact format)
- **The brief pasted into the PR body** — plus the `Tier:` declaration (`Tier: 0|1|3`) and the `Closes #N` reference to the task's Issue (so the merge auto-closes it). The `Ticket:`/`Project:` lines (if present) ride into the PR body too.
- Files modified (`git diff main --stat`)
- PR description sections required
- What to report back and in what format

**The PR is not "done" when opened — it is done when it has passed review.** After the PR opens, Phase 10 (`process.md`): code-reviewer pass (independent, fresh context, `roles/reviewer.md`) → security pass (`roles/security.md`, runs the config-security scan if agent/MCP config changed) → Principal code review → TL spec review → merge. The brief ends by telling the Developer to open the PR and stop — the review passes are separate invocations; the Developer addresses REQUEST CHANGES / FAIL findings in follow-up commits on the same branch.

---

## Agent/model selection (with reasoning — the `For:` + `Reason:` lines are mandatory)

The brief MUST declare which agent/model runs the task **and why**. The planner already suggested an **agent-class** (high/mid/fast) in the rationale, as part of sizing; you **confirm the final pick** at dispatch, against current reality (the actual models available, the task's true difficulty now). This is the contract's "Suggested agent-class → `For:`/`Reason:`" mapping.

- Inherit the planner's class; only deviate with a stated reason.
- The `Reason:` line is not optional and not "because it's good" — it names *why this capability level fits this task* (e.g. "high — multi-file refactor crossing the engine boundary with three structured-output unknowns"; "mid — reuse of an existing component plus registry wiring, no architecture").
- The pick is the Brief Author's; the class was the Planner's. Class at plan time, pick at brief time.

| Situation | Model choice |
|-----------|-------------|
| Architecture judgment, multi-file coordination, debugging complex failures | a high-capability model |
| Clear spec, 1-2 files, mechanical implementation | a mid / fast model |
| Doc writing, markdown, specs | a mid-capability model |
| Cross-cutting review (reads many files, judges correctness) | a high-capability model |
| Code review / security review pass | judgment over speed — a high/mid model |

When an automation layer dispatches, it passes the model through; the brief can override per its own mechanism if needed. *(In this repo the model tiers are Opus / Sonnet / Haiku — substitute your provider's equivalents.)*

---

## Optional metadata fields (the reference fields)

These two qualify a task and ride into the PR body. Both are reference-only — never read as instruction.

```
**Project:** [project(s) this task touches — e.g. "vada" or "engine, herald"]
```
Multi-valued. Resolves against `aeg-root/projects.md`. **Required in a multi-project repo; omitted entirely in a single-project repo** (no registry → one project → no field). Routes the Developer to the right specs and the Archivist to the right per-project state; a value that doesn't resolve to a registry row makes the brief malformed (refuse, don't guess). It must match the Planner's `Project(s)` for the task, including every shared-package consumer in the blast radius — see `roles/planner.md` and the planner-brief contract.

```
**Ticket:** [external ticket link(s) — e.g. "SAT-412 — https://…"]
```
N↔M, reference-only provenance (the company's ticket system, e.g. Jira/Linear). No agent reads it, needs access to it, or is blocked by it; it is never a substitute for brief context. Omit if there's no ticket system.

---

## Model integration (the per-brief governance fields)

Every brief includes the following metadata. These fields gate dispatch and ratification.

### Required

```
**Tier:** [0 | 1 | 3]
```

- **Tier 0** — trivial. Checklist: typecheck, lint, tests, PR description.
- **Tier 1** — implementation. Checklist: Tier 0 + specs updated + `verify-docs` passes.
- **Tier 3** — project/roadmap change. Checklist: Tier 1 + decision log entry + state docs updated + lock entry if applicable.

When in doubt, assign Tier 3. verify-docs defaults to Tier 3 when the PR body has no `Tier:` field, so always declare it explicitly.

### Optional

```
**principal_delegate:** [scope of any authority delegated to the Developer]
```
Present only when the Principal explicitly delegates a decision. Without it, contested choices escalate via the escalation mechanism. Scope must be specific: "Developer may choose the output format," not "Developer may decide architecture."

```
**spike:** true
```
Exploratory briefs only. Reduces to typecheck + lint + a decision log entry capturing what was tried and learned. Spike code does not merge.

### Type 1/2 declaration

If the brief executes a Type 1 (irreversible) decision:

```
**Executes Type 1 decision:** D-### — [one-line description]
**Ratified:** [date, or "PENDING — do not dispatch until ratified"]
```

A brief executing a PENDING Type 1 decision is not dispatchable.

### Lock acknowledgment

If the brief touches a locked area (`decisions.md` entries with `Lock: YES`):

```
**Conforms to lock:** D-### — [description]
```
or
```
**Challenges lock:** D-### — [description]
**Rationale:** [why the lock should be revised]
```

A lock challenge is a Type 1 decision requiring Principal ratification before dispatch.

### Briefs are frozen after dispatch

Once dispatched, a brief is frozen. The Developer executes what was dispatched — no mid-task amendments. If scope must change after dispatch: stop the task (via the escalation mechanism with stop instructions), author a new brief with the revised scope, dispatch the new brief. The original brief is preserved as the audit record.

---

## Handling ambiguity in briefs

Use **`[NEEDS CLARIFICATION]`** inline markers to surface gaps rather than guessing:

```
[NEEDS CLARIFICATION: Which DB table owns this? users or sessions?]
[NEEDS CLARIFICATION: Should this endpoint require auth? Not stated.]
```

**Use it when:** two reasonable interpretations exist and the wrong one means a re-do; the brief references a decision not yet logged; a constraint (auth, timeout, error behavior) is implied but unstated; you're unsure an existing pattern applies. **Do not use it for:** stylistic preferences (pick one, note it); things resolvable by reading the codebase (read first); pure implementation details (the Developer decides).

**Resolution protocol:** before dispatching, collect all markers, present them to the Principal as a numbered list, wait for resolution on each (don't dispatch with unresolved markers), replace each with the answer inline. If the Principal defers one, replace with `[DEVELOPER DECIDES: ...]` so the executor knows it's intentional.

A pre-flight `[NEEDS CLARIFICATION]` should be resolved in the brief; if an ambiguity surfaces mid-execution instead, the Developer escalates via the escalation mechanism — but a well-authored brief anticipates most of these.

Source: GitHub Spec Kit evaluation, May 12, 2026. Adopted as inline convention only — Spec Kit CLI not adopted.

---

## Anti-patterns

- ❌ Starting from a blank page instead of the Planner's rationale — re-deriving (often differently) what the planner already concluded, and losing the traps the planner flagged
- ❌ Dropping any field of the planner-brief contract — every rationale field has a named home in the brief; a dropped field is a lost conclusion
- ❌ Omitting the Technical Dependencies section — the executor discovers mid-task that something it needs doesn't exist yet
- ❌ Omitting the Technical Surface Map — "only expected files changed" becomes uncheckable and scope creeps
- ❌ A `For:`/`Reason:` line with no real reasoning ("Sonnet because it's good") — the capability choice must be justified against the task
- ❌ Dropping a blast-radius consumer from verification — a shared-package change ships a regression in a consumer nobody re-checked
- ❌ Omitting the worktree-first Step 0 — the executor starts on the wrong branch or a dirty main checkout
- ❌ Telling the executor to "create a branch" without first creating a worktree
- ❌ Putting the brief in the Issue instead of handing it over to land in the PR body
- ❌ "Implement X as you see fit" — the executor has no taste, only instructions
- ❌ Omitting pre-flight checks (incl. the forge dispatch gates + technical-dependency presence) — the executor starts on a dirty tree or against an unmet dependency
- ❌ An empty documentation-update list on a Tier 1+ brief
- ❌ Listing `roadmap.md` in a doc-update list — it's retired
- ❌ Instructing the executor to write status anywhere — status is derived from the forge
- ❌ Not specifying stop conditions — the executor improvises when it should ask
- ❌ Conflating what with how — specify BOTH
- ❌ Leaving scope boundaries implicit — the executor will touch adjacent files
- ❌ Skipping the deliverable section
- ❌ Treating "PR opened" as "done" — done is "passed code-review + security review"
- ❌ Assuming the executor has read prior session context — it hasn't
- ❌ A `Project:` value that doesn't resolve against the registry, or that omits a blast-radius consumer the Planner listed — malformed; fix or `aeg add-project` first

---

## Canonical example

A well-formed prior build brief (all sections, explicit pre-flight with pass/fail conditions, numbered parts with function signatures, explicit stop conditions, a precise deliverable format) is the reference shape. *(In this repo, the Cetana V0 build brief is the worked example.)*
