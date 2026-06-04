# Iterations — the top of AEG

**Status:** draft (pending Principal ratification — Type 1)

The **iteration** is the highest-level artifact in Atta Agentic Execution Governance. AEG starts here and goes down. There is nothing above it inside AEG.

This is a deliberate boundary. AEG is the **execution** layer — it governs how work becomes merged, reviewed, coherent code, run by humans wielding agents. It is **not** a product-planning tool.

> **AEG knows no tool.** This model describes the flow in tool-neutral terms — "the dispatcher," "an automation layer," "at dispatch time." A tool may *automate* parts of AEG, but AEG never depends on, or names, any tool. Knowledge flows one way: a tool may know AEG; AEG does not know the tool. (Same rule as the company roadmap: AEG is pointed at, it never points out.)

---

## 1. AEG owns iterations, not roadmaps

The product roadmap — what to build, why, in what priority — belongs to the company and lives in the company's tool (Jira, Linear, a doc they own). **AEG never holds it.** The moment AEG stores a roadmap it competes with Jira, loses, and creates a second rotting source of truth for "what should we build."

What AEG holds is the **iteration**: the bounded set of tasks currently being turned into merged code. The link from roadmap → iteration is a **human** — the Team Leader translating tickets into agent-shaped tasks. There is no file for that link, because the link is a person's judgment.

```
Company roadmap / Jira / product backlog   ← NOT in AEG. Reference only. The human reads it.
        │  (human translation — Team Leader / Planner)
        ▼
Iteration                                   ← TOP of AEG. A bounded set of tasks. Committed.
   ├─ Task = brief (just-in-time) + Product(s) + Ticket link(s) + edges (depends-on / conflicts-with)
   ├─ Task
   └─ …
        │
        ▼
Per task: Developer → Reviewer → Security → merge → Archivist
```

**The product backlog lives OUT of the flow, per product.** Held / future / vision items are not AEG's. They live where each product's documentation already lives — `apps/<product>/specs/<product>-backlog.md` — plus `docs/ecosystem-backlog.md` for cross-cutting / ecosystem / AEG-itself work. These are reference docs the Planner reads when choosing the next slice; the flow never operates on them. This is distinct from the **iteration backlog** (Section 5), which is *inside* a specific iteration.

**`roadmap.md` is retired.** Its executable slice became the first iteration; its held/vision content moved to the per-product backlogs above. The old file is deleted — git history preserves it.

---

## 2. A task's reference fields: `Product` and `Ticket`

Two reference-only fields qualify a task. Neither is read as instruction; both are provenance and routing.

- **`Product`** — which product(s) the task belongs to. **Multi-valued and normal:** a task carries as many products as it genuinely touches — usually one (`Product: vada`), sometimes several (`Product: engine, herald`). It resolves against the **product registry**, `project-management/products.md`. The registry's *presence* signals a multi-product repo, where `Product` is required; a single-product repo has **no** `products.md` and omits the field. When present, `Product` does three jobs, fanning out across *every* listed product: (1) the Developer self-locates each product's specs; (2) the conflict gate filters by package (a product may span packages, a package may be shared across products — see §7); (3) the Archivist updates each product's `state.md`/`now.md` at close-out. Review also fans out — a multi-product PR is reviewed through each product's lens. See `products.md` for the full treatment.
- **`Ticket`** — N↔M, reference-only link to an external ticket (Jira/Linear). One ticket may become many tasks; many tickets may collapse into one. The human owns the translation. No agent reads the ticket, needs access to it, or is blocked by it.

Per-product PM (`apps/<product>/project-management/state.md` + `now.md`) still exists as per-product *status*. The iteration is the cross-product *coordination* layer above it; `Product` is the link between a task and its product(s)' specs + PM.

---

## 3. The Planner

The **Planner** is a mode of the Team Leader — the same intelligence as Brief Author, one altitude up. Brief Author goes intent → one brief. Planner goes intent + a slice of tickets → a whole iteration of sibling-aware tasks.

The Planner's job, and the reason the iteration exists, is the thing a brief-in-isolation cannot see: **the relationships between tasks.** It does three things:

1. **Decompose** the ticket slice into discrete, agent-sized tasks.
2. **Order** them — declare `depends-on` edges (task B assumes task A is merged).
3. **Flag collisions** — declare `conflicts-with` edges (two tasks touch the same package/module and must not run concurrently).

### Split vs. combine — the verification-coupling test

A single intent often crosses products (e.g. "refactor the shared engine to support more products, then migrate Herald onto it"). The Planner's signature judgment is whether that becomes *one* task or *several* — and the test is **verification coupling**, not product boundaries:

- **Independently verifiable → split.** If each piece can be proven correct on its own, make separate single-product tasks with a `depends-on` edge. (Auth endpoint, then the UI that calls it — the endpoint is testable alone.)
- **Verification-coupled → combine.** If the change can only be *tested* as a unit, it is **one task, one branch, one PR, multiple products.** The canonical case: generalizing `@atta/engine` *and* migrating Herald onto it belong together, because the only proof the engine refactor is correct is Herald working against it. Splitting would merge an unproven abstraction. A cross-product PR touching two, three, four products is a normal, expected shape — not an exception.

Same `Ticket:` rides on all the resulting tasks, so the work stays atomic in Jira (one ticket) however it's shaped in AEG (one task or several). That translation — one intent → the right number of verifiable tasks, carrying the right products — is the Planner's core value; a per-task agent could never make this call.

Conflict and dependency edges are **declared, not inferred**, in v1. The Planner (with the human) reasons from the tasks' stated scope and records the call. Automatic file-overlap detection is a later luxury; the pilot does not depend on it.

The Planner also owns the **iteration backlog**: it places tasks that belong to the cycle but aren't dispatch-ready yet, and promotes them (`backlog → todo`) when they are. The Planner's output is exactly one artifact: the iteration file below. It writes no briefs — those are authored just-in-time when each task is picked up. It validates every `Product:` against the registry and refuses to invent an unregistered product.

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
| # | Task                         | Product      | Ticket | Depends-on | Conflicts-with | Owner  | Status     | PR  |
|---|------------------------------|--------------|--------|------------|----------------|--------|------------|-----|
| 1 | Generalize engine + migrate  | engine,herald| SAT-412| —          | 3              | Dani   | in-review  | #88 |
| 2 | Profile schema migration     | herald       | SAT-419| —          | —              | junior | todo       | —   |
| 3 | Vāda flow tweak (touches engine) | vada     | SAT-420| —          | 1              | junior | blocked    | —   |

## Backlog (this iteration, not yet ready to dispatch)
- Rate-limit middleware (herald, SAT-431) — waiting to see how task 1 lands first.

## Status legend
backlog → todo → in-flight → in-review → merged.   blocked = off to the side.

## Dispatch rules (the multi-developer lock)
- Do not start a task whose depends-on is not yet merged.
- Do not start a task while a conflicts-with sibling is in-flight or in-review.
- One owner per task at a time.

## Done
The iteration closes when every Task is merged or explicitly moved to the next iteration.
```

(Note task 3: a Vāda task conflicts with task 1 even though they're different products — because both touch the `@atta/engine` package. Conflicts are package-level, §7.)

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
| `todo → in-flight` | whoever dispatches (the human, or the dispatch tool) | at start |
| `in-flight → in-review` | the **Developer** | when it opens the PR — same write that fills the `PR` column |
| `in-review → merged` | the **Archivist** | at close-out — same step that confirms the merge |
| `→ blocked` | the **Developer** | when it escalates |
| `blocked → in-flight` | whoever supplies the unblocking answer | when the escalation is resolved |

### Read to self-locate, write to hand off

This closes the self-locating loop from `aeg-manual-flow.md`. Every role uses the status column in both directions:

- **Read it to know if it is your turn.** The Reviewer checks: is this task `in-review`? If it is still `todo`, there is nothing to review — refuse. The Archivist checks: is the PR `merged`? If `in-review`, it is not done — refuse.
- **Write it when you finish, to hand off.** The Developer flips `in-flight → in-review` so the Reviewer knows it may act. The Archivist flips `→ merged` so dependents unblock.

Same file, both directions. That is the coordination spine of the whole model: status is how roles hand work to each other without a human relaying it.

### Per-role done-checklist additions

- **Planner** owns `backlog → todo` (scoping/promotion).
- **Developer** done-checklist gains: *set my task's row to `in-review` and fill the `PR` column* (alongside "brief in PR body").
- **Archivist** close-out gains: *flip the task's row to `merged`* (alongside confirming merge, branch deletion, docs/changelog) — for every product the task lists.
- **Dispatcher** (human or tool) sets `todo → in-flight` at start.

---

## 7. The multi-developer safety mechanism

The `Dispatch rules` block is what makes two or more developers safe. With a single principal, the rules live in one head. With a team, they must be a **lock**, not a whiteboard:

- **depends-on gate** — a task cannot start until its dependency is `merged`.
- **conflicts-with gate** — a task cannot start while a colliding sibling is `in-flight` or `in-review` (i.e. has an open PR or active agent).

**Conflicts are package-level, not product-level.** Two tasks collide if they touch the same package/path, even across different products. A task generalizing `@atta/engine` conflicts with an in-flight Vāda task that also touches the engine — different products, same package, real collision. So `Product` is only a coarse first-pass filter (tasks in wholly-separate products usually don't collide); the actual conflict surface is shared packages. A multi-product task conflicts with in-flight work touching *any* of the packages it spans.

In manual mode these are preconditions the Developer checks before beginning (read the iteration file's status column + open-PR status). An automation layer can enforce them automatically at dispatch. Either way: the conflict is declared at planning time and enforced at dispatch time — never discovered at merge time, which is too late.

**v1 honesty:** in manual mode the gates are *trusted, not enforced* — an agent reads them and is expected to comply, but nothing mechanically stops a human from ignoring them. That is acceptable for a small, watched team. Mechanical enforcement arrives when a dispatch tool enforces the gates in code. Until then: trusted discipline.

---

## 8. One-line pitch this enables

> AEG does not plan your product. It governs how your product gets executed by agents — safely, coherently, and coordinated across a team.

For the manual run mechanics and per-role entry gates, see `aeg-manual-flow.md`. For the authority model and tiers, see `state-machine.md`. For the product registry, see `products.md`.
