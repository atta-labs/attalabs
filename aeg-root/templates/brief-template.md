---
sidebar_title: "Template: Task brief"
---
# Template — Task brief (the 12-section shape)

**Copy the block below the divider and replace every `[…]` placeholder with real content.** This packages the brief shape defined by `aeg-root/skills/brief-authoring/SKILL.md` — the required sections, their order, and the fields the gates read. The skill remains the source of truth for what each section must contain and for the authoring discipline around it (the contract-conformance checklist, the Dig obligations, the premise-pin rules, the Test Plan tagging rules); this file is the container you start from, not a substitute for reading it. The brief is **pasted to the Developer, never committed as a repo file** — it lands in the PR body (inside a collapsed `<details>` block, per the skill's §12) when the Developer opens the PR.

The brief itself carries no anchor comments: it rides into the PR body as the *reference copy*, and the anchored gate-read fields live in the Developer's PR report (`aeg-root/templates/pr-report-template.md`) — anchoring the same fields twice in one body would recreate the very ambiguity anchors exist to remove.

---

**For:** [model + environment, e.g. "Sonnet (coding-agent CLI on a dev machine, dispatched locally, unattended)"]
**Reason:** [why this capability level fits this task — real reasoning against the task, not "because it's good"]
**Owner:** [who owns the task — the Principal, by default]
**Goal:** [one sentence: what ships]
**Project:** [project(s), comma-separated, resolving against `.vinaya/projects.md` — required in a multi-project repo]
**Tier:** [0 | 1 | 3 — declare last, after §4 is complete]

You are the AEG Developer. Read `aeg-root/roles/developer.md` first[, then the host repo's own execution-discipline skill, e.g. `.claude/skills/executor-protocol/SKILL.md`]. Both mandatory.

## 2. Context — read before doing anything

- **Iteration:** [`iteration-slug`], task [n], Issue #[N]. Branch `task/[iteration-slug]/[n]`. `Depends-on: [—|ids]`, `Conflicts-with: [—|ids]`. Confirm `READY TO DISPATCH` at your own Step 0.
- **Read Issue #[N] in full** for the complete rationale — do not re-derive it.
- [CONTEXT — the Planner's rationale carried forward (boundary, blast radius, traps), what was previously validated, what's locked (D-### references), and everything your own Dig confirmed about the current surface. If it isn't in the brief, it doesn't exist.]

## 3. Technical dependencies

[DEPENDENCIES — every technical precondition by name: shared exports/APIs that must already exist, schema/migration preconditions, capability preconditions, external services/credentials. "None new." is a valid value.]

## 4. Technical surface map

**Create:**
- [exact file paths to create]

**Modify:**
- [exact file paths to modify, with what changes in each]

**Out of surface:** [adjacent files/dirs the executor must NOT touch, named explicitly]

#### Premise pins

**Premise:**
- [path/inside/the/surface.ts] contains: [literal substring the brief's reasoning depends on]
- [another/surface/path.ts] absent: [literal substring pinned absent]

## 5. Pre-flight checks

**Step 0 (mandatory, verbatim):**

```
git worktree add .worktrees/task/[iteration-slug]/[n] -b task/[iteration-slug]/[n] origin/main && cd .worktrees/task/[iteration-slug]/[n] && bun install --frozen-lockfile --silent
```

1. Clean status; parent `origin/main`; branch suffix literal-matches topology `#` column (`[n]`) (D-073).
2. `bun packages/aeg-core/bin/verify-dispatch.ts [iteration-slug] [n]` → `READY TO DISPATCH` required; else STOP.
3. [any task-specific pre-flight checks — required tools present, reference files readable, re-digs to confirm the §2 citations]

On any failure: STOP and report.

## 6. Numbered parts — commit and push after EACH part (push-per-Part)

1. **Part 1:** [exact files + exact function/type signatures + constraints — not prose]
2. **Part 2:** [next bounded unit of work]

## 7. Documentation-update list

[DOC LIST — every doc artifact this brief must touch, by file name — or "No doc updates required (Tier 0)." A Tier 1+ brief with an empty list is malformed. Never list a new file for a one-off report/finding (D-074).]

## 8. Verification before claiming done

- [the repo's static gates, by command — this repo: `bun run typecheck`, `bun run test`, lint, build]
- [every blast-radius consumer named in §4 re-verified, by name]
- `PR_BODY="$(cat <body-file>)" bun packages/aeg-core/bin/verify-docs.ts --pr` green.

## 9. Test Plan

- [ ] **[agent]** [scriptable, non-auth check — the exact command + the concrete observable; evidence pasted, not paraphrased]
- [ ] **[principal]** [auth-gated / vendor-key / visual check — what the Principal does and what they should observe]

[Pure-logic tasks with no runtime surface in §4 declare the `unit-tests-only` sentinel on the Test Plan field instead of a checklist — one form or the other, never both.]

## 10. Stop conditions

STOP and report if: pre-flight fails; [the Planner's stop-and-escalate conditions, substance-verbatim]; [task-specific stop conditions]; about to touch files outside the §4 surface; any destructive action not explicitly authorized.

## 11. Constraints

- [each Planner trap as an explicit "do NOT do X; do Y instead"]
- [forbidden patterns for this task — deferred features, off-limits paths]
- Never write status anywhere; never add execution metadata to the iteration file.

> **Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not covered by a Section 10 stop condition, choose the most reasonable option consistent with this brief, record the choice in the PR body, and continue. Halt only for the explicit Section 10 stop conditions — and when you halt, record the blocker in the PR body or an Issue comment rather than waiting interactively for input.

## 12. Deliverable

- PR title (exact): `[[iteration-slug]] [n] — [task title]`
- Open the PR only via `bun packages/aeg-core/bin/open-pr.ts --body-file <path> --title "<title above>"`.
- PR body = the Developer's PR report (start from `aeg-root/templates/pr-report-template.md`), with this entire brief pasted as the reference copy inside a collapsed `<details>` block, and `Closes #[N]` at the top of the header block.
- [what to state in the PR body: decisions made, confirmations required by §8]
- Pre-open gate: `PR_BODY="$(cat <body-file>)" bun packages/aeg-core/bin/verify-docs.ts --pr` green.
- Include `git diff main --stat` and a token report (D-071; if unavailable, state so).
- Then STOP. Review and Verification are separate invocations.
