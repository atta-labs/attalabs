# Process: From idea to merged code

This document describes how work flows through the Atta operational model — from the moment Dani has an idea to the moment that work merges to `main` with all specs, skills, and decision logs updated.

It is the canonical "how do we actually work?" document. Every other PM doc (`coordination.md`, `state-machine.md`, role docs, `brief-authoring-rules`) describes a slice of this process. This document stitches them together into a single readable walkthrough.

If you are starting a new Claude session and need to understand the workflow, read this first. Then `coordination.md` for session protocol, then the role doc that applies to you, then any product-specific specs.

For the visual schema, see `diagrams/process-flow.md`.

---

## The eleven phases

Every piece of work — features, bug fixes, refactors, documentation updates — moves through some subset of these eleven phases. Trivial work (Tier 0) skips most of them. Complex work (Tier 3) hits all of them and may loop back from review.

```
1. Idea origination
2. Pressure-testing (optional; high-stakes only)
3. Brief authoring
4. Brief validation
5. Dispatch
6. Execution
7. Escalation (optional; only when Developer blocks)
8. Task Done verification
9. Pull request opened
10. Review
11. Merge
```

After merge, the Archivist runs post-merge automation (regenerates `docs-index.md`, validates decision log sequencing, flags drift). That's not a phase — it's housekeeping that happens implicitly.

The rest of this document walks through each phase.

---

## Phase 1: Idea origination

**Who:** Principal (Dani) and Team Leader (Claude Desktop or web).

**Where:** A chat session. Usually Claude Desktop because that's the primary TL surface.

**What happens:**

Dani has an idea — a feature, a bug, a refactor, a strategic direction shift, anything. He brings it to the TL. The TL is in Strategist mode here (see `roles/team-leader.md` for the mode distinction): pressure-testing, pushing back, surfacing related decisions, identifying whether the idea is already specced.

The TL's job in this phase is **not** to immediately agree and write a brief. It's to:
- Read relevant existing specs and decision logs to confirm the idea isn't already settled
- Push back if the idea is wrong, premature, or duplicative
- Identify the impact tier (Tier 0 / 1 / 3) — this drives everything downstream
- Identify whether expected decisions are Type 1 (irreversible — Principal must ratify) or Type 2 (reversible — TL can ratify in PR)

If the TL identifies that the idea is already locked or already specced, the conversation ends here. No new work is created.

If the idea is genuinely new and worth pursuing, the conversation produces a shared understanding of:
- What the work is
- Why it's happening now (not deferred)
- What its impact tier is
- What its Type 1/2 decision profile is

**Artifacts created in this phase:** Usually none. Conversation is ephemeral. If a significant decision is made (e.g., "we're committing to X over Y"), the TL announces "I'm logging this as D-### Type 2" or "this needs Principal ratification — going to ratification queue" during the chat itself. See `state-machine.md` for ratification mechanics.

**Exit criteria:** Either the idea dies here, or both TL and Principal agree it's worth a brief.

---

## Phase 2: Pressure-testing (optional)

**When this happens:** Only for high-stakes work. Specifically:
- Architectural locks ("we're committing to using X")
- Product direction shifts (re-prioritizing roadmap)
- Decisions that block multiple weeks of downstream work
- When Principal's instinct and TL's read disagree

**When this does NOT happen:** Tactical decisions inside a single task. Naming arguments. Style choices. Small features with clear scope.

**Who:** TL orchestrates. External AI reviewers participate (Gemini, Grok, DeepSeek, ChatGPT-shaped — pasted as briefs via the user, since they don't have repo access).

**What happens:**

The TL writes a brainstorming brief that explains the idea, its current sketch, alternatives considered, and what we want pushback on. The brief is paired with `project-management/reviewer-prompt.md` (which defines what reviewers should and shouldn't do) and pasted to each external AI in turn.

Each reviewer responds. The TL synthesizes.

If reviewers converge on a structural flaw, the idea goes back to Phase 1 with that flaw understood. If they validate the direction, work proceeds to Phase 3. If they propose major refinements, the TL incorporates them, then writes a v2 brief and runs another round if necessary.

Hard rule: **maximum two reviewer rounds per piece of work.** If we can't converge after two rounds, the issue is structural and needs a different approach. Three rounds means we're in meta-drift; don't do it.

**Artifacts created:**
- Pasted briefs (ephemeral — the conversation IS the artifact)
- Decision log entries for any architectural commitments made during the round
- Updates to `thinking.md` if open tensions remain after the round

**Exit criteria:** TL and Principal agree the direction holds and the brief is ready to formalize.

---

## Phase 3: Brief authoring

**Who:** Team Leader in Brief Author mode.

**What happens:**

The TL writes a formal brief following `.claude/skills/brief-authoring/SKILL.md`. The brief MUST include:
- Impact tier (Tier 0 / 1 / 3)
- Type 1 / Type 2 declaration if architectural decisions are expected
- `principal_delegate:` field if this work will run while Dani is offline (see `state-machine.md` for delegation rules)
- Spike flag (`spike: true`) if the work is exploratory and won't merge to main as-is
- Clear scope, stop conditions, and Task Done checklist

A brief is a self-contained, executable document. A Developer should be able to execute it without additional conversation. If the brief requires the Developer to ask clarifying questions, the brief is incomplete.

**Artifacts created:** A GitHub Issue with the brief in the body, labeled with the appropriate tier (`tier:0`, `tier:1`, `tier:3`), `status:todo`, and any other applicable labels.

**Exit criteria:** Issue is created and validated (next phase).

---

## Phase 4: Brief validation

**Who:** Archivist (automated GitHub Action).

**What happens:**

When an issue is opened or updated with a brief, the Archivist runs validation. It checks:
- `tier:` label is present and valid
- Brief structure follows the skill (header, scope, stop conditions, deliverable section)
- If `principal_delegate:` is declared, the delegate identity is valid
- If the brief challenges an active Lock, a `Challenges lock: D-###` block exists with reasoning
- No obvious contradictions with active decision logs (string-match heuristic, not semantic)

If validation passes: the Archivist adds `status:ready` label and removes `status:todo`. The brief can be dispatched.

If validation fails: the Archivist adds `status:blocked` and `needs:brief-correction`. Cetana refuses to dispatch tasks with `status:blocked`. The TL must fix the brief before work can begin.

**Why this exists:** Without validation, malformed briefs reach Developers who then either fail or guess. Validation is cheap (it's a script). Failure recovery is expensive.

**Exit criteria:** Brief is `status:ready` and dispatchable.

---

## Phase 5: Dispatch

**Who:** Principal (or delegated TL within ratification window scope) calls `cetana.dispatch_task` from Claude Desktop.

**What happens:**

Cetana's strategist MCP server receives the dispatch call with `issue_number` and `brief`. It:

1. Validates the issue exists and is `status:ready`
2. Creates a git worktree at `~/code/atta/.worktrees/issue-{N}/` on branch `feat/issue-{N}` from `origin/main`
3. Generates a per-task `mcp-config.json` pointing the spawned agent at the executor MCP server
4. Spawns `claude -p "<brief>"` as a subprocess in the worktree
5. Appends `task.dispatched` and `task.spawned` events to `~/.cetana/tasks/{taskId}.jsonl`
6. Posts a GitHub Issue comment confirming dispatch with the task ID
7. Updates the issue label to `status:ongoing`

The spawned Claude Code process is the Developer for this task. From this moment on, the Developer owns execution.

**Artifacts created:**
- Worktree directory
- Task JSONL log
- Task IPC directory at `~/.cetana/tasks/{taskId}/`
- GitHub comment

**Exit criteria:** The agent is spawned and working.

---

## Phase 6: Execution

**Who:** Developer (spawned Claude Code subprocess).

**What happens:**

The Developer works the brief. Per `roles/developer.md`, the Developer:

1. Reads `coordination.md`, `state.md`, `plan.md`, and the relevant role doc
2. Reads relevant skills (auto-loaded by the skill harness when matching code is touched)
3. Reads relevant product specs
4. Confirms pre-flight checks from the brief
5. Works in small, frequent commits on the feature branch
6. Streams progress as `task.progress` events to the JSONL log

Critically, the Developer cannot:
- Author its own briefs or expand scope without escalation
- Modify files outside the brief's stated scope
- Use `--no-verify` to bypass commit hooks
- Skip the Task Done checklist

If the brief is wrong, contradicts reality, or is missing critical information, the Developer escalates (next phase). The Developer does **not** paper over confusion or improvise outside scope.

**Exit criteria:** Either the work is done (skip to Phase 8) or the Developer is blocked on a decision (Phase 7).

---

## Phase 7: Escalation (optional)

**When this happens:** The Developer hits a decision point not covered by the brief, finds that the brief contradicts reality, or needs new information.

**Who initiates:** Developer.

**What happens:**

The Developer calls `cetana_request_input` with a `severity` field that determines routing:

- `severity: execution` → routed to TL (Brief Author mode). Most common. Examples: "the brief says use Library X but it's been deprecated"; "I need a flag I didn't anticipate"; "should this function return null or throw?"
- `severity: strategy` → routed to TL (Strategist mode). Less common. Examples: "the brief assumed approach A but I see a structural issue with it — should I switch to B?"; "this work touches an area we haven't discussed."
- `severity: product` → routed to Principal (Dani). Rare. Examples: "this affects user-visible behavior in a way the brief didn't address"; "this requires a Type 1 decision."

Cetana's executor MCP server writes `~/.cetana/tasks/{taskId}/question.json` with the severity, adds the corresponding GitHub Issue label (`needs:execution-input`, `needs:strategy-input`, `needs:principal-input`), and the tool blocks until a reply arrives.

The responder (TL or Principal) sees the blocked task via `cetana.list_active_tasks`, formulates a reply, and calls `cetana.reply_to_blocked_task`. The reply is written to `reply.json`. The Developer's polling loop picks it up and the agent receives the reply as a tool result.

**Special case: Type 1 decisions during execution.** If the question requires a Type 1 (irreversible) decision and Principal isn't immediately available, the question goes to `ratification-queue.md`. The next ratification window resolves it. The Developer waits — `cetana_request_input` has a 30-minute timeout in V0; for queued items, the Developer is told to terminate and the task resumes via a follow-up dispatch after the window. (V1 will handle this more cleanly with longer-lived blocking.)

**Special case: emergency override.** If the Developer believes the brief itself is wrong in a way that blocks all paths forward, they call `cetana_request_input` with `severity: execution` and a flag indicating brief amendment is needed. The TL either issues an amendment (logged as a separate JSONL event, not a brief edit — briefs are frozen after dispatch) or kills the task.

**Exit criteria:** The Developer is unblocked and resumes execution.

---

## Phase 8: Task Done verification

**Who:** Developer.

**What happens:**

Before opening the PR, the Developer runs the Task Done checklist appropriate to the impact tier (defined in `roles/developer.md`):

- **Tier 0:** Code passes typecheck + lint, tests if applicable, PR description follows template.
- **Tier 1:** Tier 0 items, plus specs updated to reflect new behavior, skills updated if conventions shifted, `bun run verify-docs --pr` passes.
- **Tier 3:** Tier 1 items, plus decision log entry appended (with status, type, rationale), PM docs updated if state changed, Lock entry created if irreversible, `docs-index.md` regenerated.

The Developer also runs `bun run verify-docs --pr` locally. This is the same script CI will run. If it fails locally, the PR isn't ready.

If any item fails: the Developer either fixes it or escalates. The PR does not get opened.

**Exit criteria:** All Task Done items pass.

---

## Phase 9: Pull request opened

**Who:** Developer.

**What happens:**

The Developer opens a PR with:
- Title following the project's commitlint format (`Type: Subject`)
- Body following the PR template (what shipped, validated mechanism, architecture summary, what's not in scope, next steps)
- Labels reflecting the impact tier and any other applicable categories

CI runs:
- Typecheck
- Lint
- Tests
- `verify-docs` script (the load-bearing enforcement) — fails if specs/skills/decision log updates appropriate to the tier are missing
- Standard pre-commit hooks

The Archivist posts advisory comments on the PR:
- "This PR modifies auth flow but no auth skill updated" (synthesis hint)
- "Decision D-042 appears semantically related to this work — confirm awareness" (related-decision surfacing)
- "Spec X references retired architectural term Y" (hygiene)

These are advisory, not blocking. The Developer can dismiss or address them.

The Cetana strategist server detects PR open (via webhook or polling — V0 currently uses GitHub Issue label change as a proxy) and updates the issue label to `status:review`. Posts a completion comment.

**Exit criteria:** PR is open, CI is green, Archivist comments are addressed or dismissed.

---

## Phase 10: Review

**Two parallel reviews happen:**

**Code review (Principal).**
Dani reviews the diff in GitHub. Looks for:
- Does the code match the brief?
- Are there scope violations?
- Are tests honest (testing real behavior, not mocking the thing being tested)?
- Spot-check 2-3 files for code quality

**Spec review (Team Leader).**
TL reviews the spec/skill/decision log changes. Looks for:
- Do the specs describe what was actually built?
- Are decisions logged in the right files (per-product vs global)?
- Is the decision log entry honest (real reasoning, not retrofitted rationalization)?
- Does the experiment log capture meaningful learnings?

If both reviews pass: proceed to merge.

If issues are found: the PR goes back to the Developer with specific feedback. The Developer fixes and re-requests review. This can loop, but should not loop indefinitely — three review cycles signals a deeper issue.

**Exit criteria:** Both reviews pass.

---

## Phase 11: Merge

**Who:** Principal (or TL if explicit per-PR delegation was set in the brief).

**What happens:**

Principal merges the PR. For Tier 3 work, this happens during a ratification window (see `coordination.md` for the cadence). For Tier 0/1 work, this can happen anytime.

GitHub auto-closes the linked issue. Cetana's strategist server detects merge (via webhook or polling) and:
- Appends `task.completed` event
- Updates issue label to `status:merged`
- Optionally surfaces a notification

**Post-merge: the Archivist runs.** This is housekeeping, not a phase the work flows through. The Archivist:
- Regenerates `docs-index.md`
- Validates decision log sequencing across all decision logs (no duplicates, no gaps)
- Flags any worktrees pointing to merged branches as candidates for cleanup
- On daily cron: flags stale `thinking.md`, flags spec drift (specs whose modification dates are significantly older than referenced code)

**Exit criteria:** Code is in main. Issue is closed. Worktree exists but is no longer being worked in.

---

## What happens after merge

The Principal eventually cleans up the worktree manually (per D-010 — auto-cleanup is V1). This is friction, but it's deliberate: the worktree is sometimes useful for post-merge inspection.

The decision logs, specs, and skills are now part of the canonical repo state. Future Claude sessions read them at session start.

If the work introduced a new architectural pattern, the relevant skill is updated (this happened in the brief, but worth noting that future work in the same area now benefits from the new skill).

If the work introduced a Lock, future briefs touching the same area must reference or explicitly challenge the Lock.

---

## Variations and special cases

### Spike work

If the brief was tagged `spike: true`, the Task Done checklist is reduced to: code passes typecheck + lint, decision log entry capturing what was tried and learned. Spike code does not merge to main — it rebases away or converts to a full Tier 1+ task. The conversion is a separate brief.

### Tier 0 work (trivial)

Tier 0 skips Phase 2 (no pressure-testing). Phase 3 brief is short. Phase 8 checklist is minimal. Phase 10 review is fast (Principal-only, no spec review needed). The Archivist's brief validation is still applied.

### Multi-agent parallel dispatch

When two or more Developers are dispatched in parallel:
- Each gets its own worktree
- Each branches from `origin/main`, never from the working tree
- The Strategist must coordinate scopes via `cetana.list_active_tasks` to avoid file-level overlap
- If overlap is unavoidable, dispatch must be sequential, not parallel

### Conflicts during execution

If a Developer makes architectural decisions during execution that affect other in-flight work, the Archivist flags this on PR open ("This PR appears to conflict with active task #N — review before merge"). Resolution is human (TL coordinates with Principal).

### Rollback

If a merged PR is later determined to have been a mistake, the rollback is its own task with its own brief. The decision to roll back is itself a Type 1 decision and goes through ratification windows. The decision log gets a SUPERSEDED or RETIRED entry pointing to the new state.

---

## Anti-patterns

These break the process:

- **Skipping Phase 1 and going straight to brief authoring** ("Dani, write the brief" without first pressure-testing the idea). Often produces briefs that solve the wrong problem.
- **Skipping Phase 4 and dispatching unvalidated briefs.** Cetana V0 won't allow it (Brief Validation gate), but bypassing the gate manually defeats the model.
- **Developer scope creep.** "While I'm here, I should also..." — STOP. That's a new task, written as a separate brief.
- **TL self-ratifying Type 1 decisions in solo sessions.** If Principal isn't in the chat, Type 1 decisions queue for ratification windows. They are PENDING, not ratified.
- **Skipping the Task Done checklist to ship faster under deadline pressure.** The checklist is the load-bearing discipline mechanism. Skipping it is exactly how the BYOK gap happened.
- **Multiple TL sessions making conflicting decisions.** Last-write-wins on PM docs is acceptable. Last-write-wins on decision logs is not — they're append-only with sequence validation.

---

## How this process maps to file artifacts

For a complete walkthrough of which files get mutated in which phase by which actor, see `state-machine.md` (the artifact + mutation matrix).

For the visual representation of this process, see `diagrams/process-flow.md`.

For the technical architecture of the system implementing this process (Cetana V0, GitHub, CI), see `diagrams/system-architecture.md`.

For the role descriptions referenced throughout, see `roles/principal.md`, `roles/team-leader.md`, `roles/developer.md`.

For brief authoring rules, see `.claude/skills/brief-authoring/SKILL.md`.

---

## Spec format guidance

Specs produced during process phases should follow this format. Adopted from GitHub Spec Kit's spec-template (May 12, 2026 evaluation) — see `~/spec-kit-sandbox/output/spec-kit-evaluation.md` on the Principal's machine for the source analysis.

### Required sections

**1. User stories (prioritized).** Each story has:
- Priority: P1 (must), P2 (should), P3 (nice-to-have)
- Story: "As a [role], I want to [action], so that [benefit]"
- Independent Test: how this story is verified in isolation

**2. Acceptance scenarios.** Given/When/Then format. One or more per user story.
- Given [precondition]
- When [action]
- Then [outcome]

**3. Success criteria (measurable, user-focused, technology-agnostic).** Examples:
- "User completes signup in under 60 seconds on a cold-cache mobile load"
- "First-page render shows headline within 200ms p95"

NOT examples: "function returns void," "uses Drizzle ORM," "passes typecheck" — these are implementation details, not user-facing success.

**4. Edge cases.** Explicit enumeration of edge cases the spec accounts for. One bullet each.

**5. `[NEEDS CLARIFICATION]` markers.** Wherever the spec author identifies a real ambiguity, mark it inline as `[NEEDS CLARIFICATION: specific question]`. Do NOT silently guess. Each marker is a candidate escalation point during execution.

### When this format applies

- New product specs (`apps/[product]/specs/[product]-spec.md`) — when authored or rewritten
- Major feature specs (anything Tier 1 or Tier 3)
- Cetana dispatch briefs — the "Goal" section uses this format

When this format does NOT apply:
- Tier 0 tasks (typos, dep bumps) — no spec needed
- Decision log entries — use D-NNN schema in `state-machine.md` Section 6
- Calibration lessons, anti-patterns — narrative format

### Retroactive migration

Existing specs in `apps/*/specs/` are NOT migrated by this PR. They stay in their current format until naturally touched. When a spec is rewritten for other reasons, it adopts this format.

### Why this format

GitHub Spec Kit's evaluation (May 12) found their spec-template format produces measurably better-structured artifacts than ad-hoc spec writing. The structure forces explicit priority, makes ambiguities visible, and ties success to user-observable outcomes rather than implementation details.

Atta adopts the format without adopting Spec Kit the tool — see `roadmap.md` "Open / unresolved" for the V0.7+ question of whether Cetana eventually wraps Spec Kit templates as MCP tools.
