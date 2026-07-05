---
sidebar_title: Planner → Brief
---
# Contract: Planner → Brief Author

**Status:** active
**Seam:** the hand-off from the Planner (producer) to the Brief Author (consumer).
**Single source of truth for this seam.** The two role docs do **not** redefine what crosses this boundary — they point here. `aeg-root/roles/planner.md` (producer side) and `aeg-root/skills/brief-authoring/SKILL.md` (consumer side) each reference this file; this file is where the field-by-field hand-off lives, once.

---

## Why this file exists

A role boundary is where work is lost. The Planner does a deep technical pass and produces durable conclusions; the Brief Author must consume *every one* of them or the conclusion is dropped and the executing agent walks into a trap the planner already saw. When the hand-off is described separately in each role doc, the two descriptions drift (they already did once — the brief side was missing "Sizing" and "Dependency rationale" that the planner side required). A **contract** removes the drift structurally: there is exactly one description of the seam, and both roles are bound to it.

This is the first of AEG's role-seam contracts. Others (`brief-developer`, `developer-reviewer`, …) follow the same shape as each seam is modeled. A contract is a Class 1 artifact (`state-machine.md` §2) and changes **as a unit** — see "Changing this contract" below.

---

## The hand-off carrier

The Planner's output unit is the **task**, which exists as a forge Issue (identity + metadata + Planner's rationale) and a row in the iteration topology file (Issue link + edges only). The thing that crosses this seam is the **Planner's rationale** block, which the Planner writes into the **Issue body**. The Brief Author reads the rationale from the Issue — the forge artifact — and turns it into the executable brief that lands in the PR body. The iteration file row is a topology pointer (the Issue number); the Issue is the definition. (D-055)

The Planner persists **durable conclusions** (which do not decay). The Brief Author adds **perishable detail** (current signatures, exact files, final model pick) at dispatch. Neither re-does the other's half; the rationale is the carrier between them, and the Issue is its home.

---

## The contract — field-by-field mapping

Every field the Planner emits in the rationale (left) has exactly one named home in the brief (right). The Planner MUST emit every left-column field; the Brief Author MUST consume every one into the named brief section. A rationale missing a field is malformed (Planner refuses). A brief that drops a field on the floor is malformed (Brief Author error).

| Planner emits (rationale field) | Brief Author consumes it in (brief section) | What the consumption means |
|---|---|---|
| **Boundary** (what this task is / is not) | Context (§2) + Technical Surface Map (§4) | The brief's scope and out-of-surface set are the planner's boundary made concrete against current code. |
| **Sizing** (passed the four "too big?" tests) | Re-confirmation only | The brief assumes the task is one PR. If the Brief Author's own dig finds it no longer fits (code moved), that is **stop-and-escalate**, not a silent re-split. |
| **Project(s) + blast radius** (every project/consumer touched) | `Project:` field + blast-radius re-verification (§8) | The brief carries the identical `Project(s)`; the Done checklist re-verifies every blast-radius consumer the planner named. |
| **Dependency rationale** (why each depends-on / conflicts-with edge) | Technical Dependencies (§3) | The brief turns the *why* of each edge into the concrete "what must already exist" preconditions (exports, migrations, capabilities, merged dependencies). |
| **Traps to avoid** (concrete pitfalls the dig surfaced) | Context (§2) + Constraints (§10) | The trap becomes an explicit "do NOT do X; do Y instead" the executing agent cannot miss. Highest-value field — never drop it. |
| **Suggested agent-class** (high/mid/fast + one-line reason) | `For:` + `Reason:` header | The Brief Author confirms or deviates (with stated reason) and makes the **final** model pick. Class is the planner's; pick is the brief's. |
| **Stop-and-escalate** (when the agent must stop, not improvise) | Stop conditions (§9) | The planner's stop conditions are copied into the brief's stop-condition list verbatim in substance. |
| **Docs to keep coherent** (which specs/skills/docs this task will make incoherent) | §7 documentation-update list | The Brief Author turns the Planner's named list into the explicit §7 doc-update items. Conditional: if the Planner stated "No docs touched," §7 is "No doc updates required (Tier 0)." If the Planner named docs, they are all in §7. Presence-**and-correctness** of the list is the Planner's mechanical obligation, not naming docs from memory: the Planner names intended surfaces and the Brief Author derives the floor at brief-authoring time by matching those surfaces against `aeg-root/doc-owners` (`deriveSection7`), then supplements from the D-058 read obligation. Any override of the derived floor (added doc, or a derived pointer marked out of scope) must carry a one-line reason in the brief — silent overrides are a regression. (D-058, D-076) |

**Reading the table:** left is the producer obligation (Planner role doc enforces it), right is the consumer obligation (brief-authoring skill enforces it). The two role docs must not contradict this table; if either needs to change what it emits or consumes, it changes *here*, and both sides update together.

**Premise pinning (D-081) is deliberately NOT a field in this table.** `verify-dispatch`/`verify-task`'s `Premise:` block (`skills/brief-authoring/SKILL.md` § Premise pins) is file-content-level, perishable detail — current signatures, current constants — squarely inside the Brief Author's half of the division of labor this contract already describes, not a durable conclusion the Planner should seed as a rationale field. It is governed entirely by the Brief Author → Developer seam (`contracts/brief-developer.md`), not this one.

---

## Rationale grammar (D-078)

The eight left-column fields above are the rationale's **content**; this section defines its **format** — how a field must be written in the Issue body for it to be machine-detectable. Before D-078 the rationale was prose with no defined grammar; a check cannot parse what has no format.

Two serializations are accepted, case-insensitive, matched by field name (or an established synonym — e.g. `Depends-on` for **Dependency rationale**, `§7` for **Docs to keep coherent**):

- **Bold-inline:** `**<Field>** — <content>` (e.g. `**Boundary** — …`)
- **Heading:** `### <Field>` followed by the content on subsequent lines (e.g. `### Traps to avoid`)

A ready-to-fill skeleton of the full eight-field rationale lives at `aeg-root/templates/issue-rationale-template.md` — copy it rather than reconstructing the shape from this section's prose; this section remains the grammar's definition.

A task Issue's body must carry all eight fields in one of these two forms. **Canonical implementation:** `packages/aeg-core/src/issue-validation.ts` (`checkIssueRationale`, `isTaskIssueLabelSet`) — the single grammar/parser, consumed at two enforcement points per `aeg-root/enforcement.md`'s ring model:

- **Ring 0 (creation gate):** `packages/aeg-core/bin/open-issue.ts` refuses to create or edit a task Issue (any Issue labeled `iteration:<slug>`) whose body fails `checkIssueRationale`.
- **Ring 1/2 (continuous oracle):** `verify-coherence`'s **R1** check re-runs the same function against the live stock of open task Issues, catching bodies edited by ungated writers or predating the gate. Pre-D-078 Issues are grandfathered by explicit Issue number (`R1_GRANDFATHERED_ISSUES` in `packages/aeg-core/src/coherence-checks.ts`) — visible as `info`, never blocking.

R1 checks **presence/structure only**; whether the content is correct (sizing actually right, traps actually real) stays the Reviewer's judgment, never CI's.

---

## Producer obligations (the Planner)

- **Cut a real forge Issue for every task before dispatch.** Before the Brief Author can author a brief, the Planner must have replaced any `#TBD` in the topology table's Issue column with a real GitHub Issue number. A `#TBD` entry means the task has no forge Issue — it is neither briefable nor executable regardless of its derived status. The Brief Author hard-STOPs on `#TBD` during Dig (D-054); the Developer hard-STOPs at entry gate item 3 (D-054). Cutting the Issue makes the task forge-addressable and dispatchable (D-054, D-059); it is a Planner-only act.
- Emit a rationale block per task containing **all eight left-column fields**. (Enforced in `planner.md` — a task missing its rationale is refused.) The eighth field, **Docs to keep coherent**, must name every spec/skill/doc this task will make incoherent, or state "No docs touched" explicitly. Omitting it forces the Brief Author to populate §7 from memory — the exact failure D-058 exists to close.
- The rationale holds durable conclusions only — no perishable line-level detail (that's the Brief Author's half).
- `Project(s)` must include every shared-package consumer in the blast radius (the blast-radius rule in `planner.md`).
- **Read relevant docs before emitting the "Docs to keep coherent" field.** The D-058 read obligation requires the Planner to have identified and read the relevant specs/skills/docs before planning. The "Docs to keep coherent" field is only trustworthy if it was derived from reading, not from memory.

## Consumer obligations (the Brief Author)

- Read the rationale first; **start from it, never from a blank page**. (Enforced in `brief-authoring`.)
- Consume **every** right-column mapping — no field dropped.
- Add the perishable detail the planner deliberately left out (current signatures, exact file list, final model pick).
- **Read obligation (D-058):** During the Dig, identify and read any specs/skills/docs relevant to this task's code surface. Then (a) surface in Context (§2) what the Developer must know from those docs, and (b) populate §7 from this reading — the Planner's "Docs to keep coherent" field is the starting point, but the Brief Author's own reading may surface additional docs the Planner missed.
- If the Brief Author's own dig **contradicts** the rationale (the boundary moved, sizing no longer holds), that is a `severity:strategy` escalation back toward the Planner — not a silent override.

---

## Changing this contract

A contract changes **as a unit**. You may not change what the Planner emits without, in the same change, updating what the Brief Author consumes — because the property that makes the seam sound is that the producer's output side is *identical* to the consumer's input side. Concretely:

- A change to this file is a **Tier 3** change (it alters a cross-role contract — `state-machine.md` §9) and requires a `D-###` decision entry.
- The same PR that edits this contract must verify both `planner.md` and `brief-authoring/SKILL.md` still point here and still match the table (they should need no field-level edits, since the fields live here — but their references must stay valid).
- Never edit one side's role doc to add/drop a hand-off field directly. Add/drop it **here**; the role docs inherit it by reference.

---

*This contract is the seam. The Planner fills the left column; the Brief Author drains the right. One source of truth, changed as a unit.*
