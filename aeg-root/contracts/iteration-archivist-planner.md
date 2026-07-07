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
2. The updated **pinned state Issue** (D-110 — `aeg` #447, `vada` #448, `herald` #449, `cetana` #450, ecosystem-wide #451) — the authoritative current-state snapshot for the product (current-focus pointer, resolved pending-manual-ops, recently-shipped entry).
3. The **retrospective** posted as a new comment on the pinned lessons Issue (#453, D-110) — the durable failure-mode record.

All three must exist before the Planner is authorized to plan the next iteration on the product. (`now.md` is retired — D-057. "What's next" is derived from the forge: open Issues without an assigned PR in the current iteration, plus `gh issue list --label "iteration:<slug>" --state open`.)

---

## The contract — field-by-field mapping

Every artifact the Iteration Archivist produces (left) has exactly one obligation for the Planner (right). A product missing any left-column artifact means the Iteration Archivist close-out was incomplete — the Planner's gate correctly blocks.

| Iteration Archivist produces | Planner consumes at | What the consumption means |
|---|---|---|
| **Archived iteration file** at `aeg-root/iterations/completed/<name>.md` | Readiness gate item 8 | The Planner MUST confirm this file exists before planning any new iteration on the same product. Absence means the Iteration Archivist has not run — planning is blocked. |
| **Updated pinned state Issue** (D-110) reflecting current product state (current-focus pointer updated, pending-manual-ops current, recently-shipped entry added) | Readiness gate item 2 (specs reachable) | The Planner reads the updated state Issue as the authoritative current-state snapshot. A state Issue not updated by the Iteration Archivist means the plan is built on wrong assumptions about what the product looks like post-iteration. |
| **Retrospective** posted as a comment on the pinned lessons Issue (#453, D-110) | Readiness gate item 5 (locked decisions known) | The Planner reads lessons since the last iteration to avoid re-litigating resolved decisions or repeating known failure modes. A missing retrospective means the Planner plans blind to the iteration's carry-forward lessons. |

> **`now.md` is retired (D-057).** "What's next" is not a produced artifact — it is derived from the forge: `gh issue list --label "iteration:<slug>" --state open` filtered to Issues with no open PR. The Planner runs this query directly rather than reading a file that would need hand-maintenance.

**Reading the table:** left is the producer obligation (Iteration Archivist role doc and this contract enforce it), right is the consumer obligation (Planner role doc and this contract enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Iteration Archivist)

- Move the iteration file to `completed/` — this is the **physical signal** the Planner's gate checks. A close-out that does everything else but fails to move the file is an incomplete close-out that correctly blocks planning.
- Update the relevant pinned state Issue(s) (D-110) to reflect the iteration's output: update the current-focus pointer, add a recently-shipped entry, clear resolved pending-manual-ops. A state Issue that still describes work in progress after the iteration closed is a bug in the close-out.
- Post the retrospective as a new comment on the pinned lessons Issue (#453). These three outputs are the close-out contract. A close-out missing any of them is incomplete and the Planner's gate will correctly block.
- **Do not** update `now.md` — it no longer exists (D-057). "What's next" is derived from the forge by the Planner, not written by the Archivist.

## Consumer obligations (the Planner)

- Run readiness gate item 8 before planning any iteration that includes a product: confirm `aeg-root/iterations/completed/<name>.md` exists for the previous iteration on each product in scope.
- If any prior iteration on an in-scope product exists in `aeg-root/iterations/` but NOT in `completed/`, STOP: *"The previous iteration `<name>` on `<product>` has not been archived — the Iteration Archivist has not run. Dispatch the Iteration Archivist for `<name>` before planning proceeds."*
- Do not improvise around a missing close-out. "The Iteration Archivist probably ran" is not a passed gate. The filesystem check is the gate. If the file isn't there, stop.
- Read the updated pinned state Issue and lessons Issue (#453) as the authoritative current-state snapshot — not a previous session's memory, not an earlier planning pass. These reflect what the iteration actually shipped; planning against anything else is planning against stale reality.
- Derive "what's next" from the forge: `gh issue list --label "iteration:<slug>" --state open` filtered to Issues without an assigned open PR. Do not look for a `now.md` — it no longer exists (D-057).

---

## Supersession — when the Planner's new plan absorbs the source iteration (D-070)

The normal seam is **archive → then plan**: the Iteration Archivist closes iteration N, and only then does the Planner plan iteration N+1 (readiness gate item 8 enforces this). There is one exception, added by **D-070**.

When the new iteration the Planner is cutting **supersedes** an existing, still-active iteration — absorbing its `todo`/backlog tasks — the ordering **inverts** for that one source iteration:

1. **Planner refactor-and-plan first.** The Planner plans the destination, relabels the moved Issues (`iteration:<src>` → `iteration:<dest>` + provenance comment), and annotates the source topology (`Moved out → <dest>`) — all while the source is still in `aeg-root/iterations/`. Moving tasks is the Planner's power; the Archivist neither moves them nor decides the destination.
2. **Then the Iteration Archivist closes the source.** By now the source has **no open task work** (entry-gate item 1: every task `merged`/`dropped`/`moved`), so the close-out proceeds normally and records the moved tasks under the retrospective's "Tasks moved out" field.

The Planner's readiness-gate item 8 is **carved out** for this one superseded source (it would otherwise deadlock: item 8 wants it archived before planning, but planning is what empties it). Item 8 still fully applies to every *unrelated* prior iteration. This carve-out lives in `planner.md` item 8 and is mirrored here; the two must stay in sync.

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Iteration Archivist produces without, in the same change, updating what the Planner consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract — `state-machine.md` §9) and requires a `D-###` decision entry.
- The same PR that edits this contract must verify both `aeg-root/roles/iteration-archivist.md` and `aeg-root/roles/planner.md` still point here and still match the table. In particular, readiness gate item 8 in `planner.md` must reference this file explicitly — that reference is the enforcement hook.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Iteration Archivist fills the left column; the Planner drains the right. One source of truth, changed as a unit.*
