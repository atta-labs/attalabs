---
sidebar_title: Documentation Coherence
---
# Documentation Coherence — who reads, who writes, and when

Documentation coherence is not one obligation — it is a relay across every role in the flow, each leg governed by a role-seam contract. This page indexes that relay: what each role reads before it acts, what it writes as it hands off, and the two enforcement tracks (judgment vs. mechanical) that keep the relay from silently dropping a doc. It does not restate the authoritative sources — `packages/governance/decisions.md` (D-058, D-062, D-076), the seam contracts, `state-machine.md` §15, and `enforcement.md` remain canonical; this page cross-links them.

---

## Role × reads/writes

| Role | Reads (before acting) | Writes (at its seam) |
|---|---|---|
| **Planner** | Every spec/skill/doc relevant to the whole iteration's code surfaces — the whole-iteration read pass required before cutting a single task (D-058 Pillar 1). | The **"Docs to keep coherent"** rationale field on each task's Issue — names intended surfaces (not resolved doc pointers; the manifest evolves before dispatch — D-076). No doc files edited directly. |
| **Brief Author** | The Planner's rationale (via `contracts/planner-brief.md`), plus its **own task-scoped re-read** of the same surface — re-verified fresh at dispatch time, since docs may have moved since planning (D-058 Pillar 1). | Brief **§2** (surfaces what the Developer must know) and **§7** (the doc-update list) — mechanically re-derived by matching the task's intended surfaces against the live `packages/governance/doc-owners` manifest (`deriveSection7`, D-076), then supplemented by its own reading. Any override of the derived floor carries a one-line reason. |
| **Developer** | The brief's §2 and §7 — zero-discovery execution: the Developer does not re-derive what §7 already names. | Updates every doc named in §7 in the same PR (D-058 Pillar 2, a DoD gate — a named doc not updated is a BLOCKER at review). Independently, for any changed code file that matches an `packages/governance/doc-owners` binding, satisfies C5's bind‑or‑waive rule (update the bound doc, `Doc-ack:`, or `Doc-waiver:` — D-062) whether or not §7 named it. |
| **Reviewer** | The brief in the PR body, then the diff. | No files — a **verdict** with a dual check: §7 completeness/correctness as a BLOCKER gate (`contracts/developer-reviewer.md`), and judgment of C5-covered doc **correctness** (a passing C5 plus a no-op or misleading doc edit is still a BLOCKER). |
| **Archivist** | The merged PR (brief, diff, Reviewer's verdict). | Post-merge **coherence confirmation** — confirms the tier-required docs actually moved and are coherent with what merged (not just present); updates the per-project `state.md` for every project the task listed; updates `docs-index.md` if files were added, removed, or renamed. |

---

## Two tracks, not one

Coherence is enforced on two independent tracks that both run on every PR:

- **Judgment track — §7.** A human/agent-read obligation: the Planner and Brief Author identify which docs a task's *specific* change will make incoherent, name them, and the Developer updates them; the Reviewer judges whether the update is actually correct, not just present. This catches docs the mechanical manifest hasn't been taught about yet — a doc that's relevant by context and reading, not by a declared glob.
- **Mechanical track — C5 / `packages/governance/doc-owners`.** A CODEOWNERS-shaped `<code-glob> → <doc-pointer>` manifest; `verify-docs` C5 glob-matches every changed code file against it and enforces bind-or-waive (update the bound doc, `Doc-ack:` a URL pointer, or `Doc-waiver:` with a reason) — dormant until a binding exists, orthogonal to tier (state-machine.md §15). This is the backstop for surfaces someone already declared load-bearing, independent of whether any human remembered to name them in §7 this time.

Neither track substitutes for the other: §7 catches what the manifest doesn't yet know; C5 catches what a tired §7 pass forgets.

---

## The Planner/Brief-Author split

D-058 splits the read obligation by altitude, not by redundancy:

- The **Planner's** read pass is whole-iteration — before any task is cut, it reads the specs/skills/docs relevant to every surface in scope and records, per task, which docs that task will make incoherent.
- The **Brief Author's** read pass is task-scoped re-verification — at dispatch time (which may be well after planning), it re-reads the same surface fresh and mechanically re-derives the §7 floor from the *live* `doc-owners` manifest (D-076's `deriveSection7`), because the manifest — and the docs themselves — can have moved since the Planner's pass. The Planner names intended surfaces, never resolved pointers, for exactly this reason.

This is why the Planner's rationale field survives even though a mechanical derivation exists: the derivation runs once, at brief time, against current reality — it cannot run at plan time without freezing a pointer list that goes stale.

---

## Reader-facing readability — no unresolvable symbols

Some of these docs are read by strangers, not only by agents that carry the decision log in context. The published set (the enforcement map, the role docs, the contracts) is the harness's public face, and any token that requires insider knowledge — a decision id, a section number, an Issue or PR number, an iteration slug, an internal file path — means nothing to a stranger, because it points at something not on the page. The rule is therefore a principle, not a fixed list of symbol types:

> **A reader-facing published doc contains no token that requires insider knowledge — no decision ids, section refs, Issue/PR numbers, iteration slugs, or internal paths; state facts in plain words. Machine fields and named references to other published docs are exempt.**

State the fact in plain words and delete the token; the sentence must stay true and complete for a stranger. Exempt: machine fields a parser/build reads (`Conforms-to:`, `## D-NNN` headings, frontmatter keys), and named references to other **published** docs a reader can open. This is a judgment obligation the Reviewer holds — a published doc that leaves an insider-only token on the page is a finding.

---

## Cross-references

- **Decisions** (`packages/governance/decisions.md`): D-058 (bidirectional read/write obligation), D-062 (`doc-owners` + C5 mechanical coverage gate), D-076 (§7 mechanical derivation from `doc-owners`).
- **Seam contracts** (`aeg-root/contracts/`): `planner-brief.md`, `brief-developer.md`, `developer-reviewer.md`, `reviewer-archivist.md`, `archivist-iteration-archivist.md`, `iteration-archivist-planner.md`.
- **`state-machine.md` §15** — Coherence Seam: Doc Coverage — the C5 mechanics in full.
- **`enforcement.md`** — the three-ring enforcement map; documentation coverage is called out there as enforced at both push and PR-open.
