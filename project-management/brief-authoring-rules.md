# Brief Authoring Rules

Every executor brief Dani writes or dispatches must follow these rules. They exist because vague briefs produce vague work, and well-structured briefs can be handed to any executor — Claude Code, a future Cetana dispatch, or a parallel agent — with no additional context.

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
