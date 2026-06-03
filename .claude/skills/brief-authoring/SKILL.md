---
name: brief-authoring
description: Rules for authoring task briefs dispatched to Developer agents. Load when writing or reviewing a brief. Covers required sections, model selection, v3 model integration (tier field, principal_delegate, Type 1/2 declaration, lock acknowledgment), the mandatory worktree-first step, the explicit documentation-update list, the post-PR review passes, and anti-patterns.
---

# Brief Authoring Rules

Every task brief the Team Leader writes or dispatches must follow these rules. They exist because vague briefs produce vague work, and well-structured briefs can be handed to any Developer agent — Claude Code via Cetana dispatch, or a direct paste — with no additional context.

**This skill is in Brief Author mode.** Load it when the Team Leader is authoring or reviewing a brief. Do not load for strategy or architectural questions — those are Strategist mode.

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

Full background the executor needs. Includes:
- What the product is and what state it's in
- What was previously validated (reference prototypes, prior PRs, experiments)
- Why this work is happening now (not "later")
- What's locked and should not be relitigated
- Relevant decisions already made (reference decision doc entries)

Length: as long as needed. This section prevents the executor from re-deriving architecture that's already been decided.

### 3. Pre-flight checks

Numbered checklist. **The first pre-flight step is always creating a worktree — no exceptions.**

#### Step 0 (mandatory, verbatim) — create the worktree

Every brief's pre-flight begins with the worktree creation command. Never write a brief that assumes the executor is already in the right place, and never tell the executor to "create a branch" without first creating a worktree. The very first commands the executor runs are:

```
git worktree add .worktrees/<branch-name> -b <branch-name> origin/main && cd .worktrees/<branch-name>
```

(When dispatched via Cetana, the dispatcher creates the worktree for you and the branch is `feat/issue-{N}` — the brief still states this explicitly so a manual paste behaves identically.)

This is non-negotiable because work done on the wrong branch or in a dirty main checkout is the most common, most expensive avoidable failure. The worktree isolates the task and guarantees a clean `origin/main` starting point.

#### Remaining pre-flight checks

After the worktree exists, verify:
- Working directory is clean (`git status` inside the worktree)
- Branch is correct (`git log --oneline -3` shows `origin/main` as parent)
- Target directory does or does not exist (as required)
- Required tools are present and at the right version
- External services are authenticated
- Any reference material (prototypes, docs) is accessible

Every pre-flight check must have a clear pass/fail condition. If a check fails, the executor STOPs and reports.

### 4. Numbered parts with numbered tasks

Break work into Parts (major areas) and numbered tasks within each Part.

Each task must specify:
- Exact files to create or modify
- Exact function/type signatures (not prose descriptions)
- Any constraints (no auto-remove, no extra tools, no UI in V0)
- Verification steps for that task

Do NOT leave implementation details to the executor's judgment unless you explicitly trust that judgment and say so.

### 5. Documentation-update list (explicit, tier-tied)

Do not leave documentation as an implication of the tier checklist. **List the exact doc artifacts this brief must touch, by name.** The executor should be able to read this list and know precisely which files to update before the PR is ready. This list is what `verify-docs` (now a real gate — see Section 8) and the code-reviewer check against.

Write it as a literal checklist in the brief, derived from the tier:

- **Tier 0** — usually none. State "No doc updates required (Tier 0)."
- **Tier 1** — name each: which spec(s) reflect the new behavior, which skill(s) if a convention shifted, `docs-index.md` if files were added/removed/renamed.
- **Tier 3** — all Tier 1 items, plus: the exact decision log (`project-management/decisions.md` or which `apps/*/specs/*-decisions.md`) and the D-### to append; which PM docs change (`state.md`, `now.md`, `changelog.md`, `roadmap.md`); whether a `Lock: YES` entry is created.

If the honest answer is "code changes but no docs," the work is either genuinely Tier 0 (say so) or the brief is under-scoped. A Tier 1+ brief with an empty doc-update list is malformed.

### 6. Verification before claiming done

Always include a verification section:
- Typecheck must pass
- Lint must pass
- Tests must pass
- Production build passes (`bun run build`) — catches stricter resolution that typecheck misses
- Manual smoke tests (e.g., server starts, returns expected output)
- `bun run verify-docs --pr` passes (this is a real gate now — D-027 — not a stub)
- `git diff main --stat` to confirm only expected files were touched

### 7. Stop conditions

Explicit list of conditions that cause the executor to STOP and report rather than improvise:
- Pre-flight check failures (including: worktree could not be created cleanly)
- Design gap discovered (brief didn't cover a case)
- Test fails after multiple fix attempts
- About to touch files outside the stated scope
- Any destructive action (force push, file deletion) not explicitly authorized

### 8. Constraints

What the executor must NOT do:
- Which branches/paths are off-limits
- Which features are explicitly deferred (do not add)
- Which patterns are forbidden (e.g., `--no-verify`, SQLite, auto-remove)

### 9. Deliverable

What the executor opens/commits/creates at the end. Specific:
- PR title (exact format)
- The `Tier:` declaration in the PR body (so the verify-docs gate reads it correctly: `Tier: 0`, `Tier: 1`, or `Tier: 3`)
- Files modified (`git diff main --stat`)
- PR description sections required
- What to report back and in what format

**The PR is not "done" when it is opened — it is done when it has passed review.** Every brief's deliverable states that, after the PR opens, the work goes through Phase 10 review (see `process.md`):

1. **code-reviewer pass** — an independent agent (fresh context, not the Developer) reviews against this brief per `roles/reviewer.md` and emits a VERDICT.
2. **security pass** — the security-reviewer agent scans per `roles/security.md` and emits a VERDICT (runs AgentShield if `.claude/`/MCP config changed).
3. **Principal code review** and **TL spec review**, then merge.

If the brief is for the Developer, it ends by telling the Developer to open the PR and stop — the review passes are separate invocations, and the Developer addresses any REQUEST CHANGES / FAIL findings in follow-up commits on the same branch.

---

## Model selection rules

| Situation | Model choice |
|-----------|-------------|
| Architecture judgment, multi-file coordination, debugging complex failures | Opus or Sonnet |
| Clear spec, 1-2 files, mechanical implementation | Sonnet or Haiku |
| Doc writing, markdown, specs | Sonnet |
| Cross-cutting review (reads many files, judges correctness) | Opus |
| Code review / security review pass | Opus or Sonnet (judgment over speed) |

When dispatching via Cetana, specify the model explicitly in the brief header and in the `cetana.dispatch_task` call (pass it in the brief text itself — the dispatcher uses `defaults.claudeModel` from config, but the brief can override via `--model` flag in the spawned command if needed).

---

## V3 Model Integration

Every brief authored under the v3 operational model must include the following fields in the Header block or an adjacent metadata block. These fields gate dispatch and ratification.

### Required metadata fields

```
**Tier:** [0 | 1 | 3]
```

- **Tier 0** — trivial change. Tier 0 checklist: typecheck, lint, tests, PR description.
- **Tier 1** — implementation. Tier 1 checklist: all Tier 0 items + specs updated + `bun run verify-docs --pr` passes.
- **Tier 3** — product/roadmap change. Tier 3 checklist: all Tier 1 items + decision log entry + PM docs updated + lock entry if applicable.

When in doubt, assign Tier 3 — the cost of over-tiering is a slightly heavier checklist; the cost of under-tiering is a missing decision log entry that a future agent re-litigates. Note: the verify-docs gate also defaults to Tier 3 when the PR body has no `Tier:` field, so always declare the tier explicitly in the PR body.

### Optional metadata fields

```
**principal_delegate:** [scope of any authority delegated to the Developer]
```

Present only when the Principal explicitly delegates a decision. Without this field, all contested choices escalate via `cetana_request_input`. Scope must be specific: "Developer may choose the output format" not "Developer may decide architecture."

```
**spike:** true
```

Present only for exploratory briefs. Spike briefs reduce to: typecheck + lint + decision log entry capturing what was tried and learned. Spike code does not merge to main.

### Type 1/2 declaration

If the brief executes a Type 1 (irreversible) decision, the brief must state:

```
**Executes Type 1 decision:** D-### — [one-line description]
**Ratified:** [date ratified or "PENDING — do not dispatch until ratified"]
```

A brief is not dispatchable if it executes a PENDING Type 1 decision. Dispatch requires explicit ratification.

### Lock acknowledgment

If the brief touches an area covered by a lock (see `project-management/decisions.md` entries with `Lock: YES`):

```
**Conforms to lock:** D-### — [brief description]
```

OR, if the brief explicitly challenges the lock:

```
**Challenges lock:** D-### — [brief description]
**Rationale:** [why the lock should be revised]
```

A lock challenge is a Type 1 decision and requires Principal ratification before dispatch.

### Briefs are frozen after dispatch

Once a brief is dispatched via `cetana.dispatch_task`, it is frozen. The Developer executes what was dispatched — they do not receive mid-task amendments. If scope needs to change after dispatch:
1. Stop the task (via `cetana.reply_to_blocked_task` with stop instructions)
2. Author a new brief with the revised scope
3. Dispatch the new brief

---

## Handling ambiguity in briefs

When authoring a brief, you will sometimes encounter requirements where the answer depends on context you don't have — architecture decisions not yet made, Principal preferences not yet stated, or external constraints not yet known.

**Use `[NEEDS CLARIFICATION]` inline markers** to surface these gaps explicitly rather than guessing or leaving them implicit.

```
[NEEDS CLARIFICATION: Which DB table owns this? users or sessions?]
[NEEDS CLARIFICATION: Should this endpoint require auth? Not stated in roadmap.md.]
[NEEDS CLARIFICATION: Timeout value — 30s or 60s? Both have precedent in codebase.]
```

### When to use `[NEEDS CLARIFICATION]`

Use it when:
- Two reasonable interpretations exist and picking the wrong one would require a re-do
- The brief references an architectural decision that hasn't been logged in `decisions.md`
- A constraint (auth, timeout, error behavior) is implied but not stated
- You're unsure whether an existing pattern applies here

Do not use it for:
- Stylistic preferences — pick one and note it in the brief
- Things resolvable by reading the codebase — read it first
- Pure implementation details — the Developer decides those

### Resolution protocol

Before dispatching a brief with `[NEEDS CLARIFICATION]` markers:
1. Collect all markers and present them to the Principal as a numbered list
2. Wait for resolution on each — do not dispatch with unresolved markers
3. Replace each resolved marker with the answer inline in the brief
4. If the Principal defers one ("Developer decides"), replace with `[DEVELOPER DECIDES: ...]` so the executor knows it's intentional

### Mapping to cetana_request_input

A `[NEEDS CLARIFICATION]` in a brief maps to a potential `cetana_request_input` escalation during execution. If the ambiguity is pre-flight (known before dispatch), resolve it in the brief. If it surfaces mid-execution, the Developer uses `cetana_request_input` to escalate — but a well-authored brief should anticipate most of these.

Source: GitHub Spec Kit evaluation, May 12, 2026. Adopted as inline convention only — Spec Kit CLI not adopted.

---

## Anti-patterns

- ❌ Omitting the worktree-first Step 0 — the executor starts on the wrong branch or a dirty main checkout
- ❌ Telling the executor to "create a branch" without first creating a worktree
- ❌ "Implement X as you see fit" — executor has no taste, only instructions
- ❌ Omitting pre-flight checks — executor starts on a dirty tree and wastes time
- ❌ An empty documentation-update list on a Tier 1+ brief — either it's Tier 0 (say so) or the brief is under-scoped
- ❌ Not specifying stop conditions — executor improvises when it should ask
- ❌ Conflating what with how — brief should specify BOTH
- ❌ Leaving scope boundaries implicit — executor will touch adjacent files
- ❌ Skipping the deliverable section — executor doesn't know what "done" looks like
- ❌ Treating "PR opened" as "done" — done is "passed code-review + security review"
- ❌ Writing a brief that assumes executor has read prior session context — it hasn't
- ❌ Promising to paste content "below" and then not pasting it

---

## Canonical example

The Cetana V0 build brief (`project-management/cetana-v0-build-brief.md` — or the dispatch session that originated it) is the canonical reference for a well-formed brief. It includes all sections, explicit pre-flight checks with pass/fail conditions, numbered parts with function signatures, explicit stop conditions, and a precise deliverable format.
