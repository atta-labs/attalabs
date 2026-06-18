# AEG Governance Gap Discovery — Findings

**Date:** 2026-06-17 (spike executed 2026-06-18)
**Spike:** aeg-governance-ui-v2 · Task 1b
**Files read:** all 6 contracts, 9 role docs, process.md, aeg-manual-flow.md, state-machine.md, coordination.md, skills/brief-authoring/SKILL.md
**Scope:** read + report only — no fixes shipped

---

## Summary

PR #144 added 5 new role-seam contracts (brief-developer, developer-reviewer,
reviewer-archivist, archivist-iteration-archivist, iteration-archivist-planner) and Planner
readiness gate item 8. The contracts themselves are well-formed. The gaps are almost entirely
downstream: the role docs and other governance files don't yet point back at the contracts,
and two pre-existing stale-content issues were exposed by the C4 compliance work in PR #144.

**Total gaps found:** 16
- Missing contract pointers: 9 (the biggest class)
- Stale content: 2
- Inconsistency: 3
- Missing content: 2

---

## GAP-001 — brief-authoring/SKILL.md missing pointer to contracts/brief-developer.md

**File:** `aeg-root/skills/brief-authoring/SKILL.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/brief-developer.md` declares in its header: "aeg-root/skills/brief-authoring/SKILL.md (producer side) … each reference this file." The skill is the single point in the model where Brief Authors are told what a well-formed brief must contain and how it hands off to the Developer. But the skill contains no reference to `contracts/brief-developer.md`. It correctly references `contracts/planner-brief.md` as the contract it *consumes* from the Planner — but the contract it *produces into* (the downstream seam to the Developer) is absent.
**Suggested fix:** Add a sentence in the "Where the brief lives" or "Deliverable" (§12) section of the skill pointing to `aeg-root/contracts/brief-developer.md` as the downstream seam contract. For example: "The hand-off from Brief Author to Developer is governed by `aeg-root/contracts/brief-developer.md` — this skill is the producer side; Developer is the consumer side."

---

## GAP-002 — developer.md missing pointer to contracts/brief-developer.md

**File:** `aeg-root/roles/developer.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/brief-developer.md` declares: "aeg-root/roles/developer.md (consumer side) … each reference this file." The contract defines field-by-field what the Brief Author emits and what the Developer must do with each field — a direct and explicit obligation. But `roles/developer.md` has no reference to this contract anywhere. It describes the entry gate, brief reading, and PR opening, but agents reading only `developer.md` will not find the contract that defines the exact hand-off.
**Suggested fix:** Add a reference in the Developer's entry gate or "What the Developer owns" section: "The hand-off from Brief Author to Developer is governed by `aeg-root/contracts/brief-developer.md` — this role is the consumer side."

---

## GAP-003 — developer.md missing pointer to contracts/developer-reviewer.md

**File:** `aeg-root/roles/developer.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/developer-reviewer.md` declares: "aeg-root/roles/developer.md (producer side) … each reference this file." The contract defines exactly what the Developer must produce in the open PR for the Reviewer to consume. The "After you open the PR — review handoff" section of `developer.md` describes the flow in prose, but never points to the contract as the authoritative source for the hand-off.
**Suggested fix:** Add a reference in the "After you open the PR — review handoff" section: "The hand-off from Developer to Reviewer is governed by `aeg-root/contracts/developer-reviewer.md` — this role is the producer side."

---

## GAP-004 — reviewer.md missing pointer to contracts/developer-reviewer.md

**File:** `aeg-root/roles/reviewer.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/developer-reviewer.md` declares: "aeg-root/roles/reviewer.md (consumer side) … each reference this file." The Reviewer's "Entry gate" section describes what a valid PR must have, matching the contract's left column — but the file never points to the contract. A Reviewer reading only `roles/reviewer.md` has no path to the contract that is the authoritative definition of what they are checking.
**Suggested fix:** Add a reference in the "Entry gate" section: "The hand-off from Developer to Reviewer is governed by `aeg-root/contracts/developer-reviewer.md` — this role is the consumer side."

---

## GAP-005 — reviewer.md missing pointer to contracts/reviewer-archivist.md

**File:** `aeg-root/roles/reviewer.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/reviewer-archivist.md` declares: "aeg-root/roles/reviewer.md (producer side) … each reference this file." The Reviewer's "Output format" section describes the verdict structure — the exact thing the contract formalizes as the hand-off — but the file never points to the contract.
**Suggested fix:** Add a reference near the "Output format" section: "The hand-off from Reviewer to per-task Archivist is governed by `aeg-root/contracts/reviewer-archivist.md` — this role is the producer side."

---

## GAP-006 — archivist.md missing pointer to contracts/reviewer-archivist.md

**File:** `aeg-root/roles/archivist.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/reviewer-archivist.md` declares: "aeg-root/roles/archivist.md (consumer side) … each reference this file." The Archivist's "Entry gate" and provenance block sections describe reading from the Reviewer's verdict — exactly what the contract formalizes — but the file never points to the contract.
**Suggested fix:** Add a reference in the "Entry gate" or "The provenance block" section: "The hand-off from Reviewer to per-task Archivist is governed by `aeg-root/contracts/reviewer-archivist.md` — this role is the consumer side."

---

## GAP-007 — archivist.md missing pointer to contracts/archivist-iteration-archivist.md

**File:** `aeg-root/roles/archivist.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/archivist-iteration-archivist.md` declares: "aeg-root/roles/archivist.md (producer side) … each reference this file." The per-task Archivist's outputs (provenance block, lessons.md entries, follow-up Issues) are exactly what the Iteration Archivist checks at its entry gate. But `archivist.md` never points to this contract.
**Suggested fix:** Add a reference in the "What you do at close-out" section, after item 7 (provenance block): "The outputs of this close-out feed the Iteration Archivist — the downstream seam is governed by `aeg-root/contracts/archivist-iteration-archivist.md` — this role is the producer side."

---

## GAP-008 — iteration-archivist.md missing pointer to contracts/archivist-iteration-archivist.md

**File:** `aeg-root/roles/iteration-archivist.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/archivist-iteration-archivist.md` declares: "aeg-root/roles/iteration-archivist.md (consumer side) … each reference this file." The Iteration Archivist's "Entry gate" description (verifying every task PR has a provenance block) directly implements the contract's entry-gate row — but the file never references the contract as the authoritative source.
**Suggested fix:** Add a reference in the "Entry gate" section (or near "What you do at close-out" step 1): "The hand-off from per-task Archivist to Iteration Archivist is governed by `aeg-root/contracts/archivist-iteration-archivist.md` — this role is the consumer side."

---

## GAP-009 — iteration-archivist.md missing pointer to contracts/iteration-archivist-planner.md

**File:** `aeg-root/roles/iteration-archivist.md`
**Type:** missing-contract-pointer
**Severity:** major
**Description:** The contract `contracts/iteration-archivist-planner.md` declares: "aeg-root/roles/iteration-archivist.md (producer side) … each reference this file." The Iteration Archivist's outputs (archived iteration file, updated state.md, updated now.md, retrospective in lessons.md) are exactly what the Planner's readiness gate item 8 checks. But `iteration-archivist.md` never points to this contract or mentions that its outputs feed the Planner's gate.
**Suggested fix:** Add a reference in the "Archive the iteration file" step (step 3) or in the "What you do at close-out" section: "The outputs of this close-out are the physical signals the Planner's readiness gate item 8 checks — the downstream seam is governed by `aeg-root/contracts/iteration-archivist-planner.md` — this role is the producer side."

---

## GAP-010 — state-machine.md §9 Tier 3 description missing the Conforms-to: path

**File:** `aeg-root/state-machine.md`
**Type:** stale-content
**Severity:** major
**Description:** Section 9 of state-machine.md describes Tier 3 required docs as: "Tier 1 + decision entry (status, type, rationale, alternatives), state docs updated if state changed, Lock entry if irreversible, `docs-index.md` regenerated." It does not mention the `Conforms-to: D-###` alternative introduced by the C4 compliance work (PR #144 + the verify-docs enhancement). The `brief-authoring/SKILL.md` §7 (Tier 3 doc-update list) and the `brief-authoring/SKILL.md` "Required" (Tier field) sections now define two paths for Tier 3 compliance: (a) a decision log change, or (b) a `Conforms-to: D-###` field in the PR body. State-machine.md §9, as the constitution, is the highest-authority document and it says only "decision entry." Any agent reading §9 as the final word will believe a `Conforms-to:` field is not valid, contradicting the enforced verify-docs gate.
**Suggested fix:** Amend §9's Tier 3 required docs to add: "Decision anchor — either (a) a decision log entry appended (status, type, rationale, alternatives, consequences), or (b) a `Conforms-to: D-###` field in the PR body for work implementing an existing decision without introducing a new one. The `verify-docs` C4 gate enforces this and accepts either form."

---

## GAP-011 — developer.md Tier 3 checklist missing the Conforms-to: option

**File:** `aeg-root/roles/developer.md`
**Type:** stale-content
**Severity:** major
**Description:** The Tier 3 checklist in `roles/developer.md` says: "Decision log entry appended with: status (ACTIVE/PENDING), type (1/2), rationale, alternatives rejected, consequences." It does not mention the `Conforms-to: D-###` alternative. This means a Developer running the Tier 3 checklist before opening a PR will not know that conforming work (implementing an existing decision without a new D-###) can satisfy the C4 gate via the `Conforms-to:` field. They will either add an unnecessary new decision log entry or fail verify-docs expecting only the log-entry path.
**Suggested fix:** Update the Tier 3 checklist item to: "Decision anchor — either (a) decision log entry appended (status, type, rationale, alternatives rejected, consequences), or (b) `Conforms-to: D-###` field in the PR body (for conforming work — see `aeg-root/state-machine.md` §9 and `brief-authoring/SKILL.md` §7)."

---

## GAP-012 — aeg-manual-flow.md §6 attributes Iteration Archivist duties to per-task Archivist

**File:** `aeg-root/aeg-manual-flow.md`
**Type:** inconsistency
**Severity:** major
**Description:** Section 6 of `aeg-manual-flow.md`, under "Archivist (close-out)", includes: "Sets the iteration's `Lifecycle: complete` marker and moves the file to `iterations/completed/` when every task is merged (`iterations/README.md` §11)." This is wrong. Both `roles/archivist.md` (per-task, Phase 12) and `roles/iteration-archivist.md` (Phase 13) are clear: the `Lifecycle: complete` marker and `git mv` to `completed/` are Phase 13 Iteration Archivist actions, not per-task Archivist actions. The per-task Archivist's checklist in `roles/archivist.md` has 7 steps — none of them is setting the lifecycle marker or moving the iteration file. Attributing this to the per-task Archivist in the manual-flow doc creates a role-boundary confusion that could cause an agent following the manual flow to run the wrong action.
**Suggested fix:** Remove "Sets the iteration's `Lifecycle: complete` marker and moves the file to `iterations/completed/` when every task is merged" from the §6 Archivist entry. Either add a separate note: "When the last task merges, the Principal triggers Phase 13 (Iteration Close) — see the Iteration-close trigger note below" — or just trust the existing Iteration-close trigger note below the table to cover it.

---

## GAP-013 — reviewer-archivist.md contract does not model the Security reviewer's output

**File:** `aeg-root/contracts/reviewer-archivist.md`
**Type:** inconsistency
**Severity:** minor
**Description:** The contract models the seam from "the Reviewer" (code reviewer, `roles/reviewer.md`) to "the per-task Archivist." Its field table covers APPROVE/REQUEST CHANGES verdict, finding list with severity tags, and spec-conformance result. However, `roles/security.md` is a specialization of the Reviewer role and produces a separate output: a PASS/FAIL verdict with CRITICAL/HIGH/MEDIUM/LOW findings — not the code review's APPROVE/REQUEST CHANGES. The Archivist's provenance block template in `roles/archivist.md` explicitly includes a `Security: PASS | FAIL→resolved` field — so the Archivist DOES consume the Security verdict. But that consumption is not modeled in the contract: the Security reviewer's output is not in the contract's left column, and there is no row defining what the Archivist does with the Security verdict.
**Suggested fix:** Either (a) extend the contract to include a second table covering the Security reviewer's output (PASS/FAIL, CRITICAL/HIGH/MEDIUM/LOW findings), with the Archivist's corresponding obligation for the `Security:` provenance field; or (b) add a note in the contract acknowledging that Security is a specialization and its PASS/FAIL verdict maps to the `Security:` field in the provenance block via `roles/security.md`, even if the detailed field mapping is not replicated here.

---

## GAP-014 — process.md doesn't connect Phase 13 close-out to the Planner's readiness gate

**File:** `aeg-root/process.md`
**Type:** missing-content
**Severity:** minor
**Description:** `process.md` Phase 13 (Iteration Close) describes the 7 steps the Iteration Archivist executes, including archiving the iteration file to `completed/`. But it does not state that this archive is the physical signal the Planner's readiness gate item 8 checks before planning a new iteration on the same product. The causal loop — "Phase 13 produces the archived file; the Planner gate requires that file; without it the next iteration can't start" — is documented in `roles/planner.md` (gate item 8) and `contracts/iteration-archivist-planner.md`, but not in `process.md`. An agent reading `process.md` as the entry point for the workflow will not understand why Phase 13 is a gate for Phase 0 (Iteration Planning).
**Suggested fix:** Add one sentence at the end of the Phase 13 description: "The archived file at `iterations/completed/<name>.md` is the physical signal the Planner's readiness gate item 8 checks — until it exists, planning a new iteration on this product is blocked (see `aeg-root/contracts/iteration-archivist-planner.md`)."

---

## GAP-015 — process.md references no seam contracts

**File:** `aeg-root/process.md`
**Type:** missing-contract-pointer
**Severity:** minor
**Description:** `process.md` is the canonical "from idea to merged code" walkthrough and the recommended first read for new sessions. It references role docs (`roles/developer.md`, `roles/reviewer.md`, etc.) but contains no references to any of the 6 seam contracts in `contracts/`. Someone following the walkthrough to understand hand-offs between roles will be directed to individual role docs rather than to the contracts that are the single source of truth for each seam. The contract directory is mentioned in `state-machine.md`'s intro but not in `process.md`.
**Suggested fix:** In the "How this process maps to file artifacts" section at the end of `process.md`, add `contracts/` to the reference list: "For the role-seam contracts (what exactly crosses each role boundary), see `aeg-root/contracts/`."

---

## GAP-016 — coordination.md reading order doesn't include contracts/

**File:** `aeg-root/coordination.md`
**Type:** stale-content
**Severity:** minor
**Description:** The "Reading order for new sessions" section lists 9 items (coordination.md, state-machine.md, role doc, iterations/README.md, state.md, now.md, current iteration file, changelog.md, lessons.md) but does not include `aeg-root/contracts/`. The contracts directory now holds 6 files that define the authoritative hand-off between roles. An agent following the reading order will load role docs but not the contracts those role docs are supposed to point at. This means the reading order produces a partial orientation: roles are known, but the seam definitions between them are not.
**Suggested fix:** Add `aeg-root/contracts/` to the reading order between items 3 (role doc) and 4 (iterations/README.md), with a note: "aeg-root/contracts/ — role-seam contracts; single source of truth for what crosses each role boundary (relevant seam only)."

---

## Context notes

### What IS correct after PR #144

- All 6 contracts are well-formed and internally consistent.
- `contracts/planner-brief.md` is fully integrated: `roles/planner.md` references it explicitly in the "Hand-off" section; `skills/brief-authoring/SKILL.md` references it explicitly in "Start from the Planner's rationale."
- `roles/planner.md` readiness gate item 8 correctly references `contracts/iteration-archivist-planner.md` by path — this is the one downstream pointer that was added by PR #144 and is in place.
- `brief-authoring/SKILL.md` §7 (Tier 3 doc-update list) and "Required" (Tier field) correctly document the `Conforms-to: D-###` alternative.
- `state-machine.md` Section 1 correctly references `contracts/` in its intro paragraph.
- `state-machine.md` Section 3 (Mutation Permission Matrix) has a row for `contracts/*.md` artifacts.

### What was not audited (out of scope)

- `iterations/README.md` — not in the brief's surface map; not read.
- `aeg-project/` files (state.md, now.md, decisions.md, lessons.md) — not in scope.
- `diagrams/` — not in scope.
- Any project-specific spec files — not in scope.

### Pattern

The root cause of the 9 missing-contract-pointer gaps is uniform: PR #144 created the 5 new contracts and they each state "the two role docs … each reference this file" — but the role doc edits that would put those back-references in place were not included in the PR. This was not a bug in the contracts themselves (which are accurate about what *should* be true) but a gap between what the contracts declared and what the role docs actually contained at the time of merge. The fix task is mechanical: each of the 9 gaps requires adding 1-2 sentences to an existing role doc or skill file.
