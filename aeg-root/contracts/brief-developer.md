---
sidebar_title: Brief → Developer
---
# Contract: Brief Author → Developer

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
| **Worktree step 0** (verbatim `git worktree add` command) | First action before any other command | The Developer must execute this exact command first. No exceptions. Never assume the right branch exists. |
| **Tier:** field | PR-open checklist + `tier:*` label | The Developer sets the matching `tier:*` label on the Issue at PR open. The field is binding; the label is the scannable projection. |
| **Project:** field | PR description + `verify-docs` | The Developer confirms the project resolves against `aeg-root/projects.md`. |
| **Context (§2)** including boundary + traps | Mental model before any code | The Developer reads the boundary ("what this task is NOT") to know what to refuse to build, and the traps to know what not to do. |
| **Technical Dependencies (§3)** | Verify all depends-on are merged | The Developer confirms every named dependency is on `main` before starting. A depends-on not yet merged is a hard stop. |
| **Technical Surface Map (§4)** | Bounds the diff | The Developer touches only files in the surface map. Files outside it are a stop-and-escalate. |
| **Task Done checklist (§8)** | Self-check before opening PR | The Developer runs every item before opening the PR. An unchecked item means the PR is not ready. |
| **Test Plan (§9)** tagged `[agent]` / `[principal]` | Runs `[agent]` items; leaves `[principal]` for Principal | The Developer runs every `[agent]` item and posts evidence. Does not tick `[principal]` boxes. |
| **Stop conditions (§10)** | Halt triggers | The Developer stops and posts a blocker comment on the Issue when any condition is met. Never improvises past a stop condition. |
| **Constraints (§11)** | Hard rules during execution | The Developer treats these as absolute — not "guidelines." A violated constraint is a PR that must not merge. |

**Reading the table:** left is the producer obligation (Brief Author enforces it by refusing to dispatch a malformed brief), right is the consumer obligation (Developer role doc and executor protocol enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Brief Author)

- Every field in the left column above must be present. A brief missing any of them is malformed — the Brief Author refuses to dispatch it.
- The brief is frozen at dispatch; amendments go through escalation (`severity:execution` or `severity:strategy` depending on what changed).
- The worktree step 0 command must be exact — branch name, base ref (`origin/main`), and destination path must all be present.
- Stop conditions must be explicit, not inferred. Every known failure mode for this task belongs in §10 — the Developer will not invent stop conditions that aren't stated.
- The surface map must be bounded and named. "Wherever else turns out to need it" is not a surface map.

## Consumer obligations (the Developer)

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

- A change to this file is a **Tier 3** change (it alters a cross-role contract — `state-machine.md` §9) and requires a `D-###` decision entry.
- The same PR that edits this contract must verify both `aeg-root/skills/brief-authoring/SKILL.md` and `aeg-root/roles/developer.md` still point here and still match the table.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Brief Author fills the left column; the Developer drains the right. One source of truth, changed as a unit.*
