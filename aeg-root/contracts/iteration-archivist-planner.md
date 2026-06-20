---
sidebar_title: Iteration Archivist → Planner
---
# Contract: Iteration Archivist → Planner

**Status:** active
**Seam:** the hand-off from the Iteration Archivist (producer) to the Planner (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/roles/iteration-archivist.md` (producer side) and `aeg-root/roles/planner.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

The Planner starts a new iteration by reading the current state of a product. If the previous iteration was not archived — if the Iteration Archivist did not run — the Planner reads state docs that describe a product that no longer exists. The plan is built on wrong assumptions and dispatches tasks against a reality that merged away.

This is the failure that actually happened: herald-onto-engine and aeg-ui-v1 completed without the Iteration Archivist running. The Planner started herald-agents-v2, vada-agents-v2, and aeg-governance-ui-v2 against state docs still describing the pre-completion product. The root cause was a missing gate: the Planner's readiness gate had no item that checked whether the previous iteration on each product was archived.

This contract formalizes the close-out outputs the Iteration Archivist must produce, and the physical check the Planner must perform on them. The check is not a checklist item the Planner reviews — it is a filesystem fact: does `aeg-root/iterations/completed/<name>.md` exist? If no, the gate fails.

---

## The hand-off carrier

Four artifacts, all produced by the Iteration Archivist at close-out:

1. The **archived iteration file** at `aeg-root/iterations/completed/<name>.md` — the physical signal.
2. The updated **`aeg-project/state.md`** — the authoritative current-state snapshot for the product.
3. The updated **`aeg-project/now.md`** — the declared "what's next" after the iteration.
4. The **retrospective** appended to `aeg-project/lessons.md` — the durable failure-mode record.

All four must exist before the Planner is authorized to plan the next iteration on the product.

---

## The contract — field-by-field mapping

Every artifact the Iteration Archivist produces (left) has exactly one obligation for the Planner (right). A product missing any left-column artifact means the Iteration Archivist close-out was incomplete — the Planner's gate correctly blocks.

| Iteration Archivist produces | Planner consumes at | What the consumption means |
|---|---|---|
| **Archived iteration file** at `aeg-root/iterations/completed/<name>.md` | Readiness gate item 8 | The Planner MUST confirm this file exists before planning any new iteration on the same product. Absence means the Iteration Archivist has not run — planning is blocked. |
| **Updated `aeg-project/state.md`** reflecting current product state | Readiness gate item 2 (specs reachable) | The Planner reads the updated state doc as the authoritative current-state snapshot. A state doc not updated by the Iteration Archivist means the plan is built on wrong assumptions about what the product looks like post-iteration. |
| **Updated `aeg-project/now.md`** with "what's next" | Planner's starting context | The Planner reads `now.md` to understand what the previous iteration declared as next candidates. A `now.md` not updated since the iteration closed contains stale "in flight now" entries that will mislead the planning pass. |
| **Retrospective** appended to `aeg-project/lessons.md` | Readiness gate item 5 (locked decisions known) | The Planner reads lessons since the last iteration to avoid re-litigating resolved decisions or repeating known failure modes. A missing retrospective means the Planner plans blind to the iteration's carry-forward lessons. |

**Reading the table:** left is the producer obligation (Iteration Archivist role doc and this contract enforce it), right is the consumer obligation (Planner role doc and this contract enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Iteration Archivist)

- Move the iteration file to `completed/` — this is the **physical signal** the Planner's gate checks. A close-out that does everything else but fails to move the file is an incomplete close-out that correctly blocks planning.
- Update `aeg-project/state.md` to reflect the iteration's output. A state doc that still describes work in progress after the iteration closed is a bug in the close-out.
- Declare "what's next" in `aeg-project/now.md`. The Iteration Archivist does not decide what's next (that's the Principal) — they write "Principal to declare" if not told. But they do update the in-flight sections and remove the completed iteration.
- Append the retrospective to `aeg-project/lessons.md`. These four outputs are the close-out contract. A close-out missing any of them is incomplete and the Planner's gate will correctly block.

## Consumer obligations (the Planner)

- Run readiness gate item 8 before planning any iteration that includes a product: confirm `aeg-root/iterations/completed/<name>.md` exists for the previous iteration on each product in scope.
- If any prior iteration on an in-scope product exists in `aeg-root/iterations/` but NOT in `completed/`, STOP: *"The previous iteration `<name>` on `<product>` has not been archived — the Iteration Archivist has not run. Dispatch the Iteration Archivist for `<name>` before planning proceeds."*
- Do not improvise around a missing close-out. "The Iteration Archivist probably ran" is not a passed gate. The filesystem check is the gate. If the file isn't there, stop.
- Read the updated `state.md`, `now.md`, and `lessons.md` as the authoritative current-state snapshot — not a previous session's memory, not an earlier planning pass. These documents reflect what the iteration actually shipped; planning against anything else is planning against stale reality.

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Iteration Archivist produces without, in the same change, updating what the Planner consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract — `state-machine.md` §9) and requires a `D-###` decision entry.
- The same PR that edits this contract must verify both `aeg-root/roles/iteration-archivist.md` and `aeg-root/roles/planner.md` still point here and still match the table. In particular, readiness gate item 8 in `planner.md` must reference this file explicitly — that reference is the enforcement hook.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Iteration Archivist fills the left column; the Planner drains the right. One source of truth, changed as a unit.*
