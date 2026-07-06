---
sidebar_title: Developer → Reviewer
---
# Contract: Developer → Reviewer

**Status:** active
**Seam:** the hand-off from the Developer (producer) to the Reviewer (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/roles/developer.md` (producer side) and `aeg-root/roles/reviewer.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

A review is only as good as the artifact it reviews. When the Developer hands off an incomplete, CI-failing, or brief-free PR, the Reviewer's independence is wasted — they spend the session verifying basics rather than judging correctness and spec-conformance. This contract removes ambiguity about what "ready for review" means: the Developer cannot open a PR without satisfying the left column; the Reviewer cannot start without verifying the right column.

The failure mode this prevents: a Reviewer who begins reviewing a diff without reading the brief (and therefore judges code rather than intent), or who reviews a red-CI PR (and cannot distinguish the Developer's errors from pre-existing failures), or who accepts a PR that touched files outside the brief's surface map without flagging it as a BLOCKER.

---

## The hand-off carrier

The **open PR** — the diff plus the PR body, which carries the brief verbatim. The PR is the Reviewer's primary artifact. The brief (in the PR body) is the intent document; the diff is the execution; the Reviewer's job is to judge whether the execution matched the intent, safely and correctly.

---

## The contract — field-by-field mapping

Every item the Developer produces in the open PR (left) has exactly one obligation for the Reviewer (right). A PR missing any left-column item is not ready for review — the Reviewer refuses to start and sends it back to the Developer.

| Developer produces in the PR | Reviewer consumes at | What the consumption means |
|---|---|---|
| **Brief in PR body** (the frozen brief, pasted verbatim) | Entry — read before looking at the diff | The Reviewer reads the brief first to understand intent, boundary, surface map, and traps. Reviewing a diff without the brief is not a valid review pass. |
| **Tier:** field in PR body | Determines review depth | Tier 0 → light pass; Tier 1 → standard including spec-conformance; Tier 3 → full including decision log and state doc verification. |
| **CI green** (typecheck, lint, tests, `verify-docs`) | Entry gate | The Reviewer does not start if CI is red. A red CI is a Developer problem, not a Reviewer finding. |
| **Surface map respected** (diff touches only files named in the brief's §4) | First diff check | If the diff touches files outside the surface map, that is a BLOCKER finding before reading any logic. |
| **Task Done checklist ticked** | Confirms Developer self-checked | The Reviewer verifies the checklist is present and ticked. An unticked item that the Reviewer then finds broken is a MAJOR finding. |
| **`[agent]` Test Plan items run with evidence comment** | Confirms runtime verification | The Reviewer checks that actual command output was posted for every `[agent]` item. Missing evidence = unticked item = MAJOR finding. |
| **§7 doc-update list honored** (every named doc updated in the diff) | Doc coupling check — first diff step after surface-map check | A §7-named doc absent from the diff or present but incorrect is a BLOCKER (D-058 — §7 is a DoD obligation, not guidance). `verify-docs` gates structural presence; the Reviewer gates content correctness. |
| **`packages/governance/doc-owners` coverage (C5) satisfied** — every binding fired by the diff is bound (in-diff doc), URL-acked (`Doc-ack: <pointer> — <note>`), or explicitly waived (`Doc-waiver: <pointer> — <reason>`). | Coverage check — *mechanical* via CI; the Reviewer reads it as already-true and moves on. | Coverage presence is mechanical (D-062 — `verify-docs` C5 fails CI if missing). The Reviewer's job shrinks to **judging correctness of the covered doc**: a passing C5 plus an incorrect / no-op / misleading doc update is still a BLOCKER. A `Doc-waiver:` line is the author's explicit deferral; the Reviewer judges whether the reason is real or papering over an obligation that belongs in this PR — a waiver-of-convenience is a BLOCKER. The seam is dormant when `packages/governance/doc-owners` is absent or no binding matches; in that case there is nothing for either side to do. |

**Reading the table:** left is the producer obligation (Developer role doc and this contract enforce it), right is the consumer obligation (Reviewer role doc and this contract enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Developer)

- **Prior-archival precondition satisfied.** Before starting any work on this task, the Developer must have passed the prior-archival precondition defined in `aeg-root/contracts/brief-developer.md` (consumer obligations) and enforced in `aeg-root/roles/developer.md` (entry gate, item 3): the most-recently-merged task PR in the iteration carries a provenance block comment. A PR produced without first passing this gate was produced outside protocol — the provenance chain is broken and the close-out for the preceding task is incomplete.
- **§7 doc-update list honored.** Every doc named in §7 must be updated in the diff before opening the PR. A PR with §7 items outstanding is not ready for review; do not open it and expect the Reviewer to discover the gap. (D-058)
- **`packages/governance/doc-owners` coverage satisfied (D-062).** For every binding fired by the diff: update the bound doc in this PR; or, for URL bindings, add `Doc-ack: <pointer> — <note>`; or add `Doc-waiver: <pointer> — <reason>` with a real reason. `verify-docs` C5 enforces this mechanically — if it fails CI, do not request review.
- CI must be green before requesting review. Do not request review with a red CI and expect the Reviewer to begin.
- The brief must be in the PR body, unmodified — pasted verbatim, not summarized or paraphrased.
- The diff must touch only files in the brief's Technical Surface Map (§4). Files outside it are a stop-and-escalate before opening the PR, not a finding for the Reviewer to catch.
- The Task Done checklist must be ticked — all items, with actual verification evidence for each.
- Every `[agent]` Test Plan item must have an evidence comment posted on the PR — the actual command output, not a paraphrase.
- One row appended to the iteration's token ledger before opening the PR.

## Consumer obligations (the Reviewer)

- Read the brief before the diff. This is not optional — the brief is the intent document; the diff without the brief is just code.
- Do not start if CI is red. Post a comment: *"CI is red — returning to Developer. Start review once CI is green."*
- Check surface map compliance as the first diff-inspection step. A surface map violation is a BLOCKER before any logic review.
- **Verify §7 doc-update list compliance as a BLOCKER gate (D-058).** For every doc named in §7, confirm it appears in the diff AND is correct (not just present — `verify-docs` already checks presence). A §7-named doc absent from the diff or present but wrong is a BLOCKER finding before reviewing logic. This is a hard gate, not an advisory; §7 is a DoD commitment.
- **Judge correctness of `packages/governance/doc-owners` coverage (D-062).** Coverage *presence* is mechanical — `verify-docs` C5 has already enforced it (or the PR would not be green). Your job is to read each in-diff doc update that satisfied a C5 binding and confirm it actually reflects the code change, not a no-op edit or misleading rewrite that silenced the gate. A passing C5 + an incorrect doc update is a BLOCKER. For each `Doc-waiver:` line, judge whether the reason is real or a waiver-of-convenience; the latter is a BLOCKER.
- Produce a structured verdict per `roles/reviewer.md` output format — with severity tags on every finding. A verdict without severity tags is malformed.
- Do not edit the code. Do not expand scope. Do not approve to be agreeable.
- Append one row to the iteration's token ledger after posting the verdict (and again on each re-review after `CHANGES_REQUESTED`).

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Developer produces without, in the same change, updating what the Reviewer consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract — `state-machine.md` §9) and requires a `D-###` decision entry.
- The same PR that edits this contract must verify both `aeg-root/roles/developer.md` and `aeg-root/roles/reviewer.md` still point here and still match the table.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Developer fills the left column; the Reviewer drains the right. One source of truth, changed as a unit.*
