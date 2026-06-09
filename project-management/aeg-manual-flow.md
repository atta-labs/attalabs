# AEG — Running the Flow by Hand

**Atta Agentic Execution Governance (AEG)**, manual mode. The playbook for running the flow with nothing but Claude Code, a Git forge, and this repo — no orchestration tool required.

Companion to `process.md` (the eleven-phase walkthrough), `state-machine.md` (the constitution), `iterations/README.md` (the iteration + task model), and the `roles/` docs. This file is the operator's guide: what a human does, in what order, calling which agent, with what in hand.

> **AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub) the way it depends on git — the forge is its source of truth for execution state. It does **not** depend on any orchestration tool (e.g. Cetana); a human or a thin dispatch script invokes roles. Knowledge flows one way: a tool may know AEG; AEG does not know the tool.

---

## 0. Starting and maintaining an AEG repo (`aeg.sh`)

AEG "init" is not software — it is a **state the repo is in**. A repo is running AEG when: (1) the `project-management/` scaffold exists (`state-machine.md`, `coordination.md`, `process.md`, `aeg-manual-flow.md`, `roles/`, `iterations/README.md`; plus `products.md` only once multi-product); (2) at least one iteration file exists; (3) the role docs are reachable.

You can create that by hand, or use **`aeg.sh`** — one self-contained, downloadable shell script (from the AEG site). It is a **dumb scaffolder**: it writes files, nothing else. It does not dispatch agents, query the forge, or reason — that's a tool's or a human's job. Self-contained (scaffold embedded, no network) so you can read every byte first. Three subcommands:

```
aeg init [folder]                       # scaffold the repo (once)
aeg add-product <name> --path <folder>  # register a product (creates/appends products.md + stubs)
aeg new-iteration <name>                # create a thin iteration topology file
```

`add-product` stores the `--path` verbatim (never derives it), refuses to overwrite an existing folder or re-register a name, and on first use promotes a single-product repo to multi-product (registering both the existing and the new product). See `products.md`. Tasks themselves are **GitHub Issues**, created by the Planner on the forge — not by `aeg.sh`.

---

## 1. The flow is the product; a tool is optional

AEG is the flow. A tool may *automate the orchestration slice* — collapsing the hand-offs between roles into commands — but it is not the flow, and the flow does not depend on it. Everything below runs by hand: you open Claude Code, name the role, the agent reads its role doc, checks whether it should act now (against forge state), and does the work.

**Manual mode is the teaching mode.** Companies fear AI because work happens invisibly. AEG's hand-offs make the invisible visible: each is a checkpoint where a human sees a risk automation hides — why review is separate from authorship, why the brief is frozen into the PR, why nothing merges without a human, why decisions are logged. Running it by hand once teaches the *why* of every gate.

---

## 2. The task model — Issues + forge-derived status

A **task is a GitHub Issue.** Its status is never written anywhere — it is **derived by querying the forge**:

| Status | Forge fact |
|--------|-----------|
| `backlog` | Issue open, unassigned |
| `todo` | Issue open, assigned, no branch |
| `in-flight` | branch `task/<iteration>/<n>` exists, no PR |
| `in-review` | PR open |
| `changes-requested` | PR open, `reviewDecision: CHANGES_REQUESTED` |
| `merged` | PR merged (Issue auto-closes) |
| `blocked` | `aeg:blocked` label present |

So **no role ever writes status.** Opening the PR *is* the in-review signal; merging *is* the done signal. To see the board you query the forge (`gh pr list`, the Issues view, a Project) — you never read status from a file. The thin iteration file holds only topology (task→issue, dependency/conflict edges); see `iterations/README.md`.

---

## 3. The brief is the unit of context

1. **Context lives in the brief.** If it isn't in the brief, it doesn't exist. An agent never needs to read elsewhere to understand its task.
2. **The brief is pasted, not committed — and lands in the PR body.** You hand it to the Developer directly (all sections per `.claude/skills/brief-authoring/SKILL.md`). When the Developer opens the PR, the brief goes into the PR description — its permanent home, attached to the work it governed, read by Reviewer and Archivist. **Never in the Issue** (it would age and attract edits). Retry reuses the same PR body.
3. **`Ticket:` and `Product:` are reference-only.** `Ticket:` is N↔M provenance (Jira/Linear) — no agent reads it, it's never a substitute for brief context. `Product:` (multi-valued) resolves against `products.md` to route the agent to the right specs (and is what the Reviewer spec-checks against, and what the Archivist records in the provenance block); omit it in a single-product repo.

---

## 4. Every agent is self-locating

When invoked, an agent does not trust that you called it correctly. It checks two things first: **is this my phase?** (given forge state) and **is my input well-formed?** If either fails, it **refuses or redirects.** Every role has an entry gate.

**Shared state = the forge** (Issue / branch / PR / review / merge) **+ the thin iteration file** (topology). The gates read state that exists whether or not any tool runs. **The PR is the state machine:** no PR yet = not ready to review; open PR = ready to review; merged PR = ready to close out. That's what makes the gates work identically with or without a tool — and why no agent needs to write status.

---

## 5. The manual run order

| Step | Role | You hand it | It produces | Entry gate (refuses if…) |
|------|------|-------------|-------------|--------------------------|
| 0 | **Planner** (TL mode) | intent + a ticket slice | an iteration: Issues + thin topology file | asked to write one brief / to implement |
| 1 | **Principal** (you) | an intent / goal | a decision to proceed, a tier | — |
| 2 | **Brief Author** (TL mode) | the intent + the task's Issue | a brief, all sections | asked to write code instead of a brief |
| 3 | **Developer** | the brief | a worktree, the work, an open PR (brief in body) | input isn't a well-formed brief; a `depends-on` isn't merged; a `conflicts-with` sibling's PR is open |
| 4 | **Reviewer (code)** | "review the PR for task N" | VERDICT (APPROVE / REQUEST CHANGES) | no open PR, no brief in the PR body, or it authored the code |
| 5 | **Security** | "security-review the PR for task N" | VERDICT (PASS / FAIL) | no open PR, or no brief in the PR body |
| 6 | **Principal + TL** (you) | the verdicts | merge decision | review passes not done |
| 7 | **Archivist** | "close out the PR for task N" | a close-out report + provenance block | **PR is not merged** |

Each agent finds the task's PR via the branch convention `task/<iteration>/<n>` and self-locates from forge state. Nobody writes status — the forge already reflects every transition.

---

## 6. Per-role entry gates (refusal language)

**Planner** — see `roles/planner.md` (split-vs-combine by verification coupling; plan-integrity gates). Refuses single-brief / implement requests; refuses execution metadata in the file or Issue; refuses planning metadata on Issues; refuses to build a conflict scanner; validates every `Product:` against the registry.

**Brief Author** — requires an intent (ideally an Issue). Refuses to implement: *"I author the brief, I don't implement."* Produces a brief per the skill (tier, type, scope, stop conditions, deliverable, optional `Ticket:`/`Product:`).

**Developer**
- Requires a well-formed brief. If handed a loose prompt → *"This isn't a brief — missing tier / scope / stop-conditions. Get one from the Brief Author."*
- Checks the gates against the forge before starting: dependency's PR merged? conflicting sibling's PR closed? If not → *"Task N serializes behind <dep/sibling>; not starting."*
- If `Product:` doesn't resolve against the registry → *"Product 'x' isn't registered."*
- Worktree Step 0: `git worktree add .worktrees/task/<it>/<n> -b task/<it>/<n> origin/main && cd .worktrees/task/<it>/<n>`, do the work, open the PR.
- Done-checklist: **the brief (and `Ticket:`/`Product:` lines) is pasted into the PR body.** That's it for state — opening the PR *is* the status transition. The Developer writes no status anywhere.

**Reviewer (code)** — requires an open PR with the brief in its body. Refuses: no PR → *"Nothing to review."* No brief → *"This PR has no brief; I can't judge scope against intent."* Authored it → *"I can't review my own work."* Checks brief-conformance **and** spec-conformance (the `Product:` spec in `apps/*/specs/`). Produces APPROVE | REQUEST CHANGES (per `roles/reviewer.md`).

**Security** — same gate as Reviewer; produces PASS | FAIL (per `roles/security.md`).

**Archivist** (close-out)
- Requires a **merged** PR. Refuses: not merged → *"Nothing to close out; merge first."*
- Confirms: Issue closed (the merge auto-closes it if linked), decision logged if Tier 3, changelog appended, docs updated, per-product `state.md`/`now.md` updated for every product the task listed.
- Assembles the **provenance block** from frozen facts (brief, PR reviews, decision log, merge metadata) and posts it to the merged PR (append-only, never a status field) — see `roles/archivist.md`.
- Flags — does not perform — orphaned branches (branch with no/stale PR) and local worktree removal as cleanup candidates for the human. Writes no status (the merge already is the status).
- Produces a close-out report listing anything dangling.

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

For the iteration / task / conflict model, see `iterations/README.md`. For the Planner's gates, see `roles/planner.md`. For authority, tiers, and the advisory→enforced gradient, see `state-machine.md`. For the registry, see `products.md`. For provenance, see `roles/archivist.md`.
