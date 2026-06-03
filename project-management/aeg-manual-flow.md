# AEG — Running the Flow by Hand

**Atta Agentic Execution Governance (AEG)**, manual mode. This is the playbook for running the flow with nothing but Claude Code and this repo — no Cetana, no automation.

This file is the companion to `process.md` (the eleven-phase walkthrough) and `state-machine.md` (the constitution). Where those describe the model in full, this one is the operator's guide: what a human does, in what order, calling which agent, with what in hand.

---

## 1. The flow is the product; the tool is optional

AEG is the flow. **Cetana is a tool that automates the orchestration slice of the flow** — it removes the copy-paste between roles. It is not the flow, and the flow does not depend on it.

Everything below can be run by hand: you open Claude Code, you tell it which role to be, it reads its role doc, it checks whether it should be acting right now, and it does the work. Cetana later collapses the hand-offs into commands (`cetana dispatch`, `cetana watch`, `cetana reply`) — but the semantics are identical. Anything true of the manual flow is true of the Cetana flow.

**Manual mode is the teaching mode.** Companies are wary of AI because work happens invisibly — an agent does ten things under the hood and you find out later. AEG's manual steps make the invisible visible: each hand-off is a checkpoint where a human sees a risk that automation normally hides. Why review is separate from authorship. Why a brief is frozen. Why nothing merges without a human. Why decisions are logged. Running it by hand once teaches the *why* of every gate. That is a feature, not overhead.

---

## 2. The brief is the unit of context

The brief is the single most important artifact in the flow. Three rules:

1. **Context lives in the brief.** The brief is the whole context for the task. An agent should never need to go read something else to understand what it's doing. If context isn't in the brief, it doesn't exist.

2. **The brief is pasted, not committed — but it must land in the PR body.** You hand the brief to the Developer directly (a markdown block, all sections per `.claude/skills/brief-authoring/SKILL.md`). You do **not** need to commit a `briefs/*.md` file. Durability comes from a different place: when the Developer opens the PR, the brief text goes into the PR body. That makes it permanent (GitHub retains it), attached to exactly the work it governed, and readable by the Reviewer and Archivist. The PR body is the brief's permanent home.

3. **`Ticket:` is optional and reference-only.** A brief may carry a link to an external ticket (Jira, Linear, etc.):
   ```
   Ticket: PROJ-1234 — https://acme.atlassian.net/browse/PROJ-1234   (optional)
   ```
   This is **provenance, not instruction**. No agent reads the ticket, needs access to it, or is blocked by it. It is carried into the PR body alongside the brief so the change traces back to the org's world, and the Archivist can note it at close-out. A principal with no ticket system simply omits the line. Agents must never treat the ticket link as a substitute for context in the brief — if scope lives in the ticket instead of the brief, the brief is malformed.

**Note on Cetana:** Cetana reads a brief *from* a GitHub issue body because automation needs somewhere to fetch it. That is a Cetana implementation detail, **not** an AEG requirement. The flow depends on "a well-formed brief exists," not on GitHub Issues. Manual AEG needs no issue.

---

## 3. Every agent is self-locating

This is what makes the flow safe to run by hand. When you call an agent, it does not trust that you called it correctly. Before doing any work, each agent checks two things against shared state:

1. **Is this my phase?** — given the current state of the work, is this role the right one to act now?
2. **Is my input well-formed?** — was I handed the artifact I require, in the shape I require?

If either check fails, the agent **refuses or redirects** instead of proceeding. This is the same skeptical posture the Reviewer already has (it won't review its own work), generalized to every role: every agent has an **entry gate**.

**Shared state in manual mode = the repo + GitHub (PR / issue status).** Crucially, the gates read state that exists whether or not Cetana is running — never Cetana's JSONL runtime. In manual mode, **the PR is the state machine**: a PR that doesn't exist yet means "not ready to review"; an open PR means "ready to review"; a merged PR means "ready to close out." That is what lets the gates work identically with or without the tool.

---

## 4. The manual run order

| Step | Role | You hand it | It produces | Entry gate (refuses if…) |
|------|------|-------------|-------------|--------------------------|
| 1 | **Principal** (you) | an intent / goal | a decision to proceed, a tier | — |
| 2 | **Brief Author** (Team Leader mode) | the intent | a brief, all sections | asked to write code instead of a brief |
| 3 | **Developer** | the brief | a worktree, the work, an open PR (brief in body) | input isn't a well-formed brief |
| 4 | **Reviewer (code)** | "review PR #N" | a VERDICT (APPROVE / REQUEST CHANGES) | no open PR, or no brief in the PR body, or it authored the code |
| 5 | **Security** | "security-review PR #N" | a VERDICT (PASS / FAIL) | no open PR, or no brief in the PR body |
| 6 | **Principal + TL** (you) | the verdicts | merge decision | review passes not done |
| 7 | **Archivist** | "close out PR #N" | a close-out report | **PR is not merged** |

You walk down the column. Each agent, when invoked, confirms it's its turn before acting.

---

## 5. Per-role entry gates (the refusal language)

These are the gates each role checks first. The wording is what the agent should say when it refuses.

**Brief Author** (Team Leader, Brief Author mode)
- Requires: an intent from the Principal.
- Refuses: a request to implement directly → *"I author the brief, I don't implement. Tell me the goal and I'll write the brief."*
- Produces: a brief per `brief-authoring/SKILL.md` (tier, type, scope, stop conditions, deliverable, optional `Ticket:`).

**Developer**
- Requires: a well-formed brief (has tier, scope, stop conditions, deliverable).
- First action: inspect what it was handed. If it's a loose prompt, not a brief → *"This isn't a brief — it's missing tier / scope / stop-conditions. Get one from the Brief Author first; I don't infer scope from a prompt."*
- Then: worktree Step 0 (`git worktree add .worktrees/<branch> -b <branch> origin/main && cd .worktrees/<branch>`), do the work, open the PR.
- Done-checklist gains: **the brief text (and `Ticket:` line, if present) is pasted into the PR body.**

**Reviewer (code)**
- Requires: an open PR, with the brief in its body.
- Refuses: no PR → *"Nothing to review — open a PR first."* No brief in the body → *"This PR has no brief; I can't judge scope against intent. Add the brief to the PR body."* Authored the code itself → *"I can't review my own work; this needs a fresh reviewer."*
- Produces: VERDICT — APPROVE | REQUEST CHANGES (per `roles/reviewer.md`).

**Security**
- Requires: an open PR with the brief in its body (same gate as Reviewer).
- Refuses: same as Reviewer.
- Produces: VERDICT — PASS | FAIL (per `roles/security.md`).

**Archivist** (close-out)
- Requires: a **merged** PR.
- Refuses: PR not merged → *"This PR isn't merged; there's nothing to close out. Merge it first."*
- Confirms at close-out: issue closed (if one was referenced), branch deleted, decision logged if Tier 3, changelog appended, docs updated to match the change.
- Flags — does not perform — local worktree removal: the worktree lives on the operator's machine, so the Archivist lists it as a cleanup candidate; the human (or Cetana) removes it. The Archivist runs in the cloud and cannot reach the local filesystem.
- Produces: a close-out report listing anything still dangling.

---

## 6. How to invoke a role manually from Claude Code

You don't need Cetana to dispatch. In a Claude Code session:

1. Tell the agent its role: *"Act as the Developer. Here is the brief: …"* (or *"Act as the code Reviewer for PR #N."*)
2. The agent reads its role doc (`roles/<role>.md`) and this file, checks its entry gate, and either proceeds or refuses with the language above.
3. When it's done, you move to the next role yourself — you are the orchestrator. (This is exactly the hand-off Cetana automates later.)

The brief is the only thing you must prepare carefully. Everything else the agents enforce.

---

## 7. What Cetana adds (and doesn't change)

Cetana automates Steps 2→6 hand-offs: `cetana dispatch` spawns the Developer in a fresh worktree from a brief; `cetana watch` streams its work; `cetana reply` unblocks it when it escalates. It does **not** change the gates, the roles, the brief rules, or the order. If Cetana is unavailable, you run the same flow by hand. The flow is primary; the tool is convenience.

For the authority model, escalation severities, and tier rules that sit underneath all of this, see `state-machine.md`. For the full phase walkthrough, see `process.md`.
