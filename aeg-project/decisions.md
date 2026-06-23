# Atta — Global Decision Log

Cross-product architectural decisions that affect the Atta ecosystem as a whole. Product-specific decisions live in per-product decision logs (`apps/*/specs/*-decisions.md`).

**Schema:** See `state-machine.md` Section 6. Append-only — never edit existing entries. Status transitions are new entries that reference old ones.

---

## D-001 — Three-role + Archivist operational model

**Date:** 2026-05-10
**Status:** SUPERSEDED
**Type:** 1
**Lock:** YES
**Superseded by:** D-026
**Authored by:** Principal (v2.1 synthesis session, May 2026)
**Ratified by:** Principal

**Context:** The Atta ecosystem needed a formalized operational model for the solo-founder + AI swarm workflow. Multiple framing options were explored across three reviewer rounds (v1, v2, v2.1). The key question was whether roles should be split by cognitive mode or collapsed.

**Decision:** Three conversational roles — Principal, Team Leader, Developer — plus one non-conversational role — Archivist (automation only). The TL is not split into separate "Strategist" and "Brief Author" roles; those are modes within the TL role. The Archivist is not a conversational role; it runs as GitHub Actions automation.

**Alternatives rejected:**
- Four-role model (Principal / Strategist-TL / Brief-Author-TL / Developer): rejected. A split TL would require handoffs between the same agent in different invocations, creating coordination overhead that the mode-within-TL approach avoids.
- Two-role model (Principal / AI agent): rejected. Too coarse; doesn't capture the authority gradient between TL and Developer.

**Consequences:** All governance docs, role files, and Cetana tooling are designed around three conversational roles + Archivist. Future PRs that introduce a new role category require superseding this decision. (Superseded by D-026, which adds the Reviewer role category — the rest of this decision, including the unsplit TL and the non-conversational Archivist, is carried forward unchanged.)

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

## D-008 — Severity routing on escalation: three values

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** When a Developer escalates, the question may need different responders — the TL (for execution and strategy questions) or the Principal (for product/Type 1 decisions). Without routing, all escalations land in the same bucket, forcing the Principal to monitor every blocked task.

**Decision:** Three severity values: `execution` (routed to TL Brief Author mode, label `needs:execution-input`), `strategy` (routed to TL Strategist mode, label `needs:strategy-input`), `product` (routed to Principal, label `needs:principal-input`). Detailed routing rules in `state-machine.md` Section 7. (The escalation mechanism is manual in the by-hand flow, or an automation layer's request-input when a tool is used — e.g. Cetana's `cetana_request_input`; the routing is identical either way.)

**Alternatives rejected:**
- Binary routing (TL / Principal): rejected. Doesn't distinguish between execution-level blocking (a missing flag) and strategy-level blocking (a design fork). The TL needs to context-switch between modes; the severity field signals which mode is needed.

**Consequences:** Labels on GitHub Issues become the primary monitoring surface. The Principal only needs to watch `needs:principal-input` labels. The TL monitors `needs:execution-input` and `needs:strategy-input`. (The full label vocabulary — closed set, mandatory vs conditional — is consolidated in `state-machine.md` §14 per D-043.)

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

**Consequences:** `scripts/verify-docs.ts` is V0 stub (exits 0); full implementation is V0.7. Archivist GitHub Action is V0 stub (no-ops); full implementation is V0.7. (The verify-docs half of this decision is implemented by D-027.)

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

**Consequences:** Brief authoring rules are now skill-gated. An agent writing a brief loads the skill. The `project-management/` directory is cleaner. The skill gets the v3 model integration section that `project-management/` placement would have diluted. (Note: the *placement* rationale here is revisited by D-039 — skills' canonical home moves to `project-management/skills/` for self-containment, with `.claude/skills/` a generated view. The "skills are contextually loaded, not always-on PM prose" principle is unchanged; only the source-of-truth location moves. D-039 was **executed** by D-040 — the AEG flow skills now physically live at `project-management/skills/`.)

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
**Status:** SUPERSEDED
**Type:** 2
**Superseded by:** D-024
**Authored by:** TL (May 2026 v3 model session)
**Ratified by:** TL (Type 2)

**Context:** Multiple TL sessions may update `plan.md` concurrently (or sequentially in the same day). If each session overwrites the "in flight" section, only the latest session's view survives. If they all append, the section grows but no information is lost.

**Decision:** The "in flight now" section of `plan.md` uses append-style entries. New sessions prepend a timestamped entry rather than overwriting. This means the section grows over time and reflects the history of what was in flight, not just the current moment. Pruning (archiving old in-flight entries to "recently completed") is a TL maintenance task at ratification windows.

**Alternatives rejected:**
- Overwrite pattern: rejected. Loses context when two sessions both contribute state updates.
- Separate per-session update files: rejected. Too much file management overhead.

**Consequences:** `plan.md` grows between pruning passes. (Superseded by D-024, which split `plan.md` into `now.md`/`roadmap.md`/`changelog.md`/`lessons.md`; the append-oriented rule carried to `now.md`. `roadmap.md` was later retired by D-029, and the `plan.md` redirect stub was removed June 10, 2026 — D-037.)

---

## D-015 — Briefs frozen after dispatch; amendments via escalation

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (v3 model session, May 2026)
**Ratified by:** Principal

**Context:** If a brief can be edited after dispatch, the audit trail breaks: the Developer may have acted on an earlier version that no longer exists. Additionally, mid-task brief edits can invalidate work already done.

**Decision:** Briefs are frozen at the moment of dispatch. Amendments happen only via Developer escalation. The amendment is logged as an event — what the TL or Principal said — not as an edit to the brief. The original brief remains the audit record. (Note: D-029 places the brief in the PR body rather than the Issue body; the frozen-after-dispatch invariant is unchanged — the brief is frozen at dispatch regardless of where it is pasted.)

**Alternatives rejected:**
- Mutable briefs with version history: rejected. Edit history is not surfaced automatically in audit flows. The event-log approach keeps the amendment adjacent to the relevant task log.

**Consequences:** If a brief is wrong after dispatch, the correction path is always escalation. The Developer cannot self-amend. The TL cannot silently fix a brief by editing it — the fix must go through the escalation channel and be recorded.

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
**Supersedes:** D-014
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

**Consequences:** `coordination.md` session-start protocol updated to reference four files. `state-machine.md` mutation matrix updated. `docs-index.md` regenerated. Any automation (Archivist, Cetana) that reads or writes `plan.md` must be updated to route to the appropriate new file. (Note: `roadmap.md` was subsequently retired by D-029 — the product roadmap moved out of AEG to per-product backlogs / the company's tool; `now.md`, `changelog.md`, and `lessons.md` are carried forward unchanged. The `plan.md` redirect stub was removed early, June 10, 2026, under D-037 — all references had been repointed.)

---

## D-025 — v2 naming and framing: AttaLabs vs Atta; no -AI suffix; Pāli rule demoted

**Date:** 2026-05-12
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Principal (v2 naming pressure-testing session — Strategic/UX, Gemini, Grok reviewer rounds, May 12, 2026)
**Ratified by:** Principal

**Context:** The v1 framing (locked April 26, 2026) treated Atta as "the ecosystem" with no product carrying the name; AttaLabs as a "public domain wrapper only"; the rule "Pāli = built by Atta" as structural; Herald as "plugs in via MCP, not a core product"; Sati as the renamed "Atta-the-product" (memory layer). Three rounds of multi-reviewer review revealed structural problems: the Atta brand was the founder's strongest brand attachment and was being given away by the v1 framing; the "Pāli = built by Atta" rule was confusing once Cetana (Pāli, but internal dev tooling) was clarified as not part of Atta; the `-AI` suffix on product brands (HeraldAI, VadaAI) was 2023-era dated and weakened distinctive Pāli names; the two-ecosystem distinction (AttaLabs dev lab vs Atta-internal composition) was implicit and a frequent source of confusion in conversations.

**Decision:** Lock the v2 framing:

1. **Atta is the product** — the deep-thinking AI composed of Vāda + Vitakka + Sati. Not merely a code namespace, not "the ecosystem only." Target consumer domain `atta.ai` if/when available (not owned; Japanese individual owner, may free 2027); fallback options preserved.
2. **AttaLabs is the dev/lab ecosystem** — permanent home at `attalabs.dev`. Contains multiple products: Atta, Vāda, Vitakka, Sati (layers), Herald, Cetana, the Atta Engine.
3. **Two ecosystems at different scales** — both legitimate uses of the word "ecosystem": (a) AttaLabs ecosystem = the dev lab containing many products; (b) Atta ecosystem = the internal composition of Vāda + Vitakka + Sati that makes Atta-the-product. Specs and docs use the qualifier when ambiguity matters.
4. **No `-AI` suffix on any product brand** — all bare: Atta, Vāda, Vitakka, Sati, Herald, Cetana. AI category signal via page content and site metadata (`<title>`, OpenGraph, link previews), not via brand.
5. **Pāli rule demoted** from structural ("Pāli = built by Atta") to elective aesthetic. Mandatory inside Atta only (Atta, Vāda, Vitakka, Sati are Pāli). Elective elsewhere — Cetana is Pāli but not part of Atta; Herald is non-Pāli but built by Dani. Pāli is a naming preference the founder may exercise, not a signal of ownership.
6. **Cetana is not part of Atta** — internal dev tooling for the Atta team (local Mac orchestration). Sibling product in AttaLabs. Future public surface (`cetana.attalabs.dev`) conditional on V0/V0.5 dogfood criteria.
7. **Herald is a standalone AttaLabs product** — built by Dani. Not "plugs in" (v1 framing retired). Can be invoked by Atta or any MCP-compatible host as one of many external tools.
8. **Sati's standalone surface scope is deferred** — Sati is the memory layer inside Atta; whether it has its own standalone surface is decided as Atta build progresses (OQ-cross-13).

**Alternatives rejected:**
- Keep v1 (Atta = ecosystem, no product named Atta): rejected. Strong reviewer consensus across all three rounds that this gives away the brand the founder is actually building.
- Add `-AI` suffix to bare brands (AttaAI, VadaAI, HeraldAI) as transitional naming: rejected. Mid-life rebrands are expensive and confusing; commit to clean names from day one. No leading AI brand (Anthropic, Mistral, Cohere, Perplexity, Cursor, Linear, Lovable, v0) carries the suffix.
- Keep "Pāli = built by Atta" as a structural rule with Cetana as the exception: rejected. The rule predicts the wrong thing (Cetana is Pāli but not part of Atta) and Herald demonstrates the rule fails the other way (English but built by Dani). Demoting to aesthetic resolves both cases.

**Consequences:**
- Canonical doc: `apps/atta-ai/specs/atta-naming-decision.md` (full rewrite v2).
- Strategic positioning doc: `apps/atta-ai/specs/atta-ecosystem-vision.md` (framing updated; strategic content preserved).
- Root `README.md` and `CLAUDE.md` updated.
- `project-management/coordination.md` "names" section + anti-patterns updated.
- `project-management/state.md` "Brand & domain" + per-product sections updated.
- All updates in PR #46 (this PR).
- Follow-up: `apps/atta-ai/specs/atta-build-strategy.md` Cetana "Layer 4" section needs realignment to current V0/V0.5 internal-tooling reality (separate PR).
- Open question OQ-cross-13 added to `state.md`: Sati standalone surface decision.

**Ratifies:** `apps/atta-ai/specs/atta-naming-decision.md` (v2 rewrite at SHA of commit `6af1a47` on `docs/naming-and-framing-audit-may-12`).

---

## D-026 — Reviewer role category (code + security review passes)

**Date:** 2026-06-02
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Supersedes:** D-001
**Authored by:** Principal (review-roles session, June 2, 2026)
**Ratified by:** Principal (in-session)

**Context:** The v3 model (D-001) defined three conversational roles plus the Archivist. Review (Phase 10) was performed only by the Principal (code) and the TL (specs). There was no independent agent-driven review and no dedicated security audit — a gap relative to common agentic-harness setups (e.g. Affaan Mustafa's ECC, which ships `code-reviewer` and `security-reviewer` subagents plus an AgentShield config scanner). The Principal wants independent, fresh-context review and a security pass as first-class steps. D-001 states that introducing a new role category requires superseding it.

**Decision:** Add a fourth conversational role category, **Reviewer**, with two specializations: **code review** (`roles/reviewer.md`) and **security review** (`roles/security.md`). The operational model is now: Principal → Team Leader → Developer → **Reviewer** → (merge), plus the non-conversational Archivist. Reviewer agents run with fresh context (independent eyes), are invoked after a PR is opened, produce a structured verdict, and have read + PR-review-comment authority only — they do not edit code and do not merge. Review passes run before the human reviews in Phase 10: code-reviewer → security → Principal code review → TL spec review → merge. Claude Code subagent definitions ship at `.claude/agents/code-reviewer.md` and `.claude/agents/security-reviewer.md`. Everything else in D-001 (unsplit TL with modes; non-conversational Archivist) is carried forward unchanged.

**Alternatives rejected:**
- Reviewer/Security as *modes* of the Developer role (like Strategist/Brief-Author are modes of the TL): rejected. The independence rule requires fresh context and a different agent instance; a "mode" implies the same agent reviewing its own work, which defeats the purpose.
- Two separate top-level roles (Reviewer and Security): rejected as over-factored. Security is a specialization of review with the same authority profile and process position; one role category with two specializations is tighter.
- Make the passes CI bots now: deferred. The first cut is human-in-the-loop (Principal pastes the agent prompt). Automation (Cetana dispatch of review agents) is future work once the manual flow is proven.

**Consequences:**
- New role docs `roles/reviewer.md`, `roles/security.md`; new agent defs under `.claude/agents/`.
- `process.md` Phase 10 updated to include the two agent passes.
- `coordination.md` session-start protocol gains a Reviewer/Security orientation block.
- `state-machine.md` Section 1 and Section 3 updated to recognize the Reviewer role and its read + review-comment authority; the role does not get a mutation column because it does not mutate canonical artifacts.
- Review passes are **trusted discipline** in this first cut (not CI-enforced) — Phase 10 requires them but no bot runs them yet.
- Type 1, ratified in-session by the Principal without a multi-reviewer pressure-testing round (Phase 2 skipped at Principal's direction). Noted for audit honesty.

---

## D-027 — verify-docs implemented as a real blocking gate

**Date:** 2026-06-02
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Principal (review-roles session, June 2, 2026)
**Ratified by:** Principal (in-session)

**Context:** D-010 split governance enforcement into a hard gate (`scripts/verify-docs.ts`) and advisory comments (Archivist), but shipped both as V0.7 stubs that exit 0. The consequence: "specs always updated" was instruction-enforced (briefs + `roles/developer.md` tell the agent to update docs) but not machine-enforced — nothing failed a PR if the agent forgot. The Principal wants the doc-update loop to be automatic.

**Decision:** Implement `scripts/verify-docs.ts` for real (fulfilling the verify-docs half of D-010; D-010 remains ACTIVE — the split it defines is unchanged). The `--pr` mode runs in audit mode and enforces, against the PR diff: (C1) changed specs carry a `Status:` block; (C2) changed decision logs have well-formed entries (Status + Type per `## D-NNN`); (C3) for Tier 1+ work, code changes must be accompanied by at least one documentation change; (C4) Tier 3 work must carry a decision log entry. Tier is read from the PR body (`Tier: 0|1|3`), defaulting to Tier 3 when absent. A `full` mode runs lighter repo-wide structural checks. The escape hatch is the `override:docs` label (Principal only), per `state-machine.md` Section 12.

**Alternatives rejected:**
- Semantic verification (does the doc actually describe the code?): rejected for v1. That is the Reviewer's judgment (D-026), not a mechanical gate. verify-docs only checks presence and well-formedness.
- Derive tier from labels instead of PR body: rejected for v1 — body parsing is simplest and matches the brief format. Label-based tier can be added later.
- Block in CI immediately on merge: the script is shipped and the workflow YAML is staged at `scripts/ci/verify-docs.workflow.yml`, but the GitHub App integration lacks the `workflows` scope, so the workflow must be moved to `.github/workflows/verify-docs.yml` by the Principal. Until then the gate is local-only.

**Consequences:**
- `scripts/verify-docs.ts` replaced (stub → real). `developer.md` and `state-machine.md` Section 12 "stub exits 0" notes corrected.
- Workflow staged at `scripts/ci/verify-docs.workflow.yml` with copy instructions; manual move required (integration cannot write `.github/workflows/`). (Done: workflow installed at `.github/workflows/verify-docs.yml` on the `feat/aeg-manual-flow` branch, June 4, 2026 — the gate is now live on PRs.)
- The checks are deliberately blunt and mechanical; they will occasionally require a `Tier: 0` declaration on genuinely trivial code PRs. This is the intended trade-off: enforced-but-blunt over trusted-but-subtle.

---

## D-028 — AgentShield adopted as interim external security-scan gate

**Date:** 2026-06-02
**Status:** ACTIVE
**Type:** 2
**Lock:** NO
**Authored by:** Principal (review-roles session, June 2, 2026)
**Ratified by:** Principal (in-session)

**Context:** The ecosystem runs a real agent/config surface (hosted Vāda MCP, Cetana MCP servers, `.claude/` agents/skills/hooks, server-side BYOK via `@atta/crypto`) with no automated configuration-security audit. ECC's AgentShield scans exactly this class of artifact.

**Decision:** Adopt ECC's `npx ecc-agentshield scan` as an interim external first-pass for the security review, invoked by the security-reviewer when a PR touches `.claude/` configs, MCP configs, or the Cetana coordinator. Its output is an input to the security-reviewer's judgment, not the verdict. A first-party equivalent is future work; this decision is Type 2 (reversible) precisely because it is a temporary external dependency.

**Alternatives rejected:**
- Build a first-party scanner now: rejected as premature; validate the value of config-security scanning with the off-the-shelf tool first.
- No config-security scan: rejected; the surface is real and currently unaudited.

**Consequences:** Referenced in `roles/security.md` and `.claude/agents/security-reviewer.md`. Revisit once dogfooded; if valuable, scope a first-party replacement and supersede this decision.

---

## D-029 — AEG model: manual-flow + iteration layer, forge-native execution

**Date:** 2026-06-04
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (AEG design + hardening sessions, June 3–4, 2026; three external-reviewer rounds — Gemini/DeepSeek/ChatGPT, fresh contexts — to a unanimous endorse)
**Ratified by:** Principal (ratified 2026-06-04)

**Context:** PR #80 formalizes how Atta Agentic Execution Governance (AEG) runs by hand and coordinates multiple developers, and reconciles every governance/role doc to a single model. The design was pressure-tested across three reviewer rounds to unanimous endorsement (the genuinely novel part, per the panel, is self-locating roles; the rest is "real but not novel"). This is a Type 1 governance decision — it introduces a new top-level artifact (the iteration), demotes the product roadmap out of AEG, and fixes the execution-state model — so the Principal ratifies; the TL records it PENDING.

**Decision:** Adopt the AEG model as designed and endorsed:
- **Forge-native, orchestrator-independent.** AEG runs on the Repo + the Git forge (GitHub) plus plain git worktrees, and depends on no orchestration tool. Cetana automates only the dispatch/escalation slice and is optional; Cetana knows AEG, AEG does not know Cetana.
- **A task IS a GitHub Issue; status is DERIVED, never stored.** Issue open/assigned, branch `task/<iteration>/<n>` existence, PR open, review decision, and merge ARE the transitions. No role writes a status field; there are no `status:*` labels (labels are `tier:*`, `aeg:blocked`, `needs:*-input`).
- **The iteration is AEG's top-level artifact** (`iterations/<name>.md`): a thin topology map — task→Issue mapping, `depends-on` / `conflicts-with` edges, grouping, backlog lane. No status, PR numbers, dates, priority, or estimates.
- **The product roadmap lives outside AEG** (the company's tool, or per-product backlogs). The global `roadmap.md` is retired; the link roadmap → iteration is a human (the Planner), not a file.
- **Conflicts are declared, package-level, and static** (collision domains in `.aeg/packages`). No dynamic path-overlap scanner — when unsure, declare the conflict and serialize.
- **The brief is just-in-time, pasted not committed, and lives in the PR body** — never in the Issue. Context lives entirely in the brief. `Ticket:` (provenance) and `Product:` (registry-resolved) are optional reference fields.
- **Two enforced dispatch gates** (the multi-developer lock): never start a task whose `depends-on` isn't merged; never start a task while a `conflicts-with` sibling's PR is open.
- **The Planner** is a third Team Leader mode (alongside Strategist and Brief Author): intent + ticket slice → an iteration of sibling-aware tasks, split vs. combined by verification coupling.
- **The Archivist** gains a close-out role doc (`roles/archivist.md`): merged-PR entry gate, per-product PM updates, orphan/worktree flagging; writes no task status.
- **Three anti-regression rules:** never add execution metadata to the iteration file or Issue; never build a dynamic conflict scanner; never put planning metadata on Issues.

**Alternatives rejected:**
- Storing task status (labels, or a status column in the iteration file): rejected — it races and drifts; the forge already holds the ground truth, so derive it.
- A dynamic path-overlap conflict scanner to catch undeclared collisions: rejected — it requires a live task→files map, reintroducing the mutable state the model eliminates. Declare conservatively and serialize instead (the accepted limitation: AEG can miss novel undeclared cross-package coupling; the trust boundary is planning).
- Keeping the roadmap inside AEG / as the coordination artifact: rejected — it pulls planning metadata (priority, estimates) back in and turns AEG into "Jira again." The iteration carries topology only.
- Brief committed to the repo, or stored in the Issue body: rejected — it ages before work starts and splits context; the PR body is its durable, just-in-time home.

**Consequences:**
- Reconciled in PR #80: `iterations/README.md` and the example iteration (+ `roles/planner.md`, `roles/archivist.md` — new), `aeg-manual-flow.md`, `products.md`, every role doc (`principal`, `team-leader`, `developer`, `reviewer`, `security`), `coordination.md`, `process.md`, `state-machine.md`, the `brief-authoring` skill, and both files under `diagrams/`.
- Retires `roadmap.md` (a D-024 artifact); `now.md` / `changelog.md` / `lessons.md` from D-024 are carried forward unchanged.
- D-008 and D-015's Cetana-coupled language (`cetana_request_input`, Issue-body brief) is reframed at the model level to "the escalation mechanism" and "the PR body"; those decisions stand, the tool is now named only as an example.
- Ratified 2026-06-04. `iterations/README.md` flipped draft → ratified. Lock: left NO deliberately — revisit after a cycle of real use.
- Build follow-ups (not part of this decision): neutral AEG scaffold + `aeg.sh`; the interactive AEG docs site (supersedes the static `diagrams/`); the dispatch gates as tooling.

---

## D-030 — AEG enhancements: provenance export, spec-conformance review, observe mode

**Date:** 2026-06-05
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** TL (competitive feature-mining pass, June 5, 2026 — ideas borrowed from Bitloops, Augment Intent, and Microsoft adoption guidance, mapped against AEG's invariants)
**Ratified by:** PENDING — Principal ratifies at a ratification window

**Context:** A market/competitive research pass over five adjacent clusters (parallel-agent runners, spec-driven development, AI-code audit/compliance, enterprise agent governance, plus the closest twin "Trail") found nothing occupying AEG's position — the combination of forge-derived status, orchestrator-independent protocol, and declared package-level conflicts with a principled refusal of dynamic scanning was not found elsewhere (an absence-of-evidence finding from secondary sources, not proof of originality). The pass surfaced three borrowable ideas that *strengthen* AEG's invariants rather than erode them. The test applied to every candidate: does it reinforce derived-status / declared-conflicts, or undermine them? These three pass; the rejected ideas fail it. This is a Type 1 change because it extends a model ratified one day prior (D-029), so the Principal ratifies; the TL records it PENDING.

**Decision:** Adopt three additions to the AEG model. None introduces stored status or a new persistent mutable artifact:

1. **Provenance block** (from Bitloops "Committed Checkpoints"). At close-out the Archivist assembles a provenance record — task → intent (the brief in the PR body) → code-review + security verdicts → model/agent (from the brief's `For:` line) → decision (Tier 3) → merge metadata — and posts it as a comment on the **merged** PR. Every field is copied from a fact the merge already froze; it is written once, append-only. It is a **projection of frozen forge facts**, exactly as derived status is a projection of live forge facts — therefore explicitly NOT the "stored status" forbidden by `iterations/README.md` §9: it lives on the merged PR (never the iteration file or Issue), records history (not current state), and is never updated. This makes AEG's audit-by-construction output legible and exportable (the regulated wedge — EU AI Act high-risk effective 2 Aug 2026; SLSA L3; NIST/SOC 2) at near-zero cost, because AEG already produces the facts. (`roles/archivist.md`; `state-machine.md` §2, §13.)

2. **Spec-conformance review** (from Augment Intent's Verifier). The code Reviewer additionally checks the diff against the `Product:`-named spec in `apps/*/specs/`, not only against the brief — a diff can satisfy its brief and still contradict or drift from the product's specced behavior. A spec **contradiction** is a BLOCKER; **drift** is a MAJOR finding; a correct diff against a stale spec is a `severity:strategy` escalation, not a failure. This adds **no new persistent artifact** — it reads the product spec that already exists, checked as-written at whatever ratification state it holds. (`roles/reviewer.md`; `state-machine.md` §3, §5.)

3. **Observe mode** (from Microsoft's "start with monitoring, not restriction"). A named read-only adoption tier: AEG runs advisory over a team's existing process — roles produce verdicts / topology / provenance but nothing blocks a merge, status is still derived (read-only), and verify-docs + the dispatch gates run report-only. It is the floor of the advisory → enforced gradient (`state-machine.md` §12); a team tightens one gate at a time. The on-ramp into teams already living in Jira/Linear, and the lowest-commitment way to obtain audit-by-construction provenance. (`aeg-manual-flow.md` §8; `state-machine.md` §12.)

**Alternatives rejected:**
- A new persistent per-iteration or per-task spec for the verifier to check against: rejected — a new mutable artifact would drift, reintroducing exactly the failure mode D-029 removed. Check against the product spec that already exists.
- Storing provenance as a status field, in the iteration file, or as a maintained/updated record: rejected — that is the forbidden stored status. Provenance is assembled once at close-out from frozen facts and posted to the merged PR, append-only.
- The broader market features — runner/orchestrator features (CI auto-fix loop, kanban boards, port allocation), the dynamic file-overlap conflict scanner the orchestrator crowd is chasing, spec-driven-dev tooling, and bolt-on compliance capture layers: rejected for the model. They are either tool-layer (Cetana / the AEG UI), already covered by existing mechanisms, or direct violations of the no-stored-status / no-dynamic-scanner invariants.

**Consequences:**
- `roles/reviewer.md` — spec-conformance check added (check #2); `SPEC CONFORMANCE` line in the verdict; contradiction = BLOCKER, drift = MAJOR, stale spec → strategy escalation.
- `roles/archivist.md` — provenance block assembled at close-out from frozen facts and posted to the merged PR (append-only); a missing required source is an INCOMPLETE finding, never fabricated.
- `aeg-manual-flow.md` — new §8 Observe mode; spec-conformance + provenance threaded into the run order and the per-role entry gates.
- `state-machine.md` — §2 (provenance as a Class 2 close-out projection + matrix row), §3 (Reviewer spec-conformance authority), §5 (Reviewer reads the spec as-written), §12 (observe mode as the advisory floor; provenance assembly as trusted discipline), §13 (provenance block append-only).
- All in PR on `feat/aeg-provenance-verifier-observe`, Tier 3, docs-only.
- On ratification: flip this entry PENDING → ACTIVE. All three additions are **trusted discipline** today (no new CI gate); automation is future work. The deeper "verify against a living spec" form of the verifier remains a future tool-layer item, not part of this decision.
- Noted as a backlog candidate, not decided here: a regulation → AEG-mechanism mapping doc (EU AI Act / SLSA / NIST / SOC 2) turning the provenance output into compliance evidence — the go-to-market lever the research flagged. Requires primary-source verification before action.

> **Status note (June 10):** the working copy of this decision was carried forward to ACTIVE with the spec-conformance check amended from BLOCKER to **advisory** (a stale/unratified spec must not veto correct code) on the `feat/aeg-provenance-verifier-observe` working branch. This main-branch entry retains the originally-merged PENDING/BLOCKER text for audit honesty; the advisory amendment + ratification are tracked on that branch and in the session record. Do not act on the BLOCKER wording — spec-conformance is advisory per the amendment.

---

## D-031 — Herald standalone: own Clerk, own DB, own keys

**Date:** 2026-06-05
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal
**Ratified by:** Principal

**Context:** Herald is a sibling product in AttaLabs (D-025). As BYOK and key storage (using `@atta/crypto` + `@atta/ui/account`) were added to the ecosystem, a question arose: should Herald share the Atta/Vāda Clerk app (`summary-ladybird-76`) and Neon DB, or maintain its own identity perimeter?

**Decision:** Herald remains a standalone product with its own Clerk app (`closing-blowfish-4`), own Neon DB, and own `user_provider_keys` table keyed by Herald Clerk IDs. Shared at the code level only — `@atta/ui/account`, `@atta/crypto`, `@atta/db/queries` are shared implementations; identity and data are not. No SSO across the Herald boundary; a key entered in Vāda does not carry to Herald. Uses the same `MASTER_ENCRYPTION_KEY` value as Vāda; separate DBs mean no shared ciphertext regardless.

**Alternatives rejected:**
- Fold Herald into the shared Clerk app (`summary-ladybird-76`): rejected. Herald's user base does not overlap Atta's, so shared login has no payoff; blast radius is cleaner with independent identity; avoids a Clerk migration while user counts are low.

**Consequences:** Herald keys, sessions, and profiles are isolated from Atta/Vāda at runtime. Reversal (folding into shared Clerk) requires migrating existing Herald identities and re-keying stored data; cost is lowest while Herald users are few.

---

## D-032 — Herald dual-mode: Candidate and Recruiter (Airbnb-style switch)

**Date:** 2026-06-05
**Status:** SUPERSEDED
**Superseded by:** D-034
**Type:** 1
**Lock:** NO
**Authored by:** Principal
**Ratified by:** Principal

**Context:** Herald's first build covers the candidate side only (profile, settings, forensic match audit). As recruiter value was explored, two structural options emerged: a separate recruiter product, or a single user who can switch modes — as Airbnb does with host/travel.

**Decision:** A single Herald user operates in two modes via a nav switch. Candidate mode: own profile, settings, UI, CV; routes under `/candidate/...`; public profile remains bare `/username`. Recruiter mode: stateless batch-audit tool — N CVs × M JDs → one report per pair; no saved history; no recruiter data model; no candidate search in the first cut. Mode is a view preference, not a permission — the same person can use both; last mode is remembered. Routing: `/candidate/...` and `/recruiter/...` trees with a nav toggle. Build not started; planned as a separate piece after `herald-profile-refactor` merges.

**Alternatives rejected:**
- Two separate user types (Candidate vs. Recruiter account): rejected. The same engineer may want to publish their own profile and also run batch audits; forcing a second account adds friction with no benefit.
- Two separate apps: rejected. Doubles hosting, auth, and UI surface area for what is one product with two views.

**Consequences:** A nav-level mode toggle is required. `/candidate/...` namespace is reserved; current `/admin/...` routes to be migrated when the recruiter mode is built. Recruiter mode has no data model on day one — stateless by design. Any persistent recruiter state (saved runs, shortlists) is a future decision.

---

## D-033 — Herald billing: one key per user, pays for their own surfaces

**Date:** 2026-06-05
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Principal
**Ratified by:** Principal

**Context:** With BYOK established across the ecosystem, Herald needs a billing model: who supplies the LLM key, and who pays for which operations — profile audits triggered by recruiters, and batch runs triggered by the recruiter themselves.

**Decision:** One provider key per Herald user (stored in `user_provider_keys`), used two ways. Profile audits (a recruiter auditing a published candidate profile) run on the profile owner's key — the owner pays for activity on their own published surface. Recruiter batch runs run on the logged-in recruiter's own key. Mechanism: same `getProviderKeys(db, clerkId)` → `decryptVendorKeys` path; only `clerkId` differs (owner for profile audits, recruiter for batch runs). Gating (Model B): publishing does not require a key; the audit tool renders only when a key exists; `/api/match` 503s without one. Owner sees a nudge to add a key; visitors see no audit tool.

**Alternatives rejected:**
- Platform-provided key (Herald pays per audit): rejected. Operational cost is unbounded without payment infrastructure; BYOK defers this entirely.
- Recruiter always pays regardless of which profile is audited: rejected. Creates an asymmetry where the recruiter subsidises the candidate's published-profile experience; "you pay for activity on your own stuff" is simpler and more defensible.

**Consequences:** Strangers running audits on a published profile spend the owner's key budget — a known abuse surface; may need a per-key rate limit or cap on profile audits later (parked). `getProviderKeys` is already implemented; only `clerkId` routing changes between the two modes. Gating logic (`/api/match` 503 without key) is already in place. (Note: the per-user key store is multi-vendor-capable but Herald's UI exposes Anthropic only today; making it multi-vendor + per-audit model choice is logged in `herald-backlog.md`, coupled to the engine migration. D-033 governs *whose* key, orthogonal to *which vendor*.)

---

## D-034 — Herald: one Bulk Audit operation (Candidate/Recruiter mode split retired)

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Supersedes:** D-032
**Authored by:** Principal (herald-profile-refactor, June 2026)
**Ratified by:** Principal

**Context:** D-032 split Herald into Candidate and Recruiter modes with an Airbnb-style nav switch and separate `/candidate/*` and `/recruiter/*` route trees. During the `herald-profile-refactor` build it became clear the two modes are the same function with different inputs: recruiter = many CVs × one JD; candidate = one CV × many JDs. A mode switch adds UI and routing surface for no functional difference.

**Decision:** Retire the mode split. Herald has **one audit operation — Bulk Audit**: N CVs × M job descriptions → one evidence-based match report per pair. The user chooses the inputs; there is no Candidate/Recruiter mode and no mode toggle. Inputs are polymorphic (pasted text, files, or a candidate's published Herald profile). The public profile remains a separate shareable surface at `/[username]`. The audit cross-checks claimed skills against public GitHub activity, grades the match, and extracts interview questions; no-GitHub is noted, not auto-penalized.

**Alternatives rejected:**
- Keep the two-mode switch (D-032): rejected — it is one function (CV×JD matching) wearing two costumes; the switch is pure surface area with no behavioral difference.
- A third "both" mode: rejected — there is only one operation; cardinality of inputs is a user choice, not a mode.

**Consequences:**
- `/candidate/*` and the reserved `/recruiter/*` trees are gone; replaced by flat routes (D-036).
- The landing page is rewritten around Bulk Audit (the old two-sided recruiter/candidate framing is dropped).
- `herald-backlog.md` rewritten; "Phase 3 — recruiter self-serve" framing retired.
- Endpoint unification (`/api/match` + `/api/recruiter/batch` → one `/api/audit` cell) and the N×M matrix UI are follow-ups, not part of this decision.
- Canonical structure doc: `apps/herald-ai/specs/herald-app-architecture.md`.

---

## D-035 — Herald library resolution: build-time CMS library for app chrome; user preference only on the public profile

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES
**Authored by:** Principal (herald-profile-refactor, June 2026)
**Ratified by:** Principal

**Context:** Herald has two UI-library resolution paths: (1) **build-time** — `@atta/ui/components`, aliased to `packages/ui/generated/herald/components.ts`, generated from `heraldConfig.userInterface.library.id`; and (2) **runtime** — `useComponents()` reading a `LibraryProvider`. During the refactor the `(app)` layout was wrapping the whole signed-in app in a `LibraryProvider` fed the *user's saved* library, so the topbar rendered the user's library while build-time-imported controls rendered the CMS library — they disagreed on screen. The product rule was being violated: the app chrome is a fixed design system, not user-configurable; only the user's own public profile is user-styled.

**Decision:** Lock the resolution rule:
- **App chrome** — topbar, Settings, /ui editor, Bulk Audit, everything under the `(app)` route group — renders the **build-time CMS library**. The `(app)` `LibraryProvider` is fed the build-time id, sourced from `getHeraldConfig(cmsClient).userInterface.library.id` (the same value the generator reads); `user.library` is ignored here.
- **The user's saved library (`user.library`)** applies **only** to their public `/[username]` profile, resolved dynamically via `EnvoyLibraryShell` → `LibraryProvider` → `useComponents()`.
- The two paths are independent: changing `user.library` must not change the app chrome.

**Alternatives rejected:**
- Feed the user's library to the whole app (the bug as-found): rejected — the app chrome is a fixed CMS-driven design system; only the public profile is user-styled.
- Move all app-chrome components onto `useComponents()` against a user-library provider (a fix attempted mid-refactor, reverted): rejected — wrong direction; it made the chrome track the user's preference, the opposite of the rule.
- Remove the `(app)` `LibraryProvider` entirely: considered; kept the provider but fed it the build-time id, because `useComponents()` consumers (the shared `TopBar`) need a provider to resolve against.

**Consequences:**
- `app/(app)/layout.tsx` sources `chromeLibrary` from `getHeraldConfig` and passes it to `CandidateShell`; documents the rule inline.
- `app/[username]/layout.tsx` (`EnvoyLibraryShell initialLibrary={userLibrary}`) is the only place `user.library` drives rendering.
- Lock: YES — this invariant was expensive to rediscover; crossing the two paths is a regression class. Captured in `herald-app-architecture.md` §4 with a verification recipe.
- Shared `@atta/ui` (`TopBar`, `LibraryProvider`, `useComponents`) was not changed; Vāda is unaffected (it uses `getVadaConfig` and its own generated index).

---

## D-036 — Herald: flat routes under an `(app)` group + one shared topbar

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Principal (herald-profile-refactor, June 2026)
**Ratified by:** Principal

**Context:** With the mode split retired (D-034), the `/candidate/*` route tree and its mode-specific framing no longer fit. The app also carried multiple topbar implementations (and a bespoke centered-identity topbar on the public profile that overlapped on desktop).

**Decision:**
- **Flat routes** under an `(app)` route group (no URL segment added): `/bulk-audit` (logged-in home), `/ui`, `/settings`, `/onboarding`. The `/candidate/*` tree is deleted. `/[username]` (public profile) keeps its own layout. Logged-in home is `/bulk-audit`. No "Dashboard" concept; nav is Bulk Audit · UI · Settings · /username.
- **One shared topbar** via `HeraldTopBar` (server component, SSR auth via `isSignedIn={!!userId}` — no sign-in/out flash), used by the `(app)` layout and marketing. No avatar in any topbar; identity lives in Settings → Account; sign-out is a themed `HeraldAccountMenu` button (not Clerk `UserButton`).
- **Public profile** uses a two-bar structure on all breakpoints: row 1 is the shared `TopBar`; row 2 is a sticky identity bar (avatar with pennant, name/title, CV download/open) beneath it. The bespoke desktop centered-identity column is removed.

**Alternatives rejected:**
- Keep `/candidate/*` and add `/recruiter/*`: rejected with the mode split (D-034).
- A bespoke per-page topbar on the public profile: rejected — it caused desktop overlap and drift; reusing the shared `TopBar` + a sticky identity bar is structurally stable.

**Consequences:**
- All `/candidate` references swept (middleware matchers, redirects, sign-in/up redirects, links). Onboarding gate relocated to `/onboarding`.
- `next.config.ts` gained worktree-root resolution; Vāda lazy-init DB proxy fix rode along.
- Shared `@atta/ui/topbar` `TopBar` gained optional `isSignedIn` / `accountMenu` props — backwards-compatible; Vāda unchanged.
- Canonical structure doc: `apps/herald-ai/specs/herald-app-architecture.md`.

---

## D-037 — Backlogs live in `specs/`; `project-management/` is flow + governance + living state

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (PM-structure consistency pass, June 10, 2026)
**Ratified by:** Principal (in-session)

**Context:** The question arose whether a unit's `project-management/` folder is "the AEG of that unit" and therefore whether the unit's *plan/backlog* should live inside it. Backlogs were inconsistently located: the ecosystem backlog sat at `docs/ecosystem-backlog.md` while per-product backlogs already sat at `apps/<product>/specs/<product>-backlog.md`. "Outside `project-management/`, but in two different outside places" was the real incoherence — not "inside vs outside."

**Decision:** A unit's **plan lives in its `specs/`**; a unit's **flow + governance + living state lives in its `project-management/`**. Concretely:
- Per-product plan → `apps/<product>/specs/<product>-backlog.md` (already there).
- Monorepo / ecosystem / AEG-itself plan → `specs/ecosystem-backlog.md` (new root-level `specs/`).
- `project-management/` holds the AEG model docs (constitution, flow, roles, iterations) and the unit's *living state* (`state.md`, `now.md`, `changelog.md`, `decisions.md`, `lessons.md`, `ratification-queue.md`) — **never the backlog**.

This keeps the backlog deliberately **out of the flow** (a load-bearing AEG choice, D-029 / `iterations/README.md` §2) by making the out-of-flow boundary a *folder* boundary: an agent operating the flow opens `project-management/` and cannot trip over the plan, because the plan is in `specs/`.

**Alternatives rejected:**
- Move the backlog *into* `project-management/` (folder = the unit's whole operating model, plan included): rejected — `project-management/` is the flow's home, and the flow's core discipline is "planning metadata never enters execution artifacts" (anti-regression rule #3). Putting the plan in the flow's own folder weakens the strongest physical guarantee of that line, to buy a tidier mental model. The seam being a folder boundary is a feature, not a bug.
- Leave it as-is (ecosystem backlog in `docs/`, product backlogs in `specs/`): rejected — the inconsistency itself is the problem; "the plan lives in `specs/`" must hold uniformly or it's not a rule.

**Consequences:**
- `docs/ecosystem-backlog.md` → `specs/ecosystem-backlog.md` (moved; old file deleted). New root-level `specs/` directory created.
- `coordination.md` (frequent-files paragraph, "when the plan changes" list, "what goes where" table, + a new anti-pattern) and `state.md` ("Where the plan lives", Doc-system) repointed to `specs/ecosystem-backlog.md` and state the convention.
- The dead `plan.md` redirect stub (a D-024 artifact, retention window ~Aug 2026) was removed early, since all references had been repointed.
- Per-product backlogs were already compliant; no per-product moves needed.
- Reversible (Type 1 for the doc-system-layout blast radius, not for irreversibility); a future `aeg.sh` scaffolder should encode this convention when it creates a unit.

---

## D-038 — AEG the product gets its own folder (`apps/aeg`); orchestrator-independence made structural

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (product-structure pass, June 10, 2026)
**Ratified by:** Principal (in-session)

**Context:** AEG is two things sharing one name: **the model** (the governance/flow constitution, correctly living at repo-root `project-management/` because it governs the whole monorepo) and **the product** (a deployed UI that visualizes a repo's AEG execution, plus the `aeg.sh` adoption scaffolder). The product had no folder — its UI write-up lived in `specs/ecosystem-backlog.md` and it was absent from the product registry — so when scanning `apps/`, the headline product was invisible while supporting tools (Cetana) had folders. Separately, the Principal asked whether Cetana should live *inside* the AEG folder, since the two are related. That would invert the model's core invariant.

**Decision:** Two parts.

1. **Scaffold `apps/aeg/` as a first-class product**, mirroring the Vāda/Herald shape: `apps/aeg/specs/` (`aeg-app-architecture.md`, `aeg-backlog.md`, `aeg-decisions.md`) + `apps/aeg/project-management/` (`state.md`, `now.md`) per D-037. The product is the UI (`apps/aeg/web` → `aeg.attalabs.dev`, flat routes under `(app)`, DAG via `@atta/ui/engine-flow`) **plus** the `aeg.sh` neutral scaffolder (a former D-029 build follow-up, which lays down the AEG structure in any repo and creates a specified unit's folders per D-037). Registered in `products.md` as `aeg`. The AEG-UI write-up moved out of the ecosystem backlog (which now scopes to AEG-the-*model* build-out). `apps/aeg` carries no `-ai` suffix (meta/infra-app convention, like `apps/attalabs`, `apps/desktop`). The product is the designated first real iteration; it dogfoods the flow by visualizing it.

2. **Cetana stays a sibling at `apps/cetana-ai/`; it is NOT moved inside `apps/aeg/`.** AEG is forge-native and orchestrator-independent (D-029): it must run by hand, on any repo, with zero orchestration tooling. **Cetana knows AEG; AEG does not know Cetana.** Folder containment would assert "AEG contains its orchestrator," re-coupling exactly what D-029 decoupled. The relationship is "Cetana is one tool that speaks AEG," expressed by: (a) sibling folders, and (b) the AEG UI *rendering* an orchestrator's activity read-only as forge facts (the UI reads the forge; Cetana writes to the forge) — never by containment. If the two are ever shipped together (e.g. both inside AttaLabs Desktop, whose specs already name AEG as the strongest fit), that is a *distribution* decision, not a source-tree nesting decision: bundle at the distribution layer, never the folder layer.

**Alternatives rejected:**
- Rename Cetana to AEG / treat Cetana as the AEG product: rejected — they are different things; Cetana automates one slice (dispatch/escalation), the product visualizes the whole model. Collapsing them destroys the model's central distinction.
- Put Cetana inside `apps/aeg/` as a sub-product: rejected — it makes AEG depend on (or appear to contain) its orchestrator, a direct reversal of D-029's orchestrator-independence. The strongest expression of "AEG does not know Cetana" is that Cetana is not in AEG's tree.
- Leave AEG-the-product folderless until build starts: rejected — a headline, specced product being invisible in `apps/` and absent from the registry is the exact incoherence that prompted this. A spec-only scaffold (like `apps/desktop`) gives it a home without requiring code.

**Consequences:**
- New: `apps/aeg/specs/{aeg-app-architecture,aeg-backlog,aeg-decisions}.md`, `apps/aeg/project-management/{state,now}.md`.
- `products.md` — `aeg` registry row added + a note recording the product/model distinction and the Cetana-independence boundary.
- `specs/ecosystem-backlog.md` — AEG-UI write-up replaced with a pointer to `apps/aeg/specs/aeg-backlog.md`; the file now scopes to AEG-the-model build-out + the spec-integrity chain + infra.
- The orchestrator-independence boundary is now structural (a folder boundary), not just prose in D-029 — recorded in `aeg-app-architecture.md`, `apps/aeg/project-management/state.md`, and `products.md` so it is not re-litigated.
- Reversible in principle, but the Cetana-independence half is a restatement/hardening of D-029's core and should be treated as load-bearing.
- `apps/aeg/web` does not exist yet; building it is the designated first iteration (`apps/aeg/specs/aeg-backlog.md`).

---

## D-039 — Skills are part of the flow: canonical home in `project-management/skills/`, `.claude/skills/` is a generated view

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (skills-as-flow pass, June 10, 2026)
**Ratified by:** Principal (in-session)

**Context:** Building the AEG front door (the `aeg` and `aeg-roles` skills) raised where skills should live. Today skills live at `.claude/skills/` (D-011's placement). The Principal's concern: the flow must be **self-contained** — everything the flow needs to operate should travel with the unit, so that (a) a unit is legible and resilient as a whole, (b) `aeg.sh` can scaffold a complete working unit, and (c) someone who doesn't understand a far-off `.claude/` directory can't orphan load-bearing skills by deleting it. The counter-fact: the Claude Code / agent harness **loads** skills from `.claude/skills/` — a `SKILL.md` elsewhere is just markdown nothing auto-loads. Putting skills *only* in `project-management/` would break loadability; putting them *only* in `.claude/` leaves the flow not self-contained. Both pure positions are wrong.

**Decision:** Skills are **part of the flow**, and their **canonical source of truth is `project-management/skills/`** (self-contained, travels with the unit, scaffolded by `aeg.sh`, can't be orphaned by `.claude/` cleanup). The harness location **`.claude/skills/` becomes a generated/derived view** of them (copy or symlink), rebuilt by a generate step (and by `aeg.sh` on scaffold). Source → derived, single direction, exactly like `@atta/ui`'s canonical components vs. its generated per-product index (`packages/ui/generated/`). Delete `.claude/skills/` and the generate step (or `aeg.sh`) rebuilds it from the canonical skills — strictly more resilient than today. This supersedes **D-011's placement** ("`.claude/skills/` is canonical"); D-011's *principle* (skills are contextually loaded, not always-on PM prose) is unchanged — only the source-of-truth location moves. Corollaries: (a) each role doc **names the skills it loads** as part of its entry gate (the role doc holds the *pointer*; the skill holds the *content* — no duplication); (b) `aeg.sh` scaffolds the neutral AEG skills (`aeg`, `aeg-roles`) into a new unit alongside the folder structure.

**Scope clarification (which skills are "part of the flow"):** only the **AEG/flow skills** are model skills whose canonical home is `project-management/skills/` — concretely `aeg`, `aeg-roles`, `brief-authoring` (and, when written, any future flow skill). The repo's **domain skills** (`vada-*`, `ui-*`, `atta-engine`, `herald-engine`, `database`, `auth`, `cetana-coordinator`, `monorepo-structure`, etc.) are this-repo instance knowledge, NOT part of the neutral model, and stay at `.claude/skills/` — they must not travel via `aeg.sh` (moving them would re-contaminate the model with Atta-specific content). The move is the flow skills only.

**Alternatives rejected:**
- Keep `.claude/skills/` canonical (status quo, D-011): rejected — it leaves the flow not self-contained; skills live outside the unit and can be orphaned, and `aeg.sh` couldn't lay down a complete working unit.
- Move skills *only* into `project-management/skills/`, no `.claude/` presence: rejected — breaks the harness's load mechanism; a `SKILL.md` the runtime can't find isn't a skill, it's a doc. Loses the "every agent always has this" property.
- Copy skill *content* into each role doc so roles are self-contained: rejected — duplicates the skill, recreating the drift hazard the whole model fights. Role docs name skills; they don't inline them.
- Move *all* skills (including domain skills) into the unit: rejected — domain skills are repo-instance knowledge, not the neutral model; moving them re-contaminates AEG. Only flow skills move (see scope clarification).

**Consequences:**
- Canonical skills move `.claude/skills/*` → `project-management/skills/*` (flow skills only); `.claude/skills/` is regenerated from them by a generate step (mechanism TBD in the implementing iteration — copy vs. symlink, and where the generate step runs, are implementation details for that iteration).
- Each `roles/*.md` entry gate gains a "skills to load" line (this is part of the existing ecosystem-backlog item "wire entry gates into the role docs").
- `aeg.sh` (specced in `apps/aeg/specs/aeg-backlog.md`) gains: scaffold the AEG skills into a new unit, and a `generate-skills` subcommand to rebuild the harness view.
- `docs-index.md` and any path references to `.claude/skills/` are updated when the move lands.
- **Execution status:** the AEG flow skills (`aeg`, `aeg-roles`, `brief-authoring`) were physically moved to `project-management/skills/` and removed from `.claude/skills/` on 2026-06-10 — see **D-040**, which records the executed move. The generate-step mechanism (copy vs. symlink) and the role-doc "skills to load" lines remain follow-ups.
- Reversible (Type 1 for the cross-cutting layout blast radius, not for irreversibility).

---

## D-040 — D-039 executed: AEG flow skills physically relocated to `project-management/skills/`

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (AEG neutralization + self-containment pass, June 10, 2026)
**Ratified by:** Principal (in-session)

**Context:** D-039 decided the AEG flow skills' canonical home is `project-management/skills/`, but recorded itself as "not yet executed" — the skills still physically lived at `.claude/skills/`. The Principal directed that the AEG self-containment work be made real in this pass, not left logged-for-later, since the docs had begun describing a target state (`project-management/skills/` canonical) that did not exist on disk. This entry records the execution of D-039 (it does not change the D-039 decision; it reports that it was carried out).

**Decision:** Execute D-039 for the AEG flow skills. Concretely, on branch `task/aeg-neutralize/1`:
- Created the canonical copies at `project-management/skills/aeg/SKILL.md`, `project-management/skills/aeg-roles/SKILL.md`, and `project-management/skills/brief-authoring/SKILL.md`, each carrying a canonical-source header marking `.claude/skills/<name>` as a generated view.
- Deleted the three originals from `.claude/skills/` (`aeg`, `aeg-roles`, `brief-authoring`).
- `brief-authoring` was additionally neutralized in the same move (de-vendored: coding-agent not Claude Code, forge Issue not GitHub Issue, config-security scan not AgentShield, capability tiers not Opus/Sonnet/Haiku, "the Principal by default" not "always Dani").
- Per D-039's scope clarification, **only the three flow skills moved.** All domain skills (`vada-*`, `ui-*`, `atta-engine`, `herald-engine`, `database`, `auth`, `cetana-coordinator`, `monorepo-structure`, `model-picker`, `executor-protocol`, `code-style`, `git-commits`) remain at `.claude/skills/` — they are repo-instance knowledge, not the neutral model.

**Alternatives rejected:**
- Keep deferring (leave skills at `.claude/skills/`, docs describing the target): rejected by the Principal — it leaves the docs describing a state that doesn't exist.
- Also move the domain skills now: rejected — out of scope and contrary to D-039's scope clarification; domain skills are not part of the neutral model.

**Consequences:**
- `.claude/skills/{aeg,aeg-roles,brief-authoring}` no longer exist on the branch; canonical versions live at `project-management/skills/`. The AEG flow skills are now searched inside the unit, as intended.
- Follow-up (not blocking): the `generate-skills` step that rebuilds the `.claude/` harness view from `project-management/skills/` is specced but not yet built (`apps/aeg/specs/aeg-backlog.md`, `aeg generate-skills`). When wanted, it regenerates the `.claude/` view from the canonical source.
- `docs-index.md` regeneration (`bun docs:index`) pending after merge.
- Role-doc "skills to load" entry-gate lines remain a follow-up (per D-039).
- Part of PR #86 (`task/aeg-neutralize/1`), Tier 3, docs-only.

---

## D-041 — AEG layout: `aeg-root/` (model) + `aeg-project/` (state); "product"→"project"; orient from root

**Date:** 2026-06-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Supersedes:** (naming portions of D-024, D-037, D-038 — the `project-management/` folder name and the "product" unit-vocabulary; the substantive decisions in those entries stand)
**Authored by:** TL (AEG self-containment + naming pass, June 10, 2026)
**Ratified by:** Principal (in-session)

**Context:** `project-management/` is a generic name an agent pattern-matches to "miscellaneous notes," obscuring that the folder is load-bearing machinery; and it mixed the AEG *model* (which exists once) with *living state* (which is per-unit). Separately, "product" implied every governed unit is customer-facing, but AEG governs *development* — the unit is a developable thing (app, package, library), most of which are not products.

**Decision:**
1. Root `project-management/` splits into two top-level folders: **`aeg-root/`** = the model (constitution, flow, roles, skills, the registry `projects.md`), existing **once, at the repo root only**; and **`aeg-project/`** = the root unit's living state (`state.md`, `now.md`, `decisions.md`, `changelog.md`, `lessons.md`, `ratification-queue.md`).
2. Every per-unit `apps/*/project-management/` (and any `packages/*/`) → **`apps/*/aeg-project/`** — state only, never the model.
3. **"Product" is erased from AEG; the unit is a "project."** `products.md`→`projects.md`; the `Product:` brief field→`Project:`; `aeg.sh add-product`→`add-project`; all "per-product/multi-product/cross-product/product registry/product backlog" → project equivalents. Real commercial product names (Atta, Vāda, Herald, …) and the brand/instance content in `coordination.md` are unaffected — those are genuine products and repo-instance content, not the AEG model.
4. **Orientation rule:** any agent, any task, any project orients from the root `aeg-root/` (the only model); it updates the root `aeg-project/` (global governance: decisions, changelog) plus each touched project's `aeg-project/` slice. An `aeg-project/` folder holds state only, which forces every agent to `aeg-root/` for the model.

**Alternatives rejected:**
- Keep `project-management/`: rejected — generic, and it conflates model with state.
- Name the model folder `aeg/` (bare): rejected — opaque; `aeg-root/` says "the root of the AEG system," and the `aeg-` prefix ties it to `aeg-project/`.
- Keep "product" as the unit: rejected — AEG governs development, not commerce; most governed units are not products.
- Move the model into each unit: rejected — the model exists once; per-unit folders hold state only, which is what makes "orient from root" physically true.

**Consequences:**
- Root `project-management/` no longer exists; `aeg-root/` + `aeg-project/` replace it; per-unit folders renamed to `aeg-project/`.
- `aeg.sh`: `init` scaffolds root `aeg-root/` + `aeg-project/`; `add-project` scaffolds `apps/<x>/aeg-project/`.
- Orientation rule added to `coordination.md` + `state-machine.md`.
- `docs-index.md` regenerated; all path references re-pointed.
- Part of PR #86, Tier 3, docs/structure only. One commit (revertible).
- Reversible (Type 1 for blast radius, not irreversibility).

---

## D-042 — Planner-discipline upgrade + role-seam contracts (F1–F6)

**Date:** 2026-06-11
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (the herald-onto-engine planning session, run as a deliberate "special planner" prototype, June 11, 2026)
**Ratified by:** Principal (in-session)

**Context:** The first real iteration (`herald-onto-engine`) was planned as a deliberate prototype to discover where the AEG planning/brief model is thin. Running the planner pass for real surfaced six findings (logged live in `specs/aeg-improvement-findings.md` as F1–F6) and one structural idea (role-seam contracts). The Principal's governing theory drove the session: prompt-writing is the key act of controlling AI, governance must govern, and the more detail and clarity in the model docs, the more identically every agent behaves — so findings were written **into the model in real time**, not parked as candidates. This entry consolidates that batch into one decision for the ratification trail; the detailed prose lives in the target docs.

**Decision:** Adopt the following as permanent model rules (all already written into the named docs):

1. **Planner digs deep to size (F2).** The Planner must perform deep per-task technical analysis (read the actual code) before emitting a task list; a plan made without it is malformed and refused. A task must pass four "too big?" tests — one verification story, one agent can hold it, bounded file surface, single failure mode — or be split. (`aeg-root/roles/planner.md`.)

2. **The Planner's rationale is mandatory and persisted (F1).** Every task carries a `Planner's rationale` block (in the Issue body and the iteration file) with required fields: Boundary, Sizing, Project(s)+blast radius, Dependency rationale, Traps to avoid, Suggested agent-class, Stop-and-escalate. Durable conclusions are persisted; perishable detail (signatures, file lists) is left to the just-in-time brief. (`aeg-root/roles/planner.md`.)

3. **Shared-package change pulls all consumers into scope (F5).** A task that changes a shared package lists every consumer of it in `Project(s)` (so the Reviewer verifies them), even when the consumer's app code isn't edited. A backlog's sizing/scope hints are inputs, not facts — the code dig overrides them. (`aeg-root/roles/planner.md`.)

4. **Agent-class at plan time, model pick at brief time (F4).** The Planner suggests the agent-class as part of sizing; the Brief Author confirms the final model pick at dispatch with a mandatory `For:`/`Reason:` justification. (`aeg-root/roles/planner.md` + `aeg-root/skills/brief-authoring/SKILL.md`.)

5. **Brief enrichment (F3).** `brief-authoring` mandates: start from the Planner's rationale (not a blank page); a Technical Dependencies section; a Technical Surface Map; agent/model-with-reasoning; blast-radius consumer re-verification. (`aeg-root/skills/brief-authoring/SKILL.md`.)

6. **Iteration naming convention (F6).** Name an iteration after its center-of-gravity / shared-infra work, not its narrowest downstream feature; a name must not imply narrower scope than `Project(s)`. (`aeg-root/iterations/README.md` §4 + `aeg-root/roles/planner.md`.)

7. **Planner readiness gate.** Before planning a single task, the Planner verifies all inputs are present and reachable (clear bounded intent, reachable specs, readable code, inspectable shared substrate + enumerable consumers, known locked decisions, registry resolves, ambiguities surfaced to the Principal not assumed) and states the readiness check explicitly; it refuses to start on a missing input. The planner does not start work it cannot finish well. (`aeg-root/roles/planner.md`.)

8. **Role-seam contracts (new artifact type).** What crosses a role boundary is defined **once**, in a contract under `aeg-root/contracts/`, not described twice in two role docs (which drift). A contract is the single source of truth for its seam: the producer fills it, the consumer drains it, the two role docs point at it. A contract is a Class 1 artifact that changes **as a unit** (producer + consumer sides together, Tier 3). The first is `aeg-root/contracts/planner-brief.md` (Planner produces the rationale; Brief Author consumes it field-by-field). (`aeg-root/contracts/planner-brief.md` + `state-machine.md` §1, §2, §3, §9, §12.)

**Alternatives rejected:**
- Park F1–F6 as candidates and ratify later: rejected by the Principal — governance must govern; detail written into the model in real time makes every agent behave more identically, which is the point. The findings log records history; the model docs carry the rules.
- Make the Planner output the brief (a "richer plan"): rejected — the seam is correct; the Planner persists durable conclusions, the Brief Author adds perishable detail just-in-time. Both do a full deep pass; only purpose and what-persists differ.
- Keep describing each role seam inside the two role docs: rejected — that is the drift hazard the contract removes (the planner→brief seam had already drifted; the brief side was missing two rationale fields). One contract, one source of truth.

**Consequences:**
- `aeg-root/roles/planner.md` — readiness gate; deep-dig sizing + the four tests; shared-package blast-radius rule; backlog-hints-are-inputs rule; mandatory Planner's rationale with required fields; agent-class vs model-pick; producer side of the planner-brief contract.
- `aeg-root/skills/brief-authoring/SKILL.md` — consumer side of the planner-brief contract (field-by-field mapping); Technical Dependencies + Technical Surface Map + agent-with-reasoning required sections; blast-radius re-verification.
- `aeg-root/contracts/planner-brief.md` — new; the first role-seam contract.
- `aeg-root/iterations/README.md` — §4 naming convention.
- `aeg-root/state-machine.md` — contracts as Class 1 (§2, change-as-a-unit), matrix row (§3), Tier 3 trigger (§9), trusted-discipline contract-conformance (§12), seam concept (§1).
- `specs/aeg-improvement-findings.md` — F1/F2/F4/F5/F6 marked WRITTEN INTO MODEL; F3 closed; the running log retained as history.
- Prototyped by the `herald-onto-engine` iteration (`aeg-root/iterations/herald-onto-engine.md`), whose tasks already carry the rationale shape.
- Lock: NO — these are first-use rules; revisit after the iteration executes and we see whether the rationale actually sharpened the briefs. Other role-seam contracts (`brief-developer`, `developer-reviewer`, …) are migrated to the contract pattern as each seam is modeled in future iterations.
- Type 1 for the cross-cutting governance blast radius (it changes how every plan and brief is produced + adds an artifact class), not for irreversibility.

---

## D-043 — Session-2 AEG model additions: label vocabulary, iteration lifecycle + concurrency, conversational protocol

**Date:** 2026-06-12
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** TL (AEG-UI scoping + model-hardening session, June 12, 2026 — the session that planned `aeg-ui-v1` and surfaced these gaps by running the model for real)
**Ratified by:** Principal (in-session)

**Context:** The June 12 session planned the second real iteration (`aeg-ui-v1`, AEG Studio) and, in doing so, exercised the model hard enough to surface several gaps that D-042 had not covered. Per the Principal's standing theory (governance must govern; write findings into the model in real time so every agent behaves identically), each gap was written into the model as it was found, rather than parked. This entry consolidates that second batch into one decision for the ratification trail; the detailed prose lives in the named docs. (The two-product split that the same session produced — AEG Studio local + AEG Portal public over `@atta/aeg-core` — is logged separately in the AEG-product log as **AEG-product D-001**, because it is product-scoped, not model-scoped. This entry cross-references it but does not restate it.)

**Decision:** Adopt the following as permanent model additions (all already written into the named docs):

1. **Label vocabulary consolidated and closed (`state-machine.md` §14).** The label system now has a single source of truth: a **closed set** — `tier:{0,1,3}`, `aeg:blocked`, `needs:{execution,strategy,principal}-input`, `needs:brief-correction`, `override:docs` — and no label outside it may be applied (the Archivist drift cron flags out-of-vocabulary labels). Governing principle: **a label only exists where the forge can't say it natively** (status is derived, never labeled). Mandatory has two shapes: **always-mandatory** (`tier:*`, exactly one per task) and **conditional-mandatory** (present-when-true AND removed-when-false — a stale `needs:*` is as much a violation as a missing one; a conditional label is a live signal, not a sticker). The only optional label is `override:docs` (the escape hatch). Two easy-to-get-wrong rules are fixed: **project is a field, not a label** (the `Project:` field resolves against `projects.md`; never a label); and **tier is a field *and* a synced label, and the field wins** (the PR-body `Tier:` is the source of truth that `verify-docs` reads; the `tier:*` label is a mandatory scannable projection; the Planner sets the label at cut as a plan-time estimate, the field is binding at merge, and on disagreement the field is right and the label is corrected). D-008's three `needs:*` severities are folded into this vocabulary (cross-referenced there).

2. **Iteration lifecycle + cross-iteration concurrency (`iterations/README.md` §11).** An iteration has a defined life: **planned → active → complete → archived.** "Complete" is derived from the forge (all linked PRs merged); at that point the **Archivist** sets a single `Lifecycle: complete` marker (the one lifecycle mutation the file takes after plan time — explicitly NOT the forbidden stored execution status, because it is the iteration's own lifecycle, which the forge has no native fact for) and **moves the file to `aeg-root/iterations/completed/<name>.md`**. Completed iterations are **never deleted** — the Planner's rationale is durable forensic history (the whole reason the rationale is mandatory, D-042); `completed/` is an archive, not a graveyard. **Concurrency:** there is no hard cap on simultaneously-active iterations. The real limits are two — (a) the **conflict rule binds across concurrent iterations** (a collision domain is global; two iterations touching the same package must serialize across the iteration boundary exactly as siblings do; the cleanest concurrency is between disjoint iterations that share no package), and (b) **Principal attention**. The second concurrent iteration's readiness gate must check the active iterations' collision domains and either confirm disjointness or declare the cross-iteration serialization.

3. **Conversational protocol as a shared model concept (`aeg-manual-flow.md` §4.5) + Planner specialization (`roles/planner.md`).** Legibility is a governance property — a flow that runs silently is ungovernable. So every conversational role follows a shared protocol spine: announce the role on entry; name the stages and always say which one you're in; narrate the load-bearing reads and the conclusions they produce; move little-by-little and confirm before proceeding; reflect back before committing anything durable; **signal stage completion clearly every time** (especially the final "this stage is done, here's what's next, here's whose move it is"); and be clear about durability — everything committed is on the repo/forge and permanent, and a `Lock: NO` decision is as committed as a `Lock: YES` one (the lock flag governs future editability, not existence), so a recorded conclusion is never mistaken for "unsaved." The protocol is documented once as the shared spine and specialized per role; the **Planner's specialization is written** (the first), with Brief Author / Developer / Reviewer specializations as future work. Kept light — signposting, not verbosity.

**Alternatives rejected:**
- Leave the label rules scattered across §2/§3/§7/§9 and D-008/D-029: rejected — without a single closed-set source of truth, label drift (out-of-vocabulary labels, stale `needs:*`, a `project:` label competing with the field) is inevitable. One section, one vocabulary.
- Allow iteration files to be deleted on completion (or leave lifecycle undefined): rejected — the rationale is durable forensic history; deleting it throws away the most valuable thing the Planner produced. Archive, never delete.
- Put the conversational protocol only in `roles/planner.md`: rejected by the Principal — it is a model-wide property that every conversational role should share; burying it in one role doc means the others never inherit it. Document the spine once at the model level; specialize per role.
- Park these as candidates and ratify later: rejected — same standing reason as D-042; governance must govern, and writing the findings into the model in real time is what makes agents behave identically.

**Consequences:**
- `aeg-root/state-machine.md` — new §14 Label Vocabulary; §2 (Class 2 + matrix label row), §7, §9, §12 threaded to point at it; D-008 gains a cross-reference note.
- `aeg-root/iterations/README.md` — new §11 Iteration lifecycle + concurrency (pitch renumbered to §12); §4/§5/§6/§8/§9 threaded (the lifecycle marker named as the one exception to "no execution metadata," the cross-iteration conflict rule, the readiness-gate concurrency check).
- `aeg-root/aeg-manual-flow.md` — new §4.5 Conversational protocol (shared spine); §5/§6 threaded.
- `aeg-root/roles/planner.md` — the Planner's conversational-protocol specialization (announce role, name stages, narrate, little-by-little, reflect back, signal completion, durability clarity).
- Cross-reference: **AEG-product D-001** (AEG is two products — Studio local + Portal public — over shared `@atta/aeg-core`; resolves OQ-aeg-3 local-first) was logged in `apps/aeg/specs/aeg-decisions.md` in the same session; the `aeg-ui-v1` iteration (`aeg-root/iterations/aeg-ui-v1.md`, Issues #94–#101) prototypes both this entry's §11 concurrency rules (it runs concurrent with `herald-onto-engine`) and the conversational protocol.
- Lock: NO — first-use rules; revisit after the iterations execute. Type 1 for the cross-cutting governance blast radius (it changes the label system, the iteration lifecycle, and how every conversational role communicates), not for irreversibility.

---

## D-044 — Herald auditor migrated onto `@atta/engine` via a solo YAML

**Date:** 2026-06-13
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (`herald-onto-engine` iteration, task 1, #88)
**Ratified by:** Principal

**Context:** Herald's forensic match audit (`POST /api/match`) called `generateText()` from `@ai-sdk/anthropic` directly, with the Skeptical Auditor system prompt living as a TypeScript constant (`SKEPTICAL_AUDITOR_PROMPT` in `apps/herald-ai/web/src/lib/prompts.ts`) and the model id hardcoded at the call site. Vāda already runs every agent — across 12 vendors — through the shared `@atta/engine` + `@atta/adapter-langgraph` substrate by loading a YAML flow and compiling it to a Plan. Herald was the only product still running a bespoke per-app LLM call, which meant the engine's vendor-agnostic text path, classifier behaviour, and Plan lifecycle were not available to Herald and any future cross-cutting engine improvement bypassed Herald by construction. The `herald-onto-engine` iteration's task 1 (issue #88) is the wave-1 lead that puts Herald on the same substrate.

**Decision:** The auditor LLM call goes through `@atta/engine` via a single-agent solo flow YAML. Specifics:

1. **Agent lives in the YAML.** `apps/herald-ai/web/yamls/herald-auditor.yaml` is the single source of truth for the auditor's `system_prompt`, `model` (`claude-sonnet-4-20250514`), `max_tokens`, classifier behaviour (`classifier.mode: skip` — no Haiku classifier overhead for a single-shot audit), and message template (`{{question}}`). The Skeptical Auditor prompt body was lifted verbatim into the YAML.
2. **Schema-as-parse-contract via `{{schema}}`.** `MATCH_REPORT_SCHEMA` stays in `prompts.ts` because it is also the shape the parser validates against. It is passed to `compileFlow(flow, userPrompt, undefined, { schema: MATCH_REPORT_SCHEMA })` as a customVar, and `{{schema}}` in the YAML's `system_prompt` is substituted at compile time. One schema definition; the model-instruction and the parser are guaranteed to agree.
3. **Engine consumed, not modified.** No file under `packages/engine` or `packages/adapter-langgraph` is changed. `git diff main --stat` on either package is empty — which means no Vāda blast radius by construction. The hosted route reads the YAML once at module load (cached) and calls `LangGraphAdapter.execute({ plan })` with `providerKeys: { anthropic: apiKey }`.
4. **Herald-owned glue stays in Herald.** Signal pre-fetch (`extractSignals`, 3s timeout), the 24h in-memory cache, the 2-attempt/25s wrapper, `parseMatchReport` and its code-enforced NO-FIT hard-requirement gate, and `buildPartialReport` fallback are unchanged. The hard gate is deliberately a code gate, not a model gate — it must never become model-controlled.
5. **Vendor-agnostic by construction.** The engine already runs any vendor that has a registered prefix as a text completion. Herald gets JSON by prompt instruction, exactly the way Vāda does. No structured-output / `outputSchema` is involved on the engine side — the model returns text, Herald parses it. (This is what made the originally scoped engine-side JSON-mode work, task 3a / #87, unnecessary.)

**Alternatives rejected:**
- Add Herald-specific engine support (e.g. an engine-side `outputSchema` JSON mode for the auditor) — rejected as the brief was re-scoped: the engine already runs any vendor's text path, and prompt-instruction JSON is identical to how Vāda gets structured output. No engine change needed. (Brief #88 was sharpened to drop that scope; #87 was closed not-planned.)
- Leave the auditor as a direct `generateText` call — rejected: blocks Herald from inheriting future engine improvements (cognitive router, multi-vendor failover, transcript tracing, cost tracking).
- Keep `SKEPTICAL_AUDITOR_PROMPT` deleted from `prompts.ts` per the original brief — partially rejected on a conflict with the brief's "do not touch `/api/recruiter/batch`" boundary (batch still imports the constant). The constant is preserved with a TODO comment until task 2 migrates batch onto the engine and the constant can be deleted then.
- Move agent tools (the GitHub signal fetcher) into the YAML in this task — explicitly deferred to task 7 (#102). Task 1 keeps `extractSignals` as a pre-fetch in Herald code; task 7 will retire it by giving the auditor agent a GitHub tool declared in the YAML.

**Consequences:**
- `apps/herald-ai/web/yamls/herald-auditor.yaml` — new; canonical source for the auditor prompt + model + message template.
- `apps/herald-ai/web/src/app/api/match/route.ts` — replaces the `generateText` race body with `loadFlow → compileFlow → LangGraphAdapter.execute`, preserving the 2-attempt retry / 25s timeout / partial-report fallback contract verbatim. `Conclusion.terminalState === 'FAILED'` is treated as an attempt failure (continue retry loop) rather than thrown, since the engine never throws for LLM failures.
- `apps/herald-ai/web/src/lib/prompts.ts` — schema comment refreshed; `SKEPTICAL_AUDITOR_PROMPT` retained (with TODO) until batch migrates.
- `apps/herald-ai/web/package.json` — adds `@atta/engine` + `@atta/adapter-langgraph` workspace deps.
- `apps/herald-ai/web/next.config.ts` — `transpilePackages` extended with both packages; `outputFileTracingIncludes` traces `./yamls/**` into the deployed function (Vāda's pattern, scoped to Herald's local `yamls/` dir).
- `apps/herald-ai/web/tests/herald-auditor-yaml.test.ts` — verifies the YAML loads as a v2.0 flow, compiles to a solo Plan (entry/exit node = `solo`), substitutes `{{schema}}` at compileFlow time, and uses `{{question}}` as the message template.
- `apps/herald-ai/specs/herald-app-architecture.md` — the audit-flow section now states that the auditor LLM call runs through the engine via the YAML.
- `apps/herald-ai/specs/herald-backlog.md` — engine-migration item closed; task 7 (#102) referenced as the next step that retires `extractSignals` by moving signal-gathering into the agent's YAML-declared tools.
- Lock: NO — first migration of Herald onto the shared engine; revisit once the auditor has been observed in production and after task 2 (batch route) and task 7 (auditor tools) lands. Type 1 because it replaces a core call path and establishes the pattern other Herald LLM call sites will follow.

---

## D-045 — Herald endpoints unified into `/api/audit`; batch on `@atta/engine`; `SKEPTICAL_AUDITOR_PROMPT` deleted

**Date:** 2026-06-14
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (`herald-onto-engine` iteration, task 2, #89)
**Ratified by:** Principal

**Context:** D-044 put `/api/match` on `@atta/engine` via the solo `herald-auditor.yaml`, but left `/api/recruiter/batch` untouched. Batch carried a near-duplicate of the auditor's per-pair logic — its own `buildPrompt`, `parseMatchReport`, `runSingleMatch` — and was the only remaining importer of the `SKEPTICAL_AUDITOR_PROMPT` TypeScript constant. The constant was preserved across D-044 explicitly to keep batch compiling; with batch unmigrated, the auditor prompt lived in two places (the YAML and the constant), the engine call path covered only half the audit traffic, and Herald had two endpoints performing one operation. The `herald-onto-engine` iteration's task 2 (issue #89) finishes the migration and unifies the endpoints.

**Decision:** Both audit call paths are folded into one `POST /api/audit` route whose unit of work is the shared engine-backed audit cell. Specifics:

1. **One endpoint, two payload shapes.** `POST /api/audit` dispatches on payload: a `candidates` array selects the batch shape (`{ jd, candidates[] }` → `{ results: [...] }`); absence of `candidates` selects the single shape (`{ job_description, username | _test_profile_override | (none, falls back to DANI_PROFILE) }` → `MatchReport`). Same Herald-owned glue around the cell — `extractSignals` 3s pre-fetch, the 25s × 2-attempt LLM wrapper, `parseMatchReport` with its code-enforced NO-FIT hard-requirement gate, `buildPartialReport` fallback, the 24h in-memory `sha256(jd + profile)` cache.
2. **Shared engine-backed cell — `runSingleMatch(profile, jd, apiKey)`.** Both shapes call the same per-pair function, which calls `loadFlow → compileFlow → LangGraphAdapter.execute` with `MATCH_REPORT_SCHEMA` substituted into `{{schema}}` at compile time (identical to D-044's match path). Batch fans the cell out via `Promise.all` across candidates. There is no longer a direct `generateText()` call anywhere in Herald.
3. **Auth + key resolution preserved per shape (D-033).** Single shape: profile audit runs on the **profile owner's** stored BYOK key (DB-resolved by `username`); test/fallback paths use the server `ANTHROPIC_API_KEY`. Batch shape: requires Clerk auth and runs on the **logged-in user's** stored BYOK key, returning 402 if missing. The decision about *whose* key is unchanged; it is now enforced in one place per call shape, not duplicated across two routes.
4. **Validations preserved verbatim.** JD ≥ 20 chars (400), batch ≥ 1 and ≤ 10 candidates (400), missing master encryption key (500), missing BYOK key for batch (402), missing BYOK key for profile audit (503), unknown username (404), test/fallback missing `ANTHROPIC_API_KEY` (500), `Unauthorized` (401) for batch without Clerk session. Top-level catch returns the per-shape error: a partial `MatchReport` for single (so the Envoy UI never crashes), `{ error: 'Batch audit failed' }` with status 500 for batch (matching the original batch error shape).
5. **Rate limit repointed to `/api/audit`.** `src/proxy.ts` now matches `req.nextUrl.pathname === '/api/audit'` instead of `/api/match`. Side effect: the per-IP 5/h cap (Upstash, `herald:match` prefix) now also covers batch calls, where previously it did not. Acceptable — batch is authenticated and one batch call is one IP hit (up to 10 candidates internally). If batch volume justifies a distinct policy later, that's a follow-up.
6. **`SKEPTICAL_AUDITOR_PROMPT` deleted.** With batch migrated, the constant has no importers (`rg SKEPTICAL_AUDITOR_PROMPT --type ts` returns only a markdown-text reference inside `packages/aeg-core/src/parse-iteration.test.ts`, which asserts on the historical *rationale text* of the herald-onto-engine iteration file — not a code-level import). The auditor prompt's canonical source is now `apps/herald-ai/web/yamls/herald-auditor.yaml` alone. `MATCH_REPORT_SCHEMA` stays in `prompts.ts` — it is still the parser contract and the `{{schema}}` template input.
7. **Old routes deleted, not redirected.** `apps/herald-ai/web/src/app/api/match/route.ts` and `apps/herald-ai/web/src/app/api/recruiter/batch/route.ts` are removed; the empty `match/`, `recruiter/batch/`, and `recruiter/` directories are removed. Callers are repointed at the source: `EnvoyFlow.tsx` (single) and `BulkAudit.tsx` (batch) now POST to `/api/audit`. No backwards-compatibility shim — Herald is the only consumer of these routes and they ship together.

**Alternatives rejected:**
- Keep two routes; just share the engine-backed cell via an internal helper — rejected: leaves the duplication at the route-handler layer (auth, validation, top-level catch) and keeps `/api/recruiter` alive for one of its prior two routes (its sibling, also recruiter-only). One endpoint per *operation* is the boundary; "single profile audit" and "batch profile audit" are the same operation with different input cardinality.
- Make `/api/audit` always batch-shaped (single = batch of one) — rejected: forces a wrapping/unwrapping shim at the Envoy caller for no gain, and the Envoy single audit is anonymous + profile-owner-keyed while batch is authenticated + logged-in-user-keyed; collapsing the two shapes collapses two different auth paths. The two payload shapes carry meaningful semantic differences (D-033), so they are dispatched in the handler rather than forced into one envelope.
- Skip the rate-limit repoint and leave `/api/match` matchable for one release — rejected: the route is deleted in the same PR; matching a path that doesn't exist is dead code.
- Leave `SKEPTICAL_AUDITOR_PROMPT` exported as a no-op shim with a deprecation comment — rejected (cf. CLAUDE.md "no backwards-compatibility hacks"): the constant has no importers; ship the delete.

**Consequences:**
- `apps/herald-ai/web/src/app/api/audit/route.ts` — new; the unified endpoint. Handlers: `handleSingle`, `handleBatch`. Shared cell: `runSingleMatch`. Identical YAML-loading + compile + adapter call as D-044's match path; the cell is the boundary between Herald glue and the engine substrate.
- `apps/herald-ai/web/src/app/api/match/route.ts` — deleted.
- `apps/herald-ai/web/src/app/api/recruiter/batch/route.ts` — deleted (parent `recruiter/` directory removed too).
- `apps/herald-ai/web/src/lib/prompts.ts` — `SKEPTICAL_AUDITOR_PROMPT` removed; the bridge comment removed; `MATCH_REPORT_SCHEMA` retained as the parser/`{{schema}}` contract.
- `apps/herald-ai/web/src/components/envoy/EnvoyFlow.tsx` — `fetch('/api/match', …)` → `fetch('/api/audit', …)`.
- `apps/herald-ai/web/src/components/audit/BulkAudit.tsx` — `fetch('/api/recruiter/batch', …)` → `fetch('/api/audit', …)`.
- `apps/herald-ai/web/src/proxy.ts` — rate-limit guard repointed from `/api/match` to `/api/audit`.
- `apps/herald-ai/web/tests/match-engine.test.ts` — fetch URL updated to `/api/audit`.
- `apps/herald-ai/web/tests/herald-auditor-yaml.test.ts` — relative-path guard updated from `…/api/match` to `…/api/audit`.
- `apps/herald-ai/specs/herald-app-architecture.md` — audit pipeline section rewritten to describe one engine-backed `/api/audit`; both legacy routes named as retired.
- `apps/herald-ai/specs/herald-backlog.md` — "Endpoint unification" item marked done.
- Engine + adapter packages: `git diff main --stat` against `packages/engine` and `packages/adapter-langgraph` is empty. No Vāda blast radius by construction.
- Lock: NO — first time both Herald call paths share one route + one engine cell; revisit once batch has been observed in production. Type 1 because it replaces two call paths, deletes a previously load-bearing constant, and locks in the cell/route boundary that the matrix UI (task 4) and per-audit vendor selector (task 3b) will plug into.

---

## D-046 — Conventions enforced in CI (commit format, Biome, forbidden colors) to govern every write path

**Date:** 2026-06-14
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (`ci-conventions` task, June 14, 2026)
**Ratified by:** Principal (in-session)

**Context:** Three conventions were enforced only by local mechanisms: commit-message format (Husky + commitlint), Biome lint/format (lint-staged), and the "no hardcoded colors" rule from `.claude/skills/ui-theme-tokens/SKILL.md` (the PreToolUse skill-check hook that forces UI skills to be loaded before editing `.tsx`). Those mechanisms only fire for a local agent committing inside a checkout. Any write via the GitHub API / MCP — or a direct push, or a hand-merge — bypasses all of them. Evidence on main: commit history contains non-conforming messages (`Record the aeg-core…`, `Backlog two items…`, `Reconcile herald-backlog…` — none match the `Type: description` format commitlint requires) because they were authored via the API where commitlint never ran. PR #105 merged with a lowercase scope for the same reason. The structural gap is: local hooks bind one class of writer; CI binds every class of writer.

**Decision:** Promote the three highest-value local checks to GitHub Actions CI jobs that run on every PR regardless of how commits were authored. Local hooks are NOT replaced — they stay (fast feedback during a local agent's edit loop). CI is added as the layer that catches what the local layer structurally cannot.

1. **`commit-lint` (CI job).** Runs `commitlint --from <base> --to <head>` over the PR commit range, **reusing the existing `commitlint.config.js`** (the same rule set Husky uses locally — no forked configuration, so local and CI cannot diverge).
2. **`biome` (CI job).** Runs `bun run format-and-lint` (i.e. `biome check .`) over the working tree. Same config as lint-staged uses locally.
3. **`no-hardcoded-colors` (CI job + new script `scripts/check-forbidden-colors.ts`).** Diff-scoped: scans only the added lines in changed `.tsx` / `.jsx` / `.ts` / `.js` / `.css` files. Encodes the four pattern groups documented in `ui-theme-tokens/SKILL.md` (Tailwind palette classes, arbitrary color brackets `bg-[#…]` / `text-[oklch(…)]`, absolute colors `text-white` / `bg-black`, inline-style color literals). The canonical token source `packages/ui/styles/globals.css` and CSS custom-property definition lines are skipped to avoid false-positives on legitimate `oklch(…)` definitions. The gate deliberately **under-matches rather than over-matches** — pre-existing violations elsewhere in the repo (legacy debt in `packages/ui`) are not flagged; only newly-introduced violations block.

**Alternatives rejected:**
- Keep relying on the local skill-check hook: rejected — the hook only fires for tools the harness runs (`Edit` / `Write` / `NotebookEdit` inside a local Claude Code session). A `gh api` write, a Cursor edit, a hand-merge, or a direct `git push` are all invisible to it. The gap was the whole problem.
- Add lint as a Turbo job and call it from a single CI workflow: rejected for this task — kept each convention as an independent job so a failure points clearly at which convention broke (commit-format, Biome, or colors). Bundling reduces signal.
- Run color check whole-file instead of diff-scoped: rejected — legacy `packages/ui` files contain 11 known pre-existing violations (verified during self-test). Whole-file scanning would block every PR that touched those files until the legacy debt was paid. Diff-scoping turns the gate into a "stop the bleeding" rule, not a "boil the ocean" rule.
- Make the CI commit-format rule stricter than the local one (e.g. require Conventional Commits `feat(scope):`): rejected — local and CI must agree. Reusing `commitlint.config.js` guarantees identical behavior; a divergent rule set is its own drift hazard. The repo's existing format (`Feat: description`, `Type:` enum from `commitlint.config.js`) is the source of truth.
- Arm the checks as required status checks in branch protection as part of this task: explicitly out of scope. Arming is a Principal action in GitHub Settings → Branches → ruleset, which this task does not perform. The task ships the *checks*; the Principal arms them. Until armed, the gate is advisory (Observe-mode floor, `state-machine.md` §12).

**Consequences:**
- `.github/workflows/conventions.yml` — new; three jobs (`commit-lint`, `biome`, `no-hardcoded-colors`), all on `pull_request: [opened, synchronize, reopened]`.
- `scripts/check-forbidden-colors.ts` — new; diff-scoped UI color check. Self-test evidence: catches 11 deliberate violations in a fixture file; returns clean against the unchanged `apps/aeg/web/studio` scaffold; finds 11 known legacy violations across `packages/ui` (debt tracking, not blocking — they only matter if a PR re-touches those lines).
- `aeg-root/state-machine.md` §12 — three rows moved from "Trusted (agent discipline)" / aspirational-but-not-installed to "Enforced (CI blocks merge)": commit-message format, Biome lint/format, forbidden colors in UI. `verify-docs` and the Issue-template / no-forbidden-fields gates stay where they were.
- `aeg-project/changelog.md` — entry added.
- Local hooks (`.husky/`, `.claude/hooks/check-skill.sh`, lint-staged): **unchanged.** Fast local feedback is preserved.
- **Follow-up (Principal, not in this task):** in GitHub → Settings → Branches → ruleset for `main`, add `commit-lint`, `biome`, and `no-hardcoded-colors` (plus Vercel) to "Require status checks to pass." Until that is done, the checks run but do not block merges — the task ships the mechanism, the Principal arms it.
- Lock: NO — first cut of CI-enforced conventions; revisit once a real PR exercises all three jobs and the Principal arms branch protection. Type 1 because it changes the enforcement gradient (`state-machine.md` §12), which governs how every future merge is gated.

---

## D-047 — Custom client-side tool execution added to `@atta/adapter-langgraph` as an additive, opt-in capability

**Date:** 2026-06-14
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (`herald-onto-engine` task 7a, June 14, 2026)
**Ratified by:** Principal (in-session)

**Context:** The adapter supported only provider-native server tools (Anthropic-executed `web_search` / `web_fetch`). There was no loop in which the engine pauses, runs an app-supplied TypeScript function, and feeds the result back to the model — proven by `node-executor.ts` (single-shot `llmCall`) and `graph-state.ts` (`toolUseHistory` documented as "best-effort — server tools don't emit countable tool_use blocks"). Task 7b (Herald's GitHub tool) needs the engine to do precisely this; 7a builds the capability with a throwaway trivial tool, not Herald's. The cardinal constraint was additive/opt-in: Vāda runs on this exact adapter, so an agent with no custom tools declared must execute byte-identically to today.

**Decision:** Add a new branch inside `llm.ts`'s Anthropic vendor path that activates only when (1) the agent declares `customTools: [{ name, description, parameters }]`, (2) at least one declared name matches a handler registered on the adapter at construction time, and (3) the agent has no `outputSchema` (structured-output mode is mutually exclusive with multi-turn tool use today). When all three hold, the call routes to a bounded multi-turn loop (`runAnthropicCustomToolLoop`) that runs the handler on each emitted `tool_use`, sends back `tool_result`, and continues until the model stops calling tools or `MAX_CUSTOM_TOOL_ITERATIONS` (10) is hit. When any condition is false, the existing single-shot Anthropic call runs unchanged — proving the byte-identical guarantee.

The gate predicate `resolveRegisteredCustomTools(agent, handlers)` is extracted as a pure function and is the **single source of truth** for whether the loop runs. It is unit-tested in isolation against six invariants (no customTools → `[]`; customTools but no handlers → `[]`; handlers undefined → `[]`; structured output → `[]`; declared + registered → returns the spec; per-name filtering). If any of those return non-empty for a Vāda agent that today declares no `customTools`, the loop activates for Vāda — so the assertions form the additivity invariant in code.

Surface shape: app-supplied handlers register on `LangGraphAdapter` constructor (`customTools?: Record<string, async (args) => result>`). Tool **specs** live on the agent in YAML (`custom_tools: [{ name, description, parameters }]`), threaded through `flow-schema.ts` → `flow-loader.ts` → `compile-flow.ts` → `Plan.agents`. The engine stays content-agnostic — the spec is data the YAML author wrote, not content the engine injected.

**Alternatives rejected:**
- Put the loop inside `node-executor.ts` calling `llmCall` multiple times: rejected — would require widening the engine's `LlmCallFn` type to expose tool_use blocks. The change would leak provider-specific multi-turn semantics into a provider-neutral engine type. Keeping the loop inside the Anthropic branch contains the change to the adapter layer where multi-vendor SDK shape already lives.
- Inline the tool spec on `Agent.tools` as a mixed `(string | object)[]`: rejected — changes the existing `tools: string[]` contract, which the brief explicitly flagged as a Vāda-safety risk. Adding `customTools` as a separate optional field is purely additive: every existing YAML and TypeScript caller stays well-typed.
- Resolve tool specs only at the adapter (don't put them in YAML): rejected — splits the tool definition across two surfaces (YAML lists the name, code holds the spec) and makes Herald's task 7b YAML opaque about what the model actually sees. Carrying the spec in YAML matches the engine's "everything declarative" philosophy.
- Pass `customTools` through the default Anthropic-only path (`createDefaultLlmCall`): rejected for this task — `createDefaultLlmCall` is the single-key backward-compatibility wrapper; widening it would change its existing test surface. The multi-vendor path (`createMultiVendorLlmCall`) is where every production caller already lives, so the new third argument is added there. The default path remains untouched — an additional belt for the additivity guarantee.
- Skip the iteration cap and trust the model to stop: rejected — a buggy handler or a confused model could request the same tool forever. `MAX_CUSTOM_TOOL_ITERATIONS = 10` is a finite-cost ceiling; exceeding it throws a named error rather than spinning forever.

**Consequences:**
- `packages/atta-agents/src/index.ts`: `CustomToolSpec` interface added; `Agent.customTools?: CustomToolSpec[]` added. Both additive.
- `packages/engine/src/flow-types.ts`: `FlowCustomToolSpec` added; `FlowAgent.customTools?: FlowCustomToolSpec[]` added.
- `packages/engine/src/flow-schema.ts`: `CustomToolSpecSchema` added; `FlowAgentSchema.custom_tools` (snake_case) accepted optionally.
- `packages/engine/src/flow-loader.ts`: `custom_tools` → `customTools` mapped at the boundary.
- `packages/engine/src/compile-flow.ts`: `customTools` propagated from `FlowAgent` into `Plan.agents[name]`.
- `packages/adapter-langgraph/src/custom-tool-loop.ts`: new module — `runAnthropicCustomToolLoop`, `resolveRegisteredCustomTools`, `customToolSpecToAnthropicTool`, `MAX_CUSTOM_TOOL_ITERATIONS` constant.
- `packages/adapter-langgraph/src/llm.ts`: `createMultiVendorLlmCall` gains a third optional argument `customToolHandlers`; Anthropic branch gains a single gated `if` that routes to the loop when the gate predicate returns non-empty. The single-shot paths (text and structured) are untouched.
- `packages/adapter-langgraph/src/adapter.ts`: `LangGraphAdapterConfig.customTools?: CustomToolHandlerMap` added; passed through to `createMultiVendorLlmCall`. `createDefaultLlmCall` path unchanged.
- `packages/adapter-langgraph/src/index.ts`: new module surfaces re-exported.
- Test coverage:
  - `custom-tool-loop.test.ts` (new, 12 tests): 6 additivity-gate invariants, 1 spec-conversion test, 3 loop positive-path tests (tool_use → handler → end_turn; no-tool first response; handler error → `is_error: true` tool_result), 2 bound tests (max-iter throws; default constant pinned to 10).
  - `flow-loader.test.ts` (+2 tests): `custom_tools` round-trips snake→camel; omitted `custom_tools` leaves `customTools` undefined (the Vāda case).
  - **Baseline adapter test suite (31 tests) stays green unchanged.** Combined with the gate test asserting the loop is unreachable without a declared+registered+non-structured custom tool, this is the byte-identical proof.
- Diff scope: 11 files across `packages/adapter-langgraph`, `packages/engine`, `packages/atta-agents`. **Zero `apps/` changes** (Herald's tool is task 7b, not here).
- `aeg-project/changelog.md` — entry to be added in a follow-up commit if/when the iteration's append-only ledger calls for it.
- Lock: NO — first cut of the engine's custom-tool capability. The shape is likely to evolve once Herald (7b) and any future custom-tool consumer expose pain points. Type 1 because it changes the shared-engine surface (`Agent` type, `Plan.agents` shape, adapter constructor options, the Anthropic call path) that every consumer depends on.

---

## D-048 — Append-only per-iteration token/cost ledger added to the AEG model (model half)

**Date:** 2026-06-15
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (`aeg-ui-v1` task 9 model half, June 15, 2026)
**Ratified by:** Principal (via task 9 dispatch + merge)

**Context:** AEG's legibility — derived task status, the brief in the PR body, the append-only decision log, the close-out provenance block — gives a reader an honest answer to *what happened*. It gives no answer to *what it cost*. Per-phase agent spend (Planner thinking time vs. Developer coding time vs. Reviewer auditing time) is invisible. Resolving open-question **OQ-aeg-2 (cost/token tier)** turns on this gap: cost legibility is itself a governance property, and one that neither raw GitHub nor existing "agentic" tools surface today. The Principal's intent (June 14): every role reports its token/cost; each iteration carries a simple table; re-entering a phase **adds** a row, never overwrites; the iteration total is `sum(rows)`. The cardinal constraint surfaced during sizing: tokens are capturable asymmetrically — terminal roles (Developer in Claude Code, Archivist when automated) know their own tokens via `/cost`; **claude.ai roles (Planner, Brief Author, Reviewer, Security) cannot read their own token count via tool or API.** Any honest design has to encode this asymmetry rather than pretend it doesn't exist.

**Decision:** Add the **per-iteration token/cost ledger** to AEG as a new Section-13 append-only artifact. The model half (this decision) defines the format, the append rule, and the parser; the Studio view that consumes it is deferred to a follow-up — it depends on the iteration-pages surface that #99 is currently occupying in the serialized 4→6→5 wave.

1. **One sibling file per iteration: `aeg-root/iterations/<name>.tokens.md`.** Lives next to `<name>.md`. The sibling form is chosen over an inline `## Token ledger` section in the iteration file because two roles appending rows on the same file is exactly the merge-collision case the topology file's "Planner-only at plan time" rule was designed to avoid. Keeping the ledger in its own append-only file lets a Planner editing topology and a Developer reporting turn-end never touch the same bytes. The parser also accepts the inline form so a future iteration that chose it still works.
2. **Fixed columns: `Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date`.** Phase carries the AEG phase, conventionally prefixed with the task id when per-task (`9: develop`, `9: review`, `planning` for iteration-wide work). Tokens are integers from the meter or `—` for "not yet known." Cost is `$X.XXXX` or `—`. Date is `YYYY-MM-DD`.
3. **The append rule (canonical):** at the end of a role's turn, append one row; never edit an existing row; re-entry (re-plan, re-develop after `CHANGES_REQUESTED`, re-review) appends a *new* row, never an overwrite; the iteration total is `sum(rows)`, derived at read time, never stored. Same philosophy as forge-derived task status and the append-only decision log: don't store the aggregate; sum the immutable entries. A stored total reintroduces the merge-collision + stale-aggregate problem the model already removed.
4. **Two capture sources, designed for the asymmetry:** terminal roles (Developer in Claude Code; Archivist when automated) self-report exact numbers via the session meter — Cetana can capture this at dispatch-end as the obvious next layer. claude.ai roles (Planner; Brief Author; Reviewer; Security) append the row at turn-end with numeric cells as `—`; the Principal fills them later from the claude.ai UI usage figure. V1 accepts the manual seam: chat turns are the cheap ones; coding (terminal) dominates spend and is captured exactly.
5. **`@atta/aeg-core` learns to parse it.** `parseLedger(md) → LedgerRow[]` finds the table (sibling-file H1 form or inline `## Token ledger` section), parses cells with the same `—` / `-` → `null` convention used by the existing parsers, skips malformed rows rather than throwing. `sumLedger(rows) → LedgerTotals` is pure: nulls contribute zero so a pending-fill row does not inflate the aggregate; the row count is preserved so a future UI can surface "5 rows, 2 pending." Both functions are pure (string in, typed model out) like the rest of the package.

The model half ships the format + the per-role obligation + the parser. The **Studio view** of per-task and per-iteration totals is the second half of task 9 (#110) and stays open until that view ships — `sumLedger()` is the consumer-ready hook.

**Alternatives rejected:**
- Inline `## Token ledger` section inside the iteration file: rejected as the *recommended* home — same merge-collision domain as the topology table, exactly the racing-update problem the iteration model removed. Accepted as a *tolerated* alternative form (the parser handles it) so an existing iteration can choose it without renaming files, but the sibling form is the canonical recommendation.
- A stored "current total" field in the ledger header (or in the iteration file): rejected — reintroduces the stale-aggregate failure mode the §13 append-only rule was designed against. Every existing AEG aggregate (task status, decision log status snapshot, provenance) is derived from immutable entries; the ledger total follows the same rule.
- Auto-capture for terminal roles as part of this PR: rejected — auto-capture sits in Cetana (the orchestrator), not in `aeg-core` or the model docs. Cetana auto-capture is the obvious next layer but it depends on the dispatch-end hook landing in Cetana's coordinator; backlogging it as a follow-up rather than shipping a half-built version. Manual append is V1.
- Pretending claude.ai roles can self-report tokens: rejected — they cannot, today (no tool/API exposes the running conversation's token count). A row schema that assumed they could would either lie or block. Designing for the two-source reality lets the ledger be honest about what is known vs. what awaits Principal fill.
- A new `aeg-root/contracts/token-ledger.md` to hold the format spec: rejected for this iteration — contracts (D-042) are role-seam interfaces (one producer, one consumer). The ledger has *every* role as a producer, so it doesn't fit the contract pattern; it sits in `iterations/README.md` §12 alongside the other per-iteration model rules. If a single seam (e.g. Cetana → ledger) emerges, a contract can be carved out then.

**Consequences:**
- `aeg-root/iterations/README.md` §12 — new section; format + append rule + sibling-file rule + the two-source asymmetry + the anti-regression rules. Old §12 (one-line pitch) becomes §13.
- `aeg-root/state-machine.md` §13 — adds the per-iteration token/cost ledger as a new append-only artifact bullet.
- `aeg-root/state-machine.md` §3 — adds a `Token ledger` row to the mutation-permission matrix (every role appends; Principal fills claude.ai numeric cells; Archivist flags missing-row drift). Reviewer/Security subsection extends to mention the verdict-time row.
- `aeg-root/aeg-manual-flow.md` §5 — adds the per-role turn-end ledger row obligation after the run-order table.
- `aeg-root/roles/{planner,team-leader,developer,reviewer,security,archivist}.md` — each gains a turn-end ledger row obligation specialized to the role's surface (chat vs. terminal) and phase (planning, brief, develop, review, security, archive).
- `aeg-root/roles/developer.md` Tier 0 checklist — adds the ledger-append line so the gate is visible at PR-open time.
- `packages/aeg-core/src/types.ts` — new `LedgerRow` and `LedgerTotals` types.
- `packages/aeg-core/src/parse-ledger.ts` — new module exporting `parseLedger(md)`. Tolerates em-dash / `-` / empty cells as `null`; tolerates thousand-separator commas in integer cells; skips malformed rows.
- `packages/aeg-core/src/sum-ledger.ts` — new module exporting `sumLedger(rows)`. Pure; nulls contribute zero; row count preserved.
- `packages/aeg-core/src/parse-ledger.test.ts` + `sum-ledger.test.ts` — 14 new tests across parser + sum, including: sibling-file form, inline `## Token ledger` form, em-dash nulls, malformed-row skipping, empty-Phase row skipping, thousand-separator integers, unparseable numerics as null, sum over the live fixture, empty-ledger identity, null-row counting, re-entry summation.
- `packages/aeg-core/src/fixtures/aeg-ui-v1.tokens.md` — new fixture exercising all four row shapes (chat-role with em-dashes; terminal-role with exact numbers; a re-entry second `9: develop` row).
- `packages/aeg-core/src/index.ts` — re-exports `parseLedger`, `sumLedger`, and the new types.
- `aeg-root/iterations/aeg-ui-v1.tokens.md` — new live ledger file for the active iteration as the worked example. Backfill policy noted: tasks 1, 2, 4, 7 are not backfilled (those turns predate the obligation; inventing numbers would falsify the ledger). Cost-table-missing-model dependency noted at the artifact's own seam.
- `aeg-project/changelog.md` — entry appended.
- **Studio view (deferred):** the display half — per-task and per-iteration totals on the iteration view (task 4's pages) and task detail (task 5) — is the second half of #110 and stays open. It depends on the iteration-pages surface currently in the 4→6→5 serialized wave; bundling it here would collide with #99's territory.
- **Per-role surface note (V1 honesty):** today's Developer surface (Claude Code dispatched session) does not expose `/cost` programmatically to the dispatched agent itself — `/cost` is a slash command for the human user. So even the "terminal" Developer row often arrives with `—` cells in V1, filled by the human operator post-session in the same way claude.ai rows are filled. Auto-capture for terminal sessions through Cetana is the path that closes this seam; backlogged.
- Lock: NO — first cut of the ledger model. Numeric-cell auto-capture, ledger-display in Studio, and cost-table coverage for newer models are all known follow-ups whose shape may inform a revision. Type 1 because it changes what every role does at turn-end (a per-role obligation across the whole flow) and introduces a new persistent append-only artifact class.

---

## D-049 — AEG model: Verification phase + runtime Test Plan as a brief field and merge gate

**Date:** 2026-06-16
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (`aeg-ui-v1` task 10, June 16, 2026)
**Ratified by:** Principal (via task 10 dispatch + merge)

**Context:** Across the `aeg-ui-v1` iteration, **four features merged CI-green and were broken at runtime** — a missing DB migration (Studio kanban), a missing env var (Herald BYOK key), a missing IdentityProvider (ModelPicker render path), an unexecuted polymorphic-input test plan (Herald bulk audit). Root cause is structural, not effort: **no role owns runtime verification.** The Developer-agent writes code + passes the static gates of Phase 8 (typecheck, lint, tests, verify-docs) but **structurally cannot exercise** auth-gated paths (no signed-in session), key-dependent paths (no access to the Principal's stored BYOK), or visually-rendered paths (no eyes on the screen). The Reviewer reads the diff, not a running app; the Security reviewer the same. The test plan — which good Brief Authors already write into PR bodies — falls into the gap between "agent who can't run it" and "reviewer who doesn't," is never executed, and untested features merge. The model needs a phase between Review and Merge that *runs* the work, with an explicit owner and a real merge gate. Adding a phase is a Type 1 constitutional change (it alters what every PR must satisfy before merge).

**Decision:** Add the **Verification phase** to AEG as the eleventh phase, between Review (now Phase 10, unchanged) and Merge (renumbered Phase 12). Verification is a **phase, not a new role**: it is jointly satisfied by the existing Developer-agent and the existing Principal, split by who can structurally execute each part.

1. **The Test Plan is a required brief field** (`aeg-root/skills/brief-authoring/SKILL.md` §9). Each item is tagged either `[agent]` (non-auth, scriptable — SSRF rejections, parse checks, route responses, render smoke) or `[principal]` (auth-gated, key-dependent, visual — a signed-in BYOK audit, a ModelPicker render behind Clerk, a visual confirmation). Pure-logic briefs declare `Test Plan: unit-tests-only` — a **first-class allowed value**, not an empty skip — and are exempt from runtime verification (the CI unit-test gate is the whole proof). A brief touching a runtime surface (anything in §4 that's an API route, page, or server action) and declaring `unit-tests-only` is **malformed** — the two fields are coupled, and Brief Validation rejects the mismatch.

2. **The two-actor split** mirrors D-048's chat-vs-terminal token-capture asymmetry. The Developer-agent runs `[agent]` items because they don't require what the agent structurally lacks (auth session, the Principal's BYOK key, eyes on a render). The Principal runs `[principal]` items because they require exactly those things. The asymmetry is **enforceable, not aspirational**: the agent cannot tick `[principal]` boxes (no surface), and the Principal does not tick `[agent]` boxes (different proof). Pretending one actor can satisfy the other's half is the failure mode this phase exists to remove.

3. **The merge gate.** A PR is not mergeable while any Test Plan checkbox is unticked. An unticked `[agent]` box means the Developer-agent has not posted the evidence comment yet; an unticked `[principal]` box means the Principal has not verified in the browser yet. The doctrine is mechanical (an unticked checkbox = not mergeable); the *enforcement* is trusted discipline today — the Principal honors the gate manually before merging. The optional `verify-test-plan` CI check (a checkbox-state parse over the PR body) is the path from trusted-to-enforced; it ships per-iteration on the same advisory → enforced gradient as the other gates (`state-machine.md` §12).

4. **The Verifier role doc (`aeg-root/roles/verifier.md`)** captures the phase's entry gate, the two halves, what each half does, the output format (a Verification section in the PR body with ticked checkboxes + evidence comments), the stop/escalate conditions, and the anti-patterns (ticking `[principal]` because the `[agent]` half passed, paraphrasing test output instead of pasting it, inventing a test plan at verification time, downgrading `[principal]` items to `[agent]` to make the agent half complete). The role doc names the phase, not a new actor; the role count remains Principal/TL/Developer/Reviewer + Archivist (unchanged from D-026).

5. **Doctrine in one line:** **CI green ≠ app boots ≠ feature works.** Phase 8 proves the code compiles. Phase 10 proves the diff is sound. Phase 11 proves the feature *runs*. All three are required to merge.

**Alternatives rejected:**
- **Burying the Test Plan inside §8 (Verification before claiming done) rather than its own §9 brief field:** rejected — §8 lists the *static* gates (typecheck/lint/tests/verify-docs) and runs at the Developer's turn-end (before opening the PR). The runtime Test Plan runs *after* the PR opens and is consumed by a *different* actor (the Verifier phase). Conflating them re-creates the failure mode where "verification" got read but never executed. Keeping them discrete is what lets the Verifier phase find the runtime plan without parsing prose.
- **A fifth conversational role ("the Verifier"), dispatched separately:** rejected — the agent surfaces that exist (Developer's session) already have everything needed to run `[agent]` items, and the human surface (Principal in a browser) already has everything needed to run `[principal]` items. Adding a fifth role would either duplicate one of those surfaces or invent a synthetic seam that requires its own dispatch infrastructure. The phase boundary, not a new actor, is the right shape — it mirrors how Security is a *specialization* of Reviewer (D-026), not a sixth role.
- **Making `[principal]` items optional / agent-only verification "good enough":** rejected — this is exactly what the iteration failed at four times. The auth/key/render paths *cannot* be exercised from the agent surface; declaring them out of scope just renames the gap. The asymmetry is structural, like the token-ledger asymmetry (D-048), and the model has to design for it honestly rather than pretend it doesn't exist.
- **Skipping the optional `verify-test-plan` CI enforcer and relying purely on trusted discipline:** accepted *as the V1 default*, on the same advisory → enforced gradient the rest of the model uses. Trusted discipline is honest about today's enforcement layer; the CI enforcer ships when its checkbox-state parse over the PR body is proven reliable. The doctrine works either way; the gate strengthens incrementally.
- **A heavyweight QA layer (test management, suite generation, separate QA actor):** rejected explicitly — the all-iteration failure was *not* "we lacked a QA team"; it was "the test plan in the brief was never executed." One tagged section in the brief plus one phase before merge is the entire mechanism that was missing. Anything more is bureaucracy that produces its own paperwork-vs-doing-it gap.

**Consequences:**
- `aeg-root/roles/verifier.md` — new role doc (the phase's owner profile, split by `[agent]` and `[principal]` halves).
- `aeg-root/skills/brief-authoring/SKILL.md` — new §9 "Test Plan" required field; subsequent sections renumber (§9 Stop conditions → §10; §10 Constraints → §11; §11 Deliverable → §12); contract-conformance checklist adds the Test Plan gate; standing-autonomy clause references §10; anti-patterns add "omitting the Test Plan," "untagged items," "`unit-tests-only` on a runtime brief," "mis-tagging a `[principal]` item as `[agent]`."
- `aeg-root/process.md` — eleven phases → twelve phases; new Phase 11 (Verification) inserted between Phase 10 (Review) and Phase 12 (Merge); doctrine added ("CI green ≠ app boots ≠ feature works"); anti-patterns add the verification-related failure modes.
- `aeg-root/aeg-manual-flow.md` — §5 run-order table adds steps 7a (Verifier — agent half) and 7b (Verifier — Principal half) between the existing review and close-out steps; §6 entry-gates section adds a Verifier paragraph (the phase, two halves).
- `aeg-root/state-machine.md` — §1 explicitly notes Verification is a phase, not a new role; §3 mutation-permission matrix adds a "Test Plan execution" row (Principal runs `[principal]`, Developer runs `[agent]`); §3 Reviewer-position line adds "Phase 11 Verification" between TL spec review and merge; §12 trusted-discipline list adds the Verification phase (Phase 11 trusted in V0; CI enforcer is the path to enforced).
- `aeg-project/changelog.md` — entry appended.
- **Optional CI enforcer (`verify-test-plan`):** deferred unless the checkbox-state parse over the PR body proves clean and reliable to ship in this iteration. Doctrine ships regardless; enforcement strengthens incrementally on the same advisory → enforced gradient as the rest of the model.
- **Lock: NO** — this is the first cut of the Verification phase. The split, the tag set (`[agent]` / `[principal]`), the `unit-tests-only` allowed value, and the merge-gate shape are all subject to revision once the phase has been run across enough tasks to surface its real failure modes. Type 1 because it adds a phase to the per-task flow that every Tier 1+ PR must satisfy — a constitutional change to what "ready to merge" means.

---

## D-050 — Iteration Archivist as a first-class AEG role

**Date:** 2026-06-17
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Developer (role/iteration-archivist brief, June 17, 2026)
**Ratified by:** Principal (via this brief's dispatch + merge)

**Context:** When `herald-onto-engine` and `aeg-ui-v1` finished, no AEG role owned the iteration close event. Phase 13 was added to `process.md` (PR #136) but named steps without assigning ownership or a dispatch contract. The result was three cleanup PRs, stale state docs for days, and a Studio showing completed iterations as active. Iteration close is a significant, named event deserving its own role — not a conditional buried in the per-task Archivist or an automated afterthought.

**Decision:** Add `aeg-root/roles/iteration-archivist.md` as a first-class peer role to `archivist.md`. The Iteration Archivist owns Phase 13 (Iteration Close) entirely. It is dispatched by explicit Principal declaration, not triggered by automation. It is forge-agnostic — requires no GitHub Actions or external tooling. It executes all close-out steps: forge verification, retrospective assembly, iteration archival, state doc refresh, pending decision surfacing, provenance posting.

**Alternatives rejected:**
- *Extend the per-task Archivist with an "if all tasks done" conditional* — hidden logic, easy to miss, wrong scope. The per-task Archivist closes individual tasks; conflating scopes creates confusion about what triggers it.
- *GitHub Actions workflow to detect completion and trigger close* — forge-specific, breaks AEG's portability, makes iteration close an automated afterthought rather than a deliberate Principal act. AEG must be self-contained.
- *Automate the trigger (fire when last PR merges)* — iteration close requires retrospective judgment and a "what's next" declaration. These are not mechanical. The explicit Principal dispatch is the correct gate.

**Consequences:**
- The Principal now has a named, dispatchable role for iteration close. The command is unambiguous: "Run the Iteration Archivist for iteration X."
- Per-task Archivist scope is unchanged. Both roles exist; neither substitutes for the other. A disambiguation paragraph is added to `archivist.md` to prevent confusion.
- Phase 13 in `process.md` now has a clear owner with a self-contained role doc.
- Future iterations will close cleanly without manual cleanup PRs or stale state docs.

**Artifacts:**
- `aeg-root/roles/iteration-archivist.md` — new role doc with full entry gate, checklist, output format, and distinction from the per-task Archivist.
- `aeg-root/roles/archivist.md` — disambiguation paragraph added (scope: closes individual tasks, not iterations; Iteration Archivist handles Phase 13).
- `aeg-root/process.md` Phase 13 — updated "Who" line, steps renamed to reflect Iteration Archivist ownership, no automation assumed.

**Lock: NO** — first cut of the Iteration Archivist role. The entry gate, the checklist structure, and the output format may be refined after the first real-world run. Type 1 because it defines a new, role-level change to the close-out flow that affects every iteration going forward.

---

## D-051 — Agent implementation packages at `packages/agents/<name>/`; workspace glob extended to `packages/*/*`

**Date:** 2026-06-17
**Status:** ACTIVE
**Type:** 2
**Lock:** NO
**Authored by:** TL (planning session, June 17, 2026)
**Ratified by:** Principal (in-session)

**Context:** Planning the three-iteration batch (herald-agents-v2, aeg-governance-ui-v2, vada-agents-v2) required deciding where D-046 agent implementation packages live physically. `packages/atta-agents` already exists as a type-only package (`Agent`, `CustomToolSpec` interfaces). The D-046 vision — self-contained agent packages with YAML + tools + schema + `run()` export — does not fit inside it: types and implementations have different consumers and different lifecycles. A reviewer pass (June 17) flagged that placing packages at `packages/agents/<name>/` would not work under the existing workspace glob (`packages/*`), which matches only one level deep. Two layout options were put to the Principal.

**Decision (A2):** Agent implementation packages live at `packages/agents/<name>/` (N self-contained packages, one per agent). The workspace configuration adds `packages/*/*` to the glob so these packages are workspace members and can be resolved as `@atta/<name>`. `packages/atta-agents` remains the shared type package (interfaces only) — separate concern, separate lifecycle, unchanged. First execution: `packages/agents/forensic-hiring-auditor/` in herald-agents-v2 task 2, which also adds the glob. The `run()` export API shape and the internal handler-registration pattern are established by herald-agents-v2/2 and followed by all subsequent agent packages.

**Alternatives rejected:**
- A1 — one `@atta/agents` package at `packages/agents/` with per-agent subdirs under `src/`: rejected. Loses the self-contained deployable unit property D-046 describes — a single package with many subdirs cannot be independently versioned or consumed. The glob change in A2 is trivial; the structural clarity of per-agent packages is worth it.
- A3 — N flat packages at `packages/<name>/`: rejected. Clutters the root, loses the agents/ grouping, makes it impossible to scan all agent packages without a naming convention.

**Consequences:**
- `packages/agents/` directory created by herald-agents-v2/2.
- Workspace glob extended to include `packages/*/*` by herald-agents-v2/2.
- `packages/atta-agents` unchanged.
- All future agent packages follow the shape of `packages/agents/forensic-hiring-auditor/`: YAML + tools + schema + gates + `run()` export.
- Decision logged as part of herald-agents-v2 task 1, per Principal direction in the June 17 planning session.
- Type 2 — reversible.

---

## D-052 — Archival coherence gates — downstream roles hard-STOP on skipped Archivist

**Date:** 2026-06-21
**Status:** ACTIVE
**Type:** 2
**Lock:** NO
**Authored by:** TL (task/aeg-coherence-gates)
**Ratified by:** Principal (in-session)
**Conforms-to:** D-042

**Context:** The per-task Archivist (Phase 12) and Iteration Archivist (Phase 13) are manual-dispatch-only. During fast-moving work they get skipped, causing `now.md`, `state.md`, and `completed/` to drift out of sync with the forge. The Planner's readiness gate item 8 (D-042) already checks whether the previous iteration is archived before planning, but nothing fires earlier in the execution cycle. A Developer can start a new task in an iteration while the preceding task's close-out was never run, and nothing stops them. The provenance block comment — posted by the per-task Archivist on each merged PR per `aeg-root/contracts/reviewer-archivist.md` — is a forge-derived, queryable, binary signal: either it exists (Archivist ran) or it does not (Archivist skipped). Its presence is detectable by any role with `gh pr view` access, with no side effects.

**Decision:** Add contract-level hard-STOP gates that fire in the Developer entry gate — before any code is written, and before any PR is opened:

1. **Per-task archival gate (before step 0).** Before executing step 0, the Developer queries the most-recently-merged task PR in the iteration and checks whether it carries a provenance block comment. If the block is absent, the per-task Archivist was skipped. STOP: *"Prior task PR #N in iteration `<name>` has no provenance block — the per-task Archivist must run before this task proceeds. Dispatch the per-task Archivist for #N first."* First task in an iteration (no prior merged task PR): gate passes trivially.

2. **Iteration archival gate (before opening PR).** Before opening a PR against any product, the Developer confirms each product's previous iteration is in `aeg-root/iterations/completed/`. If any prior iteration exists in `iterations/` but not `completed/` with all its task PRs merged, STOP: *"Product `<X>`'s previous iteration `<name>` is complete but not archived — the Iteration Archivist must run before new work on this product. Dispatch it first."*

These two gates are deliberately not CI, not automation, and not scripts. AEG is a human-run protocol; the enforcement must be runnable by any dispatched agent using only the forge (`gh` CLI). A contract-level hard STOP achieves the same effect as a CI drift check: it refuses to proceed without requiring any build infrastructure. The provenance block's presence/absence is an immutable, forge-readable fact.

**Alternatives rejected:**
- A1 — GitHub Actions workflow that checks for provenance blocks after merge: rejected. AEG must not require CI infrastructure — the enforcement must live in the protocol itself. CI creates a fragile dependency and obscures the methodology's origin.
- A2 — Archivist triggered automatically on PR merge via webhook or action: rejected. Same reason as A1 plus: automation running close-out silently removes the human review point. The Principal wants close-out to be a visible, dispatched act, not an invisible side effect.
- A3 — Planner item 8 alone is sufficient: rejected. Planner item 8 fires at planning time, which is too late — multiple per-task close-outs can be skipped between planning passes. The Developer gate fires at every task start, catching drift as it accumulates.

**Consequences:**
- `aeg-root/contracts/reviewer-archivist.md` consumer obligations updated: provenance block comment named as the downstream coherence signal; its absence hard-stops the next Developer.
- `aeg-root/contracts/brief-developer.md` consumer obligations updated: prior-archival precondition (hard STOP before step 0) added as the first obligation.
- `aeg-root/contracts/developer-reviewer.md` producer obligations updated: prior-archival precondition noted as a prerequisite the Developer must satisfy before producing a valid PR.
- `aeg-root/roles/developer.md` entry gate updated: items 3 (per-task archival gate, before step 0) and 4 (iteration archival gate, before opening PR) added; preamble updated from "validate two things" to "validate the following."
- Planner's readiness gate item 8 (iteration archival, D-042) is unchanged — this decision adds an earlier-firing Developer gate for the same condition; the two gates are complementary.
- Type 2 — reversible.

---

## D-053 — Vāda tool substrate — Option A+B now; external MCP (Option C) deferred

**Date:** 2026-06-21
**Status:** ACTIVE
**Type:** 2
**Lock:** NO
**Authored by:** TL (task/vada-production-v1/D-053)
**Ratified by:** Principal (in-session)

**Context:** S0 spike (PR #154, `apps/vada-ai/specs/tools-capability-spike.md`) established that tool support today is Anthropic-only: `runAnthropicCustomToolLoop` handles custom tools and `ANTHROPIC_TOOL_REGISTRY` handles per-vendor web search, but `callGoogle()` and `callOpenAICompat()` have zero tool handling. Per-vendor web search exists only for Anthropic; Google grounding and OpenAI-compat function calling are not wired. External MCP has no client infrastructure anywhere in the adapter and requires a new `mcp_servers` field in the `@atta/engine` flow-schema — a contract change with blast radius across Vāda + Herald. The decision about MCP scope in T3 was escalated to the Principal as `severity:strategy` per the S0 spike's STOP-AND-ESCALATE notice.

**Decision:** Option A+B now (pure adapter, no engine schema change):

- **(A) Per-vendor tool registries + forwarding:** Add `GOOGLE_TOOL_REGISTRY` and `OPENAI_COMPAT_TOOL_REGISTRY` in `tools.ts`; update `callGoogle()` and `callOpenAICompat()` to accept and forward tools, and handle vendor-specific tool-use responses. Enables `tools: [web_search]` in any YAML to dispatch to the correct vendor-native API across all vendors.
- **(B) OpenAI-compat custom tool loop:** Add `runOpenAICompatCustomToolLoop` mirroring `runAnthropicCustomToolLoop` but using OpenAI's `tool_calls` / `tool_results` message format. Enables Herald-style `custom_tools` declarations on GPT/Grok/Groq agents.
- **OpenRouter plugin-param passthrough** (`plugins`, `models` body params) stays as-is for the future `FUSION-matched` cell — no change in T3 scope.

Option C (external MCP servers) is deferred to a separate future task, gated on a deliberate engine-flow-schema decision.

**Rationale:** A+B is pure-adapter/contained — no engine contract change, no blast radius beyond `@atta/adapter-langgraph` — and is the benchmark prerequisite: reviewers score poorly on DRACO until they have web tools across all vendors. Option C is `severity:strategy`, engine-schema/blast-radius, and must not be coupled to contained adapter work.

**Alternatives rejected:**

- *C-now:* rejected — couples a contained adapter change to an engine-contract change (`mcp_servers` field in `FlowAgentSchema`) with Vāda + Herald blast radius. The right sequencing is: ship A+B as a contained PR; decide MCP schema separately before any MCP work begins.
- *Do-nothing:* rejected — reviewers cannot compete or be fairly benchmarked without web tools across Google, OpenAI-compat, and xAI vendors. The DRACO benchmark is a production exit criterion; this gap blocks it.

**Consequences:**

- T3 in `aeg-root/iterations/vada-production-v1.md` is scoped to Option A+B only; external MCP equipping is removed from T3's boundary.
- A backlog entry for Option C (external MCP equipping) is added to `vada-production-v1.md` with an explicit `Conforms-to: D-053` marker and a note that engine-schema decision gates it.
- Type 2 — reversible.

---

## D-054 — No-Issue tasks are not dispatchable — Developer and Brief Author hard-STOP on #TBD; Issue-cutting is the enforced backlog→todo promotion

**Date:** 2026-06-22
**Status:** ACTIVE
**Type:** 2
**Lock:** NO
**Authored by:** Developer (task/aeg-issue-gate)
**Ratified by:** Principal (on merge)
**Conforms-to:** D-052

**Context:** During the session that planned vada-production-v1, herald-agents-v2, and aeg-governance-ui-v2, tasks were dispatched with `#TBD` in their Issue column — meaning no forge Issue had been cut before work started. This left merged PRs with no Issue to derive status from (the Studio progress bar reads 0% because there is nothing to match), and means `Closes #N` could not be written in the PR body. The AEG model already defines that assigning an Issue is the `backlog → todo` promotion (`iterations/README.md` §3) and that `backlog` tasks are unassigned Issues — but this was never enforced at the Developer entry gate or the Brief Author's Dig stage. D-052 established the prior-archival gate pattern (contract-level hard-STOP on skipped Archivist steps, detectable from the forge); this decision applies the same pattern to the Issue-existence precondition.

**Decision:** A task whose topology entry has `#TBD` or a blank Issue column has no forge Issue — it is **backlog**, not `todo`, and is **not dispatchable**. Two hard-STOP gates enforce this:

1. **Developer entry gate (item 3, before step 0).** Before executing step 0, the Developer checks the iteration topology file for a real GitHub Issue number. If the column is `#TBD` or blank, STOP: *"Task <id> in iteration `<name>` has no Issue (#TBD) — it is backlog, not dispatchable. The Planner must cut the Issue and promote it to todo before this task can start."*

2. **Brief Author precondition (Dig stage check (a), before Draft).** Before authoring a brief, the Brief Author checks the topology file for a real Issue number. If `#TBD` or blank, STOP — do NOT author the brief: *"Task <id> in iteration `<name>` has no Issue (#TBD) — it is backlog, not dispatchable. The Planner must cut the Issue first."* Catches the gap one stage earlier than the Developer gate.

Cutting the Issue and recording its number in the topology table is the Planner's act of backlog → todo promotion. Not every task must have an Issue at plan time — backlog tasks may remain `#TBD` until promoted. But before any task is briefable or executable, the Planner must cut its Issue. This obligation is added to `roles/planner.md` (hard gate in plan-integrity gates) and `contracts/planner-brief.md` (producer obligation).

**Alternatives rejected:**
- *CI check on PR body for `Closes #N`:* rejected — would catch the gap at PR-open time, after the Developer has already done the work. The Developer gate fires before step 0 (zero work done); catching it at PR-open is too late and wastes the Developer's session.
- *Allowing work to start with #TBD if the Issue is cut mid-session:* rejected — the brief cannot carry `Closes #N` at opening time, the PR body is frozen at open, and the Issue number must be deterministic before work starts. A "cut it mid-session" approach leaves a window where the forge has no Issue to track status from.
- *A script that auto-creates the Issue from the topology entry:* rejected — AEG is a human-run protocol; Issue-cutting is a Planner judgment act (naming, labeling, dependency linking), not a mechanical derivation. The enforcement must live in the protocol itself, not in tooling.

**Consequences:**
- `aeg-root/roles/developer.md` — entry gate: new item 3 (Issue-existence precondition, hard STOP before step 0); existing items 3 and 4 renumbered to 4 and 5. Trailing note updated to distinguish forge-read gates (items 4, 5) from the topology-read gate (item 3).
- `aeg-root/contracts/brief-developer.md` — consumer obligations: new Issue-existence precondition bullet (before the archival bullet); archival bullet's developer.md item reference updated (3 → 4).
- `aeg-root/skills/brief-authoring/SKILL.md` — Dig stage precondition block restructured: from two D-052 checks to three checks (Issue-existence (a), per-task archival (b), iteration archival (c)); contract-conformance checklist gains Issue-existence item; anti-patterns section gains Issue-existence anti-pattern; archival anti-pattern reference updated (items 3 and 4 → items 4 and 5).
- `aeg-root/roles/planner.md` — "What you produce" updated: Issue-cutting obligation made explicit; hard gate added to plan-integrity gates: refuse to dispatch a task whose Issue column is `#TBD`.
- `aeg-root/contracts/planner-brief.md` — producer obligations: Issue-cutting precondition bullet added as first obligation.
- Type 2 — reversible.

---

## D-055 — Tasks-are-Issues: forge Issues as canonical task source; thin file is topology-only

**Date:** 2026-06-22
**Status:** ACTIVE
**Type:** 3
**Lock:** NO
**Authored by:** TL (task `aeg/tasks-are-issues`, 2026-06-22)
**Ratified by:** Principal (in-task brief)

**Context:** D-029 declared "a task IS a GitHub Issue" but practice drifted: live iterations (`vada-production-v1`, `herald-agents-v2`) used `#TBD` placeholders in the Issue column and stored task prose and the Planner's rationale entirely in the iteration `.md` file. The thin file thereby functioned as both a task-definition store and a topology map — duplicating or replacing the Issue. An iteration with `#TBD` rows cannot be dispatched from the forge; the Brief Author must load the `.md`, not query the Issue, to read the rationale. The result contradicts the cardinal rule: "the forge holds what is happening; the file and the issue hold the plan." D-054 enforced the dispatch gate; D-055 establishes the stronger form — the model-level rule that rationale lives on Issues and the thin file is topology-only.

**Decision:**

1. **Cutting forge Issues IS the Planner's canonical plan act.** An iteration is not fully planned until every task row has a real forge Issue number. `#TBD` is forbidden in any dispatched or active iteration — it signals an incomplete plan, not a placeholder to fill later. (D-054 makes this a dispatch hard-STOP; D-055 makes it a Planner model obligation.)

2. **The thin file is topology-only.** `aeg-root/iterations/<name>.md` holds the task→Issue link, `depends-on` edges, `conflicts-with` edges, iteration grouping, and the backlog lane. It does NOT hold task prose, boundary descriptions, or the Planner's rationale. The thin file is a routing map; the Issue is the task definition.

3. **The Planner's rationale lives on the Issue body.** The seven rationale fields (Boundary, Sizing, Project(s)+blast radius, Dependency rationale, Traps to avoid, Suggested agent-class, Stop-and-escalate) are written into the Issue body at plan time. The Brief Author reads them from the Issue — the forge artifact — not from the `.md`. This makes the `planner-brief` contract's carrier the Issue, not the iteration file.

4. **A required Issue template** (`.github/ISSUE_TEMPLATE/aeg-task.md`) enforces the minimal metadata structure — iteration label, project labels, `depends-on`, `conflicts-with`, ticket link — and nothing else per §9 (no planning metadata). The Planner's rationale is free-form in the body below the template fields.

**Supersedes:** `iterations/README.md` §11's language about "the file carries the Planner's rationale for each task" — which is corrected to "the Issues carry the Planner's rationale; the file carries the topology." The §11 durability rule (iterations are never deleted) remains fully intact: the archived file carries the durable topology; the Issues (frozen forge artifacts) carry the durable rationale. Neither is deleted; neither duplicates the other.

**Alternatives rejected:**
- Keep rationale in both thin file and Issue: rejected — duplicates content; when the Brief Author or Principal annotates the rationale on the Issue, the file drifts.
- Keep rationale only in thin file: rejected — requiring Brief Authors to load the iteration file for every task confirms the Issue is not actually the canonical source. The forge is the interface; the file is the archive.

**Consequences:**
- `iterations/README.md` §4 updated: thin-file format explicitly forbids rationale blocks; states that the Issue carries the rationale. §11 updated: "Issues carry rationale; the file carries topology."
- `roles/planner.md` §"What you produce": Issue-cutting named as the canonical plan-completion act; two new hard gates added: refuse `#TBD` rows in the topology (Planner-model obligation, complements D-054's dispatch gate); refuse rationale written into the thin file.
- `contracts/planner-brief.md`: hand-off carrier section clarified — the carrier is the Issue body (not the iteration file row) (D-055).
- `.github/ISSUE_TEMPLATE/aeg-task.md` created.
- `vada-production-v1.md` and `herald-agents-v2.md`: thinned to topology-only; rationale moved to the created Issues (#167–#188); `#TBD` replaced with real Issue numbers.

---

## D-056 — Brief-contract task-status coherence

**Date:** 2026-06-23
**Status:** ACTIVE
**Type:** 2
**Lock:** NO
**Authored by:** TL (aeg/brief-coherence-contract, 2026-06-23)
**Ratified by:** Principal (in-task brief)

**Context:** Three structural failures in recent sessions allowed tasks to be authored and executed on top of unarchived priors:
1. "merged" was treated as "done" when the real archival bar is all three: Issue-closed + PR-in-main + provenance-present. A merged PR whose Issue remains open or whose provenance block is absent passes through the existing D-052 gate only partially.
2. The per-task Archivist's Issue-close was best-effort — relying on GitHub's `Closes #N` auto-close, which is advisory and does not reliably fire across all branch/merge configurations. This meant the Issue could remain open after merge with no mandatory step catching it.
3. "Accepted backfill of old provenance" was misread as "the gate doesn't apply to this new task" — conflating a permitted historical debt record with a bypass of the active-prior archival requirement.

The brief contract (`aeg-root/contracts/brief-developer.md`) is the enforcement point: both the Brief Author (Dig stage) and the Developer (entry gate) read it before proceeding.

**Decision:**

1. **Three-predicate archival bar (Issue-closed + PR-in-main + provenance-present).** A prior task is "done" only when all three predicates hold. The Brief Author and Developer MUST verify all three for every in-scope prior task before proceeding. "PR merged" alone is not sufficient.

2. **Scope of "prior task" is explicit.** Three cases, each stated: mid-iteration task (every earlier task in the same iteration that this task depends on); first task of an iteration (the entire previous iteration for that product must be archived); all tasks (every cross-iteration dependency declared in the topology must satisfy all three predicates).

3. **Accepted-backfill distinction.** Deferring provenance backfill on already-closed historical iterations is a permitted debt record. Proceeding with new work while an active prior task's archival is incomplete is not. An accepted historical backlog is a debt record, not a gate bypass. The coherence precondition applies to active prior tasks; it cannot be waived by citing accepted historical gaps.

4. **Single-closer rule.** The per-task Archivist closes the task Issue as an explicit, mandatory step via `gh issue close <N>`. GitHub's `Closes #N` auto-close is advisory-only (unreliable across branch/merge configs). One closer: the Archivist. The Archivist confirms the closed state after running the command.

5. **Proactive status report.** Before beginning any brief-authoring or execution phase, the chat-surface role proactively reports the coherence status of all three predicates for every in-scope prior task to the Principal. The pattern is detect-and-INFORM, not only detect-and-refuse. Silence is not an acceptable "all good" signal.

**Alternatives rejected:**
- Tighten only the Developer gate: rejected. The Brief Author gate fires one stage earlier and catches the gap before a brief the Developer will immediately refuse is dispatched. Both gates must encode the full three-predicate bar.
- Rely on CI to detect open Issues after merge: rejected. D-052's rationale applies equally here — AEG enforcement lives in the protocol, not in CI infrastructure.
- Leave auto-close as the issue-closing mechanism: rejected. GitHub auto-close is advisory, fires inconsistently across merge configurations, and creates a race condition between merge and Issue-close that breaks the provenance check. An explicit mandatory Archivist step removes the ambiguity.

**Consequences:**
- `aeg-root/contracts/brief-developer.md`: new "Task-status coherence precondition" section added (hard-STOP section with three-predicate bar, scope definition, accepted-backfill distinction). Consumer obligation (Developer) updated to reference the new section. Producer obligation (Brief Author) updated to mandate the same check.
- `aeg-root/skills/brief-authoring/SKILL.md`: Dig stage precondition checks rewritten to use three-predicate bar; accepted-backfill distinction added; contract-conformance checklist item updated; anti-pattern updated.
- `aeg-root/roles/archivist.md`: checklist item 1 (Issue closed) rewritten as an explicit mandatory step via `gh issue close <N>`; auto-close noted as advisory-only; single-closer rule stated.
- `aeg-root/aeg-manual-flow.md`: §4.5 conversational protocol extended with step 8 — proactive coherence status report before any brief-authoring or execution phase (detect-and-INFORM).

---

## D-057 — Retire now.md; current state derived from the forge

**Date:** 2026-06-23
**Status:** ACTIVE
**Type:** 2
**Tier:** 3
**Lock:** NO
**Authored by:** Developer (aeg/retire-now-md, 2026-06-23)
**Ratified by:** Principal (in-task brief)

**Context:** `now.md` (global at `aeg-project/` and per-product at `apps/*/aeg-project/`) was a hand-maintained file holding active work, next candidates, and blocked tasks. It drifted continuously: archivists updated it manually, sessions started with stale in-flight sections, and its "Next 3 things" section was always behind the forge reality. The file was a derived-state proxy for information the Git forge already holds exactly — open Issues by iteration label, open PRs, `aeg:blocked` labels — with zero maintenance cost. D-029 declared "task status is derived from the forge, never stored," but now.md was still being written as if active-work status belonged in a file. D-055 and D-056 further tightened forge-primacy, making now.md the last remaining hand-maintained derived-state file. This decision is the capstone of the forge-as-source-of-truth direction established by D-029, refined by D-055/D-056.

**Decision:**

1. **`now.md` is retired everywhere.** The global `aeg-project/now.md` and all per-product `apps/*/aeg-project/now.md` files are deleted. No new `now.md` is ever created.

2. **Current execution state is derived from the forge, not read from a file.** Agents orient by running:
   - "What's active?" → `gh issue list --label "iteration:<slug>" --state open`
   - "What's next?" → open Issues in the iteration without an assigned open PR
   - "What's blocked?" → `gh issue list --label "aeg:blocked" --state open`
   - "What merged recently?" → `gh pr list --state merged --limit 20`

3. **Durable non-derivable knowledge moves to `state.md`.** Anything `now.md` held that the forge genuinely cannot derive — known production issues, env-var requirements, phase intent, pending manual operations — moves to `state.md` under a "Pending manual operations" section. Active-work status (what's in-flight, what's next) does not move because the forge derives it exactly.

4. **"Current focus" is expressed as a one-line pointer in `state.md`** ("Current focus: <iteration>"). This is the simplest approach: no label-convention changes needed, no new forge label vocabulary, readable in one line. The pointer is updated by the Iteration Archivist at close-out (clearing the previous iteration's focus, pointing at the next one when the Principal declares it).

5. **The `iteration-archivist-planner.md` contract is updated.** The Iteration Archivist's producer obligations drop from four artifacts to three: archived iteration file + updated `state.md` + retrospective in `lessons.md`. The "what's next" artifact is eliminated — the Planner derives next candidates from the forge directly.

**Alternatives rejected:**
- *Keep now.md but auto-generate it from the forge:* rejected — the auto-generated version would be stale the moment it was written; it creates a false sense of a file being authoritative. The forge query is always fresher and costs nothing.
- *Replace now.md with a priority label convention:* rejected — label conventions require a new vocabulary decision, add forge-maintenance overhead, and are no more queryable than the existing `iteration:<slug>` + `aeg:blocked` pattern already in place.
- *Keep now.md for "Pending manual ops" only:* rejected — `state.md` already carries non-derivable operational facts; adding a separate file for pending-manual-ops is unnecessary fragmentation.

**Consequences:**
- `aeg-project/now.md` and all `apps/*/aeg-project/now.md` files deleted.
- `aeg-root/coordination.md`: reading order updated (now.md → forge queries); "Session-start forge queries" section added; PM files table updated; TL and Archivist session-start protocols updated; "When state changes" section updated; "What goes where" table updated.
- `aeg-root/state-machine.md`: mutation matrix row updated; authority hierarchy updated.
- `aeg-root/process.md`: Phase 6 and Phase 13 step 4 updated.
- `aeg-root/aeg-manual-flow.md`: living-state layer description updated; Archivist close-out updated.
- `aeg-root/contracts/iteration-archivist-planner.md`: hand-off reduced from four to three artifacts; now.md retirement noted; consumer obligations updated to forge-query pattern.
- `aeg-root/contracts/archivist-iteration-archivist.md`: "follow-up Issues" row updated.
- `aeg-root/roles/iteration-archivist.md`: Step 4 (now.md update) removed; output format updated.
- `aeg-root/roles/archivist.md`, `team-leader.md`, `developer.md`, `principal.md`: now.md references replaced.
- `aeg-root/projects.md`: multi-project fan-out note updated.
- `aeg-root/skills/aeg/SKILL.md`, `aeg-roles/SKILL.md`, `brief-authoring/SKILL.md`: now.md references replaced.
- `aeg-root/diagrams/system-architecture.md`: diagram labels updated.
- `aeg-project/state.md`: "Current focus" section added; "Pending manual operations" section added with items relocated from now.md; now.md removed from living-state list; doc-system section updated.
- Per-product `state.md` files: "Pending manual operations" sections added with items relocated from their now.md.
- `aeg-project/changelog.md`, `aeg-project/lessons.md`: nav links updated.

---

## D-058 — Doc/spec/skill coherence is bidirectional: read obligation (Planner + Brief Author) + write obligation as DoD gate

**Date:** 2026-06-23
**Status:** ACTIVE
**Type:** 2
**Tier:** 3
**Lock:** NO
**Authored by:** Principal

**Context:** Documentation coherence was enforced only on the output side: the brief's §7 doc-update list required Tier 1+ briefs to name docs, and `verify-docs` gated on their presence. But neither the Planner nor the Brief Author was required to *read* the relevant specs/skills/docs before planning or briefing. The result: tasks could be planned and briefed in ignorance of the documented surface they were about to change — the Planner would name docs in the rationale only if they happened to know about them already, and the Brief Author's §7 list was populated from memory rather than from reading. This is the input-side gap. Separately, §7 was framed as a section requirement rather than a hard DoD gate — `verify-docs` checks presence and structural correctness, but not content coherence; the Reviewer's doc-coupling check was advisory, not a formal BLOCKER. Doc coherence is the same class of obligation as test coverage: both exist to prevent a change from making a surface unreliable, just for different consumers (agents vs. humans reading docs). The input side (read) and output side (write) are two halves of one principle: you cannot keep docs coherent if you haven't read them first, and reading them is worthless if you don't update them.

**Decision:**

**Pillar 1 — Read obligation (input side).**

The **Planner**, before cutting tasks, MUST:
1. Identify any specs/skills/docs relevant to the work's code surface.
2. Read them.
3. Plan tasks knowing the documented surface — including which docs each task will make incoherent (the new "Docs to keep coherent" rationale field, which feeds the Brief Author's §7).

The **Brief Author**, before writing a brief, MUST:
1. Identify any specs/skills/docs relevant to this task's code surface.
2. Read them.
3. Write the brief knowing that surface: (a) surface in Context (§2) what the Developer must know from those docs, and (b) populate §7 from this reading — naming every doc the task will make incoherent.

This obligation is **conditional on docs existing**. AEG assumes no specific external structure and names no specific folder. If no specs/skills/docs exist for a given code surface, the read obligation is trivially satisfied. The obligation is the act of identifying and reading whatever exists. This generalizes the existing spec-check gate (previously applied only to strategic questions about a named product with unread specs) to all task-planning and brief-authoring.

**Pillar 2 — Write obligation as DoD gate (output side).**

A task MUST update every doc it makes incoherent. This is a Definition-of-Done gate, parallel to tests: a task that ships passing tests but incoherent docs is incomplete in the same way as a task that ships with failing tests. The §7 doc-update list in the brief is the DoD obligation list — not a recommendation, not a reminder. The Developer treats §7 as a deliverable checklist; a named doc not updated is a BLOCKER at review. `verify-docs` continues to gate structural presence; the Reviewer now gates content correctness as a BLOCKER, not an advisory check.

**Alternatives rejected:**
- *Leave it to verify-docs alone:* rejected — verify-docs checks presence and structural correctness, not content coherence. A doc can be present and pass CI while being wrong. The Reviewer's doc-coupling check is the content gate; this decision makes it a BLOCKER gate, not advisory.
- *Apply only to Tier 1+:* rejected — the read obligation applies regardless of tier because the Planner and Brief Author cannot know in advance whether any docs will be affected. The write obligation (§7) already tracked tier; that tiering is unchanged.
- *Apply only when specs exist in a known folder:* rejected — AEG is a portable methodology; hardcoding a folder creates coupling. The conditional is "if docs exist, read them" — the Planner/Brief Author is responsible for identifying what exists.

**Consequences:**
- `aeg-root/roles/planner.md`: Readiness gate item 2 upgraded from "reachable" to "read"; rationale required fields gain an 8th field: **Docs to keep coherent** — which specs/skills/docs this task will make incoherent, named explicitly for the Brief Author's §7. Hard gate added: refuse to plan without having read the relevant docs.
- `aeg-root/skills/brief-authoring/SKILL.md`: Dig stage gains explicit read-obligation step (identify + read relevant docs before Draft); contract-conformance checklist gains a docs-read + §7-populated check; anti-patterns gain one entry (skipping the read-obligation Dig step).
- `aeg-root/contracts/planner-brief.md`: New contract row: **Docs to keep coherent** → §7 documentation-update list. The Planner's 8th rationale field maps to the Brief Author's §7.
- `aeg-root/contracts/brief-developer.md`: New contract row: **Documentation-update list (§7)** → Developer updates every named doc before claiming done. §7 is a formal DoD obligation in the contract.
- `aeg-root/contracts/developer-reviewer.md`: New contract row: **§7 doc-update list honored** → Reviewer verifies every named doc was updated and correct. A §7-named doc absent from the diff or present but wrong is a BLOCKER.
- `aeg-root/roles/developer.md`: "Documentation is part of every task" section updated with DoD framing.
- `aeg-root/roles/reviewer.md`: Doc coupling (item 6) updated: a §7-named doc not updated is a BLOCKER, not a MAJOR.

---

## D-059 — Iteration task states are todo → in-flight → in-review → done; backlog is project-level only

**Date:** 2026-06-23
**Status:** ACTIVE
**Type:** 2
**Tier:** 3
**Lock:** NO
**Authored by:** Developer (dispatched by Principal)

**Context:** D-029's §3 status table defined `backlog` as "Issue open, unassigned" — a derived state an iteration task could reach. A subsequent design principle clarified that the project-level backlog (ideas/maybe-tasks in markdown) is distinct from an iteration's committed work. That distinction makes `backlog` incoherent as an iteration-task state: once a task is placed in a launched iteration it is committed work, not a maybe-idea. In practice, every open unassigned task in `vada-production-v1` — including T3a, T4, T5, and others — renders as "Backlog" on the AEG Studio board despite being real, committed iteration work. The mislabeling misrepresents the board and the project's actual execution state.

**Decision:**

Inside a launched iteration, the only task states are:

| Status | Derived from (the forge fact) |
|--------|-------------------------------|
| `todo` | Issue open, regardless of assignment; or no forge facts known yet (unqueried task) |
| `in-flight` | A branch `task/<iteration>/<n>` exists, no PR open |
| `in-review` | PR open |
| `changes-requested` | PR open, `reviewDecision: CHANGES_REQUESTED` |
| `merged` | PR merged (Issue auto-closes) |
| `blocked` | An `aeg:blocked` label is present |

`backlog` is removed from iteration derivation. The `'backlog'` value in the `DerivedStatus` union type is retained for potential future project-level views; `deriveIteration` / `deriveStatus` no longer emit it for any iteration task.

**Consequences of the "no forge facts" case:** tasks with no Issue number (`#TBD`) are absent from the forge query and thus absent from the facts map. They now derive `todo` instead of `backlog` — still committed iteration work, still not dispatchable without an Issue (the Developer and Brief Author hard-STOP on `#TBD` per D-054). Showing them as `todo` rather than `backlog` better signals "this needs an Issue cut" than the prior `backlog` signal which looked optional.

**Supersedes:** D-029's backlog-inside-iteration definition ("Issue open, unassigned → backlog").

**Alternatives rejected:**
- *Keep `backlog` for the unassigned case, add a separate "pending" status for unqueried tasks:* rejected — two near-identical statuses add confusion and complexity. The design principle is "once in an iteration = committed work = minimum todo." Unassigned and unqueried are both pre-work states deserving the same `todo` signal.
- *Remove `backlog` from the `DerivedStatus` type entirely:* rejected — project-level views may legitimately need the value for non-iteration contexts. Stop emitting it from iteration derivation; keep it in the type.

**Consequences:**
- `packages/aeg-core/src/derive-iteration.ts`: `deriveStatus` never returns `'backlog'`; both the "no facts" case and the "open + unassigned" case return `'todo'`; the `??` fallback in the second pass updated.
- `packages/aeg-core/src/types.ts`: `ForgeFacts` JSDoc updated; `DerivedStatus` retains `'backlog'` in the union.
- `packages/aeg-core/src/derive-iteration.test.ts`: tests updated to expect `'todo'` where previously `'backlog'` was expected.
- `aeg-root/iterations/README.md`: §3 status table updated (backlog removed; open+unassigned → todo); §11 planned-phase description updated.
- `aeg-root/state-machine.md`: inline status derivation sentence updated.
- `aeg-root/aeg-manual-flow.md`: §2 task model status table updated.
- `aeg-root/roles/developer.md`: entry gate item 3 STOP message updated (remove "it is backlog" language for `#TBD` tasks).
- `aeg-root/contracts/brief-developer.md`: same gate updated.
- `aeg-root/contracts/planner-brief.md`: "backlog → todo promotion" language updated.
- `apps/aeg/web/studio/src/app/projects/[name]/iterations/[slug]/_lib/status-display.ts`: `'backlog'` removed from `STATUS_ORDER`; comment updated.
- `apps/aeg/web/studio/src/lib/forge/load-snapshot.ts`: unavailable-fallback returns updated; JSDoc comment updated.
- `apps/aeg/web/studio/src/lib/forge/types.ts`, `map-forge-facts.ts`, `fetch-forge-facts.ts`: comments updated.
- `apps/aeg/web/studio/src/app/projects/[name]/iterations/[slug]/board/page.tsx`, `page.tsx`: user-facing "shown as backlog" messages updated.
- `apps/aeg/web/studio/README.md`: progress-counts description updated.

---
