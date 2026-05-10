---
name: brief-authoring
description: Rules for authoring task briefs dispatched to Developer agents. Load when writing or reviewing a brief. Covers required sections, model selection, v3 model integration (tier field, principal_delegate, Type 1/2 declaration, lock acknowledgment), and anti-patterns.
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

Numbered checklist. Must verify:
- Working directory is clean
- Branch is correct / needs to be created
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

### 5. Verification before claiming done

Always end with a verification section:
- Typecheck must pass
- Lint must pass
- Tests must pass
- Manual smoke tests (e.g., server starts, returns expected output)
- `git diff main --stat` to confirm only expected files were touched

### 6. Stop conditions

Explicit list of conditions that cause the executor to STOP and report rather than improvise:
- Pre-flight check failures
- Design gap discovered (brief didn't cover a case)
- Test fails after multiple fix attempts
- About to touch files outside the stated scope
- Any destructive action (force push, file deletion) not explicitly authorized

### 7. Constraints

What the executor must NOT do:
- Which branches/paths are off-limits
- Which features are explicitly deferred (do not add)
- Which patterns are forbidden (e.g., `--no-verify`, SQLite, auto-remove)

### 8. Deliverable

What the executor opens/commits/creates at the end. Specific:
- PR title (exact format)
- Files modified (`git diff main --stat`)
- PR description sections required
- What to report back and in what format

---

## Model selection rules

| Situation | Model choice |
|-----------|-------------|
| Architecture judgment, multi-file coordination, debugging complex failures | Opus or Sonnet |
| Clear spec, 1-2 files, mechanical implementation | Sonnet or Haiku |
| Doc writing, markdown, specs | Sonnet |
| Cross-cutting review (reads many files, judges correctness) | Opus |

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

When in doubt, assign Tier 3 — the cost of over-tiering is a slightly heavier checklist; the cost of under-tiering is a missing decision log entry that a future agent re-litigates.

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

## Anti-patterns

- ❌ "Implement X as you see fit" — executor has no taste, only instructions
- ❌ Omitting pre-flight checks — executor starts on a dirty tree and wastes time
- ❌ Not specifying stop conditions — executor improvises when it should ask
- ❌ Conflating what with how — brief should specify BOTH
- ❌ Leaving scope boundaries implicit — executor will touch adjacent files
- ❌ Skipping the deliverable section — executor doesn't know what "done" looks like
- ❌ Writing a brief that assumes executor has read prior session context — it hasn't
- ❌ Promising to paste content "below" and then not pasting it

---

## Canonical example

The Cetana V0 build brief (`project-management/cetana-v0-build-brief.md` — or the dispatch session that originated it) is the canonical reference for a well-formed brief. It includes all eight sections, explicit pre-flight checks with pass/fail conditions, numbered parts with function signatures, explicit stop conditions, and a precise deliverable format.
