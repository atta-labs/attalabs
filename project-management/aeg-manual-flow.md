# AEG — Running the Flow by Hand

**Atta Agentic Execution Governance (AEG)**, manual mode. This is the playbook for running the flow with nothing but Claude Code and this repo — no automation tool required.

This file is the companion to `process.md` (the eleven-phase walkthrough) and `state-machine.md` (the constitution). Where those describe the model in full, this one is the operator's guide: what a human does, in what order, calling which agent, with what in hand.

> **AEG knows no tool.** This playbook is tool-neutral. A tool may *automate* the hand-offs below, but AEG never depends on, or names, one. Knowledge flows one way: a tool may know AEG; AEG does not know the tool.

---

## 0. Starting and maintaining an AEG repo (`aeg.sh`)

AEG "init" is not software — it is a **state the repo is in**. A repo is running AEG when three things are true:

1. **The governance scaffold exists** — a `project-management/` folder with the model: `state-machine.md`, `coordination.md`, `process.md`, `aeg-manual-flow.md`, `roles/`, `iterations/README.md`. (Plus `products.md` *only* once the repo holds more than one product.)
2. **At least one iteration exists** — a `project-management/iterations/<name>.md` file, even with zero tasks. The "AEG has been started here" marker.
3. **The role docs are reachable** — Claude Code can read `roles/`, and a human knows the run order (Section 4).

You can create that state by hand (copy the scaffold, write a first iteration file). Or use **`aeg.sh`** — a single, downloadable shell script (from the AEG site) that scaffolds these files for you. It is a **dumb scaffolder**: it writes files and nothing else. It does not dispatch agents, watch them, enforce gates, or reason — those are orchestration (a separate tool's job) or judgment (yours + the Planner's). It is **self-contained** (the scaffold is embedded; no network fetch) so you can read every byte before running it. One file, three subcommands:

```
aeg init [folder]                       # once per repo
aeg add-product <name> --path <folder>  # when a second product appears
aeg new-iteration <name>                # each cycle
```

### `aeg init [folder]`
Lays down the `project-management/` scaffold into the target folder (default: current dir). Run once, ever, per repo. After this the repo "has AEG." Refuses if `project-management/` already exists (won't overwrite). Takes essentially no params — init barely does anything; it just writes the skeleton.

### `aeg add-product <name> --path <folder>`
Registers a product. **A product is a `(name, folder)` pair the developer declares** — not derived from the tree, not required to match a `package.json`, not required to be a single package (see `products.md`). The command:
1. Reads `products.md`. If `<name>` is already a row → **refuse** ("already registered").
2. Checks `<folder>`. If it already exists on disk → **refuse** ("`<folder>` already exists; won't overwrite — register manually or pick another path"). It does not adopt unknown folders (no guessing).
3. If both pass: creates `<folder>/specs/` (spec + decisions + backlog stubs) and `<folder>/project-management/` (`state.md` + `now.md` stubs), and appends the registry row. Atomic — both the folders and the row, or neither.

The `--path` is **required and stored verbatim** — the tool never computes or searches for it. The folder is simply the product's home for specs + status; what the product "is" (one package, an app, several packages) is the developer's business.

**Single → multi promotion.** A single-product repo has no `products.md`. The first time you run `add-product`, the repo becomes multi-product — so `products.md` is created and you register **both** the pre-existing product *and* the new one (the existing one needs a row too, or its tasks can't resolve a `Product:`). After that, each further `add-product` appends one row.

### `aeg new-iteration <name>`
Creates `project-management/iterations/<name>.md` from the template (empty Tasks + Backlog). Run each cycle.

**`aeg.sh` and any orchestration tool overlap on `init`** — both can make a repo AEG-aware — and that is fine: it's the manual-vs-automated duality. `aeg.sh` is the route for someone who hasn't adopted a tool; the tool is the route for someone who has. `aeg.sh` stays dumb on purpose — the moment it tries to *do* anything intelligent, it has stopped being a scaffolder.

---

## 1. The flow is the product; a tool is optional

AEG is the flow. A tool may *automate the orchestration slice of the flow* — collapsing the copy-paste hand-offs between roles into commands. But the tool is not the flow, and the flow does not depend on it.

Everything below can be run by hand: you open Claude Code, you tell it which role to be, it reads its role doc, it checks whether it should be acting right now, and it does the work. An automation layer can later collapse the hand-offs — but the semantics are identical. Anything true of the manual flow is true of the automated flow.

**Manual mode is the teaching mode.** Companies are wary of AI because work happens invisibly — an agent does ten things under the hood and you find out later. AEG's manual steps make the invisible visible: each hand-off is a checkpoint where a human sees a risk that automation normally hides. Why review is separate from authorship. Why a brief is frozen. Why nothing merges without a human. Why decisions are logged. Running it by hand once teaches the *why* of every gate. That is a feature, not overhead.

---

## 2. The brief is the unit of context

The brief is the single most important artifact in the flow. Three rules:

1. **Context lives in the brief.** The brief is the whole context for the task. An agent should never need to go read something else to understand what it's doing. If context isn't in the brief, it doesn't exist.

2. **The brief is pasted, not committed — but it must land in the PR body.** You hand the brief to the Developer directly (a markdown block, all sections per `.claude/skills/brief-authoring/SKILL.md`). You do **not** need to commit a `briefs/*.md` file. Durability comes from a different place: when the Developer opens the PR, the brief text goes into the PR body. That makes it permanent, attached to exactly the work it governed, and readable by the Reviewer and Archivist. The PR body is the brief's permanent home.

3. **`Ticket:` is optional and reference-only.** A brief may carry a link to an external ticket (Jira, Linear, etc.):
   ```
   Ticket: PROJ-1234 — https://acme.atlassian.net/browse/PROJ-1234   (optional)
   ```
   This is **provenance, not instruction**. No agent reads the ticket, needs access to it, or is blocked by it. It is carried into the PR body alongside the brief so the change traces back to the org's world, and the Archivist can note it at close-out. A principal with no ticket system simply omits the line. Agents must never treat the ticket link as a substitute for context in the brief — if scope lives in the ticket instead of the brief, the brief is malformed.

In a multi-product repo the brief also carries a `Product:` line (resolved against `project-management/products.md`) so the agent reads the right product's specs. A single-product repo omits it.

---

## 3. Every agent is self-locating

This is what makes the flow safe to run by hand. When you call an agent, it does not trust that you called it correctly. Before doing any work, each agent checks two things against shared state:

1. **Is this my phase?** — given the current state of the work, is this role the right one to act now?
2. **Is my input well-formed?** — was I handed the artifact I require, in the shape I require?

If either check fails, the agent **refuses or redirects** instead of proceeding. This is the same skeptical posture the Reviewer already has (it won't review its own work), generalized to every role: every agent has an **entry gate**.

**Shared state in manual mode = the repo + GitHub (PR / issue status) + the iteration file's status column.** Crucially, the gates read state that exists whether or not any tool is running. In manual mode, **the PR is the state machine**: a PR that doesn't exist yet means "not ready to review"; an open PR means "ready to review"; a merged PR means "ready to close out." That is what lets the gates work identically with or without a tool.

---

## 4. The manual run order

| Step | Role | You hand it | It produces | Entry gate (refuses if…) |
|------|------|-------------|-------------|--------------------------|
| 0 | **Planner** (Team Leader mode) | intent + a slice of tickets | an iteration (tasks + edges) | asked to write one brief, not plan a set |
| 1 | **Principal** (you) | an intent / goal | a decision to proceed, a tier | — |
| 2 | **Brief Author** (Team Leader mode) | the intent + the task's iteration row | a brief, all sections | asked to write code instead of a brief |
| 3 | **Developer** | the brief | a worktree, the work, an open PR (brief in body) | input isn't a well-formed brief |
| 4 | **Reviewer (code)** | "review PR #N" | a VERDICT (APPROVE / REQUEST CHANGES) | no open PR, or no brief in the PR body, or it authored the code |
| 5 | **Security** | "security-review PR #N" | a VERDICT (PASS / FAIL) | no open PR, or no brief in the PR body |
| 6 | **Principal + TL** (you) | the verdicts | merge decision | review passes not done |
| 7 | **Archivist** | "close out PR #N" | a close-out report | **PR is not merged** |

You walk down the column. Each agent, when invoked, confirms it's its turn before acting.

---

## 5. Per-role entry gates (the refusal language)

These are the gates each role checks first. The wording is what the agent should say when it refuses.

**Planner** (Team Leader, Planner mode)
- Requires: an intent + a slice of tickets/items to turn into an iteration.
- Refuses: a request to write a single brief → *"That's a Brief Author job. I plan whole iterations — give me the slice of work."*
- Produces: an iteration file (`iterations/<name>.md`) with tasks, edges, and a backlog lane. Validates every `Product:` against the registry; refuses to invent an unregistered product.

**Brief Author** (Team Leader, Brief Author mode)
- Requires: an intent from the Principal (ideally an existing iteration task row).
- Refuses: a request to implement directly → *"I author the brief, I don't implement. Tell me the goal and I'll write the brief."*
- Produces: a brief per `brief-authoring/SKILL.md` (tier, type, scope, stop conditions, deliverable, optional `Ticket:`/`Product:`).

**Developer**
- Requires: a well-formed brief (has tier, scope, stop conditions, deliverable).
- First action: inspect what it was handed. If it's a loose prompt, not a brief → *"This isn't a brief — it's missing tier / scope / stop-conditions. Get one from the Brief Author first; I don't infer scope from a prompt."* If `Product:` doesn't resolve against the registry → *"Product 'x' isn't registered; fix the brief or run `aeg add-product`."*
- Then: worktree Step 0 (`git worktree add .worktrees/<branch> -b <branch> origin/main && cd .worktrees/<branch>`), do the work, open the PR.
- Done-checklist gains: **the brief text (and `Ticket:`/`Product:` lines, if present) is pasted into the PR body, and the task's iteration row is set to `in-review` with the `PR` column filled.**

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
- Confirms at close-out: issue closed (if one was referenced), branch deleted, decision logged if Tier 3, changelog appended, docs updated, and the task's iteration row flipped to `merged`.
- Flags — does not perform — local worktree removal: the worktree lives on the operator's machine, so the Archivist lists it as a cleanup candidate; the human (or a tool) removes it. The Archivist runs in the cloud and cannot reach the local filesystem.
- Produces: a close-out report listing anything still dangling.

---

## 6. How to invoke a role manually from Claude Code

You don't need any tool to dispatch. In a Claude Code session:

1. Tell the agent its role: *"Act as the Developer. Here is the brief: …"* (or *"Act as the code Reviewer for PR #N."*)
2. The agent reads its role doc (`roles/<role>.md`) and this file, checks its entry gate, and either proceeds or refuses with the language above.
3. When it's done, you move to the next role yourself — you are the orchestrator. (This is exactly the hand-off a tool automates later.)

The brief is the only thing you must prepare carefully. Everything else the agents enforce.

---

## 7. What an automation layer adds (and doesn't change)

A tool can automate the steps 2→6 hand-offs: spawn the Developer in a fresh worktree from a brief, stream its work, unblock it when it escalates, and enforce the dispatch gates in code. It does **not** change the gates, the roles, the brief rules, the iteration model, or the order. If the tool is unavailable, you run the same flow by hand. The flow is primary; the tool is convenience — and AEG never names it.

For the authority model, escalation severities, and tier rules underneath all of this, see `state-machine.md`. For the iteration / Planner / dispatch-gate model, see `iterations/README.md`. For the product registry, see `products.md`.
