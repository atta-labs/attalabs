---
sidebar_title: Reviewer → Archivist
contract_id: reviewer-archivist
description: Carries a review’s actual findings into the permanent record, so a verdict says what was checked, not just that it passed.
status: active
producer: reviewer
consumer: archivist
carrier: pr-verdict-comment
summary: Ever had a vague "looks good" review that told you nothing about what was checked?
---
# Contract: Reviewer → per-task Archivist

**Status:** active
**Seam:** the hand-off from the Reviewer (producer) to the per-task Archivist (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/roles/reviewer.md` (producer side) and `aeg-root/roles/archivist.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

Close-out is not a mechanical afterthought — it is the step that makes an iteration's history honest. When the Reviewer's verdict is incomplete (no severity tags, no spec-conformance result, no explicit verdict line), the Archivist cannot assemble the provenance block correctly: they cannot distinguish what was reviewed from what was inferred, what was found from what was missed. This contract removes that ambiguity by specifying exactly what the Reviewer's verdict must contain and exactly what the Archivist reads from it.

The failure mode this prevents: an Archivist who assembles a provenance block with fabricated or inferred fields because the Reviewer's comment was vague; or a BLOCKER finding that merged silently because the Archivist didn't know it existed; or a STALE-SPEC finding that disappeared without a follow-up Issue because no one tracked it.

---

## The hand-off carrier

The **Reviewer's verdict comment** on the open (then merged) PR, plus the **merged PR itself**. The verdict comment is the producer's output; the merge is the trigger that authorizes the Archivist to begin close-out. The Archivist reads the verdict from the PR's review history — it is a frozen fact on the PR record.

---

## The contract — field-by-field mapping

Every item the Reviewer produces in the verdict (left) has exactly one obligation for the per-task Archivist (right). A verdict missing any left-column item is malformed — the Reviewer refuses to post it in that state.

| Reviewer produces | per-task Archivist consumes at | What the consumption means |
|---|---|---|
| **Verdict** (`APPROVE` or `REQUEST CHANGES`) | Entry gate | The Archivist only runs close-out on `APPROVE` + merged PRs. A `REQUEST CHANGES` verdict means the task is not done — close-out does not run until the Reviewer posts `APPROVE` and the PR is subsequently merged. |
| **Finding list** with severity tags (`BLOCKER` / `MAJOR` / `MINOR` / `NIT`) | Provenance block assembly | The Archivist includes the verdict and finding count in the provenance block. A `MAJOR` or `BLOCKER` finding that merged despite being raised means a deviation was approved — the Archivist logs it in the provenance block under DANGLING. |
| **Spec-conformance result** (`CONFORMS` / `DRIFTS` / `CONTRADICTS` / `STALE-SPEC`) | Provenance block + pinned lessons Issue (#453) | `CONTRADICTS` that merged is a `severity:strategy` flag in the provenance block. `STALE-SPEC` triggers a follow-up Issue (the Archivist opens it if the Developer did not) — it is not a reason to block merge, but it must not disappear. |

**Reading the table:** left is the producer obligation (Reviewer role doc and this contract enforce it), right is the consumer obligation (Archivist role doc and this contract enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Reviewer)

- Every finding must carry a severity tag (`BLOCKER`, `MAJOR`, `MINOR`, or `NIT`). A finding without a tag is malformed — the Reviewer revises the comment before the verdict is considered valid.
- The verdict line must be the **first line** of the verdict comment, in the exact format specified by `roles/reviewer.md`: `VERDICT: APPROVE | REQUEST CHANGES`.
- The spec-conformance result must be stated explicitly — `CONFORMS`, `DRIFTS`, `CONTRADICTS`, or `STALE-SPEC`. "Not checked" is not acceptable for Tier 1+ tasks with a named Project.
- A verdict comment missing any of these three elements is malformed. The Reviewer does not post it.
- Append one row to the iteration's token ledger after posting the verdict.

## Consumer obligations (the per-task Archivist)

- Do not run close-out on unmerged PRs. The merge is the authorization signal — confirmed by querying the forge, not by reading a status field.
- Assemble the provenance block from frozen PR facts (brief in PR body, verdict comment, merge metadata) — never fabricate a field whose source fact is absent. A missing source fact is a DANGLING item, not an opportunity to infer.
- Post the provenance block as a comment on the merged PR (the PR is a frozen truth domain once merged; the provenance block is its permanent record).
- **The provenance block comment is the forge-derived coherence signal that downstream roles depend on.** The next Developer to start a task in this iteration checks whether the most-recently-merged task PR carries a provenance block before executing step 0 — its absence is a hard STOP that blocks the next task from starting. Post it completely; a partial or absent block does not satisfy the Developer's entry gate (see `aeg-root/roles/developer.md` and `aeg-root/contracts/brief-developer.md`).
- A `BLOCKER` or `MAJOR` finding present in the verdict of a merged PR means a deviation was approved. Log it in the provenance block under DANGLING and post a new comment on the pinned lessons Issue (#453, D-110).
- A `STALE-SPEC` finding in a merged PR must produce a follow-up Issue if the Developer did not already open one. This is the Archivist's responsibility to ensure it happens.
- Append one row to the iteration's token ledger at close-out.

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Reviewer produces without, in the same change, updating what the per-task Archivist consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract — `state-machine.md` §9) and requires a `D-###` decision entry.
- The same PR that edits this contract must verify both `aeg-root/roles/reviewer.md` and `aeg-root/roles/archivist.md` still point here and still match the table.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Reviewer fills the left column; the per-task Archivist drains the right. One source of truth, changed as a unit.*
