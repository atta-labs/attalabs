# Iterations — the top of AEG

**Status:** draft (pending Principal ratification — Type 1)

The **iteration** is the highest-level artifact in Atta Agentic Execution Governance. AEG starts here and goes down. There is nothing above it inside AEG.

This is a deliberate boundary. AEG is the **execution** layer — it governs how work becomes merged, reviewed, coherent code, run by humans wielding agents. It is **not** a product-planning tool.

---

## 1. AEG owns iterations, not roadmaps

The product roadmap — what to build, why, in what priority — belongs to the company and lives in the company's tool (Jira, Linear, a doc they own). **AEG never holds it.** The moment AEG stores a roadmap it competes with Jira, loses, and creates a second rotting source of truth for "what should we build."

What AEG holds is the **iteration**: the bounded set of tasks currently being turned into merged code. The link from roadmap → iteration is a **human** — the Team Leader translating tickets into agent-shaped tasks. There is no file for that link, because the link is a person's judgment.

```
Company roadmap / Jira      ← NOT in AEG. The company's tool. The human reads it.
        │  (human translation — Team Leader / Planner)
        ▼
Iteration                   ← TOP of AEG. A bounded set of tasks. Committed.
   ├─ Task = brief (just-in-time) + Ticket link(s) + edges (depends-on / conflicts-with)
   ├─ Task
   └─ …
        │
        ▼
Per task: Developer → Reviewer → Security → merge → Archivist
```

**Note on `roadmap.md`:** the existing `project-management/roadmap.md` is, in a solo context, really *the current iteration* — it only looks like a product roadmap because one person holds product and execution at once. In a company context those separate: the roadmap is the company's (outside AEG), and AEG keeps only the iteration. A product-roadmap document *may* exist as a reference the human reads — but like the `Ticket:` link, it is pointed-to, never operated on by the flow.

---

## 2. Ticket linking is N↔M and reference-only

One Jira ticket may become many tasks; many tickets may collapse into one task. The mapping is the human's judgment — no tool can do it, because turning a ticket into agent-shaped work is the translation that *is* the Team Leader's job.

So a task's `Ticket:` field is a many-to-many, reference-only provenance link. No agent reads the ticket, needs access to it, or is blocked by it. It exists so a merged change traces back to the company's world.

---

## 3. The Planner

The **Planner** is a mode of the Team Leader — the same intelligence as Brief Author, one altitude up. Brief Author goes intent → one brief. Planner goes intent + a slice of tickets → a whole iteration of sibling-aware tasks.

The Planner's job, and the reason the iteration exists, is the thing a brief-in-isolation cannot see: **the relationships between tasks.** It does three things:

1. **Decompose** the ticket slice into discrete, agent-sized tasks.
2. **Order** them — declare `depends-on` edges (task B assumes task A is merged).
3. **Flag collisions** — declare `conflicts-with` edges (two tasks touch the same module/contract and must not run concurrently).

Conflict and dependency edges are **declared, not inferred**, in v1. The Planner (with the human) reasons from the tasks' stated scope and records the call — "these two both touch auth, serialize them." Automatic file-overlap detection is a later luxury; the pilot does not depend on it.

The Planner's output is exactly one artifact: the iteration file below. It writes no briefs — those are authored just-in-time when each task is picked up.

---

## 4. Where briefs live

A task's brief has two homes across its life:

- **Before dispatch — nowhere persistent.** The brief doesn't exist yet. It is written (by the human + Brief Author) at the moment the task is picked up, iteration-aware (it can see its siblings and edges). Pasted, not committed.
- **At dispatch onward — the PR body.** When the Developer opens the task's PR, the brief text lands in the PR description and stays there. The PR body is the brief's permanent home.

The iteration's `PR` column is the link: empty = brief not written yet (`todo`); `#89` = brief now lives in PR #89's body. Map → row → PR → brief.

This is why the iteration file stays thin (Section 5): it is the coordination map, not the brief store.

---

## 5. The iteration file

One file per iteration at `project-management/iterations/<name>.md`. It is a scannable coordination map — the week's standup board and conflict graph in one. Template:

```
# Iteration: <short name> — <timeframe>

Goal (execution, not product-why): <what ships, end to end>
Repo: <repo>   ·   Team Leader: <name>

## Tasks
| # | Task                         | Ticket(s) | Depends-on | Conflicts-with | Owner  | Status     | PR  |
|---|------------------------------|-----------|------------|----------------|--------|------------|-----|
| 1 | Ground-station auth endpoint | SAT-412   | —          | 3              | Dani   | merged     | #88 |
| 2 | Profile schema migration     | SAT-419   | —          | —              | junior | in-review  | #89 |
| 3 | Auth UI                      | SAT-412   | 1          | 1              | junior | todo       | —   |
| 4 | Rate-limit middleware        | SAT-431   | —          | —              | Dani   | in-flight  | #90 |

## Status legend
todo → in-flight (agent dispatched) → in-review (PR open) → merged.
blocked = waiting on a dependency or an answer.

## Dispatch rules (enforced)
- Do not start a task whose depends-on is not yet merged.
- Do not start a task while a conflicts-with sibling has an open PR — wait, or rebase after it merges.
- One owner per task at a time.

## Done
The iteration closes when every task is merged or explicitly moved to the next iteration.
```

**What is deliberately absent** is the point: no priority, no estimates, no story points, no "why." Those are the company's, in Jira. The iteration carries only what is needed to schedule execution safely — dependencies, conflicts, owner, status. That absence is what keeps AEG out of "Jira again."

---

## 6. The multi-developer safety mechanism

The `Dispatch rules` block is what makes two or more developers safe. With a single principal, the rules live in one head. With a team, they must be a **lock**, not a whiteboard:

- **depends-on gate** — a task cannot start until its dependency has merged.
- **conflicts-with gate** — a task cannot start while a colliding sibling has an open PR.

In manual mode these are preconditions the Developer checks before beginning (read the iteration file + open-PR status). In Cetana they become automatic at `dispatch`. Either way: the conflict is declared at planning time and enforced at dispatch time — never discovered at merge time, which is too late.

---

## 7. One-line pitch this enables

> AEG does not plan your product. It governs how your product gets executed by agents — safely, coherently, and coordinated across a team.

For the manual run mechanics and per-role entry gates, see `aeg-manual-flow.md`. For the authority model and tiers, see `state-machine.md`.
