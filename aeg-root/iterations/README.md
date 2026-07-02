---
sidebar_title: Iterations Overview
---
# Iterations — the top of AEG

**Status:** ratified
**Ratified on:** 2026-06-04
**Ratified by:** Principal
**Ratifies via:** D-029 (global decisions.md)

This design was reviewed in three rounds by an external panel (Gemini, DeepSeek, ChatGPT) and unanimously endorsed after the corrections below.

The **iteration** is the highest-level artifact in Agentic Execution Governance. AEG starts here and goes down. There is nothing above it inside AEG.

AEG is the **execution** layer — it governs how a human's intent becomes reviewed, merged, coherent code, run by humans wielding agents. It is **not** a roadmap-planning tool.

> **AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub/GitLab) the way it depends on git — the forge is infrastructure every team already has, and it is AEG's source of truth for execution state. AEG does **not** depend on any orchestration tool: a human, or a thin dispatch script, invokes roles; there is no AEG server, scheduler, or database. Knowledge flows one way — a tool may know AEG; AEG does not know the tool. (Earlier drafts claimed "tool-neutral." That was abandoned as a false goal: real teams have a forge; pretending otherwise produced a fragile mutable-file state model. Forge-native is the honest boundary.)

---

## 1. The four truth domains (this is the whole architecture)

Every fact in AEG lives in exactly **one** place. Nothing is duplicated; no artifact tries to be two things. This separation is what the review panel identified as the difference between a coherent design and the original broken one.

| Domain | Holds | Mutable by |
|--------|-------|-----------|
| **The forge Issue** | Task identity + metadata (project label, ticket link, dependency/conflict references) | Planner (at plan time) |
| **The thin iteration file** | Planning *topology* only — task→issue mapping, dependency graph, conflict graph, iteration grouping | Planner (at plan time) |
| **The Git forge** (branch / PR / review / merge state) | All live execution *status* — derived, never stored | the act of working (opening a branch, a PR, a review, a merge) |
| **The PR body** | The just-in-time brief — the task's full execution context | Brief Author, once, when work starts |

The cardinal rule, stated once and enforced everywhere below: **the forge holds what is happening; the file and the issue hold the plan. Never copy "what is happening" into the file or the issue.**

---

## 2. AEG owns iterations, not roadmaps

The roadmap — what to build, why, in what priority — belongs to the company and lives in the company's tool (Jira, Linear, a doc they own). **AEG never holds it.** The moment AEG stores a roadmap it competes with Jira, loses, and creates a second rotting source of truth.

What AEG holds is the **iteration**: the bounded set of tasks currently being turned into merged code. The link from roadmap → iteration is a **human** — the Team Leader translating tickets into agent-shaped tasks. There is no file for that link, because the link is a person's judgment.

```
Company roadmap / Jira / project backlog   ← NOT in AEG. Reference only. The human reads it.
        │  (human translation — Team Leader / Planner)
        ▼
Iteration  =  a set of forge Issues  +  a thin topology file        ← TOP of AEG.
   ├─ Task (Issue) ── brief written just-in-time → lands in its PR body
   ├─ Task (Issue)
   └─ …          edges (depends-on / conflicts-with) declared in the thin file
        │
        ▼
Per task: branch → PR → Reviewer + Security → merge → close-out
```

**`roadmap.md` is retired.** Its executable slice became the first iteration; its held/vision content moved to per-unit backlogs (`<unit>/specs/<unit>-backlog.md`) and the repo-level `specs/<repo>-backlog.md`, all out of the flow (D-037).

**The backlog is the seam with your planning tool — and AEG is indifferent to it.** The backlog can be these markdown files, or it can be Jira, Linear, a spreadsheet, or a conversation in someone's head. AEG does not care which, because **AEG never reads the backlog as part of the flow** — it only requires that *a well-formed brief exists* when a task is dispatched. The Planner *may* read the backlog to compose an iteration (a useful input), but it does **not depend** on one: hand the Planner intent directly ("build the dashboard") and it produces an iteration with no backlog at all. So the backlog is an *optional upstream input*, never a flow dependency. This is exactly what lets AEG drop into a team that already lives in Jira without fighting it — Jira stays the plan; AEG picks up at the iteration. The seam is the only point the two ever touch, and only a human (the Planner) stands on it.

---

## 3. A task is a forge Issue; status is derived, never stored

A task **is** a forge Issue. Its status is not a field anyone writes — it is **computed by asking the forge** what is true right now. This is the change that removed the original fatal flaw (a hand-edited status column that raced, drifted, and lied under parallelism).

| Status | Derived from (the forge fact) |
|--------|-------------------------------|
| `todo` | Issue open (assigned or unassigned), no branch yet; or no forge facts known — iteration tasks are committed work, minimum `todo` (D-059) |
| `in-flight` | A branch `task/<iteration>/<n>` exists, **no PR** open |
| `in-review` | PR open |
| `changes-requested` | PR open, `reviewDecision: CHANGES_REQUESTED` |
| `merged` | PR merged (Issue auto-closes) |
| `blocked` | An `aeg:blocked` label is present |
| `dropped` | Issue **closed `NOT_PLANNED`**, no merged PR — legitimately abandoned, never done, never `todo` (D-069) |
| `incoherent` | Issue **closed `COMPLETED`** (or with no recorded close reason), no merged-PR link — done-but-unprovable or a broken close; surfaced for a human, never auto-reopened (D-069) |

`backlog` is a **project-level concept only** — ideas/maybe-tasks in markdown that live outside the iteration flow (`specs/<unit>-backlog.md`, Jira, etc.). Once a task is placed in a launched iteration it is committed work and derives `todo` at minimum, never `backlog`. See D-059.

**A closed-without-merge Issue never resolves to `todo`** (D-069). `todo` implies not-started; a closed Issue is terminal. The derivation reads GitHub's native `stateReason`: `NOT_PLANNED` → `dropped`; anything else (`COMPLETED`, or no reason) → `incoherent`. The one law: a task-Issue reaches *done* only via a merged PR that names it (`Closes #N`); a `COMPLETED` close without that merge is incoherent, not done.

So: there is **no status column anywhere.** The Developer does not "flip to in-review" — *opening the PR is the in-review signal*. The close-out does not "flip to merged" — *the merge is that signal*. The branch-name convention `task/<iteration>/<n>` is what links a task number to its branch and PR, so any role finds a task's live status with one forge query and writes nothing. `blocked` is the one state with no native forge fact, so it is a label (cheap, native, doesn't race).

**Retry is free:** a Reviewer's REQUEST CHANGES makes the PR's `reviewDecision` = `CHANGES_REQUESTED` → derived status `changes-requested`. The Developer pushes fixes → the PR returns to open review → `in-review`. No status reset, because nothing was stored.

**Orphaned task** (branch exists, no PR, gone stale) has an explicit owner: a close-out/sweep step flags it and a human deletes the branch (returning the task to `todo`). Named, not silent.

---

## 4. The thin iteration file — topology only

One file per iteration at `aeg-root/iterations/<name>.md`. It holds **only** what the forge models poorly: the task→Issue mapping and the dependency/conflict graph. It contains **no status, no PR numbers, no merge dates, no timestamps — nothing the forge already knows. It contains no task prose, no boundary descriptions, no rationale — nothing that belongs on the Issue.** Its task topology is edited only by the Planner, at plan time, so it cannot race and cannot drift on status (it stores none). The one exception is the iteration's own **lifecycle marker** (active/complete — §12), a single header line the Archivist sets at close-out; this is the iteration's lifecycle, not per-task execution status, and it is set once when the whole iteration ends.

**`#TBD` rows are forbidden.** Every task row must carry a real forge Issue number. An iteration that contains `#TBD` is an incomplete plan — the Planner has not cut the Issues, which is the canonical plan act (D-055). **The Planner's rationale (Boundary, Sizing, Project(s)+blast radius, Dependency rationale, Traps to avoid, Suggested agent-class, Stop-and-escalate) lives on the Issue body.** The thin file row carries only the Issue link and edges; it does not contain or repeat the rationale. Brief Authors read the rationale from the Issue, not from this file.

Template:

```
# Iteration: <short name> — <timeframe>
Lifecycle: active            ← active | complete (§12). Set to complete by the Archivist when every task is merged.

Goal (execution, not roadmap-why): <what ships, end to end>
Repo: <repo>   ·   Team Leader: <name>

## Tasks (topology)
| # | Task                          | Issue | Project(s)      | Depends-on | Conflicts-with |
|---|-------------------------------|-------|-----------------|------------|----------------|
| 1 | Generalize core + migrate     | #88   | core,service-a  | —          | 3              |
| 2 | Schema migration              | #89   | service-a       | —          | —              |
| 3 | service-b tweak (touches core)| #90   | service-b       | —          | 1              |

## Backlog (this iteration, not yet ready to dispatch)
- Rate-limit middleware (issue #91, service-a) — promote once task 1 lands.
```

To see **live status**, you do not read this file — you ask the forge: `gh pr list`, the forge's Issues view, or a project board. The file is the *plan*; the forge is the *board*. (Note task 3: a `service-b` task conflicts with task 1 even though they're different projects — both touch the shared `core` package. Conflicts are package-level, §5.)

### Naming an iteration

The filename slug (`<name>` in `aeg-root/iterations/<name>.md`) should name the iteration's **center of gravity — the durable, highest-leverage work — not its narrowest downstream feature.** The test: *what is the lasting, reusable thing this iteration produces?* Name that.

- When an iteration **onboards a project onto shared infrastructure** (or grows that infra), name the **onboarding / infra**, not the feature that happens to ride on it. The infra work outlives and outscopes the feature, and other projects inherit it. Example: an iteration that migrates Herald onto `@atta/engine` and adds multi-vendor structured output to that shared engine — with "Bulk Audit" as the proximate Herald feature — is named **`herald-onto-engine`**, *not* `herald-bulk-audit`. The engine maturing is the center of gravity; Bulk Audit is one feature on top.
- When an iteration is genuinely **one project's self-contained feature** (no shared-infra change, no cross-project blast radius), `<project>-<feature>` is fine (e.g. `vada-reviewers-benchmark`).
- A name should not imply a narrower scope than the `Project(s)` column reveals. If tasks span `engine, vada, herald`, a filename saying only `herald-…` misleads a reader scanning `iterations/`. When in doubt, name the broadest/most-shared layer the iteration touches.

The `Project(s)` column remains the authoritative blast-radius record per task; the filename is a human-readable handle, chosen to not mislead about scope.

---

## 5. Conflicts — declared, package-level, static

Two tasks conflict if they touch the same **collision domain** and therefore must not run in parallel. The rules, after the panel's correction:

- **Conflicts are declared by the Planner** as `conflicts-with` edges in the thin file. Declared, not inferred.
- **Collision domains are packages**, listed in a rarely-changed static file (`.aeg/packages`). Known cross-cutting collision paths — **lockfiles, `migrations/`, codegen outputs (protobuf/GraphQL/OpenAPI), monorepo config (tsconfig/eslint/turbo)** — are declared as their own collision domains, because they couple tasks across package boundaries.
- **The conflict gate is forge-answerable with zero stored state:** "is a `conflicts-with` sibling's PR currently open?" If yes, don't start. That's it.
- **There is no dynamic path-overlap check.** (The panel's decisive correction.) Computing "which files is each in-flight task touching right now" would require a live task→changed-files map — exactly the mutable execution state the design eliminates. So it is forbidden (§10).

**Conflicts hold across iterations, not just within one.** A `conflicts-with` edge is declared *within* an iteration's thin file, but the collision domain it protects is global — a package is a package no matter which iteration touches it. So when two iterations run concurrently (§12), the conflict rule still binds **across** them: if a task in iteration A and a task in iteration B touch the same collision domain, they conflict, even though neither file lists the other (the files only know their own tasks). The Planner of the *second* concurrent iteration is responsible for checking the first's `Project(s)` / collision domains and either keeping the iterations disjoint or declaring the cross-iteration serialization (§12). The gate itself is unchanged and still forge-answerable — "is a PR touching this collision domain currently open?" does not care which iteration it belongs to.

**Acknowledged limitation, stated openly:** AEG catches *declared* and *package-level* collisions. It does **not** automatically catch novel, undeclared, file-level coupling between tasks in *different* packages (e.g. one task changes a shared type/config another package embeds). No tool catches that reliably without becoming unreliable, expensive, or stateful. AEG places its trust boundary at **planning**: when unsure whether two tasks collide, the Planner **declares the conflict and serializes them** — erring toward serialization is cheap; erring toward "run parallel and hope" is the failure mode. Safe parallelism assumes real package ownership boundaries (explicit APIs, no shared types leaking across packages); most monorepos earn this only with discipline.

---

## 6. The Planner

The **Planner** is a mode of the Team Leader — same intelligence as Brief Author, one altitude up. Brief Author: intent → one brief. Planner: intent + a slice of tickets → a whole iteration (a set of Issues + the thin topology file).

The Planner's job — the reason the iteration exists — is the relationships a brief-in-isolation can't see: decompose the ticket slice into agent-sized tasks (Issues), declare `depends-on` and `conflicts-with` edges, and decide **split vs. combine** by the **verification-coupling** test:

- **Independently verifiable → split** into single-project tasks with a `depends-on` edge.
- **Verification-coupled → combine** into one task, one branch, one PR, multiple projects (e.g. generalize a shared `core` package *and* migrate the first consumer onto it — the only proof the refactor is correct is the consumer working). Cross-project PRs touching two, three, four projects are normal, not exceptions.

The Planner writes no briefs (those are just-in-time, §7) and writes no status (that's the forge). It owns the thin file and the `backlog`/`todo` distinction (assigning an Issue is the `todo` promotion). Its upstream input — a ticket slice, a backlog, or just the Principal's stated intent — is optional and lives outside AEG (§2); the Planner is where the company's plan and AEG's execution meet. It also enforces the **plan-integrity gates** in `roles/planner.md` — the recognized failure modes turned into live refusals and calibrated warnings (see §10), and the **readiness gate** (verify all inputs are present and reachable before planning a single task). The full role spec, including refusal language, is in `roles/planner.md`.

---

## 7. Where briefs live

The brief is the task's full execution context. It has two homes:

- **Before work starts — nowhere persistent.** It does not exist yet. It is written (human + Brief Author) when the task is picked up, iteration-aware. Pasted, not committed. **Never in the Issue** — the Issue is task identity + metadata only; a brief in the Issue would age, attract edits, and become stale planning documentation. (The Issue *does* carry the Planner's rationale — durable conclusions — which the Brief Author consumes via the `planner-brief` contract; the brief itself is the perishable execution detail and lives only in the PR.)
- **From PR-open onward — the PR body.** The Developer pastes the brief into the PR description when opening the PR. That is its permanent, durable home, attached to exactly the work it governed, and what the Reviewer and Archivist read.

Retry reuses the same PR body; no rewrite.

For who reads and who writes documentation at each seam of this flow (Planner's whole-iteration read, Brief Author's task-scoped re-read + §7, Developer's execution, Reviewer's dual check, Archivist's confirmation), see `documentation-coherence.md`.

---

## 8. The multi-developer safety mechanism

Two gates make parallel developers safe — both **forge-answerable, zero stored state**:

- **depends-on gate** — don't start a task until its dependency's **PR is merged**. (Query the dependency Issue's linked PR.)
- **conflicts-with gate** — don't start a task while a `conflicts-with` sibling's **PR is open** (`in-review`/`changes-requested`) or it's `in-flight`. (§5.) This gate binds **across concurrent iterations**, not only within one (§5, §12).

With a single principal these rules live in one head; with a team they must be a **lock**, not a whiteboard. In manual mode they are preconditions each Developer checks against the forge before beginning. A dispatch tool can enforce them in code. Either way the conflict is declared at planning time and enforced at dispatch time — never discovered at merge time, which is too late.

**v1 honesty:** in manual mode the gates are *trusted, not enforced* — read and complied with, but nothing mechanically stops a human ignoring them. Acceptable for a small, watched team. Mechanical enforcement arrives when a dispatch tool runs the gates. Until then: trusted discipline.

---

## 9. Anti-regression rules (do not undo the design)

The review panel predicted, unanimously, two of the ways teams will accidentally rebuild the original flaw (rules 1–2 below); rule 3 and rule 4 were added later as further incidents surfaced the same underlying pattern. All four are **forbidden** and the Planner agent flags them (§ `roles/planner.md`):

1. **No execution metadata in the thin file or the Issue.** Never add `status`, `PR #`, `merged date`, `current state`, `assignee history`, or generated collision data to the iteration file. The reason is always reasonable ("just to glance without querying") and it is always wrong — the forge already holds these, and copying them in recreates the racing, drifting, lying status store. **Thin file = topology. Forge = state.** The line is bright; keep it bright. (The iteration's own active/complete lifecycle marker in §12 is **not** an exception to this: it is the iteration's lifecycle set once at close-out, not per-task execution status, and the forge has no native fact for "this whole iteration is done.")
2. **No dynamic conflict scanner.** Do not build a script that checks out in-flight branches and diffs them to "catch conflicts the Planner missed." It cannot work without a live task→changed-files map — the mutable state we removed. When unsure two tasks collide, **declare the conflict and serialize** (§5). Conservative declaration is the sanctioned answer; a scanner is not.
3. **No planning metadata on Issues.** No priority, estimates, points, or roadmap fields. Enforced mechanically: a required Issue template (deps, conflicts, project label, ticket link — and nothing else) + a CI check that rejects forbidden fields/labels. Discipline alone will not hold this; the *place to put planning info is removed*, not just discouraged.
4. **No committed report/scratch files.** Never commit a new repo file whose sole purpose is a one-off report, audit finding, coverage summary, or working brief. The reason is always reasonable ("it's a big deliverable, it deserves its own file," "there's no prior convention, I'll set one") and it is always wrong — that content belongs in the PR body (task-scoped findings) or an Issue/PR comment (findings with no task PR of their own), exactly like a brief's permanent home is the PR body, never the Issue or a repo file (§7). A committed scratch file recreates the racing, drifting problem the other three rules already forbid, one layer up: it is a fifth truth domain nobody asked for, competing with the forge for where "what happened" lives. This is not hypothetical — it has already happened twice: a 120-row audit deliverable committed as `aeg-root/iterations/<name>.audit.md` broke AEG Studio's iteration loader (which globs every `.md` file in this directory as an iteration), and a full task brief was committed as a permanent file under `aeg-project/briefs/`, contradicting §7's own rule that a brief is pasted, not committed (D-074). **Thin file = topology. Forge = state. PR body / Issue comment = findings and briefs.** Sanctioned exceptions: durable reference artifacts (specs, skills, role docs, contracts, decision logs) and the `.tokens.md` sibling ledgers (§12, D-071) — these are pre-existing, separately-governed, durable-by-design; a one-off report is neither.

---

## 10. What AEG adds over raw GitHub

A fair challenge from the panel: a 2-dev forge team already has Issues, Projects, PRs, reviews. What does AEG add? Exactly four things the forge does not give you, and they are the product:

1. **Dependency gates** — the forge won't stop you starting a task whose dependency isn't merged. AEG does.
2. **Conflict edges + collision domains** — the forge won't stop two colliding tasks running in parallel. AEG does.
3. **Role self-location** — Developer/Reviewer/Security/Archivist each validate their own preconditions from forge state and refuse when it isn't their turn. The forge just sends a notification.
4. **Just-in-time brief discipline** — full context authored at execution and living in the PR, not rotting in a ticket.

Raw forge tooling is a dashboard. AEG is a thin, forge-native discipline layer on top of it. That layer — not any one mechanism — is the value.

---

## 11. Iteration lifecycle and concurrency

The earlier sections describe a single iteration's *internals*. This section covers an iteration's *life* — when it begins, when it ends, what happens to the file, and how many can run at once.

### The lifecycle: planned → active → complete → archived

- **planned** — the thin file exists and the Issues are cut, but no work has started. Every task is `todo` (open, unassigned — committed iteration work, minimum `todo` per D-059). The iteration is a plan ready to execute.
- **active** — at least one task has an open branch (`in-flight`) or is further along. The iteration is in flight. `Lifecycle: active` in the header.
- **complete** — **every task's PR is merged** (every task derives to `merged` from the forge). The work is done. At this point — and only this point — the **Archivist** sets `Lifecycle: complete` in the header (one line; the single lifecycle mutation the file ever takes after plan time) and assembles the per-task provenance blocks on the merged PRs (D-030). "Complete" is itself **derived** from the forge (all linked PRs merged); the header marker is a convenience flag the Archivist writes once, not a status anyone maintains.
- **archived** — a complete iteration's file **moves to `aeg-root/iterations/completed/<name>.md`**. It is **not deleted.**

### Iterations are never deleted — they are durable history

A completed iteration file is **kept, moved, never removed.** The **Issues** carry the Planner's rationale for each task — the durable architectural reasoning that decided each boundary, blast radius, and trap (D-055). The archived iteration file carries the **topology** — which tasks were planned, their grouping, and their dependency/conflict edges. Neither artifact is deleted: the file moves to `completed/` (human-browsable topology archive); the Issues remain on the forge (frozen forge artifacts with the full rationale). Paired with the provenance blocks on the merged PRs, the archived file + Issues together are the **forensic record of why the work was shaped the way it was**: what was split from what, which traps were foreseen, what the blast radius was. `completed/` is an archive, not a graveyard; `git` retains full history regardless, and the moved file keeps the topology human-browsable.

(The Archivist also flags merged-but-undeleted **worktrees** and orphaned branches at this point — those *are* ephemeral and get cleaned up, §3. The iteration *file* is not ephemeral; the worktrees are. Don't confuse the two.)

### How many iterations can run at once — no hard cap, governed by two real limits

There is **no fixed maximum.** Multiple iterations may be `active` simultaneously. What actually bounds concurrency is two things, neither of them a number:

1. **The conflict rule binds across iterations (§5).** Two concurrent iterations are safe to run fully in parallel **only if their tasks do not share a collision domain.** If iteration A and iteration B both touch `@atta/ui`, their colliding tasks must serialize across the iteration boundary exactly as if they were siblings — the gate doesn't care which file a PR's task belongs to. **The cleanest concurrency is between disjoint iterations** (different projects, no shared package), where nothing can collide by construction. Example: `herald-onto-engine` (herald + engine) and an `aeg-ui` iteration (the `apps/aeg/web` greenfield app) share no collision domain, so they run fully parallel with zero cross-checks needed.
2. **Principal attention.** Every active iteration is a live front the Principal is reviewing, ratifying, and merging. Concurrency is bounded by how many fronts one Principal can hold well — a human limit, not a model limit. The model permits many; judgment sets the real number.

**The second-iteration planning obligation:** when planning an iteration while another is already active, the Planner's readiness gate (`roles/planner.md`) must additionally **read the active iteration(s)' `Project(s)` / collision domains** and confirm disjointness — or, where they overlap, declare the cross-iteration serialization explicitly. This is the cross-iteration case of "when unsure, declare and serialize." Disjoint iterations need only the confirmation; overlapping ones need the serialization plan before either dispatches into the shared domain.

### What "current" means

There is no single "current iteration." `aeg-root/iterations/` holds every active iteration's file at the top level; `completed/` holds the archive. "What's active right now" is, like everything else, **answered from the forge** (which Issues are open/assigned across the iteration files), not from a pointer the model maintains.

---

## 12. The per-iteration token/cost ledger — append-only, derived total

Every role that runs in an iteration reports its **token spend and cost**; the per-task **Archivist** is the sole writer of the per-iteration ledger, appending one row per role-turn at task close-out (D-071). The ledger is the cost-legibility counterpart to derived task status: the forge tells you *what happened*, the ledger tells you *what it cost*. Per-phase agent spend is something neither raw GitHub nor most "agentic" tools surface; AEG does, by giving it the same shape as everything else here — append-only, immutable rows, no stored aggregate.

### Where it lives

One sibling file per iteration: `aeg-root/iterations/<name>.tokens.md` (next to `<name>.md`).

The sibling form is chosen deliberately over an inline `## Token ledger` section in the iteration file: two roles appending rows at the same time on the same file is exactly the kind of merge-collision the topology file's "Planner-only at plan time" rule was set up to avoid. Keeping the ledger in its own append-only file makes a Planner editing the topology and a Developer reporting a turn-end never touch the same bytes. The parser (`@atta/aeg-core`'s `parseLedger`) also accepts the inline form for any iteration that chose it.

### Format

A single markdown table; columns are fixed. Cell conventions match the rest of the model (em-dash for unknown).

```markdown
# Token ledger — <iteration-name>

Append-only. Each row records one role's turn at a phase. Re-entry appends a **new** row. The iteration total is `sum(rows)`, derived at read time, never stored.

| Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date |
|-------|------|-------------|-----------|------------|------|------|
| planning       | Planner      | claude-opus-4-7 (chat) |    —   |    —  |    —    | 2026-06-13 |
| 9: brief       | Brief Author | claude-opus-4-7 (chat) |    —   |    —  |    —    | 2026-06-15 |
| 9: develop     | Developer    | claude-opus-4-7 (CC)   | 184327 | 12502 | $3.4781 | 2026-06-15 |
| 9: review      | Reviewer     | claude-opus-4-7 (chat) |    —   |    —  |    —    | 2026-06-15 |
```

- **Phase** — free-text. Convention: `<task-id>: <phase>` for per-task work (e.g. `9: develop`, `9: review`), or a bare phase for iteration-wide work (e.g. `planning`). Phase is opaque to the parser; the convention exists so a future view can pivot by task.
- **Role** — the AEG role doing the work (`Planner`, `Brief Author`, `Developer`, `Reviewer`, `Security`, `Archivist`).
- **Agent/Model** — the role's agent + model, with the surface in parentheses: `claude-opus-4-7 (CC)` for Claude Code (terminal), `claude-opus-4-7 (chat)` for a claude.ai conversation. The surface matters because it is what tells you which capture source applies (below).
- **Tokens in / Tokens out** — integers from the meter, or `—` for "not yet known."
- **Cost** — USD as `$X.XXXX` from the adapter's PRICING table, or `—`. *(V1 honesty: the PRICING table is currently missing some recent models — e.g. `claude-sonnet-4-20250514` — so cost can read `$0.00` for an otherwise real row. Tokens are still exact; that gap is a known Herald-backlog dependency, not a ledger bug.)*
- **Date** — `YYYY-MM-DD`.

### The append rule (read this exactly the way you read derived status)

- **No role appends its own row on a task branch (D-071).** Two live-fire incidents forced this: chat/read-only roles (Reviewer, Security, Planner, Brief Author) structurally cannot append — they hold no task branch, and some never touch the repo's filesystem at all; and parallel Developer sessions on different tasks collided appending to the same shared `tokens.md` file (concretely, tasks #255 and #258 raced on the same file). Instead, every role **reports** its token spend in the artifact its turn already produces — the PR body ("Token report" section) for terminal roles, the verdict comment for chat roles doing review, the plan PR or planning report for the Planner — and the per-task **Archivist appends every row at task close-out**, one row per role-turn, including its own.
- **Never edit** an existing row. If you discover a mistake, append a new row that supersedes it in prose (or fix the source file in a separate, declared edit — same exception that `state-machine.md` §13 carves for forward-reference fields).
- **Re-entry appends.** A Developer dispatched for `9: develop`, asked for changes, and re-running for `9: develop` again produces a **second** `9: develop` report, which the Archivist appends as a **second** row — never a sum, never an overwrite. The two rows both count.
- The **iteration total is `sum(rows)`**, derived at read time, never stored. This is the same philosophy as forge-derived status (don't store the aggregate; sum the immutable entries) and the append-only decision log. A stored total reintroduces the merge-collision + stale-aggregate problem.

### Two capture sources (the design constraint, not a bug)

Token reporting is asymmetric — and any honest design has to encode that, because the asymmetry is a property of the surfaces, not of AEG. The asymmetry now lives in *what a role reports*, not in *who writes the ledger file* — the Archivist writes every row, but the precision of the numbers it copies still depends on the reporting role's surface:

- **Terminal roles run in Claude Code (Developer; Archivist when automated).** The session knows its tokens. The role reports exact numbers from `/cost` in its PR body. The Archivist copies these numbers verbatim into the row it appends at close-out.
- **claude.ai roles run in chat (Planner; Brief Author; Reviewer; Security).** A claude.ai conversation **cannot read its own token count** via tool or API. The role still reports at turn-end — phase, role, model, date, in its verdict comment or planning report — but leaves the numeric cells as `—`. The Archivist copies the report as-is; the **Principal** may later supply the real figures from the claude.ai UI usage figure, filling a previously-`—` cell (the one narrow forward-reference exception `state-machine.md` §13 allows).

V1 accepts the manual seam: chat turns are the cheap ones; coding (terminal) dominates spend and is captured exactly. Auto-capture for terminal roles is the obvious next layer; auto-capture for chat roles depends on the surface giving us a self-token API, which it does not today. **Known gap (flagged, not solved by D-071):** iteration-wide chat-role turns with no task PR to report into — a Planner session outside a plan PR, a Brief Author session — have no established recording path; see `roles/planner.md` "Plan-PR close-out."

### Anti-regression

The ledger is a Section-13 append-only artifact. The familiar forbidden moves apply:

- **No stored total.** Do not add a "current total" row, header field, or anything that has to be edited when a row appends. Derive it.
- **No edits to past rows** (except the forward-reference exception in §13: filling a previously `—` numeric cell from the claude.ai UI is permitted — it does not change history, only completes it).
- **No "current spend"** field anywhere — including the iteration file's header. The forge holds execution state; the ledger file holds the cost history. The thin iteration file holds topology. Three artifacts, three concerns.

---

## 13. One-line pitch

> AEG does not plan your project. It governs how your project gets executed by agents — safely, coherently, and coordinated across a team.

For the manual run mechanics and per-role entry gates, see `aeg-manual-flow.md`. For the Planner's plan-integrity gates and readiness gate, see `roles/planner.md`. For the authority model, tiers, and label vocabulary, see `state-machine.md`. For the project registry, see `projects.md`. For role-seam contracts, see `contracts/`.
