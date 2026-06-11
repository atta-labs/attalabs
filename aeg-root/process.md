# Process: From idea to merged code

This document describes how work flows through the AEG operational model — from the moment the Principal has an idea to the moment that work merges to `main` with all specs, skills, and decision logs updated.

It is the canonical "how do we actually work?" document. Every other PM doc (`coordination.md`, `state-machine.md`, `iterations/README.md`, role docs, `brief-authoring` skill) describes a slice of this process. This document stitches them together into a single readable walkthrough.

If you are starting a new session and need to understand the workflow, read this first. Then `coordination.md` for session protocol, then the role doc that applies to you, then any project-specific specs.

For the visual schema, see `diagrams/process-flow.md` (being brought in line with the forge-derived-status model; where a diagram and this prose disagree, this prose is canonical).

---

## Where tasks come from: the iteration

The eleven phases below are the **per-task** flow. Tasks do not appear from nowhere — they are produced by the **Planner** (a Team Leader mode) when an iteration is planned: the Planner turns an intent plus a slice of tickets into a set of **forge Issues** (one per task) plus a thin topology file declaring their `depends-on` / `conflicts-with` edges (`iterations/README.md`, `roles/planner.md`). Each Issue that enters the flow below is a task the Planner already shaped.

**Status is never stored.** Throughout every phase, a task's status is *derived* from the forge — Issue open/assigned, branch existence, PR open, review decision, merge — never written to a label or a file. When a phase below says a task "becomes in-review," it means *a PR was opened*, not that anyone set a status field.

---

## The eleven phases

Every piece of work moves through some subset of these. Trivial work (Tier 0) skips most; complex work (Tier 3) hits all and may loop back from review.

```
1. Idea origination
2. Pressure-testing (optional; high-stakes only)
3. Brief authoring (just-in-time)
4. Brief validation
5. Dispatch
6. Execution
7. Escalation (optional; only when Developer blocks)
8. Task Done verification
9. Pull request opened
10. Review (agent passes, then human reviews)
11. Merge
```

After merge, the **Archivist** runs close-out (`roles/archivist.md`). That's the final step of the flow.

---

## Phase 1: Idea origination

**Who:** Principal and Team Leader (Strategist mode).

The Principal brings an idea. The TL pressure-tests, pushes back, surfaces related decisions, checks whether it's already specced. The TL's job is **not** to immediately agree and plan — it's to:
- Read relevant specs and decision logs to confirm the idea isn't already settled
- Push back if it's wrong, premature, or duplicative
- Identify the impact tier (0 / 1 / 3) — this drives everything downstream
- Identify the Type 1 (irreversible — Principal ratifies) vs Type 2 (reversible — TL ratifies) profile

If already locked or specced, the conversation ends here. If genuinely new, it produces a shared understanding of what the work is, why now, its tier, and its decision profile — which the Planner then turns into Issues (the iteration).

**Artifacts:** usually none (conversation is ephemeral). A significant decision is logged as a D-### during the chat.

**Exit:** the idea dies, or it's worth planning into an iteration.

---

## Phase 2: Pressure-testing (optional)

**When:** high-stakes only — architectural locks, project-direction shifts, decisions blocking weeks of downstream work, or when the Principal's instinct and the TL's read disagree. **Not** for tactical decisions, naming, or style. The Principal may waive it and ratify in-session (the decision log notes the skip, for audit honesty).

**Who:** TL orchestrates; external AI reviewers (vendor-diverse — e.g. Gemini, Grok, DeepSeek, ChatGPT) participate via pasted briefs.

The TL writes a brainstorming brief (idea, sketch, alternatives, what to pushback on), pairs it with `reviewer-prompt.md`, and pastes to each reviewer. The TL synthesizes. Converge on a flaw → back to Phase 1. Validate → proceed. **Max two rounds** — if two don't converge, the issue is framing, not a third round.

This phase pressure-tests an *idea*; Phase 10 reviews *shipped code*. Different things.

**Exit:** TL and Principal agree the direction holds.

---

## Phase 3: Brief authoring (just-in-time)

**Who:** Team Leader in Brief Author mode.

When a task is picked up for execution, the TL writes its brief — **just-in-time, not at plan time** — following the `brief-authoring` skill. The brief MUST include:
- Impact tier (0 / 1 / 3)
- Type 1 / Type 2 declaration if architectural decisions are expected
- `principal_delegate:` if the work runs while the Principal is offline
- Spike flag (`spike: true`) if exploratory
- The mandatory worktree-first Step 0 (`git worktree add .worktrees/task/<iteration>/<n> -b task/<iteration>/<n> origin/main` — no exceptions)
- An explicit documentation-update list tied to the tier
- Optional `Ticket:` (reference-only provenance) and, in a multi-project repo, `Project:` (resolves against `projects.md`)
- Clear scope, stop conditions, Task Done checklist
- A deliverable section stating "done" means "passed Phase 10 review," not "PR opened"

A brief is self-contained and executable without further conversation. If it needs clarifying questions, it's incomplete.

**Where the brief lives:** it is pasted to the Developer and will land in the **PR body** at Phase 9. It is **not** committed and **not** put in the Issue body — the Issue (created by the Planner) holds task identity + metadata only. A brief in the Issue would age before work starts.

**Artifacts:** the brief (a markdown block, not a committed file). The task's Issue already exists from iteration planning.

**Exit:** the brief is well-formed and ready to dispatch.

---

## Phase 4: Brief validation

**Who:** Archivist gate (automated) + the Developer's own entry gate.

Before work begins, the brief is checked for well-formedness:
- `tier:` present and valid; brief structure follows the skill (scope, stop conditions, deliverable)
- `principal_delegate:` valid if declared
- A `Challenges lock: D-###` block with reasoning if it challenges an active Lock
- `Project:` (if present) resolves against the registry
- No obvious contradiction with active decision logs (string-match heuristic)
- The task's Issue carries only execution metadata — **no** planning fields (priority/estimates/points), which the required Issue template + a CI check reject

If it fails, it's not dispatchable until fixed. The Developer also re-checks well-formedness as its entry gate (`roles/developer.md`) — a malformed brief is refused, not guessed at. (Brief Validation is an Archivist-gate stub today — see `state-machine.md` for mechanically-enforced vs trusted.)

**Exit:** the brief is well-formed and dispatchable.

---

## Phase 5: Dispatch

**Who:** Principal (or delegated TL within ratification-window scope), by hand or via an automation layer.

Dispatch starts the task. There are two equivalent routes:

- **Manual:** the Principal pastes the brief into the coding agent. The brief's worktree-first Step 0 makes the Developer create its own worktree (`.worktrees/task/<iteration>/<n>/`, branch `task/<iteration>/<n>`, from `origin/main`) as its first action.
- **Automated:** an automation layer (in this repo, Cetana) creates the worktree, generates the agent's config, spawns the Developer in it, and streams progress. This is a convenience; the semantics are identical to manual.

Either way: **before starting, the Developer checks the dispatch gates against the forge** — every `depends-on` task's PR merged, no `conflicts-with` sibling's PR open. If a gate isn't satisfied, it does not start (the task serializes). Opening the branch *is* the `todo → in-flight` transition; nobody writes a status label.

The branch name `task/<iteration>/<n>` is the convention that links the task to its branch and PR, so any role can derive its live status with one forge query.

**Exit:** the Developer is working in its worktree.

---

## Phase 6: Execution

**Who:** Developer (the coding agent — spawned or pasted).

Per `roles/developer.md`, the Developer reads `coordination.md` / `state.md` / `now.md` / its role doc, the relevant skills (auto-loaded when matching code is touched) and project specs, confirms pre-flight (starting with the worktree), and works in small, frequent commits on the `task/<iteration>/<n>` branch. When dispatched by an automation layer, it streams progress events to that layer.

The Developer cannot author its own briefs, expand scope without escalation, modify files outside scope, skip verification hooks, skip the Task Done checklist, or **write status anywhere** (status is derived). If the brief is wrong or contradicts reality, it escalates (Phase 7) — it does not paper over confusion or improvise outside scope.

**Exit:** the work is done (Phase 8), or the Developer is blocked (Phase 7).

---

## Phase 7: Escalation (optional)

**When:** the Developer hits a decision not covered by the brief, finds the brief contradicts reality, or needs new information.

**Who initiates:** Developer.

The Developer escalates through the escalation mechanism — a manual escalation note, or, if dispatched by an automation layer, its request-input mechanism — tagged with a `severity` that routes it:

- `severity: execution` → TL (Brief Author mode). Most common: a deprecated dependency, an unanticipated flag, a "null or throw?" call.
- `severity: strategy` → TL (Strategist mode). Less common: the brief's approach has a structural problem; the work touches an undiscussed area.
- `severity: product` → Principal. Rare: user-visible behavior the brief didn't address; a Type 1 decision is required.

The task is marked `blocked` (an `aeg:blocked` label — the one status with no native forge fact) until a reply arrives. The responder (TL or Principal) formulates a reply and the Developer resumes.

**Type 1 during execution:** if the question needs an irreversible decision and the Principal isn't available, it goes to `ratification-queue.md`; the next window resolves it. The Developer may terminate and resume via a follow-up dispatch after the window.

**Brief amendment:** if the brief itself is wrong in a way that blocks all paths, the TL issues an amendment (logged as a separate event, not a brief edit — briefs are frozen after dispatch) or kills the task.

**Exit:** the Developer is unblocked and resumes.

---

## Phase 8: Task Done verification

**Who:** Developer.

Before opening the PR, the Developer runs the tier-appropriate Task Done checklist (`roles/developer.md`). The commands below are this repo's instances (Bun/JS) — substitute your repo's declared equivalents:
- **Tier 0:** typecheck + lint, tests if applicable, PR description follows template (and will carry the brief)
- **Tier 1:** Tier 0 + specs updated, skills updated if conventions shifted, `verify-docs --pr` passes
- **Tier 3:** Tier 1 + decision log entry (status, type, rationale), per-project PM updated if state changed, Lock entry if irreversible, `docs-index.md` regenerated

`verify-docs --pr` is a **real gate** (D-027), the same script CI runs. If any item fails, the Developer fixes or escalates — the PR does not open.

**Exit:** all Task Done items pass.

---

## Phase 9: Pull request opened

**Who:** Developer.

The Developer opens a PR with:
- Title in commitlint format (`Type: Subject`)
- **The brief pasted into the body** — its permanent home, read by the Reviewer and Archivist
- A `Tier:` declaration (`Tier: 0|1|3`) so verify-docs reads the correct tier
- `Closes #N` linking the task's Issue (so the merge auto-closes it)
- Body following the PR template (what shipped, validated mechanism, what's not in scope, next steps)

**Opening the PR is itself the `in-flight → in-review` transition** — derived from the PR's existence, not written anywhere.

CI runs typecheck, lint, tests, `verify-docs` (the load-bearing doc gate — D-027 — fails if tier-appropriate updates are missing), and pre-commit hooks. The Archivist posts advisory comments (synthesis hints, related-decision surfacing, hygiene) — advisory, not blocking.

**Exit:** PR is open, CI green (including verify-docs), advisory comments addressed or dismissed.

---

## Phase 10: Review

Two stages: independent **agent passes** (fresh-context), then **human reviews** (Principal + TL). Agent passes run first and feed the human reviews — they do not replace them.

```
code-reviewer pass → security pass → Principal code review → TL spec review → merge
```

### Stage A — Agent review passes

Each pass is a **separate fresh-context invocation** with no memory of writing the code (the independence rule, D-026). Manual: the Principal pastes the review prompt. Automated: the automation layer dispatches the `code-reviewer` and `security-reviewer` passes. The agent reads its role doc + the PR diff + **the brief in the PR body**, and emits a structured verdict. Review agents do not edit code, do not merge, and do not write status.

1. **Code-reviewer pass** — `roles/reviewer.md`. Brief conformance, scope violations, test honesty, code quality, doc coupling, lock awareness, multi-project reach. Emits `VERDICT: APPROVE | REQUEST CHANGES` (BLOCKER / MAJOR / MINOR).
2. **Security pass** — `roles/security.md`. Secret leakage, BYOK/crypto, auth/permissions, MCP/agent-tooling exposure, injection surfaces, dependency risk. Runs a config-security scan over the agent/MCP/hook config when that config is touched (D-028). Emits `VERDICT: PASS | FAIL` (CRITICAL / HIGH / MEDIUM / LOW).

A BLOCKER (code) or CRITICAL/HIGH (security) returns the PR to the Developer, who fixes on the **same branch**; the pass re-runs. (Pushing fixes returns the PR's review decision to open — the `changes-requested → in-review` transition, derived.) An `[ESCALATE]` finding routes to TL (strategy) or Principal (`severity: product`).

### Stage B — Human reviews

**Code review (Principal).** The Principal reviews the diff — does it match the brief, scope violations, honest tests, spot-check quality. The agent verdict is an input, not a substitute; the Principal can overrule either way.

**Spec review (TL).** Do the specs describe what was built? Are decisions logged in the right files? Is the decision log honest? Coherence, not technical correctness (that's the Principal's code review).

If both pass (and agent verdicts are APPROVE/PASS or their findings resolved) → merge. If issues are found → back to the Developer with specific feedback. Loops, but three cycles signals a deeper issue.

**Enforcement note:** the agent passes are **trusted discipline** today — Phase 10 requires them, but no CI bot dispatches them automatically yet (D-026). The mechanical CI gate is `verify-docs` (Phase 9). Automating review-agent dispatch is future work.

**Exit:** agent passes complete, both human reviews pass.

---

## Phase 11: Merge

**Who:** Principal (or TL if explicit per-PR delegation was set in the brief).

The Principal merges. Tier 3 work merges during a ratification window (`coordination.md`); Tier 0/1 anytime. The merge **auto-closes the linked Issue** (via `Closes #N`) — and the merge *is* the `merged` status; nobody writes a label. An automation layer may surface a completion notification.

**Post-merge: the Archivist closes out** (`roles/archivist.md`) — confirms the Issue closed, decision logged if Tier 3, changelog appended, docs coherent, per-project `state.md`/`now.md` updated for every project the task listed, `docs-index.md` regenerated. It **flags** (does not perform) orphaned branches and worktree removal. It writes no task status.

**Exit:** code is in main, Issue closed, close-out done.

---

## What happens after merge

The Principal eventually removes the worktree (`git worktree remove …`) — deliberate friction; the worktree is sometimes useful for post-merge inspection. The decision logs, specs, and skills are now canonical repo state that future sessions read. If the work introduced a Lock, future briefs touching that area must reference or explicitly challenge it.

---

## Variations and special cases

### Spike work
`spike: true` → reduced Task Done (typecheck + lint, decision log entry capturing what was tried/learned). Spike code does not merge — it rebases away or converts to a full Tier 1+ task in a separate brief.

### Tier 0 work (trivial)
Skips Phase 2; short brief; minimal checklist; light Phase 10 (a code-reviewer pass is cheap insurance, but the security pass and TL spec review can be skipped when there's no config/auth surface and no spec change). Declare `Tier: 0` in the PR body so verify-docs doesn't require doc updates.

### Multi-developer parallel work
Each Developer gets its own worktree, branched from `origin/main`. Parallel safety is the dispatch gates: a task does not start while a `conflicts-with` sibling's PR is open, or before a `depends-on`'s PR merges (`iterations/README.md` §8). Conflicts are declared at planning time as package-level collision domains — the coordination lives in the iteration's edges, not in ad-hoc scope-checking. When unsure two tasks collide, the Planner declares the conflict and serializes.

### Cross-project tasks
A task may legitimately span multiple projects (one branch, one PR, `Project: a, b`) when the change is only verifiable as a unit (e.g. generalize a shared engine + migrate the first consumer). Review fans out across each project's lens; close-out updates each project's state. See `projects.md` and `roles/planner.md`.

### Rollback
A rollback is its own task with its own brief. The decision to roll back is a Type 1 decision (ratification window). The decision log gets a SUPERSEDED / RETIRED entry pointing to the new state.

---

## Anti-patterns

- **Going straight to brief authoring without Phase 1** — produces briefs that solve the wrong problem.
- **Dispatching an unvalidated or malformed brief** — the Developer's entry gate refuses it; bypassing the gate manually defeats the model.
- **Letting the Developer review its own work** — the Phase 10 agent passes are separate fresh-context invocations for a reason (D-026).
- **Writing status anywhere** — status is derived from the forge. Setting a label or editing the iteration file to record state recreates the racing status model the design eliminated.
- **Putting the brief in the Issue** — it lives in the PR body, just-in-time. The Issue is task identity only.
- **Developer scope creep** — "while I'm here…" is a new task and a new brief.
- **TL self-ratifying Type 1 decisions in solo sessions** — they queue as PENDING for a ratification window.
- **Skipping the Task Done checklist under deadline pressure** — it's the load-bearing discipline; skipping it is how the BYOK gap happened.
- **Treating "PR opened" as "done"** — done is "passed Phase 10 review."
- **Building a dynamic conflict scanner** to catch what the Planner missed — declare conflicts conservatively and serialize instead (`iterations/README.md` §9).

---

## How this process maps to file artifacts

For which files get mutated in which phase by which actor, see `state-machine.md` (the artifact + mutation matrix). For the visual schema, see `diagrams/process-flow.md`. For the roles, see `roles/principal.md`, `team-leader.md` (incl. Planner mode), `developer.md`, `reviewer.md`, `security.md`, `archivist.md`. For the iteration/task model, see `iterations/README.md` and `roles/planner.md`. For brief authoring, see the `brief-authoring` skill.

---

## Spec format guidance

Specs produced during process phases follow this format. Adopted from GitHub Spec Kit's spec-template (May 12, 2026 evaluation).

### Required sections

**1. User stories (prioritized).** Priority (P1 must / P2 should / P3 nice), story ("As a [role], I want [action], so that [benefit]"), and an Independent Test (how it's verified in isolation).

**2. Acceptance scenarios.** Given/When/Then, one or more per story.

**3. Success criteria** — measurable, user-focused, technology-agnostic. ("User completes signup in under 60 seconds." NOT "function returns void" / "uses Drizzle.")

**4. Edge cases** — explicit enumeration, one bullet each.

**5. `[NEEDS CLARIFICATION]` markers** — wherever there's a real ambiguity, mark it inline; do not silently guess. Each is a candidate escalation point.

### When this format applies
New project specs and major feature specs (Tier 1 / Tier 3); the "Goal" section of dispatch briefs. NOT for Tier 0 tasks, decision log entries (D-NNN schema), or narrative lessons/anti-patterns.

### Retroactive migration
Existing specs are not migrated wholesale; a spec adopts this format when it's next rewritten for other reasons.

### Why
Spec Kit's evaluation found the template produces measurably better-structured artifacts — explicit priority, visible ambiguities, success tied to user-observable outcomes. The repo adopts the format without adopting Spec Kit the tool — see `apps/cetana-ai/specs/cetana-backlog.md` for the V0.7+ question of whether Cetana eventually wraps Spec Kit templates as MCP tools.
