# Atta — Global Decision Log

Cross-product architectural decisions that affect the Atta ecosystem as a whole. Product-specific decisions live in per-product decision logs (`apps/*/specs/*-decisions.md`).

**Schema:** See `state-machine.md` Section 6. Append-only — never edit existing entries. Status transitions are new entries that reference old ones.

---

## D-001 — Three-role + Archivist operational model

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** The Atta ecosystem needed a formalized operational model for the solo-founder + AI swarm workflow. Multiple framing options were explored across three reviewer rounds (v1, v2, v2.1). The key question was whether roles should be split by cognitive mode or collapsed.

**Decision:** Three conversational roles — Principal, Team Leader, Developer — plus one non-conversational role — Archivist (automation only). The TL is not split into separate "Strategist" and "Brief Author" roles; those are modes within the TL role. The Archivist is not a conversational role; it runs as GitHub Actions automation.

**Alternatives rejected:**
- Four-role model (Principal / Strategist-TL / Brief-Author-TL / Developer): rejected. A split TL would require handoffs between the same agent in different invocations, creating coordination overhead that the mode-within-TL approach avoids.
- Two-role model (Principal / AI agent): rejected. Too coarse; doesn't capture the authority gradient between TL and Developer.

**Consequences:** All governance docs, role files, and Cetana tooling are designed around three conversational roles + Archivist. Future PRs that introduce a new role category require superseding this decision.

---

## D-002 — State machine framing: artifacts, mutations, authority, escalation

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** Operational models are often described role-first ("the TL does X"). This creates ambiguity — it says who, not when, with what constraints, or at what authority level.

**Decision:** The architecture is framed as a state transition system. Artifacts have states. Roles are interfaces authorized to trigger certain transitions. `state-machine.md` is the canonical constitutional document. All role docs derive from it; it does not derive from them.

**Alternatives rejected:**
- Role-first framing: rejected. "The TL manages PM docs" is ambiguous — it doesn't say in what state, with what approval chain, or what happens when there's a conflict.
- RACI matrix: rejected. RACI captures responsibility but not the state transitions, escalation paths, or authority hierarchy needed here.

**Consequences:** The state-machine framing is the design anchor for all governance work. Future governance questions are answered by the matrix in `state-machine.md`, not by reading role docs and inferring.

---

## D-003 — Tiered documentation by impact: Tier 0, 1, 3 (Tier 2 eliminated)

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** Different work requires different documentation ceremony. A one-line bug fix and a cross-product architectural change should not have the same requirements. At the same time, a three-tier system with a natural break between medium and large would create classification disputes at every boundary.

**Decision:** Three tiers — Tier 0 (trivial), Tier 1 (implementation), Tier 3 (product/roadmap). Tier 2 deliberately eliminated. When classification is ambiguous, default to Tier 3. The asymmetry (0, 1, 3) makes Tier 2 absence obvious and prevents "medium" from becoming a catch-all that erodes Tier 3 requirements.

**Alternatives rejected:**
- Two tiers (simple / complex): rejected. Too coarse; misses the large middle ground of meaningful implementation work that needs spec updates but not governance-level ceremony.
- Four tiers (0/1/2/3): rejected. The 1→2 boundary was consistently disputed in the v1 and v2 review rounds. Eliminating 2 forces classification toward explicit judgment at the high end.

**Consequences:** Tier 3 becomes the explicit catch-all for anything not clearly trivial or standard implementation. This may produce slightly over-documented changes, but that cost is lower than under-documented architectural decisions.

---

## D-004 — Two-mode authority hierarchy (audit vs. planning)

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** When multiple artifacts make conflicting claims, which one wins? A single ordering fails because "ratified specs outrank shipped code" is correct when verifying intent but wrong when auditing runtime behavior.

**Decision:** Two distinct orderings based on the question being asked. Audit mode ("what is currently true?") ranks shipped code above aspirational specs. Planning mode ("what should we change it to?") ranks target specs above shipped code. The mode must be named explicitly when the ordering matters. Full orderings defined in `state-machine.md` Section 4.

**Alternatives rejected:**
- Single ordering with manual overrides: rejected. Too easy to misapply. Naming the mode forces the user to articulate which question they're asking.

**Consequences:** All agents must internalize two orderings. The verify-docs script runs in audit mode. Brief authoring runs in planning mode. Contradiction resolution explicitly names which mode reveals the contradiction.

---

## D-005 — Spec ratification via mechanical gate (not assumption)

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** Specs were historically written and treated as authoritative without explicit ratification. This created the BYOK gap: a spec described a model that implementation had already departed from, but no mechanism flagged the drift.

**Decision:** A spec is "ratified" (ranking above shipped code in audit mode) only if it carries an explicit metadata block (`Status: ratified`, `Ratified on:`, `Ratified by:`, `Ratifies via:`) AND the ratifying PR was either spec-only or referenced by an ACTIVE decision log entry with `Ratifies:`. Default state is `draft`. All current specs in the repo are `draft` as of v3 ship.

**Alternatives rejected:**
- Implicit ratification via PR merge: rejected. Every spec PR currently merges; this would ratify everything immediately, defeating the purpose of the mechanism.
- Ratification via git tag: rejected. Adds tooling complexity; the metadata block in the file itself is self-documenting.

**Consequences:** Spec ratification becomes a deliberate act, not an assumption. This adds ceremony but removes ambiguity. The first ratification pass is separate future work.

---

## D-006 — Decision log supersession semantics and five status values

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** Decision logs grow over time. Old decisions may become irrelevant, be superseded by new decisions, or expire when their context changes. A log with no status semantics becomes unreadable noise.

**Decision:** Five status values — ACTIVE, SUPERSEDED, RETIRED, EXPIRED, PENDING — with distinct semantics (defined in `state-machine.md` Section 6). The log is append-only: status changes are new entries, not in-place edits. Superseding a decision creates a new D-### that fills `Supersedes:` on the new entry and fills `Superseded by:` on the old entry.

**Alternatives rejected:**
- Delete old decisions: rejected. Destroys audit history.
- Edit old decisions in place: rejected. Loses the record of what was decided when and why.
- Binary active/inactive: rejected. Doesn't capture the distinction between "deliberately retired" (RETIRED), "context changed" (EXPIRED), and "replaced by newer decision" (SUPERSEDED).

**Consequences:** Decision logs grow indefinitely. This is correct — they are audit trails, not living documents. The PENDING status enables solo TL sessions to make Type 2 decisions without the principal present, with explicit notation that ratification is pending.

---

## D-007 — Lock mechanism advisory in V0; CI enforcement deferred to V1

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL (May 2026 v3 model session)
**Ratified by:** TL (Type 2)

**Context:** Decisions with `Lock: YES` signal closed design branches. Briefs touching locked areas should acknowledge or explicitly challenge the lock. Enforcing this mechanically requires the Archivist to parse lock references in briefs.

**Decision:** Advisory in V0. Archivist posts a PR comment if a lock acknowledgment appears to be missing. CI does not block. Full CI enforcement deferred to V1, when lock density justifies the implementation investment.

**Alternatives rejected:**
- Full CI enforcement immediately: rejected. Lock density in V0 is low; the enforcement mechanism would be built before there are enough locks to validate it.

**Consequences:** In V0, lock compliance is agent discipline. Agents are expected to check `decisions.md` for active locks touching their work area and include the acknowledgment block. The Archivist comment serves as a reminder, not a gate.

---

## D-008 — Severity routing on cetana_request_input: three values

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** When a Developer escalates via `cetana_request_input`, the question may need different responders — the TL (for execution and strategy questions) or the Principal (for product/Type 1 decisions). Without routing, all escalations land in the same bucket, forcing the Principal to monitor every blocked task.

**Decision:** Three severity values: `execution` (routed to TL Brief Author mode, label `needs:execution-input`), `strategy` (routed to TL Strategist mode, label `needs:strategy-input`), `product` (routed to Principal, label `needs:principal-input`). Detailed routing rules in `state-machine.md` Section 7. Implementation in `cetana-spec.md` (specced) and `request-input.ts` (code follow-up PR).

**Alternatives rejected:**
- Binary routing (TL / Principal): rejected. Doesn't distinguish between execution-level blocking (a missing flag) and strategy-level blocking (a design fork). The TL needs to context-switch between modes; the severity field signals which mode is needed.

**Consequences:** Labels on GitHub Issues become the primary monitoring surface. The Principal only needs to watch `needs:principal-input` labels. The TL monitors `needs:execution-input` and `needs:strategy-input`.

---

## D-009 — Ratification windows: daily cadence, queue-based

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** Continuous interruption for Type 1 approvals and Tier 3 merges is operationally unsustainable for a solo founder. Decisions pile up; interruptions fragment deep work.

**Decision:** 1-2 daily ratification windows where the Principal resolves all pending items: Type 1 decisions, Tier 3 merges, lock approvals, `severity:product` escalations, PENDING Type 2 decisions. Items append to `project-management/ratification-queue.md`. The Principal resolves at each window.

**Alternatives rejected:**
- On-demand Principal availability: rejected. This is the current state, which produces the continuous-interruption problem this decision is solving.
- Weekly ratification: rejected. Too much queuing; items that need to unblock Developers would wait too long.

**Consequences:** Some work batches at windows rather than shipping immediately. Tier 3 work merges at windows, not anytime. This is the deliberate governance cadence trade-off for solo-founder sustainability.

---

## D-010 — verify-docs script for hard enforcement; Archivist for advisory

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** Governance enforcement can be: (1) hard CI gates that block merge, or (2) advisory comments that guide without blocking. Using hard gates for everything is too rigid; advisory-only is too weak for tier-appropriate documentation.

**Decision:** Split: `scripts/verify-docs.ts` provides hard CI enforcement for tier-appropriate documentation requirements (mechanical, verifiable). Archivist provides advisory comments for judgment-based checks (semantic relatedness, skill staleness, decision log synthesis hints). Cetana stays orchestration-focused and does not implement governance gates.

**Alternatives rejected:**
- Everything in Cetana: rejected. Cetana's job is dispatch + escalation; governance is a separate concern with different deployment needs (CI runs on GitHub, not on the Mac running Cetana).
- Everything advisory: rejected. Documentation requirements that can be mechanically verified (did the PR touch the decision log? is the spec file present?) should be enforced, not just suggested.

**Consequences:** `scripts/verify-docs.ts` is V0 stub (exits 0); full implementation is V0.7. Archivist GitHub Action is V0 stub (no-ops); full implementation is V0.7.

---

## D-011 — brief-authoring-rules lives as a skill, not an operational PM doc

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL (May 2026 v3 model session)
**Ratified by:** TL (Type 2)

**Context:** Brief authoring rules were stored at `project-management/brief-authoring-rules.md`. This placement suggests they are always-on operational rules. In practice, they are only needed during brief authoring — a specific, contextual activity.

**Decision:** Move to `.claude/skills/brief-authoring/SKILL.md`. Skills are loaded contextually when needed, not stored in the always-on PM docs. The skill is then listed in `docs-index.md` under skills.

**Alternatives rejected:**
- Keep in `project-management/`: not wrong, but inconsistent with how other contextual guidance is stored. Skills have a defined loading mechanism; PM docs do not.

**Consequences:** Brief authoring rules are now skill-gated. An agent writing a brief loads the skill. The `project-management/` directory is cleaner. The skill gets the v3 model integration section that `project-management/` placement would have diluted.

---

## D-012 — thinking.md is best-effort optional working memory

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL (May 2026 v3 model session)
**Ratified by:** TL (Type 2)

**Context:** Between Claude sessions, the TL loses in-flight context. Various approaches exist: session summaries, structured notes, in-repo files. What is the right home for ephemeral TL working memory?

**Decision:** `project-management/thinking.md` is best-effort optional working memory for the TL. Written freely, not depended on by any other process, not a canonical artifact. The Archivist flags it as stale if untouched for >7 days. V0.7 will add `cetana.checkpoint_thought` MCP tool for continuous checkpointing from Claude Desktop.

**Alternatives rejected:**
- Per-session structured summary files: rejected. Too much ceremony for optional context.
- Structured JSON working memory: rejected. Overhead-to-value ratio is too high for V0.

**Consequences:** `thinking.md` exists when the TL needs it and is absent otherwise. Nothing depends on it. If it's wrong or absent, no process breaks — agents verify current state from canonical sources.

---

## D-013 — No version suffixes in spec filenames; specs are living documents

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** Active specs were being named with version suffixes (`cetana-v0-spec.md`, `vada-v1-tech-spec.md`). Versioned names imply multiple active versions and create confusion about which is canonical. Legacy docs in `apps/*/specs/legacy/` are correctly archived with dates; active specs should not be.

**Decision:** Active specs are unversioned: `cetana-spec.md`, `vada-spec.md`, etc. Historical context lives in experiment logs (what was tried) and decision logs (what was decided and why). Legacy versioned files in `apps/*/specs/legacy/` remain as archives; do not touch them. `cetana-v0-spec.md` renamed to `cetana-spec.md` in this PR.

**Alternatives rejected:**
- Versioned filenames with symlinks to current: rejected. Symlinks are fragile and the versioning problem would still exist.
- Versioned files with a CURRENT pointer file: rejected. Same problem, more files.

**Consequences:** A spec's version history lives in git. The filename is permanent and unversioned. If a spec requires a major structural rewrite, it gets a new content section, not a new filename.

---

## D-014 — Append-oriented plan.md "in flight" section

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL (May 2026 v3 model session)
**Ratified by:** TL (Type 2)

**Context:** Multiple TL sessions may update `plan.md` concurrently (or sequentially in the same day). If each session overwrites the "in flight" section, only the latest session's view survives. If they all append, the section grows but no information is lost.

**Decision:** The "in flight now" section of `plan.md` uses append-style entries. New sessions prepend a timestamped entry rather than overwriting. This means the section grows over time and reflects the history of what was in flight, not just the current moment. Pruning (archiving old in-flight entries to "recently completed") is a TL maintenance task at ratification windows.

**Alternatives rejected:**
- Overwrite pattern: rejected. Loses context when two sessions both contribute state updates.
- Separate per-session update files: rejected. Too much file management overhead.

**Consequences:** `plan.md` grows between pruning passes. This is acceptable. The alternative (lost state) is worse.

---

## D-015 — Briefs frozen after dispatch; amendments via escalation

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** If a brief can be edited after dispatch, the audit trail breaks: the Developer may have acted on an earlier version that no longer exists. Additionally, mid-task brief edits can invalidate work already done.

**Decision:** Briefs are frozen at the moment of dispatch (GitHub Issue body becomes immutable). Amendments happen only via Developer escalation (`cetana_request_input`). The amendment is logged as a JSONL event — what the TL or Principal said — not as an edit to the brief. The original brief remains the audit record.

**Alternatives rejected:**
- Mutable briefs with version history: rejected. GitHub Issues have edit history but it's not surfaced automatically in audit flows. The JSONL approach keeps the amendment adjacent to the relevant task log.

**Consequences:** If a brief is wrong after dispatch, the correction path is always escalation. The Developer cannot self-amend. The TL cannot silently fix a brief by editing the Issue — the fix must go through the escalation channel and be recorded.

---

## D-016 — Per-brief principal_delegate field for time-boxed delegation

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL (May 2026 v3 model session)
**Ratified by:** TL (Type 2)

**Context:** The Principal is not always available during task execution. For Type 2 decisions, the TL can ratify. But the TL needs explicit authorization to act in the Principal's absence, especially for decisions that would normally require a ratification window.

**Decision:** Briefs include an optional `principal_delegate:` field that grants the TL explicit authority to ratify decisions within the scope of this brief. Scope is per-brief and time-limited to the dispatch period. Two constraints: Type 1 decisions cannot be delegated (they always require Principal ratification). Delegation is one-hop only — TL cannot re-delegate to Developer.

**Alternatives rejected:**
- Session-level delegation (TL has blanket authority per session): rejected. Too broad; could authorize decisions the Principal would not have sanctioned.
- No delegation (all decisions wait for window): rejected. Operationally impractical for tasks that run while the Principal is offline.

**Consequences:** Briefs for work dispatched during Principal-offline periods should include `principal_delegate: TL` with explicit scope. The TL makes Type 2 decisions, marks them PENDING in the decision log, and converts PENDING → ACTIVE after the next ratification window confirms.


---

## D-024 — Split plan.md into now/roadmap/changelog/lessons

**Date:** 2026-05-11
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL (plan decomposition session, May 2026)
**Ratified by:** TL (Type 2)

**Context:** `project-management/plan.md` became a PR-conflict hotspot. Three PRs in 48 hours (PRs #28, #32, #33) all conflicted on it because the file mixes content with very different update cadences: active tasks (daily), track status (sprint), completed work (per-PR append), and lessons (monthly). Any session touching any one of those concerns edits the same file, creating merge conflicts.

**Decision:** Split `plan.md` into four focused files:
- `now.md` — active work, next 3 things, blocked, manual tasks (changes daily)
- `roadmap.md` — tracks A-G, sequencing, open questions (changes each sprint)
- `changelog.md` — append-only completed work log, most recent first (append per PR; never edit existing entries)
- `lessons.md` — calibration lessons + anti-patterns (append-only; monthly review)

`plan.md` is replaced with a redirect stub pointing to the four files. The stub is retained for ~3 months (target: ~2026-08-11) for any existing references, then deleted.

**Alternatives rejected:**
- Sectioning within plan.md using collapsible headings: rejected. The file is Git-tracked markdown; collapsing sections does not prevent merge conflicts — different sessions still edit the same byte range.
- Keeping a single file and enforcing append-only: rejected. Append-only works for changelog and lessons, but now.md and roadmap.md require in-place updates (e.g., marking a track item complete).

**Consequences:** `coordination.md` session-start protocol updated to reference four files. `state-machine.md` mutation matrix updated. `docs-index.md` regenerated. Any automation (Archivist, Cetana) that reads or writes `plan.md` must be updated to route to the appropriate new file.