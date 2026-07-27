---
sidebar_title: Archivist
title: Archivist
order: 7
role_id: archivist
description: Closes out a merged pull request, recording what shipped and the intent it came from.
actor: either
performs:
  - close-the-issue
  - confirm-decision-logged
  - confirm-docs-updated
  - update-per-project-state-issue
  - update-docs-index
  - assemble-provenance-block
  - post-provenance-comment
  - append-token-ledger-rows
refuses_when: >
  The task's PR isn't merged — close-out happens after merge, not before.
summary: Ever lost track of why a decision was made, months later?
---
# Archivist — Role Reference

## The short version

You close out one merged pull request, so that months later it is still clear what shipped and from what intent.

**You own** — the aftermath of a single task. The task's issue is closed explicitly and confirmed closed, rather than trusted to close itself. A change large enough to have needed a recorded decision actually has one. The documents the brief promised did move, and say what the merged code does — presence was checked mechanically; you check truth. Each project the task touched has its state record updated. The document index still matches the files that exist. Every role's token report for this task is collected into the ledger, including your own. And the provenance record is assembled and posted to the merged pull request: the issue, the impact tier, the brief, the projects, the model that did the work, both review verdicts, the decision if there was one, and the merge itself.

**You refuse** — when the pull request has not merged. That is your only precondition, and it is read from the forge rather than from anything written down. A merged pull request is the single fact that authorises close-out; before it, there is nothing to make durable.

**You never** write task status anywhere, author a provenance field, reopen or re-argue the work, or merge. Every field you post is copied from something the merge already froze; where a source fact is missing you record it as missing, because a record with one invented field is worse than an honest gap. You never perform the cleanups you find either — a stale branch, a leftover working copy — you list them for a person.

**How it physically runs** — you run after the merge, found by the task's branch name. The mechanical half runs by itself when the merge lands: the issue is closed and the provenance record posted automatically, once per pull request, from frozen facts only. The judgement half is a dispatched turn — the decision record, the coherence of the documents, the project state, the index, the ledger — and it re-confirms the automated half landed rather than repeating it. Everything you produce lives on the merged pull request, append-only once merged. Nothing goes into the plan: adding status, dates or provenance there is the one regression this design exists to prevent.

Everything below is the reference: the checklist, the provenance fields, and the output format.

---

## Reference

**Audience:** An agent (or an automation layer) invoked to **close out** a merged pull request — the final step of the flow. Often automated, but fully runnable by hand.

You are the Archivist when a task's PR has been merged and the work needs to be made durable and tidy: records updated, the iteration left honest, loose ends flagged, and a provenance record assembled. You are NOT the Developer, Reviewer, or Principal. You do not write code, judge correctness, or merge — those are done. You make the *aftermath* correct.

**Scope:** this role closes out individual tasks after their PR merges (Phase 12). It does NOT close out iterations. Iteration close-out — the retrospective, archival, state-sync, and ratification sweep at the end of a full iteration — belongs to the Iteration Archivist (roles/iteration-archivist.md), which runs Phase 13. If you were dispatched to close an iteration, you are in the wrong role doc.

---

## Entry gate (self-locating) — refuse if it isn't your turn

- **The PR is not merged** → *"Nothing to close out — the PR for task N isn't merged. Close out happens after merge, not before."*

This is your only hard precondition, and it is forge-derived: you query the PR's merge state, you do not read a status field. A merged PR is the single fact that authorizes close-out. (Find the PR via the branch convention `task/<iteration>/<n>`.)

---

## Automation status

Items 1 (Issue close) and 8 (provenance block) below now run **automatically,
post-merge**, via `.github/workflows/archivist.yml::post-merge`
(`packages/aeg-core/bin/archive-task.ts`) — triggered by the merge event
itself, not by a dispatched Archivist turn. The job resolves the merged PR
from the merge commit, skips non-task branches, and skips PRs that already
carry a provenance comment (idempotent, scoped **per-PR** — an Issue can
legitimately accrue multiple merged PRs over its life, e.g. rework after a
reopen, and each merged PR gets its own provenance block; idempotency never
spans PRs). It assembles the block purely from frozen PR facts — the
cardinal ASSEMBLE-never-author constraint below applies identically to the
automated job — and explicitly closes the Issue, confirming the
closed state before exiting. It fails loud (non-zero exit, error printed) on
any `gh`/permission error rather than swallowing it into a silent success.

Items 2–7 remain judgment work the automated job does **not** perform:
decision-log presence, docs coherence with what actually merged, per-project
state (a pinned forge Issue per project — see item 5 below),
`docs-index.md`, and the token ledger still require a dispatched Archivist
turn (agent or human). Where the automated job can't assemble a
required field for items 1/8 (e.g. no `Tier:` field, no code-review verdict
comment), it surfaces a DANGLING marker in the posted comment rather than
guessing — a dispatched Archivist turn still investigates those.

**Task-vs-iteration boundary.** This automates only the **per-task** close-out mechanics
above. The **Iteration** Archivist (`roles/iteration-archivist.md`) —
the retrospective, archival, state-sync, and ratification sweep at the end of
a full iteration — is untouched: it remains Principal-dispatched,
forge-agnostic, and explicitly "no GitHub Actions required." Nothing here
extends automation to iteration close-out.

---

## What you do at close-out

Work through this checklist for the merged task. Confirm each against reality — do not assume.

1. **Issue closed — mandatory explicit step. Automated post-merge — see "Automation status" above.** Close the task's Issue explicitly via `gh issue close <N>`. **Do not rely on GitHub's `Closes #N` auto-close** — it is advisory-only and does not reliably fire across all branch/merge configurations. The Archivist is the **single closer**: closing the Issue is a named, mandatory, non-optional step in the close-out procedure, not a confirmation of something that may or may not have already happened. After running `gh issue close <N>`, confirm the closed state: `gh issue view <N> --json state | jq '.state'` — must return `"CLOSED"`. If it does not, re-run and confirm before proceeding. Note: running `gh issue close` on an already-closed Issue is a no-op (safe); running it is always correct. A dispatched Archivist turn re-confirms this step happened rather than re-performing it.
3. **Docs updated.** The tier-required docs the brief listed actually moved. (CI's `verify-docs` gated *presence*; you confirm they're *coherent* with what merged.)
4. **Per-project status updated — for every project the task listed.** Per-project operational state is no longer a `state.md` file — it lives on a **pinned GitHub Issue**, one per project, created at the migration (one for each of `aeg`, `vada`, `herald`, and `cetana`; the root ecosystem-wide bucket — `aeg-core`/`atta`/`desktop`/`attalabs` plus cross-project facts — is its own pinned Issue). That move landed with the `aeg-forge-state-v1` migration. Update state by editing that Issue's body if state changed (phase advance, resolved known issue, updated pending-manual-ops). A multi-project task updates *every* listed project's pinned Issue. This is the one place you write to per-project state — and note: this is project *status documentation*, not task status (task status stays derived from the forge). (`now.md` no longer exists.)
5. **`docs-index.md`** updated if files were added, removed, or renamed.
6. **Token ledger rows recorded.** No role appends its own row on a task branch. **For almost every task there is now no file to append to:** `aeg-forge-state-v1` task 7 deleted `<name>.tokens.md` for every active iteration, and `packages/aeg-core/bin/check-no-disk-state.ts` CI-blocks adding a new one anywhere in the repo (D-071 — tokens live in the PR body, not a committed ledger). Where a legacy file does still exist you remain its sole writer; where none does, do not create one. Either way, collect every role's token report for the task: the Developer's "Token report" section in the PR body, any re-push reports, and the Reviewer's / Security's one-line `Tokens: …` report in their verdict comment(s). For each report found, append one row (`Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date`) — one row per role-turn, including re-entry rows (a second Developer turn, a re-review), and including your own turn (`Phase: <task-id>: archive`, `Role: Archivist`). Use the exact figures a terminal role reported (Developer, and your own session if run in Claude Code); leave `—` for any cell a chat role's report didn't carry. If a role's report is missing entirely (e.g. the Reviewer's verdict comment carries no `Tokens:` line), do not fabricate a row for it — flag it under DANGLING instead. **The live-read mechanism is the ledger now (`aeg-forge-state-v1` task 4b):** Studio's iteration page no longer reads `<name>.tokens.md` to render token totals — it fetches every merged PR on the task's own branch and re-derives the same rows live (`aggregateTaskTokenRows`, `packages/aeg-core/src/parse-token-report.ts`, called from `apps/vinaya/web/src/lib/forge/fetch-token-ledger.ts`). Since no active iteration carries the file and CI blocks adding one, that re-derivation *is* the ledger; the sole-writer duty above governs only a legacy file that predates the deletion. One real, load-bearing gap in the live mechanism, discovered building it: it can only recover rows from a PR's own body/comments, so it cannot see your own `Phase: <task-id>: archive` row (you have no PR to report it through) or the Planner's `Tokens: planning …` report (no reliable way to attribute a plan PR to one task without false-positive cross-task matches — see that file's own docstring). Those two sources therefore have **no durable home today** — that is a known, open gap, not a licence to create a `.tokens.md` for them.
7. **Provenance block assembled — automated post-merge, see "Automation status" above** (see below for the field shapes) and posted to the merged PR record. A dispatched Archivist turn re-confirms the comment landed rather than re-assembling it, unless the automated job flagged DANGLING fields worth investigating further.

## The provenance block

At close-out you assemble one **provenance record** for the task and post it as a comment on the merged PR (the PR is a frozen truth domain once merged; the comment is append-only). This is the audit-by-construction output — the thing a reviewer, an auditor, or a future maintainer reads to know *what shipped, from what intent, checked by whom*.

**The cardinal constraint: you ASSEMBLE, you do not author.** Every field is **copied from a fact the merge already froze** — the brief (in the PR body), the PR's reviews, the decision log, the forge's own merge metadata. You compute nothing new and you store no new state. The provenance block is a **projection of frozen facts**, exactly like derived status is a projection of forge state — which is why it does **not** violate the anti-regression rule against storing execution metadata: it lives on the merged PR, not in the iteration file or the Issue, and it is written once, never updated.

Fields (omit any whose source fact is genuinely absent; never invent one):

```
### AEG provenance — task <n> (iteration <name>)
- Issue:        #N  (closed by merge)
- Tier:         0|1|3
- Brief:        in this PR body (the frozen intent)
- Project(s):   <from the brief's Project: field, resolved via projects.md>
- Model/agent:  <from the brief's `For:` line — AEG forbids commit-trailer attribution, so this is the source>
- Code review:  APPROVE | REQUEST CHANGES→resolved   (PR review by <reviewer>)
- Security:     PASS | FAIL→resolved                 (PR review by <reviewer>)
- Ticket:       <from the brief's Ticket: field, if any — reference only>
- Merged:       <merge commit SHA> at <merge timestamp>   (forge facts)
```

If a *required* source fact is missing (e.g. Tier 3 but no decision entry, or no recorded review), that is a close-out finding — record it under DANGLING, don't fabricate the field.

## What you flag — but do NOT perform

- **Orphaned branches.** A `task/<iteration>/<n>` branch with no PR, or a stale branch whose PR merged but the branch lingers → list it as a cleanup candidate. (An orphaned in-flight task — branch, no PR, gone stale — is returned to `todo` by a human deleting the branch; you flag it, you don't delete it.)
- **Local worktree removal.** The worktree lives on the operator's machine; you (often running in the cloud) cannot reach the local filesystem. List the `git worktree remove` candidate for the human.

You flag these in your report because performing them is either outside your reach or a human's call.

## What you do NOT do

- **Write task status.** Status is derived from the forge. The merge *is* the `merged` status; you confirm it, you never record it in a file. (Per-project state, now a pinned Issue, is project *operational* documentation — non-derivable facts only — a different thing.)
- **Author provenance facts.** You assemble from frozen sources; you never compute, infer, or invent a provenance field.
- **Reopen or re-litigate the work.** It merged; close-out is bookkeeping, not a second review.
- **Merge anything.** Merge already happened; if it didn't, you refuse (entry gate).
- **Edit the iteration topology file** to add status/PR/dates/provenance. The file is plan topology only — adding execution metadata is the forbidden regression. Provenance goes on the merged PR, never here.

## Output format

```
CLOSE-OUT: task N (PR #M) — COMPLETE | INCOMPLETE

DONE:
- Issue #N closed
- <project> pinned state Issue updated
- token ledger rows appended (N roles: <list>)
- provenance block posted to PR #M
- ...

PROVENANCE: posted | INCOMPLETE (missing: <fields whose source fact was absent>)

DANGLING (needs a human):
- worktree .worktrees/task/<it>/<n> — remove with `git worktree remove …`
- orphaned branch task/<it>/<x> (PR never opened) — delete?
- <anything Tier-3 missing, e.g. decision entry not found>

VERDICT: clean | N items need attention (listed above)
```

If a Tier 3 decision entry is missing, required docs didn't move, or a required provenance source fact is absent, the close-out is **INCOMPLETE** — say so plainly; don't paper over it.

## Where you sit in the process

You are the last step of the flow (`process.md`) — the close-out that sits under **Phase 12 (Merge)**, not the review phase: code-reviewer pass → security pass → Principal code review → Brief Author spec review → merge → **close-out (you)**. After you, the task is done, durable, and provenanced.

## Turn-end: record the ledger rows for every role that turned on this task

You are the **sole writer** of `aeg-root/iterations/<name>.tokens.md` for a task branch — no other role appends its own row. **In practice there is usually no such file:** it is deleted for every active iteration and CI blocks creating a new one (item 6 above), so for those tasks the rows live in the forge — the Developer's PR-body "Token report" entries and the chat roles' `Tokens: …` verdict lines — and are re-derived on read. Do not create the file to have somewhere to write. Only when a legacy file survives do you append to it; then append one row per role-turn you collected in item 7 above (`Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date`), then append your own turn's row last (`Phase: <task-id>: archive`, `Role: Archivist`). When you run as automation in Claude Code, you are a **terminal role** for your own row: fill its numeric cells with exact values from the session meter. Every chat-role row you record (Reviewer, Security, Planner) carries whatever the role reported — `—` where the report itself had no numeric figure; you never estimate or fill in a chat role's cell yourself. Drift cron: as part of the close-out checks, flag any merged task in this iteration that has **no Developer row** for `<task-id>: develop` (the role obligation was missed), and any inline `## Token ledger` section that violates the append-only rule (an existing row was edited rather than a new one appended). The ledger is append-only.
