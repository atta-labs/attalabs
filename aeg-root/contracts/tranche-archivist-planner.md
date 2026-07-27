---
sidebar_title: Tranche Archivist → Planner
title: Tranche Archivist → Planner
order: 6
contract_id: tranche-archivist-planner
description: Carries a finished tranche’s real outcome to the planning of the next, so no plan is built on a product that no longer exists.
status: active
producer: tranche-archivist
consumer: planner
carrier: archived-tranche-file, pinned-state-issue, retrospective-comment
summary: Ever started planning the next phase on outdated info about the last one?
---
# Contract: Tranche Archivist → Planner

## The short version

This seam sits between the end of one tranche and the planning of the next. It exists because planning starts by reading the current state of a product, and a tranche that was never closed out leaves those records describing a product that no longer exists.

**What crosses** — three artefacts, all produced when a tranche closes. The archived tranche itself, which is the physical signal that close-out happened at all. The product's state record, brought up to date: what it is now working toward, which manual steps are still outstanding, and what the tranche just shipped. And the retrospective, posted to the standing lessons thread — the durable record of what stalled and what carries forward.

**The hand-off is malformed when** — any of the three is absent. Each has a matching check on the planning side, and the planning side stops rather than working around it: the archive is a fact to be confirmed, not an assumption to be made. "It was probably closed out" is not a passed check. The failure this was written against is real: tranches completed without close-out, and the next plans were then built on records describing the product as it had been before.

**What it does not carry** — a statement of what happens next. That is not archived, it is derived: the open work on the forge is the answer, read directly rather than maintained by hand in a file that would drift. Nor does it carry the power to move a task between tranches; that is a scoping decision, and it belongs to planning.

**How it physically runs** — the carriers are the archived tranche, the product's state record, and the retrospective comment. The ordering is normally close first, then plan. One exception: when a new plan absorbs an existing tranche's unstarted work, the move happens first and the close-out follows, because the close cannot proceed while that work is open and the plan is what empties it. Only unstarted work may move — anything with a branch or an open pull request is finished or dropped where it is, never relocated mid-flight — and every move leaves a note on the task, so a task that changed address can be told from one that vanished.


---

## Reference

**Status:** active
**Seam:** the hand-off from the Tranche Archivist (producer) to the Planner (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/roles/tranche-archivist.md` (producer side) and `aeg-root/roles/planner.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

The Planner starts a new tranche by reading the current state of a product. If the previous tranche was not archived — if the Tranche Archivist did not run — the Planner reads state docs that describe a product that no longer exists. The plan is built on wrong assumptions and dispatches tasks against a reality that merged away.

This is the failure that actually happened: two earlier tranches completed without the Tranche Archivist running. The Planner then started three new tranches against state docs still describing the pre-completion product. The root cause was a missing gate: the Planner's readiness gate had no item that checked whether the previous tranche on each product was archived.

This contract formalizes the close-out outputs the Tranche Archivist must produce, and the physical check the Planner must perform on them. The check is not a checklist item the Planner reviews — it is a filesystem fact: does `aeg-root/iterations/completed/<name>.md` exist? If no, the gate fails.

---

## The hand-off carrier

Four artifacts, all produced by the Tranche Archivist at close-out:

1. The **archived tranche file** at `aeg-root/iterations/completed/<name>.md` — the physical signal.
2. The updated **pinned state Issue** (one per product, plus an ecosystem-wide bucket) — the authoritative current-state snapshot for the product (current-focus pointer, resolved pending-manual-ops, recently-shipped entry).
3. The **retrospective** posted as a new comment on the pinned lessons Issue — the durable failure-mode record.

All three must exist before the Planner is authorized to plan the next tranche on the product. (`now.md` is retired. "What's next" is derived from the forge: open Issues without an assigned PR in the current tranche, plus `gh issue list --label "vinaya/tranche:<slug>" --state open`.)

---

## The contract — field-by-field mapping

Every artifact the Tranche Archivist produces (left) has exactly one obligation for the Planner (right). A product missing any left-column artifact means the Tranche Archivist close-out was incomplete — the Planner's gate correctly blocks.

| Tranche Archivist produces | Planner consumes at | What the consumption means |
|---|---|---|
| **Archived tranche file** at `aeg-root/iterations/completed/<name>.md` | Readiness gate item 8 | The Planner MUST confirm this file exists before planning any new tranche on the same product. Absence means the Tranche Archivist has not run — planning is blocked. |
| **Updated pinned state Issue** reflecting current product state (current-focus pointer updated, pending-manual-ops current, recently-shipped entry added) | Readiness gate item 2 (specs reachable) | The Planner reads the updated state Issue as the authoritative current-state snapshot. A state Issue not updated by the Tranche Archivist means the plan is built on wrong assumptions about what the product looks like post-tranche. |
| **Retrospective** posted as a comment on the pinned lessons Issue | Readiness gate item 5 (prior decisions known) | The Planner reads lessons since the last tranche to avoid re-litigating resolved decisions or repeating known failure modes. A missing retrospective means the Planner plans blind to the tranche's carry-forward lessons. |

> **`now.md` is retired.** "What's next" is not a produced artifact — it is derived from the forge: `gh issue list --label "vinaya/tranche:<slug>" --state open` filtered to Issues with no open PR. The Planner runs this query directly rather than reading a file that would need hand-maintenance.

**Reading the table:** left is the producer obligation (Tranche Archivist role doc and this contract enforce it), right is the consumer obligation (Planner role doc and this contract enforce it). The two role docs must not contradict this table.

---

## Producer obligations (the Tranche Archivist)

- Move the tranche file to `completed/` — this is the **physical signal** the Planner's gate checks. A close-out that does everything else but fails to move the file is an incomplete close-out that correctly blocks planning.
- Update the relevant pinned state Issue(s) to reflect the tranche's output: update the current-focus pointer, add a recently-shipped entry, clear resolved pending-manual-ops. A state Issue that still describes work in progress after the tranche closed is a bug in the close-out.
- Post the retrospective as a new comment on the pinned lessons Issue. These three outputs are the close-out contract. A close-out missing any of them is incomplete and the Planner's gate will correctly block.
- **Do not** update `now.md` — it no longer exists. "What's next" is derived from the forge by the Planner, not written by the Archivist.

## Consumer obligations (the Planner)

- Run readiness gate item 8 before planning any tranche that includes a product: confirm `aeg-root/iterations/completed/<name>.md` exists for the previous tranche on each product in scope.
- If any prior tranche on an in-scope product exists in `aeg-root/iterations/` but NOT in `completed/`, STOP: *"The previous tranche `<name>` on `<product>` has not been archived — the Tranche Archivist has not run. Dispatch the Tranche Archivist for `<name>` before planning proceeds."*
- Do not improvise around a missing close-out. "The Tranche Archivist probably ran" is not a passed gate. The filesystem check is the gate. If the file isn't there, stop.
- Read the updated pinned state Issue and lessons Issue as the authoritative current-state snapshot — not a previous session's memory, not an earlier planning pass. These reflect what the tranche actually shipped; planning against anything else is planning against stale reality.
- Derive "what's next" from the forge: `gh issue list --label "vinaya/tranche:<slug>" --state open` filtered to Issues without an assigned open PR. Do not look for a `now.md` — it no longer exists.

---

## Supersession — when the Planner's new plan absorbs the source tranche

The normal seam is **archive → then plan**: the Tranche Archivist closes tranche N, and only then does the Planner plan tranche N+1 (readiness gate item 8 enforces this). There is one exception.

When the new tranche the Planner is cutting **supersedes** an existing, still-active tranche — absorbing its `todo`/backlog tasks — the ordering **inverts** for that one source vinaya/tranche:

1. **Planner refactor-and-plan first.** The Planner plans the destination, relabels the moved Issues (`vinaya/tranche:<src>` → `vinaya/tranche:<dest>` + provenance comment), and annotates the source topology (`Moved out → <dest>`) — all while the source is still in `aeg-root/iterations/`. Moving tasks is the Planner's power; the Archivist neither moves them nor decides the destination.
2. **Then the Tranche Archivist closes the source.** By now the source has **no open task work** (entry-gate item 1: every task `merged`/`dropped`/`moved`), so the close-out proceeds normally and records the moved tasks under the retrospective's "Tasks moved out" field.

The Planner's readiness-gate item 8 is **carved out** for this one superseded source (it would otherwise deadlock: item 8 wants it archived before planning, but planning is what empties it). Item 8 still fully applies to every *unrelated* prior tranche. This carve-out lives in `planner.md` item 8 and is mirrored here; the two must stay in sync.

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Tranche Archivist produces without, in the same change, updating what the Planner consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change: it alters a cross-role contract, so the reasoning belongs in the pull request that makes it, where the reviewer and the close-out both read it.
- The same PR that edits this contract must verify both `aeg-root/roles/tranche-archivist.md` and `aeg-root/roles/planner.md` still point here and still match the table. In particular, readiness gate item 8 in `planner.md` must reference this file explicitly — that reference is the enforcement hook.
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Tranche Archivist fills the left column; the Planner drains the right. One source of truth, changed as a unit.*
