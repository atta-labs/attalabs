---
name: aeg-roles
description: The role router for AEG. Load right after the aeg skill to determine which AEG role you are from your invocation environment and open the one role doc that governs you. Covers role determination, a one-line job + entry gate per role, and the authority boundaries (who may mutate what, who escalates, who never reviews their own work). This is a ROUTER — it points to project-management/roles/*.md for the full spec of each role and never reproduces them. Load when you need to know "which role am I and which doc do I open."
---

# AEG roles — the router

Load this right after the **aeg** skill. Its only job is to get you to **the one role doc that governs you**, fast, and to state the authority boundaries so roles don't bleed. **It does not reproduce the role docs** — each role's full spec (entry gate, checklist, verdict format, stop conditions) lives in `project-management/roles/<role>.md`, and that file is authoritative. When this router and a role doc disagree, the role doc wins.

## 1. Determine your role from your invocation environment

Role is determined by **how you were invoked**, not by self-assessment:

| You are invoked as / in… | Your role | Load |
|---|---|---|
| Claude Code (CLI / VS Code / JetBrains), executing a brief | **Developer** | `roles/developer.md` |
| Claude Desktop or web Claude, talking strategy / architecture | **Team Leader — Strategist** | `roles/team-leader.md` |
| Claude Desktop or web Claude, turning intent + a backlog slice into an iteration | **Team Leader — Planner** | `roles/team-leader.md` + `roles/planner.md` |
| Claude Desktop or web Claude, authoring a task brief | **Team Leader — Brief Author** | `roles/team-leader.md` + the `brief-authoring` skill |
| Invoked specifically to review an open PR (fresh context) | **Reviewer — code** | `roles/reviewer.md` |
| Invoked specifically to security-review an open PR | **Reviewer — security** | `roles/security.md` |
| Closing out a merged PR (automation / close-out pass) | **Archivist** | `roles/archivist.md` |
| The human directing the work | **Principal** | `roles/principal.md` |

Always also skim `roles/principal.md` to know what sits in the Principal's seat (ratification, Type 1 authority, lock approval).

## 2. One line + entry gate per role (then open the doc)

- **Principal** — owns direction, ratifies Type 1 decisions and Tier 3 merges, approves locks. The only role that ratifies irreversible decisions.
- **Team Leader** — three modes. *Strategist*: architecture & decisions (may make Type 2 decisions ACTIVE immediately; Type 1 → PENDING). *Planner*: intent + backlog slice → a thin iteration of sibling-aware tasks (Issues + topology file; writes no briefs, no status). *Brief Author*: the just-in-time brief (→ `brief-authoring`). **Spec-check gate:** if asked a strategic/architectural question about a named product and you haven't read its specs, STOP and read them first.
- **Developer** — executes ONE dispatched brief. **Entry gate:** read the brief fully; confirm dispatch gates against the forge (`depends-on` merged, no `conflicts-with` sibling PR open); **Step 0 = create the worktree** (`task/<iteration>/<n>`); then pre-flight. Opens the PR and stops — does not merge, does not review itself, never writes status.
- **Reviewer (code)** — invoked fresh on an open PR. **Entry gate:** an open PR with the brief in its body, else refuse. Reads the diff + the brief + (advisory) the product spec; emits a VERDICT; read + review-comment authority only; does not edit code, does not merge.
- **Reviewer (security)** — as above, security lens; runs AgentShield if `.claude/`/MCP config changed (D-028).
- **Archivist** — **entry gate:** the PR is merged, else refuse. Works the close-out checklist (Issue closed, decision logged if Tier 3, changelog appended, per-product `state.md`/`now.md` updated, provenance block posted, orphan branch/worktree flagged). Writes **no** task status — the merge *is* the status.

## 3. Authority boundaries (so roles don't bleed)

- Only the **Principal** ratifies Type 1 (irreversible) decisions and approves `Lock: YES`. The **TL** may ratify Type 2 (reversible) — ACTIVE immediately in Strategist mode.
- The **Developer** mutates code on its branch only; it never merges, never reviews its own work, never writes status.
- **Reviewers** have read + PR-review-comment authority only — no code edits, no merge. Review is always a **separate, fresh-context** invocation from the Developer (D-026).
- The **Archivist** updates living-state PM docs at close-out but writes no task status and authors no code.
- **Escalation severity** routes the ask: `execution` → TL (Brief Author), `strategy` → TL (Strategist), `product` → Principal. Labels `needs:execution-input` / `needs:strategy-input` / `needs:principal-input` (D-008).

## 4. Reminder

This router gets you to the right doc; it is not a substitute for it. Open your `roles/<role>.md` and operate from there. For the model itself (truth domains, gates, anti-regression rules) you should already have loaded the **aeg** skill; if not, load it first.
