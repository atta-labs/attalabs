---
sidebar_title: Archivist → Iteration Archivist
contract_id: archivist-iteration-archivist
description: Carries each task’s close-out record up to the iteration close-out, so a phase can only be called finished once its parts genuinely are.
status: active
producer: archivist
consumer: iteration-archivist
carrier: pr-provenance-comments, iteration-file
summary: Ever closed out a big project only to find smaller pieces were never really finished?
---
# Contract: per-task Archivist → Iteration Archivist

**Status:** active
**Seam:** the hand-off from the per-task Archivist (producer) to the Iteration Archivist (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/roles/archivist.md` (producer side) and `aeg-root/roles/iteration-archivist.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

The per-task Archivist closes out individual tasks; the Iteration Archivist closes out the whole iteration. The Iteration Archivist's close-out is only honest if every per-task Archivist ran correctly — a missing provenance block means a task's history is incomplete, and an incomplete history means the retrospective is assembled from gaps rather than facts. This contract specifies exactly what the per-task Archivist must produce before the Iteration Archivist is authorized to begin, and exactly what the Iteration Archivist reads from those outputs.

The failure mode this prevents: an Iteration Archivist who begins close-out before verifying that every task's per-task Archivist ran, and then assembles a retrospective and iteration provenance block that silently omits a task's history or fabricates fields whose source facts were never produced.

---

## The hand-off carrier

The **set of merged PRs**, each bearing a per-task provenance block comment, plus the **iteration file** at `aeg-root/iterations/<name>.md` which provides the task topology the Iteration Archivist checks against. Every task in the topology must have a merged PR with a provenance block; the absence of either is a gap the Iteration Archivist must flag before proceeding.

---

## The contract — field-by-field mapping

Every output the per-task Archivist produces (left) has exactly one obligation for the Iteration Archivist (right). A task missing any left-column output is a close-out gap — the Iteration Archivist does not proceed with partial evidence.

| per-task Archivist produces (per task) | Iteration Archivist consumes at | What the consumption means |
|---|---|---|
| **Provenance block comment** on each merged PR | Entry gate verification | The Iteration Archivist verifies every task PR has a provenance block comment before starting close-out. A missing provenance block means that task's per-task Archivist close-out was incomplete — stop and flag: *"Task N's PR has no provenance block — per-task Archivist did not run for this task. Flag for Principal before proceeding."* |
| **Lessons Issue comments** (#453) for any `BLOCKER`/`MAJOR` findings that merged | Retrospective assembly | The Iteration Archivist reads the pinned lessons Issue's comments since the iteration started and includes the patterns they identify in the retrospective's "What stalled or caused rework" and "Carry-forward lessons" sections. |
| **Follow-up Issues** opened for `STALE-SPEC` findings | State doc update | The Iteration Archivist notes open follow-up Issues in the relevant pinned state Issue under "Pending manual operations" (or in the output report as DANGLING items). A `STALE-SPEC` finding with no follow-up Issue is a DANGLING item — flag it for the Principal. (`now.md` is retired.) |

**Reading the table:** left is the producer obligation (per-task Archivist role doc and this contract enforce it), right is the consumer obligation (Iteration Archivist role doc and this contract enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the per-task Archivist)

- Post a provenance block comment on every merged task PR — no exceptions. This is the single most critical output: without it, the Iteration Archivist's entry gate fails and close-out cannot proceed.
- Post a new comment on the pinned lessons Issue (#453) for every `BLOCKER` or `MAJOR` finding that was present in the Reviewer's verdict and merged anyway (a deviation). A deviation without a lessons entry is a missed learning.
- Open a follow-up Issue for every `STALE-SPEC` finding identified by the Reviewer. If the Developer already opened one, confirm it exists; do not open a duplicate.
- Append one row to the iteration's token ledger at close-out.

## Consumer obligations (the Iteration Archivist)

- Verify every task PR has a provenance block comment before starting. If any is missing, stop and flag — do not proceed with partial close-out. Partial close-out is worse than no close-out: it creates a plausible-looking but incomplete record.
- Read the pinned lessons Issue's (#453) comments since the iteration start date before assembling the retrospective. Carry-forward lessons that appear there but are not reflected in the retrospective are a gap.
- Note open follow-up Issues in the relevant pinned state Issue (under "Pending manual operations") or in the close-out report as DANGLING items. If a `STALE-SPEC` finding has no follow-up Issue (the per-task Archivist missed it), flag it as DANGLING and open the Issue on behalf of the Principal. (`now.md` is retired.)
- Do not assemble the iteration retrospective from memory or inference — assemble it from merged PR summaries, the pinned lessons Issue's comments, and the iteration topology file. The retrospective is a structured projection of facts.

---

## Changing this contract

A contract changes **as a unit**. You may not change what the per-task Archivist produces without, in the same change, updating what the Iteration Archivist consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract) and requires a decision-log entry.
- The same PR that edits this contract must verify both `aeg-root/roles/archivist.md` and `aeg-root/roles/iteration-archivist.md` still point here and still match the table.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The per-task Archivist fills the left column; the Iteration Archivist drains the right. One source of truth, changed as a unit.*
