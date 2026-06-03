# Iterations — the top of AEG

**Status:** draft (pending Principal ratification — Type 1)

The **iteration** is the highest-level artifact in Atta Agentic Execution Governance. AEG starts here and goes down. There is nothing above it inside AEG.

This is a deliberate boundary. AEG is the **execution** layer — it governs how work becomes merged, reviewed, coherent code, run by humans wielding agents. It is **not** a product-planning tool.

---

## 1. AEG owns iterations, not roadmaps

The product roadmap — what to build, why, in what priority — belongs to the company and lives in the company's tool (Jira, Linear, a doc they own). **AEG never holds it.** The moment AEG stores a roadmap it competes with Jira, loses, and creates a second rotting source of truth for "what should we build."

What AEG holds is the **iteration**: the bounded set of tasks currently being turned into merged code. The link from roadmap → iteration is a **human** — the Team Leader translating tickets into agent-shaped tasks. There is no file for that link, because the link is a person's judgment.

```
Company roadmap / Jira / product backlog   ← NOT in AEG. Reference only. The human reads it.
        │  (human translation — Team Leader / Planner)
        ▼
Iteration                                   ← TOP of AEG. A bounded set of tasks. Committed.
   ├─ Task = brief (just-in-time) + Product + Ticket link(s) + edges (depends-on / conflicts-with)
   ├─ Task
   └─ …
        │
        ▼
Per task: Developer → Reviewer → Security → merge → Archivist
```

**The product backlog lives OUT of the flow, per product.** Held / future / vision items are not AEG's. They live where each product's documentation already lives — `apps/<product>/specs/<product>-backlog.md` — plus `docs/ecosystem-backlog.md` for cross-cutting / ecosystem / AEG-itself work. These are reference docs the Planner reads when choosing the next slice; the flow never operates on them. (A company using AEG would have real Jira here instead.) This is distinct from the **iteration backlog** (Section 5), which is *inside* a specific iteration.

**`roadmap.md` is retired.** Its executable slice became the first iteration; its held/vision content moved to the per-product backlogs above. The old file is deleted — git history preserves it.

---

## 2. A task's reference fields: `Product` and `Ticket`

Two optional, reference-only fields qualify a task. Neither is read as instruction; both are provenance and routing.

- **`Product`** — which product the task belongs to (`cetana`, `vada`, `herald`, …). In a multi-product monorepo it is effectively required; in a single-product repo every task shares one product, so it is omitted. It does three jobs: (1) the Developer self-locates the right product specs (`apps/<product>/specs/`); (2) the conflict gate gets a cheap first-pass filter — tasks in different products rarely collide; (3) the Archivist knows which per-product `state.md` / `now.md` to update at close-out.
- **`Ticket`** — N↔M, reference-only link to an external ticket (Jira/Linear). One ticket may become many tasks; many tickets may collapse into one. The human owns the translation. No agent reads the ticket, needs access to it, or is blocked by it.

Per-product PM (`apps/<product>/project-management/state.md` + `now.md`) still exists as per-product *status*. The iteration is the cross-product *coordination* layer above it; `Product` is the link between a task and its product's specs + PM.

---

## 3. The Planner

The **Planner** is a mode of the Team Leader — the same intelligence as Brief Author, one altitude up. Brief Author goes intent → one brief. Planner goes intent + a slice of tickets → a whole iteration of sibling-aware tasks.

The Planner's job, and the reason the iteration exists, is the thing a brief-in-isolation cannot see: **the relationships between tasks.** It does three things:

1. **Decompose** the ticket slice into discrete, agent-sized tasks.
2. **Order** them — declare `depends-on` edges (task B assumes task A is merged).
3. **Flag collisions** — declare `conflicts-with` edges (two tasks touch the same module/contract and must not run concurrently).

Conflict and dependency edges are **declared, not inferred**, in v1. The Planner (with the human) reasons from the tasks' stated scope and records the call — "these two both touch auth, serialize them." Automatic file-overlap detection is a later luxury; the pilot does not depend on it.

The Planner also owns the **iteration backlog**: it places tasks that belong to the cycle but aren't dispatch-ready yet, and promotes them (`backlog → todo`) when they are. The Planner's output is exactly one artifact: the iteration file below. It writes no briefs — those are authored just-in-time when each task is picked up.

---

## 4. Where briefs live

A task's brief has two homes across its life:

- **Before dispatch — nowhere persistent.** The brief doesn't exist yet. It is written (by the human + Brief Author) at the moment the task is picked up, iteration-aware (it can see its siblings and edges). Pasted, not committed.
- **At dispatch onward — the PR body.** When the Developer opens the task's PR, the brief text lands in the PR description and stays there. The PR body is the brief's permanent home.

The iteration's `PR` column is the link: empty = brief not written yet; `#89` = brief now lives in PR #89's body. Map → row → PR → brief.

This is why the iteration file stays thin (Section 5): it is the coordination map, not the brief store.

---

## 5. The iteration file

One file per iteration at `project-management/iterations/<name>.md`. It is a scannable coordination map — the cycle's standup board and conflict graph in one. It has two task lanes: the dispatchable **Tasks** table and the **Backlog** (this cycle, not yet ready). Template:

```
# Iteration: <short name> — <timeframe>

Goal (execution, not product-why): <what ships, end to end>
Repo: <repo>   ·   Team Leader: <name>

## Tasks (scoped, dispatchable)
| # | Task                         | Product | Ticket | Depends-on | Conflicts-with | Owner  | Status     | PR  |
|---|------------------------------|---------|--------|------------|----------------|--------|------------|-----|
| 1 | Ground-station auth endpoint | api     | SAT-412| —          | 3              | Dani   | merged     | #88 |
| 2 | Profile schema migration     | api     | SAT-419| —          | —              | junior | in-review  | #89 |
| 3 | Auth UI                      | web     | SAT-412| 1          | 1              | junior | todo       | —   |

## Backlog (this iteration, not yet ready to dispatch)
- Rate-limit middleware (api, SAT-431) — waiting to see how auth (task 1) lands first.
- CV viewer split (web) — needs a design call from Dani before scoping.

## Status legend
backlog → todo → in-flight → in-review → merged.   blocked = off to the side.

## Dispatch rules (the multi-developer lock)
- Do not start a task whose depends-on is not yet merged.
- Do not start a task while a conflicts-with sibling is in-flight or in-review.
- One owner per task at a time.

## Done
The iteration closes when every Task is merged or explicitly moved to the next iteration.
```

**What is deliberately absent** is the point: no priority, no estimates, no story points, no "why." Those are the company's, in Jira / the product backlog. The iteration carries only what is needed to schedule execution safely — product, dependencies, conflicts, owner, status. That absence is what keeps AEG out of "Jira again."

---

## 6. Task state — the coordination spine

The `Status` column is load-bearing: the dispatch gates (Section 7) **read** it to decide what is safe to start. If status is stale or wrong, the gates lie and developers collide anyway. So state is specified precisely: a fixed set of values, and one rule for who writes them.

### The six states

| State | Meaning | What it gates |
|-------|---------|---------------|
| `backlog` | Committed to this iteration but not dispatch-ready — not scoped, or waiting on how earlier tasks land. No brief, no owner yet. | Cannot be dispatched until the Planner promotes it to `todo`. |
| `todo` | Scoped and dispatch-ready. No brief written yet. | A `depends-on` is satisfied only when the dependency is `merged`. |
| `in-flight` | An agent is working it. Brief written, work underway, no PR yet. | A `conflicts-with` sibling being `in-flight` or `in-review` blocks a colliding task. |
| `in-review` | PR is open. Brief lives in the PR body. Awaiting review passes + merge. | Same conflict gate as `in-flight`. |
| `merged` | PR merged. Task done. | Unblocks tasks that `depends-on` it; clears the conflict for colliding siblings. |
| `blocked` | Off to the side — waiting on a dependency, a conflict to clear, or an escalation answer. | Cannot be dispatched until the blocker resolves. |

Six values, no more. Extra states mean extra bookkeeping, and bookkeeping rots.

### Who writes the state — the ownership rule

**The agent that ends an action writes the task's row before it stops — as part of its done-checklist, never as a separate manual chore.** State is a side-effect of doing the work. (Manual, after-the-fact status updates are exactly what go stale and make the gates lie.)

| Transition | Written by | When |
|-----------|-----------|------|
| `backlog → todo` | the **Planner** | when the task is scoped and its dependencies allow it |
| `todo → in-flight` | whoever dispatches (the human, or Cetana at `dispatch`) | at start |
| `in-flight → in-review` | the **Developer** | when it opens the PR — same write that fills the `PR` column |
| `in-review → merged` | the **Archivist** | at close-out — same step that confirms the merge |
| `→ blocked` | the **Developer** | when it escalates (manual escalation / `cetana_request_input`) |
| `blocked → in-flight` | whoever supplies the unblocking answer | when the escalation is resolved |

### Read to self-locate, write to hand off

This closes the self-locating loop from `aeg-manual-flow.md`. Every role uses the status column in both directions:

- **Read it to know if it is your turn.** The Reviewer checks: is this task `in-review`? If it is still `todo`, there is nothing to review — refuse. The Archivist checks: is the PR `merged`? If `in-review`, it is not done — refuse.
- **Write it when you finish, to hand off.** The Developer flips `in-flight → in-review` so the Reviewer knows it may act. The Archivist flips `→ merged` so dependents unblock.

Same file, both directions. That is the coordination spine of the whole model: status is how roles hand work to each other without a human relaying it.

### Per-role done-checklist additions

- **Planner** owns `backlog → todo` (scoping/promotion).
- **Developer** done-checklist gains: *set my task's row to `in-review` and fill the `PR` column* (alongside "brief in PR body").
- **Archivist** close-out gains: *flip the task's row to `merged`* (alongside confirming merge, branch deletion, docs/changelog).
- **Dispatcher** (human or Cetana) sets `todo → in-flight` at start.

---

## 7. The multi-developer safety mechanism

The `Dispatch rules` block is what makes two or more developers safe. With a single principal, the rules live in one head. With a team, they must be a **lock**, not a whiteboard:

- **depends-on gate** — a task cannot start until its dependency is `merged`.
- **conflicts-with gate** — a task cannot start while a colliding sibling is `in-flight` or `in-review` (i.e. has an open PR or active agent). `Product` is the first-pass filter: tasks in different products rarely collide.

In manual mode these are preconditions the Developer checks before beginning (read the iteration file's status column + open-PR status). In Cetana they become automatic at `dispatch`. Either way: the conflict is declared at planning time and enforced at dispatch time — never discovered at merge time, which is too late.

**v1 honesty:** in manual mode the gates are *trusted, not enforced* — an agent reads them and is expected to comply, but nothing mechanically stops a human from ignoring them. That is acceptable for a small, watched team (the Sateliot pilot). Mechanical enforcement arrives when Cetana enforces the gates in code at `dispatch`. Until then: trusted discipline.

---

## 8. One-line pitch this enables

> AEG does not plan your product. It governs how your product gets executed by agents — safely, coherently, and coordinated across a team.

For the manual run mechanics and per-role entry gates, see `aeg-manual-flow.md`. For the authority model and tiers, see `state-machine.md`. For the first live iteration, see `iterations/cetana-cli-ladder.md`.
