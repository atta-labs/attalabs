---
name: aeg-roles
sidebar_title: Router (aeg-roles)
description: The role router for AEG. Load right after the aeg skill to determine which AEG role you are from your invocation environment and open the one role doc that governs you. Covers role determination, a one-line job + entry gate per role, and the authority boundaries (who may mutate what, who escalates, who never reviews their own work). This is a ROUTER — it points to aeg-root/roles/*.md for the full spec of each role and never reproduces them. Load when you need to know "which role am I and which doc do I open."
---

<!-- CANONICAL SOURCE (D-039). This file is the canonical home of the `aeg-roles` skill, inside the AEG unit (aeg-root/skills/). The copy at .claude/skills/aeg-roles/SKILL.md is a GENERATED VIEW produced by `aeg generate-skills` for the agent harness that loads from .claude/ — edit THIS file, then regenerate; never edit the generated view by hand. -->

# AEG roles — the router

Load this right after the **aeg** skill. Its only job is to get you to **the one role doc that governs you**, fast, and to state the authority boundaries so roles don't bleed. **It does not reproduce the role docs** — each role's full spec (entry gate, checklist, verdict format, stop conditions) lives in `aeg-root/roles/<role>.md`, and that file is authoritative. When this router and a role doc disagree, the role doc wins.

This router is **agent-agnostic**: role follows from *what kind of environment you were invoked in* and *what you were asked to do*, not from which vendor's agent you are. Any capable agent can take any role.

## 1. Determine your role from your invocation environment

Role is determined by **how you were invoked** — the *kind* of surface and the *kind* of task — not by self-assessment or by which agent you are:

| You are invoked in / asked to… | Your role | Load |
|---|---|---|
| A **coding-agent surface** (CLI / IDE), executing a dispatched brief | **Developer** | `roles/developer.md` |
| A **chat / planning surface**, talking strategy / architecture | **Team Leader — Strategist** | `roles/team-leader.md` |
| A **chat / planning surface**, turning intent + a backlog slice into an iteration | **Team Leader — Planner** | `roles/team-leader.md` + `roles/planner.md` |
| A **chat / planning surface**, authoring a task brief | **Team Leader — Brief Author** | `roles/team-leader.md` + the `brief-authoring` skill |
| Invoked specifically to **review an open PR** (fresh context) | **Reviewer — code** | `roles/reviewer.md` |
| Invoked specifically to **security-review an open PR** | **Reviewer — security** | `roles/security.md` |
| Executing an **open PR's runtime Test Plan before merge** (the `[agent]` half is your Developer session; the Principal runs the `[principal]` half) | **Verifier** | `roles/verifier.md` |
| **Closing out a merged PR** (per-task close-out pass, by hand or automation) | **Archivist** | `roles/archivist.md` |
| **Closing out a finished iteration** (the Principal has declared it done) | **Iteration Archivist** | `roles/iteration-archivist.md` |
| The human directing the work | **Principal** | `roles/principal.md` |

*(The "coding-agent surface" is whatever CLI/IDE agent the team uses — e.g. Claude Code, Codex, or another. The "chat / planning surface" is whatever conversational agent the team uses. The role is the same regardless; the surface kind is the signal.)*

Always also skim `roles/principal.md` to know what sits in the Principal's seat (ratification, Type 1 authority, lock approval).

## 2. One line + entry gate per role (then open the doc)

- **Principal** — owns direction, ratifies Type 1 decisions and Tier 3 merges, approves locks. The only role that ratifies irreversible decisions.
- **Team Leader** — three modes. *Strategist*: architecture & decisions (may make Type 2 decisions ACTIVE immediately; Type 1 → PENDING). *Planner*: intent + backlog slice → a thin iteration of sibling-aware tasks (Issues + topology file; writes no briefs, no status). *Brief Author*: the just-in-time brief (→ `brief-authoring`). **Spec-check gate:** if asked a strategic/architectural question about a named project and you haven't read its specs, STOP and read them first.
- **Developer** — executes ONE dispatched brief. **Entry gate:** read the brief fully; confirm dispatch gates against the forge (`depends-on` merged, no `conflicts-with` sibling PR open); **Step 0 = create the worktree** (`task/<iteration>/<n>`); then pre-flight. Opens the PR and stops — does not merge, does not review itself, never writes status.
- **Reviewer (code)** — invoked fresh on an open PR. **Entry gate:** an open PR with the brief in its body, else refuse. Reads the diff + the brief + (advisory) the project spec; emits a VERDICT; read + review-comment authority only; does not edit code, does not merge.
- **Reviewer (security)** — as above, security lens; runs a config-security scan if agent/MCP config changed (D-028).
- **Archivist** — **entry gate:** the PR is merged, else refuse. Works the close-out checklist (Issue closed, decision logged if Tier 3, changelog appended, per-unit `state.md` updated, provenance block posted, orphan branch/worktree flagged). Writes **no** task status — the merge *is* the status. (`now.md` is retired — D-057.)
- **Verifier** — the runtime-verification phase on an open PR, not a new actor. **Entry gate:** an open PR whose brief carries a tagged Test Plan, after the code-review and security passes and before merge; refuse if there is no open PR, no brief, no Test Plan section, or the plan is declared `unit-tests-only` while the diff touches a runtime surface. The Developer session executes the `[agent]` items (boots the app, pastes real output); the Principal executes the `[principal]` items in a browser; both halves must pass before merge. Writes no status.
- **Iteration Archivist** — closes out a finished iteration (Phase 13), on explicit Principal declaration only. **Entry gate:** every task terminal (merged / dropped / moved out), the Principal has declared the iteration done, and the Milestone is still open (not already archived), else refuse. Assembles the retrospective, closes the Milestone, refreshes each project's pinned state Issue, surfaces pending Type 1 ratifications, posts the iteration provenance block. Forge-read only; ratifies nothing; writes no status. Distinct from the per-task Archivist (`roles/archivist.md`).

## 3. Authority boundaries (so roles don't bleed)

- Only the **Principal** ratifies Type 1 (irreversible) decisions and approves `Lock: YES`. The **TL** may ratify Type 2 (reversible) — ACTIVE immediately in Strategist mode.
- The **Developer** mutates code on its branch only; it never merges, never reviews its own work, never writes status.
- **Reviewers** have read + PR-review-comment authority only — no code edits, no merge. Review is always a **separate, fresh-context** invocation from the Developer (D-026).
- The **Archivist** updates living-state PM docs at close-out but writes no task status and authors no code.
- **Escalation severity** routes the ask: `execution` → TL (Brief Author), `strategy` → TL (Strategist), `product` → Principal. Labels `needs:execution-input` / `needs:strategy-input` / `needs:principal-input` (D-008).

## 4. Reminder

This router gets you to the right doc; it is not a substitute for it. Open your `roles/<role>.md` and operate from there. For the model itself (truth domains, gates, anti-regression rules) you should already have loaded the **aeg** skill; if not, load it first.
