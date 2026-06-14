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
