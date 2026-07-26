---
sidebar_title: Brief → Developer
title: Brief → Developer
order: 2
contract_id: brief-developer
description: Carries a brief to the agent that executes it, so nothing the author knew is left implicit.
status: active
producer: brief-author
consumer: developer
carrier: pr-body
summary: Ever handed someone a task and they missed something you thought was obvious?
---
# Contract: Brief Author → Developer

## The short version

This seam sits between the brief and the agent that executes it. It exists to close the gap where an author assumes something is obvious and an executor never sees it stated.

**What crosses** — one brief, complete. The exact command that creates the isolated working copy and branch, to be run before anything else. The impact tier, which decides how much documentation and record-keeping the work owes. The projects it touches. The context: what the task is not, and the traps already found. What must exist and be merged before it can start. The bounded file surface it may touch. Pinned assertions about the current code, so a brief written yesterday cannot be executed against a surface that has moved. The documents it must update. The checklist it satisfies before opening a pull request. A test plan, each item marked as one an agent can run or one only a person can. The conditions that stop it. The constraints it may not weigh against convenience. And, where the work touches a locked decision, an acknowledgment of it.

**The hand-off is malformed when** — any of those is missing. A brief without stop conditions is not a terse brief; it is one whose executor will invent them. A file surface described as "wherever else turns out to need it" is not bounded. A documentation list assembled from memory rather than reading is not a list. It is equally malformed to skim rather than read it, to treat a stop condition as advice, to execute past the file surface because nothing blocked it, or to paraphrase a verification result instead of pasting what the command printed.

**What it does not carry** — status, which is derived from branches and pull requests and never written; the planner's durable reasoning, which crossed the previous seam and lives on the issue; and any authority to amend the brief. The brief is frozen at dispatch; a change to it is an escalation, not an edit.

**How it physically runs** — the carrier is the pull-request body, which holds the brief verbatim. That is the brief's permanent home: the executing agent reads it there, the reviewer reads it there to judge intent against outcome, and the close-out reads it there as evidence. It is never committed into the repository and never stored in the issue, which holds task identity only — a brief kept anywhere durable goes stale before the work starts.

Everything below is the reference: the field-by-field mapping and both sides' obligations in full.

---

## Reference

**Status:** active
**Seam:** the hand-off from the Brief Author (producer) to the Developer (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/skills/brief-authoring/SKILL.md` (producer side) and `aeg-root/roles/developer.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

A brief is the executable contract between intent and implementation. When the hand-off from Brief Author to Developer is described separately in each role doc, the descriptions drift: the Brief Author believes the Developer will infer certain things; the Developer misses the fields the Brief Author thought were obvious. This contract removes that drift structurally — there is exactly one description of what a brief must carry and what the Developer must do with each field.

The failure mode this prevents: a Developer who starts work without reading the full brief, or who treats stop conditions as suggestions, or who improvises past a surface-map boundary because nothing explicitly blocked them. Every field below is present in every well-formed brief; its absence is a signal the brief is malformed, not that the field is optional.

---

## The hand-off carrier

The **PR body** — which the Developer opens at the start of execution and which carries the full brief verbatim. The brief is not in the Issue (the Issue is task identity + Planner's rationale only). The PR body is the brief's permanent, durable home. The Developer reads the PR body as the brief; the Reviewer and Archivist read it as evidence of intent.

---

## The contract — field-by-field mapping

Every field the Brief Author emits (left) has exactly one named obligation for the Developer (right). A brief missing any left-column field is malformed — the Brief Author refuses to dispatch it. A Developer who drops a right-column obligation is executing incorrectly.

| Brief Author emits | Developer consumes at | What the consumption means |
|---|---|---|
| **Worktree step 0** (verbatim `git worktree add` command) | First action before any other command | The Developer must execute this exact command first. No exceptions. Never assume the right branch exists. Before executing it, the Developer independently re-verifies the branch-name suffix literal-matches the topology's `#` column — the same check the Brief Author already ran before writing the command. |
| **Tier:** field | PR-open checklist + `vinaya/tier:*` label | The Developer sets the matching `vinaya/tier:*` label on the Issue at PR open. The field is binding; the label is the scannable projection. |
| **Project:** field | PR description + `verify-docs` | The Developer confirms the project resolves against `packages/governance/projects.md`. |
| **Context** including boundary + traps | Mental model before any code | The Developer reads the boundary ("what this task is NOT") to know what to refuse to build, and the traps to know what not to do. |
| **Technical Dependencies** | Verify all depends-on are merged | The Developer confirms every named dependency is on `main` before starting. A depends-on not yet merged is a hard stop. |
| **Technical Surface Map** | Bounds the diff | The Developer touches only files in the surface map. Files outside it are a stop-and-escalate. |
| **Premise pins (`Premise:` block, mandatory when the surface map names a real code surface)** | Re-asserted before Step 0, via `verify-dispatch --premise <body-file>`; re-asserted again pre-PR via `verify-task` | A failed premise means the surface moved since the brief was authored — the Developer stops and re-digs rather than executing against a stale mental model. This is a stop condition, not a silent re-guess. `checkPremiseCoverage` (Brief Validation) fails a brief with a real code surface and zero premise coverage. |
| **Documentation-update list** | Self-check before opening PR + Reviewer doc check | The Developer updates every doc named in the list before claiming done. The list is a DoD obligation, not a recommendation — a named doc not updated is a BLOCKER at review. `verify-docs --pr` gates structural presence; the Reviewer gates content correctness. |
| **Task Done checklist** | Self-check before opening PR | The Developer runs every item before opening the PR. An unchecked item means the PR is not ready. |
| **Test Plan** tagged `[agent]` / `[principal]` | Runs `[agent]` items; leaves `[principal]` for Principal | The Developer runs every `[agent]` item and posts evidence. Does not tick `[principal]` boxes. |
| **Stop conditions** | Halt triggers | The Developer stops and posts a blocker comment on the Issue when any condition is met. Never improvises past a stop condition. |
| **Constraints** | Hard rules during execution | The Developer treats these as absolute — not "guidelines." A violated constraint is a PR that must not merge. |
| **Lock acknowledgment** (when the brief touches a `decisions.md`/`*-decisions.md` entry marked `Lock: YES`) | PR body, as `**Conforms to lock:** D-### — <description>` or `**Challenges lock:** D-### — <description>` + `**Rationale:** <text>` | The Developer includes the acknowledgment block verbatim in the PR body. `brief-validation` (the Brief→Developer gate) fails the PR if the diff touches a locked decision and neither form is present, or if the challenge form lacks a `Rationale:` field. |

**Reading the table:** left is the producer obligation (Brief Author enforces it by refusing to dispatch a malformed brief), right is the consumer obligation (Developer role doc and executor protocol enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Brief Author)

- Every field in the left column above must be present. A brief missing any of them is malformed — the Brief Author refuses to dispatch it.
- The brief is frozen at dispatch; amendments go through escalation (`severity:execution` or `severity:strategy` depending on what changed).
- The worktree step 0 command must be exact — branch name, base ref (`origin/main`), and destination path must all be present. The branch name's suffix must literal-match the task's row in the iteration topology file's `#` column — character for character, no added prefix, no case change, no truncation.
- Stop conditions must be explicit, not inferred. Every known failure mode for this task belongs in the brief's stop conditions — the Developer will not invent stop conditions that aren't stated.
- The surface map must be bounded and named. "Wherever else turns out to need it" is not a surface map.
- **The documentation-update list must be populated from reading, not memory.** The Brief Author's Dig must identify and read any relevant specs/skills/docs before drafting it. The list for Tier 1+ must be non-empty unless the surface map genuinely touches no documented surface (state "No doc updates required" explicitly in that case). A list populated from the Planner's rationale alone without the Brief Author's own reading is malformed.
- **A brief with a real code surface must carry a `Premise:` block pinning at least one checkable fact inside that surface.** A Tier 0 brief with zero code/runtime surface has nothing to pin.

## Task-status coherence precondition — hard STOP before authoring or executing any task

> **SUPERSEDED (2026-07-13).** This precondition (the per-task archival / row-adjacency gate) is no longer a hard-STOP for the Brief Author or the Developer — automated post-merge provenance posting made the drift signal it protected moot. The section below is preserved as historical record — do NOT enforce it.

~~The Brief Author MUST verify this precondition before authoring any task brief. The Developer MUST verify it before step 0. **If any predicate fails for any in-scope prior, STOP and report to the Principal what is owed — do NOT author, do NOT begin work, do NOT rationalize past it.**~~

**The archival bar.** A prior task is "done" when ALL THREE predicates hold:
1. Its forge Issue is **closed**
2. Its PR is **merged to main**
3. Its **provenance block** comment is present on the merged PR (posted by the Archivist)

"PR merged" alone is NOT the bar. A merged PR whose Issue is still open, or whose provenance block is absent, is an incomplete archival — the Archivist has not fully closed out.

**Scope of "prior task" — verify all three predicates for each:**
- **Mid-iteration task:** every earlier task in the same iteration that this task depends on (direct `depends-on` edges).
- **First task of an vinaya/iteration:** the entire previous iteration of that product must be archived — all Issues closed, all PRs in main, all tasks with provenance blocks, iteration file in `aeg-root/iterations/completed/`.
- **ALL tasks:** every cross-iteration dependency declared in the topology (e.g. a vada task that depends on a herald task from another iteration) must also satisfy all three predicates.

**Hard STOP language:** *"Prior task [Y] does not pass the coherence gate: Issue #N is [open/closed], PR #M is [merged/unmerged], provenance block is [present/absent]. The Archivist must fully close out task [Y] before this task can proceed. Here is what is owed: [list]."*

**Accepted-backfill never bypasses this gate.** Deferring backfill of historical provenance on **already-closed iterations** is a permitted debt record; proceeding with a new task on an **unarchived active prior** is not. The accepted-gap clause is strictly limited to closed historical iterations; it cannot be cited to bypass the coherence precondition for tasks in an active iteration. An accepted historical backlog is a debt record, not a gate bypass. The coherence precondition applies to active prior tasks; it cannot be waived by citing accepted historical gaps.

The Brief Author's enforcement is at Dig stage, item (c) (see `aeg-root/skills/brief-authoring/SKILL.md`). The Developer's enforcement is at entry gate items 3–5 (see `aeg-root/roles/developer.md`). The Brief Author gate fires one stage earlier than the Developer gate — catching the gap before a brief the Developer will immediately refuse is dispatched.

---

## Consumer obligations (the Developer)

- **Honor the documentation-update list.** Every doc named in the list must be updated as part of the task deliverable — not post-merge cleanup, not a follow-up task. A named doc not updated is a BLOCKER at review. If the list names a doc you cannot find or access, stop and report — do not silently skip it.
- **Row-existence precondition (hard STOP before step 0).** Before executing step 0, `git fetch origin main`, then confirm this task's row exists at all in its iteration topology file (`aeg-root/iterations/<name>.md`) — read from the freshly-fetched `origin/main`, never a stale local checkout or memory. This is distinct from and prior to the Issue-existence precondition below: a missing row means the plan PR that adds this task has not merged yet. STOP: *"Task <id> is not present in `aeg-root/iterations/<name>.md` on a freshly-fetched `origin/main` — the plan PR that adds it has not merged. Not dispatchable until it does."* This gate is enforced in `aeg-root/roles/developer.md` (entry gate, item 7).
- **Issue-existence precondition (hard STOP before step 0).** Before executing step 0, locate this task in its iteration topology file (`aeg-root/iterations/<name>.md`) and confirm the Issue column carries a real GitHub Issue number — not `#TBD`, not blank. If it is `#TBD` or blank, the task has no forge Issue and is not dispatchable. STOP: *"Task <id> in iteration `<name>` has no Issue (#TBD) — it is not dispatchable. The Planner must cut the Issue before this task can start."* This gate is enforced in `aeg-root/roles/developer.md` (entry gate, item 3).
- ~~**Prior-archival precondition (hard STOP before step 0).**~~ **SUPERSEDED (2026-07-13)** — no longer a Developer obligation. See the notice above the task-status coherence precondition section. Preserved as historical record: ~~Before executing step 0, apply the task-status coherence precondition above to every in-scope prior task. Verify all three predicates (Issue closed, PR in main, provenance block present) for each. If any predicate fails for any in-scope prior, STOP: report to the Principal exactly what is owed and do not begin work. If no prior task exists in scope (first task of a fresh iteration with no prior iteration on this product), this check passes trivially. This gate was enforced in `aeg-root/roles/developer.md` (entry gate, item 4) and the coherence signal it read is defined in `aeg-root/contracts/reviewer-archivist.md`.~~
- **Branch-ID verification precondition (hard STOP before step 0).** Before executing step 0, read this task's row in the iteration topology file and confirm the Step 0 branch-name suffix literal-matches the `#` column — character for character, no added prefix, no case change, no truncation. If it doesn't, STOP: do not create the worktree/branch, report the mismatch to the Brief Author/Principal rather than silently using either name. This is the same check the Brief Author already ran before writing the command — the Developer re-runs it independently rather than trusting the brief was authored correctly. This gate is enforced in `aeg-root/roles/developer.md` (entry gate, item 6).
- **Mechanized precondition check.** The three preceding preconditions (row-existence, Issue-existence, and the prior-iteration-archival check in `roles/developer.md` entry gate item 5) are all re-derivable in one command: `bun packages/aeg-core/bin/verify-dispatch.ts <iteration> <n>`. Run it before step 0; a `NOT READY` result names the exact failing precondition and is the same STOP described above. (The prior-archival/row-adjacency precondition previously listed here was removed from this composed check.)
- **Premise re-check (hard STOP before step 0).** If the brief carries a `Premise:` block, re-assert it before step 0 via `verify-dispatch --premise <body-file>` (the body-file being the dispatched brief text). A failed premise means the surface moved since authoring — STOP and re-dig, do not proceed on a stale mental model.
- Read the full brief before opening the worktree. Not a skim — every section.
- Execute step 0 first, always. Never branch from `HEAD` of the current local checkout.
- Verify all dependencies are merged before the first line of code.
- Stay within the surface map. Files outside it are a stop-and-escalate, not a judgment call.
- Run every `[agent]` Test Plan item and post the actual command output as evidence. Do not paraphrase verification results.
- Stop on any stop condition — post a blocker comment, do not improvise.
- Append one row to the iteration's token ledger at turn-end (before opening PR, and again on each re-push after `CHANGES_REQUESTED`).

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Brief Author emits without, in the same change, updating what the Developer consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract) and requires a decision-log entry.
- The same PR that edits this contract must verify both `aeg-root/skills/brief-authoring/SKILL.md` and `aeg-root/roles/developer.md` still point here and still match the table.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Brief Author fills the left column; the Developer drains the right. One source of truth, changed as a unit.*
