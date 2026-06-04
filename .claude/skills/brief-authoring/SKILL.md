---
name: brief-authoring
description: Rules for authoring task briefs dispatched to Developer agents. Load when writing or reviewing a brief. Covers required sections, the optional Ticket/Product fields, model selection, v3 model integration (tier field, principal_delegate, Type 1/2 declaration, lock acknowledgment), the mandatory worktree-first step, the brief-lands-in-the-PR-body rule, the explicit documentation-update list, the post-PR review passes, and anti-patterns.
---

# Brief Authoring Rules

Every task brief the Team Leader writes or dispatches must follow these rules. They exist because vague briefs produce vague work, and well-structured briefs can be handed to any Developer agent — Claude Code via an automation layer, or a direct paste — with no additional context.

**This skill is Brief Author mode.** Load it when the Team Leader is authoring or reviewing a brief. Do not load for strategy/architecture (Strategist mode) or for planning a whole iteration (Planner mode — see `project-management/roles/planner.md`).

**Where the brief lives.** The brief is the task's full execution context. It is **pasted to the Developer, not committed**, and it **lands in the PR body** when the Developer opens the PR — that is its permanent, durable home, read by the Reviewer and Archivist. A brief is **never** put in the task's GitHub Issue (the Issue holds identity + metadata only; a brief there would go stale before work starts). Context lives entirely in the brief: if it isn't in the brief, it doesn't exist.

---

## Required sections (in order)

### 1. Header block

```
**For:** [model + environment, e.g., "Sonnet (Claude Code on Mac, interactive session)"]
**Reason:** [why this model/environment was chosen]
**Owner:** [who owns the task — always Dani for now]
**Goal:** [one sentence: what ships]
```

### 2. Context — read before doing anything

Full background the executor needs:
- What the product is and what state it's in
- What was previously validated (reference prototypes, prior PRs, experiments)
- Why this work is happening now (not "later")
- What's locked and should not be relitigated
- Relevant decisions already made (reference decision-log entries by log + number)

Length: as long as needed. This section prevents the executor re-deriving architecture that's already decided.

### 3. Pre-flight checks

Numbered checklist. **The first pre-flight step is always creating a worktree — no exceptions.**

#### Step 0 (mandatory, verbatim) — create the worktree

Every brief's pre-flight begins with the worktree command. Never write a brief that assumes the executor is already in the right place, and never tell it to "create a branch" without first creating a worktree:

```
git worktree add .worktrees/task/<iteration>/<n> -b task/<iteration>/<n> origin/main && cd .worktrees/task/<iteration>/<n>
```

The branch convention is `task/<iteration>/<n>` — this is what lets any role derive the task's status from the forge (branch exists, PR open, merged). When dispatched by an automation layer, the layer creates this worktree for you; the brief still states the command explicitly so a manual paste behaves identically.

This is non-negotiable because work done on the wrong branch or in a dirty main checkout is the most common, most expensive avoidable failure.

#### Remaining pre-flight checks

After the worktree exists, verify: working dir clean (`git status`); branch correct (`git log --oneline -3` shows `origin/main` as parent); target dir does/doesn't exist as required; required tools present at the right version; external services authenticated; reference material accessible. **Also verify the dispatch gates against the forge:** every `depends-on` task's PR is merged, and no `conflicts-with` sibling's PR is open. Each check has a clear pass/fail; on failure the executor STOPs and reports.

### 4. Numbered parts with numbered tasks

Break work into Parts (major areas) and numbered tasks within each. Each task specifies: exact files to create/modify; exact function/type signatures (not prose); constraints (no auto-remove, no extra tools, no UI in V0); verification steps. Do NOT leave implementation details to the executor's judgment unless you explicitly trust it and say so.

### 5. Documentation-update list (explicit, tier-tied)

Do not leave documentation as an implication of the tier checklist. **List the exact doc artifacts this brief must touch, by name.** This is what `verify-docs` (a real gate — Section 8) and the code-reviewer check against.

- **Tier 0** — usually none. State "No doc updates required (Tier 0)."
- **Tier 1** — name each: which spec(s) reflect the new behavior, which skill(s) if a convention shifted, `docs-index.md` if files were added/removed/renamed.
- **Tier 3** — all Tier 1 items, plus: the exact decision log (`project-management/decisions.md` or which `apps/*/specs/*-decisions.md`) and the D-### to append; which PM docs change (`state.md`, `now.md`, `changelog.md`, the iteration file, per-product backlogs); whether a `Lock: YES` entry is created. **Never** list `roadmap.md` — it's retired; product planning lives outside AEG.

A Tier 1+ brief with an empty doc-update list is malformed.

### 6. Verification before claiming done

Typecheck passes; lint passes; tests pass; production build passes (`bun run build` — catches stricter resolution typecheck misses); manual smoke tests; `bun run verify-docs --pr` passes (real gate — D-027); `git diff main --stat` confirms only expected files were touched.

### 7. Stop conditions

Explicit list that causes STOP-and-report rather than improvising: pre-flight failures (incl. worktree couldn't be created); a dispatch gate not satisfied (a `depends-on` PR not merged, or a `conflicts-with` sibling's PR open); design gap discovered; test fails after multiple attempts; about to touch files outside scope; any destructive action not explicitly authorized.

### 8. Constraints

What the executor must NOT do: off-limits branches/paths; explicitly deferred features (do not add); forbidden patterns (`--no-verify`, SQLite, auto-remove); and — always — **never write status anywhere** (status is derived from the forge) and **never add execution metadata to the iteration file**.

### 9. Deliverable

What the executor opens/commits/creates at the end:
- PR title (exact format)
- **The brief pasted into the PR body** — plus the `Tier:` declaration (`Tier: 0|1|3`) and the `Closes #N` reference to the task's Issue (so the merge auto-closes it). The `Ticket:`/`Product:` lines (if present) ride into the PR body too.
- Files modified (`git diff main --stat`)
- PR description sections required
- What to report back and in what format

**The PR is not "done" when opened — it is done when it has passed review.** After the PR opens, Phase 10 (`process.md`): code-reviewer pass (independent, fresh context, `roles/reviewer.md`) → security pass (`roles/security.md`, runs AgentShield if `.claude/`/MCP config changed) → Principal code review → TL spec review → merge. The brief ends by telling the Developer to open the PR and stop — the review passes are separate invocations; the Developer addresses REQUEST CHANGES / FAIL findings in follow-up commits on the same branch.

---

## Optional metadata fields (the reference fields)

These two qualify a task and ride into the PR body. Both are reference-only — never read as instruction.

```
**Product:** [product(s) this task touches — e.g. "vada" or "engine, herald"]
```
Multi-valued. Resolves against `project-management/products.md`. **Required in a multi-product repo; omitted entirely in a single-product repo** (no registry → one product → no field). Routes the Developer to the right specs and the Archivist to the right per-product PM; a value that doesn't resolve to a registry row makes the brief malformed (refuse, don't guess). A task may legitimately span products when verification couples them — see `roles/planner.md`.

```
**Ticket:** [external ticket link(s) — e.g. "SAT-412 — https://…"]
```
N↔M, reference-only provenance (Jira/Linear). No agent reads it, needs access to it, or is blocked by it; it is never a substitute for brief context. Omit if there's no ticket system.

---

## Model selection rules

| Situation | Model choice |
|-----------|-------------|
| Architecture judgment, multi-file coordination, debugging complex failures | Opus or Sonnet |
| Clear spec, 1-2 files, mechanical implementation | Sonnet or Haiku |
| Doc writing, markdown, specs | Sonnet |
| Cross-cutting review (reads many files, judges correctness) | Opus |
| Code review / security review pass | Opus or Sonnet (judgment over speed) |

Specify the model explicitly in the brief header. When an automation layer dispatches, it passes the model through; the brief can override per its own mechanism if needed.

---

## V3 Model Integration

Every brief includes the following metadata. These fields gate dispatch and ratification.

### Required

```
**Tier:** [0 | 1 | 3]
```

- **Tier 0** — trivial. Checklist: typecheck, lint, tests, PR description.
- **Tier 1** — implementation. Checklist: Tier 0 + specs updated + `verify-docs` passes.
- **Tier 3** — product/roadmap change. Checklist: Tier 1 + decision log entry + PM docs updated + lock entry if applicable.

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

- ❌ Omitting the worktree-first Step 0 — the executor starts on the wrong branch or a dirty main checkout
- ❌ Telling the executor to "create a branch" without first creating a worktree
- ❌ Putting the brief in the Issue instead of handing it over to land in the PR body
- ❌ "Implement X as you see fit" — the executor has no taste, only instructions
- ❌ Omitting pre-flight checks (incl. the forge dispatch gates) — the executor starts on a dirty tree or against an unmet dependency
- ❌ An empty documentation-update list on a Tier 1+ brief
- ❌ Listing `roadmap.md` in a doc-update list — it's retired
- ❌ Instructing the executor to write status anywhere — status is derived from the forge
- ❌ Not specifying stop conditions — the executor improvises when it should ask
- ❌ Conflating what with how — specify BOTH
- ❌ Leaving scope boundaries implicit — the executor will touch adjacent files
- ❌ Skipping the deliverable section
- ❌ Treating "PR opened" as "done" — done is "passed code-review + security review"
- ❌ Assuming the executor has read prior session context — it hasn't
- ❌ A `Product:` value that doesn't resolve against the registry — malformed; fix or `aeg add-product` first

---

## Canonical example

The Cetana V0 build brief (the dispatch session that originated it) is a reference for a well-formed brief: all sections, explicit pre-flight with pass/fail conditions, numbered parts with function signatures, explicit stop conditions, and a precise deliverable format.
