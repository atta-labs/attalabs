---
sidebar_title: Manual Flow
---
# AEG — Running the Flow by Hand

**Agentic Execution Governance (AEG)**, manual mode. The playbook for running the flow with nothing but a coding agent, a Git forge, and this repo — no orchestration tool required.

Companion to `process.md` (the eleven-phase walkthrough), `state-machine.md` (the constitution), `iterations/README.md` (the iteration + task model), and the `roles/` docs. This file is the operator's guide: what a human does, in what order, calling which agent, with what in hand.

> **AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub/GitLab) the way it depends on git — the forge is its source of truth for execution state. It does **not** depend on any orchestration tool; a human or a thin dispatch script invokes roles. Knowledge flows one way: a tool may know AEG; AEG does not know the tool.

---

## 0. Starting and maintaining an AEG repo (`aeg.sh`)

AEG "init" is not software — it is a **state the repo is in**. A repo is running AEG when **everything the flow references is present**:

1. **The model layer** — `aeg-root/` scaffold (exists ONCE, at the repo root only): `state-machine.md`, `coordination.md`, `process.md`, `aeg-manual-flow.md`, `iterations/README.md`, `roles/`, `skills/` (the AEG skills — canonical home); plus `projects.md` only once multi-project.
2. **The living-state layer** — forge-native. State only, never the model: active/blocked/next is derived from Issue/branch/PR state, and completed-work history, lessons, per-project operational state, and ratification items live in `git log`/PR history, pinned Issues, and the `needs:principal-input` label respectively.
3. **The enforcement layer (referenced by the model, so it must travel with it):**
   - `.aeg/packages` — the static collision-domain list (conflicts are package-level, `iterations/README.md` §5).
   - the `verify-docs` script (`packages/aeg-core/bin/verify-docs.ts`), run as a step of the `aeg-gate-suite` job in `.github/workflows/forge-lifecycle.yml` — the doc-tier CI gate. The standalone `verify-docs.yml` workflow it once had was consolidated into that job and deleted.
   - the Issue template restricting Issues to deps / conflicts / project label / ticket link, and the CI check rejecting forbidden planning fields (`iterations/README.md` §9.3).
   - the generated agent-surface skill view (e.g. `.claude/skills/`) — derived from `aeg-root/skills/`.
4. At least one iteration file exists, and the role docs are reachable.

You can create that by hand, or use **`aeg.sh`** — one self-contained, downloadable shell script (from the AEG site). It is a **dumb scaffolder**: it writes files, nothing else. It does not dispatch agents, query the forge, or reason — that's a tool's or a human's job. Self-contained (scaffold embedded, no network) so you can read every byte first. It lays down **all four layers above** — not just `aeg-root/` + `aeg-project/` — so the unit it produces is complete: nothing the model references is missing. Subcommands:

```
aeg init [folder]                       # scaffold the repo (once): model + state + enforcement + skills
aeg add-project <name> --path <folder>  # register a project (creates/appends projects.md + stubs)
aeg new-iteration <name>                # create a thin iteration topology file
aeg generate-skills                     # regenerate the agent-surface skill view from aeg-root/skills/
```

`init` scaffolds the enforcement layer (`.aeg/packages`, the verify-docs workflow + script, the Issue template/CI check) and the skills alongside `aeg-root/` + `aeg-project/`, because the model docs reference all of them — a unit missing any of them references a gate that isn't there. `add-project` stores the `--path` verbatim (never derives it), refuses to overwrite an existing folder or re-register a name, and on first use promotes a single-project repo to multi-project. `generate-skills` writes the agent-specific skill view (Claude Code's `.claude/skills/`, or another agent's equivalent) from the canonical skills in `aeg-root/skills/` — so the canonical skills travel with the unit and the loadable view is rebuilt, never authored by hand. See `projects.md`. Tasks themselves are **forge Issues**, created by the Planner on the forge — not by `aeg.sh`.

---

## 1. The flow is the product; a tool is optional

AEG is the flow. A tool may *automate the orchestration slice* — collapsing the hand-offs between roles into commands — but it is not the flow, and the flow does not depend on it. Everything below runs by hand: you open your coding agent, name the role, the agent reads its role doc, checks whether it should act now (against forge state), and does the work.

**Manual mode is the teaching mode.** Companies fear AI because work happens invisibly. AEG's hand-offs make the invisible visible: each is a checkpoint where a human sees a risk automation hides — why review is separate from authorship, why the brief is frozen into the PR, why nothing merges without a human, why decisions are logged. Running it by hand once teaches the *why* of every gate.

---

## 2. The task model — Issues + forge-derived status

A **task is a forge Issue.** Its status is never written anywhere — it is **derived by querying the forge**:

| Status | Forge fact |
|--------|-----------|
| `todo` | Issue open (assigned or unassigned), no branch — all open iteration tasks are minimum `todo`; `backlog` is project-level only |
| `in-flight` | branch `task/<iteration>/<n>` exists, no PR |
| `in-review` | PR open |
| `changes-requested` | PR open, `reviewDecision: CHANGES_REQUESTED` |
| `merged` | PR merged (Issue auto-closes) |
| `blocked` | `aeg:blocked` label present |

So **no role ever writes status.** Opening the PR *is* the in-review signal; merging *is* the done signal. To see the board you query the forge (`gh pr list`, the Issues view, a project board) — you never read status from a file. The thin iteration file holds only topology (task→issue, dependency/conflict edges); see `iterations/README.md`.

---

## 3. The brief is the unit of context

1. **Context lives in the brief.** If it isn't in the brief, it doesn't exist. An agent never needs to read elsewhere to understand its task.
2. **The brief is pasted, not committed — and lands in the PR body.** You hand it to the Developer directly (all sections per the `brief-authoring` skill). When the Developer opens the PR, the brief goes into the PR description — its permanent home, attached to the work it governed, read by Reviewer and Archivist. **Never in the Issue** (it would age and attract edits). Retry reuses the same PR body.
3. **`Ticket:` and `Project:` are reference-only.** `Ticket:` is N↔M provenance (Jira/Linear) — no agent reads it, it's never a substitute for brief context. `Project:` (multi-valued) resolves against `projects.md` to route the agent to the right specs (and is what the Reviewer spec-checks against, and what the Archivist records in the provenance block); omit it in a single-project repo.

---

## 4. Every agent is self-locating

When invoked, an agent does not trust that you called it correctly. It checks two things first: **is this my phase?** (given forge state) and **is my input well-formed?** If either fails, it **refuses or redirects.** Every role has an entry gate.

**Shared state = the forge** (Issue / branch / PR / review / merge) **+ the thin iteration file** (topology). The gates read state that exists whether or not any tool runs. **The PR is the state machine:** no PR yet = not ready to review; open PR = ready to review; merged PR = ready to close out. That's what makes the gates work identically with or without a tool — and why no agent needs to write status.

---

## 4.5. The conversational protocol — how every role talks to the Principal

Self-location (§4) is *what* an agent verifies before acting. The **conversational protocol** is *how* it speaks while it works. It applies to **every conversational role** (Principal-facing Brief Author modes — Strategist, Planner, Brief Author — and the Developer, Reviewer, Security passes), so that across the whole flow the human always knows **who is speaking, what stage they're in, what just happened, and what comes next.** A governed flow that runs silently is illegible; legibility is itself a governance property (it is the same "make the invisible visible" that §1 calls the point of manual mode).

This is a **shared, model-level protocol**. Each role specializes it in its own role doc (the Planner's specialization is in `roles/planner.md` — the first written; Brief Author, Developer, and Reviewer specializations follow as each is modeled). The shared spine, which no role overrides:

1. **Announce the role on entry.** Open by naming who you are and what you're about to do. The Principal should never be unsure which role/mode they're talking to. *"I'm the Planner. I'll turn this intent into an iteration — readiness gate first, then sizing, then the topology and the Issues."*

2. **Name the stages, and always say which one you're in.** State the stages up front; at each transition, say where you are. The Principal should be able to point at any moment and know the stage. *"Readiness — running it now."* … *"Readiness passed. Moving to sizing."*

3. **Narrate the load-bearing reads and the conclusions they produce — briefly.** Say what you're reading and what it told you, when it matters to a decision. Not a transcript; the reads that change the outcome. This is what turns a black box into a visible chain of reasoning, and lets the Principal catch a wrong turn early. *"Reading `llm.ts` — structured output only exists on the Anthropic path; that changes the sizing."*

4. **Move little by little; confirm before proceeding.** Don't dump everything at once. Work in small, confirmable steps — especially during clarification. Surface one cluster, get answers, reflect them back, **then** ask to proceed. The Principal sets the pace; you check in at each seam. *"That's the scope for the read path — lock it and move on, or refine more first?"*

5. **Reflect back before you commit anything durable.** Before writing a decision, a spec change, the topology, or the Issues, play back your understanding in your own words and get a yes. This catches misunderstanding before it becomes a commit.

6. **Signal stage completion clearly — every time, and especially at the end.** When a stage finishes, say so and say what's next. At the end, close out explicitly so the Principal is never left wondering whether it's done: *"Planning complete — topology written, N Issues cut (#…), dispatch order is […]. Nothing else is needed to plan this; the next stage is dispatch, which is yours to trigger."* The single most important line in the protocol is the one that says **"this stage is finished, here is what's next, and here is whose move it is."**

7. **Be clear about durability — never let the Principal think a conclusion lives only in the chat.** Everything you commit is on the forge/repo, permanent, not in conversation memory; if the laptop or the chat vanished, the committed work remains. When you record something, say plainly that it's written and where, so "decided but revisable" is never mistaken for "unsaved."

8. **Proactive coherence status report — before any phase that touches a prior task's archival state.** Before beginning any brief-authoring or execution phase, the chat-surface role MUST proactively report the coherence status of relevant prior tasks to the Principal — not just silently gate-fail on a mismatch. The pattern is **detect-and-INFORM**, not only detect-and-refuse. Do not wait for the Principal to ask. State the status of each predicate for each in-scope prior task, then declare whether the gate passes or fails and what is owed if it fails. Example: *"Before beginning brief for task X, I must report: prior task Y — Issue #N is closed ✓, PR #M is merged to main ✓, provenance block is absent ✗. Gate fails — the Archivist must post the provenance block on PR #M before I can author this brief. Here is what is owed: [list]."* Or, when all predicates pass: *"Prior task Y gate: Issue #N closed ✓, PR #M merged ✓, provenance block present ✓ — gate passes."* This report is mandatory even when the gate passes (one line suffices) — silence is not an acceptable "all good" signal.

Keep all of this **light** — a sentence at each seam, not paragraphs. The goal is a Principal who always feels oriented, never managed. Terse remains the house style (`coordination.md`); this protocol adds **signposting, not verbosity.** A role that runs the whole flow in silence and dumps a result at the end is violating the protocol even if the result is correct — because the Principal could not see, and therefore could not govern, the steps that produced it.

---

## 5. The manual run order

| Step | Role | You hand it | It produces | Entry gate (refuses if…) |
|------|------|-------------|-------------|--------------------------|
| 0 | **Planner** (Brief Author mode) | intent + a ticket slice | an iteration: Issues + thin topology file | asked to write one brief / to implement |
| 1 | **Principal** (you) | an intent / goal | a decision to proceed, a tier | — |
| 2 | **Brief Author** (Brief Author mode) | the intent + the task's Issue | a brief, all sections | asked to write code instead of a brief |
| 3 | **Developer** | the brief | a worktree, the work, an open PR (brief in body) | input isn't a well-formed brief; a `depends-on` isn't merged; a `conflicts-with` sibling's PR is open |
| 4 | **Reviewer (code)** | "review the PR for task N" | VERDICT (APPROVE / REQUEST CHANGES) | no open PR, no brief in the PR body, or it authored the code |
| 5 | **Security** | "security-review the PR for task N" | VERDICT (PASS / FAIL) | no open PR, or no brief in the PR body |
| 6 | **Principal + Brief Author** (you) | the verdicts | merge decision (review side) | review passes not done |
| 7a | **Verification — agent half** (the Developer-agent re-runs) | the brief's §9 Test Plan | every `[agent]` item executed with the actual output posted to the PR | no open PR; no brief in the PR body; no Test Plan; or all items are `[principal]`-only |
| 7b | **Verification — Principal half** (you, in a browser) | the brief's §9 Test Plan | every `[principal]` checkbox ticked on the PR | no open PR; no brief in the PR body; no `[principal]` items in the Test Plan |
| 8 | **Principal** (you) | a PR with all Test Plan checkboxes ticked AND review verdicts clean | the merge | any Test Plan checkbox unticked, or review/security verdict unresolved |
| 9 | **Archivist** | "close out the PR for task N" | a close-out report + provenance block | **PR is not merged** |

Each agent finds the task's PR via the branch convention `task/<iteration>/<n>` and self-locates from forge state. Nobody writes status — the forge already reflects every transition. Every conversational role in this table follows the conversational protocol (§4.5): it announces itself, signposts its stage, and closes out clearly.

> **Verification is a phase, not a new actor.** Steps 7a and 7b are different halves of the **Verification phase** (`roles/developer.md` § Verification), split by who can structurally execute each test-plan item: the Developer-agent runs `[agent]` items because they don't require auth/keys/eyes-on-render; the Principal runs `[principal]` items because they do. Mirror of the chat-vs-terminal token-capture asymmetry. **Doctrine: CI green ≠ app boots ≠ feature works** — a passed review is not a green light to merge; a ticked-checkbox Test Plan is. A brief whose §4 surface is pure-logic declares `Test Plan: unit-tests-only` (a first-class allowed value) and Phase 11 is satisfied by the CI unit-test gate alone — no runtime execution needed.

### Iteration-close trigger

**When the last open task branch for an iteration is merged, the iteration enters Iteration Close** (Phase 13 in `process.md`). Detect this by querying the forge: `gh pr list --state open --json number,headRefName` filtered to branches matching `task/<iteration>/*` — if nothing returns, the iteration's last task has merged.

The Principal **initiates** iteration close explicitly (declares "we're closing this iteration" and hands off to the Planner / Brief Author). The Archivist **may detect** it automatically in future versions — when all task PRs merged and no open branches remain for the iteration. Until then, the Principal's explicit call is the gate.

See `process.md` Phase 13 for the full close-out steps: verify all tasks merged, run a brief retrospective, archive the iteration file, update state docs, ratify pending Type 1 decisions, declare what's next.

### Pre-merge gate (Step 8 prerequisite)

Before the Principal merges (Step 8), any Developer helping merge or pushing a "fix CI" commit after review must run this gate — it is the mechanical check that Verification (Steps 7a + 7b) is actually complete. If any item fails, post a comment on the PR listing exactly what's missing, and **block and report** — do not proceed with merge.

**Tool:** `gh pr view <n> --json reviews,statusCheckRollup,body`

**Check items (all three must pass):**

1. **Reviewer approved?** The JSON `reviews` array contains at least one entry with `state: APPROVED`.
2. **Test Plan `[agent]` items ticked?** The PR body's Test Plan section contains no unchecked `- [ ] **[agent]**` lines (Step 7a complete).
3. **Test Plan `[principal]` items ticked?** The PR body's Test Plan section contains no unchecked `- [ ] **[principal]**` lines (Step 7b complete).

If any fails: post a comment listing the exact items missing. The Principal decides whether to proceed.

> **At the end of every role's turn: report your tokens — you do not append your own row** to the iteration's token/cost ledger (`aeg-root/iterations/<name>.tokens.md`). No role writes its own row on a task branch: terminal roles (Developer; Archivist when automated) report exact figures from `/cost` in the PR body; chat roles (Planner, Brief Author, Reviewer, Security) report in their verdict comment or planning report, numeric cells `—` if unknown. The per-task **Archivist** collects every report and appends the rows — Phase, Role, Agent/Model, Tokens in, Tokens out, Cost, Date — post-merge at close-out; never edits a row; re-entry appends. See `iterations/README.md` §12 for the canonical format and the rationale; the file is a §13 append-only artifact.

---

## 6. Per-role entry gates (refusal language)

**Planner** — see `roles/planner.md` (split-vs-combine by verification coupling; plan-integrity gates; the conversational protocol specialization). Refuses single-brief / implement requests; refuses execution metadata in the file or Issue; refuses planning metadata on Issues; refuses to build a conflict scanner; validates every `Project:` against the registry.

**Brief Author** — requires an intent (ideally an Issue). Refuses to implement: *"I author the brief, I don't implement."* Produces a brief per the skill (tier, type, scope, stop conditions, deliverable, optional `Ticket:`/`Project:`).

**Developer**
- Requires a well-formed brief. If handed a loose prompt → *"This isn't a brief — missing tier / scope / stop-conditions. Get one from the Brief Author."*
- Checks the gates against the forge before starting: dependency's PR merged? conflicting sibling's PR closed? If not → *"Task N serializes behind <dep/sibling>; not starting."*
- If `Project:` doesn't resolve against the registry → *"Project 'x' isn't registered."*
- Worktree Step 0: `git worktree add .worktrees/task/<it>/<n> -b task/<it>/<n> origin/main && cd .worktrees/task/<it>/<n>`, do the work, open the PR.
- Done-checklist: **the brief (and `Ticket:`/`Project:` lines) is pasted into the PR body.** That's it for state — opening the PR *is* the status transition. The Developer writes no status anywhere.

**Reviewer (code)** — requires an open PR with the brief in its body. Refuses: no PR → *"Nothing to review."* No brief → *"This PR has no brief; I can't judge scope against intent."* Authored it → *"I can't review my own work."* Checks brief-conformance **and** spec-conformance (the `Project:` spec in the unit's `specs/`). Produces APPROVE | REQUEST CHANGES (per `roles/reviewer.md`).

**Security** — same gate as Reviewer; produces PASS | FAIL (per `roles/security.md`).

**Verification** (the phase, two halves, `roles/developer.md` § Verification)
- Requires an open PR with the brief in its body AND a §9 Test Plan in that brief. Refuses if either is missing — *"This PR has no Test Plan; without one I cannot judge what 'verified' means. Flag the brief malformed (`needs:brief-correction`)."*
- **Agent half:** the Developer-agent boots the relevant dev server(s) from the PR's branch, runs each `[agent]` item in the Test Plan, and posts the actual command output as evidence on the PR (paraphrase is not evidence). Re-runs after a fix append a new comment; they do not edit the previous one.
- **Principal half:** the Principal runs each `[principal]` item in a real signed-in browser and ticks the checkbox on the PR. The agent does not tick `[principal]` boxes; the Principal does not tick `[agent]` boxes — the asymmetry is the gate's whole shape.
- `Test Plan: unit-tests-only` (a first-class allowed value, for pure-logic briefs with no runtime surface in §4) satisfies the phase by the CI unit-test gate alone.
- Produces ticked checkboxes on the PR and the evidence comments alongside them; writes no status anywhere.

**Archivist** (close-out)
- Requires a **merged** PR. Refuses: not merged → *"Nothing to close out; merge first."*
- Confirms: Issue closed (the merge auto-closes it if linked), docs updated, per-project pinned state Issue updated for every project the task listed. Sets the iteration's `Lifecycle: complete` marker and moves the file to `iterations/completed/` when every task is merged (`iterations/README.md` §11). (`now.md` no longer exists.)
- Assembles the **provenance block** from frozen facts (brief, PR reviews, merge metadata) and posts it to the merged PR (append-only, never a status field) — see `roles/archivist.md`.
- Flags — does not perform — orphaned branches (branch with no/stale PR) and local worktree removal as cleanup candidates for the human. Writes no status (the merge already is the status).
- Produces a close-out report listing anything dangling.

*(The Archivist is non-conversational automation; the conversational protocol §4.5 binds the human-facing roles. When the Archivist is run by hand as a conversational pass, it signposts like the rest.)*

---

## 7. What an automation layer adds (and doesn't change)

A tool can automate the steps 2→6 hand-offs: spawn the Developer in a fresh worktree from a brief, stream its work, unblock escalations, and enforce the dependency/conflict gates in code at dispatch. It does **not** change the gates, roles, brief rules, iteration model, task-as-Issue model, or order. If the tool is unavailable, you run the same flow by hand against the forge. The flow is primary; the tool is convenience — and AEG never names it.

---

## 8. Observe mode — the read-only adoption tier

A team will not bet a production repo on a new governance model on day one. So AEG has a lowest-commitment entry: **observe mode** — run the whole flow read-only over a team's *existing* process, enforcing nothing, changing nothing.

In observe mode:
- The team keeps its existing workflow untouched — its Jira/Linear, its branching, its PR habits. AEG sits *beside* it, not in front of it.
- The roles run in **advisory** posture: the Reviewer and Security passes produce their verdicts, the Planner can map existing work into an iteration's topology, the Archivist can assemble provenance — but **none of it blocks a merge.** A finding is a comment, not a gate.
- **Status is still derived** from the forge (read-only) — the board (`gh pr list`, the future AEG UI) renders what's already happening. AEG writes nothing.
- `verify-docs` and the dispatch gates run in **report-only** mode (surfacing what *would* fail), not blocking.

The value in observe mode is exactly the thing companies are afraid of losing: **visibility without disruption.** The team sees what AEG *would* say — which PRs lack a brief, which changes drift from the spec, which tasks would collide — while nothing is taken away from them. This is the "start with monitoring, not restriction" on-ramp.

From there, adoption **tightens one gate at a time**, along the advisory → enforced gradient already in `state-machine.md` §12: turn on `verify-docs` as blocking, then require the brief-in-PR, then enforce the dispatch gates. Each step is a deliberate decision, not a big-bang switch. Observe mode is the floor; full AEG is the ceiling; a team climbs at its own pace.

A team can sit in observe mode indefinitely and still get the audit-by-construction provenance — which, for a regulated team, may itself be the whole reason to adopt.

---

For the iteration / task / conflict model, see `iterations/README.md`. For the Planner's gates and conversational protocol, see `roles/planner.md`. For authority, tiers, and the advisory→enforced gradient, see `state-machine.md`. For the registry, see `projects.md`. For provenance, see `roles/archivist.md`.
