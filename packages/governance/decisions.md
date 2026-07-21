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

## D-060 — Cross-Product Theme Centralization under Attalabs

**Date:** 2026-06-25
**Status:** ACTIVE
**Type:** 1
**Tier:** 3
**Lock:** YES
**Authored by:** TL (centralization task, June 25, 2026)
**Ratified by:** Principal (pending)

**Context:** Originally, each product database (Vāda, Vitakka, Herald, Attā) had its own local desk structure and database-level references to themes and component libraries, creating redundant copies of themes across datasets. Swapping/altering project URLs directly caused domain confusion (atta vs attalabs subdomains).

**Decision:**
- Store and manage themes (`uiTheme` schema) and component libraries (`library` schema) **exclusively** in the central Attalabs database (`l5n0n8nn` -> `attalabs.sanity.studio`).
- Keep the original project ID mappings (`atta` = `892o2m9f`, `attalabs` = `l5n0n8nn`) so that the Sanity URLs match the product names exactly:
  * `https://atta.sanity.studio/` points to project `892o2m9f` (`atta`).
  * `https://attalabs.sanity.studio/` points to project `l5n0n8nn` (`attalabs`).
- Modify `getProductUiConfig` in the `cms` package to resolve theme/library IDs dynamically from the central `attalabs` database, supporting both legacy reference objects and new string IDs.
- Hide the "Themes" and "Libraries" editor sections from the sidebars in other product studios (Vāda, Vitakka, Herald, Attā).
- Migrate all existing 19 themes and 4 libraries from the old project `892o2m9f` to the central `l5n0n8nn` database.

**Alternatives rejected:**
- *Swapping project subdomains:* Rejected because it causes extreme user confusion with Sanity's domain configuration.
- *Inline definitions:* Rejected because the central registry database is the single source of truth.

**Consequences:**
- `packages/cms/src/client.ts` (restored original IDs)
- `packages/cms/src/queries/product-ui-config.ts` (dynamic resolver + legacy support)
- `packages/cms/sanity.config.ts` (custom desk filters)
- `packages/cms/sanity.cli.ts` (reverted mapping)
- `tools/admin/src/app/[project]/themes/actions.ts` (admin tool writes to attalabs client)
- `apps/herald-ai/specs/herald-app-architecture.md` (noted dynamic resolution of library string IDs)
- `aeg-project/state.md` (added `SANITY_API_TOKEN_ATTALABS` manual setup item)

---

## D-061 — Herald: owner `/ui` + `/settings` relocated under `/[username]/(owner)/`; topbar icon buttons via `extraActions`

**Date:** 2026-06-25
**Status:** ACTIVE
**Type:** 1
**Tier:** 3
**Lock:** NO (the relocation itself is reversible; the D-035 invariant it preserves remains Lock: YES)
**Authored by:** Developer (dispatched by Principal, herald-agents-v2 task 8, #210 / PR for this branch)
**Ratified by:** Principal (in-session)

**Scope:** Herald (`apps/herald-ai/web`) + one mobile-section rewrite in `packages/ui/topbar/index.tsx` (responsive collapse — see part (3) below). No engine/adapter change. Vāda's cosmetic blast radius: its existing `extraActions` Settings icon now appears inside the mobile hamburger sheet (previously hidden < md) — strict accessibility improvement.

**Context:** D-036 placed Herald's owner-only appearance editor (`/ui`) and Settings hub (`/settings`) as flat routes inside the `(app)` route group, with `HeraldTopBar` carrying Bulk Audit / UI / Settings / `/username` as centered nav links. The editor and Settings both target the signed-in user's own profile, so the URL space wants them in the same identity namespace (`/[username]/ui`, `/[username]/settings`); the duplicate UI + Settings labels on the public profile topbar were nav clutter. A naive relocation under `app/[username]/` would inherit the parent layout's `EnvoyLibraryShell` and render the owner editor on the visitor's library — a direct D-035 (Lock: YES) regression.

**Decision:**

1. **Route-group split under `app/[username]/`.** Two sibling layouts replace the previous flat layout:
   - `app/[username]/(profile)/layout.tsx` wraps the public profile with `EnvoyLibraryShell` (user library) + `EnvoyShell`. Renders `(profile)/page.tsx`.
   - `app/[username]/(owner)/layout.tsx` is a server-component layout that runs auth + ownership gating (anonymous → `/sign-in`; non-onboarded → `/onboarding`; signed-in but `user.username !== segment` → `notFound()`) and wraps owner pages with `CandidateShell` fed the **build-time** library id (mirroring `app/(app)/layout.tsx`) + the same `HeraldTopBar` used everywhere else in app chrome. Renders `(owner)/ui/page.tsx` and `(owner)/settings/page.tsx`.
   - `app/[username]/layout.tsx` becomes a metadata-only passthrough (icon route + `return children`). It deliberately does not introduce any `LibraryProvider` — the route-group split is the structural enforcement of "owner chrome = build-time library, profile = user library."
   - `app/(app)/ui/` and `app/(app)/settings/` are **deleted** with no redirect. Sweeps: `proxy.ts` matchers, `api/admin/profile/route.ts` `revalidatePath` calls, internal `href` links.

2. **Topbar buttons via the existing `extraActions` slot.** Herald-local — no prop-surface change to `@atta/ui/topbar`.
   - `HeraldTopBar` takes an optional `context: 'main' | 'owner'` prop. With `context='main'` (default, used by `(app)/layout.tsx`), `signedInLinks` = Bulk Audit + `/username`. With `context='owner'` (used by `(owner)/layout.tsx`), `signedInLinks` = `/username` only — the owner appearance/settings space does not double up with the audit nav. The Settings gear in `extraActions` is the single navigation between the two owner surfaces.
   - `HeraldTopBar.extraActions` = Settings button → `/{me}/settings` whenever signed in + onboarded. Renders with the same responsive icon+label pattern as `HeraldAccountMenu` (icon-only ≤ md, icon + "Settings" ≥ md), so the right cluster reads as two equally-weighted labelled buttons (Settings · Sign out) rather than one unlabelled icon next to a labelled button.
   - `envoy-shell.tsx` `signedInLinks` = `[]` on the public profile topbar (Bulk Audit excluded per the brief; UI + Settings replaced by the Theme icon+label button).
   - `envoy-shell.tsx` `extraActions` = Theme button (Palette icon + "Theme" label) → `/{username}/ui` only when `isOwner`. The Settings gear is intentionally NOT mirrored on the profile topbar — the main `HeraldTopBar` is the single Settings entry point.
   - All three buttons (Settings · Theme · Sign out) render with the same outline icon+label style (`h-8 gap-2 px-2.5 text-xs md:px-3`), so the right cluster reads as a row of equally-weighted labelled affordances. "Theme" is preferred over "UI" because it labels the user-facing concept (visual styling of the public profile) rather than the implementation noun.

3. **Responsive collapse — shared `@atta/ui/topbar` update.** Below `md` the topbar collapses to logo · `ColorSchemeToggle` · hamburger. `extraActions` and `accountMenu` no longer render in the mobile actions row; they move into the hamburger sheet (after the nav links, before Sign-in). The hamburger renders unconditionally below `md`. Single mobile-section rewrite inside `packages/ui/topbar/index.tsx`; the prop surface (`signedInLinks`, `extraActions`, `accountMenu`, `isSignedIn`) is unchanged.
   - **Vāda impact:** Vāda's `(main)/layout.tsx` already passes an `extraActions` Settings icon button; before this change it was hidden below `md` (the mobile row never rendered `extraActions`); after this change it appears in Vāda's hamburger sheet at narrow widths — strictly an accessibility improvement.
   - **AEG Studio:** uses `withAuth={false}` → `TopBarNoAuth`, unaffected.
   - The brief's stop-and-escalate clause guarded against a collision with vada-production-v1/6 (#181, SmartTextInput extraction). #181 is not currently open, the files are disjoint (`packages/ui/topbar/index.tsx` vs. `packages/ui/smart-prompt-input/*`), so the collision is not triggered. Principal authorised the change in-session.

4. **D-035 preservation is by construction.** The two sibling route groups feed their own `LibraryProvider`s; the empty `[username]/layout.tsx` exists to NOT inherit one to a child. The verification recipe in `herald-app-architecture.md` §4 is extended: setting `user.library = retro` must leave `/bulk-audit`, `/onboarding`, `/[username]/ui`, and `/[username]/settings` on the build-time library; only `/[username]` switches.

**Supersedes:** D-036's route layout for `/ui` + `/settings` and its `HeraldTopBar` nav-link treatment of UI + Settings. The rest of D-036 (flat `/bulk-audit` + `/onboarding`, single shared `HeraldTopBar`, no avatar, themed `HeraldAccountMenu` sign-out) remains in force. D-035 (Lock: YES) is preserved unchanged.

**Alternatives rejected:**

- *Drop the route group and make `/ui` + `/settings` plain children of `app/[username]/`.* Rejected — they would inherit `EnvoyLibraryShell`, violating D-035 (Lock: YES). The route-group split is the cheapest structural guarantee.
- *Modify `@atta/ui/topbar` to expose a new owner-actions API.* Rejected — `extraActions` already exists and is unused by Vāda. A shared change would collide with vada-production-v1/6 (#181, SmartTextInput extraction) on the same package; serializing cross-iteration work to win a small ergonomic gain is the wrong trade. The brief's stop-and-escalate clause flagged exactly this risk.
- *Keep UI + Settings as centered nav links, just rewrite the hrefs.* Rejected — nav-link clutter on the profile topbar was half the motivation; icon buttons match the right-cluster affordance already used (theme toggle, account menu, CV download/open).
- *Also place a Settings gear on the public-profile topbar (mirroring the main one).* Rejected — duplication is a maintenance burden; the main `HeraldTopBar` is on every other route a signed-in user visits; one-line extension if the need surfaces.

**Consequences:**

- `apps/herald-ai/web/src/app/[username]/(owner)/layout.tsx` (new), `(profile)/layout.tsx` (new), `(owner)/ui/page.tsx` + `(owner)/settings/page.tsx` + `(profile)/page.tsx` (relocations).
- `app/[username]/layout.tsx` reduced to metadata + passthrough. `app/(app)/ui/` + `app/(app)/settings/` deleted.
- `components/HeraldTopBar.tsx`: drop UI + Settings links; add Settings (lucide) gear `extraActions` → `/{username}/settings`.
- `app/[username]/envoy-shell.tsx`: empty `signedInLinks`; Palette (lucide) `extraActions` → `/{username}/ui` when `isOwner`; `username` prop threaded from `(profile)/layout.tsx`.
- `proxy.ts` matchers carry `/bulk-audit(.*)` + `/onboarding` only; owner-segment auth lives in the layout.
- `api/admin/profile/route.ts` `revalidatePath` calls updated to `/{username}/ui` + `/{username}/settings`.
- `components/audit/BulkAudit.tsx` + `components/envoy/JDInput.tsx`: the two `/settings?tab=api-keys` links now consume a username-bearing href passed from their respective pages (`bulk-audit/page.tsx`, `EnvoyFlow.tsx`).
- `apps/herald-ai/specs/herald-app-architecture.md` §2 / §3 / §4 rewritten; §4 verification recipe extended to cover the owner-segment routes.
- `apps/herald-ai/specs/herald-decisions.md`: D-061 entry (Herald-local detail; this entry is the cross-product source of truth).
- Reversible. Reversal cost: re-create `app/(app)/ui/` + `app/(app)/settings/`, fold `(profile)` + `(owner)` layouts back, restore `signedInLinks` + delete `extraActions`. The relocation is a routing refactor; the locked invariant under it (D-035) does not move.
- Username reservation: `ui` and `settings` are now unusable as vanity slugs under `/[username]`. The onboarding `check-username` API gains them as reserved values in a small follow-up; both are unlikely vanity URLs and not a blocker.

---

## D-062 — AEG coherence seam: `aeg-root/doc-owners` + `verify-docs` C5 coverage gate

**Date:** 2026-06-25
**Status:** ACTIVE
**Type:** 1
**Tier:** 3
**Lock:** NO (single-file format and dormancy semantics are intentionally narrow; broadening either is a new D-### that supersedes this one).
**Supersedes:** the reservation stub of D-062 (Planner placeholder, never ratified — replaced by this entry).
**Authored by:** Developer (dispatched by Principal, aeg-coherence-v1 task 1, #214)
**Ratified by:** Principal (in-session)

**Context:** D-058 made doc/spec/skill coherence a bidirectional obligation — Planner and Brief Author MUST read the relevant docs before planning/briefing, and the brief's §7 doc-update list is a Definition-of-Done gate the Reviewer enforces as a BLOCKER. But the output side was still presence-only: C3 in `verify-docs` checked "some doc changed" for Tier 1+, not "the doc that owns the surface that just moved changed." There was no machine-readable map from a code-surface glob to the doc that explains it, so the question "you changed `packages/ui/topbar`, did `ui-components/SKILL.md` move?" was mechanically unanswerable — every Reviewer had to remember the entire `code → doc` graph in their head. D-058 closed the read side; D-062 closes the output side. Without it the Planner's §7 list (and any future auto-derivation of it) has no constitutional surface to bind to.

**Decision:**

A single file at `aeg-root/doc-owners` — CODEOWNERS-shaped, one `<code-glob>  <doc-pointer>` per line, `#` comments — is the **single source of truth** for code → doc bindings. `scripts/verify-docs.ts` gains a new check (C5) that, for each changed code file in a PR, glob-matches against every binding and enforces a **bind-or-waive** rule per matched binding:

- **Strong-pass** — in-repo pointer in the PR diff.
- **URL-ack** — pointer is a URL and the PR body carries `Doc-ack: <pointer> — <note>` whose `<pointer>` exactly matches the binding URL.
- **Waiver** — `Doc-waiver: <pointer> — <reason>` in the PR body, per-PR per-binding, logged for audit.
- **Dangling** (a binding whose in-repo pointer doesn't exist on disk) — distinct FAIL with a "fix the binding or add the doc" message, never silently ignored.

`Doc-ack:` and `Doc-waiver:` are **PR-body fields**, parsed from body text — *not* GitHub labels. The closed label vocabulary (Section 14) is unchanged.

**Dormancy is the floor.** If `aeg-root/doc-owners` is absent, OR the file exists but no binding's glob matches any changed code file, C5 returns immediately — no output, no error. The gate has no opinion until a binding is declared. This makes the new code safe to ship to repos that have not yet adopted the seam and lets a repo grow coverage incrementally one binding at a time.

**Tier-orthogonality is the ceiling.** The tier system (Section 9) answers "what class of work is this?"; the coherence seam answers "which docs did *this specific edit* make incoherent?". A Tier-0 PR touching a bound surface MUST satisfy C5; a Tier-3 PR touching no bound surface satisfies C5 trivially. Both gates run; both must pass.

**Glob syntax is deliberately simple** — only `*` (sequence not containing `/`) and `**` (any sequence including `/`) are special. Every other character is literal so Next.js dynamic-route segments like `[username]` match without escaping. This is narrower than CODEOWNERS' `fnmatch` (which treats `[]` as character classes); the narrower surface trades expressive power for plain readability of the four-binding seed.

**Initial seed (four bindings, the seam goes live on day one):**

1. `packages/ui/topbar/**` → `.claude/skills/ui-components/SKILL.md`
2. `packages/ui/libraries/**` → `.claude/skills/ui-library-system/SKILL.md`
3. `apps/herald-ai/web/src/app/[username]/**` → `apps/herald-ai/specs/herald-app-architecture.md`
4. `scripts/verify-docs.ts` → `aeg-root/state-machine.md`

Each pointer path is verified to exist; binding 4 is **self-referential** — this PR edits `scripts/verify-docs.ts` and therefore C5 (in CI on this very PR) requires `aeg-root/state-machine.md` in the diff. Deliverable 1 of this task edits state-machine.md (Section 15 + cross-refs in §9 + §12), so the PR satisfies the gate it introduces.

**Out of scope of this decision** (separately reserved on the iteration backlog, not bundled here):

- **T2** — decision-number reservation + duplicate `D-NNN` check (the failure mode that caused the recent D-060→D-061 renumber).
- **T3** — Planner §7 auto-derivation from `doc-owners` (so the Planner stops hand-curating the list and the brief's §7 cannot drift from the gate's input).
- **T4** — one-time staleness audit of existing skills/specs against current decisions; seeds the manifest beyond the four-binding floor.

**Alternatives rejected:**

- *Extend C3 ("some doc changed") to a stronger heuristic instead of adding C5:* rejected. C3's value is exactly its bluntness — "if you're shipping Tier 1+ code, you owe at least *some* doc update." Adding surface-specific intelligence to C3 would conflate "tier requires docs" with "this code surface has bound docs"; they are orthogonal questions answered by different gates.
- *A multi-file `doc-owners/` directory with one file per project/package:* rejected. The four-binding seed and the foreseeable next 20 bindings fit easily in one file; multi-file ownership re-introduces drift between sibling files for the same code surface. Single-file format is the simpler invariant and is what the dispatched brief specified.
- *Use a full glob library (Bun.Glob, micromatch) with CODEOWNERS' character-class semantics:* rejected. Character classes (`[abc]`) would treat Next.js dynamic-route segments like `[username]` as character classes, not literals — the four-binding seed includes one such path. A simple two-special-character parser (`*`, `**`) is more readable, has no dependency, and matches author intent for paths that contain literal brackets.
- *Use GitHub labels (`doc-ack:*` / `doc-waiver:*`) instead of PR-body fields:* rejected. Labels are a closed-set vocabulary governed by Section 14; per-pointer ack/waiver values cannot be enumerated as labels. Body fields are precedented (`Conforms-to:`, `Tier:`) and let the value carry the pointer string verbatim.
- *Embed C5 in a new `packages/aeg-core` package alongside the derive-iteration logic:* rejected. C5 reads files from disk and the PR body; it is a CI-runner concern that lives in the script that already runs it. Extracting it would couple `aeg-core` to filesystem and env-var assumptions it has no other reason to carry. In-script keeps the parser, the predicates (`isCodeFile`), and the dormancy semantics together.

**Consequences:**

- `aeg-root/doc-owners` (NEW) — the seam's single source of truth; seeded with four bindings (see Decision above).
- `scripts/verify-docs.ts` — adds `parseDocOwners`, `globToRegex`, `evaluateC5`, `runC5`; C5 invoked inside `runPrMode` after C1–C4 (which are unchanged byte-for-byte). Pure evaluator is exported for tests.
- `scripts/verify-docs.test.ts` — adds unit-test coverage for all six paths: strong-pass, strong-fail, url-ack (with the absent-ack mirror), dangling, dormant (absent file + no-glob-fires), waiver, plus a multi-binding case.
- `aeg-root/state-machine.md` — adds Section 15 (Coherence Seam — Doc Coverage); cross-refs from §9 (tier-orthogonality note) and §12 (C5 added to the enforced-mechanisms list).
- `aeg-root/roles/developer.md` — § PR body — canonical form documents `Doc-ack:` and `Doc-waiver:` as body fields; "Documentation is part of every task" frames update-or-waive as a DoD gate explicitly (D-058 + D-062 together).
- `aeg-root/roles/reviewer.md` — doc-coupling check (item 6) updated: presence is now mechanical (C5), the Reviewer judges *correctness of the covered doc*; a passing C5 + an incorrect/no-op doc update is still a BLOCKER.
- `aeg-root/contracts/developer-reviewer.md` — new contract row: **doc-owners coverage (C5)** as a Developer producer obligation and a Reviewer consumer obligation (presence mechanical, correctness judged).
- `aeg-root/iterations/aeg-coherence-v1.tokens.md` — developer row appended at PR-open per D-058's terminal-role obligation.
- **Reversal cost:** delete `aeg-root/doc-owners`; remove the C5 block from `scripts/verify-docs.ts` + tests; remove §15 from state-machine.md and the cross-refs; revert role/contract edits; mark this entry SUPERSEDED. The gate is dormant the moment the file is gone — no consumer code depends on C5 running. The reversal is mechanical because the design forces every dependency to flow through the single file.

**Lock rationale:** `Lock: NO`. The single-file format and dormancy semantics are deliberately narrow scope. Broadening either (multi-file ownership, character-class globs, hard-fail on missing-file dormancy) is a new D-### that supersedes this one — not an in-place edit. Keeping Lock NO preserves the option to walk the seam back to dormant globally without an irreversibility tax; the dormancy floor is what makes that walk-back safe.

---

## D-063 — Coherence completeness: no-doc allow-list + decision-number integrity

**Date:** 2026-07-01
**Status:** ACTIVE
**Type:** 1 (extends the coherence model — not in-place-revisable)
**Lock:** YES
**Authored by:** Developer (T2 #217, aeg-coherence-v1)
**Ratified by:** Principal (in-session, via PR merge of aeg-coherence-v1 T2)

**Context:** D-067 introduced the plan↔forge coherence oracle (`verify-coherence.ts`), D-062 the code→doc coherence seam (doc-owners + C5). Both left two completeness gaps open: (a) no machine-verifiable sequencing within decision logs (D-NNN numbering relied solely on author discipline); (b) the doc-owners manifest had no validity checks — dangling pointers or duplicate globs were silent. D-069 chartered filling both gaps in T2 (#217). This decision defines the canonical behaviors.

**Decision:**

**1. Decision-number integrity within a log (N1/N2).**
Each decision log (global `aeg-project/decisions.md` + per-product `*-decisions.md`) carries its own D-NNN sequence (cross-log collisions are expected — §6). The coherence oracle validates within-log sequencing on every CI run:
- **N1 (hard fail):** Duplicate D-NNN within the same log. A number that appears twice is a copy-paste error or a merge collision; it cannot silently pass.
- **N2 (advisory — never fail):** Skipped D-NNN (gap) within a log. Gaps occur legitimately when a reserved entry is cancelled or when the numbering drifts during offline drafting; they are surfaced as an informational note, not an error.
- **`--next-decision` helper:** `bun scripts/verify-docs.ts --next-decision` reads the global `aeg-project/decisions.md`, finds the maximum D-NNN, and prints the next number to use. This is the canonical way to pick a decision number at brief-authoring time.

**2. Manifest validity (M1/M2/M3).**
`aeg-root/doc-owners` is a CODEOWNERS-shaped file. Bindings accumulate across iterations; stale entries should not survive silently. The oracle validates on every CI run:
- **M1 (hard fail):** A binding's pointer is an in-repo path that does not exist on disk. A dangling pointer is a maintenance regression — either the doc moved and the manifest was not updated, or the pointer was mis-typed.
- **M2 (advisory):** A binding's glob is syntactically invalid per the `globToRegex` grammar. Reported as a note; extremely rare in practice.
- **M3 (hard fail):** Duplicate glob in the manifest. Two entries for the same path pattern produce ambiguous coverage and must be resolved.
URL pointers (`https://…`) are never checked for disk existence — M1 does not apply to them; a `Doc-ack:` in the PR body satisfies their binding at C5 time.

**3. No-doc allow-list convention.**
The completeness scoreboard (advisory, run in `verify-docs --full`) lists `packages/*` and `apps/*` directories that have no doc-owners binding. Many surfaces legitimately need no bound doc (scaffolds, shared configs, stub products). The allow-list exempts them without suppressing the scoreboard for everything else:
```
# no-doc: <glob> — <reason>
```
These lines appear as comments in `aeg-root/doc-owners`. The `parseNoDocRules()` function reads them; the scoreboard skips any directory whose path matches a no-doc glob. They do NOT affect C5 (C5 only fires when a changed file matches a binding; no-doc lines create non-bindings, not exemptions from binding).

**Boundaries:**
- N2 and M2 are permanently advisory. Making N2 hard-fail would break every repo that retired a reserved decision number; making M2 hard-fail would require precise glob grammar documentation that isn't worth the noise for an extremely rare failure mode.
- The completeness scoreboard is permanently advisory. Its job is to surface missing coverage; forcing every surface to have a binding would impose busywork on scaffolds and test harnesses.
- N1/M1/M3 are permanently hard-fail. These represent data-integrity violations in the coherence substrate itself — there is no legitimate reason for a decision-number duplicate or a dangling manifest pointer.

**Alternatives rejected:**
- *Make N2 a hard fail* — gaps are common and legitimate (cancelled reservations, offline drafting). Advisory surfacing is the right signal.
- *Skip M1 for absolute paths* — rejected. The manifest is a live contract; a dangling pointer is a regression, not a "someone will fix it later" item.
- *Auto-remove dangling M1 entries* — rejected. The oracle detects and fails; a human decides whether the doc moved (update the pointer) or the binding is obsolete (remove it). Automatic mutation of the manifest would silently destroy intentional coverage.
- *Inline no-doc rules into a separate file* — rejected. `aeg-root/doc-owners` is the single source of truth for the code→doc surface map; the no-doc allow-list belongs there as comment lines, not in a second file that can drift.

**Consequences:**
- `scripts/verify-docs.ts`: exports `checkDecisionNumbers`, `checkManifestValidity`, `parseNoDocRules`, `DOC_OWNERS_PATH`, type `NoDocRule`; adds `runCompletenessScoreboard`; adds `--next-decision` CLI flag.
- `scripts/verify-coherence.ts`: replaces N/M stubs with real implementations that delegate to the new `verify-docs.ts` exports.
- `aeg-root/doc-owners`: `# no-doc:` header convention documented; allow-list entries added for intentionally unbound surfaces.
- `aeg-root/state-machine.md` §12: "D-### sequencing" stub entry promoted to "D-### sequencing and manifest integrity" (real, D-063/D-069).
- `scripts/verify-docs.test.ts`: 17 new tests covering N1/N2/M1/M2/M3 + `parseNoDocRules` + `checkManifestValidity`.

**Lock rationale:** `Lock: YES`. N1/M1/M3 hard-fail semantics and the `# no-doc:` grammar are load-bearing contracts for the coherence infrastructure. Future briefs changing these semantics (e.g. making N1 advisory, adding a new failure class to M-checks) MUST `Conforms to lock: D-063` or `Challenges lock: D-063 — <reason>`. N2/M2 advisory and scoreboard-advisory behaviors are also locked as permanently non-blocking — a brief that tries to make them hard-fail challenges this lock.

---

## D-064 — Shared `@atta/ui` composites resolve no library; consumers inject primitives

**Status:** ACTIVE
**Type:** 2
**Date:** 2026-06-27
**Lock:** NO

A shared composite in `@atta/ui` (e.g. `SmartPromptInput`) MUST NOT resolve a library itself — no `libraries/<x>/installed/*` imports, no static `@atta/ui` self-import for primitives, no internal `useComponents()`. It takes primitives via a `components` prop and renders them, degrading to native HTML for the first-paint window. Consumers inject from their own regime: build-time apps (Vāda) from `@atta/ui`; per-user runtime surfaces (Herald `JDInput`) from `useComponents()`. Rationale: one composite serves both a build-time library (Vāda→animate) and a runtime per-user library (Herald profile); static/hardcoded resolution can't satisfy both. Skill `ui-library-system` updated. Supersedes the implicit hardcode-basic pattern; `packages/ui/topbar/**` still violates it (backlog). First landed PR #207 (`809970db`); closes #213 gap.

## D-065 — `installed/*` is verbatim upstream; per-library cva; contract validates names not enums

**Status:** ACTIVE
**Type:** 1
**Date:** 2026-06-28
**Lock:** NO

Each `packages/ui/libraries/<name>/installed/*` is a verbatim CLI paste from that library's upstream design system (basic→shadcn, animate→animate-ui, retro→retroui, brutal→neobrutalism); never hand-edited, only import-paths adjusted; exempt from automated lint gates (Biome ignore and `check-forbidden-colors`), since the colors and formatting there are upstream's, not ours. Customizations live in `components/interactive/*` wrappers, which the gates DO cover in full. Each library derives its own Props from its own cva; `component-contract.mjs` validates component + type names, not cross-library variant enums. Dropped (zero-consumer): Button variants `ghost-pill`/`square`/`ai`, `RippleButton`, props `loading`/`iconLeft`/`iconRight`, and the `ButtonVariant`/`ButtonSize`/`ButtonVariantsFn` contract types. First landed PR #207 (Tabs `f83ff224`/`0e057a74`, Button `757586ea`).

---

## D-066 — Vāda V1 architecture: belief-revision engine, Outside Read + Belief Revision teams, battlefield-map output

**Date:** 2026-06-29
**Status:** draft (not yet ratified — Principal ratifies on PR merge)
**Type:** 1
**Tier:** 3
**Lock:** NO
**Authored by:** Planner (dispatched by Principal, vada-production-v1 re-plan)

**Context:** Mid-way through `vada-production-v1`, following the deliberate-page work in PR #207, a full reconsideration of Vāda's framing, team taxonomy, and V1 scope was conducted over 7 rounds of panel deliberation + a competitor teardown (see `apps/vada-ai/specs/vada-rethink.md` for the research backlog). This decision record captures the resolved V1 architecture and re-scopes the 6 affected issues (#179, #180, #182, #183, #186, #188) accordingly. The authoritative detail is in `apps/vada-ai/specs/vada-rethink-v1-decision.md`.

**Decision:**

Vāda is a **belief-revision engine**, not a convergence engine. The signal it surfaces is how independent models update under criticism — who moved, who resisted, who survived — not bare agreement or a consensus score. "Convergence as truth" is retired.

**Two V1 teams:**

1. **Outside Read** — engine call `vada__consult`, shape `brokered-no-synth`. Parallel panel, no cross-talk. Three presets: `find-blind-spots`, `critique-draft`, `pre-mortem` (all use the same routing flow; preset = prompt-only difference). Four attack-vector roles: `assumption-hunter`, `base-rate`, `failure-mode`, `second-order`. Output: battlefield map (`core_agreement` / `concessions` / `irreducible_conflict` / `risk_ranking`). Map audited by BlindCritic + FactChecker before reaching user.

2. **Belief Revision** — engine call `vada__deliberate`, shape `rounds-audit`. Sequential. 2-round cap (safety ceiling). Primary engineering: objection-novelty-stop detector that stops when objection space is exhausted, not when cap is hit. Output: revision trajectory + irreducible unresolved core.

**Fusion = A2 external benchmark.** `vada-fusion` (OpenRouter) is a benchmark condition alongside `a0-baseline` / `a1-baseline`, NOT a user-facing team slot.

**Two surfaces, one engine.** Web UI (playground/showroom, already built) + MCP (situated product surface, primary V1 surface). Both use the same engine output contract. Build order: UI first, then MCP.

**Two non-negotiables:**
- The battlefield map renders ON TOP of the inspectable audit trail (MOAT-A). Never replaces it.
- The battlefield map is audited by BlindCritic + FactChecker. Model-written synthesis is the highest verdict-smuggling surface.

**Deferred (NOT V1):** auto-verification; post-answer critique lenses; user-facing YAML authoring; 12-vendor breadth (→ ~4); open-ended loops; orthogonal-prompting-as-moat; Refinement team; Fusion as a team slot.

**Issues re-scoped by this decision:** #179 (T4), #180 (T5), #182 (T7), #183 (T8), #186 (T11), #188 (T13).

**Naming correction:** the brief specified `.claude/skills/teams-layer/SKILL.md` for the `packages/agents/vada-deliberation/yamls/**` doc-owners binding; corrected to the actual path `.claude/skills/atta-teams/SKILL.md` (no `teams-layer` skill exists).

---

## D-067 — Plan↔forge coherence oracle: `scripts/verify-coherence.ts`

**Date:** 2026-06-29
**Status:** ACTIVE
**Type:** 1
**Tier:** 3
**Lock:** NO
**Authored by:** Planner (dispatched by Principal, aeg-coherence-v1 Va/Vb)

**Context:** D-062 closed the code↔doc coherence seam (doc-owners + verify-docs C5). The plan↔forge seam was left open: the governance model had no deterministic oracle for detecting drift between the iteration topology files (plan) and the forge (GitHub Issue state / PR merge events). This gap produced the "#174 was closed but is it coherent?" class of ambiguity that required manual investigation. The oracle closes this gap without LLM calls, making the detection stateless and CI-runnable.

**Decision:**

A new `scripts/verify-coherence.ts` — sibling to `verify-docs.ts`, runnable as CLI and in CI — is the **plan↔forge coherence oracle**. It is stateless (§9 invariant: no persistent store, each run is a fresh read of forge + files). Zero LLM calls.

**Three inputs:** forge facts (via existing `fetch-forge-facts.ts` / `@octokit/graphql` + `timelineItems(CLOSED_EVENT)` from PR #201); iteration topology (parsed from `aeg-root/iterations/*.md` via the Studio's parser, not a new one); decision logs (`aeg-project/decisions.md` + per-product logs).

**Check catalog:** A1 (closed task has merged closing PR), A2 (closing PR has Archivist provenance comment), A3 (Issue whose closing PR merged is itself closed — the headline auto-close-misfire check), T1 (topology Issue refs resolve), T2 (open labeled Issues appear in topology — orphan-task check), T3 (no `#TBD` in active iteration), D1 (open-PR task has all depends-on closed), L1/L2 (active/completed lifecycle health), L3 (active iteration count, informational), N1/N2/M1/M2/M3 (delegate to T2 #217 if helpers exist, else stub with TODO).

**Output contract:** JSON (`{ check, status, failures: [{ issue, iteration, reason }] }`) + human-readable console summary; exit non-zero on any fail; informational checks (L3) do not affect exit code. The schema is locked — changes require a new D-entry.

**CI requirement:** Must run with `GITHUB_TOKEN` only (no interactive auth). If `GITHUB_TOKEN` is unavailable in the CI context, the check must surface a clear error rather than silently passing.

**Studio surface (Vb #230):** The AEG Studio renders this oracle's output via a "Check Coherence" action — green on exit 0, list-with-Issue-links on non-zero. The Studio is a renderer; it does not re-implement check logic.

**Alternatives rejected:**
- *LLM-based coherence checking:* rejected. The coherence oracle must be deterministic and cheap to run in CI. LLM calls introduce cost, latency, and non-determinism incompatible with a gate that runs on every PR.
- *Embedding coherence checks in `verify-docs.ts`:* rejected. `verify-docs` answers "did the PR update the docs it was supposed to?" (the output seam). The oracle answers "does the current governance state match reality?" (the plan↔forge seam). These are orthogonal questions; conflating them would make `verify-docs` context-sensitive in a way that breaks its dormancy semantics.
- *Persistent state store for forge facts:* rejected. §9 invariant requires statelessness. A fresh read on each invocation is correct; the forge IS the persistent store.

**Consequences:**
- `scripts/verify-coherence.ts` (NEW) — the oracle; exports a pure evaluator for tests.
- `scripts/verify-coherence.test.ts` (NEW) — one fixture per check, mocked forge/topology data, covers pass + fail path for each.
- `aeg-root/state-machine.md` §15 — register the plan↔forge oracle alongside the C5 doc seam.
- `aeg-root/iterations/aeg-coherence-v1.md` — Va and Vb rows added; Goal updated.

**Lock rationale:** `Lock: NO`. The check catalog is defined but implementors may discover that a check needs refinement (e.g. A2's Archivist provenance block format may vary). Narrowing or adding checks is a new D-entry that supersedes this one — not an in-place edit to a locked decision.

---

## D-068 — Role model-capability gating: `min_tier` per YAML agent, UI hard-block

**Date:** 2026-06-29
**Status:** DRAFT — awaiting Principal ratification (Type 1, engine schema change)
**Type:** 1
**Tier:** 3
**Lock:** NO
**Authored by:** Planner (dispatched by Principal, vada-production-v1 T16)

**Context:** Live Outside Read test (June 29, 2026) ran all 7 agent slots on Haiku 4.5 to save cost. BattlefieldSynthesizer failed: `terminalState: ERROR`, "synthesis could not be parsed." Root cause: Haiku 4.5 cannot produce strict-JSON synthesis over a ~274k-token multi-agent input. Nothing in the current stack prevents a user from assigning a too-weak model to a demanding slot. Roles have unequal model demands — synthesis/audit need capable models; panel attack-vectors can run cheap (diversity > raw power).

**Principal decision:** Hard-block (UI dropdown hides sub-tier models per role), implemented as a standalone task (T16, #244), sequenced after the benchmark/Fusion chain (depends-on #186 T11).

**Decision (three layers):**

### Layer 1 — Model capability tier in `packages/models`

`packages/models/src/catalog.ts` already defines `ModelEntry.tier: 'frontier' | 'balanced' | 'fast' | 'reasoning'`. `packages/models/src/overlay.ts` already maps flagship models to these tiers. **No new tier taxonomy is needed; the existing four-level taxonomy is the source of truth.**

`vendors.ts` (12 vendor routing entries) is NOT the right home for capability tiers — it describes routing (SDK shape, base URL, key convention), not model power. A vendor like Anthropic spans all tiers (Opus → frontier, Sonnet → balanced, Haiku → fast).

**Proposed linear ordering for `min_tier` comparison:**

```
frontier ≥ balanced ≥ fast
```

`reasoning` tier position: **⚑ FLAG FOR PRINCIPAL RATIFICATION.** Reasoning-optimized models (o3, deepseek-r1) have different cost/latency tradeoffs — superior on structured-logic tasks but potentially overkill for synthesis that benefits from fluent prose. Proposed: treat `reasoning` as equivalent to `frontier` for gating purposes (i.e., `min_tier: frontier` admits reasoning models). Await Principal confirmation before implementing.

**Proposed role assignments (⚑ RATIFICATION REQUIRED — do not implement without Principal approval):**

| YAML role | Proposed `min_tier` | Rationale |
|---|---|---|
| BattlefieldSynthesizer | `frontier` | Strict-JSON over 274k-token input; failed on Haiku |
| BlindCritic | `balanced` | Structured critique; needs coherent reasoning |
| FactChecker | `balanced` | Claim verification; needs reliable retrieval reasoning |
| Panel attack-vectors (assumption-hunter, base-rate, failure-mode, second-order) | *(unconstrained)* | Diversity > power; cheap models provide independent viewpoints |
| position-holder (Belief Revision) | `balanced` | Thesis defense across rounds |
| Challengers (Belief Revision) | *(unconstrained)* | Independent challenge vectors |

### Layer 2 — `min_tier` field per YAML agent

A YAML agent can declare `min_tier: frontier | balanced | fast` (omitted = unconstrained).

**⛔ STOP-AND-ESCALATE: adding `min_tier` to `FlowAgentSchema` (`packages/engine/src/flow-schema.ts`) and `FlowAgent` (`packages/engine/src/flow-types.ts`) is a new engine schema construct.** Per the standing engine-schema rule (pattern from D-053 Option C), this must NOT be silently implemented. The Developer role escalates the proposed Zod schema change + TypeScript type change + consumer impact (compile-flow.ts, flow-loader.ts, adapter, UI) to the Principal before writing code. Principal ratification of the tier assignments (Layer 1) and the schema field (Layer 2) are coupled — do both in one escalation.

YAML form (proposed, not final):
```yaml
agents:
  - name: BattlefieldSynthesizer
    min_tier: frontier
    system_prompt: |
      ...
  - name: BlindCritic
    min_tier: balanced
    system_prompt: |
      ...
```

### Layer 3 — UI dropdown hard-block

In the per-slot model dropdown (ReviewerConfigModal / ModelPicker), filter out any `ModelEntry` where `entry.tier` is below the role's `min_tier`. Hard-block only — sub-tier models are hidden, not greyed-out.

**Invalid saved session handling:** if a previously-saved session has a now-invalid model for a slot (because `min_tier` was added or changed), surface it clearly before submission — e.g. a Badge "Model too weak for this role" with forced re-selection before the Submit button enables. Do not silently substitute a higher-tier model.

**Graceful synthesis failure (runtime):** when synthesis fails at runtime despite a valid model (model failures are probabilistic), the run must NOT hard-ERROR and hide everything. Audit trail must remain visible (MOAT-A: trail is the truth, map is convenience). **Planner decision: this belongs in T7 (#182)**, not T16. T7 already owns deliberation UI + MOAT-A audit trail rendering; the synthesis-fallback is a missing-map case, not a gating failure.

**Alternatives rejected:**
- *Warn-and-allow (soft block):* rejected. Principal decision was hard-block. A warning that users can dismiss reintroduces the root cause (cost-optimizing by choosing too-weak a model) without visibility into the failure mode.
- *Vendor-level tier in `vendors.ts`:* rejected. Tiers are per-model, not per-vendor. Anthropic has frontier (Opus), balanced (Sonnet), and fast (Haiku) models. A vendor-level tier would either be wrong or meaningless.
- *Simplified 3-level taxonomy (frontier/mid/light):* rejected in favor of the existing 4-level taxonomy. Introducing a parallel taxonomy creates mapping confusion between the catalog's existing `tier` field and a new `min_tier` vocabulary. Use the same tokens.

**Consequences:**
- `packages/models/src/overlay.ts` — add doc comment for the tier ordering and min_tier semantics once ratified.
- `packages/engine/src/flow-schema.ts` — (post-escalation) add `min_tier: z.enum(['frontier', 'balanced', 'fast']).optional()` to `FlowAgentSchema`.
- `packages/engine/src/flow-types.ts` — (post-escalation) add `minTier?: 'frontier' | 'balanced' | 'fast'` to `FlowAgent`.
- `apps/vada-ai/` config-modal / ModelPicker — per-slot tier filtering.
- `apps/vada-ai/specs/vada-teams-catalog/` — doc the `min_tier` assignments per role once Principal ratifies the mapping.
- `aeg-root/iterations/vada-production-v1.md` — T16 row added (Issue #244), DoD updated with capability-gating exit criterion.

**Lock rationale:** `Lock: NO`. Tier assignments and `reasoning` tier ordering are proposed here but require Principal ratification before implementation. The Zod/TypeScript schema change requires explicit escalation approval. Narrowing, adding, or correcting tier assignments is a new D-entry that supersedes this one — not an in-place edit to a locked decision.

---

## D-069 — AEG enforces its own forge-lifecycle and role-seam contracts mechanically

**Date:** 2026-06-30
**Status:** ACTIVE
**Type:** 1 (irreversible — Principal ratified in-session)
**Lock:** YES
**Authored by:** TL (Strategist → Planner)
**Ratified by:** Principal (in-session, 2026-06-30)

**Context:** Recurring incidents (vada #180/#181/#182, aeg-ui-v1 #94/#97, the #182 auto-close misfire) share one root cause: the link between PR-merge ↔ Issue ↔ branch is not guaranteed. AEG derives status from the forge but enforces the integrity invariant that derivation depends on only as *trusted discipline* (§12), so the derivation reads broken wiring as a false status — and the fallback was tuned to be invisible (closed-without-merge → `todo`). AEG is the Principal's top-priority product; a half-enforced AEG taxes every downstream task. Decision taken to promote the load-bearing invariants from trusted to enforced, with zero tech-debt deferral — everything lands in `aeg-coherence-v1`.

**Decision:** AEG enforces its own forge-lifecycle and role-seam contracts mechanically:

1. **The one law.** A task-Issue reaches *done* only via a merged PR that names it (`Closes #N`). A `COMPLETED` close without that merge is **incoherent, not done**. The only sanctioned close-without-merge is `NOT_PLANNED` → **dropped** (never done, never `todo`).
2. **Honest derivation (T6 / #250).** `deriveStatus` reads GitHub's native `stateReason`; `DerivedStatus` gains `dropped` + `incoherent`; `aeg:incoherent` is added to the §14 label vocabulary. An inconsistent state never resolves to an innocuous status.
3. **Forge-lifecycle gates (T2 / #217).** A `Closes #N` pre-merge CI check (Layer 1 — prevent); `verify-coherence` run in CI covering A1/A2/A3/L1/L2 (Layer 2 — detect), **enforced at the gated merge step** (point 6 — branch protection is unavailable on this plan), with **A2 blocking** the next in-iteration merge (close-out/archiving back-pressure) and **L1/L2 advisory** (avoids the last-task deadlock).
4. **Contract structural gates.** planner→brief rationale-completeness (T7 / #251) and brief→developer brief-validation (T8 / #252): the *structural* half of each contract becomes a CI gate; the *semantic* half stays the Reviewer's (trusted). Each defines the canonical machine-parseable grammar for its artifact (rationale block; brief sections + lock-ack).
5. **Enforcement is CI, scaffolded, graduated.** Mechanical enforcement on a forge IS CI; these are jobs added to AEG's existing scaffolded workflows (no new adoption instructions), behind the observe→enforced gradient — observe mode runs zero CI, full mode is one `aeg init`.
6. **Agent merge/commit guardrails, free (T9 / #254).** Branch protection — GitHub's only native way to make a red check *block* the merge button — is **unavailable on this private+free repo** (classic protection and rulesets both 403). So mechanical enforcement lives in the **merge step**, not GitHub's button: a `PreToolUse` hook denies any agent merge (`gh pr merge` / `gh api` / `curl` / MCP `merge_pull_request`) unless `gh pr checks` is green; a Husky hook blocks direct commits/pushes to `main`; worktree-first discipline extends to every repo-committing role (not just the Developer brief). **No agent can merge a red PR or commit to main.** CI checks still run and show red/green for free — only the *button-disable* is paid. Branch protection becomes an optional upgrade (paid or public) that adds exactly one thing: a guard against an *untrusted human* clicking GitHub's UI merge button — never a dependency for consistency.

**Boundary (what this is NOT):** AEG does not lock down the GitHub UI (a human can still hand-close an Issue). "Flawless" means **no silent incoherence** — enforce the in-band path, detect-and-flag the out-of-band path, never mis-render. It does **not** auto-reopen a hand-closed Issue (that would fight a legitimate `NOT_PLANNED` close, e.g. #181); it flags `aeg:incoherent` and a human resolves.

**Alternatives rejected:**
- *Lock the forge down* — GitHub exposes no "require Closes #N" / "prevent issue-close" lever; betrays AEG's "monitoring not restriction" on-ramp.
- *Reconsider forge-native* — the recurring pain is a missing integrity layer, not a wrong premise; deriving-from-forge is correct (a DB derives views from *enforced* FKs). Throwing it out returns to racing status files.
- *Auto-reopen hand-closed Issues* — fights legitimate `NOT_PLANNED` closes (#181), creates churn.
- *Patch `deriveStatus` to treat closed → merged* — hides the A1 coherence violations the model is built to surface.
- *Defer the contract-enforcement program to a future iteration* — rejected by Principal: AEG perfection is priority-100, zero tech-debt; everything lands in `aeg-coherence-v1`.

**Consequences:**
- New derived statuses `dropped` + `incoherent`; new label `aeg:incoherent` (§3, §14).
- The "done" lifecycle (close → close-out → archive) and the planner→brief / brief→developer contracts move from *trusted* to *enforced* (§12).
- Tasks T6 → T2 → {T7, T8} serialize on the shared CI collision domain (`.github/workflows` + `verify-*` scripts); Vb runs parallel (studio domain disjoint).
- Legacy unlinked-but-done Issues (#180/#182) read `incoherent` until a human clears them; #181 reads `dropped`. The `Closes #N` gate prevents recurrence.
- Canonical machine-parseable grammars must be defined for the Planner's rationale block and the brief sections (sub-deliverables of T7/T8) — constitution touches.
- Branch protection / rulesets are unavailable on the current GitHub plan (private+free); `state-machine.md` §12 currently *falsely* claims gates are "armed in branch protection" — T2 corrects §12 to the real substrate (gated merge step + agent hooks). Enforcement is free; the paid plan only adds a UI-button guard for untrusted-human merges. (Surfaced via a Planner commit that drifted onto `main` with no worktree — captured in `lessons.md` by T9.)
- T9 (`#254`, harness guardrails) conflicts-with the §12/governance-doc cluster (T2/T7/T8) and serializes there; it is disjoint from T6 (aeg-core) and Vb (studio) and runs parallel to them.

**Lock rationale:** `Lock: YES`. This is the foundational integrity charter for AEG-as-product; future briefs touching status derivation, the forge-lifecycle gates, or the role-seam contract gates MUST `Conforms to lock: D-069` or `Challenges lock: D-069 — <reason>`. Changing the law (close-iff-merged), the terminal-status vocabulary, or the flag-don't-auto-reopen stance is a new D-entry that supersedes this one, not an in-place edit.

## D-070 — Planner owns iteration-refactor & cross-iteration task-movement; Archivist close-gate is "no open task work," not "all merged"

**Date:** 2026-07-01
**Status:** ACTIVE
**Type:** 1 (irreversible — role-charter change; Principal ratified in-session)
**Lock:** YES
**Authored by:** TL (Strategist)
**Ratified by:** Principal (in-session, 2026-07-01)

**Context:** Closing `aeg-coherence-v1` required relocating 5 unbuilt tasks (#218/#219/#220/#251/#252) into its successor `aeg-consolidation` and then closing the source. The model had **no owner for "move a task between iterations"**: the Iteration Archivist is barred from editing topology or deciding scope (it only *flags* unbuilt tasks for Principal disposition — `roles/iteration-archivist.md` "What you do NOT do"), while the Planner's readiness gate item 8 demands the prior iteration be archived *before* planning — impossible when the new iteration **absorbs** the old one's tasks, since planning is what empties the source. The gap surfaced when the move was attempted ad-hoc, outside any role, with direct edits on the main checkout (captured in `lessons.md`).

**Decision:** Cross-iteration task-movement is a Planner power; the Archivist close-gate accepts `moved` as a terminal disposition alongside `merged`/`dropped`.

1. **Task-movement / iteration-refactor is a Planner power**, exercised at plan time. Moving a task from iteration A→B is a topology + scope decision; only the Planner may perform it. **Only `todo`/backlog tasks are movable** — a task with an open branch or PR (in-flight/in-review) must be finished or dropped first, never relocated mid-flight.
2. **The Planner refactors the source iteration in the same act as planning the destination.** When a new iteration absorbs tasks from a still-active one, the Planner: (a) plans the destination (topology + rationale, D-055); (b) relabels each moved Issue `iteration:<src>` → `iteration:<dest>` + posts a provenance comment; (c) annotates the *source* iteration's topology with a `Moved out → <dest>` marker per moved task — while the source is still in `iterations/`, before archival (the archived file is frozen).
3. **Movement provenance is recorded in four durable places:** the Issue (relabel + comment), the source iteration file (annotation), the destination iteration file (task row + refreshed rationale), the Archivist retrospective ("Tasks moved out").
4. **The Iteration Archivist close-gate broadens** from "all tasks merged" to **"no open task work"**: an iteration is closable iff every task is `merged` (via `Closes #N`), `dropped` (`NOT_PLANNED`), or `moved` (relabeled away). Mechanically: `gh issue list --label "iteration:<name>" --state open` is empty **AND** no open `task/<name>/*` PRs. This conforms to D-069's one law — a task still reaches *done* only via a merged PR; **movement is a re-scope, not a done-path.**
5. **Readiness-gate item 8 gains a supersession carve-out:** the "archive prior iteration first" rule does **not** apply to the iteration the current plan is superseding (absorbing tasks from). Canonical order becomes **Planner refactor-and-plan → then Archivist closes the source** — never archive-then-plan when the plan *is* the supersession. Item 8 still fully applies to every unrelated prior iteration.

**Boundary (what this is NOT):** not a license to move in-flight/in-review tasks (todo/backlog only); not a bypass of D-069 (a moved task is neither done nor dropped in the source — it simply leaves the iteration); does not let the Archivist edit topology or decide scope (the broadened gate changes only what it *accepts as terminal*, not what it *does* — the move itself remains the Planner's); does not weaken item 8 for unrelated iterations.

**Alternatives rejected:**
- *Archivist executes the move* — violates its charter (no topology edits, no scope decisions), and it has no readiness-gate / deep-dig to size the destination.
- *Force all tasks merged before any close* — would abandon legitimately-deferred work or ship throwaway just to fake a "merged" state.
- *Keep archive-then-plan and forbid supersession* — makes cross-iteration refactor impossible and forces a dishonest "complete" on an iteration whose tail was relocated (violates D-069's honest-derivation ethos).

**Consequences:**
- `roles/planner.md` gains a "Iteration refactor & cross-iteration task-movement" section + a supersession carve-out clause on readiness-gate item 8.
- `roles/iteration-archivist.md` entry-gate item 1 broadens ("all merged" → "no open task work: merged/dropped/moved"); the retrospective template gains a "Tasks moved out" field.
- `contracts/iteration-archivist-planner.md` records the supersession ordering — changed **as a unit** with both role docs, per that contract's own "Changing this contract" rule.
- The already-live `aeg-consolidation` relabels (#218/#219/#220/#251/#252) are retro-legitimized as step-2b of a Planner refactor still to be completed properly (source annotation + destination topology + refreshed rationale) in the forthcoming `aeg-consolidation` plan.

**Lock rationale:** `Lock: YES`. Future briefs touching iteration-refactor, cross-iteration task-movement, or the iteration close-gate MUST `Conforms to lock: D-070` or `Challenges lock: D-070 — <reason>`. Changing the movability rule (todo-only), the four-place provenance, or the close-gate disposition set (`merged`/`dropped`/`moved`) is a new D-entry that supersedes this one, not an in-place edit.

---

## D-071 — Ledger ownership: Archivist records all token rows post-merge; roles report in PR/verdict

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible — a future decision may move capture into tooling)
**Lock:** NO
**Authored by:** Developer (dispatched task, aeg-governance-hardening #266)
**Ratified by:** Principal (via task dispatch)

**Context:** Live-fire dispatch of D-069's own tasks surfaced two collisions in the §12 token-ledger model (`aeg-root/iterations/README.md` §12). First, chat/read-only roles (Reviewer, Security, Planner, Brief Author) were told to "append one row" to `aeg-root/iterations/<name>.tokens.md` at turn-end, but structurally cannot: they don't hold a task branch, and several never touch the repo's filesystem at all. Second, parallel Developer sessions on different tasks collided writing to the same shared `tokens.md` file (concretely: tasks #255 and #258 raced on the same file). Both findings are recorded in `specs/ecosystem-backlog.md` ("AEG-model hardening" punch-list).

**Decision:** No role appends its own ledger row on a task branch. Every role instead **reports** its token spend in the artifact its turn already produces — the Developer and Archivist (terminal roles) report exact `/cost` figures in the PR body under a "Token report" heading; the Reviewer and Security roles (chat roles) report in their verdict comment, numeric cells `—` where the claude.ai surface can't self-see its own count; the Planner reports in the plan PR body or planning report. The per-task **Archivist is the sole writer of `aeg-root/iterations/<name>.tokens.md`**: at close-out, it collects every role's token report for the merged task (PR-body "Token report" sections, verdict comments) and appends one row per role-turn — including its own turn — in a single close-out pass. Re-entry rows (a second Developer turn after `CHANGES_REQUESTED`, a re-review) are appended exactly as before; append-only, never-edit-a-row, derived-total, and `—`-for-unknown semantics are unchanged. The ledger's column format and the `@atta/aeg-core` parser are unchanged — only *who* writes a row and *when* changes.

**Boundary (what this is NOT):** not a change to the ledger's format, columns, or parser contract (`packages/aeg-core`'s `parseLedger` is untouched); not a retro-edit of any existing `*.tokens.md` file — historical rows stand as written; not a resolution of how iteration-wide chat-role turns that have no task PR (Planner-mode planning sessions outside a plan PR, Brief-Author-mode sessions) get their reports recorded — that gap surfaced during this task and is deliberately left open, flagged in this PR for a follow-up task rather than solved ad hoc; not a hook-level or CI-level enforcement of "dirty main is impossible" — that remains a stretch goal, explicitly out of scope here.

**Alternatives rejected:**
- *Keep self-append, teach chat roles to write files* — chat-surface roles (claude.ai Reviewer/Security/Planner/Brief-Author) cannot reliably write to a specific task's worktree; several run with no filesystem access at all. Would not fix the read-only-role gap.
- *Give every parallel Developer its own ledger file, merge at close-out* — adds a new artifact and a merge step for no benefit over having the Archivist, who already visits the merged PR at close-out, do the single write.
- *Store an aggregate/queue of pending reports somewhere else* — reintroduces a stored-total-style artifact the append-only design was built to avoid (`iterations/README.md` §12 anti-regression, `state-machine.md` §13).

**Consequences:**
- `aeg-root/roles/{reviewer,security,planner,developer}.md` — turn-end sections changed from "append one row" to "report tokens in your PR body / verdict comment."
- `aeg-root/roles/archivist.md` — close-out checklist extended: collect every role's token report for the task and append all rows (including its own) at close-out, one row per role-turn.
- `aeg-root/iterations/README.md` §12 — append-rule and "two capture sources" passages rewritten for Archivist-recorded, post-merge appends; ledger format table (columns) unchanged.
- `.claude/skills/executor-protocol/SKILL.md` — opens with a pointer to `aeg-root/roles/developer.md`, so a bare "read executor-protocol" dispatch still carries the Developer's entry gate and PR-canonical-form.
- `specs/ecosystem-backlog.md` — the stale "grandfather L2/L3" punch-list line (superseded by merged #261) is pruned; the ledger/reviewer-isolation/executor-chain items are annotated as dispatched by this task.
- Reviewer and Security "what you do NOT do" sections gain two separate rules: write nothing to disk (verdicts are PR comments only), and — when dispatched as an agent — run only in an isolated worktree, never the main checkout.
- `aeg-root/aeg-manual-flow.md` and `aeg-root/state-machine.md` carry description-level references to the old self-append rule, updated to match; `aeg-root/roles/team-leader.md` (Planner-mode/Brief-Author-mode duplicate text) and `aeg-root/roles/iteration-archivist.md` (its own turn-end row) carry the same shape of instruction but are **not** changed here — see Boundary above.

**Lock rationale:** `Lock: NO`. This is an operational-model correction, not an irreversible architectural commitment — a future task may move token capture into tooling (automatic `/cost` capture at dispatch-end) and supersede this decision's manual-report mechanism without needing to challenge a lock.

---

## D-072 — One-way knowledge law: the host monorepo never references AEG

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is doc-discipline today)
**Lock:** YES
**Authored by:** Developer (dispatched revision task, aeg-governance-hardening #266, PR #276 R1)
**Ratified by:** Principal (in PR review of #276)

**Context:** Principal review of PR #276 found that its "executor-protocol chain" deliverable — `.claude/skills/executor-protocol/SKILL.md` opening with "read `aeg-root/roles/developer.md` first" — inverts the constitution's stated knowledge direction: *"Knowledge flows one way — a tool may know AEG; AEG does not know the tool"* (`iterations/README.md` §"AEG is forge-native, orchestrator-independent") and *"AEG is a black box to the host monorepo"* (the `aeg-consolidation` goal, `state-machine.md`). The finding the original edit was solving — a bare "read executor-protocol" dispatch under-specifies the Developer role's entry gate and PR canonical form — was real; D-071's fix crossed the wall in the forbidden direction to solve it. This decision **overrules the original #266 Planner instruction** that ordered the chain line, and records the corrected disposition: the chain lives in the brief (an AEG artifact), never in a host-repo skill.

**Decision:** No monorepo artifact outside AEG's own homes (`aeg-root/`, `aeg-project/`, `apps/aeg/`, `packages/aeg-core/`, `specs/aeg*`) may reference AEG artifacts or vocabulary by path. AEG referencing the repo is inherent — governance needs eyes on what it governs (briefs, `doc-owners`, `projects.md` all point at code). The reverse — a host-repo artifact pointing into AEG — is a defect.

**Sanctioned crossings, exhaustively:**
1. `.github/workflows/*.yml` — a GitHub Actions platform requirement to invoke AEG's CLI tools; pre-existing law (`state-machine.md`), not a new carve-out.
2. **Cetana** — the orchestrator is a sanctioned knower of AEG, never the reverse (D-029/D-038).
3. **AEG-owned views** projected into the harness (`.claude/skills/`, `.claude/agents/`) carrying an explicit CANONICAL SOURCE / AEG-OWNED VIEW header (the D-039 pattern) — the header marks the file as AEG's own projection, not an independent host-repo artifact that happens to know about AEG.
4. **Historical records** (research logs, experiment logs, provenance citations) — history is not scrubbed to satisfy a grep.
5. **Planning-seam backlogs** (D-037) — a backlog may name AEG work items, since the backlog is the upstream seam a human reads to compose an iteration; AEG never reads the backlog as part of the flow.

Anything that is not one of these five: move the knowledge to AEG's side (a role doc, a contract, a spec under `aeg-root/`/`apps/aeg/`) or delete it. Enforcement is doc-discipline today, judged at review time by the code-reviewer / TL spec review; a mechanical `verify-docs` boundary check (grep the diff for monorepo→AEG references outside the sanctioned list) is backlogged (`specs/ecosystem-backlog.md`), not built.

**Boundary (what this is NOT):** not a claim that AEG-owned views are forbidden — headered projections are the sanctioned mechanism for the harness to carry AEG's role specs; not a retroactive scrub of historical logs (`apps/desktop/specs/10-research-log.md`, the `cetana-reality-check.md` copies) — those stand as written; not a change to the planning-seam carve-out (D-037) that already lets backlogs name AEG items; not a change to Cetana's sanctioned-knower status (D-029/D-038); not a mechanical enforcement mechanism — that is future work, not shipped here.

**Alternatives rejected:**
- *Soften the chain line's wording instead of reverting it* — any monorepo-file reference to an `aeg-root/` path is the violation, regardless of phrasing; a softer sentence still crosses the wall.
- *Leave the chain line and add an AEG-OWNED VIEW header to `executor-protocol/SKILL.md` itself* — rejected because `executor-protocol` is a genuine host-repo artifact (predates AEG, serves non-AEG dispatches too), not an AEG role-spec projection; headering it would be a category error, unlike the two review-agent files which *are* direct projections of `roles/reviewer.md`/`roles/security.md`.
- *Do nothing (accept the crossing as a pragmatic exception)* — rejected because the whole value of "AEG is a black box to the host monorepo" is that AEG can be deleted or swapped without leaving stale references scattered through the repo; one exception invites more.

**Consequences:**
- `.claude/skills/executor-protocol/SKILL.md` reverts to zero AEG references (the chain line added by PR #276's first pass is removed).
- `aeg-root/skills/brief-authoring/SKILL.md` gains a mandatory "Role-chain preamble" rule in its Header-block section: every brief must open by naming the executor's role, its AEG reading chain, and the host repo's own execution-discipline skill if one exists.
- `.claude/agents/code-reviewer.md` and `.claude/agents/security-reviewer.md` gain an AEG-OWNED VIEW header, legitimizing their existing `aeg-root/roles/{reviewer,security}.md` references as sanctioned crossing #3.
- `apps/herald-ai/specs/herald-backlog.md` loses its Archivist close-out note — AEG execution bookkeeping whose durable home is the provenance block on PR #123, not a product backlog.
- `specs/ecosystem-backlog.md` gains a future-work line for the mechanical boundary check, and its #266 punch-list annotation is corrected to describe the reverted-then-fixed disposition.

**Lock rationale:** `Lock: YES`. Future briefs touching the harness-view mechanism (`.claude/skills/`, `.claude/agents/`) or adding any monorepo→AEG reference must `Conforms to lock: D-072` or `Challenges lock: D-072 — <reason>`. Changing the sanctioned-crossings list, or the AEG-OWNED VIEW header convention, is a new D-entry that supersedes this one, not an in-place edit.

---

## D-073 — Branch-ID verification: Step 0 must literal-match the topology's `#` column, checked independently by both Brief Author and Developer

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is doc-discipline + an existing CI gate, not new tooling)
**Lock:** YES
**Authored by:** Developer (dispatched task, aeg-governance-hardening #293)
**Ratified by:** Principal (via task dispatch)

**Context:** Dispatching `vada-production-v1`'s benchmark-harness wave surfaced a confirmed governance gap. The iteration topology file's `#` column is always a bare ID (`1`, `2`, `3a`, `7`, `8`, `9`, …) — confirmed by direct read of `aeg-root/iterations/vada-production-v1.md`. Every numbered task branch actually dispatched standalone in that iteration instead used a `T`-prefix, going back to the first numbered task — 100% of the 9 rows below, not a sampling:

| Task | Topology `#` | Branch used | PR | Merged | Pre/post D-069 |
|---|---|---|---|---|---|
| S0 | `S0` | `task/…/S0` | #154 (matches — `S0` has no ambiguity) | 2026-06-20 | pre |
| 1 | `1` | `task/…/T1` | #192 | 2026-06-23 | pre |
| 2 | `2` | `task/…/T2` | #202 | 2026-06-23 | pre |
| 3 | `3` | `task/…/T3` | #194 | 2026-06-23 | pre |
| 3a | `3a` | `task/…/T3a` | #205 | 2026-06-24 | pre |
| 4 | `4` | `task/…/T4` | #233 | 2026-06-29 | pre |
| 5 | `5` | `task/…/T5` | #237 | 2026-06-29 | pre |
| 7 | `7` | `task/…/T7` | #246 | 2026-06-30 | pre |
| 8 | `8` | `task/…/T8` | #289 (closed, unmerged — 2 "Closes" checks failed); corrected branch `task/vada-production-v1/8` now open as PR #295 | — | **post** |
| 9 | `9` | `task/…/T9` | #284 (closed, unmerged — 2 "Closes" checks failed); corrected branch `task/vada-production-v1/9` now open as PR #286 | — | **post** |

**Task 6 (Issue #181, SmartTextInput) does not appear in this table** — not an omission, a different history. It was never dispatched as a standalone branch: its `6a`/`6b`/`6c` sub-tasks were absorbed into the differently-named `task/vada-production-v1/tool-badges` branch (PR #207, merged 2026-06-28) under explicit Principal instruction ("keep the deliberate-page work atomic"), per the topology file's own note. `tool-badges` is not a `task/<iteration>/<n>` branch at all — it never claimed to match any topology `#` — so task 6 was never exposed to the defect this table documents. (Caught in review of PR #296 — the reviewer correctly flagged the row-5-to-7 jump as inconsistent with an unqualified completeness claim; verified directly against the forge that no branch named `T6` has ever existed in this repo's history, so the fix is this clarifying note, not an added row.)

Re-verified against the live forge at dispatch time (`gh pr view <N> --json headRefName,state,mergedAt,statusCheckRollup`); all branch names, states, and dates above match. The CI check that would have caught this — `forge-lifecycle.yml`'s `closes-n-gate` (job name "Closes"), added 2026-07-01 as part of D-069 hardening (#258) — never evaluated tasks 1–7: those merged before the gate existed. Tasks 8 and 9 are the first two branches in this iteration's history ever evaluated by a live `Closes` gate, and both failed on first inspection. **This is not new breakage — it is a pre-existing, 100%-prevalence defect finally getting its first inspection.**

Root cause: `aeg-root/skills/brief-authoring/SKILL.md` §5 and `aeg-root/roles/developer.md`'s entry gate both said to use the `task/<iteration>/<n>` branch name "exactly," but neither had a **named, checkable step** verifying `<n>` against the topology file's literal `#` column before the branch was created. Prose discipline was backing a now-mechanical CI gate, and the asymmetry — nothing upstream ever checked what the downstream gate now checks — is exactly how a defect can survive nine dispatches undetected. Every AEG iteration in every repo that adopts this model has the identical exposure; it is a hole in the model, not an incident specific to this iteration.

**Decision:** Both role docs gain an explicit, STOP-language, mechanically-followable verification step, substance-identical in obligation and refusal condition:

1. **Brief Author (authoring time, `aeg-root/skills/brief-authoring/SKILL.md` §5).** Before writing the Step 0 `git worktree add` command into a brief, read the task's row in `aeg-root/iterations/<name>.md` and confirm the branch-name suffix about to be written literal-matches the `#` column — character for character: no added prefix, no case change, no truncation. On mismatch: do not author the brief with the wrong branch name; use the topology's literal ID.
2. **Developer (execution time, `aeg-root/roles/developer.md` entry gate item 6).** Before executing Step 0, independently re-read the same topology row and re-run the identical check against the Step 0 command just received — never trusting that the brief was authored correctly. On mismatch: STOP, do not create the worktree/branch, report the mismatch to the Brief Author/Principal rather than silently using either name.
3. **Contract (`aeg-root/contracts/brief-developer.md`).** The "Worktree step 0" field-table row and the Producer/Consumer-obligations bullets are tightened to name this obligation explicitly, so the seam's single source of truth stays accurate — the two role-doc checks are not a new hand-off field (nothing new crosses the seam), but a shared precondition both sides independently verify against the same third source (the topology file), mirroring how the Issue-existence precondition (D-054) is already documented on both sides.

**Boundary (what this is NOT):** not a retroactive fix of the 9 branches shown above (`1`–`5`, `3a`, `7` are merged, frozen history; `8`/`9` were already corrected live pre-dispatch, now `task/vada-production-v1/8` and `/9`, PRs #295 and #286) — and not a claim about task 6, which was never dispatched standalone (see the table note above); not a change to `packages/aeg-core/bin/verify-coherence.ts` or the `closes-n-gate` CI job, which are working exactly as designed — this decision fixes the upstream process that feeds that gate, not the gate itself; not a claim that the contract's field-by-field table needed a new row — the existing "Worktree step 0" row and Producer/Consumer bullets were tightened instead, since this is a shared independent-verification precondition, not a new field crossing the seam.

**Alternatives rejected:**
- *Rely on prose discipline alone ("use it exactly")* — this is the status quo that produced a 100%-prevalence, week-plus-undetected defect; prose without a named, checkable step is not a gate.
- *Fix only the Developer's entry gate, not the Brief Author's pre-flight* — would leave briefs being authored with the wrong branch name, catching the defect one stage later than necessary and wasting a dispatch round-trip (the same reasoning that put the Issue-existence and prior-archival preconditions in both role docs).
- *Add a new field-table row to the contract instead of tightening the existing one* — rejected; the branch-ID check is not a new field the Brief Author emits for the Developer to consume, it is an independent verification both sides run against a third source (the topology file) — tightening the existing "Worktree step 0" row and obligations bullets is the accurate shape, not a new row.
- *Build a mechanical pre-dispatch/pre-worktree script instead of a doc-level check* — real future hardening, but out of scope for this task (pure-doc brief, no code surface); the two manual checks close the gap now without waiting on tooling.

**Consequences:**
- `aeg-root/skills/brief-authoring/SKILL.md` §5 — new "Branch-ID verification" paragraph after "Remaining pre-flight checks."
- `aeg-root/roles/developer.md` — new entry-gate item 6; the post-checklist summary sentence updated to reference it.
- `aeg-root/contracts/brief-developer.md` — "Worktree step 0" field-table row tightened; Producer-obligations worktree bullet tightened; new Consumer-obligations bullet added, mirroring the Issue-existence precondition's shape.
- Every future AEG iteration in every adopting repo closes this exposure — the fix is in the model, not scoped to `vada-production-v1`.
- No change to `packages/aeg-core/bin/verify-coherence.ts`, the `closes-n-gate` CI job, or any historical branch/PR.

**Lock rationale:** `Lock: YES`. This is now a load-bearing dispatch-safety rule — every future brief authored and every future Step 0 executed depends on it. Changing or weakening the branch-ID verification obligation (removing either side's check, or making the refusal language advisory rather than a hard STOP) requires a superseding D-entry with `Challenges lock: D-073 — <reason>`, not a quiet edit to either role doc or the contract.

---

## D-074 — Forbid committed report/scratch files: findings live in the PR/Issue, not a new repo file

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is doc-discipline, mirroring the existing anti-regression rules)
**Lock:** YES
**Authored by:** Developer (dispatched task, aeg-governance-hardening #297)
**Ratified by:** Principal (via task dispatch)

**Context:** This session discovered a live bug in AEG Studio: opening the `aeg-governance-hardening` iteration page showed a broken card titled `aeg-governance-hardening.audit`, badge "DONE," no other info, not clickable. Root cause traced precisely: `apps/aeg/web/studio/src/lib/aeg-fs/read-root.ts:98` globs every `.md` file in `aeg-root/iterations/` as an iteration, with exactly two hardcoded exceptions (`README.md`, `*.tokens.md`). Task 3 (#218, "Bind-all + staleness audit") committed its 120-row coverage-report deliverable as `aeg-root/iterations/aeg-governance-hardening.audit.md` — a third kind of file the loader was never taught to skip, so Studio tried to parse it as an iteration and failed silently into a broken card.

A second, independent violation was found already present before this session: `apps/aeg/aeg-project/briefs/theme-refactor-brief.md` — a full task brief committed as a permanent repo file. This directly contradicts `brief-authoring/SKILL.md`'s own stated rule that the brief is "pasted to the Developer, not committed," and "lands in the PR body" when the Developer opens the PR — that is its permanent, durable home.

Neither violation was a one-off slip by a careless agent — both were the path-of-least-resistance choice by an agent that had real deliverable content and nowhere AEG's model told it *not* to put it as a file. AEG has strict rules about **who** may write **which known artifact type** (the topology file is Planner-only at plan time; the ledger is Archivist-only at close-out; the brief is pasted, not committed), but until now had zero rule constraining **where new artifact types** may be created, or whether a one-off report may be a committed file at all. A Planner note on Issue #218 said "there is no prior convention — you set it," and the task's own Brief Author (a prior session of this same assistant) filled that gap with the path of least resistance instead of checking whether a file was the right shape of artifact in the first place.

The Principal's ruling, verbatim intent: *"Forbidden to write tmp reports. FORBIDDEN for any agent anywhere. These info must live in issue in github and or PR. All this brings issues and goes against the most important premise of AEG: state lives in GitHub."* This is the same weight as the three existing anti-regression rules in `iterations/README.md` §9 — no execution metadata in the thin file/Issue, no dynamic conflict scanner, no planning metadata on Issues. This decision is the fourth.

**Decision:** No agent, in any AEG role, commits a new repo file whose sole purpose is a one-off report, audit finding, coverage summary, or working brief. That content belongs in the PR body (for task-scoped findings tied to a task's own work) or an Issue/PR comment (for findings that don't have a task PR of their own, or that must be preserved before a decision on the source file). A committed scratch file needs no ongoing protocol if it is simply never created — this is a rule that removes the option, not a cleanup checklist to remember.

Concretely:
1. **`iterations/README.md` §9** gains a fourth anti-regression rule, same voice as the existing three: no committed report/scratch/audit/brief file — ever, by any role. Findings and briefs are forge artifacts (PR body, Issue comment), never new markdown files under `aeg-root/` or a product's `aeg-project/`.
2. **`brief-authoring/SKILL.md`** gains an explicit anti-pattern and a rule stating task-scoped findings/audits/reports go in the PR body or an Issue comment, never a new file.
3. **`roles/developer.md`** gains a "does NOT do" bullet: never commit a new file whose sole purpose is a report/finding/audit summary.
4. **`roles/planner.md`** gains a hard gate: a Planner rationale's "Docs to keep coherent" field (or any other field) must not propose a new committed file as a task deliverable when the content is a one-off finding/report/audit — it must name the PR body or an Issue comment as the destination instead. Genuine ambiguity between "reference content" (legitimately a new file, per D-058's read-obligation framing) and "a one-off report" (forbidden as a file) is itself a refuse-and-ask condition, not a coin flip. This is the role most directly implicated in the incident — Issue #218's own Planner rationale is what first named the violating file path.
5. **`roles/reviewer.md`** and **`roles/archivist.md`** were checked for language that could invite the same mistake. Neither needed a change: the Reviewer's output is explicitly PR-comment-only already ("You write nothing to disk — your verdict is PR comments only," D-071); the Archivist's provenance block is explicitly "posted to the merged PR record," not a new file, and its one sanctioned write (the token ledger, D-071) is a pre-existing, separately-governed exception, not the pattern being forbidden.

**Boundary (what this is NOT):** not a claim that all committed markdown is forbidden — specs, skills, role docs, contracts, decision logs, and the `.tokens.md` sibling ledgers (D-071, append-only, explicitly designed as durable state — see `iterations/README.md` §12) are sanctioned, durable AEG artifacts, not the pattern being forbidden; not a retroactive scrub of every doc in the repo — only new files whose *sole purpose* is a one-off report/finding/audit/brief; not a change to where durable reference content lives (that's still a spec or skill, per D-058); not a claim that the Reviewer's or Archivist's role docs were previously wrong — the light-pass check confirmed they already model the correct behavior, it just names the two confirmed violators and closes the gap the other three roles had.

**Alternatives rejected:**
- *Soften this into a "prefer PR body" guideline instead of a hard forbidden* — rejected per the Principal's explicit instruction; a "prefer" is not a rule an agent under deadline pressure will honor, and the whole value of the three existing anti-regression rules is that they are hard, enumerated forbids, not preferences.
- *Fix only `developer.md` (where the Developer actually commits files) and skip `planner.md`* — rejected; Issue #218's own history shows the Planner's rationale is where a new artifact's path first gets named ("there is no prior convention — you set it"). Fixing only the Developer's role doc leaves the naming decision unconstrained one stage earlier, recreating the exact gap that produced this incident.
- *Build a mechanical `verify-docs` check that flags new files under `aeg-root/iterations/` matching a report-like name pattern* — real future hardening, flagged as a follow-up, but out of scope for this Tier-3 doc-only task; doc discipline closes the gap now, mechanical enforcement is a separate, code-level task.
- *Leave `aeg-governance-hardening.audit.md`'s content in place and just header it as an exception (mirroring the `.tokens.md` sibling-ledger pattern)* — rejected; the audit file is not a durable, append-only, forge-derived-status artifact like the token ledger. It is a one-off coverage report whose durable content (scoreboard result, bindings, 5 filed Issues) is already fully recorded in task 3's PR #283 body and `aeg-project/changelog/2026-07-02-task-aeg-governance-hardening-3.md` — nothing is lost by deleting the file, and keeping it as a "sanctioned exception" would blur the exact line this decision draws.

**Consequences:**
- `aeg-root/iterations/README.md` §9 gains a fourth anti-regression rule.
- `aeg-root/skills/brief-authoring/SKILL.md` gains an anti-pattern entry and an explicit redirect-to-PR-body/Issue-comment rule near the §7 documentation-update-list guidance.
- `aeg-root/roles/developer.md` gains a "does NOT do" bullet.
- `aeg-root/roles/planner.md` gains a mandatory hard gate in its "Hard gates — refuse" list.
- `aeg-root/roles/reviewer.md` and `aeg-root/roles/archivist.md` — no change; confirmed already correctly scoped (PR-comment-only output).
- `aeg-root/iterations/aeg-governance-hardening.audit.md` is deleted — its durable content already lives in PR #283's body and `aeg-project/changelog/2026-07-02-task-aeg-governance-hardening-3.md`, confirmed before deletion.
- `apps/aeg/aeg-project/briefs/theme-refactor-brief.md` is deleted — its described work (Studio TopBar navigation, fixed Projects sub-bar, fixed thinner Docs sidebar with independent scrolling) was confirmed already shipped in the current codebase (`apps/aeg/web/studio/src/app/layout.tsx`'s 4-link `TopBar`, `apps/aeg/web/studio/src/app/projects/ProjectsSubBar.tsx`, and the docs layout's fixed-sidebar/independent-scroll structure all match the brief's target exactly), so nothing is lost by deleting it.
- `apps/aeg/web/studio/src/lib/aeg-fs/read-root.ts`'s loader hardening (e.g. requiring a `Lifecycle:` header before treating a `.md` file as an iteration) is flagged as a recommended follow-up for `aeg-studio-cleanup` — not built here; this decision is a role-doc/governance fix, not a Studio code change.

**Lock rationale:** `Lock: YES`. This closes a structural gap that has now produced two confirmed incidents (a broken Studio card, and a stale brief masquerading as a durable artifact). Weakening this into an advisory "prefer" rather than a hard forbidden, or removing the Planner's hard gate, requires a superseding D-entry with `Challenges lock: D-074 — <reason>`, not a quiet edit to any of the five role/skill docs it touches.

---

## D-075 — Issue-existence precondition must cover "row absent" as its own hard-stop, distinct from `#TBD`/blank

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry)
**Lock:** YES
**Authored by:** Developer (dispatched task, aeg-governance-hardening #300)
**Ratified by:** Principal (via task dispatch)

**Context:** The Issue-existence precondition (D-054) currently reads, in both `aeg-root/roles/developer.md` (entry gate item 3) and `aeg-root/skills/brief-authoring/SKILL.md` (Dig-stage precondition check (a)): *"confirm the Issue column carries a real Issue number — not `#TBD`, not blank."* That wording implicitly assumes the task's row already exists in the topology table and only inspects its Issue-column value — it never names the more basic failure that **the row is not in the table at all**, because the plan PR that adds it has not merged to `origin/main` yet. This is not hypothetical: it is the exact condition that existed for this very task, #300, for part of the session that authored it — task 5c's own row was absent from `aeg-root/iterations/aeg-governance-hardening.md` on `origin/main` until plan PR #301 merged at `2026-07-02T10:52:46Z`. "The row isn't there" is a materially different, more urgent failure than "the row is there but its Issue column is blank" — there are no dependency edges, no `Project(s)` value, nothing at all to check yet — and today's wording did not say so explicitly. A worktree or local checkout cut before the plan PR merged will show the row absent even after the plan PR has since merged elsewhere; symmetrically, a stale checkout can show a row that has since moved or changed. Both new checks below must therefore require reading the topology file from a **freshly-fetched `origin/main`**, never a stale local checkout or memory.

**Decision:** Give the Issue-existence precondition an explicit, named, STOP-language check for row-absence, prior to and distinct from the existing `#TBD`/blank check, on both sides of the seam:
1. **`aeg-root/roles/developer.md`.** New entry-gate **item 7**, "Row-existence precondition (hard STOP before step 0, D-075)," appended after existing item 6 — instructing `git fetch origin main` then confirming the task's row exists in the topology file at all, before inspecting its Issue column. Items 1–6 are not renumbered; item 7 is append-only, preserving the numeric cross-references to entry-gate item 3 held by `aeg-root/roles/planner.md` and `aeg-root/contracts/planner-brief.md` (both out of this task's surface). The post-list summary sentence is updated to include item 7 in the topology-reading group.
2. **`aeg-root/skills/brief-authoring/SKILL.md`.** The Dig-stage precondition-check list is relettered: a new **(a) Row-existence (D-054, D-075)** is inserted before the existing Issue-existence check, and the existing three items shift `(a)→(b)`, `(b)→(c)`, `(c)→(d)`. The header changes from "three checks" to "four checks." The Contract-conformance checklist's "Issue-existence precondition (D-054)" bullet is updated to also name the row-existence check, cite D-075, and reference Developer entry-gate items 3 and 7. This relettering is safe because the `(a)/(b)/(c)` list has exactly one cross-reference anywhere in the repo — `aeg-root/contracts/brief-developer.md`'s "Dig stage, item (b)" sentence (about D-056 prior-task coherence) — and that reference is inside this task's own surface, updated in the same change (§3 below).
3. **`aeg-root/contracts/brief-developer.md`.** The "Dig stage, item (b)" cross-reference is updated to "item (c)," reflecting the relettering in (2). A new Consumer-obligations bullet, "Row-existence precondition (hard STOP before step 0, D-075)," is added immediately before the existing Issue-existence bullet, referencing `roles/developer.md` entry gate item 7.

**Boundary (what this is NOT):** not a change to the branch-ID check (D-073), which is unaffected; not a change to the brief-validation gate (task 2, #252); not a change to `aeg-root/roles/planner.md`'s own Step 0 discipline — this is a downstream, defense-in-depth check that fires even when the upstream "merge the plan PR before dispatching" process is violated, not a substitute for it; not new tooling or a CI gate — this is a doc-discipline fix, mirroring D-073's own boundary.

**Alternatives rejected:**
- *Fold this into the existing `#TBD`/blank wording as a parenthetical aside* — rejected; row-absence and blank-Issue-on-an-existing-row are distinct failure modes with different remediation (dispatch is racing a merge vs. the Planner owes an Issue), and folding them together is exactly how the first became invisible in the existing prose.
- *Rely on "the Planner should just always merge the plan PR before dispatching"* — necessary but not sufficient; the value of a downstream check is that it fires even when the upstream process is violated, the same reasoning that put independent D-073 checks on both the Brief Author and Developer sides rather than trusting one side to always get it right.
- *Renumber `developer.md`'s entry gate to insert this check before item 3* — rejected; would break the numeric cross-references held by `aeg-root/roles/planner.md` and `aeg-root/contracts/planner-brief.md`, both out of this task's surface. Append-only as item 7 mirrors D-073's own item-6 append.

**Consequences:**
- `aeg-root/roles/developer.md` — new entry-gate item 7; post-list summary sentence updated.
- `aeg-root/skills/brief-authoring/SKILL.md` — new Dig-stage precondition-check (a); existing (a)/(b)/(c) relettered to (b)/(c)/(d); header updated to "four checks"; Contract-conformance checklist's Issue-existence bullet updated.
- `aeg-root/contracts/brief-developer.md` — "Dig stage, item (b)" cross-reference updated to "item (c)"; new Consumer-obligations bullet added.
- No change to `aeg-root/roles/planner.md`, `aeg-root/contracts/planner-brief.md`, `packages/aeg-core/bin/verify-coherence.ts`, `packages/aeg-core/bin/verify-docs.ts`, or any CI workflow.

**Lock rationale:** `Lock: YES`. This becomes load-bearing dispatch-safety prose, mirroring D-054's and D-073's existing voice — a hard STOP, not a preference. Weakening this into "should" or "prefer" language, or removing either side's check, requires a superseding D-entry with `Challenges lock: D-075 — <reason>`, not a quiet edit to any of the three role/contract docs it touches.

---

## D-076 — Planner §7 doc-update list is mechanically derived from `doc-owners`, not hand-curated from memory

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is doc-discipline + a new pure helper, not a new CI gate)
**Lock:** YES
**Authored by:** Developer (dispatched task, aeg-governance-hardening #219)
**Ratified by:** Principal (via task dispatch)

**Context:** D-058 made the Planner's "Docs to keep coherent" rationale field and the Brief Author's §7 doc-update list a bidirectional obligation (read before planning, update as DoD) — but both were populated from memory/reading, not mechanically checked against anything. The original D-058 incident was exactly this shape: the Planner forgot to name a doc in §7, the Reviewer had no mechanical hook to catch it, and a Tier-3 PR shipped without doc coverage. `aeg-governance-hardening` task 3 (#218, PR #283, merged) drove `aeg-root/doc-owners` to full bind-all coverage — a complete, machine-readable map of code-surface → doc-pointer — which for the first time makes §7 **derivable**, not just rememberable: match a task's intended surface globs against `doc-owners` bindings, and the union of matched pointers becomes §7's floor.

**Decision:** `packages/aeg-core` gains a pure helper, `deriveSection7(intendedSurfaces, docOwnersContent)`, built on the existing `parseDocOwners` (no second parser). It does segment-wise glob overlap (`globsOverlap`, also exported) between each intended surface and each binding's code glob — `**` absorbs the remainder of either side, `*` matches exactly one segment, literal segments require exact equality — and returns the deduped, first-seen-order union of matched doc pointers plus the underlying per-match detail. `aeg-root/roles/planner.md`'s "Docs to keep coherent" field description and `aeg-root/contracts/planner-brief.md`'s corresponding contract row are both updated to state the derivation rule: the Planner names intended surfaces (not resolved doc pointers — the manifest evolves between plan time and dispatch), the Brief Author invokes the derivation at brief-authoring time against the live manifest, and any override of the derived floor (an added doc, or a derived pointer marked "not in scope") must carry a one-line reason in the rationale/brief. Silent overrides are a regression.

**Boundary (what this is NOT):** does NOT touch the C5 doc-coverage *enforcement* gate at PR time (`evaluateC5` in `packages/aeg-core/src/doc-owners.ts`, `packages/aeg-core/bin/verify-docs.ts`) — that gate already runs regardless of this decision; this decision makes §7 reproducible *upstream*, at plan/brief time, so the plan and the gate agree by construction, it does not change what the gate enforces. Does NOT remove Planner/Brief-Author judgment — the derived list is a floor, not a ceiling; cross-cutting docs the derivation can't see are still the Planner's/Brief Author's call, so long as overrides are reasoned, not silent. Does NOT wire the helper into any CI path — it is a Planner/Brief-Author aid, invoked manually during planning/briefing, never by `verify-docs` or any automated gate. Does NOT bake a resolved doc-pointer list into an Issue body at planning time — the derivation runs at brief-authoring time against the live manifest, since `doc-owners` evolves between when an iteration is planned and when each task is dispatched.

**Alternatives rejected:**
- *Wire the derivation into `verify-docs`/C5 as a new enforced check* — rejected per this task's brief; C5 already enforces code→doc coverage at PR time independently (D-062). Duplicating that enforcement one stage earlier, at plan/brief time, would create two enforcement points for the same obligation with different data (the manifest at plan time vs. at PR time), reintroducing the exact staleness problem D-058 was built to close.
- *Resolve and freeze the doc-pointer list into the Issue body at planning time* — rejected; the manifest is live and evolves between iteration planning and task dispatch (new bindings can be added by intervening tasks). Freezing early risks a stale, wrong §7 that looks authoritative but isn't — the derivation must run at brief-authoring time against the current manifest.
- *Build a second, parallel doc-owners parser inside the new helper* — rejected; `parseDocOwners` already exists, is tested, and is the single source of truth for the manifest's grammar (D-062). A second parser is exactly the kind of drift-prone duplication AEG's model exists to prevent.
- *Make overrides of the derived list require a code-level tracking mechanism* — rejected as out of scope; this is a role-doc discipline rule (state the reason in the rationale/brief), not new tooling. A code-level override-audit trail is real future hardening but not required to close the D-058 gap this decision addresses.

**Consequences:**
- `packages/aeg-core/src/derive-section7.ts` (new) — `deriveSection7` + `globsOverlap`, exported from `packages/aeg-core/src/index.ts` alongside the other `doc-owners`-related exports.
- `packages/aeg-core/src/derive-section7.test.ts` (new) — unit coverage: exact-glob match, `**`-vs-concrete-path overlap, no-overlap (disjoint dirs), a surface matching two bindings (dedup in `pointers`, both present in `matches`), and malformed-`doc-owners`-line error delegation from `parseDocOwners`.
- `aeg-root/roles/planner.md` — "Docs to keep coherent" field description gains the derivation rule.
- `aeg-root/contracts/planner-brief.md` — the "Docs to keep coherent" row's "What the consumption means" cell is tightened to state the mechanical floor and the override-with-reason rule (same field, no new row — mirrors D-073's precedent of tightening an existing row).
- `aeg-root/state-machine.md` §15 — the "What is explicitly out of scope for D-062" list no longer names Planner §7 auto-derivation as backlog; a new note points at this decision and the helper.
- No change to `packages/aeg-core/bin/verify-docs.ts`, `evaluateC5`, `aeg-root/doc-owners` itself, or `aeg-root/roles/team-leader.md` (confirmed it does not own §7 language — only a pointer to the brief-authoring skill).

**Lock rationale:** `Lock: YES`. Recommended by the Developer executing this task, mirroring D-073 (the closest precedent — also a pure-doc, dispatch/briefing-safety process rule landed in this same iteration): this becomes a load-bearing briefing-time obligation every future Planner rationale and Brief Author §7 depends on. Weakening it (making the override-with-reason rule advisory, or reverting §7 to pure hand-curation) requires a superseding D-entry with `Challenges lock: D-076 — <reason>`, not a quiet edit to `planner.md` or `contracts/planner-brief.md`.

---

## D-077 — Post-merge Archivist automation + plan-PR Closes guard

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is a GitHub Actions job + an existing CI gate, not new infrastructure)
**Lock:** YES
**Authored by:** Developer (dispatched task, aeg-governance-hardening #309)
**Ratified by:** Principal (via task dispatch)

**Context:** This session's retrospective identified two root causes for most of its process overhead. First, the per-task Archivist specified in full by `roles/archivist.md` never runs — nothing triggers it, so it has been skipped on essentially every merged task PR in this repo's history; the debt is invisible at merge time and only surfaces weeks later when D-056 brief-authoring preconditions and the coherence oracle's A2 check fire against it, blocking unrelated work. In one dispatch session alone, 3 of 7 dispatched briefing agents hard-STOPped on exactly this, and 10 historical PRs needed manual provenance backfill. Second, plan PRs have auto-closed task Issues: three confirmed instances (#294→#293, #298→#297, #288→#287) where a `plan/*` PR's `Closes #N` closed the task Issue when the *plan* merged — before the task was ever executed; #287's task was silently marked done having never run. `roles/planner.md`'s own Plan-PR close-out section already forbids this in prose ("a plan PR creates Issues; it does not resolve one"), but nothing mechanical enforced it — the same prose-without-a-gate pattern D-073/D-074/D-075 each closed for other rules.

**Decision:** Two deliverables. (1) `.github/workflows/archivist.yml::post-merge` runs `packages/aeg-core/bin/archive-task.ts` (built on the pure `buildProvenanceBlock`/`taskRefFromBranch`/`hasProvenance` in `packages/aeg-core/src/archive-task.ts`) on every push to `main`: it resolves the merge commit's PR via `gh api repos/{owner}/{repo}/commits/{sha}/pulls`, skips non-task branches and PRs that already carry a provenance comment (idempotent **per PR**, not per Issue — an Issue can legitimately accrue multiple merged PRs over its life), assembles the provenance block purely from frozen PR facts (a field whose source fact is absent becomes a DANGLING marker, never inferred), posts it as a PR comment, and explicitly closes the task's Issue per D-056, confirming the closed state before exiting. It fails loud (non-zero exit, error printed) on any `gh`/permission error. (2) `packages/aeg-core/src/brief-validation.ts` gains `checkPlanPrNoCloses(branch, prBody)`, wired into `bin/verify-brief.ts` ahead of the existing non-task-branch bypass: a `plan/*` branch whose PR body matches `/\bcloses\s+#\d+/i` fails CI naming the violated rule; plan branches without `Closes` continue to bypass as today.

**Boundary (what this is NOT):** NOT the Iteration Archivist (`roles/iteration-archivist.md`, D-050) — that role remains untouched, Principal-dispatched, forge-agnostic, and explicitly not a GitHub Action; this decision automates only the per-task close-out mechanics (items 1 and 8 of `roles/archivist.md`'s close-out checklist). NOT ledger or changelog automation — items 2–7 of close-out (decision-log presence, docs coherence, per-project state, `docs-index.md`, token ledger rows) remain dispatched-Archivist judgment work; the automated job surfaces DANGLING markers, it does not perform judgment. NOT a change to Phase 10 review gating — code-review and security passes are unaffected; the provenance block simply records their absence as DANGLING when they didn't happen. NOT retroactive re-archival of the many historical PRs that were manually backfilled before this task — this decision governs future merges only.

**Alternatives rejected:**
- *Keep close-out manual, rely on discipline* — this is the status quo that produced weeks of invisible debt and repeated hard-STOPs in dispatched sessions; prose discipline without a triggering mechanism has already been shown (D-073/D-074/D-075) not to hold.
- *Dispatch an LLM-agent Archivist in CI on every merge* — rejected as disproportionate: the provenance block is a pure projection of frozen facts (PR body, metadata, comments), not a judgment call: an agent invocation adds cost and nondeterminism to a task a handful of `gh`/regex operations do deterministically and for free.
- *Rely on GitHub's native `Closes #N` auto-close alone, with no explicit Archivist step* — already ruled unreliable by D-056 ("advisory-only and does not reliably fire across all branch/merge configurations"); this decision's job explicitly closes and confirms the closed state rather than trusting the auto-close.

**Consequences:**
- `packages/aeg-core/src/archive-task.ts` (new) — `taskRefFromBranch`, `hasProvenance`, `buildProvenanceBlock`, exported from `packages/aeg-core/src/index.ts`.
- `packages/aeg-core/src/archive-task.test.ts` (new) — unit coverage of the full field-extraction/DANGLING matrix.
- `packages/aeg-core/bin/archive-task.ts` (new) — the I/O shim invoked by the workflow.
- `packages/aeg-core/src/brief-validation.ts` — new `checkPlanPrNoCloses`, exported from `index.ts`.
- `packages/aeg-core/bin/verify-brief.ts` — wires the guard ahead of the non-task-branch bypass.
- `.github/workflows/archivist.yml` — the `post-merge` job replaces its stub, gains `issues: write` and `pull-requests: write` permissions.
- `aeg-root/roles/archivist.md` — items 1/8 of close-out annotated as automated; D-050 boundary stated explicitly.
- `aeg-root/state-machine.md` §12 — per-task archival (items 1/8) moves from Trusted to Enforced; the Brief Validation bullet documents the plan-PR Closes guard.
- No change to `roles/iteration-archivist.md`, `contracts/archivist-iteration-archivist.md`, token-ledger files, `verify-coherence.ts`, `coherence-checks.ts`, `verify-docs.ts`, or `forge-lifecycle.yml`.

**Lock rationale:** `Lock: YES`. This is now load-bearing lifecycle mechanics: every future task PR's close-out and every future plan PR's Issue-safety depend on these two gates continuing to run as specified. Weakening either (making the post-merge job advisory, removing the plan-PR guard, or reverting to relying on native auto-close) requires a superseding D-entry with `Challenges lock: D-077 — <reason>`, not a quiet edit to the workflow or the validation script.

---

## D-078 — Tool-layer forge gates: nothing reaches the forge unless it deterministically fulfills the contract

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry)
**Lock:** YES
**Authored by:** Planner/Principal (direct fix, #312 — same-day escalation after PR #311's live-fire run)
**Ratified by:** Principal (explicit instruction: "agents cannot fail — a PR/Issue can not be opened if it does not deterministically fulfill the contract, just like commits with husky and commitlint")

**Context:** CI gates are detection, not prevention: a malformed artifact reaches the forge, sits red, and costs the Principal attention. PR #311 proved the failure mode the same day its gates shipped — the Developer produced a PR body satisfying exactly the sections Brief Validation checked and dropped the two it didn't (`Project:`, `For:`); the violation merged and surfaced only in the archivist's provenance DANGLING markers. Agents obey checkers, not documents (Goodhart) — so every checker must sit at the earliest possible chokepoint: the agent's own tool call, where a refusal feeds the exact errors back into the agent's session for an in-session self-fix, with zero forge artifact and zero human time. The repo already proves this mechanism twice: skill-check enforcement (blocks Edit/Write) and the T9 merge gate (blocks red merges), both PreToolUse hooks.

**Decision:** Forge writes are gated at the tool layer, identically to how husky+commitlint gate commits:
1. **`.claude/hooks/check-forge-gates.sh`** (PreToolUse on Bash, wired in `.claude/settings.json`) DENIES raw `gh pr create`, `gh pr edit --body*`, `gh issue create`, `gh issue edit --body*`, and `gh api` POSTs to `/pulls` / `/issues` creation endpoints. Read-only and append commands (view, list, comment, labels, close, merge, checks) are untouched.
2. **`packages/aeg-core/bin/open-pr.ts`** — the only sanctioned PR path: runs verify-brief (branch-aware), verify-docs `--pr`, and the Closes #N gate locally against the intended body, and only calls `gh` on green.
3. **`packages/aeg-core/bin/open-issue.ts`** — the only sanctioned Issue path: a task Issue (any `iteration:*` label) must carry the full eight-field Planner's rationale (`checkIssueRationale`, new `src/issue-validation.ts`) per the planner-brief contract and D-055; non-task Issues pass through unvalidated.
4. **Title grammar** — PR titles and task-Issue titles must match one of the repo's two live forms (`Type(scope): description` with the commitlint types + `Plan`, or `[iteration] id — description`), enforced by `checkForgeTitle` inside both wrappers (husky/commitlint parity for titles).
5. **Decision-number freshness** — `open-pr.ts` refuses a branch whose diff adds a `## D-NNN` heading at or below the highest number already on `origin/main` in that log (the parallel-dispatch collision that struck twice on 2026-07-02: two PRs claiming D-075; a brief pre-writing a taken D-074).
6. **Pre-push branch gate** — `.husky/pre-push` refuses pushing any `task/<iteration>/<id>` branch whose `<id>` does not literal-match a row in that iteration's topology `#` column (D-073 made mechanical at the push chokepoint; also refuses task branches naming nonexistent iterations).
7. **API-bypass denies** — the hook also denies `gh api` PATCH edits to `/pulls/N`//`/issues/N` and curl/wget write-methods against the GitHub API's pulls/issues endpoints.
8. **CI keeps running the identical checks** (same aeg-core code) as a backstop for non-hook writers (GitHub UI edits, other tooling). A red CI on a gated rule now signals a hook bug, not an agent failure.

**Operational rule (session-start window):** hooks load at session start — agent sessions already running when a gate change merges do not carry it until restarted. After merging any change to `.claude/hooks/` or `.claude/settings.json`, restart running agent sessions before dispatching further forge writes.

**Boundary (what this is NOT):** not a change to what any contract requires — only to WHERE it is enforced (earliest chokepoint); not content/quality judgment — all gates remain presence/shape-deterministic (review stays judgment); not enforcement for humans outside the agent harness (the hook only intercepts agent tool calls; CI covers the rest); not the Planner→Brief R1 completeness gate in CI (#251 remains its own task — though `checkIssueRationale` now enforces the same eight fields at Issue-creation time, which substantially pre-empts it).

**Alternatives rejected:**
- *Parse the raw `gh` command in the hook and validate inline* — shell-quoting/heredoc parsing is fragile; deny-and-redirect to a wrapper that receives the body as a file is deterministic.
- *Rely on briefs instructing agents to run the gates locally before opening* — that is prose discipline, the exact mechanism that failed all session.
- *CI-only enforcement (status quo)* — detection, not prevention; the Principal pays for every red.

**Consequences:** `.claude/hooks/check-forge-gates.sh` (new), `.claude/settings.json` (hook wired), `packages/aeg-core/bin/open-pr.ts` + `bin/open-issue.ts` (new), `packages/aeg-core/src/issue-validation.ts` + tests (new), `checkForgeTitle` in `src/brief-validation.ts`, `.husky/pre-push` branch gate, `state-machine.md` §12 gains the tool-layer bullet. Known residual (accepted, CI-backstopped): file-indirection (`bash script.sh` wrapping a raw command) and non-`gh`/`curl` API clients cannot be caught by command-string matching — a PATH-level `gh` shim is the future hardening if the backstop ever fires. Every future agent session inherits the gates automatically via settings.json.

**Lock rationale:** `Lock: YES`. This is the load-bearing "agents cannot fail" property — weakening it (removing a deny pattern, making a wrapper gate advisory, allowing raw forge writes) requires a superseding D-entry with `Challenges lock: D-078 — <reason>`, not a quiet edit to the hook or wrappers.

---

## D-079 — Surfaced-doc manifest: canonical taxonomy for what AEG surfaces as documentation

**Date:** 2026-07-02
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry)
**Lock:** YES
**Authored by:** Developer (dispatched task, aeg-consolidation #265)
**Ratified by:** Principal (via task dispatch)

**Context:** `aeg-consolidation` task 4 needed a new check (C6) asserting every canonical AEG framework doc is reachable in the doc-nav tree the docs engine (`packages/aeg-core/src/docs/`) builds, with no orphans and no dangling cross-references. That check necessarily defines "what counts as a surfaced doc" — but a second, downstream consumer already exists: `aeg-studio-cleanup`'s docs-curation task will use the exact same definition to decide what Studio's live `/docs` page excludes (today it walks every `.md` file under `aeg-root/`, leaking iteration execution files into the nav via a hardcoded `iterations/ → "Iterations"` section mapping). Two independently-authored exclusion lists — one in this check, one in Studio's curation task — is the precise failure mode a single-source-of-truth manifest exists to prevent (the same principle behind D-062's `doc-owners` seam and D-076's `deriveSection7`).

**Decision:** The Principal's criterion for "surfaced": the generic AEG framework docs — the same set a public AEG page would show. Anything encoding this repo's or a project's execution state or registry is excluded. Concretely, against today's `aeg-root/` tree: **excluded** — `iterations/*.md` except `iterations/README.md` (active topology files are execution state, and this exclusion transitively covers `iterations/completed/**`); any `*.tokens.md` ledger; `aeg-root/projects.md` (this repo's registry); `aeg-root/discovery/**` (dated session artifacts). **Surfaced** — everything else: `coordination.md`, `state-machine.md`, `aeg-manual-flow.md`, `process.md`, `enforcement.md`, `reviewer-prompt.md`, `iterations/README.md`, `contracts/**`, `roles/**`, `diagrams/**`, `skills/**`, and any new generic doc not matching an exclusion rule (default-surfaced, so a new doc cannot silently vanish from the manifest). The mechanism is **data, not hardcoded logic**: `packages/aeg-core/src/docs/surfaced-manifest.ts` exports the exclusion rules as an ordered list plus `isSurfacedDoc(relPath, frontmatter)`; a per-file `surfaced: true|false` frontmatter field overrides the path rules in either direction (an escape hatch for the enumerated exceptions, not a way to redefine the taxonomy per-file). C6 (`docs-coherence.ts`, `state-machine.md` §15c) and `aeg-studio-cleanup` #292 both consume this one definition.

**Boundary (what this is NOT):** NOT a change to Studio — `apps/aeg/web/studio` is validated (typechecks against the additive `@atta/aeg-core/docs` export surface) but not edited; Studio's `load-aeg-docs.ts` curation is `aeg-studio-cleanup` #292's job, after this merges. NOT a general-purpose doc-classification system — the manifest only answers "is this `aeg-root/` doc generic-framework or execution-state," nothing more.

**Alternatives rejected:**
- *Let C6 and Studio's curation each maintain their own exclusion list* — the exact failure mode this decision exists to prevent: two competing definitions of "canonical doc" drift apart silently, and a fix to one doesn't propagate to the other.
- *Hardcode the exclusion list inside the C6 check function* — fails the Principal's "one source of truth, nothing missed" requirement; data (importable, reusable by #292) beats logic embedded in a single check.
- *No frontmatter override, path rules only* — too rigid for the enumerated exceptions (`iterations/README.md` already needs one); a boolean override is the minimal escape hatch without re-opening the taxonomy question per file.

**Consequences:**
- `packages/aeg-core/src/docs/surfaced-manifest.ts` + `.test.ts` (new) — the manifest: `SURFACED_EXCLUSION_RULES`, `isSurfacedDoc`, `surfacedDocs`.
- `packages/aeg-core/src/docs/docs-coherence.ts` + `.test.ts` (new) — the C6 check, consuming the manifest; fixture-driven tests under `packages/aeg-core/src/fixtures/docs-coherence/`.
- `packages/aeg-core/src/docs/parse-doc.ts` + `types.ts` — `DocFrontmatter` gains `surfaced?: boolean`, parsed from YAML frontmatter.
- `packages/aeg-core/src/docs/index.ts` — exports the new modules from the `@atta/aeg-core/docs` subpath; `aeg-studio-cleanup` #292 imports the manifest from there.
- `packages/aeg-core/bin/verify-docs.ts` — C6 wired into full mode, walking `aeg-root/*.md` via `git ls-files`.
- `aeg-root/state-machine.md` §15c (new) — the check registry entry for C6.
- `aeg-root/enforcement.md` — one additive Ring 2 (Audit) row for the docs coherence gate.
- No change to `apps/aeg/web/studio` itself, `verify-coherence.ts`, or any existing C0–C5 check.

**Lock rationale:** `Lock: YES`. This is the single source of truth two iterations depend on (this one's C6, and `aeg-studio-cleanup`'s Studio curation) — weakening it (reverting to hardcoded exclusion logic, or letting a second competing manifest exist) requires a superseding D-entry with `Challenges lock: D-079 — <reason>`, not a quiet edit to the check or to Studio's loader.

---

## D-080 — First-push C5 doc-coverage failures self-serve via commit-message Doc-waiver trailers

**Date:** 2026-07-03
**Status:** SUPERSEDED
**Type:** 2 (reversible via a superseding D-entry)
**Superseded by:** D-097
**Lock:** NO
**Authored by:** Principal's planning assistant (direct fix, live incident during `aeg-studio-cleanup` task 5 / `aeg-governance-hardening`)
**Ratified by:** Principal (explicit instruction: fix the process so this stops costing Principal attention on every occurrence)

**Context:** `roles/developer.md` §127 already authorizes a Developer to self-serve a `Doc-waiver: <pointer> — <reason>` line when a bound doc genuinely does not need updating — no Principal involvement, Reviewer judges it later. But `.husky/pre-push`'s C5 gate (D-078) fetches `PR_BODY` via `gh pr view`, which returns nothing before a PR exists — so on every branch's first push, the developer-authorized self-service path was structurally unreachable, and the only remaining path was `override:docs`, which is Principal-only (`state-machine.md` §14/§400). Task 5 of `aeg-studio-cleanup` (#331) hit exactly this: a one-line dead-link removal under `apps/aeg/**` (bound to `apps/aeg/specs/aeg-app-architecture.md`), doc confirmed not stale, correctly stopped rather than self-granting a Principal-only override — but the resulting escalation consumed a disproportionate amount of Principal time re-deriving that the situation was routine and expected, not novel. `verify-docs.ts`'s own header comment already acknowledged the gap ("on the first push there is no PR yet and the check is strict") without closing it.

**Decision:** `evaluateC5` (`packages/aeg-core/src/doc-owners.ts`) already parses `Doc-ack:`/`Doc-waiver:` lines out of whatever text blob it is given via regex — it has no dependency on that text being an actual PR body. `.husky/pre-push` now exploits this: when `gh pr view` returns an empty body (no PR yet), it instead passes `git log origin/main..HEAD --format=%B` (this branch's own commit messages) as `PR_BODY` to `verify-docs.ts --push`. A developer who judges a bound doc does not need updating adds `Doc-waiver: <pointer> — <reason>` as a trailer to their last commit and pushes again — no Principal step required. The same line must still be carried into the PR body at open time, where `open-pr.ts`'s `--pr` check re-validates it independently (Reviewer-visible, audit-logged, per §127). The pre-push failure message was rewritten to state this path explicitly instead of leaving the agent to infer it or escalate by default. `roles/developer.md`'s "When to escalate" table gained an explicit row naming this as NOT a Principal-only case.

**Boundary (what this is NOT):** does NOT touch `override:docs`/`OVERRIDE_DOCS=1`, which remains Principal-only for cases where a waiver itself is in question, not merely unreachable due to sequencing. Does NOT weaken D-078's "nothing reaches the forge unless it deterministically fulfills the contract" — no deny pattern is removed and no gate becomes advisory; the same Doc-waiver mechanism D-078/§127 already sanctions is simply made reachable at the chokepoint where it was previously blocked by an accident of git/GitHub sequencing (a PR cannot exist before its branch is pushed). Does NOT change C0–C4 (PR-body-only contracts) or any check other than C5's push-mode text source.

**Alternatives rejected:**
- *Relax C5 to a no-op on first push, rely on `open-pr.ts --pr` to catch it at PR-open* — reopens the exact "follow-up-push window" gap D-078's push gate exists to close (a branch could sit pushed-but-no-PR indefinitely with undocumented bound-code changes visible to anyone who fetches it).
- *Require Principal to grant `override:docs` for every first-push doc-coverage failure* — the status quo this decision replaces; correct in intent (a human backstop exists) but disproportionate for the common case where the developer's own judgment (already trusted for in-PR waivers) is sufficient.
- *Have the developer open a draft PR first, purely to get a `PR_BODY` for the hook to read, then push* — extra forge write cycles and a race (the hook still runs before the draft PR's body is guaranteed queryable); commit trailers are already local and travel with the push atomically.

**Consequences:** `.husky/pre-push` (C5 branch: falls back to commit-message text as `PR_BODY` when no PR exists; failure message rewritten). `packages/aeg-core/bin/verify-docs.ts` (header comment updated). `aeg-root/roles/developer.md` (`## When to escalate` table gains one row). No change to `evaluateC5`/`doc-owners.ts` itself — the existing regex-based parsing already supported this; only the caller's text source changed.

**Lock rationale:** `Lock: NO`. This is a process-ergonomics fix within an existing, locked mechanism (D-078) — not a new invariant other work depends on. If a future incident shows commit-trailer waivers are being abused (waivers added without genuine justification, e.g. to route around Reviewer scrutiny since the Reviewer only sees them once copied to the PR body), tightening this does not require a superseding entry — a direct fix suffices, same as this one was.

---

## D-081 — Deterministic dispatch-and-exit gates: no fact an agent needs may live only in prose

**Date:** 2026-07-03
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry)
**Lock:** NO
**Authored by:** Developer (dispatched task, aeg-governance-hardening #324, task 11)
**Ratified by:** Principal (via task dispatch)

**Renumbered from D-080 to D-081 at merge time.** This task's brief derived its `D-###` number (`--next-decision`) on a worktree cut before D-080 above (a same-day, concurrently-dispatched direct fix) merged first and claimed that slot — exactly the append-only-log collision the dispatching brief itself anticipated ("if there's a collision at merge time, that's expected and the merge-order winner keeps their number, the loser re-derives"). This entry is that re-derivation; no content below was authored assuming D-081, only the number changed.

**Context:** The 2026-07-02/03 dispatch wave proved, live, six distinct instances of the same underlying failure — a deterministic fact (forge state, leftover-branch state, a doc-coherence baseline, a code premise) reaching a Developer agent as **prose it had to re-derive from scratch**, rather than as a **check it could run**: (1) four Developer agents independently stopped mid-dispatch on the identical fact — "the prior iteration (`aeg-consolidation`) is complete but not archived" — re-derived from scratch by each, at real token cost, hours after the fact first became true; (2) a brief asserted "`verify-docs` full mode must be green" as a pre-flight condition without ever running it — it carried 44 pre-existing unrelated findings and had never been green; (3) two briefs (herald-engine skill, ui-api-routes skill) described a target architecture a later, uncited migration had already superseded, discovered only mid-dig; (4) a finished task hit a genuine push-time dead end: the pre-push hook's C5 doc-coverage check could not see a `Doc-waiver:` line before a PR exists (no PR body to read on first push), and the documented escape hatch (`OVERRIDE_DOCS=1`) turned out to be dead code in push mode (`runPushMode()` never called `overrideActive()`) — **D-080 above independently closed the first half of this** (the no-PR-body gap, via commit-message trailers) while this task was still in flight; this task closes the remaining half (the dead `overrideActive()` call) and adds a second, complementary source for a drafted body — `PR_BODY_FILE` — for the pre-authoring `verify-dispatch --simulate` dry run below, where no commit exists yet for a trailer to live in; (5) two Brief-Author-authored artifacts shipped with empty bodies from a stream body-file bug (task 17/#333's surface, not re-fixed here); (6) two concurrently-open plan PRs mutually red-flagged each other's Issues in the repo-wide coherence oracle's T2 check, because T2 runs unscoped in CI (task 19/#336's surface, not re-fixed here). Items 1–4 are this task's surface; items 5–6 are declared collisions with concurrently-dispatched tasks, deliberately not absorbed.

**Decision:** Build the deterministic pre-work and exit-gate layer entirely in `@atta/aeg-core`, entirely pure functions with fixture tests behind thin CLI shims — composing existing checks, never re-implementing forge-fetching, provenance detection, rationale-checking, or doc-coverage evaluation:

1. **`src/premise-check.ts`** — a `Premise:` block grammar (`parsePremiseBlock`, `checkPremises`): exactly three assertion kinds, `contains:<literal>` / `absent:<literal>` / `sha256:<hex>` — a pin format, not a DSL. `src/brief-validation.ts` gains `checkPremiseCoverage`: a brief with a real §4 code surface and zero premise coverage is malformed.
2. **`src/leftover-detection.ts`** — `classifyLeftover`: `clean | resume | stop` from branch/worktree existence + commits ahead of main. Step 0 never creates a commit, so any commit already ahead of main is real prior work; `stop` prevents Step 0 from silently re-branching over it.
3. **`src/baseline-capture.ts`** — `captureBaseline`/`compareToBaseline`: current `verify-docs --full`/`verify-coherence` finding counts, captured at run (never a committed file, D-074), compared per-tool against a prior capture. The standing contract becomes **"no worse than the captured baseline,"** never "must be green" — directly closing live-fire #2.
4. **`src/dispatch-gate.ts`** — `checkDispatchReadiness`: composes `parseIteration`, `checkIssueRationale`, `hasProvenance`/`taskRefFromBranch`, and `fetchProvenance` (reused from `verify-coherence.ts`, not re-implemented) into one `{ ready, blockers }` verdict over Issue-existence, D-078 rationale, depends-on/conflicts-with forge state, prior-task archival, and prior-iteration archival — directly closing live-fire #1.
5. **`bin/verify-dispatch.ts`** — the composed CLI: `<iteration> <n> [--premise <file>] [--simulate <file>] [--check-baseline <file>]`, on a freshly-fetched `origin/main`.
6. **`bin/verify-task.ts`** — the Developer's exit composite: typecheck + lint + tests + build (scoped to `@atta/aeg-core`; a full monorepo application build remains the deployment pipeline's job) + `verify-docs --pr` + premise coverage/recheck, one summary, same commands CI runs.
7. **`verify-docs.ts` push-mode fixes** — `runPushMode()` now also accepts `PR_BODY_FILE` (a local path to a drafted-but-not-yet-committed PR body) as a second, complementary source for `Doc-waiver:`/`Doc-ack:` lines alongside D-080's commit-trailer path — used by `verify-dispatch --simulate` below, which dry-runs push-mode C5 before any commit exists for a trailer to live in — and now calls `overrideActive()` identically to `runPrMode()`, closing the one half of live-fire #4 D-080 did not (`OVERRIDE_DOCS=1`/`override:docs` was still dead code in push mode), additively (no existing gate weakened).
8. **Prose-gate sweep** — `roles/developer.md`'s entry-gate items 3/4/5/7 and `skills/brief-authoring/SKILL.md`'s Dig-stage preconditions now point at `verify-dispatch` as the mechanized "how," keeping the existing prose as the "why" and the manual `gh`/`jq` fallback; `skills/brief-authoring/SKILL.md` gains the `Premise:` field with its own authoring rules; `contracts/brief-developer.md` gains the Developer-side premise-recheck obligation; `contracts/planner-brief.md` gains a one-line note that premise pinning is deliberately outside its field table (see below); `state-machine.md` gains §15d plus the §12/§14 override cross-mode-consistency notes; `enforcement.md` gains three new Ring 0 rows plus the corrected `git push` row.
9. **Stash-in-shared-worktree rule** — `roles/developer.md`'s worktree-discipline section now states: stash is off-limits in a `.worktrees/` shared-repo checkout (stash refs are global across worktrees; a stray `stash pop` in one worktree can pop another task's in-progress stash — a near-miss on task 8's PR #320); use a WIP commit on your own branch instead.

**Premise pinning is a Brief-Author-only field — not a Planner-rationale field.** Premises are perishable, file-content-level detail (current signatures, current constants) — squarely the Brief Author's half of the Planner/Brief Author division of labor `contracts/planner-brief.md` already describes, not a durable conclusion the Planner should seed. `contracts/planner-brief.md`'s field-by-field table is therefore unchanged (no new row); a one-line note records why. `contracts/brief-developer.md` gains the field, since premise pins do cross the Brief Author → Developer seam.

**Two location corrections found during pre-flight, not brief errors requiring a stop:** `evaluateC5` and `parseDocOwners` (named in the dispatching brief as living in `pr-tier.ts`/`file-classify.ts`) actually live in `src/doc-owners.ts` — the functions exist and are correctly reused from there; only the brief's file-path description was stale.

**Boundary (what this is NOT):**
- **Not** a fix for task 17/#333's stream-body-file bug (empty PR/Issue bodies) — declared, non-conflicting, separate surface.
- **Not** a fix for task 19/#336's T2-scoping / single-plan-PR-guard work — declared conflict, serialize after.
- **Not** automatic dispatch — `verify-dispatch` reports readiness; nothing opens a worktree/branch/PR on its behalf.
- **Not** a change to what any existing check (A1–A3, T1–T3, D1, L1–L3, C0–C6, R1) asserts — every one is reused as-is.
- **Not** a `Tokens:` field gate — `Tokens:` is not currently gated anywhere in `brief-validation.ts`; this task does not invent new gating scope for a field with no existing gate (the honest-conformance-sentinel item collapsed to this finding, not new code).
- **Not** an edit to `aeg-root/doc-owners` — explicitly out of this task's surface (D-079's seam); `verify-dispatch.ts`/`verify-task.ts` remain unbound in the manifest, which is dormancy, not failure.

**Alternatives rejected:**
- *A fourth assertion kind for the Premise grammar (e.g. regex match)* — rejected; the grammar is deliberately minimal, a pin format not a DSL, per the dispatching brief's own constraint.
- *Wiring `checkPremiseCoverage` directly into the already-CI-wired `checkBriefSections`/`verify-brief.ts` aggregate* — rejected; that gate runs at PR-open time with no guaranteed diff-derived file list in every calling context, and retrofitting a new blocking requirement into an existing CI-enforced gate, repo-wide, is a bigger decision than this seam's stated surface. `checkPremiseCoverage` is exported and enforced via `verify-task.ts` instead, against the real diff.
- *Batched GraphQL for `verify-dispatch`'s per-task forge lookups* — rejected in favor of individual `gh` CLI calls; the tool evaluates one task's small, bounded dependency/conflict/prior-task set (typically under ten Issues/PRs), a different scale than the coherence oracle's whole-iteration sweep that batching exists to protect.

**Consequences:**
- New: `packages/aeg-core/src/{premise-check,leftover-detection,baseline-capture,dispatch-gate}.ts` + `.test.ts`; `packages/aeg-core/bin/{verify-dispatch,verify-task}.ts`.
- Modified: `packages/aeg-core/src/brief-validation.ts` (`checkPremiseCoverage`); `packages/aeg-core/src/index.ts` (new exports); `packages/aeg-core/bin/verify-docs.ts` (`PR_BODY_FILE` + `overrideActive` in push mode).
- Docs: `aeg-root/state-machine.md` (§15d, §12/§14), `aeg-root/enforcement.md` (Ring 0 rows + `git push` row), `aeg-root/skills/brief-authoring/SKILL.md` (pre-authoring gate pointer + Premise pins section), `aeg-root/contracts/planner-brief.md` (premise-field note), `aeg-root/contracts/brief-developer.md` (premise field + row), `aeg-root/roles/developer.md` (mechanized precondition pointer + stash rule).
- No change to any existing check's logic, `.husky/pre-push`'s existing job (dispatch-readiness checking lives in the new `verify-dispatch.ts`, invoked explicitly, not silently injected into every push), or `apps/aeg/web/studio` (no consumer there for this task's output).

**Lock rationale:** `Lock: NO`. This is a new, additive gate layer with no locked irreversible branch — a future task may reshape `verify-dispatch`'s composition (e.g. batching its forge calls, or resolving cross-iteration edges more precisely) via an ordinary superseding or amending decision, not a lock challenge.

---

## D-082 — T2 (orphan-task) relocated out of task-PR CI: point-of-power principle

**Date:** 2026-07-04
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry)
**Lock:** NO
**Authored by:** Developer (dispatched task, aeg-governance-hardening #364, task 24, Part 2)
**Ratified by:** Principal (2026-07-04 amendment to #364, directing this supersession explicitly)

**Context:** D-069/task 19 (#336) scoped T2 (open Issue labeled `iteration:X` missing from X's topology file) to the PR's own iteration in CI, closing the #358/#359 incident where an unrelated iteration's gap blocked an unrelated PR. That scoping was necessary but not sufficient: it still let T2 block *any* PR — task or plan — within the same iteration as the gap. Live incident #363 (2026-07-04) proved this the wrong boundary: registering Issues #364/#365 into `aeg-governance-hardening` correctly created a topology gap (the rows hadn't merged yet) and correctly reddened T2 in CI — but the PR it reddened was #363, an in-flight **task** PR that could neither have caused the gap (it never touched the topology file) nor cure it (only a plan PR editing `aeg-root/iterations/aeg-governance-hardening.md` can add the missing row). The gate was structurally incapable of being satisfied by the PR it was blocking — the definition of a misplaced chokepoint.

**Decision:** A gate may only red a PR that could cause or cure the violation it reports (the **point-of-power principle**). Applied to T2: it now blocks CI **only** for a plan PR — one whose own diff touches an active iteration's topology file (`aeg-root/iterations/*.md`, excluding `completed/`), reusing the exact `iterationSlugFromTopologyPath`/`touchesAnyTopology` predicate task 24 Part 1 extracted to `src/single-plan-pr.ts` (one implementation per fact — no second "is this a plan PR" check). Everywhere else — every task-PR CI run, `--json`/audit mode, and the `daily-drift` scheduled job — T2's findings are demoted from `status: 'fail'` to `status: 'info'` via the new pure function `scopeT2ToPlanPr` (`packages/aeg-core/src/coherence-checks.ts`), never omitted, so the repo-wide picture stays visible for audit. `checkT2`'s own assertion logic (what counts as an orphan Issue) is completely untouched — this is a CI-wiring relocation, not a change to what T2 asserts.

**This explicitly supersedes half of D-069/task 19's shipped placement** — the part of task 19 that scoped T2 to the PR's iteration but still let it block every PR type within that iteration. Task 19's scoping-by-iteration remains in force (still passed as `ciIterationSlug` into `checkT2`); only the "which PR kinds can T2 red" boundary changes. This is a recorded supersession, not a quiet edit — task 19's PR and this entry both remain in the log; a future reader tracing T2's CI behavior must read both.

**Boundary (what this is NOT):**
- **Not** a change to `checkT2`'s detection logic — the same `openIssuesBySlug`/`topologyIssuesBySlug` comparison, same failure reasons.
- **Not** a weakening of the gate for plan PRs — a plan PR that introduces or fails to close a topology gap is still blocked exactly as before.
- **Not** a merge-ref/repo-state fix — that is this same task's item 5 (see the PR body), applied to `loadIterationFiles`/`runCoherenceChecks`, independent of this relocation.

**Alternatives rejected:**
- *Widen T2's `ciIterationSlug` scoping further (e.g. exclude same-day-registered Issues)* — a time-based heuristic that would still block task PRs on genuine, older gaps; doesn't address the structural mismatch (task PRs can never fix a topology gap, regardless of the gap's age).
- *Turn T2 permanently info-only, everywhere, relying solely on `daily-drift` for enforcement* — loses the one place T2 SHOULD block (a plan PR that itself creates or fails to close the gap it's introducing); the point-of-power principle says demote where a PR is powerless, not everywhere.
- *Block on `BRANCH` prefix (`plan/` vs `task/`) instead of the diff-based predicate* — rejected in favor of the diff-based `touchesAnyTopology` check already extracted in Part 1: branch-name conventions are not enforced anywhere and a mis-named branch would silently escape the correct gate; the diff-based check is the same ground truth the single-plan-PR guard already trusts.

**Consequences:** `packages/aeg-core/src/coherence-checks.ts` (`scopeT2ToPlanPr`, new, exported via `src/index.ts`); `packages/aeg-core/bin/verify-coherence.ts` (`runCoherenceChecks` accepts `isPlanPr`, computed from `PR_TOUCHED_FILES` in CI, defaulting to `false` — never-blocking — everywhere else); `.github/workflows/forge-lifecycle.yml` (`coherence-gate` job resolves and passes `PR_TOUCHED_FILES`/`PR_HEAD_SHA`); `aeg-root/enforcement.md` (Ring 1 T2 row updated); `aeg-root/state-machine.md` (T2's gate-registry placement updated). No change to `daily-drift`'s own job (task 23) — T2 was never wired into it; the repo-wide `--json` picture it could consume already reports T2 as info via this same relocation.

**Lock rationale:** `Lock: NO`. A CI-wiring placement, not an irreversible architectural commitment — a future incident could motivate a different point-of-power boundary (e.g. also blocking on a task PR that itself deletes the Issue's topology row) via an ordinary superseding entry.

## D-083 — Vinaya: derived status / forge-native state is the product's core doctrine

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (Planner mode; Vinaya review program R-1)
**Context:** The Vinaya review program (4 adversarial rounds, 16 vendor-diverse reviews, unanimous round-4 approve) ratified a decision register; R-numbers map to D-083–D-109, all PENDING until the Principal's window.
**Decision:** Vinaya reads all work state from the forge (Issues, PRs, CI, labels) and never writes parallel status documents. The file-backed StateSource adapter exists solely as this repo's transitional shim and is deleted by the migration iteration.
**Alternatives rejected:** Status files (drift; the disease AEG's D-029 eliminated).
**Consequences:** Every check and Studio render is a stateless projection of forge facts; adopters are forge-native from day one.

## D-084 — Vinaya is an OSS adoption product, not SaaS

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** TL (R-2)
**Context:** Positioning decision from the review program.
**Decision:** Vinaya ships as a free npm package (`vinaya`, name verified free); adoption is the goal, not revenue. Target adopter: solo/small AI-native teams. The package stays surgically small (CI runs it on every PR — size is fleet tax); no postinstall — nothing executes on install.
**Alternatives rejected:** SaaS/hosted product (kills the not-a-SaaS trust posture); editor extension distribution.
**Consequences:** Trust surface (D-089) and reversibility are product features, not conveniences.

## D-085 — Two names: AEG is the model, Vinaya is the tool

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 1
**Lock:** YES
**Authored by:** TL (R-3)
**Context:** The methodology and its reference implementation need separable identities so the methodology survives tooling churn.
**Decision:** AEG = the governance model (first-class, citable, forge-agnostic in principle). Vinaya = the reference implementation (GitHub-first in practice; Pāli: the code of discipline). Stated everywhere: "Vinaya is the reference implementation of AEG." Repo rule: protocol-instance artifacts keep AEG names (`aeg-root/`, `aeg-project/` — renaming breaks gate plumbing for zero gain); product code migrates into a vinaya namespace only DURING the npm extraction, never as a standalone rename. Machine-generated artifacts in adopter repos carry a `vinaya-` prefix. Pāli naming is elective aesthetic, consistent with D-025.
**Alternatives rejected:** One name for both (platform absorption would orphan the methodology); renaming aeg-root/ now.
**Consequences:** Surfaces: npm `vinaya`, Vinaya Studio, vinaya.attalabs.dev (landing + /docs + /aeg + Known Limits).

## D-086 — Vinaya surfaces: npx init + site; no editor extension; GitHub App deferred

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** TL (R-4)
**Decision:** Entry point is `npx vinaya init`; the site is `vinaya.attalabs.dev`. No editor extension. A GitHub App (for deployed Studio / org installs) is deferred, architecture pre-paid in D-087/D-098.
**Alternatives rejected:** Editor-extension-first (harness-bound, per-vendor); GitHub App at v1 (install friction before trust exists).
**Consequences:** v1.0 scope is CLI + local Studio (D-104).

## D-087 — Vinaya Studio: proof not hook; one derivation library; Studio is a pure renderer

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** YES
**Authored by:** TL (R-5)
**Decision:** Studio (renamed **Vinaya Studio**) is the visual proof of derived status, not the acquisition hook. Locked architecture: ONE derivation library with N consumers (CLI gates, local Studio, future deployed Studio); Studio renders `check --json` / forge-facts output and NEVER re-implements governance logic; no database — it stores nothing, so it cannot lie.
**Alternatives rejected:** Studio-led acquisition; renderer-side logic (if Studio and gates could disagree about truth, the design has failed).
**Consequences:** vinaya-studio-v1 task 2 enforces the renderer contract; deployment phases in D-101.

## D-088 — Landing positioning copy (headline / subhead / clarifier / genre anchor)

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-6)
**Decision:** Headline "Agents obey checkers, not documents." Subhead: install Vinaya and every coding agent must satisfy the same deterministic rules before merge. Clarifier: "We don't block agents — we redirect them into a governed flow, so you review judgment, not compliance." Genre anchor: "Branch protection for the AI era." Boundary statement: sits underneath Cursor/Claude Code/Codex/Gemini CLI/GitHub, replaces none of them. One CTA: `npx vinaya init`.
**Consequences:** Launch-iteration site content; wording refinements stay Principal-owned (D-108).

## D-089 — The trust surface: non-destructive init, demo break, eject, doctor-as-product

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-7)
**Decision:** Trust is engineered: `init` is non-destructive by contract (full diff → confirm → install; --dry-run); `demo break` is the productized belief moment (refusal → self-correction → pass); `eject` restores stock in one command (reversibility as prerequisite); `doctor` is treated as a product (diagnoses everything, mutates nothing; every support interaction starts with its output).
**Consequences:** vinaya-cli-v1 tasks 4, 6, 7.

## D-090 — Enforcement hierarchy inverted: interception is an opt-in accelerator, never load-bearing

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** YES
**Authored by:** TL (R-8)
**Decision:** The hierarchy: deterministic checks → CI + branch protection (THE guarantee) → git hooks (universal ring 0) → forge-write interception as opt-in accelerator only. The model must survive interception disappearing tomorrow. Honest threat boundary stated publicly: ring 0 guards honest-but-fallible agents; ring 1 + branch protection is the boundary against everything else.
**Alternatives rejected:** Interception-load-bearing designs (earlier drafts) — fragile, harness-bound.
**Consequences:** The gh shim is fast-follow, out of v1.0 (D-104); Known Limits page states the boundary.

## D-091 — Substrate: Issues + labels are machine truth; Projects v2 a generated view; branch protection never auto-applied

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-9)
**Decision:** Vinaya's machine substrate is Issues + labels (REST, stable, audit-trailed). GitHub Projects v2 is an optional generated human view, never a source of truth. `init` prints the recommended branch-protection command and never applies it.
**Consequences:** Scaffolding (D-104 task set) writes labels/templates only; no GraphQL dependency at v1 core.

## D-092 — Custom checks are executables honoring the error contract; config never grows conditionals

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** YES
**Authored by:** TL (R-10)
**Decision:** A custom check is any executable honoring the §5 error contract, registered in `vinaya.config.json` (repo-local overrides `~/.vinaya/config.json`). Core gates are expressed through the SAME interface — no privileged API. Config never grows conditionals: glob scoping per gate is permitted (D-109); if/unless/except are forbidden — complexity escapes to executables.
**Alternatives rejected:** A plugin SDK (barrier to entry); config DSL (the complexity trap every CI config falls into).

## D-093 — Version skew handled by compatible schema ranges

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-11)
**Decision:** The generated workflow validates compatible schema RANGES, not exact pins; mismatch fails with a self-explaining message ("run `vinaya upgrade`"). The CLI ignores unknown config fields (forward-compat) and validates schema-range membership (backward-compat).
**Consequences:** `vinaya upgrade` is the only sanctioned migration path (D-089).

## D-094 — Sandbox cut; dogfood-as-demo is its successor

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-13)
**Decision:** No sandbox/playground surface. Its job (belief before install) is done by `vinaya demo break` locally and, later, one hosted read-only Studio instance pointed at Vinaya's own public repo — a real governed repository under glass (D-101). The site's second link, never the first touch.

## D-095 — Cetana is retired; harvest from living code; deletion deferred until Vinaya works

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** TL (R-14; amended sequencing, Principal 2026-07-04)
**Context:** Cetana's founding problem (Desktop↔Code copy-paste friction) dissolved with harness maturity; its governance embryo grew into AEG itself; its coordination mechanism (~/.cetana JSONL, filesystem IPC, blocking MCP) is local parallel state — the disease derived-status doctrine eliminates. Principal confirms zero usage.
**Decision:** Cetana is retired as a product decision NOW; execution is deferred: `vinaya-cli-v1` harvests directly from Cetana's living code (init interactive skeleton + abort-path regression tests; hierarchical config pattern; the escalation severity taxonomy already lives on as AEG's `needs:*-input` labels). Deletion of `apps/cetana-ai`, spec archival, skill removal, the repo-wide mention sweep, and Issue close-outs (#30) ride a later retirement iteration, gated on "Vinaya CLI + Studio work 100%." Explicitly NOT harvested: JSONL state logs, filesystem IPC, coordination servers. The Slice-1 cognitive-continuity finding stays durably recorded in `apps/cetana-ai/specs/cetana-experiment-log.md` until that iteration re-homes it.
**Alternatives rejected:** Retire-first (original §11 sequencing — dissolved: the salvage-audit-as-planning-input is unnecessary when the CLI harvests from living code); keeping Cetana as the orchestrator (unused).
**Consequences:** Cetana's own decision log (D-001–D-026, five locks) is formally superseded by the retirement iteration's per-log entry, not now. `executor-protocol` keeps referencing a dormant tool until that sweep (verified: it carries no Cetana escalation mechanics today).

## D-096 — State placement law: process state → forge; contracts → repo files; nothing lives only on a machine

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-15)
**Decision:** Work/process state lives on the forge; rulebook artifacts (roles, contracts, skills, doc-owners) live as repo files; nothing canonical lives only on a local machine. This is the product generalization of D-029/D-057, and the design brief for the later `aeg-forge-state-v1` migration (51 state files audited: ~24 deletable, ~25 forge-movable, ~2 keep).

## D-097 — Waiver authentication: forge-authenticated human acts only; supersedes D-080

**Date:** 2026-07-04
**Status:** ACTIVE
**Type:** 2
**Supersedes:** D-080
**Lock:** NO
**Authored by:** TL (R-16)
**Ratified by:** Principal (2026-07-06, ratified ahead of the rest of the D-083–D-109 batch — carved out because it is the live-gate fix blocking `aeg-governance-hardening` task 29/#380, the iteration's last task; the remainder of the Vinaya-program batch remains PENDING in `ratification-queue.md`)
**Context:** The founding law applied to the escape hatch: the current `Doc-waiver:` PR-body/commit-trailer grammar (D-080, PR #345) is an agent-emittable string — forgeable by the honest-but-fallible agents the gates exist to redirect.
**Decision:** A waiver is valid ONLY as a forge-authenticated human act, never a parseable string. Three parts: (1) ring 1 honors a `waiver:docs` PR label only when the ACTOR of the labeling timeline event is in a configured principal allowlist (here `daniboomerang`) — label presence alone is never sufficient; the `Doc-waiver:` grammar is removed from CI-accepted inputs in the same change (`Doc-ack:` unchanged). (2) The tool-layer forge gate denies waiver-label mutation commands in agent sessions (shared-credential hole: local agents act with the Principal's PAT). (3) Ring 0 (pre-push, no PR yet) downgrades an owned-doc violation to warn-with-declared-intent — ring 0 informs, ring 1 guarantees. Implemented by aeg-governance-hardening task 29 (#380); productized by vinaya-cli-v1 #387, which depends on it.
**Alternatives rejected:** Keeping the trailer grammar (agent-forgeable); PR-author verification (the author isn't the waiver authority); hard-blocking ring 0 (would resurrect `--no-verify` muscle memory).
**Consequences:** On ratification, D-080 flips to SUPERSEDED. Time-sensitive: lands before any Vinaya code ships the mechanism to strangers. Long-term clean fix (separate machine identity for agents) is a backlog note, out of scope.

## D-098 — @vinaya/studio ships as a separate optional npm package

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** TL (R-17; supersedes register item R-12)
**Decision:** Vinaya Studio ships as a separate optional npm package `@vinaya/studio`; `vinaya studio` detects it and serves on localhost via the user's `gh` token (on-demand reads, ETag caching, incremental loading from day one). This supersedes fetch-on-first-run (register R-12): runtime fetch-and-execute is the EDR-trojan pattern and gets tools banned in org environments; a separate package passes normal supply-chain audit and keeps core small.
**Consequences:** Publish-time shape only — in-repo, Studio is `apps/vinaya/web` and the split stays mechanical via the one-way import rule (D-087). npm org-scope availability verified at launch (Principal open call).

## D-099 — Check performance architecture: diff-scope default, nightly full sweep, parallel, cache

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-18)
**Decision:** Checks declare their scope (diff vs full) in their contract; ring 1 defaults to diff-scoped per PR with a scheduled nightly full sweep; execution is parallel with a concurrency cap; caching applies where checks declare cacheable inputs.

## D-100 — agent_recovery_prompt in the error schema; the schema is a versioned public surface

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-19)
**Decision:** Every check error (core and custom) carries `agent_recovery_prompt` — the exact corrective instruction surfaced to the executing model, not a restated diagnosis. Refusals are prompts: this engineers the ring-0 self-correction loop. The check contract + error schema (JSON lines on stderr, exit 0/1, per-check timeout, no-network default) are a versioned public surface with declared stability guarantees.
**Consequences:** All machine output versioned from day one (vinaya-cli-v1 task 1); ecosystem governance chapter before plugins are encouraged (D-103).

## D-101 — Studio deployment roadmap; dogfood-as-demo endorsed

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-20; roadmap from the review program §7)
**Decision:** Phase 1 (v1.0): local Studio only — the post-install reward. Phase 2: the generated Projects view as the non-developer window. Phase 3 (deferred decision, architecture pre-paid): deployed self-hosted stateless read-only Studio on a GitHub App installation token, viewer auth = repo/org membership, no database. Phase 3½: dogfood-as-demo — one hosted instance over Vinaya's own public repo.

## D-102 — /aeg publishes the model as a first-class standalone methodology

**Date:** 2026-07-04
**Status:** SUPERSEDED
**Superseded by:** D-123
**Type:** 1
**Lock:** NO
**Authored by:** TL (R-21)
**Decision:** The AEG model is published at `/aeg` with its own navigation — citable, versioned, tool-independent ("the methodology is the moat"). States explicitly: AEG forge-agnostic in principle, Vinaya GitHub-first in practice. /docs (the tool) links to /aeg; never the reverse.

## D-103 — Plugin/schema stability is governed; ecosystem chapter is fast-follow

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-22)
**Decision:** The check contract and error schema carry declared stability guarantees; an ecosystem-governance chapter (how the contract evolves, deprecation policy) ships fast-follow BEFORE third-party plugins are encouraged.

## D-104 — v1.0 scope: the §5 IN list; ship without the shim; worktree cut

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** TL (R-23)
**Decision:** v1.0 IN: `init`, `init product`, `demo break`, `doctor`, `upgrade`, `eject`, `check` (--json/--diff-only/--parallel), `pr create/edit`, `issue create/edit`, `waiver`, `new check`, `studio` (launcher). OUT: the gh shim (fast-follow, opt-in accelerator per D-090), `vinaya worktree` (cut — orchestration smell; a documented recipe suffices; cheap Principal veto available). TypeScript, Node ≥ 20, macOS + Linux; Windows deferred and documented; tarball fallback documented, not primary.

## D-105 — The starter ruleset ships inside init

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-24)
**Decision:** `vinaya init` seeds `vinaya.config.json` with battle-tested defaults extracted from THIS repo: tier definitions, example doc-ownership bindings, brief-schema defaults, 2–3 real custom-check examples. Kills blank-config paralysis.

## D-106 — The adopter decision-log scaffold ships inside init

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-25)
**Decision:** `init` scaffolds an adopter decision log (numbered entries: number, date, decision, rationale, locked gates affected) — the decision-number-integrity gate has something real to validate from day one.

## D-107 — The proof task: publish the n=1 case study with numbers

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-26)
**Decision:** Mine this repo's ring-2 audit records + ledgers for the empirical case study (ring-0 refusals/week, doc-omission rate before/after gating, blocked-then-self-corrected PRs) and publish it at launch. Numbers convert "interesting methodology" into "empirically grounded methodology." Review-program provenance may enter the repo at that point as owned site content through the launch task's PR (not a D-074 collision); until then, raw reviews stay outside the repo.

## D-108 — The value-sentence slot + the relief-before-doctrine sequencing law

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-27)
**Decision:** The positioning slot is ratified: "Vinaya lets you trust AI agents to work inside your engineering process without becoming their compliance officer" (final wording Principal-owned). Sequencing law for ALL public writing: pain and refusal first, principles second — the first five minutes must feel like relief, not doctrine.

## D-109 — Glob scoping allowed in config; conditional logic banned

**Date:** 2026-07-04
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** TL (R-28)
**Decision:** Per-gate glob SCOPING is permitted in `vinaya.config.json` (consistent with doc-owners bindings); conditional logic (if/unless/except) is forbidden — complexity escapes to executables (companion to D-092's lock).

## D-110 — Governance-state disposition: delete / move-to-forge / keep-as-file, with the file residue package-wrapped

**Date:** 2026-07-06
**Status:** PENDING
**Type:** 1
**Lock:** YES
**Authored by:** Principal
**Context:** Resolves the governance-layout hard-stop blocking `vinaya-cli-v1` task 4 (#384): `aeg-root`-equivalent instance data sitting outside every workspace package defeats workspace-aware deploy-skip logic (confirmed live — docs-only plan PR #391 triggered 3 Vercel builds, 2 rate-limited). Also resolves the tension flagged against D-085's repo-rule clause (ratification-queue.md note, PR #415) — the "zero gain" claim was wrong for the reason named here, though D-085's naming rule for THIS repo (`aeg-root`, `aeg-project` keep their names) is unaffected; this decision is about content disposition, not naming.
**Decision:** Per-adopter governance instance-data is disposed of by churn frequency and integrity requirement, not treated as one monolith: (1) **DELETE** — content fully redundant with existing forge history (changelog, ratification queue, one-off committed briefs): removed outright, nothing replaces the file. (2) **MOVE to forge-native objects** — high-churn instance state with no silent-edit risk: iteration topology's Goal/Lifecycle → a GitHub Milestone per iteration (task→iteration mapping already lives on the Issue's own label + rationale, unchanged); token ledgers → one PR/Issue comment per role-turn, summed at read time; lessons log and per-project operational state → one pinned Issue each, per-project/per-repo; the ratification queue → a `needs:principal-input` label query. GitHub Projects (the board) and GitHub Discussions are deliberately NOT used as state homes — Projects stays an optional generated view (D-091, unchanged); Discussions is excluded to keep the set of GitHub features Vinaya depends on minimal (Issues + Labels + Comments + Milestones only — a light-product requirement). (3) **KEEP as a file** — low-churn content that a CI gate parses directly and that must resist a silent, unreviewed rewrite (the decision log; by the same reasoning, the project registry and doc-owners bindings): stays a plain file, but wrapped in a minimal, code-free workspace package (`packages/governance/` in this repo — a `package.json` with zero logic, holding `decisions.md` + `projects.md` + `doc-owners`) so workspace-aware deploy-skip tooling attributes it correctly regardless of edit frequency. Universal AEG doctrine (role docs, contracts, `state-machine.md`, skills, `process.md`) is a separate, fourth category, not covered by this entry — see D-111.
**Alternatives rejected:** Leaving the low-churn residue at bare repo root on the reasoning "it changes rarely, so the deploy cost is rare too" — rejected: the fix (a code-free package wrapper) is free, so accepting any avoidable deploy-storm risk has no justification. Using GitHub Discussions for lessons/state — rejected in favor of minimizing the surface of GitHub features depended on. Using GitHub Projects as a data store for anything — already forbidden by D-091, reaffirmed here.
**Consequences:** Unblocks `vinaya-cli-v1` task 4 (#384) — the governance-layout decision entry named in its hard-stop amendment now exists (though dispatch of any brief executing this PENDING Type 1 still awaits ratification, per standing rule). Sharpens `vinaya-cli-v1` task 2 (#382) — the StateSource forge-backed adapter has a concrete object mapping to implement, not a generic "forge-backed" placeholder. This repo's own eventual migration (`aeg-forge-state-v1`) implements this disposition literally, unchanged.

## D-111 — Protocol/doctrine distribution: bundled in the npm package, scaffolded as a visible pointer in the adopter's repo

**Date:** 2026-07-06
**Status:** PENDING
**Type:** 1
**Lock:** NO
**Authored by:** Principal
**Context:** Distinct from D-110: universal AEG doctrine (`roles/*.md`, `contracts/*.md`, `state-machine.md`, `skills/*`, `process.md`) is not per-adopter instance data — it is the same text for every AEG adopter, changing only when the methodology itself is amended. Naively bundling it inside `node_modules/vinaya` with no adopter-repo pointer would break the "read this first, every session" convention every agent depends on (most repo-search tooling skips `node_modules`; no coding agent spontaneously reads a dependency's internals for its own operating instructions). Bundling it as a hidden or "protected" asset was considered and is a non-starter: npm provides no copy-protection whatsoever (installed package contents are always fully readable on disk), and hiding the doctrine would contradict D-084 (OSS adoption product) and D-102 (AEG published as a first-class, citable, public methodology) — the product's trust mechanism is transparency, not obscurity.
**Decision:** The canonical doctrine text ships inside the `vinaya` npm package as versioned reference content — a `vinaya upgrade` updates it cleanly with no drift between "the protocol version we think we're running" and "the text sitting in the repo." `vinaya init` additionally scaffolds a thin, visible, git-tracked pointer/generated-view into the adopter's own repo, at the path the reading-order convention expects, so agents find it exactly where they already look — mirroring this repo's own existing canonical-source (`aeg-root/skills/*`) + generated-view (`.claude/skills/*`, D-039) split. The pointer is scaffolded, not the full text; the full text lives in the installed package.
**Alternatives rejected:** Hiding/obscuring the doctrine inside the package with no adopter-visible pointer — rejected as both technically pointless (no real protection) and strategically contrary to D-084/D-102. Copying the full doctrine text into every adopter repo at init time — rejected as the default (duplicates prose across every adopter, complicates `vinaya upgrade`'s diff-and-confirm); left open as an opt-in for teams who want to fork/customize the methodology locally, same pattern D-105 already uses for the starter ruleset.
**Consequences:** Further unblocks `vinaya-cli-v1` task 4 (#384) — the doctrine-distribution half of the installer's design is now specified. No change to `packages/aeg-core` (code) — this entry governs `aeg-root`-equivalent prose only.

## D-112 — Resequence: `aeg-forge-state-v1` runs BEFORE `vinaya-cli-v1`, built as ordinary aeg-core-adjacent engineering, not gated on the shippable CLI

**Date:** 2026-07-06
**Status:** PENDING
**Type:** 2
**Lock:** NO
**Authored by:** Principal
**Context:** The original sequencing (`vinaya-cli-v1` → `vinaya-studio-v1` → `aeg-forge-state-v1` last, per the TL's original planning brief §11) rested on "Vinaya IS the migration tooling" — treating the forge-reading mechanism and the shippable adopter-facing CLI product as one inseparable unit, so the mechanism had to wait for the product. On examination this conflated two genuinely separable things: (1) the forge-reading MECHANISM (code that derives governance state from Milestones/labels/comments instead of files) and (2) the SHIPPABLE PRODUCT (a polished, adopter-facing `vinaya init`/`check`/`doctor` surface for strangers). (1) does not need (2) to exist — it can be built directly as a new package, consumed first by this repo's own live gates, with zero adopter-facing ceremony. Waiting for the full CLI to fix this repo's own Vercel deploy-storm cost (confirmed live, plan PR #391) meant paying that cost for the entire duration of building `vinaya-cli-v1` tasks 3–7 plus all of `vinaya-studio-v1`, for no structural reason.
**Decision:** `aeg-forge-state-v1` is planned and sequenced to run BEFORE `vinaya-cli-v1`. Its forge-reading adapter (task 1, #425) is built generically (repo/owner-parameterized) from the start, living in a new package outside `apps/vinaya/*` (`packages/forge-state` or similar, final name at brief time) — NOT inside `packages/aeg-core`, whose zero-I/O purity charter (task 28, #372) structurally forbids housing network/API-calling code. `vinaya-cli-v1` task 2 (#382) is re-pointed: instead of building `apps/vinaya/sources`'s forge-backed adapter from scratch, it imports or re-homes this already-built, already-proven-against-real-data package. Build once; the CLI packages what already works.
**Alternatives rejected:** Keeping the original order (CLI first, migration deferred) — rejected: no technical dependency actually required it, and it meant carrying an avoidable, already-diagnosed deploy-cost problem for the full duration of a much larger, unrelated body of work. Folding the migration into `vinaya-cli-v1` task 2 as one bigger task — rejected: different verification stories (this repo's real gates working on real data vs. a general CLI installing into an arbitrary stranger's repo), and `aeg-core`'s purity charter means the code can't physically live in one shared location with task 2's originally-planned home regardless.
**Consequences:** `vinaya-cli-v1` task 2 (#382) amended to depend on `aeg-forge-state-v1` task 1 (#425) instead of building its own adapter from scratch. `aeg-forge-state-v1`'s Studio-update task (task 5, #429) is a newly surfaced dependency this resequencing exposed — confirmed by dig that `apps/aeg/web/studio` reads the topology file directly and would break once tasks 3/7 remove it; not part of any prior iteration's scope. `vinaya-studio-v1`'s own task 1 (copying `apps/aeg/web` → `apps/vinaya/web`) should now copy the POST-migration Studio, not the pre-migration one — Brief Author to confirm sequencing at dig time; may add a cross-iteration dependency there too.

## D-113 — Forge-native cutover completed for active iterations, except one tracked exception (`vada-production-v1`)

**Date:** 2026-07-08
**Status:** ACTIVE
**Type:** 3
**Lock:** NO
**Conforms-to:** D-055, D-110
**Authored by:** Developer (task `aeg-forge-state-v1` 7, #431)
**Ratified by:** Principal (in-task brief)

**Context:** D-055 established that a task's rationale lives on the forge Issue and the thin iteration file is topology-only; D-110 decided the concrete disposition of governance instance-data (iteration topology → forge Milestone + labeled Issues). Tasks 3a/3b/4/4b/5 of `aeg-forge-state-v1` built and proved live the forge-native replacements — gates (`verify-dispatch`, `verify-coherence`, branch-topology checks), the token ledger's live aggregator, and AEG Studio — while leaving the old `aeg-root/iterations/*.md` topology files and `*.tokens.md` ledgers in place as a working fallback. This task (7, #431) is the "birth rule" close-out `iterations/README.md` describes: "gates read files until the migration flips the config in one deliberate act." Issue #431 itself asked for the literal ~44-file deletion (all topology files, active and `completed/`, all ledgers); its own Traps-to-avoid section contradicted that ask, defaulting instead to keeping `completed/` permanently — the dispatched brief resolved that internal tension in the Traps section's favor before work started.

**Decision:** Delete the active topology file for every iteration whose forge-native replacement was verified safe: `herald-hardening-v1.md`, `vinaya-cli-v1.md`, `vinaya-studio-v1.md`. For each, this task re-derived `dependsOn`/`conflictsWith` for every task's Issue using the repo's own `parseRationaleDeps` parser (not a grep) to confirm forge-parseability before deleting the file that would otherwise silently backstop it. Live verification found `herald-hardening-v1` tasks 1–2 (#347, #234) used the pre-D-078 `### Dependency rationale` markdown-header template rather than the required `**Dependency rationale**` bold form — the same defect class already known to block `vada-production-v1`, previously unknown here. Per the brief's stop condition, this was escalated to the Principal rather than resolved unilaterally; the Principal backfilled both Issues directly with a proper `**Dependency rationale**` — `` `Depends-on: —` `` field, re-verified forge-parseable, clearing `herald-hardening-v1` for deletion in full.

**Explicitly NOT deleted, and why:**
- `vada-production-v1.md` / `vada-production-v1.tokens.md` — 9 Issues (#183 #184 #185 #186 #187 #188 #240 #241 #244) predate the D-078 rationale grammar and carry no forge-parseable `dependsOn` at all (confirmed against `verify-coherence.ts`'s own docstring, which names these same 9 issues); deleting the file would silently blank `dependsOn` for those tasks in every coherence check and in Studio. The `.tokens.md` sibling cannot be reconstructed by 4b's live PR-body aggregator either — confirmed via `fetch-token-ledger.golden.test.ts`'s own docstring: every task recorded in that file predates D-071's PR-body "Token report" convention, so no merged PR carries the section the live aggregator reads. Backfilling the 9 Issues (real per-task rationale, not a mechanical append) is a follow-up task, not yet dispatched.
- `completed/*.md` (11 files) and their `.tokens.md` siblings — never in scope. `iterations/README.md` §11 states archived iterations are durable history, never deleted; the birth rule governs the active→forge-native cutover, not the permanent archive. Issue #431's literal "delete completed/ too" instruction was superseded by its own Traps-to-avoid section before this task started.
- `aeg-forge-state-v1.md` (this iteration's own file) — still the active-state pointer for this in-flight iteration; its move to `completed/` happens through the normal Archivist close-out flow, after this PR merges, not as part of this diff.

**Alternatives rejected:** Deleting all ~44 files per Issue #431's literal Boundary text — rejected before this task started; the Issue's own Traps-to-avoid section already reversed that instruction for `completed/`, and this task's own verification surfaced `vada-production-v1` and (initially) two `herald-hardening-v1` issues as real, not hypothetical, forge-parseability gaps that made "delete everything" unsafe. Fixing `vada-production-v1`'s 9 grandfathered Issues in this same task to unblock its deletion — rejected: real per-task Sizing/Traps/Dependency-rationale content for each of 9 Issues is Planner/Brief-Author work, not a mechanical append the Developer should improvise mid-task.

**Consequences:** `herald-hardening-v1`, `vinaya-cli-v1`, `vinaya-studio-v1` are now fully forge-native for topology, dependency, and conflict data — no file fallback exists for them. `vada-production-v1` remains the one active iteration still read partly from a file, an explicit, tracked exception (not a silent gap) documented in `iterations/README.md` §4, `state-machine.md` §15b, and `enforcement.md`'s coherence-oracle row. The birth rule is **partially, not fully, complete**: it holds for every active iteration except `vada-production-v1`, whose backfill is real follow-up work, not done here.

## D-114 — Review-gate CI step must never skip on an action-filtered event; live-fire fix after PR #485 merged DANGLING

**Date:** 2026-07-08
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is an existing CI gate, not new infrastructure)
**Authored by:** Principal (direct action, following a retroactive review of PR #485)
**Ratified by:** Principal

**Context:** `aeg-review-gate-v1` (task 1, #474) added the "Review gate" step to `forge-lifecycle.yml`'s consolidated `aeg-gate-suite` job, scoped with the same `if: contains(fromJSON('["opened","synchronize","reopened"]'), github.event.action)` filter used by the diff-scoped checks around it. PR #485 (`vinaya-studio-v1` task 0b) merged with the Archivist's own provenance comment reading `Code review: DANGLING — no code-reviewer verdict comment found on this PR`. Reconstructed via `gh run view` on both CI runs: a `synchronize` event (from the hydration-bug fix commit) correctly evaluated the gate and got a real FAILURE (no verdict existed yet); a later `edited` event (a Test Plan checkbox tick in the PR body) fell outside the allow-list, so the step **skipped** rather than re-evaluated — and a skipped step doesn't fail the job, so `AEG gate suite` read overall SUCCESS on that run. The PR was merged on that false green.

**Decision:** `verify-review-gate.ts`'s inputs (PR comments + labels) are fetched live via `gh pr view` at run time — unlike the diff-scoped checks it sits beside, its correctness never depends on which commit or diff triggered the run. There is therefore no event type it is ever correct to skip on. The Review gate step's `if:` condition is reduced to `!cancelled()` only (no action-based filter) — it now evaluates on every `pull_request`-triggered run, including `edited`/`labeled`/`unlabeled`, so a verdict comment or a `waiver:review` label landing after the last push gets a real re-evaluation instead of a silent skip on the next incidental event.

**Alternatives rejected:** Adding `edited` to the existing allow-list (matching Runtime Test Plan's own carve-out exactly) — rejected as an incomplete fix: `labeled`/`unlabeled` events (e.g. a `waiver:review` label landing without a body edit) would still skip under an allow-list approach, reproducing the same bug under a different trigger. Since the step has zero diff/checkout dependency, an allow-list of any kind is the wrong shape for it.

**Consequences:** Applies uniformly going forward to every PR this gate covers; no data migration needed (the check's own live `gh pr view` read means there's nothing to backfill). Registers this specific bug as a new instance of the "gate can read green without truly evaluating" class named in `aeg-drift-prevention-v1` (Issue #481) — not one of that audit's original 7 rows (those covered field/amendment drift and Milestone/file-listing divergence); the general lesson — a required check's `if:` scoping must be justified by an actual data dependency, not copied from a neighboring step — is worth folding into that iteration's own eventual work.

## D-115 — Review gate split into its own workflow, triggered on `issue_comment` as well as `pull_request`

**Date:** 2026-07-08
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; enforcement is a GitHub Actions workflow, not new infrastructure)
**Conforms to lock:** D-069 — relocates where the forge-lifecycle Review gate step runs and what re-triggers it; does not change the law (a task-branch or `fix/*` PR still cannot merge without real verdicts), the terminal-status vocabulary, or any other D-069-locked invariant.
**Authored by:** Principal (direct action, following D-114's own fix and a Principal question about the remaining friction)
**Ratified by:** Principal

**Context:** D-114 fixed the Review gate step so it never *skips* when it should evaluate. A separate, adjacent friction remained: posting a `VERDICT:` comment or applying a `waiver:review` label never re-triggers CI on its own, because GitHub fires an `issue_comment` event for a new PR comment — a completely different event from `pull_request`, which is the only trigger `forge-lifecycle.yml`'s consolidated `aeg-gate-suite` job listens for. Every verdict comment posted this session required a manual `gh run rerun` to get evaluated. This is friction, not a correctness bug (D-114 already guarantees the gate fails closed until a real re-evaluation happens) — but it's exactly the kind of manual step that gets forgotten, which is the failure mode this whole iteration exists to design out of the process.

**Decision:** Move the Review gate step out of `forge-lifecycle.yml`'s consolidated job into its own workflow, `.github/workflows/review-gate.yml`, triggered by both `pull_request` (`opened`, `synchronize`, `reopened`, `labeled`, `unlabeled` — the label types matter for `waiver:review`) and `issue_comment` (`created`, filtered to comments on PRs whose body plausibly contains a verdict, via a cheap `contains(..., 'VERDICT')` guard in the job's `if:` before any checkout/install cost is paid). `issue_comment` payloads don't carry the PR's head SHA/branch the way `pull_request` payloads do, so the job's first step resolves both via `gh pr view` before checking out that exact commit explicitly (checkout's default ref for an `issue_comment` event is the repo's default branch, not the PR head — a real gotcha, handled explicitly rather than assumed away).

**Alternatives rejected:** Leaving Review gate inside the consolidated job and just telling agents to remember to `gh run rerun` after posting a verdict — rejected, since "remember to do the manual step" is precisely the failure mode this entire iteration exists to eliminate (agents forget; that was the Principal's original founding complaint for `aeg-review-gate-v1`). Triggering on every `issue_comment` unconditionally (no body filter) — rejected as needlessly costly: ordinary PR chat, bot deployment comments, and unrelated discussion would each spend a full billed job run for no reason; the cheap substring filter avoids that at negligible risk (a comment that happens to contain the word "VERDICT" without being a real verdict just causes one harmless extra evaluation, not a false pass).

**Consequences:** Reintroduces one job's checkout/setup/install overhead per relevant trigger, a small, explicitly-accepted partial reversal of the consolidation `forge-lifecycle.yml`'s own header documents (which solved a ~9-job, not 1-job, billing problem) — worth monitoring if Actions-minutes get tight again. `forge-lifecycle.yml`'s header and consolidated-job step list updated to point at this file instead of describing Review gate as one of its own steps. No change to `verify-review-gate.ts`, `checkReviewGate`, or `isReviewGateExemptBranch` — only the CI trigger surface calling into them changed.

## D-116 — Gate-evolution compatibility law: relaxing a requirement applies immediately; tightening one applies only to newly-opened work

**Date:** 2026-07-09
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry; this constrains how future gate changes are *rolled out*, not any specific gate's logic)
**Lock:** YES
**Authored by:** Principal (direct action, during a Vinaya-decisions-log design conversation)
**Ratified by:** Principal

**Context:** Every mechanized gate in this repo (`verify-docs`, `verify-coherence`, `dispatch-gate`, and — via the same code path — every gate `vinaya check` will eventually run for external adopters) evaluates the *current* script on `main` against the *current* forge state, with no version pinning. A gate-logic change lands, and on its very next run every open PR — including ones opened weeks earlier under different assumptions — is evaluated against the new rules, with no notion of "which ruleset applied when this was opened." This is not hypothetical: D-114 is a live incident of this exact class — a Review-gate step's trigger scoping changed shape under an in-flight PR (#485) and the PR merged on a false green because nothing reconciled "what the gate now expects" against "what this PR was created to satisfy." Separately, this session identified a live, still-open instance: `vinaya-cli-v1` task 4 (#384) is hard-blocked from being briefed because D-110/D-111 exist as decision entries but remain `PENDING` — the dispatch-gate gates on ratification status precisely so a brief can't execute against a still-unsettled rule. That gate already embodies half of this principle (don't apply an unsettled/new requirement) without it having been named as a general law.

**Decision:** Gate changes are asymmetric by design, and must stay that way:
1. **Relaxing or removing a requirement** (fewer checks, a lowered bar) applies immediately, repo-wide, to every open Issue/PR, with no migration and no version reconciliation needed — a check that demands less can never newly fail something that used to pass.
2. **Adding or tightening a requirement** (a new mandatory field/label/check, a stricter condition) must NOT silently apply to Issues/PRs opened before the change landed. It applies only to newly-opened work from the change's landing point forward, unless the change is accompanied by an explicit, visible one-time reconciliation step for existing open work (never a silent failure on that work's next incidental CI run).
3. This law governs this repo's own internal gates (`packages/aeg-core`'s checks) today, and is the same discipline `vinaya-cli-v1`'s D-093 ("version skew handled by compatible schema ranges") and D-100 ("the error schema is a versioned public surface") already committed to for the shipped product — this decision generalizes that commitment backward onto AEG's own internal tooling instead of leaving it scoped only to external adopters.
4. Implementation is intentionally left open — a timestamp-based cutover check (does this Issue/PR predate the commit that tightened the rule?) and an explicit schema-version field are both viable and not mutually exclusive; whichever mechanism is built must satisfy points 1–3, not merely gesture at them.

**Alternatives rejected:** Leaving gate evolution unversioned and relying on humans/agents to notice and manually reconcile in-flight work when a rule tightens — rejected as the same "remember to do the manual step" failure class D-114/D-115 already exist to remove; a rule that depends on someone remembering is not a rule. Requiring every historical artifact (e.g., all 108 existing `decisions.md` entries) to be retroactively migrated whenever the log's own storage mechanism changes — rejected in the same conversation this decision came out of: historical record does not need to satisfy a rule that postdates it; only the *check* needs to know not to demand it.

**Consequences:** Any future proposal to change a gate (kill C4, move `decisions.md` to a forge-native mechanism, add a new `vinaya check`, or anything else) must state, explicitly, which of the two directions (1) or (2) it is, and if (2), name the cutover mechanism — this becomes a required field of that proposal's own rationale, not an afterthought. No immediate code change required by this entry alone; it constrains how subsequent gate-change work must be designed and briefed.

## D-117 — No live file duplicates forge state; CI now guards it; `completed/` stays excluded pending a Studio rebuild

**Date:** 2026-07-11
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry — see rationale below on why this is Type 2, not Type 1, despite `Lock: YES`)
**Lock:** YES
**Authored by:** Developer (dispatched, Issue #512)
**Ratified by:** Principal

**Context:** D-110/D-112/D-113 completed a forge-native cutover: iteration topology, task lists, and dependency edges derive live from GitHub (Milestones + `iteration:<slug>`-labeled Issues, via `@atta/aeg-forge-state`) for every active iteration except the one tracked exception, `vada-production-v1` (D-113). That cutover retired the topology file for every other active iteration as tasks completed, but nothing stopped a *new* one from being created — `aeg-root/iterations/aeg-drift-prevention-v1.md` was exactly that: a live topology file for an iteration (Milestone #17, Issue #481) with no forge-parseable reason to exist, undetected because no gate checked for it. Two roles' prose (`developer.md` entry-gate items 3/6/7; `brief-authoring/SKILL.md`'s Dig preconditions (a)/(b) and its branch-ID paragraph) still told agents to read `aeg-root/iterations/<name>.md` to perform checks that `@atta/aeg-forge-state` (`findMilestoneForSlug` + `listTasksForSlug`) already answers directly — the same pattern `verify-dispatch.ts` already uses. Separately, `apps/aeg/web/studio/src/lib/aeg-fs/read-root.ts` and `apps/vinaya/web/src/lib/aeg-fs/read-root.ts` both read `aeg-root/iterations/completed/**` directly and permanently as the sole rendering source for AEG Studio's Archive view — no forge-derivation path exists today for closed Milestones, so that directory cannot be deleted without breaking a live Studio feature.

**Decision:** No on-disk file may be a live state store going forward. Concretely: (1) `aeg-root/iterations/aeg-drift-prevention-v1.md` is deleted — the null-check `mergeTaskEdgesFromFile` already applies for iterations with no file (`herald-hardening-v1`, `vinaya-studio-v1`, `vinaya-cli-v1`) now also applies here; (2) `developer.md` items 3/6/7 and `brief-authoring/SKILL.md`'s two Dig preconditions and branch-ID paragraph now query the forge directly instead of reading a topology file; (3) a new CI gate, `packages/aeg-core/bin/check-no-disk-state.ts` (predicate: `isNewDiskStateFile`, status-aware via `git diff --name-status`), fails a PR that adds OR edits a top-level `aeg-root/iterations/*.md` file (other than `README.md`), or adds (not edits) a `.md`/`.tokens.md` file anywhere else under `aeg-root/iterations/` (including `completed/**`) or a `*.tokens.md` file anywhere in the repo — wired into `forge-lifecycle.yml`'s `aeg-gate-suite` job. Add-vs-edit matters: it lets an existing legacy `completed/**` file (15 files, all `.md`/`.tokens.md`) still be edited (e.g. a typo fix) while refusing a *brand-new* file smuggled into that directory to dodge the top-level check — closing that gap was a code-review finding on the PR that shipped this entry (#517), fixed before merge. `aeg-root/iterations/completed/**` and `vada-production-v1`'s tracked-exception file are explicitly excluded from both the deletion and the new gate's "existing file" path — reversing either is a separate, deliberate Type 1 decision (a Studio forge-derivation rebuild for the former; already covered by D-113 for the latter), not a mechanical cleanup. `Lock: YES` because reintroducing a live topology/tokens file is a regression class this repo has already paid for twice (`aeg-drift-prevention-v1.md` itself, plus the pre-D-071 `.tokens.md` ledger race D-071 fixed) — a future PR that wants to reintroduce disk state must carry an explicit `Conforms to lock:`/`Challenges lock:` acknowledgment (`brief-authoring/SKILL.md` § Lock acknowledgment), not silently drift past this gate. **Type stays 2** (not 1): this is a Developer-authored, dispatched-brief completion of already-Principal-ratified architecture (D-110/D-112/D-113), the same shape as D-113 itself and as D-116 (also Type 2 + `Lock: YES`, for the same "constrains how future work rolls out" class) — not a new architectural choice. Per `state-machine.md` §"Type 1 decisions during execution," a dispatched Developer who believed this were Type 1 would be required to escalate (`severity: product`) rather than author the entry directly; the brief that dispatched this task instead instructed the entry be appended directly (§3), which only makes sense if Type 2 is correct.

**Alternatives rejected:** Deleting `completed/**` per Issue #512's literal Part B text — rejected; Studio's Archive view has no fallback for it today, and doing so without a rebuild would break a live product feature. Filed as a follow-up Issue instead (Part B', referenced in the closing PR). Making the new CI gate retroactively flag existing `completed/**` files by path-shape alone (i.e., recursively banning every `.md`/`.tokens.md` under `aeg-root/iterations/`, full stop) — rejected: would also refuse a legitimate edit to one of the 15 existing legacy files, and (per a code-review finding on #517) a hardcoded filename allowlist to work around that is more brittle than the status-aware add-vs-edit check this entry actually ships with. Rescanning the WHOLE tracked tree on every PR via `git ls-files` (converting this from a diff-scoped CI check into a full-repo invariant check) — rejected as a bigger blast-radius change than the actual gap required: the add-vs-edit distinction, applied to the existing diff-scoped mechanism, closes the smuggled-new-file gap without requiring every future PR to re-validate all 15 legacy filenames against an allowlist just to pass.

**Consequences:** `aeg-drift-prevention-v1` is now on the same forge-only footing as `herald-hardening-v1`/`vinaya-studio-v1`/`vinaya-cli-v1`. A new attempt to commit a live topology or tokens-ledger file now fails CI immediately instead of silently accumulating as undetected residue. `vada-production-v1`'s file and `completed/**` remain untouched and are not newly guarded by this gate — both stay exactly as tracked by D-113 and `iterations/README.md` §4 respectively. The Studio-archive-rebuild-then-delete-`completed/**` work remains open, tracked in the follow-up Issue this PR files.

## D-118 — Vinaya CLI config schema: reserve a `rings` object for forge-write-interception and async-audit toggles

**Date:** 2026-07-10
**Status:** ACTIVE
**Type:** 2 (reversible product-config decision — a later task can extend or reshape the schema)
**Authored by:** Principal (direct action, Issue #381 comment)
**Ratified by:** Principal

**Context:** `vinaya-cli-v1` task 1 (Issue #381) shipped `apps/vinaya/cli`'s hierarchical config loader, copy-adapted from Cetana's `apps/cetana-ai/cli/src/lib/config.ts`. Mid-task, the Principal amended Issue #381 (comment, 2026-07-10, author `daniboomerang`, association OWNER): `vinaya.config.json`'s schema must reserve a `rings` object — `rings.ring1_forgeWriteInterception` / `rings.ring2_asyncAudits`, plain booleans, no conditional logic (D-092/D-109 still apply — declarative only) — with no key for Ring 0 or the CI/branch-protection guarantee, since neither is configurable by design. The comment named the amendment "D-117" and marked it `Status: PENDING … confirm ratification at Dig time`; PR #516 implemented the schema exactly as specified but found no D-117 entry in this log at dig time (last entry was D-116) and flagged the gap rather than treating it as a scope stop condition. This entry closes that gap — but the Issue comment's provisional "D-117" label is superseded here: PR #517 (a different, unrelated decision) merged first and claimed D-117, so this decision is ratified as **D-118** instead. The Issue #381 comment itself and PR #516's merged body still read "D-117" — those are historical forge records of intent at the time, left uncorrected here; this entry is the authoritative number.

**Decision:** `VinayaConfigSchema` (`apps/vinaya/cli/src/lib/config.ts`) carries an optional `rings` object with exactly two required boolean fields when present: `ring1_forgeWriteInterception` and `ring2_asyncAudits`. No conditional/if-unless logic is permitted in this or any future field of the schema (D-092/D-109). Ring 0 (git hooks, universal) and the CI/branch-protection guarantee are never represented as config keys — they are not opt-outable, so there is nothing to toggle.

**Alternatives rejected:** Making `ring1_forgeWriteInterception`/`ring2_asyncAudits` top-level fields instead of nested under `rings` — rejected by the Principal's own comment, which specified the nested shape explicitly. Adding a key for Ring 0 or the CI guarantee (e.g. `ring0_gitHooks: boolean`) — rejected: both are non-negotiable per D-090's enforcement hierarchy, and a config key would misleadingly imply they're optional.

**Consequences:** `rings` is the only schema surface `vinaya-cli-v1` task 1 ships — later tasks (`init`, `check`, `doctor`) extend `VinayaConfigSchema` with their own fields as those commands are built, rather than inheriting fields from Cetana's coordinator-specific schema (`github`/`defaults`/`paths`), which were deliberately not ported. Closes the ratification-gap notes left in PR #516's body, `apps/vinaya/specs/vinaya-spec.md`'s CLI chapter, and `apps/vinaya/specs/vinaya-backlog.md`'s Unscoped section.

## D-119 — Canonical action set (`packages/aeg-core/src/actions.ts`): one list feeds G3's crossing check and task 506's DiagramModel

**Date:** 2026-07-12
**Status:** ACTIVE
**Type:** 2 (reversible — a later task can extend or reshape the list)
**Authored by:** Developer (dispatched, Issue #505)
**Ratified by:** Principal

**Context:** `aeg-root/enforcement.md` describes three enforcement rings, and G3 (`packages/aeg-core/src/registry-checks.ts`, enforcement-derivation-v1 task 3/#528) guarantees "no seventh way into GitHub" — but G3 detects crossing files by grepping for `gh`/`curl`/API calls, not by checking against a canonical list of the actions that cross. Task 506 (blocked on this one) needs a `DiagramModel` that places action nodes both inside ring-0 gates (guarded crossings) and on the edges between role/contract nodes (seam hand-offs). Neither a canonical action list nor that diagram existed. This task ships only the data; wiring G3 to validate against it, and rendering it, are out of scope (Issue #505 Boundary: "NOT changing gate behaviour").

**Decision:** `packages/aeg-core/src/actions.ts` exports `type Action = { id; label; crosses: ActionCrossing; performedBy: string[] }`, `type ActionCrossing = 'into-github' | 'none'`, and `ACTIONS: Action[]` — pure data, zero I/O, same discipline as `waiver-label.ts`. The set is **10 distinct actions, not 12**: the 6 crossings named in Issue #505 plus 4 seam-only actions (Brief→Developer `author-the-brief`, Reviewer→Archivist `produce-the-verdict`, Archivist→Iteration-Archivist `post-provenance-comment`, Iteration-Archivist→Planner `write-the-retrospective`). Two of the six contract seams are already accomplished by a crossing (Planner→Brief carrier = the Issue body, created by `create-a-task-issue`; Developer→Reviewer carrier = the PR, created by `open-a-pull-request`), so they get **no duplicate id** — a second id for one real act would break any `ACTIONS.length`-driven diagram edge count. `crosses` is factually per-action: `commit-the-work` is **`'none'`**, because `git commit` never leaves the local machine — only `git push` (`publish-the-branch`) reaches the GitHub-hosted remote, and `enforcement.md`'s own Ring-0 table lists `.husky/pre-commit` and `.husky/pre-push` as separate rows for exactly this reason. Issue #505's prose loosely groups `commit-the-work` under "the six crossings into GitHub"; the field follows the fact, not the prose. The only valid `performedBy` values are the 9 `role_id`s from `aeg-root/roles/*.md` (task 2/#522), asserted by `actions.test.ts`. `actions.ts` is the source G3's completeness will target and task 506 will consume. No `Lock:` — nothing here should stop a later task extending the list.

**Alternatives rejected:** Forcing exactly 12 actions by minting a distinct id for each of the six seams — rejected: two seams are already covered by a crossing, so a per-seam id would produce two ids for one real act and break an `ACTIONS.length`-driven edge count. Marking `commit-the-work` `into-github` to mirror Issue #505's grouping prose — rejected: `git commit` is local-only; the `crosses` field must be factually accurate, and `enforcement.md`'s Ring-0 table already separates commit (`.husky/pre-commit`) from push (`.husky/pre-push`). Adding a guarded-action column to `enforcement.md`'s tables now — rejected: Issue #505 made that conditional on the action set surfacing such a column, which this task does not do; it is a rendering/traceability choice for task 506 or later.

**Consequences:** G3's crossing-completeness story now has a canonical list to target in a future task (this task does not wire it — G3's grep-based detection is unchanged). Task 506's `DiagramModel` reads the same `ACTIONS`, so its edge count and G3's crossing list cannot drift apart. Extending the list is a plain data edit; the real-file cross-check test (`actions.test.ts`) fails if any `into-github` action loses its Ring-0 gate row or any `performedBy` stops being a real `role_id`.

## D-120 — Supersede D-052 item 1 (per-task archival / row-adjacency gate): D-077 automated the signal it existed to protect

**Date:** 2026-07-13
**Status:** ACTIVE
**Type:** 2 (reversible)
**Lock:** NO
**Authored by:** Principal (direct action, live conversation)
**Ratified by:** Principal
**Supersedes:** D-052 item 1 only. D-052 item 2 (iteration-archival gate) is UNCHANGED and remains ACTIVE — the Iteration Archivist is still manual-dispatch-only (D-077 explicitly does not automate it), so item 2's original justification still holds.
**Conforms-to:** D-116 (this is a pure relaxation — applies immediately, repo-wide, no migration).

**Context:** D-052 (2026-06-21) added a Developer entry-gate hard-STOP: before starting task N in an iteration, confirm the immediately-preceding task's merged PR carries a provenance-block comment (posted by the per-task Archivist). D-052's own stated reason, verbatim: the per-task Archivist was "manual-dispatch-only... during fast-moving work they get skipped, causing `now.md`, `state.md`, and `completed/` to drift out of sync with the forge." No file-conflict or cross-task informational-dependency rationale was ever stated — this was purely a forgotten-manual-step tripwire. D-077 (later) closed exactly that gap structurally: `.github/workflows/archivist.yml::post-merge` now posts the provenance block and closes the task's Issue automatically on every push to `main`, with no human dispatch required — confirmed still live today (`state-machine.md:339`). D-052's precondition therefore now only fires in the few-second race window between merge and that workflow completing; the systemic drift it was built to prevent cannot happen anymore.

Meanwhile this gate (mechanized into `checkDispatchReadiness`'s `priorTask` predicate by D-081, surfaced in AEG Studio as `Blocked · needs #N`) imposes a real, live cost: it forces strict serial dispatch of every task in an iteration's row order regardless of whether the tasks are actually coupled. Live case, 2026-07-13: `vinaya-pages-v1`'s four page tasks (#508/#509/#533/#544) are independently Planner-verified to touch disjoint file surfaces (each rationale explicitly confirms zero overlap by reading real files, not assuming from "same app") — yet Studio showed a fully artificial `2→3→4→5` blocked chain with no real dependency behind it. A separate, now-fixed bug (self-referencing edges from `parseRationaleDeps` mis-parsing a prose-cited historical field, PR #548) made these badges actively misleading on top of being unnecessary.

**Decision:**
1. D-052's item 1 (per-task archival / row-adjacency precondition) is removed as a hard-STOP. It is no longer part of Developer entry-gate obligations, `checkDispatchReadiness`'s verdict, or Studio's dispatch-readiness display.
2. D-052's item 2 (iteration-archival gate) is unaffected.
3. Real `Depends-on`/`Conflicts-with` edges (D-078's grammar, resolved by the same `checkDispatchReadiness`) are unaffected — this decision removes only the blanket row-order predicate, not the Planner's own declared coupling checks, which remain the load-bearing dependency mechanism.
4. Per D-116 rule 1, this relaxation applies immediately to every open Issue/PR in every active iteration — no migration, no version reconciliation.

**Alternatives rejected:** A narrower carve-out exempting only iterations whose tasks the Planner explicitly marked independent (`Depends-on: —` and `Conflicts-with: —` on every task) — rejected: D-052's justification is now moot for coupled and uncoupled tasks alike (D-077 automated the signal for everyone, not just independent-task iterations), so a narrower exemption would leave dead-weight friction on every other iteration for a problem that no longer exists anywhere. Leaving the gate in place and relying on the Principal to notice and manually override per-iteration — rejected as the same "remember to do the manual step" failure class D-114/D-115/D-116 already exist to eliminate.

**Consequences:** `packages/aeg-core/src/dispatch-gate.ts`'s `checkDispatchReadiness` drops the prior-task-archival predicate (and, if unused elsewhere, the `DispatchPriorTaskFact`/`priorTask` plumbing feeding it). `aeg-root/roles/developer.md` entry-gate item 4, `aeg-root/contracts/brief-developer.md`, `aeg-root/contracts/developer-reviewer.md`, and `aeg-root/skills/brief-authoring/SKILL.md`'s Dig-stage precondition list all need the per-task-archival-gate language marked superseded (append/annotate, do not renumber — mirrors the D-075 precedent of preserving existing cross-references). AEG Studio's `map-dispatch-input.ts`/`dispatch-readiness.ts`/`status-display.ts` stop surfacing prior-task blockers. `packages/aeg-core/bin/stale-blocker.ts`'s daily-drift job, which specifically watches for row-adjacent blockers, loses its subject matter and needs re-scoping or retirement. Implementation is a follow-up Developer brief, not this entry.

## D-121 — Doctrine gains a `summary`/`category`/`actorType` layer: non-technical framing for every enforcement item

**Date:** 2026-07-13
**Status:** ACTIVE
**Type:** 2 (reversible — a later task can extend or reshape the fields)
**Lock:** NO
**Authored by:** Developer (dispatched, Issue #551)
**Ratified by:** Principal

**Context:** Task 4/#508's original drill-panel plan assumed `enforcement.md`'s existing prose cells could supply ~40-word panel text; checked against the real file, cells run 25–600+ words with no consistent short form, and `registry-parse.ts` didn't even parse that column. Separately, raw technical check names were found meaningless to a non-technical reader. Both gaps closed by adding a deliberately non-technical `summary` question per item, plus a `category` axis (`ci`/`hook`/`event`) describing when a check fires relative to an ungoverned repo, plus surfacing the already-existing `actor` role field through the derivation.

**Decision:** `enforcement.md` gains `Summary`/`Category` columns (positions 2/3, all three ring tables); `actions.ts` gains `summary` on all 10 entries; `roles/*.md`/`contracts/*.md` gain a `summary` frontmatter key; `GateRow`/`DiagramNode` carry the new fields, threaded through `registry-parse.ts`/`diagram-model.ts`. `category` is exactly `ci` (runs in CI) / `hook` (runs at commit or push) / `event` (a lifecycle moment — PR/Issue open, merge, post-merge — with no bare-repo equivalent). All copy is Principal-authored/reviewed, not agent-invented.

**Alternatives rejected:** Dumping the existing long-form doctrine cells into the drill panel — rejected, fails the "don't show more than fits" requirement (Principal, live conversation) and the cells aren't consistently short. Reproducing step5 mockup's "corpse"/"honest exception" narrative — rejected, that copy is hand-authored in the mockup file and doesn't exist in doctrine; reproducing it live would mean inventing content, not deriving it (violates D-087).

**Consequences:** Every future gate/check/action/role/contract added to doctrine must also carry a `summary` (and `category` if it's a gate/check) for `/how-it-works`'s panels to stay complete — a row without one renders with an empty/`undefined` summary rather than failing the build: `GateRow.summary`/`.category` are required by `registry-parse.ts`'s cell-position read (a row missing those columns entirely would fail table parsing, not silently pass), but `DiagramNode.summary`/`.category`/`.actorType` are optional fields, so a role/contract file that omits `summary:` simply carries `undefined` on its node rather than breaking the build.

---

## D-122 — Doctrine gains a `description` layer: every node answers its own question, in one register

**Date:** 2026-07-16
**Status:** ACTIVE
**Type:** 2 (reversible — a later task can extend or reshape the fields)
**Lock:** NO
**Authored by:** Developer (dispatched, Issue #508)
**Ratified by:** Principal

**Context:** D-121 gave every doctrine item a `summary` question but nothing that answers it, so `/how-it-works`'s panel asked "Ever had someone push straight to main?" and stopped. The panel therefore rendered the enforcement column underneath — the exact alternative D-121 had already rejected ("dumping the existing long-form doctrine cells into the drill panel"), rediscovered rather than read: 17 of the 31 real gate rows cite a `D-###`, a `#NNN`, a task number or a file path, and the longest runs 2708 chars. That column is written to ENFORCE and is correct as it stands; it was never page copy. A second gap compounded it: `role`/`contract`/`action` nodes had no equivalent column at all, so three of four node kinds rendered nothing and the panel's shape changed depending on what you clicked — a distinction no reader can see the reason for.

**Decision:** `enforcement.md` gains a `Description` column (all three ring tables, 31 rows); `roles/*.md` and `contracts/*.md` gain a `description:` frontmatter key (15 files); `ACTIONS` gains a **required** `description` field (10 entries). `DiagramNode.detail` carries it for every kind, so a reader gets one register whatever they click. `GateRow` names the enforcement column `spec` — it is a spec, and the rename exists so `description` vs `spec` cannot be confused at a call site. `Description` is resolved BY HEADER NAME, not column index: the three ring tables share no other header wording, a 7-column table means two different shapes depending on the ring, and an index cannot tell "has Description" from "has Gate" — a fixture proves that exact case. `DiagramNode.crosses` carries each action's `ACTIONS.crosses` to the render, because a client component cannot import `ACTIONS` (it drags `node:child_process` into the browser bundle).

**Alternatives rejected:** Reusing `sidebar_title` as a role/contract display name — rejected, it is the docs sidebar's own nav caption (consumed by `aeg-core/src/docs/*`); naming diagram nodes from a docs-nav hint welds two surfaces with different constraints through frontmatter, so a caption edit would silently rename doctrine nodes. Parsing a description out of each file's body (contracts' `**Seam:**` line, roles' first paragraph) — rejected, zero authoring cost but couples the model to markdown formatting, and actions have no body to parse. Truncating the enforcement column to a taste plus "Read more" — rejected on evidence: the cells have no clean prefix, so the cut lands mid-parenthetical or inside a citation on roughly half the rows.

**Consequences:** Every future gate/check/action/role/contract must carry a `description` or its panel renders name + question + link with nothing between. `ACTIONS.description` is required, so the compiler enforces it there; `enforcement.md` and `roles`/`contracts` are held by real-doctrine tests instead (`registry-parse.test.ts` "gives every real row a description"; `diagram-model.test.ts` "gives every leaf node a detail"), which fail against the live files rather than a fixture. **The 56 descriptions were agent-drafted and Principal-reviewed after they were committed, not before — a departure from D-121's "all copy is Principal-authored/reviewed, not agent-invented".** Review found two that named the wrong mechanism outright ("Editing a governed file" described doc-coverage rather than the read-the-doc gate; "Typecheck + unit tests" claimed the whole repo where the row's own spec says `turbo --affected`). Both were corrected before merge. No gate covers this: the rule that copy is Principal-reviewed is a document, not a checker, and nothing in the suite can tell drafted-then-reviewed from reviewed-then-drafted — it was caught by a reviewer reasoning about commit order. A checker for it, if one is wanted, does not exist yet.

---

## D-123 — "AEG" is retired as a public name; the methodology is Vinaya, published at `/how-it-works`

**Date:** 2026-07-16
**Status:** PENDING
**Type:** 2 (reversible — a name can be reinstated; nothing structural depends on this)
**Lock:** NO
**Authored by:** Developer (dispatched, Issue #508)
**Ratified by:** — (PENDING. The Principal said "AEG is dead, we refer to Vinaya" and asked for the route's removal; on being shown this entry they said they were not sure. Recorded as PENDING rather than ratified: the public-name retirement is real and the code reflects it, but the durable governance claim is the Principal's to make, and an agent must not bank a live sentence as ratification. D-102 sat PENDING for the same reason and nothing broke.)
**Supersedes:** D-102 (which is itself PENDING, never ratified — so this supersedes an unratified entry, and neither is binding until the Principal says so)

**Context:** D-102 published the model at `/aeg` as a standalone, citable, tool-independent methodology, distinct from Vinaya-the-tool — "the methodology is the moat", with `/docs` linking to `/aeg` and never the reverse. That framing assumed two names for two things. The Principal retired "AEG" as a public name (2026-07-16): the methodology and the tool are both Vinaya. D-102 was never ratified (`PENDING` since 2026-07-04), so no published commitment rests on it.

**Decision:** The public site names no predecessor. `/how-it-works` (task 4, #508) is where the model is published, under Vinaya, and it is the only such surface. The `/aeg` route — a 301 to `/how-it-works` since #508 — is deleted rather than kept as a permanent alias: it existed only to serve D-102's citability requirement, and a redirect preserving a retired brand's URL is that brand still being published, one hop away. #508's Boundary line "'AEG' appears once, near the footer, as 'the model this implements'" is obsolete with it; the page names nothing.

**Alternatives rejected:** Keeping the 301 indefinitely — rejected, it costs little but it is exactly the citability D-102 asked for, for a name that is gone; keeping it would leave the retirement half-done and the next reader unsure which name is current. Renaming `/aeg` to a Vinaya-branded alias — rejected, there is nothing to alias: `/how-it-works` is the surface.

**Consequences:** Any external link to `vinaya.attalabs.dev/aeg` now 404s rather than redirecting. `/aeg` was live as a real page (`vinaya-studio-v1` task 0b, #480/#485) before #508 made it a redirect, so such links may exist; none are known, and the site is pre-launch. Reversing this is one Route Handler if a real citation surfaces. `AEG` survives repo-internally — `aeg-root/`, `packages/aeg-core`, `AEG_REPO`, `AEG_BLOCKED_LABEL` — which this decision does not touch: it governs the public name only, and renaming the internal substrate is a separate, much larger question.

## D-124 — Vinaya's CMS identity: reuse Vitakka's Sanity project (`o56nzgrr`), hard rename

**Date:** 2026-07-16
**Status:** ACTIVE
**Type:** 2 (reversible product-config decision)
**Lock:** NO
**Authored by:** Developer (dispatched, Issue #533)
**Ratified by:** Principal
**Conforms-to:** D-060, D-114

**Context:** Vinaya (`apps/vinaya/web`) was the only product with no Sanity project of its own — its root layout borrowed Atta's config/branding/theme wholesale via `createProductClient('atta')`. Vitakka (`apps/vitakka-ai`) is a shelved scaffold whose Sanity project `o56nzgrr` sat unused, holding a config singleton, a branding document, and a full set of uploaded logo/favicon assets. The Principal pivoted away from provisioning Vinaya a brand-new Sanity project mid-session (2026-07-12) for two reasons: Vitakka is shelved, so its CMS project is dead weight; and Vitakka's mark — a "V" (apex-down blade, target-ring interior) — fits Vinaya's initial. Because the assets already live inside `o56nzgrr` and the project is kept rather than replaced, the migration copies document references in place; it does not re-upload anything.

**Decision:** `vitakka` is hard-renamed to `vinaya` across the CMS layer with no back-compat alias: `PROJECT_IDS.vitakka` → `PROJECT_IDS.vinaya` (still `o56nzgrr`) in `packages/cms/src/client.ts`; `vitakkaConfig`/`getVitakkaConfig`/`getVitakkaBranding`/`branding-vitakka` renamed to their `vinaya` equivalents throughout `packages/cms` and `packages/ui/scripts/generate-ui.ts`; `apps/vinaya/web` now fetches its own config/branding via `getVinayaConfig`/`getVinayaBranding` + `cmsClient` (the house pattern every other product uses), replacing the `createProductClient('atta')` borrow; `apps/vitakka-ai/web` takes over the borrow-from-Atta pattern Vinaya used to occupy, since the scaffold still needs to compile; `tools/admin` (a registered AEG project that imported `PROJECT_IDS.vitakka`/`getVitakkaBranding`/`getVitakkaConfig` directly) is rewired in the same PR — it was in the rename's blast radius but omitted from Issue #533's original rationale. The Sanity-side migration (`packages/cms/scripts/migrate-vitakka-to-vinaya.ts`) copies `vitakkaConfig`'s `userInterface` object and `branding-vitakka`'s full document (including every logo/favicon asset `_ref`) to `vinayaConfig`/`branding-vinaya` verbatim — per D-060, theme/library references stay pointed at the central `attalabs` project (`l5n0n8nn`) unchanged; per D-114, `getProductUiConfig`'s central-project resolution required no code change. The legacy `vitakkaConfig`/`branding-vitakka` documents were deleted after the new documents were verified present.

**Alternatives rejected:** Provisioning Vinaya a new, empty Sanity project — rejected by the Principal mid-session: it would require designing and uploading a new logo/favicon set when Vitakka's V mark already fits, and it would leave Vitakka's project as unused dead weight rather than repurposing it. Keeping a `vitakka` alias in `PROJECT_IDS` "for safety" — rejected: this is a hard rename with a fully-enumerated importer list (every call site is in-surface), so an alias would be dead code inviting a stale call site to silently resolve. Leaving the legacy `vitakkaConfig`/`branding-vitakka` documents inert instead of deleting them — considered, but rejected in favor of deletion once the new documents were verified present, matching the hard-rename decision (no alias, no straggling duplicate identity in the same project).

**Consequences:** Vinaya now resolves its own theme, library, color scheme, and branding from CMS instead of silently rendering Atta's — `apps/vinaya/web/.env.local` (gitignored) and the Vinaya Vercel project must both carry `SANITY_PROJECT_ID`/`NEXT_PUBLIC_SANITY_PROJECT_ID=o56nzgrr` (Production and Preview), or `cmsClient` falls back to `'unconfigured'` and the app silently renders unthemed. Same failure class, different surface: `tools/admin`'s `getCmsClientsForProject` derives a write token from `SANITY_API_TOKEN_${projectKey.toUpperCase()}` — `tools/admin/.env.local` (and any admin deployment env) must rename `SANITY_API_TOKEN_VITAKKA` → `SANITY_API_TOKEN_VINAYA`, a manual Principal action; no code-level compat fallback was added for the old key name, matching the hard-rename decision above. `apps/vitakka-ai/web` keeps compiling on the borrowed Atta pattern until/unless Vitakka is un-shelved with its own identity. The Sanity project's *display name* in manage.sanity.io ("Vitakka" → "Vinaya") has no API and remains a manual Principal action. Every doc naming Vitakka as a live CMS product (`.claude/skills/ui-cms-theme/SKILL.md`, `.claude/skills/ui-branding/SKILL.md`, `.claude/skills/ui-library-system/SKILL.md`, `packages/cms/CLAUDE.md`, root `CLAUDE.md`, `apps/vinaya/specs/vinaya-spec.md`, `apps/vinaya/web/CLAUDE.md`, `apps/vitakka-ai/**`) is updated in the same PR — `packages/cms/README.md` had no Vitakka reference to begin with, so §7's line item naming it was vacuous.

## D-125 — CMS reads resolve the Sanity project from the product key, never from the environment

**Date:** 2026-07-16
**Status:** ACTIVE
**Type:** 3 (cross-cutting architectural decision)
**Lock:** NO
**Authored by:** Developer (inline, no Issue — Principal-directed fix)
**Ratified by:** Principal
**Conforms-to:** D-060, D-114, D-035 (`Lock: YES` — acknowledged below, invariant preserved)
**Supersedes:** D-124's env-var Consequence only (the CMS identity transfer itself stands unchanged)

**Context:** D-124 moved `apps/vinaya/web` onto "the house pattern every other product uses" — `getVinayaConfig(cmsClient)`. `cmsClient` was a module-level singleton whose `projectId` came from `SANITY_PROJECT_ID` with a `?? 'unconfigured'` fallback. Vinaya's web app had never carried a `.env.local`, because its previous `createProductClient('atta')` borrow resolved the project from code. D-124 saw this and filed it as a required manual Principal action (its Consequences paragraph names the exact failure: "`cmsClient` falls back to `'unconfigured'` and the app silently renders unthemed"). The action was never performed, and Vinaya shipped unthemed on `basic` instead of its CMS-configured `theme-kpop-demon-hunter` + `library-animate`. The failure was invisible: `.catch(() => null)` at every call site turned the thrown "Dataset not found" into a `null` config, and `NextWebShell` renders a plausible unstyled page from `null`. Typecheck, lint, and the Sanity-side migration all passed — the migration verified through `tools/admin` and the Sanity CLI, both of which have their own `.env.local`, so nothing that ran during D-124 exercised the app's own read path.

**Decision:** Which Sanity project a read targets is resolved from the product key via `PROJECT_IDS`, never from the environment. `cmsConfig.projectId` and its `'unconfigured'` fallback are deleted, along with the `cmsClient` read singleton, `createCmsClient`, and the never-consumed `cmsWriteClient`. `@atta/cms` exposes three generic entry points keyed by `ProductKey` — `getProductConfig(key)`, `getProductBranding(key)`, and `getProductCms(key)` (both, in parallel, for root layouts) — replacing ten per-product wrappers (`getVadaConfig`/`getVadaBranding`/…), which are deleted. `getProductCms` owns the graceful-degradation policy: it catches per-document failures and returns `null`, but logs the reason to `console.error` outside production, so the next instance of this failure is visible where it happens rather than silent. `SANITY_DATASET` and `SANITY_API_TOKEN` remain environment variables — a dataset genuinely varies per environment and a token is genuinely a secret. A project ID is neither: it is public (already committed in `PROJECT_IDS`, so the env var duplicated a fact the repo held) and identical in every environment.

**Alternatives rejected:** Adding `apps/vinaya/web/.env.local` + the Vinaya Vercel env vars — the literal manual step D-124 asked for. Rejected: it fixes one surface and leaves the class intact. The value is public and static, so the env var buys nothing while adding a step that can be, and was, missed — and its absence fails silently in exactly the environment (production) where it is hardest to notice. Keeping `cmsClient` alongside the generic API — rejected: an ambient singleton means `getVinayaConfig(cmsClient)` reads as "Vinaya's config" while actually meaning "a document named `vinayaConfig`, from whatever project the environment names," and leaving both patterns alive preserves the trap for the next call site. Keeping the per-product wrappers as thin aliases — rejected: the document IDs are fully regular (`${key}Config`, `branding-${key}`), so the wrappers were a hand-maintained table that had to be edited to add a product; the generic functions derive the same thing.

**Consequences:** No web app requires `SANITY_PROJECT_ID`/`NEXT_PUBLIC_SANITY_PROJECT_ID` any more — existing entries in `.env.local` files and Vercel projects are inert and may be removed at leisure. `packages/ui/scripts/generate-ui.ts` was on the same broken path (it resolved the build-time component library through `cmsClient`), so Vinaya's library generation silently fell back to `basic`; it now takes the product key it already receives. Behaviour is preserved exactly everywhere else, including two pre-existing borrows that this decision surfaces without changing: `apps/attalabs/web` renders Atta's identity (`attalabsConfig` exists in `l5n0n8nn` and has never been wired to anything), and `tools/admin` renders Vāda's theme — both are now explicit at the call site (`getProductCms('atta')`, `getProductConfig('vada')`) instead of implied by an env var, and whether either should change is a separate product decision. The `SANITY_API_TOKEN_VITAKKA` → `_VINAYA` rename in `tools/admin/.env.local` that D-124 filed remains outstanding and is unaffected by this entry — it governs a write token, which stays environment-resolved. D-124's own record is not rewritten (D-006, append-only); only its env-var Consequence is superseded here.

**Lock acknowledgment — D-035 (`Lock: YES`).** D-035 fixes Herald's library resolution: app chrome renders the build-time CMS library, sourced from "the same value the generator reads"; `user.library` applies only to the public `/[username]` profile; the two paths stay independent. Its Decision text names that source literally as `getHeraldConfig(cmsClient).userInterface.library.id` — a call this entry deletes. **The locked invariant is preserved; only the mechanism named in passing is renamed.** `getProductConfig('herald')` resolves the same `heraldConfig` singleton from the same project (`e9gbd2d1` — previously via Herald's `SANITY_PROJECT_ID`, now via `PROJECT_IDS.herald`; the two values are identical), so the id feeding `CandidateShell` in `(app)/layout.tsx` and `[username]/(owner)/layout.tsx` is unchanged. `generate-ui.ts` moved to the *same* `getProductConfig(app)` call, so D-035's "same value the generator reads" clause now holds by construction rather than by two independent env-configured clients agreeing. The profile path is untouched: `[username]/(profile)/layout.tsx` still feeds `EnvoyLibraryShell` the user's library, and `[username]/layout.tsx` is not in the diff. D-035's own text is not edited (D-006, append-only) — a reader following it to `getHeraldConfig` should read this paragraph and `.claude/skills/ui-cms-theme/SKILL.md` for the current call.

---

## D-126 — Portal and Studio are two products sharing one deployment; the switch predicate is not "a token exists"

**Date:** 2026-07-16
**Status:** PENDING
**Type:** 2 (reversible — the predicate's terms can be swapped without changing its shape)
**Lock:** NO
**Authored by:** Developer (dispatched, Issue #544, amended)
**Ratified by:** — (PENDING. This refines D-101 Phase 1's shape under Principal direction but the durable governance claim is the Principal's to make — same convention as D-101/D-123 sitting PENDING.)

**Context:** Task 6's original framing was "`/studio` is a dashboard we hide in production." That framing was wrong: the merged env-gate work (`isProductionDeploy()`, `notFound()` guards on the forge-reading routes) rendered `StudioLocalOnlyLanding` inside `studio/layout.tsx`, under a TopBar whose `Projects`/`Iterations`/`Backlog` links the same change made 404 — an honest page under a nav of three dead doors, exactly the D-087 defect the task exists to close. The root cause was conceptual, not mechanical: the brief fenced `studio/layout.tsx` out of surface, narrowing Issue #544's "the production landing replaces the local dashboard shell" down to "page content," not shell.

**Decision:** Portal and Studio are two products sharing one Next.js deployment, with different audiences and different access models. Portal is public — marketing plus methodology (`/`, `/known-limits`, `/how-it-works`, `/the-studio`, `/studio/docs`) — always reachable. Studio is the governance tool (`/studio`, `/studio/projects`, `/studio/iterations`, `/studio/backlog`) — reachable only where serving it is authorized. Production `/studio` redirects to `/the-studio`, a Portal page describing Studio, rather than rendering Studio's own shell with dead nav. A Portal↔Studio switch (`ProductSwitch`) renders in both TopBars' `logo` node, gated:

```
!isVercelDeploy() && hasForgeConnection()
```

evaluated in that order — the synchronous env term first, short-circuiting before the async forge check ever runs.

**Correction, same PR, after code/security review:** the predicate first shipped as `isProductionDeploy()`, testing `VERCEL_ENV === 'production'`. `VERCEL_ENV` takes three values on Vercel — `production`, `preview`, `development` — so that equality check left every preview deploy (a real, publicly-reachable URL Vercel publishes for every PR touching this app) ungated: `/studio` rendered the dashboard shell instead of redirecting, and the forge-reading routes rendered instead of 404ing, on preview. Both the code-reviewer and security passes caught this (the security pass twice, once per revision) before merge. The fix is `isVercelDeploy()`, gated on **presence** (`process.env.VERCEL_ENV !== undefined`) rather than equality — true on both production and preview, false for a local `bun run build && bun run start` (which sets neither). The predicate's shape in this entry was written correctly on paper before the code matched it; this correction makes the code match the sentence below.

**Why token-presence is not authorization.** `hasForgeConnection()` resolves whether *this server* can reach GitHub — `resolveGithubToken()` returns the first of an explicit token, `process.env.GITHUB_TOKEN`, `process.env.GH_TOKEN`, or `gh auth token`. Every one of those is the **server's own credential**, never a visitor's. Vinaya has no viewer identity: `withAuth={false}` on both TopBars, no login, no session. If the switch (or Studio itself) were gated on token-presence alone, setting `GITHUB_TOKEN` on the Vercel deploy — routine, plausible for an unrelated reason (higher API rate limits, some other integration) — would light the switch for every anonymous visitor and serve this repo's issues, backlog, and iterations to the public internet under the maintainer's own token, on production **or preview**. `!isVercelDeploy()` is what makes "the only visitor is you" true today — false on both production and preview, true only when this code is not running on Vercel's infrastructure at all; it is checked first and is never optional.

**The Phase 3 migration path.** `isVercelDeploy()` is a placeholder standing exactly where D-101 Phase 3's viewer-auth check goes (a deployed, auth-gated Studio on a GitHub App token, viewer auth = repo/org membership). When Phase 3 ships, the env term in the predicate above is replaced by a real viewer-auth term (e.g. `await isAuthorizedViewer()`); `hasForgeConnection()` and the order-matters short-circuit do not change shape. This entry refines D-101 Phase 1's shape — it does **not** supersede D-101, whose own `Status: PENDING` this entry does not touch.

**Alternatives rejected:** Gating the switch (or Studio) on `hasForgeConnection()` alone — rejected outright as the security defect this entry exists to prevent (see above). Keeping the production landing inside `studio/layout.tsx` and just making the TopBar's `links` conditionally empty in production — rejected: it still renders Studio's own shell/chrome for content that is genuinely Portal's, and leaves a second gate (empty-links detection) to keep in sync with the route guards instead of the routes simply not rendering under that shell at all. Threading `branding` through props from the root layout to avoid a second `getProductCms` call in each nested layout — rejected per the brief's explicit instruction; see the Consequences note on the extra round-trip instead of a silent workaround.

**Consequences:** `studio/page.tsx`'s production branch is now `redirect('/the-studio')`, not a rendered explainer — the explainer itself is `(site)/the-studio/page.tsx`, Portal content, inheriting Portal chrome. `StudioLocalOnlyLanding.tsx` is deleted (its one importer moved). Both `(site)/layout.tsx` and `studio/layout.tsx` now call `getProductCms('vinaya')` themselves, in addition to the root `layout.tsx`'s own call — none of `getProductCms`/`getProductBranding`/`getProductConfig` in `packages/cms` is wrapped in a memoizing `cache()`, so this is a **real second (and, on `/studio/**`, third) network round-trip per request**, not a deduped one. Reported here rather than worked around by threading branding through props, per the brief. A future task can wrap `getProductCms` in React `cache()` if this cost matters; this task does not do it, to keep its own blast radius to the Portal/Studio split. The Portal nav's existing "Studio" link now points at `/the-studio` directly rather than `/studio` — a visitor's click no longer round-trips through the production redirect. Locally (`bun run dev`/local prod-mode build), `!isVercelDeploy()` is always true and `hasForgeConnection()` resolves via the developer's own `gh auth token`/env credential, so the switch renders and both `/studio` and `/the-studio` serve real content — behavior is unchanged from before this task for every local surface.

---

## D-127 — The page that renders the harness is "The Harness", served at `/the-harness`; `/how-it-works` is deleted, not redirected

**Date:** 2026-07-17
**Status:** PENDING
**Type:** 2 (reversible — a route and a nav label can be renamed again; nothing structural depends on either)
**Lock:** NO
**Authored by:** Developer (dispatched, Issue #591)
**Ratified by:** — (PENDING. The Principal directed the rename in the 2026-07-17 session — *"how it works is [the] wrong name … it shall be renamed"* — and the name resolved to "The Harness" in the same session. Recorded PENDING rather than ratified: the rename is real and the code reflects it, but the durable governance claim is the Principal's to make, matching the convention D-123/D-126 sit under.)
**Supersedes:** D-123's URL sub-clause only — the "the methodology is Vinaya, published at `/how-it-works`" phrase, whose `/how-it-works` is now `/the-harness`. **D-123 is NOT superseded.** It remains PENDING and unratified, and its wider question — whether "AEG" is retired as a public name, and what the methodology surface is ultimately called — stays open and is not banked here. This entry renames one URL; it does not rule that question.

**Context:** `/how-it-works` (task 4, #508) is where the enforcement model is published under Vinaya — the interactive rings diagram deriving roles, gates, contracts, and actions from `@atta/aeg-core`'s `DiagramModel`. "How it works" names a genre of page, not a thing; the page renders a specific thing — the harness that holds every agent and human to the same gates. The Principal ruled (2026-07-17) that the page is **The Harness** and the route becomes `/the-harness`, matching `/the-studio`'s existing shape. Two rejected names fixed the choice: "Rings" describes the current *drawing* and would lie if the diagram's shape ever changed; "Forge" collides with the established meaning of *forge* throughout this repo's doctrine (`forge-native`, `forge-state`, `@atta/aeg-forge-state`).

**Decision:** The route group `(site)/how-it-works/**` moves to `(site)/the-harness/**` — renderer, `_lib`, and `_components` unchanged; the diagram, `deriveDiagramModel`, `load-diagram.ts`, and `read-more.ts`'s `/docs/**` targets are untouched (renaming the page is not renaming the model). `/how-it-works` is **deleted outright with no redirect** — the URL now 404s, exactly as D-123 did for `/aeg`. Every in-app link and every nav label naming the page is updated in the same change — the site TopBar entry and the Home-page/Portal nav now read **The Harness → `/the-harness`**. `role_id`/`contract_id`, `enforcement.md`'s parse contract, and every `aeg-root/**` file are out of scope — `AEG` survives repo-internally exactly as D-123 left it.

**Alternatives rejected:** Keeping `/how-it-works` as the route and only relabeling the nav — rejected: the URL is the citable surface, and a public page advertising a genre-named path undercuts the rename. Keeping `/how-it-works` alive as a permanent redirect to `/the-harness` — the first shape of this task, reversed by the Principal (2026-07-17): "How it works" names a genre, not the thing; a genre-named path kept alive one hop from the real page is exactly the half-done retirement D-123 rejected for `/aeg`, and the site is pre-launch, so no already-shared inbound link is known to protect. The redirect stub is removed with the rest of the old route. Keeping the renderer byte-identical and leaving the page's own "How it works" breadcrumb/`<title>` unchanged — the task's first shape, reversed by the Principal on review (2026-07-17): a page reached via a nav labelled "The Harness" that then titles itself "How it works" is the same genre-vs-thing incoherence the rename exists to close, so the breadcrumb and browser title are aligned to "The Harness" in this same PR.

**Consequences:** Any external link to `vinaya.attalabs.dev/how-it-works` now 404s rather than resolving; the site is pre-launch, so none is known to exist, and reinstating one is a single redirect stub if a real citation ever surfaces (the same reversibility D-123 records for `/aeg`). `apps/vinaya/web/src/app/(site)/the-harness/_lib/load-diagram.ts` retains a `/how-it-works` mention in its build-time docstring — left untouched because the file is out of this task's edit surface (moved, not edited); it is a comment, not a live href or visible string. The page's own breadcrumb (`DiagramExplorer`) and browser `<title>` now read "The Harness", aligned with the nav label. The diagram's node/ring labels are untouched — those are derived at build time from `aeg-root/**` doctrine, not renamed here. Reversing this decision is a second directory move; nothing structural depends on the name.

---

## D-128 — The core batch concept is renamed `iteration` → `tranche`; `iteration` is reserved for one turn of a loop

**Date:** 2026-07-19
**Status:** PENDING
**Type:** 1 (redefines a top-level model term used throughout doctrine AND changes the authoritative task-membership label taxonomy — model-level, so the Principal ratifies. The *word* is reversible, matching the D-123/D-127 rename precedent; the coupled full-label-migration is a one-way forge-data operation, which is why this is recorded Type 1 rather than a TL-decidable Type 2.)
**Lock:** NO
**Authored by:** Principal-directed design session, 2026-07-19 (recorded PENDING; drafted for ratification)
**Ratified by:** — (PENDING. The Principal directed the rename and chose full migration in the 2026-07-19 session; the durable model-term change is the Principal's to bank at a ratification window. Convention matches D-123/D-126/D-127 sitting PENDING.)

**Context:** AEG's core unit — a bounded, operator-cut batch of related tasks, planned together and closed as a milestone — has been called an "iteration" since the model's origin. The word is wrong: "iteration" implies iterating, i.e. repeated refinement of the *same* thing across cycles, whereas the object is a one-time batch of related-but-new work that terminates (closing its Milestone IS its transition to complete). The grouping force is the developer's deliberate, improvised cut ("I flow these together") — an execution relationship, not a product/epic/story one; a single unit may span products or sit within one. This mismatch becomes an outright collision under the loop-engineering proposal (backlog #618): a loop genuinely *iterates*, so "iteration" is needed for **one turn of a loop**, and cannot simultaneously name the batch. The rename is therefore a prerequisite for that proposal, and correct on its own merits regardless of whether loops ship.

**Decision:** Rename the concept **`iteration` → `tranche`** throughout the model, shared packages, Vinaya surface, and forge data. Reserve the term **`iteration`** for its correct meaning — one turn of a loop — and **`loop`** for the running cadence itself. The settled vocabulary is three distinct nouns: `loop` (the cadence) · `iteration` (one turn of it) · `tranche` (the bounded, operator-cut batch a turn advances). Forge-data disposition: **full migration** — mint `tranche:<slug>` labels, relabel every historical Issue, retire the `iteration:` prefix, and update the ~77 code references to the `iteration:${slug}` literal. History docs (this log, retrospectives, `aeg-root/` role docs) are append-only (D-006) and keep the old word as historical record; the rename redefines the term going forward, it does not rewrite the past.

**Alternatives rejected:**
- **Keep "iteration"** — rejected: wrong semantics, and fatally ambiguous once loops exist.
- **`batch` / `lot` / `run`** — all fit the semantics, all rejected on grep-hygiene: this is a govern-by-`rg` repo (gates and audits are grep-based), and each collides with a high-frequency token (`batch` job, "a lot of", `run()`/`runtime`/`npm run`). `tranche` greps clean (near-zero false positives) and best captures "the grouping is the operator's deliberate cut, not an intrinsic property." `cohort` (A/B-testing collision) and `workstream` (implies ongoing/non-terminating) also rejected.
- **Freeze `iteration:` as a legacy wire-key** (rename concept + code but leave the label prefix frozen) — considered and rejected in favor of full migration: a clean forge with no legacy word anywhere, accepting the one-time cost of relabeling historical Issues.

**Consequences:** The `Iteration` type (`@atta/aeg-types`), `deriveIteration`/`parseIteration`, and all `iteration*` identifiers across `aeg-core`/`aeg-forge-state`/Vinaya web+cli+Studio become `Tranche`/`deriveTranche`/etc. (excluding `maxIterations` in `adapter-langgraph`, an unrelated loop-counter). The authoritative membership label becomes `tranche:<slug>`; `list-tasks.ts` and every consumer read the new prefix. Studio routes `/…/iterations/[slug]` become `/…/tranches/[slug]` (with redirects). The `# Iteration:` heading-marker literal in `parse-iteration.ts` stays as-is — it must keep reading pre-cutover topology files. The `task/<slug>/<id>` branch convention is unaffected (the word never appears in branch names). Execution: this is dispatched as its own core-AEG tranche (`Project: aeg-core, vinaya`, tracking Issue #619), decomposed decision+doctrine → code → Vinaya surface → label migration; dispatch of those tasks is gated on this entry flipping PENDING → ACTIVE. This entry does **not** ratify the loop-engineering model (#618) — it only reserves the `loop`/`iteration` vocabulary so the rename doesn't have to be redone when that proposal is taken up.

---

## D-129 — Brief validation triggers on the PR body being a brief, not on the branch being a task

**Date:** 2026-07-20
**Status:** ACTIVE
**Type:** 2 (reversible enforcement tightening — a gate that already exists starts firing on a class of PRs it previously skipped; revertible by restoring the branch-only bypass, TL-decidable)
**Lock:** NO
**Conforms-to:** D-116
**Gate-evolution direction (D-116, required field):** **Direction (2) — tightening.** A gate that already exists starts firing on a class of PRs it previously skipped, so D-116 rule 2 applies: it must not silently apply to work opened before it lands.

**Cutover mechanism:** the tightening applies to PRs **opened after this entry merges**; there is no retroactive sweep and no reconciliation step, because the reconciliation was verified to be empty rather than assumed to be. At merge time the open-PR set was checked directly, old logic vs new, against each PR's real body:

- **#630 (`fix/studio-iteration-href`)** — the only other open PR, and the very brief whose §7 gap motivated this change. Its *PR body* trips **0 of 4** markers (the brief lived in the dispatched file, not in the body), so it bypasses identically under both rulesets: `EXIT=0` old, `EXIT=0` new. No in-flight PR goes red on its next incidental CI run — D-116 rule 2's actual prohibition is not tripped.
- A sweep of 45 recently-merged PR bodies old-vs-new found 4 newly checked and 1 newly failing (#548, on Test Plan exclusivity) — a ~2% retroactive rate, and all on already-merged work the gate can no longer affect.

If a brief-shaped PR is open at merge time in some future re-application of this change, the visible reconciliation step is: re-run `verify-brief` against its body and fix the named sections in that PR, before merging this one. Silence is not an acceptable outcome for that case.

**Authored by:** Developer session on `fix/brief-gate-nontask`, 2026-07-20
**Ratified by:** Type 2 — TL-decidable; recorded ACTIVE on merge.

**Context:** `verify-brief` runs `checkBriefSections` (Tier, `For:`, `Project:`, Test Plan, surface map, doc-update list, worktree Step 0, stop conditions, autonomy clause, `Closes #N`, lock-ack). Its bypass keyed on the branch name: anything not matching `task/<iter>/<n>` exited 0 before any section check ran. That bypass exists for a real reason — an ordinary non-AEG PR (a one-line dependency bump) carries no brief and must not be forced to grow one — but the branch name was the wrong proxy for it. A standalone `fix/*` brief is a brief and was skipped wholesale. Confirmed live: the brief for `fix/studio-iteration-href` was authored with no §7 documentation-update list, and nothing caught it, because `checkDocUpdateList` — the checker that exists for exactly that failure — never ran on a `fix/` branch. The same env-only input shape (`PR_BODY`/`BRANCH`) also meant a brief could not be validated at authoring time, before a PR existed: the one moment when fixing it is cheap.

**Decision:** The trigger becomes the body, not the branch. `verify-brief` runs the section checks when the branch is `task/<iter>/<n>` **or** `isBriefShaped(prBody)` — ≥2 of four brief-only markers (surface map, doc-update list, stop conditions, autonomy clause), evaluated on `stripCode(prBody)`. Bodies that are neither continue to bypass; the dependency-bump exemption is preserved exactly. Two couplings follow from it:

- **`Closes #N` stays task-branch-only** (`BriefSectionsOptions.requireClosesN`, default `true` so every other caller is unchanged). A standalone fix brief has no task Issue to close, and a `plan/*` PR is *forbidden* to carry `Closes #N` by `checkPlanPrNoCloses` (D-077) — requiring it on every brief-shaped body would make the two gates jointly unsatisfiable. Issue linkage is a task-branch obligation; brief completeness is not.
- **The same validator gains an authoring-time entry**, `verify-brief.ts --body-file <path>`, so a Brief Author gates a brief before dispatch rather than after the Developer has done the work. With no `BRANCH`, the branch is read from the brief's own Step 0 `git worktree add … -b <branch>` line — a brief declares what it is going to be.

**Alternatives rejected:**
- **Check every branch** — rejected outright; it deletes the exemption the bypass exists for and would force a full brief onto trivial non-AEG PRs.
- **Detect brief shape on the raw body** — rejected: a PR that *quotes* a brief inside a fenced example ("here's a sample brief: ``` …Technical surface map… ```") is discussing a brief, not carrying one, and would be force-validated. Detection runs on the single shared `stripCode` from `anchored-region.ts` (#617's "one stripper, never a duplicated regex"). A consequence worth stating: the worktree `git worktree add … -b` line cannot be a shape marker, since Step 0 lives inside a fence in every real brief and never survives the strip.
- **Include Test Plan among the shape markers** — rejected: the canonical PR-body template gives every AEG PR a Test plan with `**[agent]**` tags, so it is the one required section an ordinary non-brief PR plausibly carries. The four kept are brief grammar and nothing else.
- **Require any single marker** — rejected: a brief *missing* one section is the exact failure this gate catches, so detection has to survive the omission it grades. Two-of-four does; one-of-four raises false-positive risk on ordinary PRs for no gain.
- **Relax `checkDocUpdateList`'s heading pattern** to accept `## Documentation to update` (the wording both live fix briefs used) — rejected as out of surface: this change alters *when* the validators run, never what they accept. The wording requirement is documented in `brief-authoring/SKILL.md` §7 instead, where the `--body-file` check now catches it before dispatch.

**Consequences:** Every brief-shaped PR is graded regardless of branch, so standalone `fix/*` and other non-task briefs now fail CI for a missing section where they previously passed silently — including, deliberately, this PR's own body. `checkBriefSections` takes an optional fourth `options` argument; the existing three-argument callers (`bin/verify-brief.ts`, `apps/vinaya/cli/src/checks/bin/check-brief-shape.ts`) keep today's behavior unchanged. **This opens a real divergence with Vinaya's `brief-shape` check, stated here rather than glossed:** that check runs `checkBriefSections` on *any* non-empty body, with no shape test and `requireClosesN` defaulting to `true`, so `vinaya check brief-shape` will demand `Closes #N` on exactly the standalone fix briefs `verify-brief` now deliberately exempts. The divergence is pre-existing in kind (that file never carried branch logic, so it was already stricter than the shim on non-task branches) but this entry widens it, and `check-brief-shape.ts`'s header claim that it "mirrors `packages/aeg-core/bin/verify-brief.ts`'s input assembly" is now materially less true. Reconciling the two — most likely by giving the Vinaya check the same shape test and `requireClosesN` derivation — is deliberately **out of this change's surface** and left as a follow-up; `packages/aeg-core/bin/*` is outside that file's stated edit boundary, so it is not a one-line fix. Running `--body-file` against the two existing fix briefs surfaced that both head §7 `## Documentation to update`, which the gate's pattern does not accept, and both omit `Project:` — pre-existing brief-authoring drift this gate was previously blind to, now documented in the skill.

---

## D-130 — The issue-creation gate grades what the rationale says, not only that its fields exist

**Date:** 2026-07-20
**Status:** ACTIVE
**Type:** 2 (reversible enforcement tightening — new refusals on a body class the gate already inspects; revertible by dropping the three checks, TL-decidable)
**Lock:** NO
**Conforms-to:** D-078
**Gate-evolution direction (D-116, required field):** **Direction (2) — tightening.** The ring-0 issue gate already runs on every task Issue; it starts refusing bodies it previously accepted. Per D-116 rule 2 it applies only to Issues created or body-edited after this lands — the gate runs at write time, so the existing Issue stock is untouched and no retroactive sweep is implied.

**Context:** `checkIssueRationale` (D-078) is a *presence* gate: it proves a task Issue carries all eight planner-brief rationale fields. It never reads what those fields say. Three task Issues cut this session in `vinaya-pages-v2` (#621, #622, #626) passed it while being wrong in three distinct, mechanically-detectable ways:

- **A — blast radius under-declared.** #621 and #626 edit `packages/ui`, a collision domain every product reads, under `Project: vinaya` alone. Each admits the cross-product reach in its own prose ("any topbar change is seen by every product") while carrying the label set that decides the review fan-out — `projects.md`: "more projects = more review lenses = proportionally more rigor." A shared-primitive change reviewed through one product's lens under-governs the regression the Issue itself predicts.
- **B — brief content in the Issue.** All three carry a `## References` block (skills-to-read, surface pointers). Brief-authoring is explicit that a brief never goes in the task's forge Issue: it is authored against the surface at dispatch time and goes stale before work starts, leaving two artifacts that disagree with nothing to arbitrate them.
- **D — no read-obligation signal, the root cause of both.** Nothing forces a Planner to read the docs and skills governing the surface it is planning. The skill-check hook fires on file edits; cutting an Issue edits no file. Both the agent that cut these Issues and a prior brief-author self-corrected only after the Principal asked — which is to say, not deterministically.

**Decision:** Add four checks beside `checkIssueRationale` in `packages/aeg-core/src/issue-validation.ts`, wired into `bin/open-issue.ts` for task-labelled Issues only. `checkBlastRadiusScope` (A), `checkNoBriefContent` (B) and `checkRationaleNamesDocs` (D) **refuse**; `checkConflictCompleteness` (C) **warns and never blocks**. This follows the standing rule that every agent failure becomes a deterministic function on the surface it happened on.

Supporting decisions, each load-bearing:

1. **`.aeg/packages` is created, not invented.** Three governance docs (`projects.md`, `iterations/README.md` §5, `aeg-manual-flow.md`) name it as *the* static collision-domain list; the file had never existed in this repo. It is added here, derived — every `packages/*` workspace, plus the cross-cutting paths those docs name verbatim (lockfile, monorepo config, CI, hooks) — not hand-picked. **Check A is dormant when the file is absent**, the same seam-is-dormant-when-absent shape `doc-owners` uses: a check that needs a source of truth and has none should not run, and must certainly not block on a guess.
2. **Ownership, not mere mention, is what A grades.** A domain that IS a declared project's registered path (`Project: aeg-core` editing `packages/aeg-core`) is owned and passes. Without this the check would refuse the legitimately single-project shared edit — a gate that blocks valid work.
3. **A reads only Boundary and Project(s) + blast radius.** A whole-body scan flagged 46 of 166 historical task Issues, nearly all correct: rationales name packages as imports, as traps, as provenance. Those two fields are where a task states what it *touches*, so only there is a path a touch-claim worth blocking on.
4. **A cited document is not a touched domain.** An occurrence whose path token ends `.md`/`.mdx`/`.txt` does not count. Every rationale cites `packages/governance/projects.md`; counting citations fired A on all three source Issues for a file none of them edits.
5. **D's exemption is an explicit sentinel, `no-doc-surface`**, shaped after `Test Plan: unit-tests-only`. A greppable opt-out a Planner chose, never a blank field that merely resembles one. "No docs touched" is what an agent writes when it did not look.
6. **C cannot block, structurally.** An Issue declares no precise file surface, so "two Issues name the same domain" is a hint. AEG's conflict rule is declared-and-static for exactly this reason (`iterations/README.md` §5) — a real answer needs the live task→changed-files map the model eliminates.

**Alternatives rejected:**

- **Extend `checkIssueRationale`'s grammar instead of adding checks beside it** — rejected: D-078's grammar is a presence contract with two accepted syntactic styles and a coherence-oracle twin (R1) reading it continuously. Content grading has different inputs (`.aeg/packages`, the registry), different failure semantics, and one warn-only member; folding it in would couple a stable grammar to a predicate still being calibrated.
- **Make C blocking** — rejected, see supporting decision 6.
- **Hard-code the shared-package list in `issue-validation.ts`** — rejected: it makes the predicate un-auditable and drifts from the docs that already promise `.aeg/packages`. The list is data, read by the tool layer; the check stays pure.
- **Infer "edits" from verbs ("edits X", "changes X") rather than scoping to two fields** — rejected as a natural-language predicate masquerading as a deterministic one. Field scoping is structural and explainable in one sentence.
- **Add a ring-1 (coherence-oracle) half now** so the checks also re-run continuously over the open Issue stock — rejected as out of this change's surface, and recorded as a known gap in `aeg-root/enforcement.md`: unlike R1, these checks are ring-0 only. Adding them to the oracle would fail a large body of pre-D-130 Issues at once and needs a grandfathering decision of its own.

**Consequences:** Cutting or body-editing a task Issue now fails on an under-declared blast radius, leaked brief content, or a rationale naming no doc — each with a message naming its remedy. Measured against the 142 historical task Issues that pass the current rationale gate: B fires on exactly the 9 Issues cut this session (#621–#629) and nothing else; D fires on 20, essentially all genuine "no docs named" bodies that predate the sentinel; A fires on 34, and sampling confirms the class is real rather than noise (e.g. #383, a `vinaya-cli-v1` Tier-3 task editing `packages/aeg-core` under `Project: vinaya` alone). None of this touches existing Issues — the gate runs at write time — but a Planner *editing* an old Issue's body will meet the new checks, and the correct response is to fix the declaration, which is the point. `stripCode` (`anchored-region.ts`) gains a `{ inlineSpans: 'keep' }` option: block code is always stripped, but path-shaped checks must keep inline spans, because prose writes paths in backticks and a span-blind A matches nothing on the very Issues it was built from. The option lives on the single exported stripper rather than in a caller, so "one stripper, never a duplicated regex" (#617) stays literally true. Two latent bugs surfaced and were fixed while calibrating: the field slicer's `$` terminator matched end-of-*line* under the `m` flag, truncating every heading-style field to its own label, and an ungrouped alternation in the same pattern split the whole regex rather than the label.

---

## D-131 — `accent` is a surface, `primary` is the highlight; shadow colour is decoupled from `--border`; the retro/brutal border shim is removed

**Date:** 2026-07-20
**Status:** ACTIVE
**Type:** 2 (reversible token-role refinement — a naming/role convention plus three additive CMS fields; revertible by restoring the shim and reverting the call-site sweep, TL-decidable)
**Lock:** NO

**Authored by:** Developer session on `refactor/ui-theme-token-roles`, 2026-07-20
**Ratified by:** Type 2 — TL-decidable; recorded ACTIVE on merge.

**Context:** "Borders too white in obsidian-retro dark mode" traced to five independent causes, only one of which was a colour value.

`globals.css` carried `html[data-library="retro"|"brutal"][data-theme] { --border: var(--foreground) }`. It is live — `library-provider.tsx` sets `dataset.library` after hydration — and at specificity 0-2-1 it overrode whatever `--border` a theme defined, in **both** schemes. It existed as a compatibility shim: 13 of 20 themes ship borders at 0.14–0.20 alpha, tuned for soft libraries, and render near-borderless under retro.

Two token-role collisions sat underneath it. First, obsidian-retro's shadow strings were `Npx Npx 0 0 var(--border)`, so a black border necessarily produced a black — invisible — shadow; retroui's own theme keeps `--border: #000000` and `--shadow-color: #4a443c` separate, and our schema had no `shadowColor` field at all. Second, `--accent` was doing two incompatible jobs: a **surface** (retro's `installed/table.tsx` row `hover:bg-accent`, Button `ghost`, dropdown items — retroui's own accent is `#38342b`, a dark surface) and a **highlight** (38 call sites across Vinaya and Vāda plus the shared `next-link.tsx` nav-hover and `logo.tsx` wordmark). On a dark background a fill must be dark and a text colour must be light; no single value satisfies both. Every attempt to tune it broke one side.

Separately, retro's vendored `installed/button.tsx` references `hover:bg-primary-hover` / `hover:bg-secondary-hover` — retroui theme tokens we never defined, and with no `--color-*` mapping those classes emit no CSS at all, so those hovers had silently never fired.

**Decision:**

1. **`accent` is a surface; `primary` is the highlight.** `bg-accent`/`hover:bg-accent` are fills owned by components. `text-primary`/`hover:text-primary`/`group-hover:border-primary` are highlights. Opacity modifiers (`bg-accent/15`) are **not** an acceptable bridge — they fake a token that should exist.
2. **Shadow colour is its own token.** `shadowColor` (per-scheme, in the colour group) surfaces as `--shadow-color`. Theme shadow strings must reference it, never `var(--border)`. The shadow *ramp* stays scheme-agnostic; only its colour is per-scheme.
3. **`primaryHover` / `secondaryHover` become real tokens**, mapped in `@theme inline`, so already-vendored `installed/` classes function.
4. **The retro/brutal border shim is removed.** Each theme owns its own border in both schemes.

**The `globals.css` "untouchable" rule is explicitly excepted here, with sign-off.** Measured `--numstat`: **8 deleted, 9 added** — the 8-line shim removed, and three `--color-*` mappings plus their 5-line rationale comment. (An earlier revision of this entry said "Net −8/+3", counting only the functional lines, and at one point the file also carried ~25 further lines of neobrutalism-vocabulary aliases and a `.shadow-shadow` utility. Those were brutal-only support in a change that deprecates brutal, were never covered by this sign-off, and have been removed — brutal's code removal is a separate follow-up.) The exception is recorded rather than assumed because the rule is otherwise absolute: the shim makes a black border *unrepresentable* while it exists (it overrides the theme unconditionally), and the three `@theme inline` mappings are the only way Tailwind emits CSS for classes the vendored components already ship. Neither is a styling preference expressed in global CSS — which is what the rule exists to prevent.

**Alternatives rejected:**
- **Tune `--accent` to a mid value serving both roles** — rejected: measured, there is no overlap. Readable as text on a 0.13 background needs ≈0.65+; readable *under* 0.95 text as a fill needs ≈0.45 or lower.
- **Soften the fills in retro wrappers (`hover:bg-accent/15`) and keep accent bright** — rejected: 38 highlight uses vs 3 fill uses, and the fills live in vendored upstream components whose assumption (accent = surface) matches retroui. Wrapping to fight upstream is the inversion.
- **Keep the shim and give obsidian-retro a lighter border** — rejected: it does not address the shadow coupling, and leaves every theme's border unrepresentable under retro/brutal.
- **Scope the doctrine to retro/brutal only** — rejected as unimplementable: `next-link.tsx` and `logo.tsx` are shared and cannot branch on the active library from a class string.

**Consequences:** The two migrated themes are reproducible from `packages/cms/scripts/seed-neobrutalist-themes.ts` rather than existing only as published Sanity documents. Removing the shim means **each theme must now supply its own adequate border**, so the theme pickers partition on a new explicit `uiTheme.neobrutalist` flag rather than offering pairings that render wrong in either direction — neobrutalist libraries offer only flagged themes, soft libraries only the rest (shared `themesForLibrary()`/`isThemeCompatible()` in `@atta/cms`; Herald's `/[username]/ui` and `tools/admin`'s themes page both consume it, and switching library re-selects a compatible theme). Only obsidian-retro has been migrated; the other 19 will render near-borderless if repointed at retro/brutal — a tracked follow-up, not a regression of this change. Vāda, Herald and Atta shift nav-hover and wordmark from accent to primary; in their themes (kpop-demon-hunter, ultraviolet, obsidian) both tokens are bright, so this is a hue shift, not a contrast change. `.claude/skills/ui-library-system/SKILL.md`'s `currentColor` premise for retro/animate sticky-header rules is **corrected in the same PR**, and **animate's own sticky header was changed to `var(--border)` alongside retro's** — it had the identical defect, live on Vāda and Atta, — the premise was wrong (`@layer base { * { @apply border-border } }` gives every element `--border`), and it produced the very mismatch it was written to prevent. `apps/aeg` carries 20 unmigrated accent-highlight uses and is deliberately untouched: it is a deprecated duplicate of Vinaya Studio slated for deletion in `deprecation-v1`, and is outside this change's `Project:` scope.

---

## D-132 — D-095's cetana-deletion gate is met; Cetana and the old AEG Studio are deleted now

**Date:** 2026-07-18
**Status:** ACTIVE
**Type:** 1
**Lock:** NO
**Authored by:** Principal (Daniel)
**Ratified by:** Principal (Daniel), 2026-07-18

**Context:** D-095 retired Cetana as a product decision but deferred execution, gating deletion of `apps/cetana-ai` on "Vinaya CLI + Studio work 100%." That gate has since been met in substance: `vinaya-cli-v1` harvested what D-095 named as harvestable (the `init` interactive skeleton and its abort-path regression tests, the hierarchical config pattern, the escalation severity taxonomy — the last already living on as AEG's `needs:*-input` labels), and Vinaya Studio is the live governance UI. Separately, the old AEG Studio app (`apps/aeg`) was superseded wholesale by the `apps/vinaya/web` port (#493) and has been dead code since. Both apps were therefore costing coherence — every stale `apps/aeg/` path citation, every dangling `apps/cetana-ai` doc-owners binding and skill, and a CI test-exclusion for a package nobody runs — with no offsetting value. Principal directive when reshaping `deprecation-v1`: *"I want all gone in once — all incoherence GONE at once."*

**Decision:** D-095's deferral is discharged: `apps/cetana-ai` and `apps/aeg` are deleted now, in one change, together with the trail each leaves behind — their `doc-owners` bindings, the `cetana-coordinator` skill, the CI cetana-cli test exclusion, the `cetana:task` issue-template default label, and every stale `apps/aeg/` path citation in live code and doctrine. D-095's one preservation obligation is carried, not dropped: the Slice-1 cognitive-continuity finding recorded in `apps/cetana-ai/specs/cetana-experiment-log.md` is re-homed into the deleting PR's own body before the file is removed. Historical records are exempt and stay exactly as written — `aeg-root/iterations/completed/**`, every test fixture, and prior decision entries that cite these paths were true when written and are not rewritten. `packages/governance/projects.md`'s `aeg` row is likewise NOT edited here (D-110 keep-as-file); its disposition is escalated to the Principal separately.

**Alternatives rejected:**
- *Keep deferring until the Vinaya CLI's remaining commands ship* — rejected: the harvest D-095 actually gated on is complete, and the residual cost of holding two dead apps is paid continuously in stale references, dangling bindings, and doc claims that are simply untrue.
- *Delete the apps but sweep their references in a follow-up task* — rejected: deleting `apps/aeg` breaks its live reference set in the same instant, so a split lands a red `main` between the two PRs. The deletions are verification-coupled to the sweep, which is what makes one PR correct rather than arbitrary.
- *Archive the two apps somewhere rather than deleting them* — rejected: git history already is the archive, and an archived copy is a second thing to keep coherent.

**Consequences:** `apps/aeg` and `apps/cetana-ai` no longer exist; `@atta/aeg-studio` and the `@atta/cetana-*` workspaces leave the lockfile. Cetana's own decision log (D-001–D-026, five locks) is formally superseded by this entry, as D-095 anticipated. The stale AEG research (`specs/aeg-study/**`, `specs/aeg-improvement-findings.md`, `specs/ecosystem-backlog.md`) and the duplicate `aeg-project/decisions/D-043.md` go with them, removing the top-level `specs/` and `aeg-project/` folders entirely — the cross-cutting-backlog convention that pointed at `specs/ecosystem-backlog.md` is replaced by cutting backlog Issues, and the docs naming it are corrected. `apps/vinaya/web`'s `read-root.ts` sheds its dormant legacy-topology-file merge, now provably unreachable. The `aeg` row in `projects.md` is left orphaned pending the Principal's ruling.


---

## D-133 — D-072's sanctioned-crossings list drops the deleted Cetana crossing and retires its now-gone path references

**Date:** 2026-07-20
**Status:** ACTIVE
**Type:** 2 (reversible via a superseding D-entry — the same class as the D-072 it amends)
**Lock:** NO
**Authored by:** Developer (dispatched, review-fix on PR #638) — text dictated in the brief, transcribed not composed
**Ratified by:** Principal (directed this amendment, 2026-07-20 session)
**Amends:** D-072 — supersedes its sanctioned-crossing #2 (Cetana) and corrects its homes enumeration + enforcement pointer for the paths deleted by deprecation-v1 #573. D-072's own text is unchanged (D-006 append-only); this entry is the current truth for those enumerations. No back-pointer is added to D-072: it is not fully superseded — its one-way law stays ACTIVE — so a `Superseded by:` line would be false, and a partial-amendment back-pointer is undefined vocabulary whose introduction is a separate doctrine decision, not this fix. The forward `Amends:` here is the auditable link.
**Conforms-to:** D-095 (Cetana retired), D-123 (AEG retired as a public name), D-132 (this PR's deletion authorization).

**Context:** deprecation-v1 #573 (PR #638) deletes apps/cetana-ai, apps/aeg, the aeg-project/ folder, specs/aeg-study/**, specs/ecosystem-backlog.md, and specs/aeg-improvement-findings.md. D-072 (lock-protected, ACTIVE) declares an exhaustive sanctioned-crossings list whose item #2 is "Cetana — the orchestrator is a sanctioned knower of AEG," whose Decision line enumerates AEG's homes as aeg-root/, aeg-project/, apps/aeg/, packages/aeg-core/, specs/aeg*, and whose enforcement note backlogs to specs/ecosystem-backlog.md. Deleting Cetana and those paths without amending D-072 leaves a live, lock-protected governance entry naming a product and paths that no longer exist. This is a live enforcement input judged at review (doc-discipline), not a historical record, so D-006's append-only exemption does not cover it — this superseding entry is the sanctioned mechanism.

**Decision:** (1) Sanctioned crossing #2 (Cetana) is removed — Cetana no longer exists (deleted by #573, retired by D-095), so it is no longer a sanctioned knower of AEG; the list stays exhaustive over the four surviving crossings (workflows, AEG-owned views, historical records, planning-seam backlogs). (2) D-072's homes enumeration is corrected to AEG's surviving homes: aeg-root/, packages/aeg-core/, and the Vinaya surface (apps/vinaya) — apps/aeg/ and the aeg-project/ folder are deleted, and specs/aeg* no longer holds AEG homes after specs/aeg-study/** removal. (3) The enforcement-backlog pointer to specs/ecosystem-backlog.md (deleted) is retired; the backlogged mechanical boundary check, if still wanted, is tracked on the forge, not in a deleted file. D-072's one-way knowledge law itself is unchanged and still ACTIVE — only its now-dangling enumerations are amended.

**Lock:** NO.

---

## D-134 — Verdict extraction tolerates leading markdown *emphasis*, not markdown quotation

**Date:** 2026-07-21
**Status:** ACTIVE
**Type:** 2 (reversible enforcement change — a char-class widening on two regexes; revertible by restoring the bare `^\s*` anchor, TL-decidable)
**Lock:** NO

**Authored by:** Developer session on `fix/verdict-marker-markdown-tolerant`, 2026-07-21
**Ratified by:** Type 2 — TL-decidable; recorded ACTIVE on merge.

**Context:** The pre-merge review gate reads a PR's code-review and security verdicts by line-anchored regex in `packages/aeg-core/src/verdict-extraction.ts`. Both extractors required `VERDICT:` at line start after only whitespace. On PR #636 the reviewer subagent emitted `**VERDICT: APPROVE**` — markdown-bolded — so the line never matched and the gate read the PR as carrying no code-review verdict at all (DANGLING), blocking a merge that should have proceeded.

`aeg-root/roles/reviewer.md`, `roles/security.md` and both `.claude/agents/*` definitions already mandate the bare line. The agent deviated from its own contract; instances keep drifting, so re-mandating it a fourth time does not stop the next incident.

The first cut of this fix used `[\s>*_#]*`. Review (#639) established by execution that this class was wrong in both directions: it did not deliver the `_` tolerance it claimed (`_` is a word character, so the trailing `\b` rejected `_VERDICT: APPROVE_`), and it widened the gate past emphasis into quotation — with most-recent-clear-hit-wins, a Developer quote-replying the reviewer's earlier text flipped a live REQUEST CHANGES to a passing gate with no reviewer action.

**Decision:**

1. **Emphasis is tolerated.** A leading run of one to three `*` or `_`, immediately abutting the token, is accepted before the literal `VERDICT:`. `**VERDICT: APPROVE**` and `_VERDICT: APPROVE_` match. The value-side boundary is `(?![A-Za-z0-9])`, not `\b`, so the closing `_` is accepted while `APPROVED`/`PASSED` are still rejected.
2. **Quotation and structure are not.** Blockquote (`>`), heading (`#`), list item (`* ` / `-` / `1.`), code span and strikethrough are rejected. Each is a way for prose to *mention* a verdict rather than cast one. The space after `*` is what distinguishes a bullet from emphasis.
3. **A literal `VERDICT:` token remains required.** Bare-word prose ("I do NOT approve of that design") and the Archivist's own DANGLING placeholder ("no security-review pass was run before merge") still miss — the invariant this file was hardened to hold.
4. **The spec still says bare.** `roles/reviewer.md` and `roles/security.md` state the verdict line is bare — no bold, no heading, no blockquote — and note that it is machine-read. Bare is the instruction; emphasis is tolerated defensively, not blessed.

**Trade accepted:** a loud fail-closed failure (#636: an emphasis-wrapped verdict read as DANGLING, blocking a good merge — noisy and self-announcing) for a narrow fail-open one (a literal `VERDICT: <value>` token appearing inside emphasized prose). The gate never checked comment authorship, so a deliberate forger could always type the bare line; this adds no new authority. What it must not add is an *accidental* path, which is why quote-reply — normal, high-frequency GitHub UX — is excluded.

**Alternatives considered:**

- **Fix the agent definitions instead, change no code** — rejected as the sole remedy: the contract is already written in four places and drift recurred anyway. The role-doc wording is strengthened in the same PR, so this is done *as well as*, not instead of.
- **The original `[\s>*_#]*` class** — rejected on review: silently fail-open under quote-reply, and factually inconsistent with its own header comment on `_`.
- **Tolerate code spans too** — rejected: a backticked marker is exactly how the role docs and the extractor's own header comment write *about* the contract, so tolerating it would match prose describing the rule. Recorded in the header comment as decided rather than overlooked.

**Consequences:** `packages/aeg-core/src/verdict-extraction.ts` is the single implementation of this pattern (§11, one implementation per fact) and both extractors carry the identical prefix — they must continue to be edited together. Its header comment is the doc for this behavior and now enumerates the rejected forms with reasoning. `verdict-extraction.test.ts` pins 17 rejection cases, every one of which matched under the first-cut class; rejection coverage, not acceptance coverage, is what protects this file from its own history.
