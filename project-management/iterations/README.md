# Iterations — the top of AEG

**Status:** ratified
**Ratified on:** 2026-06-04
**Ratified by:** Principal
**Ratifies via:** D-029 (global decisions.md)

This design was reviewed in three rounds by an external panel (Gemini, DeepSeek, ChatGPT) and unanimously endorsed after the corrections below.

The **iteration** is the highest-level artifact in Atta Agentic Execution Governance. AEG starts here and goes down. There is nothing above it inside AEG.

AEG is the **execution** layer — it governs how a human's intent becomes reviewed, merged, coherent code, run by humans wielding agents. It is **not** a product-planning tool.

> **AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub/GitLab) the way it depends on git — the forge is infrastructure every team already has, and it is AEG's source of truth for execution state. AEG does **not** depend on any orchestration tool (e.g. Cetana): a human, or a thin dispatch script, invokes roles; there is no AEG server, scheduler, or database. Knowledge flows one way — a tool may know AEG; AEG does not know the tool. (Earlier drafts claimed "tool-neutral." That was abandoned as a false goal: real teams have a forge; pretending otherwise produced a fragile mutable-file state model. Forge-native is the honest boundary.)

---

## 1. The four truth domains (this is the whole architecture)

Every fact in AEG lives in exactly **one** place. Nothing is duplicated; no artifact tries to be two things. This separation is what the review panel identified as the difference between a coherent design and the original broken one.

| Domain | Holds | Mutable by |
|--------|-------|-----------|
| **GitHub Issue** | Task identity + metadata (product label, ticket link, dependency/conflict references) | Planner (at plan time) |
| **The thin iteration file** | Planning *topology* only — task→issue mapping, dependency graph, conflict graph, iteration grouping | Planner (at plan time) |
| **The Git forge** (branch / PR / review / merge state) | All live execution *status* — derived, never stored | the act of working (opening a branch, a PR, a review, a merge) |
| **The PR body** | The just-in-time brief — the task's full execution context | Brief Author, once, when work starts |

The cardinal rule, stated once and enforced everywhere below: **the forge holds what is happening; the file and the issue hold the plan. Never copy "what is happening" into the file or the issue.**

---

## 2. AEG owns iterations, not roadmaps

The product roadmap — what to build, why, in what priority — belongs to the company and lives in the company's tool (Jira, Linear, a doc they own). **AEG never holds it.** The moment AEG stores a roadmap it competes with Jira, loses, and creates a second rotting source of truth.

What AEG holds is the **iteration**: the bounded set of tasks currently being turned into merged code. The link from roadmap → iteration is a **human** — the Team Leader translating tickets into agent-shaped tasks. There is no file for that link, because the link is a person's judgment.

```
Company roadmap / Jira / product backlog   ← NOT in AEG. Reference only. The human reads it.
        │  (human translation — Team Leader / Planner)
        ▼
Iteration  =  a set of GitHub Issues  +  a thin topology file        ← TOP of AEG.
   ├─ Task (Issue) ── brief written just-in-time → lands in its PR body
   ├─ Task (Issue)
   └─ …          edges (depends-on / conflicts-with) declared in the thin file
        │
        ▼
Per task: branch → PR → Reviewer + Security → merge → close-out
```

**`roadmap.md` is retired.** Its executable slice became the first iteration; its held/vision content moved to per-product backlogs (`apps/<product>/specs/<product>-backlog.md`) and `docs/ecosystem-backlog.md`, all out of the flow.

**The backlog is the seam with your planning tool — and AEG is indifferent to it.** The backlog can be these markdown files, or it can be Jira, Linear, a spreadsheet, or a conversation in someone's head. AEG does not care which, because **AEG never reads the backlog as part of the flow** — it only requires that *a well-formed brief exists* when a task is dispatched. The Planner *may* read the backlog to compose an iteration (a useful input), but it does **not depend** on one: hand the Planner intent directly ("build the AEG UI") and it produces an iteration with no backlog at all. So the backlog is an *optional upstream input*, never a flow dependency. This is exactly what lets AEG drop into a team that already lives in Jira without fighting it — Jira stays the plan; AEG picks up at the iteration. The seam is the only point the two ever touch, and only a human (the Planner) stands on it.

---

## 3. A task is a GitHub Issue; status is derived, never stored

A task **is** a GitHub Issue. Its status is not a field anyone writes — it is **computed by asking the forge** what is true right now. This is the change that removed the original fatal flaw (a hand-edited status column that raced, drifted, and lied under parallelism).

| Status | Derived from (the forge fact) |
|--------|-------------------------------|
| `backlog` | Issue open, **unassigned** |
| `todo` | Issue open, **assigned**, no branch yet |
| `in-flight` | A branch `task/<iteration>/<n>` exists, **no PR** open |
| `in-review` | PR open |
| `changes-requested` | PR open, `reviewDecision: CHANGES_REQUESTED` |
| `merged` | PR merged (Issue auto-closes) |
| `blocked` | An `aeg:blocked` label is present |

So: there is **no status column anywhere.** The Developer does not "flip to in-review" — *opening the PR is the in-review signal*. The close-out does not "flip to merged" — *the merge is that signal*. The branch-name convention `task/<iteration>/<n>` is what links a task number to its branch and PR, so any role finds a task's live status with one forge query and writes nothing. `blocked` is the one state with no native forge fact, so it is a label (cheap, native, doesn't race).

**Retry is free:** a Reviewer's REQUEST CHANGES makes the PR's `reviewDecision` = `CHANGES_REQUESTED` → derived status `changes-requested`. The Developer pushes fixes → the PR returns to open review → `in-review`. No status reset, because nothing was stored.

**Orphaned task** (branch exists, no PR, gone stale) has an explicit owner: a close-out/sweep step flags it and a human deletes the branch (returning the task to `todo`). Named, not silent.

---

## 4. The thin iteration file — topology only

One file per iteration at `project-management/iterations/<name>.md`. It holds **only** what the forge models poorly: the task→issue mapping and the dependency/conflict graph. It contains **no status, no PR numbers, no merge dates, no timestamps — nothing the forge already knows.** It is edited only by the Planner, at plan time, so it cannot race and cannot drift on status (it stores none). Template:

```
# Iteration: <short name> — <timeframe>

Goal (execution, not product-why): <what ships, end to end>
Repo: <repo>   ·   Team Leader: <name>

## Tasks (topology)
| # | Task                          | Issue | Product(s)    | Depends-on | Conflicts-with |
|---|-------------------------------|-------|---------------|------------|----------------|
| 1 | Generalize engine + migrate   | #88   | engine,herald | —          | 3              |
| 2 | Profile schema migration      | #89   | herald        | —          | —              |
| 3 | Vāda flow tweak (touches engine)| #90 | vada          | —          | 1              |

## Backlog (this iteration, not yet ready to dispatch)
- Rate-limit middleware (issue #91, herald) — promote once task 1 lands.
```

To see **live status**, you do not read this file — you ask the forge: `gh pr list`, the GitHub Issues view, or a Project board. The file is the *plan*; the forge is the *board*. (Note task 3: a Vāda task conflicts with task 1 even though they're different products — both touch the `@atta/engine` package. Conflicts are package-level, §5.)

**What is deliberately absent:** no priority, estimates, story points, or "why" — those are the company's, in Jira. The iteration carries only what schedules execution safely. That absence is what keeps AEG out of "Jira again."

---

## 5. Conflicts — declared, package-level, static

Two tasks conflict if they touch the same **collision domain** and therefore must not run in parallel. The rules, after the panel's correction:

- **Conflicts are declared by the Planner** as `conflicts-with` edges in the thin file. Declared, not inferred.
- **Collision domains are packages**, listed in a rarely-changed static file (`.aeg/packages`). Known cross-cutting collision paths — **lockfiles, `migrations/`, codegen outputs (protobuf/GraphQL/OpenAPI), monorepo config (tsconfig/eslint/turbo)** — are declared as their own collision domains, because they couple tasks across package boundaries.
- **The conflict gate is forge-answerable with zero stored state:** "is a `conflicts-with` sibling's PR currently open?" If yes, don't start. That's it.
- **There is no dynamic path-overlap check.** (The panel's decisive correction.) Computing "which files is each in-flight task touching right now" would require a live task→changed-files map — exactly the mutable execution state the design eliminates. So it is forbidden (§10).

**Acknowledged limitation, stated openly:** AEG catches *declared* and *package-level* collisions. It does **not** automatically catch novel, undeclared, file-level coupling between tasks in *different* packages (e.g. one task changes a shared type/config another package embeds). No tool catches that reliably without becoming unreliable, expensive, or stateful. AEG places its trust boundary at **planning**: when unsure whether two tasks collide, the Planner **declares the conflict and serializes them** — erring toward serialization is cheap; erring toward "run parallel and hope" is the failure mode. Safe parallelism assumes real package ownership boundaries (explicit APIs, no shared types leaking across packages); most monorepos earn this only with discipline.

---

## 6. The Planner

The **Planner** is a mode of the Team Leader — same intelligence as Brief Author, one altitude up. Brief Author: intent → one brief. Planner: intent + a slice of tickets → a whole iteration (a set of Issues + the thin topology file).

The Planner's job — the reason the iteration exists — is the relationships a brief-in-isolation can't see: decompose the ticket slice into agent-sized tasks (Issues), declare `depends-on` and `conflicts-with` edges, and decide **split vs. combine** by the **verification-coupling** test:

- **Independently verifiable → split** into single-product tasks with a `depends-on` edge.
- **Verification-coupled → combine** into one task, one branch, one PR, multiple products (e.g. generalize `@atta/engine` *and* migrate the first consumer onto it — the only proof the refactor is correct is the consumer working). Cross-product PRs touching two, three, four products are normal, not exceptions.

The Planner writes no briefs (those are just-in-time, §7) and writes no status (that's the forge). It owns the thin file and the `backlog`/`todo` distinction (assigning an Issue is the `todo` promotion). Its upstream input — a ticket slice, a backlog, or just the Principal's stated intent — is optional and lives outside AEG (§2); the Planner is where the company's plan and AEG's execution meet. It also enforces the **plan-integrity gates** in `roles/planner.md` — the recognized failure modes turned into live refusals and calibrated warnings (see §10). The full role spec, including refusal language, is in `roles/planner.md`.

---

## 7. Where briefs live

The brief is the task's full execution context. It has two homes:

- **Before work starts — nowhere persistent.** It does not exist yet. It is written (human + Brief Author) when the task is picked up, iteration-aware. Pasted, not committed. **Never in the Issue** — the Issue is task identity + metadata only; a brief in the Issue would age, attract edits, and become stale planning documentation.
- **From PR-open onward — the PR body.** The Developer pastes the brief into the PR description when opening the PR. That is its permanent, durable home, attached to exactly the work it governed, and what the Reviewer and Archivist read.

Retry reuses the same PR body; no rewrite.

---

## 8. The multi-developer safety mechanism

Two gates make parallel developers safe — both **forge-answerable, zero stored state**:

- **depends-on gate** — don't start a task until its dependency's **PR is merged**. (Query the dependency Issue's linked PR.)
- **conflicts-with gate** — don't start a task while a `conflicts-with` sibling's **PR is open** (`in-review`/`changes-requested`) or it's `in-flight`. (§5.)

With a single principal these rules live in one head; with a team they must be a **lock**, not a whiteboard. In manual mode they are preconditions each Developer checks against the forge before beginning. A dispatch tool can enforce them in code. Either way the conflict is declared at planning time and enforced at dispatch time — never discovered at merge time, which is too late.

**v1 honesty:** in manual mode the gates are *trusted, not enforced* — read and complied with, but nothing mechanically stops a human ignoring them. Acceptable for a small, watched team. Mechanical enforcement arrives when a dispatch tool runs the gates. Until then: trusted discipline.

---

## 9. Anti-regression rules (do not undo the design)

The review panel predicted, unanimously, the two ways teams will accidentally rebuild the original flaw. Both are **forbidden** and the Planner agent flags them (§ `roles/planner.md`):

1. **No execution metadata in the thin file or the Issue.** Never add `status`, `PR #`, `merged date`, `current state`, `assignee history`, or generated collision data to the iteration file. The reason is always reasonable ("just to glance without querying") and it is always wrong — the forge already holds these, and copying them in recreates the racing, drifting, lying status store. **Thin file = topology. Forge = state.** The line is bright; keep it bright.
2. **No dynamic conflict scanner.** Do not build a script that checks out in-flight branches and diffs them to "catch conflicts the Planner missed." It cannot work without a live task→changed-files map — the mutable state we removed. When unsure two tasks collide, **declare the conflict and serialize** (§5). Conservative declaration is the sanctioned answer; a scanner is not.
3. **No planning metadata on Issues.** No priority, estimates, points, or roadmap fields. Enforced mechanically: a required Issue template (deps, conflicts, product label, ticket link — and nothing else) + a CI check that rejects forbidden fields/labels. Discipline alone will not hold this; the *place to put planning info is removed*, not just discouraged.

---

## 10. What AEG adds over raw GitHub

A fair challenge from the panel: a 2-dev GitHub team already has Issues, Projects, PRs, reviews. What does AEG add? Exactly four things GitHub does not give you, and they are the product:

1. **Dependency gates** — GitHub won't stop you starting a task whose dependency isn't merged. AEG does.
2. **Conflict edges + collision domains** — GitHub won't stop two colliding tasks running in parallel. AEG does.
3. **Role self-location** — Developer/Reviewer/Security/Archivist each validate their own preconditions from forge state and refuse when it isn't their turn. GitHub just sends a notification.
4. **Just-in-time brief discipline** — full context authored at execution and living in the PR, not rotting in a ticket.

Raw GitHub is a dashboard. AEG is a thin, forge-native discipline layer on top of it. That layer — not any one mechanism — is the value.

---

## 11. One-line pitch

> AEG does not plan your product. It governs how your product gets executed by agents — safely, coherently, and coordinated across a team.

For the manual run mechanics and per-role entry gates, see `aeg-manual-flow.md`. For the Planner's plan-integrity gates, see `roles/planner.md`. For the authority model and tiers, see `state-machine.md`. For the product registry, see `products.md`.
