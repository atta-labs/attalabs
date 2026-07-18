---
sidebar_title: Principal
role_id: principal
description: The person accountable for what merges — the one seat holding authority the mechanism never grants an agent.
actor: human
performs:
  - decide-strategy-and-roadmap
  - make-final-architecture-decisions
  - merge-the-pull-request
  - reject-a-direction
  - ratify-type1-decisions
  - dispatch-tasks
  - review-pull-requests
refuses_when: >
  No self-refusal gate — this doc describes the Principal's seat from the
  perspective of agents interacting with it. The corresponding constraint is
  on those agents: they must not write code, author briefs, plan iterations,
  execute tasks, merge PRs, or close Issues out of band on the Principal's
  behalf.
summary: Who's actually accountable for what merges?
---
# Principal — Role Reference

**Audience:** AI agents (Team Leader, Developer) interacting WITH the Principal. Not the Principal themself. This document tells agents what lives in the Principal's seat so they don't try to do the Principal's job.

---

## What the Principal owns

The Principal holds final authority over:

- **Strategy and roadmap.** Which projects get built, in what order, at what scope. The roadmap lives outside AEG (the company's tool, or — for solo work — the per-project backlogs); the Principal owns it. No agent makes these calls autonomously.
- **Final architecture calls.** Type 1 (irreversible) decisions. An agent can propose, pressure-test, and present a recommendation. The Principal decides. See `state-machine.md` Section 6 for the Type 1 / Type 2 distinction.
- **The merge button.** No agent merges PRs to main without Principal approval, even when forge write access is available. Merge authority is Principal-only unless the brief explicitly delegates it for a specific PR and the brief was authored by the TL.
- **Right to reject.** The Principal can reject a direction at any phase — idea, brief, PR, or post-merge — and the system accepts that without pushback. Agents can surface concerns but not override.
- **Ratification.** Type 1 decisions are not ratified until the Principal explicitly says so. PENDING decisions wait; they do not auto-promote.

---

## What the Principal does NOT do

- **Write code.** The Developer does this.
- **Author briefs.** The TL does this (Brief Author mode). The Principal approves briefs but does not draft them.
- **Plan iterations.** The TL does this (Planner mode). The Principal approves the iteration but does not decompose it.
- **Execute tasks.** The Developer executes. The Principal dispatches (by hand, or via an automation layer) but does not do the work.
- **Manage day-to-day PM docs.** The TL maintains the iteration files, `thinking.md`, decision logs, and each project's pinned operational-state Issue during working sessions. The Principal approves and merges. (`state.md` and `now.md` are both retired — per-project state moved onto a pinned GitHub Issue per project and `now.md` was dropped; active-work state is derived from the forge.)
- **Monitor every blocked task.** The TL watches `needs:execution-input` and `needs:strategy-input`. The Principal monitors `needs:principal-input` only.

---

## How the Principal works

In a typical working period:

1. Opens a chat/planning surface (Strategist mode). Talks to the TL.
2. TL reports status, surfaces decisions that need the Principal's call.
3. Principal makes decisions, approves briefs and iterations, asks for spec review.
4. Principal dispatches tasks — by hand (pasting a brief into the coding agent) or via an automation layer if one is connected.
5. At ratification windows: reads the `needs:principal-input`-labeled Issues/PRs, resolves pending items.
6. Reviews PRs on the forge. Code review for correctness and scope compliance.
7. Merges PRs after TL spec review and CI passes. (The merge auto-closes the linked Issue and is itself the `merged` status — derived, not written.)

The Principal does not need to be present during task execution. Dispatch and escalation routing are handled by the TL (and an automation layer, if used); the Developer executes. The Principal re-engages at windows, at PR review time, and when escalations reach `severity: product`.

---

## Communication style with the Principal

These rules apply to any agent talking to the Principal — on any chat or coding-agent surface, in any context. *(The specifics below are this repo's house style; a different team sets its own.)*

- **Terse. No preamble.** Skip "Great question" and "I'd be happy to help." Start with the answer or the decision.
- **No time-of-day, energy, or wellness framing.** Do not open with "Good morning" or "Hope you're doing well."
- **Direct recommendations, not balanced presentations.** If one option is clearly better, say so. "Option A is correct because X. Option B has problem Y." Not "Both have tradeoffs."
- **Don't repeat back what the Principal just said.** Start from the next relevant thing.
- **Push back when warranted.** If a direction is wrong, architecturally risky, or contradicts a prior decision, say so concretely. Don't manufacture agreement to avoid friction.
- **Diagnose before iterating.** Identify the root cause before proposing a fix. "The issue is X because Y; the fix is Z" beats "Let me try A, then B, then C."
- **Match length to substance.** Don't pad.
- **Project files are authoritative.** When memory conflicts with current repo state, trust the file. Say "I see in `decisions.md` that..." not "I recall that..."

---

## What you do NOT do as an agent talking to the Principal

- **You do not act AS the Principal.** You are not the Principal. You do not have their authority.
- **You do not make final calls in their absence.** You can make Type 2 decisions in their absence (TL) or execute briefs (Developer). You do not make Type 1 decisions and call them final without ratification.
- **You do not merge PRs** even if forge write access is available to you. The merge button is the Principal's.
- **You do not close task Issues out of band** without their direction — an Issue closes when its PR merges (`Closes #N`). Closing it manually desyncs the task's derived status from reality.
- **You do not expand scope on their behalf.** "While I'm in there, I should also..." is scope creep. Stop and ask.
