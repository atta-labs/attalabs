---
sidebar_title: State Machine
---
# State Machine — the Agentic Execution Governance (AEG) Model

The constitution. This document defines the **Agentic Execution Governance (AEG)** model — the authoritative reference for artifacts, mutation permissions, authority hierarchy, escalation paths, and governance mechanics. AEG is governance plus orchestration of delegated AI execution; it is not project management (there is no product plan, timeline, or resource tracking here).

**AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub/GitLab) as its source of truth for execution state — task status is *derived* from Issue/branch/PR/merge state, never stored. It does not depend on any orchestration tool. Where this document names a specific tool (in this repo, Cetana), it is naming *this repo's* orchestration tool by way of example; AEG itself names no tool, and a tool may know AEG while AEG does not know the tool.

**What AEG governs — and what it does not.** AEG governs the **software-delivery workflow**: turning intent into reviewed, spec-conformant, merged code produced by AI agents, with humans at the gates. Its unit of governance is *the change* — is this AI-written diff planned, reviewed, and merge-worthy? This is a distinct layer from **agent-runtime governance** (the "control plane" category — policy gates on an agent's live actions: *should this running agent be allowed to send this email / hit this API right now?*). That is a different layer, solved by different tools, and AEG neither competes with it nor depends on it; a team that needs runtime action-gating runs such a layer *beneath* its agents, beside AEG. AEG's seam is the dev workflow, derived-from-the-forge, with the human checkpoints that let a team adopt agents without losing visibility or control. State the seam plainly when describing AEG; do not describe AEG in the vocabulary of runtime control planes (pre-dispatch action gates, policy-as-code over tool calls) — that is a different layer and the conflation misleads.

If you are unsure whether an action is permitted, the answer is here. If a role doc and this document conflict, this document wins.

For the prose walkthrough (thirteen phases), see `process.md`. For the tranche/task model, see `tranche-model.md`. For role-specific instructions, see `roles/`. For the role-seam contracts, see `contracts/`.

---

## Section 1: Purpose

The operational model is not role-based. It is a **state transition system**.

Artifacts have states. Roles are interfaces authorized to trigger certain transitions:

```
Artifact class
  → state (draft, ratified, target, superseded, ...)
  → authorized transitions (who can mutate, ratify, retire)
  → escalation path (what happens when a decision exceeds role authority)
```

Roles exist because different decisions require different accountability levels. The Principal is accountable for irreversible (Type 1) decisions. The Planner / Brief Author is accountable for reversible (Type 2) decisions within a ratification window. The Developer executes. The Reviewer (code and security specializations) judges shipped code with fresh context but cannot mutate it. The Archivist closes out.

The conversational role set is: **Principal, Planner, Brief Author, Developer, Reviewer** (plus the non-conversational Archivist). The Reviewer was added to an earlier three-role model; splitting the Planner from the Brief Author is what makes it five. **Planner and Brief Author are two roles** (`roles/planner.md`, `roles/brief-author.md`), each with its own entry gate: the Planner cuts a tranche, the Brief Author authors one task's brief. Architecture and design conversation is work both do with the Principal, not a third seat. Security is a specialization of Reviewer, not a separate role. **Verification (`roles/developer.md` § Verification) is a *phase*, not a fifth role:** it is jointly satisfied by the Developer-agent (the `[agent]` half of the brief's Test Plan) and the Principal (the `[principal]` half), so the role count remains unchanged (June 2026). The per-task **Archivist** named above closes out a single task at merge; a distinct non-conversational role, the **Tranche Archivist** (`roles/tranche-archivist.md`), closes out a whole tranche at Phase 13 — neither is conversational, so both sit outside the conversational role set without changing its count.

**Role seams are governed by contracts.** Where one role hands work to the next (Planner → Brief Author, Brief Author → Developer, Developer → Reviewer, …), what crosses the boundary is defined **once**, in a contract file under `aeg-root/contracts/`, not described twice in two role docs (which drift). A contract is the single source of truth for its seam: the producing role fills it, the consuming role drains it, and the two role docs *point at* the contract rather than redefining it. The first is `contracts/planner-brief.md`; others are added as each seam is modeled. See Section 2 (Class 1) and Section 3.

**A task is a forge Issue, and its status is derived, never stored** (see Section 2, Class 2, and `tranche-model.md` §3). No role writes a status field; transitions are facts about the forge (branch exists, PR open, review decision, merged).

"What can I do?" → the mutation permission matrix. "Whose decision is this?" → the authority hierarchy. "What if I'm stuck?" → the escalation paths. "Is what I'm doing consistent with what was decided?" → the ratified spec for that surface. "What must I hand the next role?" → the seam contract. "Which label goes where?" → the label vocabulary (Section 14).

### One AEG model, at the root. Always orient from there.

There is exactly one AEG model in this monorepo, at the repo-root `aeg-root/` (constitution, flow, roles, skills, contracts, the project registry `projects.md`). It exists nowhere else. **Any agent, executing any task for any project — an app, a package, a library, the monorepo itself — orients from `aeg-root/` first:** it reads the constitution, the role doc, and the active tranche there. It never expects a per-project copy of the model.

Living **state** is held in `aeg-project/` folders: one at the repo root (for monorepo-level tasks) and one per project (`apps/<x>/aeg-project/`, `packages/<y>/aeg-project/`). A task updates the `aeg-project/` slice of each project it touches (one for a single-project task, several for a cross-project task — resolve which via `.vinaya/projects.md`). An `aeg-project/` folder holds state only — never the model — which is what forces every agent back to `aeg-root/` for the rules.

---

## Section 2: Artifact Classes

Every artifact falls into one of five persistence classes. Persistence class determines how long it survives, how it's recovered, and what authority mutates it.

### Class 1: Repo files (canonical, git-tracked)

**What:** Specs (`apps/*/specs/*.md`), skills (canonical `aeg-root/skills/*/SKILL.md`, with a generated agent-surface view e.g. `.claude/skills/*`), **role-seam contracts (`aeg-root/contracts/*.md`)**, agent definitions, AEG model + state docs (`aeg-root/*.md` + `aeg-root/{roles,tranches,contracts,diagrams}/*.md` for the model; `aeg-project/*.md` for the state), source code, scripts, CI workflows.

**Persistence:** Survives anything short of repo deletion. Git history preserves every mutation with authorship and timestamp.

**Create:** PR merged to main by Principal (or delegated merge for Tier 0/1).
**Mutate:** PR opened by Developer, reviewed by Reviewer (code + security) and Brief Author (specs) and Principal (code), merged by Principal.
**Read-only:** All roles always.

**Contracts change as a unit.** A role-seam contract (`contracts/*.md`) is the single source of truth for what crosses a role boundary. Editing it is a **Tier 3** change, because it alters a cross-role interface; and the producer and consumer sides change **together** — you cannot change what one role emits without, in the same PR, updating what the next role consumes. The two role docs on either side reference the contract; they never redefine the seam, so they need no field-level edit when the contract's *prose* changes, but the same PR must confirm both still point at it and match. (The first contract is `contracts/planner-brief.md`: Planner produces, Brief Author consumes.)

### Class 2: Forge objects (execution state + audit)

**What:** Issues (a task **is** an Issue — identity + metadata: the `vinaya/tier:*` label, the `Project:` field, ticket link, dependency/conflict references — see Section 14 for the label vocabulary and the field-vs-label rule), Pull Requests, review decisions, CI run results, Issue/PR comments.

**Persistence:** Survives unless deliberately deleted. Treated as permanent for operational purposes.

**This is where execution status lives — derived, not written.** A task's status is computed from forge facts: Issue open (assigned or not), no branch = `todo` (all open tranche tasks are at minimum `todo` — backlog is project-level only); branch `task/<tranche>/<n>` exists, no PR = `in-flight`; PR open = `in-review`; PR `reviewDecision: CHANGES_REQUESTED` = `changes-requested`; merged = `merged`; a `vinaya/blocked` label = `blocked`. A **closed Issue with no merged PR never resolves to `todo`**: the derivation reads GitHub's native `stateReason` — `NOT_PLANNED` = `dropped` (legitimately abandoned, never done), anything else (`COMPLETED` or no reason) = `incoherent` (done-but-unprovable or a broken close, surfaced for a human, never auto-reopened). The one law: a task-Issue reaches *done* only via a merged PR that names it (`Closes #N`); a `COMPLETED` close without that merge is incoherent, not done. No role sets a status field — opening the branch/PR and merging are the transitions. (The canonical status-derivation table is `tranche-model.md` §3.) **These rules are code-owned** (`state-machine-v1` task 1, #613): they live as an ordered, pure-data list in `packages/aeg-core/src/state-machine-model.ts`, which `deriveStatus` executes directly rather than restating as an `if`-chain — the discipline, one list read by both the logic and the rendered docs so the two cannot drift. Order is load-bearing and each rule records why its position matters: `blocked` wins over everything, and the reopened-after-merge rules must precede the plain `merged` rule or a reopened Issue would read `merged` forever off a stale fact. The label vocabulary the mechanism reads is code-owned the same way, in `packages/aeg-forge-state/src/labels.ts`; derivation itself never touches label *strings* — the one label that matters arrives pre-read as the `blockedLabel` fact.

**The provenance block is a Class 2 object too — a close-out projection, not stored status.** At close-out the Archivist assembles a provenance record (task → intent → reviews → model → merge metadata) and posts it as a comment on the **merged** PR. It is *assembled from facts the merge already froze*, written once, append-only — a projection of frozen forge facts in exactly the way derived status is a projection of live forge facts. It is therefore explicitly **not** the forbidden "stored status" of `tranche-model.md` §9: it lives on the merged PR (never in the tranche file or the Issue), it records history (not current state), and nothing ever updates it. See `roles/archivist.md` and §13.

**Create:** Brief Author (Issues, in Planner mode); Developer (PRs); Reviewer (review verdicts/comments); Archivist (advisory PR comments + the provenance block); any role (Issue comments with appropriate authority).
**Mutate:** Labels — the closed vocabulary in Section 14 (`vinaya/tier:*`, `vinaya/blocked`, `vinaya/needs:*-input`, `vinaya/needs:brief-correction`, `vinaya/override:docs`), applied by the role and at the transition Section 14 specifies. **No `status:*` labels** — status is derived. Issue/PR body — the brief lives in the **PR body** (frozen after open — Section 7); the Issue body holds metadata only, never the brief, never planning fields (priority/estimates), which a required template + CI reject.
**Read-only:** All roles always.

### Class 3: Orchestration-tool runtime (ephemeral, optional)

**What:** If an orchestration tool is used, its runtime state — static config, append-only event logs, IPC files. No such tool is in use in this repo today — the orchestrator that once filled this slot was retired and deleted. **This class only exists when a tool is in use; AEG does not require it.**

**Persistence:** Survives process restarts; lost on machine reinstall; recoverable from the tool's backup.

**Create / mutate:** the orchestration tool, per its own protocol. The Principal edits the tool's config directly.
**Read-only:** All roles can inspect; the event log is human-readable for monitoring.

This is a tool detail, not part of the AEG model. Nothing canonical depends on it.

### Class 4: Worktrees (per-task isolation)

**What:** `.worktrees/task/<tranche>/<n>/` — a full repo checkout on branch `task/<tranche>/<n>`.

**Persistence:** Survives as long as the directory exists. Manual cleanup by the Principal; the Archivist flags merged worktrees as candidates.

**Create:** The Developer's worktree-first pre-flight Step 0 (manual flow), or an automation layer at dispatch (it creates the same worktree). Branch convention `task/<tranche>/<n>` is what lets any role derive a task's status from the forge.
**Mutate:** Developer works in the worktree — commits, file changes, test runs.
**Retire:** Principal runs `git worktree remove` after merge.
**Read-only:** All roles can inspect.

### Class 5: Conversation logs (ephemeral)

**What:** Chat sessions (any chat or coding-agent surface); an orchestration tool's progress events.

**Persistence:** Ephemeral; not reliably retrievable across sessions.

**Create:** Any conversational agent.
**Promote:** Brief Author promotes decisions made during conversation into the spec for the surface they govern (Section 6); Principal ratifies Type 1 promotions.
**Cannot mutate:** No role retroactively edits conversation logs.

---

## Section 3: Mutation Permission Matrix

Rows = artifact types. Columns = roles. "—" means no authority. The Reviewer is absent as a mutation authority (it has read + PR-review-comment authority only — see the subsection after the table).

| Artifact | Principal | Planner / Brief Author | Developer | Archivist |
|----------|-----------|-------------|-----------|-----------|
| **Conversation logs** | Flags for retention | Writes during chat; proposes what belongs in the pull request | Reads only | Cannot mutate |
| **Tranche topology files** (`tranches/*.md`) | Approves PR | Writes (Planner mode) at plan time — task→issue map + edges + grouping; **no status, no PR numbers, no dates** | — | Flags execution-metadata creep in drift cron |
| **Role-seam contracts** (`contracts/*.md`) | Approves PR; Type 1 ratification (a contract is a cross-role interface) | Proposes via PR; changes producer + consumer sides together (Tier 3) | — | Flags a role doc that contradicts its contract in drift cron |
| **Task Issues** (identity + metadata) | Approves merge | Creates (Planner mode); metadata + Planner's rationale — no brief, no status, no planning fields | Reads; references via `Closes #N` | Validates template (no forbidden fields) |
| **Briefs (dispatched)** | Can amend via reply to escalation | Can amend via reply to escalation — logged as an event, NOT a brief edit | Reads only — brief is frozen after dispatch; escalate if wrong | Cannot mutate |
| **Briefs (pre-dispatch)** | Approves the brief | Writes the brief just-in-time per the `brief-authoring` skill, consuming the planner-brief contract; pastes to Developer (lands in PR body) | — | Validates structure; flags malformed (`vinaya/needs:brief-correction`) |
| **Specs** (`apps/*/specs/*.md`) | Approves PR; ratifies a spec-only change | Coherence review on PR; can open spec-only PRs | Writes in PR per brief scope | Validates cross-references; flags stale specs in drift cron |
| **Skills** (canonical `aeg-root/skills/*/SKILL.md`) | Approves PR | Coherence review | Writes in PR per brief scope | Flags stale skill references in drift cron |
| **Agent defs** | Approves PR | Coherence review | Writes in PR per brief scope | Flags stale agent references in drift cron |
| **`state.md`** | Approves PR | Writes in PR | Flags state changes needed in PR description | Updates per-project state at close-out, for every project the task listed |
| **Per-project backlogs** (`apps/*/specs/*-backlog.md`) | Approves PR | Writes (held/future items — out of the flow) | — | — |
| **`coordination.md`**, **`state-machine.md`** | Approves PR; final authority on system-level rule changes | Proposes changes via PR | — | Flags inconsistencies in drift cron |
| **`thinking.md`** | Reads | Writes freely in any Brief Author session (best-effort, optional) | Reads | Flags if untouched >7 days |
| **Per-project state / lessons log** (pinned Issues) | Approves/rejects/defers items at windows | Appends items; marks resolved after Principal action | Appends via escalation (`severity: product`) | — for the per-task Archivist; the **Tranche Archivist** updates it at Phase 13 close-out (`update-pinned-state-issue`, `roles/tranche-archivist.md`) |
| **Source code** | Merges PR | — | Writes in PR per brief scope; opens PR | — |
| **Forge labels** (the Section 14 vocabulary) | Applies `vinaya/override:docs` (Principal-only) | Applies `vinaya/tier:*` (Planner, at cut) + `vinaya/needs:*-input` / `vinaya/blocked` (by hand or via automation) | Applies `vinaya/needs:*-input` / `vinaya/blocked` (by hand or via automation) | Applies `vinaya/needs:brief-correction`; asserts `vinaya/tier:*` label == PR-body `Tier:` (drift cron) |
| **Task status** | — | — | — | — *(nobody writes it — derived from the forge)* |
| **Provenance block** (on the merged PR) | Reads (audit) | Reads (audit) | — | Assembles + posts at close-out (append-only; from frozen facts) |
| **Token ledger** (`tranches/<name>.tokens.md`) | Fills a previously-`—` claude.ai cell from the UI usage figure (forward-reference exception, §13); approves PR | Reports tokens at turn-end, does not append — Planner mode in the plan PR (or planning report if none), Brief Author mode in its report | Reports exact tokens in the PR body ("Token report" section) at PR open + one per re-push (terminal: `/cost`); does not append the row itself | **Sole writer** of the ledger — collects every role's token report for the task and appends all rows at close-out; flags missing-row drift |
| **Test Plan execution** (Verification phase, on the open PR) | Runs the `[principal]` half (auth-gated/key-dependent/visual items) in a browser and ticks those checkboxes on the PR | — | Runs the `[agent]` half (scriptable items) against the booted app and posts evidence comments on the PR; reports `[agent]` failures back to itself via new commits on the same branch | Flags an unticked checkbox / missing evidence comment as a merge-gate failure at close-out time (won't happen if discipline holds — merge is gated on ticked boxes) |
| **Worktrees** | Removes after merge | — | Works in (created at dispatch) | Flags merged worktrees as cleanup candidates |
| **Orchestration-tool runtime** (if used) | Edits config; reads (audit) | Reads | Appends events via the tool | — |
| **CI/forge Actions** | Approves workflow changes via PR | Proposes workflow changes via PR | — | Runs as forge-CI automation |

**Token ledger — a second read path (`aeg-forge-state-v1` task 4b, #445):** the table row above still governs who *writes* `tranches/<name>.tokens.md` (the Archivist, sole writer) — that is unchanged. AEG Studio's tranche page, however, no longer *reads* that file to render totals: it re-derives the Developer/Reviewer/Security rows live from the task's own merged PR(s) (`packages/aeg-core/src/parse-token-report.ts`, `apps/vinaya/web/src/lib/forge/fetch-token-ledger.ts`) — narrower than the file (it cannot recover the Archivist's own row or the Planner's report; see `tranche-model.md` §12). The file is not deleted and remains the durable, complete record.

### Reviewer & Security review authority (extended)

The Reviewer role has two specializations — code review (`roles/reviewer.md`) and security review (`roles/security.md`) — and one narrow authority profile:

- **Read:** all Class 1 (repo) and Class 2 (forge) artifacts, plus the brief (in the PR body) and the PR diff. **Including the `Project:` spec(s) in `apps/*/specs/`** — the code Reviewer checks the diff for **spec-conformance**, not only brief-conformance: a diff can satisfy its brief and still contradict or drift from the project's specced behavior, and catching that gap is the Reviewer's job. A spec **contradiction** is a BLOCKER; **drift** is a MAJOR finding; if the diff is right but the spec is stale, that is a `severity:strategy` escalation, not a failure. This adds **no new persistent artifact** — it reads the project spec that already exists. Always read-only on canonical artifacts.
- **Write:** PR review verdicts and review comments only (a Class 2 object) — **nothing to disk**. The verdict is the structured block in the role doc (`APPROVE | REQUEST CHANGES` for code, with a `SPEC CONFORMANCE` line; `PASS | FAIL` for security). A REQUEST CHANGES sets the PR's review decision, which is the derived `changes-requested` status — the Reviewer writes no status field. **Plus a one-line token report** in the same verdict comment — numeric cells `—` (the claude.ai surface can't self-see its own count). The per-task Archivist reads this report and appends the ledger row (`tranches/<name>.tokens.md`) at close-out (§13 append-only artifacts; `tranche-model.md` §12).
- **Cannot:** edit code, specs, skills, PM docs; mutate labels; or merge. The Reviewer reports; the Developer remediates; the Principal merges.
- **Independence:** fresh context (a separate invocation), never reviewing work it authored. This is the whole point.
- **Escalation:** a finding that exceeds review authority is marked `[ESCALATE] severity:strategy|product` and routed to the Planner or Principal.

Because the Reviewer never mutates a canonical artifact, it has no column. Its position is Phase 10 (`process.md`): code-reviewer pass → security pass → Principal code review → Brief Author spec review → **Phase 11 Verification (`roles/developer.md` § Verification)** → merge.

---

## Section 4: Authority Hierarchy of Truth

When two artifacts conflict, which wins? Depends on **audit mode** vs **planning mode**. Note that *live task status* is never in this hierarchy — it is derived from the forge, which is definitional, not a claim to be ranked.

### Audit mode — "What is currently true?"

Used when verifying state, resolving contradictions, running verify-docs, post-mortems. Ordering (highest first):

1. Ratified specs (`Status: ratified`)
2. Shipped code (main — what actually runs)
3. Aspirational specs (`Status: target`)
4. PM docs (tranche files) plus per-project pinned state/lessons Issues — non-derivable operational facts / plan topology (active status derived from forge)
5. Skills + `thinking.md`
6. Briefs / Issues / PR descriptions — intent at time of writing
7. Conversation logs / tool runtime logs — lowest

A contradiction (a ratified spec says X, shipped code does Y) → the Archivist opens a contradiction Issue (Section 11), which blocks new Tier 3 work on the affected subsystem until resolved.

### Planning mode — "What should we change it to?"

Used when designing future state, writing briefs, planning tranches. Ordering:

1. Target specs (`Status: target`) — intent governs the next mutation
2. Ratified specs (current accepted state)
4. Shipped code (what we're changing from)
5. PM docs — current priorities + the tranche's plan
6. Skills + `thinking.md`
7. Briefs / Issues / PR descriptions — prior intent
8. Conversation logs — lowest

**Mode selection:** "currently true?" → audit. "change it to?" → planning. verify-docs runs in audit mode; brief authoring and tranche planning run in planning mode.

---

## Section 5: Spec Ratification Mechanism

A spec file exists in one of four states:

| State | Header | Meaning | Authority rank (audit) |
|-------|--------|---------|------------------------|
| Draft | `Status: draft` | Intent, not commitment | Below shipped code |
| Target | `Status: target` | Aspirational future state | Below shipped code (planning rank: above code) |
| Ratified | `Status: ratified` | Committed decision | Above shipped code |
| Retired | `Status: retired` | Historical record | Below all active artifacts |

**Ratified iff both:** (1) the file carries the metadata block (`Status: ratified` / `Ratified on:` / `Ratified by:`); and (2) the pull request that introduced or last modified it was approved by the Principal. Otherwise it is `draft`.

Most specs are `draft` — no deliberate ratification pass has been done. Future PRs ratify as appropriate.

> Note: the Reviewer's spec-conformance check (§3) reads the project spec **as written** — at whatever ratification state it currently holds. A `draft` spec is still the project's stated intent and is checked against; a contradiction with a `ratified` spec is the most serious. The Reviewer never edits the spec; if it's wrong, that's an escalation.

---

## Section 6: Recording why

The harness requires no standing record of decisions. A change's reasoning lives in the pull
request that makes it — frozen at merge, dated, attributed, and read by both
the reviewer and the close-out. A rule that still binds belongs in the spec
for the surface it governs, where a doc-ownership binding keeps it current.

A team that wants a standing record of past choices is free to keep one in
whatever form suits it. Nothing here reads it, requires it, numbers it, or
checks its shape.

## Section 7: Escalation Paths

When a Developer reaches a decision not covered by the brief, it escalates through the escalation mechanism — a manual escalation note, or, if dispatched by an automation layer, that layer's request-input mechanism — tagged with a `severity` that routes it. Each severity has a matching `vinaya/needs:*-input` label (Section 14).

### Three severity levels

**`severity: execution`** — routine, answerable by the Brief Author in Brief Author mode. ("Library X is deprecated"; "null or throw?"; "I need an unanticipated flag.") Adds label `vinaya/needs:execution-input`; the Brief Author replies; the Developer resumes.

**`severity: strategy`** — which design path to take; a question for the Brief Author's design judgment rather than its dispatch work. ("The brief's approach A has a structural issue — switch to B?"; "this touches an undiscussed area"; "the diff is right but the spec is stale.") Adds `vinaya/needs:strategy-input`; same role, different question.

**`severity: product`** — requires a Principal decision. Rare; reserved for Type 1 decisions discovered during execution. Adds `vinaya/needs:principal-input`. If the Principal is present, they decide and reply; if not, the item stays labeled `vinaya/needs:principal-input` and the Developer terminates, resuming via a follow-up dispatch after the window.

While blocked, the task carries a `vinaya/blocked` label (the one status with no native forge fact). The Reviewer uses the same severity vocabulary for `[ESCALATE]` findings.

### Type 1 decisions during execution

Type 1 (irreversible) decisions cannot be self-ratified by the Brief Author in a solo session. They ALWAYS get the `vinaya/needs:principal-input` label unless the Principal is actively present (has replied to an escalation in this session). For labeled items, the Developer terminates after acknowledgment and resumes after the window.

### Emergency override

If the brief itself is wrong in a way that blocks all paths, the Developer escalates with `severity: execution` and a `brief_amendment_needed` flag. The Brief Author issues an amendment (logged as an event, not a brief edit — briefs are frozen) or kills the task. The original brief is preserved as the audit record.

---

## Section 9: Tiered Documentation

Every piece of work is assigned an impact tier; the tier determines required documentation before the PR is ready. The tier is declared two ways that must agree — the `Tier:` field in the PR body (the binding source of truth, read by verify-docs) and the `vinaya/tier:*` label on the Issue (the scannable projection). Section 14 defines the field-vs-label rule and the sync obligation.

**Tier 0 — Trivial.** Isolated, no API/contract changes, no patterns shifted. Required: code comments where non-obvious, PR description following template, declare `Tier: 0` in the PR body.

**Tier 1 — Implementation.** A meaningful feature/fix within existing architectural contracts. Required: Tier 0 + specs updated, skills updated if conventions shifted, `verify-docs --pr` passes.

**Tier 3 — Project/roadmap.** No Tier 2 (deliberately eliminated; disputes go to Tier 3). Qualifies when ANY of: introduces/breaks public contracts (including a role-seam contract in `contracts/`); changes roadmap sequencing or project direction; requires Type 1 decisions; affects more than one project boundary; changes persistence/storage semantics; changes escalation/governance rules; requires Principal ratification to continue. Required: Tier 1, state docs updated if state changed, `docs-index.md` regenerated, and the reasoning stated in the pull request. Merge during a ratification window.

**Spike exception:** `spike: true` reduces docs to typecheck + lint, with what was tried and learned recorded in the pull request. Spike code does not merge.

**Tier detection:** when in doubt between 1 and 3, choose 3 — the cost of excess docs is low; under-documented architectural change is how the BYOK gap happened.

**Canonical PR-body form (including the exact `Tier:` syntax).** The verbatim, copy-pasteable PR-body template — Summary / Test plan / Scope with `**Tier:** N` — lives in [`roles/developer.md` § PR body — canonical form](roles/developer.md#pr-body--canonical-form). That section is the single source of truth for the field shape `verify-docs` accepts; do not freestyle the PR body or maintain a parallel template elsewhere (not in `.github/PULL_REQUEST_TEMPLATE.md`, not in an agent-runtime skill).

**Tier orthogonality with the coherence seam (Section 15).** The tier system above asks *"how much documentation does this class of work require?"* — a class-level question. The coherence seam asks the orthogonal *"which specific docs does **this** code change make incoherent?"* — a per-change question, answered from `.vinaya/doc-owners`. A Tier-0 PR with no bound code surface need not touch any doc; a Tier-0 PR that edits a code surface bound in `doc-owners` MUST update that doc, acknowledge it via `Doc-ack:` (URL pointers only), or have a principal apply the actor-verified `vinaya/waiver:docs` label. They are different axes; both gates run; both must pass.

---

## Section 10: Ratification Windows

1-2 daily windows batch governance decisions so the Principal isn't continuously interrupted.

**Batches at a window:** Type 1 decisions; Tier 3 PR merges; `severity: product` escalations; PENDING Type 2 decisions.

**Does NOT wait:** Tier 0/1 merges (anytime); `severity: execution`/`strategy` escalations (Brief Author resolves); Type 2 decisions made with the Principal present.

**Cadence:** the Principal sets the times; the queue assumes no specific schedule. Items are labeled `vinaya/needs:principal-input`, not appended to a file. **Brief Author responsibility:** before the window, ensure labeled items carry enough context to decide without follow-up; after, remove the label and update artifacts to reflect what was ratified.

---

## Section 11: Contradiction Mechanism

The Archivist monitors for contradictions — shipped code and a ratified spec disagreeing.

**Triggers:** the drift cron (spec dates vs referenced code dates); post-merge semantic-relatedness checks; or a direct report by any role.

**Entry format:** a forge Issue titled `Contradiction — <topic>`, labeled `vinaya/incoherent`, listing the conflicting artifacts, its severity and strategy, and `Owner: Brief Author`. It auto-escalates as `severity: strategy` and blocks new Tier 3 work on the affected subsystem until the Issue closes — the resolution is the closing comment.

---

## Section 12: Enforced vs. Trusted Discipline

AEG runs along an **advisory → enforced gradient**. A mechanism can be *advisory* (it produces a finding; nothing blocks) or *enforced* (CI/gates block merge). A repo tightens mechanisms from advisory to enforced one at a time — it does not flip everything at once. **Observe mode is the floor of this gradient:** every mechanism advisory, nothing enforced (see below). Full AEG is the ceiling: the gates below enforced.

### Observe mode — the advisory floor

The lowest-commitment way to run AEG: read-only over a team's existing process. The roles produce their outputs — Reviewer/Security verdicts, the Planner's topology, the Archivist's provenance — but **none of it blocks a merge**; a finding is a comment, not a gate. Status is still **derived** from the forge (read-only); AEG writes nothing it wouldn't write in full mode except that the gates run **report-only** (they print what *would* fail). This is the "monitoring, not restriction" on-ramp (`aeg-manual-flow.md` §8); a team climbs from here by promoting one gate at a time to enforced. It is also the deliberate on-ramp for a team **adopting agents for the first time** — the visible-but-non-blocking mode that lets a cautious team see exactly what agent work is doing before handing it any authority. That adoption-on-ramp is AEG's least-crowded property; describe AEG's value to a new team in those terms (visibility and trust), not in the vocabulary of runtime control planes.

### Enforced (CI blocks merge)

- **Tier-appropriate documentation** — the `verify-docs` script checks the PR's tier has the corresponding artifact changes; fails CI if missing. **Real**, not a stub. The blocking gate now runs as the `Tier-appropriate documentation gate` step of the consolidated **AEG gate suite** job in `.github/workflows/forge-lifecycle.yml` (`verify-docs.yml` deleted — consolidated by task 31, #395). The gate also runs locally (this repo: `bun run verify-docs --pr`). (In observe mode this runs report-only.)
- **Coherence seam — code→doc coverage (C5)** — the same `verify-docs` script reads `.vinaya/doc-owners`, glob-matches changed code files, and fails CI if a matched binding's doc is not in the diff (or, for URL pointers, not acknowledged via `Doc-ack:` in the PR body). The escape hatch is a single PR-wide `vinaya/waiver:docs` label whose labeling timeline event's actor is a configured principal — a forge-authenticated human act, never a parseable string, and never per-binding. At the `.husky/pre-push` ring-0 gate specifically, where a branch's first push has no PR yet for such a label to exist on, an owned-doc violation is **warn-with-declared-intent, not a hard block**: the push always succeeds, and the printed message states plainly that ring 1 stays red until a principal applies the label or the doc is updated. `Doc-ack:` (unaffected by that hatch) is still read from the branch's own commit messages at that same chokepoint before a PR exists (the trailer-fallback mechanism, kept for this one grammar). For a pre-authoring dry run via `verify-dispatch --simulate`, before any commit exists at all, `verify-docs --push` also accepts a `PR_BODY_FILE` env var — a local path to the drafted PR body — as an equally valid source for the same `Doc-ack:` lines. **Dormant when `.vinaya/doc-owners` is absent or no glob matches** — the gate has no opinion until the repo teaches it one. **Real**, no stub period. Full seam defined in Section 15.
- **Commit-message format** — `commitlint` (reusing the same `commitlint.config.js` Husky runs locally) runs against every commit in the PR range. Real, installed at `.github/workflows/conventions.yml::commit-lint`. Closes the gap where API/MCP writes, direct pushes, and hand-merges bypass Husky entirely (evidence: pre- main contains several non-conforming commit headers authored via the API). **Enforcement substrate (this repo — private/free plan, branch protection unavailable):** CI shows red/green; the T9 merge-gate hook (merged in #255) blocks agent merges of red-CI PRs; local Husky/commitlint hooks enforce for agent writes running locally.
- **Biome lint/format** — `bun run format-and-lint` (i.e. `biome check .`) runs on every PR. Real, installed at `.github/workflows/conventions.yml::biome`. Same Biome config as lint-staged enforces locally — local and CI cannot diverge. Same enforcement substrate as above (CI red/green + T9 hook + local lint-staged).
- **Forbidden colors in UI** — `scripts/check-forbidden-colors.ts` (diff-scoped) runs on every PR. Real, installed at `.github/workflows/conventions.yml::no-hardcoded-colors`. Encodes the four pattern groups in `.claude/skills/ui-theme-tokens/SKILL.md`: Tailwind palette classes, arbitrary color brackets (`bg-[#…]`, `text-[oklch(…)]`), absolute colors (`text-white`, `bg-black`), and inline-style color literals. Scans only added lines, so it blocks new violations without forcing a "boil the ocean" legacy cleanup. Same enforcement substrate as above (CI red/green + T9 hook + local hooks).
- **Typecheck, tests** — standard CI gates; always blocking.
- **Issue template / no forbidden fields** — a required Issue template + a CI check reject planning metadata (priority/estimates/points) on task Issues, keeping them execution-only.
- **Brief validation** — the Archivist's `brief-validation` job runs `packages/aeg-core/bin/verify-brief.ts` against the PR body and checks presence of every required brief section (Tier, `For:` model attribution, `Project:` — both read from the PR body's header block, before the first `##` heading, the same region the post-merge Archivist's provenance assembly reads — tagged Test Plan, surface map, doc-update list, worktree Step 0, stop conditions, autonomy clause, `Closes #N`); flags malformed briefs (`vinaya/needs:brief-correction`) and fails CI. **The trigger is the body, not the branch (`fix/brief-gate-nontask`):** the gate runs when the branch is `task/<tranche>/<n>` **or** the body is brief-shaped (`isBriefShaped` — ≥2 of surface map / doc-update list / stop conditions / autonomy clause, matched on `stripCode`'d text so a brief *quoted inside a fence* stays exempt). Bodies that are neither still bypass — that exemption is for an ordinary non-AEG PR (a one-line dependency bump) which carries no brief and must not be forced to grow one. The old branch-only bypass was the wrong proxy for it: a standalone `fix/*` brief **is** a brief, and it skipped every section check — confirmed live on `fix/studio-tranche-href`, which shipped with no §7 documentation-update list because `checkDocUpdateList`, the checker that exists for exactly that, never ran. `Closes #N` remains **task-branch-only** (`BriefSectionsOptions.requireClosesN`): a standalone fix brief has no task Issue to close, and a `plan/*` PR is *forbidden* to carry one by the plan-PR guard below — requiring it there would make the two gates jointly unsatisfiable. The same validator also runs at **authoring time** via `bun packages/aeg-core/bin/verify-brief.ts --body-file <brief.md>`, before a PR or even a branch exists, so a Brief Author gates a brief before dispatch rather than after the Developer has done the work (`skills/brief-authoring/SKILL.md` protocol step 4); with no `BRANCH`, the branch is read from the brief's own Step 0 `git worktree add … -b` line. **Includes the plan-PR Closes guard**: a `plan/*` branch whose PR body carries `Closes #N` fails CI before the non-task bypass even runs — a plan PR creates Issues, it does not resolve one (`roles/planner.md`); this closed a confirmed pattern of plan PRs prematurely closing task Issues on merge (#294→#293, #298→#297, #288→#287). **Real**, now the `Brief Validation` step (9/9) of the AEG gate suite job in `.github/workflows/forge-lifecycle.yml` (moved out of `archivist.yml` — task 31, #395). Presence-only — it cannot judge whether a Test Plan item is truly scriptable or whether a declared `unit-tests-only` is justified by the surface map; those remain Reviewer + Verification judgment. Same enforcement substrate as above.
- **Per-task Archivist close-out** — `.github/workflows/archivist.yml::post-merge` (`packages/aeg-core/bin/archive-task.ts`) runs on every push to `main`, resolves the merge commit's PR via `gh api repos/{owner}/{repo}/commits/{sha}/pulls`, and — for task-branch PRs only — assembles and posts the Archivist provenance block (`roles/archivist.md` item 8) and explicitly closes the task's Issue, confirming the closed state before exiting. Idempotent **per PR**, not per Issue (an Issue can legitimately accrue multiple merged PRs over its life; idempotency never spans PRs): skips silently if the PR already carries a provenance comment. Skips silently on non-task branches (`plan/*`, `fix/*`, …). Fails loud (non-zero exit) on any `gh`/permission error — never a silent no-op. Real, installed with `contents: read`, `issues: write`, `pull-requests: write` permissions. Does not automate the Tranche Archivist or items 2–7 of per-task close-out (docs coherence, per-project state, `docs-index.md`, token ledger) — those remain dispatched-Archivist judgment work.
- **Manifest integrity** — `verify-docs --full` and the coherence oracle validate the doc-owners manifest: pointer existence (M1), glob syntax (M2 advisory), and duplicate globs (M3). There is no decision-number sequencing: the log it validated is gone.
- **Closes #N gate** — task-branch PRs must declare `Closes #<its-issue>` in the PR body; absence fails CI. Non-task branches bypass this forward direction automatically. Real, installed at `.github/workflows/forge-lifecycle.yml::closes-n-gate`. Same enforcement substrate as above. **Forge-native-tranche fix (`fix/closes-n-forge-native`):** the gate's scoped `loadTrancheFiles(null, onlySlug)` call discovers which tranches exist by listing `aeg-root/tranches/*.md` filenames — a tranche with zero file (any of task 7/#431's forge-native cutovers: `vinaya-studio-v1`, `vinaya-cli-v1`, `herald-hardening-v1`) never entered that enumeration, so `deriveOrFallback` was never invoked for it despite already being fully Milestone-capable, and the gate failed every such PR with a misleading "no topology file found." Fixed by falling back to a direct forge derivation (`findMilestoneForSlug` + `deriveOrFallback`) when the requested `onlySlug` isn't found via files, gated on an actual open Milestone existing so an unrecognized branch slug still fails honestly — the scoped-path counterpart to `verify-dispatch.ts`'s `otherActiveTrancheSlugs` fix (PR #476). **Reverse direction (`fix/closes-n-reverse`):** a `Closes #N` that resolves to a real AEG task Issue (title matches the `[<tranche-slug>] <task-id>...` convention and carries a `vinaya/tranche:<slug>` label) now requires the branch to actually be named `task/<tranche-slug>/<task-id>`, regardless of what the branch itself is called — closing the blind spot that let `feat/vinaya-landing-v3` implement a real task Issue with zero forge-visible status. One batched forge query (`fetchTaskIssueRefs`) resolves each referenced Issue's task identity before `checkClosesN` runs. **Code-span hardening (`fix/closes-gate-hardening`, #616):** both the pre-merge gate (`checkClosesN` in `brief-validation.ts`) and the coherence-side parse (`extractClosesReferences` in `coherence-checks.ts`) now `stripCode` the body before matching the closing keyword, as GitHub's own auto-close parser ignores `Closes #N` inside a code span or fenced block. Inline spans of **any backtick-run length** are covered (`` `x` ``, `` ``x`` ``, …) via CommonMark's `(`+)…\1` matched-run rule — the double-backtick form was a false-green in the first cut (peeled as two empty spans, PR #617 review). Fenced blocks are matched by a line scanner that pairs a fence with its own closer by **character and run length**: `~~~` tilde fences, info strings (```` ```js ````), and runs longer than three (```` `````` ````) all strip correctly, and an unclosed fence runs to end of body as GitHub renders it — the earlier `` /```[\s\S]*?```/g `` regex missed all three (PR #617 security pass). The keyword set matches GitHub's own: `close`/`closes`/`closed`, `fix`/`fixes`/`fixed`, `resolve`/`resolves`/`resolved`. Before this, a body whose only `Closes #N` was backticked passed the gate **green** yet merged **without** closing its Issue (stranded #600/PR #608 and #601/PR #611, then red every open PR via A3 `auto-close-misfire`); "verify-docs green" now implies "GitHub will auto-close" for fenced + inline-code forms. 4-space **indented** code blocks are stripped too, conservatively: a ≥4-column-indented run counts as code only when it follows a blank line *and* is not inside a list — since within a list item that indentation is the item's own content indent, which GitHub *does* auto-close (blanking it would be a false-red, the brief's over-strip stop condition). The strip runs on the **whole body, before any region is sliced out of it** — never on a slice. Every rule in it is block-structural (a fence pairs with its own closer; an indented run is code only after a blank line and outside list context), so a fragment strips differently from the same text in place: stripping the sliced `AEG:CLOSES` region blanked an anchor indented inside a list item — list content GitHub *does* auto-close — and the Archivist's `extractIssue` returned no Issue, stranding it on merge exactly as before. Markers are HTML comments and survive the strip, so selecting the region from stripped text loses nothing and subsumes the decoy protection: a decoy anchor inside code never survives to be sliced. The same grammar governs `maskCode`, the index-preserving variant `anchoredRegion` runs to find the `AEG:*` markers themselves — it is **upstream** of every `stripCode` call, so while it stayed on the naive fence/inline regexes a decoy `AEG:CLOSES` anchor inside a tilde fence, a ≥4-backtick fence, a double-backtick span, or an indented block won the region outright and the gate resolved a **wrong** Issue number (worse than the strandings above: the post-merge Archivist's `extractIssue` would explicitly close an unrelated Issue). Both now delegate to one pair of scanners, differing only in what they emit per code line — nothing for `stripCode`, same-length filler for `maskCode` — so a divergence is a compile-level impossibility rather than a convention. This hardens all five anchored fields (`CLOSES`, `PROJECT`, `TIER`, `PREMISE`, `TEST-PLAN`) at once, not just the closing reference. `stripCode` normalises `\r\n`/`\r` to `\n` before any of these scanners run: the fence scanners anchor per line, and JS's `.`/`$` never match `\r`, so a CRLF body opened no fence at all and let a fenced `Closes #N` walk free — the same false-green along a new axis, and it hit exactly the web-UI-authored bodies this CI backstop exists for (HTML normalises textarea newlines to CRLF on submit). The closing-keyword separator is **bounded** (`\s{0,8}:?\s{0,8}`, identical in both parsers): two adjacent unbounded `\s*` groups backtrack quadratically on `closes` + long whitespace + no `#` — ~2.0 s at GitHub's 65,536-char body cap, run twice on the fail path — where the bound is 0.1 ms. **Known residual:** a genuine indented code block *nested inside a list* is therefore left unstripped — the deliberately safe direction of that trade. A `Closes #N` surviving only inside code fails with an actionable message pointing at a bare reference in the `AEG:CLOSES` anchor. `stripCode` is the one shared stripper, exported from `anchored-region.ts` (no duplicated regex).
- *(The practitioner-facing map of every enforcement mechanism — prevention, detection, audit — lives in `aeg-root/enforcement.md`; this section remains the normative gate registry.)*
- **Tool-layer forge gates** — the earliest enforcement point: a PreToolUse hook (`.claude/hooks/check-forge-gates.sh`, wired in `.claude/settings.json`) denies raw `gh pr create`/`gh pr edit --body*`/`gh issue create`/`gh issue edit --body*` (and `gh api` creation POSTs), directing agents to the validated wrappers `packages/aeg-core/bin/open-pr.ts` (runs verify-brief + verify-docs `--pr` + the Closes #N gate locally, calls `gh` only on green) and `bin/open-issue.ts` (a task Issue with a `vinaya/tranche:*` label must carry the full eight-field Planner rationale — `checkIssueRationale`, planner-brief contract, **and pass three content checks on what those fields say, `checkBlastRadiusScope` (the declared surface may not reach a shared collision domain from `.aeg/packages` that no declared project owns, absent a second project or a `blast-radius-ack:` line), `checkNoBriefContent` (no brief-shaped section in the Issue), `checkRationaleNamesDocs` (the rationale names a concrete doc/skill path, or the `no-doc-surface` sentinel). `checkConflictCompleteness` warns on an undeclared collision-domain overlap and never blocks**). Prevention, not detection: a malformed PR/Issue body is refused at the agent's own tool call and never reaches the forge; the CI gates below re-run the identical aeg-core checks purely as a backstop for non-hook writers. Also enforced at the same layer: title grammar (`checkForgeTitle`, both wrappers), the single-plan-PR guard (`checkSinglePlanPr` — a diff touching a tranche's topology file is refused when another OPEN PR already touches that same tranche's topology file task 19 / #336), `gh api` PATCH/curl write-method denies, and a `.husky/pre-push` gate refusing `task/<tranche>/<id>` pushes whose id has no topology row (mechanical). Operational rule: restart running agent sessions after merging hook/settings changes — hooks load at session start. Same mechanism as skill-check enforcement and the T9 merge gate.
- **Single-plan-PR CI backstop (aeg-governance-hardening task 24, #364)** — `checkSinglePlanPr` (`packages/aeg-core/src/single-plan-pr.ts`) was extracted from `open-pr.ts` (previously private to that wrapper) so the identical predicate could also run forge-side: `.github/workflows/forge-lifecycle.yml::single-plan-pr-gate` re-fetches this PR's touched files plus every other open PR's touched files and fails CI on the same violation the ring-0 hook refuses locally. Closes the gap where a PR opened directly via the GitHub web UI bypasses `open-pr.ts` entirely. No-ops (never fires) for an ordinary task-branch PR, since its diff never touches a tranche topology file. **Dormant in this repo entirely, as of the forge-native cutover:** a plan is now a Milestone plus labeled Issues, and `aeg-root/tranches/` holds no active topology file for a diff to collide over. The guard is kept, not deleted, because it is correct and live for any repo that does keep plans as files — but nothing here can trip it, and a gate that cannot fire should say so rather than read as active protection. One implementation, two enforcement points — no second copy of the predicate.
- **Coherence oracle (A1/A2/A3/T1/T2/T3/D1/M1/M3)** — `packages/aeg-core/bin/verify-coherence.ts` runs against every PR and genuinely blocks CI (task 3 / #220 re-armed the gate from advisory to blocking — the CLI's own exit code, non-zero on any `fail`-status check, is now what the `coherence-gate` job exits with). Failures in A1 (closed-without-merge), A2 (archived-without-provenance), A3 (auto-close-misfire), T1 (phantom-issue-ref), T2 (orphan-task — **plan PRs only, see below**), T3 (tbd-in-active-tranche), D1 (dispatched-on-unmet-deps), M1 (manifest-dangling), and M3 (manifest-duplicate-glob) fail CI. L1–L5 and M2 are advisory (info-only) — every `checkL*` returns `status: info`, so a premature-archive, lifecycle-hygiene, Milestone-attachment-drift, or open-Milestone-all-closed finding is surfaced for a human to investigate but never fails CI. On A1 failures the relevant Issues receive the `vinaya/incoherent` label (Section 14). Real, installed at `.github/workflows/forge-lifecycle.yml::coherence-gate`. Same enforcement substrate as above. **The job's repo-state inputs (topology files, tranche list) are read from a freshly-fetched `origin/main` — not the checkout's `refs/pull/N/merge`, which GitHub materializes lazily and can lag behind main (5+ false-red cycles, 2026-07-03/04). A plan PR's own topology diff still reads from its head ref.**
- **Planner→Brief rationale completeness (R1)** — the same coherence oracle's **R1** check re-runs `checkIssueRationale` (`packages/aeg-core`) against every open task Issue's body, batched per active tranche alongside T2. A non-grandfathered Issue missing any of the eight `contracts/planner-brief.md` rationale fields fails CI. Paired with the ring-0 creation gate (`bin/open-issue.ts`, same tool-layer-forge-gates row above) — R1 is the continuous half, the hook is the point-of-creation half; one grammar, two enforcement points (`aeg-root/enforcement.md`). Pre- Issues are grandfathered by explicit Issue number (`R1_GRANDFATHERED_ISSUES`), reported `info`, never blocking — see Section 15b. **Real, aeg-governance-hardening task 1.** Moves this seam's rationale-completeness half from Trusted (below) to Enforced; the "role doc matches contract prose" half of contract conformance remains Trusted.
- **Review gate — code-review + security-review verdicts (aeg-review-gate-v1 task 1, #474)** — `packages/aeg-core/bin/verify-review-gate.ts`, a step of the AEG gate suite job, blocks merge on a task-branch PR unless a clean code-reviewer `APPROVE` verdict comment AND a clean security-review `PASS` verdict comment both exist — `REQUEST CHANGES`, `FAIL`, a missing verdict, or an unclear one all fail CI. Reuses `extractCodeReviewVerdict`/`extractSecurityReviewVerdict` (`verdict-extraction.ts`) — the exact detection the post-merge Archivist's provenance assembly already ran, previously advisory-only (a DANGLING note on the merged PR, never a block). A principal can waive it for one PR with an actor-verified `vinaya/waiver:review` label (the same `isWaiverLabelActorVerified` pattern, parameterized by label — see the waiver-label-actor row above); label presence alone is never sufficient. **Real, installed at `.github/workflows/forge-lifecycle.yml::aeg-gate-suite`.** Closes the gap where 7 of 9 `aeg-forge-state-v1` task PRs merged with no review pass at all. **What remains Trusted, not Enforced: *dispatching* the code-reviewer/security-reviewer subagents in the first place** — see below; this gate only verifies a dispatched review's verdict is clean, it cannot make a review happen.
- **Registry load-bearing checks G3/G4/G5 (enforcement-derivation-v1 task 3, #504)** — `packages/aeg-core/bin/verify-registry.ts`, a step of the AEG gate suite job, blocks merge on: G3 (a file making the exact class of GitHub-mutating call `check-forge-gates.sh` gates — PR/Issue create, PR/Issue body/title edit, `gh api` create/edit, raw curl/wget writes — with no guarding Ring-0 row); G4 (a `#NNN` cited anywhere in `aeg-root/enforcement.md`'s body that does not resolve to a real Issue or PR in the forge); G5 (a contract's `producer`/`consumer` that is not a real `role_id`, or a role with an empty `performs`/`refuses_when`). **G1 (implementation-exists) and G2 (no-orphan-hook/CLI) are report-only this tranche** — they run in the same step and print `info` findings but never affect the exit code, since flipping them to blocking immediately would retroactively fail in-flight work against a pre-existing orphan backlog; G1 flips to blocking in a later, separately-dispatched task. Pure evaluators in `packages/aeg-core/src/registry-checks.ts`, parsing `packages/aeg-core/src/registry-parse.ts` — same shape (pure predicate + thin I/O shim) as `coherence-checks.ts`/`verify-coherence.ts`, deliberately a separate mechanism (different registry: `enforcement.md`'s own ring tables, not the tranche/forge state coherence-checks.ts reads). `registry-parse.ts`'s `GateRow` additionally carries `summary`/`category` (vinaya-pages-v1 task 3, #551) and `description`/`spec` — purely descriptive fields consumed by the Vinaya `/how-it-works` page, not read by any G-check; G1–G5's pass/fail behavior is unaffected. `description` is the row's plain-language sentence and is resolved by header name, not column index; `spec` is the enforcement column it must never be confused with (the "what must be true"/"Re-verifies"/"Catches" slot before `implementation`).
- **Canonical action set (enforcement-derivation-v1 task 4, #505)** — `packages/aeg-core/src/actions.ts` exports `ACTIONS`, the 10-entry list of every AEG action that either crosses into GitHub (`crosses: 'into-github'`) or hands work across a role-seam contract (`crosses: 'none'`) — 6 crossings named in Issue #505 plus 4 seam-only actions, with no duplicate id for the two seams already accomplished by a crossing. Pure data (zero I/O, same shape as `waiver-label.ts`); `commit-the-work` is `'none'` because `git commit` is local-only (only `git push`/`publish-the-branch` reaches the forge). G3's crossing-file detection uses the `crosses: 'into-github'` subset (Issue #505 Boundary); the `DiagramModel` derivation (`deriveDiagramModel`, `packages/aeg-core/src/diagram-model.ts`, enforcement-derivation-v1 task 5, #506) now exists and places each action on a ring-0 gate (via `guards` edges) or a role/contract edge (via `performs`/`produces`/`consumes`), consuming this same `ACTIONS` list plus its `CROSSING_KEYWORDS` map (promoted into `actions.ts` alongside `ACTIONS` this task) — so G3's completeness set and the diagram's edge count cannot drift apart. The derivation is pure and takes doctrine through a `DoctrineSource` seam (`packages/aeg-core/src/doctrine-source.ts`, I/O-free; file-backed adapter `createFileDoctrineSource` in `@atta/vinaya-sources`), never `aeg-root/` paths directly. `actions.test.ts` cross-checks every `into-github` action against a real Ring-0 gate row in `enforcement.md` and every `performedBy` against a real `role_id`. Each entry also carries a `summary` question and a **required** `description` — required, so a new action cannot be added without one; `deriveDiagramModel` threads both onto the action's node, along with its `crosses`, which a client renderer cannot read off `ACTIONS` itself (importing it drags `node:child_process` into the browser bundle).
- **Code-owned state machine + label vocabulary (state-machine-v1 task 1, #613, conforms to)** — the same one-list-of-pure-data discipline, applied to status derivation. `packages/aeg-core/src/state-machine-model.ts` exports three parts: `FORGE_FACT_INPUTS` (every `ForgeFacts` field and the GitHub object it is read from), `DERIVED_STATUSES` (the 9-value set; `backlog` stays a member but derivation never emits it inside a tranche), and `DERIVATION_RULES` — the ordered rule list, first match wins, each entry carrying its predicate, its prose, and the reason its position matters. `deriveStatus` (`derive-tranche.ts`) executes that list, so the rules a reader sees rendered and the rules that actually run are the same objects. The list is total (its final rule matches unconditionally), and `state-machine-model.test.ts` pins the order rule-for-rule, proves every derivable status reachable, proves no rule is shadowed by an earlier one, and asserts equivalence with the pre-refactor `if`-chain across all 432 combinations of the facts derivation reads. The label vocabulary lives in `packages/aeg-forge-state/src/labels.ts` (`LABELS` + `AEG_BLOCKED_LABEL`) — in `aeg-forge-state`, not `aeg-core`, because the dependency direction is `aeg-core → aeg-forge-state → aeg-types` and the vocabulary's first consumer, `map-forge-facts.ts`, lives there and cannot import backward. Each label records the single orthogonal fact it carries; there is deliberately no `status:*` label, since status is derived and never written. `state-machine-model.ts` does **not** import that vocabulary: derivation works on `ForgeFacts`, never on label strings, and importing `@atta/aeg-forge-state` would drag its `node:child_process` into any browser bundle rendering the model — the same hazard the `ACTIONS` note above records.

### Trusted (agent discipline — no CI enforcement in V0)

- **Dispatching code-review and security-review passes** — Phase 10 requires them, including the spec-conformance check, but no CI bot dispatches the Reviewer subagents automatically yet; Principal + agent discipline decides when to invoke them. Automating dispatch is future work. **Once a review IS dispatched and posts a verdict, that verdict's existence and cleanliness is mechanically enforced pre-merge — see the Review gate row above (aeg-review-gate-v1 task 1, #474).** This is the same shape as the Verification phase below: doctrine + one enforced half + one still-trusted half.
- **Verification phase — runtime Test Plan execution**. Phase 11 requires the brief's §9 Test Plan to be executed before merge: the Developer-agent runs the `[agent]` items against the booted app and posts evidence on the PR; the Principal runs the `[principal]` items in a real signed-in browser and ticks the checkboxes. **Merge is gated on every checkbox being ticked AND the review verdicts being clean** — the runtime Test Plan executed-and-passing is a merge precondition alongside CI passing. The doctrine is mechanical (an unticked checkbox = not mergeable); the *enforcement* is trusted discipline today — no CI bot blocks merge on an unticked checkbox yet. The optional `verify-test-plan` CI check is the path to enforced (a checkbox-state parse over the PR body); it ships per-tranche. `Test Plan: unit-tests-only` (a first-class allowed value for pure-logic briefs whose §4 surface has no runtime path) satisfies the phase by the CI unit-test gate alone. **Parser hardening (aeg-governance-hardening task 25, #365):** the section locator (`locateTestPlanSection`, `packages/aeg-core/src/test-plan-section.ts`) now recognizes both the inline `**Test Plan:**` marker and the `## N. Test Plan` heading form — the original inline-only regex is what let PR #377's heading-form body advisory-PASS with an unticked `[principal]` box, since "no section found" (a parser miss, not a genuinely missing section) read as PASS. A task-branch PR with no Test Plan section in either form now FAILs loud instead, naming what was searched for; non-task branches keep the advisory bypass. The runtime Test Plan check — now the `Runtime Test Plan checkbox state` step (4/9) of the AEG gate suite job in `.github/workflows/forge-lifecycle.yml` (`verify-test-plan.yml` deleted — task 31, #395) — now also passes `BRANCH` (previously only `PR_BODY`), without which the task-branch distinction could never fire in real CI.
- **Dispatch gates** (depends-on merged / no conflicting PR open) — read from the forge and complied with; mechanical enforcement arrives when an automation tool runs dispatch (`tranche-model.md` §8).
- **Label discipline** (Section 14) — `vinaya/tier:*` present on every task Issue and kept in sync with the PR-body `Tier:`; `vinaya/needs:*-input` / `vinaya/blocked` present-when-true *and removed when false*; no `status:*` labels; no `project:*` labels; no label outside the closed set. Trusted discipline; the Archivist drift cron asserts the tier label/field match and flags stale `vinaya/needs:*` labels.
- **Contract conformance** (a role doc matches its `contracts/*.md` seam) — trusted discipline; the Archivist drift cron flags a role doc that contradicts its contract. The contract is the source of truth; a divergent role doc is the bug. (The Planner→Brief contract's *rationale field-completeness* — every task Issue body carries all eight fields — moved to Enforced via R1 above; only the "role doc text matches contract prose" half remains trusted here.)
- **Provenance assembly at close-out — items 1/8 moved to Enforced**, see "Per-task Archivist close-out" above; items 2–7 of close-out (docs coherence, per-project state, `docs-index.md`, token ledger) remain trusted, dispatched-Archivist judgment work — it records, it never gates.
- **Decision logging during chat** — Brief Author announces and logs during the conversation; CI cannot verify.
- **No execution metadata in the tranche file; no dynamic conflict scanner** — the two anti-regression rules (`tranche-model.md` §9); trusted discipline, flagged by the Archivist drift cron and the Planner's gates.
- **`thinking.md` updates; ratification-window attendance; lock acknowledgment (advisory in V0); spec ratification passes** — all trusted.

### Emergency override

- `[skip-archivist]` in a commit message: suppresses Archivist advisory comments.
- `vinaya/override:docs` PR label (or `[vinaya/override:docs]` in the body, or `OVERRIDE_DOCS=1`): suppresses the verify-docs gate for this PR.
- Author should be the Principal (verified by the forge commit author field).

Every override is logged (verify-docs prints that the override was active; the Archivist records it). This is an audit mechanism, not a security one — the Principal can always override; the log keeps it visible.

**Override truthfulness across modes.** The override applies identically in `verify-docs --pr` and `verify-docs --push` — before, `runPushMode()` never called the override-check function, so `OVERRIDE_DOCS=1`/`vinaya/override:docs` was silently dead code on a first push (no PR yet to carry the label/body). Confirmed live on task PR #314. Fixed by having `runPushMode()` call the identical override check `runPrMode()` already used; no gate was weakened — the escape hatch now honors what this section already documented, in the mode where it previously didn't.

---

## Section 13: Append-Only Artifacts

Append-only; never edited in place except to add `SUPERSEDED`/`RETIRED`/`EXPIRED` status or fill forward-reference fields:

- `aeg-project/retrospectives/*.md` (when created)
- **The provenance block on a merged PR** — assembled once at close-out from frozen facts, posted as a PR comment, never updated. Append-only by construction: a record of what shipped, not a status to maintain.
- **The per-tranche token/cost ledger** (`aeg-root/tranches/<name>.tokens.md`) — every role reports its tokens at the end of its turn (PR body, verdict comment, or planning report); the per-task Archivist is the sole writer, appending one row per role-turn at close-out; re-entry appends another row; the tranche total is `sum(rows)`, derived at read time, never stored. Same philosophy as derived task status: don't store the aggregate, sum the immutable entries. See `tranche-model.md` §12.
- An orchestration tool's runtime event logs, if one is used

**"Append-only" means:** new entries go at the end; existing entries are not rewritten to match new understanding; status transitions are new entries referencing old ones; the log grows, never shrinks. If you want to edit an existing entry, you are almost certainly writing a new entry that supersedes it.

**Exception:** filling `Superseded by:` / `Ratified by:` on an existing entry (and flipping its `Status:` to match) is permitted — narrow forward-reference edits that preserve the append-only intent.

**Carve-out — the `iteration` → `tranche` migration rewrote the archive.** The archived tranche files and their token ledgers (`aeg-root/tranches/completed/**`, moved from `aeg-root/iterations/completed/**`) were rewritten in place when the batch-of-tasks concept was renamed. That is a deliberate departure from the rule above, taken by Principal ruling, and it is recorded here rather than left to contradict the rule silently.

The reasoning: a rename is not new understanding of what happened. Every fact in those files — which tasks shipped, in what order, at what cost — is untouched; only the noun naming the batch changed. Leaving the archive on the old word would have split the vocabulary permanently in the one place a reader goes to learn what the vocabulary *was*, and made the completeness grep that proves the rename total impossible to satisfy without an ever-growing allow-list. Append-only protects the record from being edited to suit a new story; it is not a reason to keep two names for one thing.

This carve-out is **not** a precedent for editing history to match new understanding. It licenses exactly one class of edit — a pure, repo-wide vocabulary substitution that changes no asserted fact — and only when the substitution is applied everywhere at once.

---

## Section 14: Label Vocabulary

Labels are a Class 2 (forge) concern. This section is the **single source of truth** for the label system: the closed set, what each label means, who applies it and when, and whether it is mandatory.

### The vocabulary is code-owned

The label *names* below are not prose — they are read from `packages/aeg-forge-state/src/labels.ts`, the pure-data `LABELS` list every gate, script, CLI and Studio surface constructs and matches through (one list, read by both the logic and the docs, so the two cannot drift). No call site writes a label string as a literal; `label()`, `trancheLabel()`, `matchesLabel()` and `hasLabel()` are the only sanctioned surface. This table is that list, rendered.

### The `vinaya/` namespace

Every label the mechanism reads lives under the **`vinaya/`** product namespace (`state-machine-v1` task 2, #614, conforming to `aeg` is retired as a public name). The grammar is three separators, each with one job:

| Separator | Separates | Example |
|---|---|---|
| `/` | the **product** from everything it owns | `vinaya/blocked` |
| `:` | the **namespace** from its value | `vinaya/tier:1` |
| `-` | the **words** inside a name | `vinaya/needs:brief-correction` |

So `vinaya/tranche:state-machine-v1` reads as: the Vinaya product, the `tranche` axis, the `state-machine-v1` value. The namespace is what lets every Vinaya label be filtered as one group in a repo it shares with an adopter's own labels — which is the whole reason a product namespace exists. In a `gh` command or a script the name needs quoting (`"vinaya/tier:1"`); in a search URL the `/` encodes as `%2F`.

GitHub caps a label name at **50 characters**, and `vinaya/tranche:` spends 15 of them before the slug starts. `trancheSlugLengthError()` enforces the remainder where a tranche label is first applied (`open-issue.ts`), so an over-long slug fails with a readable message instead of an opaque `gh` 422.

### The governing principle: a label only exists where the forge can't tell you natively

The forge already tells you, for free, whether a branch exists, a PR is open, a review was requested, and a merge happened — so **status is derived, never labeled** (the `No status:* labels` rule). A label earns a place in the vocabulary *only* when it marks something the forge cannot show you natively: impact (tier), a block that has no branch/PR fact behind it, a routing of "who must answer," or a deliberate override. If the forge can answer it, it is not a label.

The same principle retired two label families outright in #614: the six `status:*` labels (status is derived) and the thirteen `project:*` labels (project is a **field** — see the two rules below). Both were deleted from the forge, not renamed: a namespaced version of either would have preserved exactly the contradiction the rule exists to remove.

### "Mandatory" has two shapes

- **Always-mandatory** — present on every task, exactly once. (Only `vinaya/tier:*`.)
- **Conditional-mandatory** — present **if and only if** the condition it signals is true. The obligation runs both ways: it MUST be added when the condition becomes true, and it MUST be removed when the condition becomes false. A stale `vinaya/needs:principal-input` on a resolved Issue is as much a violation as a missing one — a conditional label is a **live signal, not a sticker**.

The only genuinely **optional** labels are `vinaya/override:docs` and `vinaya/waiver:docs`, because both are escape hatches — forcing either would be a contradiction.

### The closed set

No label outside this table may be applied to a task Issue or its PR. (The Archivist drift cron flags out-of-vocabulary labels.)

| Label | On | Marks (what the forge can't say) | Who applies / when | Mandatory? |
|---|---|---|---|---|
| `vinaya/tier:0` / `vinaya/tier:1` / `vinaya/tier:3` | Issue (+ mirrors the PR-body `Tier:`) | Impact tier — drives required docs (§9) and whether it merges at a ratification window. The forge has no concept of "impact." | **Planner** sets it at Issue cut (plan-time estimate). The **PR-body `Tier:`** is the binding value at merge; the Developer corrects the field if execution reveals a different tier, and re-syncs the label. | **Always-mandatory** — exactly one per task |
| `vinaya/blocked` | Issue | A block that has **no forge fact** behind it ("waiting on an answer" isn't visible from branch/PR state). | Developer/Brief Author when a task is blocked on an escalation; **removed** the moment it unblocks. | Conditional-mandatory |
| `vinaya/incoherent` | Issue | A `COMPLETED` close with **no merged-PR link** — the forge shows "closed" but cannot show *whether the one law was honored* (done iff a merged `Closes #N`). Marks the anomaly for a human to resolve; AEG never auto-reopens. | Detected by `verify-coherence` (A1) / surfaced in Studio; applied when the incoherence is found, **removed** when a human clears it (link the merge, or re-close `NOT_PLANNED`). | Conditional-mandatory |
| `vinaya/needs:execution-input` | Issue | Routes an open escalation to the **Brief Author** (§7). | Developer at escalation; removed when answered. | Conditional-mandatory |
| `vinaya/needs:strategy-input` | Issue | Routes to the **Brief Author** — a design-path question, not an execution one. | Developer at escalation; removed when answered. | Conditional-mandatory |
| `vinaya/needs:principal-input` | Issue | Routes to the **Principal** — the surface the Principal scans to see what is waiting on them. | Developer at escalation; removed when answered. | Conditional-mandatory |
| `vinaya/needs:brief-correction` | Issue/PR | The Archivist's "this brief is malformed" flag (§3, §12). | Archivist (automation); removed when the brief is fixed. | Conditional-mandatory |
| `vinaya/override:docs` | PR | Suppresses the verify-docs gate for one PR (§12) — honored identically in `--pr` and `--push` mode (previously dead code in push mode). | **Principal only**, deliberately. | **Optional** (escape hatch) |
| `vinaya/waiver:docs` | PR | Honors a C5 doc-coverage finding PR-wide (§15) — but ONLY when this label's own labeling timeline event was actored by a configured principal; the forge can say a label was added, but not by whom in a way CI trusts without a dedicated actor check, so this row exists to mark that the actor-verification layer, not the label add, is what carries the authority. | **Principal only**, applied outside any agent session — `.claude/hooks/check-forge-gates.sh` denies any agent-session command that mutates this specific label. | **Optional** (escape hatch) |

### Two rules that are easy to get wrong

1. **Project is a field, not a label.** A task's project(s) live in the `Project:` field (Issue body + PR body), resolved against `.vinaya/projects.md` — **never** as a label. (Multi-valued, registry-validated; a label can't carry that cleanly, and it would collide with the "no planning metadata on Issues" rule.) If you reach for a "project label," stop — set the `Project:` field. The thirteen `project:*` labels that predated this rule were **deleted** from the forge in #614, and every reader — `list-tasks.ts`, `issue-validation.ts`'s `declaredProjects`, the Studio backlog — now derives project from the body field alone.

2. **Tier is a field *and* a synced label, and the field wins.** The PR-body `Tier:` is the **source of truth** (it's what `verify-docs` reads, it lives in the reviewed PR body, it has history). The `vinaya/tier:*` label is a **mandatory projection** of it onto the Issue so the board is scannable (filter `vinaya/tier:3` to see what needs a ratification window). They MUST agree; the Archivist asserts `label == field` and flags a mismatch. Ordering: the **Planner sets the label at cut** as a plan-time estimate; the **field is the execution-time truth at merge**. If they disagree, the field is right and the label is corrected — never the reverse.

### Why no other labels

Everything teams commonly reach for is already covered without a label: *status* (derived from the forge), *priority/estimates/points* (planning metadata — lives in the company's tool, rejected on Issues by §2 + CI), *project* (the `Project:` field), *assignee* (a native forge field, and assignment is the `todo` transition). Adding a label for any of these would re-introduce a second, drifting source of truth for a fact the model already has a home for. The vocabulary stays small on purpose.

---

## Section 15: Coherence Seam — Doc Coverage (`.vinaya/doc-owners`)

The seam between **code change** and **the doc that explains the surface that just moved**. made bidirectional doc coherence an obligation (read before planning, update as DoD) makes the **output side mechanically verifiable** so the Reviewer judges *correctness of the covered doc*, not its presence. The Developer↔Reviewer seam for coverage is enforced by `verify-docs`; the seam for correctness remains the Reviewer's job (Section 3 + `contracts/developer-reviewer.md`).

### The single source of truth: `.vinaya/doc-owners`

One CODEOWNERS-shaped file at the repo root of the AEG model:

- Each non-blank, non-comment line is `<code-glob>  <doc-pointer>` (whitespace-separated).
- `#` starts a comment to end of line; blank lines are ignored.
- **Glob syntax is deliberately simple** — only `*` (sequence not containing `/`) and `**` (any sequence including `/`) are special; every other character is literal. Next.js dynamic-route segments like `[username]` match without escaping.
- **Pointer forms:** in-repo path; in-repo `path#anchor`; or a `https://…` URL.
- **The file is optional.** Its absence is dormancy, not failure — see below.

The file is a Class 1 artifact (repo file, git-tracked) and changes via the normal PR flow. Edits to `.vinaya/doc-owners` are themselves Tier 3 when they reshape the seam (e.g. broadening enforcement to a new package); routine additions of a single binding for an already-bound family follow the surrounding work's tier.

### The bind-or-waive rule (enforced by C5 in `packages/aeg-core/bin/verify-docs.ts`)

For each changed code file in the PR, glob-match against every binding. Per **matched** binding, exactly one of these must be true at PR-open:

| Branch | What satisfies the gate |
|---|---|
| **Strong-pass** | The in-repo pointer is in the PR diff. |
| **URL-ack** | The pointer is a URL **and** the PR body carries `Doc-ack: <pointer> — <note>` whose `<pointer>` exactly matches the binding's URL. |
| **Waiver** | The pull request carries the `vinaya/waiver:docs` label, AND the actor of that label's most recent labeling timeline event is a configured principal. PR-wide, not per-binding — one verified label satisfies every fired binding in the PR. Label presence alone is never sufficient; there is no PR-body waiver field. |

If none of the above hold, C5 fails the PR. A binding whose in-repo pointer **does not exist on disk** is a distinct *dangling* failure (fix the binding or add the doc) — never silently ignored, because a dangling pointer is the failure mode the seam was built to prevent.

### Dormancy (silent no-op)

Two cases produce **no output and no error** — not a "pass" message, nothing at all:

1. `.vinaya/doc-owners` is absent.
2. The file exists but no binding's glob matches any changed code file.

The seam has no opinion until the repo teaches it one. This is what makes the gate safe to ship to repos that have not yet adopted the seam, and what lets a repo grow coverage incrementally one binding at a time.

### Orthogonality to the tier system

The tier system (Section 9) is class-level — "what kind of work is this, and what docs does that kind of work require?" The coherence seam is per-change — "this specific edit moved this specific surface; the doc bound to that surface must move with it." A Tier 0 PR that edits a bound code surface MUST satisfy C5; a Tier 3 PR that touches no bound code surface satisfies C5 trivially. Both gates run on every PR; both must pass.

### `Doc-ack:` — the one remaining PR-body field; the waiver is a label, not a field

`Doc-ack:` is a **PR-body field**, parsed from the body text — *not* a GitHub label. It lives alongside `Tier:` in the canonical PR body (form in `roles/developer.md` § PR body — canonical form).

- `Doc-ack: <pointer> — <note>` — acknowledgment for URL bindings. Unaffected — an acknowledgment, not a bypass.

The waiver itself is **not** a PR-body field. removed `Doc-waiver:` entirely — the escape hatch is the `vinaya/waiver:docs` label instead (Section 14), added to the closed label set specifically because a waiver must be a forge-authenticated act (an actor-verified labeling timeline event), and a body field can never carry that verification — anyone who can edit the body can type any string.

The separator between `<pointer>` and `<note>` in `Doc-ack:` is **flexible**: em-dash `—`, en-dash `–`, or a plain ASCII hyphen `-` (with surrounding whitespace) are all accepted by `verify-docs`. The em-dash form remains canonical in templates and prose, but a human typing `Doc-ack: <pointer> - <note>` on a US keyboard parses identically. Required whitespace around the ASCII hyphen disambiguates it from hyphens that legitimately appear inside pointers (e.g. `.vinaya/doc-owners`, `.claude/skills/ui-components/SKILL.md`); writers do not need to think about it as long as they put a space on each side.

### Where this leaves the Reviewer

The Reviewer no longer carries the cognitive load of remembering *which* doc lives at *which* surface — `verify-docs` does that. The Reviewer's doc-coupling job (`roles/reviewer.md`, item 6) shrinks to **judging correctness of the covered doc**: did the doc update actually reflect the code change, or is it a no-op edit to silence the gate? A passing C5 plus an incorrect doc update is still a BLOCKER. (+ together: coverage is mechanical; correctness is the Reviewer's.)

### What is explicitly out of scope for

- **One-time staleness audit** of existing skills/specs to seed the initial bindings — backlog T4.
- **Decision-number reservation** (the failure mode that caused the recent→ renumber) — backlog T2.

**Planner §7 auto-derivation from `doc-owners`.** No longer out of scope — `packages/aeg-core`'s `deriveSection7` mechanically matches a task's intended surface globs against `doc-owners` bindings at brief-authoring time; the union of matched pointers is the floor for §7. This is a Planner/Brief-Author aid only, invoked upstream of this section's C5 gate — it does not change what C5 enforces at PR time. See `roles/planner.md`'s "Docs to keep coherent" field and `contracts/planner-brief.md`.

These are tracked on `aeg-root/tranches/aeg-coherence-v1.md`; this section governs only the seam itself.

---

## Section 15b: Coherence Seam — Plan↔Forge Coverage (`packages/aeg-core/bin/verify-coherence.ts`)

The seam between **tranche topology files** (the plan — `aeg-root/tranches/*.md`) and **the forge** (GitHub Issue state / PR merge events). makes this seam deterministically verifiable: a stateless oracle that detects drift without LLM calls, runnable in CI.

### The oracle: `packages/aeg-core/bin/verify-coherence.ts`

Sibling to `verify-docs.ts`, both in `packages/aeg-core/bin/`. Runnable as CLI (`bun packages/aeg-core/bin/verify-coherence.ts`) and in CI (`GITHUB_TOKEN` required). Zero LLM calls; stateless — each run is a fresh read of forge + files.

**Both CLI shims are CWD-independent by design** — each `chdir()`s to the repo root immediately on load (before any file-system or git call). This is load-bearing, not cosmetic: `apps/vinaya/web`'s `/api/coherence` route spawns `verify-coherence.ts` as a subprocess without an explicit `cwd`, inheriting the Next.js server's own working directory rather than the repo root — every bare `existsSync`/git-shell-out call would otherwise silently resolve against the wrong base (confirmed live: false M1 `manifest-dangling` findings for files that plainly exist). Direct CLI/CI invocation already ran from the repo root, so the bug was invisible until the Studio's subprocess spawn surfaced it.

**AEG's own CLI tools + check logic live entirely inside `packages/aeg-core` — never in the monorepo's generic `scripts/` folder (aeg-consolidation, 2026-07-01+).** `packages/aeg-core/bin/verify-docs.ts` and `verify-coherence.ts` are thin CLI shims: resolve args/env, read git diff/PR body/forge facts, call the pure, exhaustively-tested evaluators in `packages/aeg-core/src/` (`file-classify.ts`, `status-block.ts`, `doc-owners.ts`, `manifest-validity.ts`, `pr-tier.ts`, and — once `aeg-consolidation` task 2 lands — the A/T/D/L coherence checks), then format output. The principle: AEG is a black box to the host monorepo — the only sanctioned crossing point is `.github/workflows/*.yml`, because that exact path is a GitHub Actions platform requirement, not an AEG choice. Every workflow step now reads `bun packages/aeg-core/bin/<script>.ts`, invoking AEG's self-contained tools from outside, never embedding AEG logic inside the monorepo's own `scripts/`. `scripts/` at repo-root holds only genuinely monorepo-generic tooling unrelated to AEG (docs-index generation, UI-convention checks). This is the same pattern `parseTranche`/`deriveTranche` already established for the Studio. Behavior is unchanged by either move (golden-file verified); only the internal file organization changed, so this repo's `doc-owners` binding on the two scripts is satisfied by this note, not by a behavioral rewrite.

**Three inputs:**
1. **Forge facts** — GitHub Issue state + PR merge events via `fetch-forge-facts.ts` (`@octokit/graphql` + `timelineItems(CLOSED_EVENT)`). Same adapter the Studio uses; not forked.
2. **Tranche topology** — `loadTrancheFiles` (`verify-coherence.ts`). For every tranche file NOT touched by the current PR's own diff (the repo-state side of every comparison — a plan PR's own topology diff still reads from its head ref, per the T2 point-of-power relocation note below), `id`/`issue` per task are derived from the forge (`@atta/aeg-forge-state`'s `deriveTrancheFromForge` — a Milestone + `vinaya/tranche:<slug>`-labeled Issues; aeg-forge-state-v1 task 3b, #437), falling back to `aeg-root/tranches/*.md` via `parseTranche` (`@atta/aeg-core`) if forge derivation fails. `dependsOn`/`conflictsWith` and `#TBD` rows (no Issue cut yet — structurally invisible to forge derivation) still come from the topology table **when that table exists** and are merged onto the forge-derived task list. **As of #512/#517, no active tranche carries a topology file at all** — `vada-production-v1`'s file was backfilled and deleted in #486, and the last remaining live file (`aeg-drift-prevention-v1.md`) was deleted in #517 — so `dependsOn`/`conflictsWith` is now genuinely forge-native for every active tranche; the file-merge code path is kept but permanently dormant. **The general (unscoped) sweep additionally enumerates every open AND closed Milestone** (`listActiveTrancheSlugs`/`listArchivedTrancheSlugs`, #515) not already found via directory listing — with the directory now permanently empty of active files, this closes the gap that would otherwise make the sweep blind to every tranche, silently. A task Issue whose `vinaya/tranche:<slug>` label was never removed after being dropped/consolidated out of the topology table (confirmed live on `herald-hardening-v1` #348 and `aeg-governance-hardening` #404) reappears via forge derivation even though its row is gone — the fix is removing the stale label at the source, not filtering in code. (`readFromHead`'s guard inside `loadTrancheFiles` was rewritten from `prContext !== null && prContext.touchedFiles.has(relPath)` to `prContext?.touchedFiles.has(relPath) ?? false` for `noOptionalChain` lint hygiene — same pattern as the internal-organization note above: behavior is unchanged, both forms are `boolean`-typed and identical on every input, so this binding is satisfied by this note rather than a behavioral rewrite.)
3. **Decision logs** — consulted via N/M checks (delegated to T2 #217).

**Check catalog:**

| Check | Fail class | What it asserts |
|---|---|---|
| A1 | `closed-without-merge` | Every closed task-Issue has a merged closing PR |
| A2 | `archived-without-provenance` | That closing PR carries an Archivist `### AEG provenance` comment |
| A3 | `auto-close-misfire` | Every Issue whose closing PR merged is itself closed (**headline check** — #174 class) |
| T1 | `phantom-issue-ref` | Every topology row's Issue ref resolves to a real Issue |
| T2 | `orphan-task` | Every open Issue labeled `vinaya/tranche:X` appears in X's topology. **Blocks CI only for a plan PR** (its diff touches that tranche's topology file) as of see "T2 branch scoping" below |
| T3 | `tbd-in-active-tranche` | No `#TBD` rows in an active tranche |
| D1 | `dispatched-on-unmet-deps` | An open-PR task has all `depends-on` Issues closed |
| R1 | `missing-rationale-field` | Every open task Issue's body carries all eight planner-brief rationale fields (`checkIssueRationale`) |
| L1 | `stale-active-tranche` | Active tranche with zero open Issues → should archive |
| L2 | `premature-archive` | Archived tranche with any open Issue → investigate |
| L3 | informational | Active tranche count (does not affect exit code) |
| L5 | `open-milestone-all-closed` | Open Milestone whose every task Issue is closed → close/archive. Advisory forge-native analogue of L1 for post-cutover tranches with no topology file (Issue #481) |
| N/M | delegate | Decision-number + manifest integrity (delegate to T2 #217) |

**A2's provenance-detection mechanism (task 20 / #340, 2026-07-04):** `fetchProvenance` (in `packages/aeg-forge-state/src/fetch-provenance.ts` — moved out of `verify-coherence.ts` by task 28/#372's bundled finding so Studio's dispatch-readiness badge shares the single implementation with `verify-coherence.ts`/`verify-dispatch.ts`, then extracted to the shared package; behavior unchanged) resolves the *most recent* `ClosedEvent` per Issue (`timelineItems(last: 1, ...)`, not `first: 1`) — a reopened-then-reclosed Issue's real closer is the last event, not the first (confirmed live: Issue #287 was closed by PR #288, reopened, then really closed by PR #313, which carries the provenance comment). When the resolved event has no PR `closer` at all — confirmed for Issues closed via an explicit `gh issue close`, where GitHub's `closer` field never populates even though a real merged PR did the work — `fetchProvenance` falls back to the Issue's `CROSS_REFERENCED_EVENT` timeline items (populated for *any* PR mentioning `#<issueNum>`, not only an unresolved `Closes #N` link — necessary because the real closing PRs for this null-closer case frequently never carried a `Closes #N` link at all, which is exactly why they needed an explicit close). Each merged candidate's body/comments are checked for a provenance block whose own `Issue:` field names this Issue — required because an unrelated cross-referenced PR can legitimately carry genuine provenance for a *different* task.

**Output contract (locked — changes require a new D-entry):**
```json
{ "check": "A3", "status": "fail", "failures": [{ "issue": 174, "tranche": "aeg-ui-v1", "task": "3", "reason": "...", "grandfathered": false }] }
```
Exit non-zero on any `fail`. `info` and `pass` checks do not affect exit code. `severity:infra` emitted when GITHUB_TOKEN is unavailable in CI.

**Grandfather cutoff — `COHERENCE_ENFORCED_FROM = '2026-07-01'`:**

Legacy incoherences that predate the cutoff are emitted as `status: "info"` (visible in the report) rather than `"fail"` (which blocks CI). Rationale: branch protection is unavailable on the free plan; pre-existing repo-wide debt (legacy vada/herald/aeg-ui tranches) cannot be retro-fixed, so a hard gate on those findings would make every new PR un-mergeable.

| Check | Terminal event date used for grandfather test |
|---|---|
| A1 (`closed-without-merge`) | Issue `closedAt` |
| A2 (`archived-without-provenance`) | Closing PR `mergedAt` |
| A3 (`auto-close-misfire`) | Closing PR `mergedAt` |
| T3 (`tbd-in-active-tranche`) | Proxy: any task in the tranche with `closedAt`/`mergedAt` before cutoff |

A finding is `grandfathered: true` when its terminal event is strictly before `COHERENCE_ENFORCED_FROM`. When ALL findings for a check are grandfathered the check status is `info`; if any finding is post-cutoff the status is `fail`.

**R1's grandfather is a different shape — an explicit Issue-number list, not a date.** An Issue body carries no reliable "authored under which rationale grammar" timestamp to proxy against, so R1 does not use `COHERENCE_ENFORCED_FROM`. Instead `R1_GRANDFATHERED_ISSUES` (`packages/aeg-core/src/coherence-checks.ts`) is a data-declared `Set<number>`, populated once at/R1 implementation time with exactly the open task Issues that failed `checkIssueRationale` against the live forge. New/edited task Issues cannot land on this list — they are refused at the ring-0 gate (`bin/open-issue.ts`) before they ever reach the forge — so the list is a closed, one-time accounting of pre-gate debt, not a standing exemption mechanism.

**T3 branch scoping:** When `BRANCH` or `GITHUB_HEAD_REF` env matches `task/<tranche>/<n>`, T3 only checks tasks in `<tranche>`. This prevents a PR against `aeg-coherence-v1` from being blocked by `#TBD` rows in other (vada, herald) tranches. CI sets `BRANCH` explicitly in the `coherence-gate` job (matching the `closes-n-gate` job's pattern) rather than relying on the implicit `GITHUB_HEAD_REF` runner default, so this scoping behaves identically in CI and locally.

**T2 branch scoping (task 19 / #336):** `checkT2` takes the same `ciTrancheSlug` parameter as T3, mirroring its scoping exactly — when set, only the PR's own tranche's open-Issue/topology gap is reported. Closes the #358/#359 incident: two correctly-formed task PRs for `aeg-governance-hardening` failed the coherence oracle for a reason having nothing to do with either PR's diff — a different tranche (`herald-hardening-v1`) had Issues cut but not yet added to its topology, a normal, temporary planning-window gap. The forge fetch behind T2 (`fetchOpenIssuesByLabel`) stays repo-wide regardless of scoping, so `--json`/audit mode (no `BRANCH` set) still surfaces every tranche's gaps — only the CI-blocking failure computation is scoped.

**T2 point-of-power relocation (aeg-governance-hardening task 24 / #364, Part 2) — supersedes half of the placement above.** Tranche-scoping alone was not sufficient: it still let T2 block *any* PR — task or plan — within the gap's tranche. Live incident #363 proved this the wrong boundary: registering Issues #364/#365 correctly created a topology gap and correctly reddened T2, but the PR it reddened was an in-flight task PR that could neither have caused the gap (never touched the topology file) nor cure it (only a plan PR editing the tranche file can add the missing row). `runCoherenceChecks` now accepts an `isPlanPr` flag (computed in CI from `PR_TOUCHED_FILES` via the same `touchesAnyTopology` predicate the single-plan-PR guard uses); `scopeT2ToPlanPr` (`packages/aeg-core/src/coherence-checks.ts`) demotes a failing T2 to `status: 'info'` whenever `isPlanPr` is `false` — every task-PR CI run, `--json`/audit mode, and `daily-drift` alike. `checkT2`'s own assertion logic is untouched; only the CI-blocking decision moved. A plan PR that itself creates or fails to close a topology gap is still blocked exactly as before.

**T3 forge-unavailable carve-out (task 3 / #220):** A `#TBD` entry whose tranche's forge snapshot fetch failed entirely (`snapshotsBySlug` never had that tranche's slug — no token, no repo, or a genuine per-tranche fetch failure) cannot be evaluated against the grandfather-by-proxy logic, because every task in that tranche has `facts: undefined`. Rather than letting that silently evaluate to `grandfathered: false` (which would fail CI purely because of a forge outage, not because the row is genuinely un-grandfathered), `checkT3`'s 4th parameter (`forgeUnavailableSlugs`) marks these rows `grandfathered: true` with a distinct reason ("forge data ... unavailable — cannot evaluate"). This never suppresses T3 for tranches whose forge data *is* available — only the specific forge-fetch-failed case gets the carve-out.

**Forge-facts fetch is parallelized across tranches (vinaya-studio-v1 task 6 bundled fix, 2026-07-14).** The loop populating `snapshotsBySlug` (each tranche's `fetchForgeFacts` call) used to run sequentially — one tranche's round-trip after another — which was fast enough when introduced but degrades linearly as more milestones open; by #444's live-API cutover plus organic milestone growth it reached ~60s wall time with 6 active tranches, tipping over `verify-coherence.test.ts`'s CLI-invocation timeout. It now fires every tranche's `fetchForgeFacts` call concurrently via `Promise.all` and merges results synchronously afterward — same per-tranche query shape (`fetchForgeFacts` still batches one tranche's tasks into a single GraphQL round-trip, unchanged), same `snapshotsBySlug`/`forgeUnavailableSlugs`/`anyForgeUnavailable` semantics, purely a concurrency change with no behavioral difference in what's queried or how results are interpreted.

### What is explicitly out of scope for

- **Studio rendering** of oracle output (Vb #230 — depends on Va).
- **M manifest-integrity** checks — **completed (T2 #217)**: `checkManifestValidity` implemented in `verify-docs.ts`, wired into the coherence oracle. The numbering checks that shipped alongside it were removed with the numbered record they policed.
- **CI gate wiring** — **completed**: `.github/workflows/forge-lifecycle.yml::coherence-gate` now wires the oracle as a blocking CI gate. Was explicitly deferred.

---

## Section 15c: Coherence Seam — Surfaced-Doc Manifest (`verify-docs.ts` full mode, check C6)

The seam between **the surfaced-doc manifest** (which `aeg-root/` docs a `DiagramModel` node points at — the public set) and **the doc-nav tree** the docs engine (`packages/aeg-core/src/docs/`) builds from them. makes "what counts as a surfaced doc" a single, data-driven definition instead of two competing ones — this check (C6) and Vinaya's `/docs` loader both consume it.

### The manifest: `packages/aeg-core/src/docs/surfaced-manifest.ts`

**Model-backed, not path-based** (`vinaya-pages-v1` task 12, #590): a doc is surfaced iff a `DiagramModel` node points at it. `modelBackedDocPaths(model)` derives the allowlist — the same node→doc mapping `read-more.ts` uses: gate/check → `enforcement.md`, role → `roles/<id>.md`, contract → `contracts/<id>.md` (`action`/`ring` nodes back no doc). `isSurfacedDoc(relPath, frontmatter, surfacedPaths)` consults that set; a per-file `surfaced: true|false` frontmatter flag is the only override, winning in either direction. The set is passed in — the module imports only the `DiagramModel` **type**, so aeg-core stays zero-I/O (the doctrine is read, and the model derived, by each caller). This **replaced** the earlier ordered path-exclusion rules outright; a second competing rule is the failure mode the manifest exists to prevent.

### The check: `packages/aeg-core/src/docs/docs-coherence.ts`

Pure, given the parsed file list under `aeg-root/` and the model-backed surfaced set (`modelBackedDocPaths`, passed in — deriving it reads doctrine, which this module never does):
- **Reachability** — every surfaced doc's slug is reachable in the nav tree the docs engine would build for the surfaced set. This mirrors the real parent/child resolution `apps/vinaya/web/src/lib/docs/nest-doc-children.ts` performs when building Studio's live `/docs` nav: a doc whose `parent:` frontmatter points at a nonexistent or excluded slug is silently dropped from that nav's flat list — reachable neither at the top level nor as anyone's child. That silent-drop is the exact defect this check exists to catch; Studio's file itself is read-only reference, never imported or edited by this check.
- **Dangling parent** — the more specific diagnostic naming exactly which `parent:` reference is broken.
- **Dangling link** — every relative `.md` link between two surfaced docs resolves to another surfaced doc.

Wired into `verify-docs.ts` full mode. Full mode is a repo-wide structural sweep, not yet CI-gated (only `--pr` mode runs in CI — as the `Tier-appropriate documentation gate` step of the AEG gate suite job in `.github/workflows/forge-lifecycle.yml` — today) — it runs on demand and locally, per the advisory/enforced gradient in Section 12.

### What is explicitly out of scope for C6

- **Studio's actual `/docs` nav rendering** — validated by re-reading the same manifest, not modified. `aeg-studio-cleanup` (#292) is where Studio's `load-aeg-docs.ts` is updated to filter by this manifest.
- **Content correctness of a doc** — the Reviewer's job, same boundary as every other mechanical gate in this file.
- **CI wiring of full mode itself** — pre-existing full-mode scope (F1/F2/N/M/completeness scoreboard), unchanged by this addition.

---

## Section 15d: Coherence Seam — Dispatch Readiness (`verify-dispatch`)

The seam between **a task's dispatch preconditions** (row-existence, Issue-existence, dependency/conflict forge state, prior-tranche archival) and **the prose entry-gate items** `roles/developer.md` and `contracts/brief-developer.md` currently ask every Developer (and, upstream, the Brief Author) to re-derive by hand. (2026-07-13, removed prior-task/row-adjacency archival from this list — it was superseded, not one of the preconditions still enforced.) makes these preconditions mechanically re-checkable in one command, applying the same founding principle as Sections 15/15b/15c: *any fact that is knowable by querying git/the forge/the filesystem in seconds must never be asserted as prose an agent has to remember or re-derive.*

### The composed gate: `packages/aeg-core/bin/verify-dispatch.ts`

Sibling to `verify-docs.ts`/`verify-coherence.ts`, same thin-CLI-shim discipline: resolves args, fetches git/forge state, and calls the pure evaluators in `packages/aeg-core/src/` (`dispatch-gate.ts`, `leftover-detection.ts`, `baseline-capture.ts`, `premise-check.ts`). No check logic lives in the `bin/` file.

**Usage:**
```
bun packages/aeg-core/bin/verify-dispatch.ts <tranche> <n>
bun packages/aeg-core/bin/verify-dispatch.ts <tranche> <n> --premise <body-file>
bun packages/aeg-core/bin/verify-dispatch.ts <tranche> <n> --simulate <body-file>
bun packages/aeg-core/bin/verify-dispatch.ts <tranche> <n> --check-baseline <file>
```

**Default mode composes three checks:**

1. **`checkDispatchReadiness` (`src/dispatch-gate.ts`)** — one `{ ready, blockers }` verdict from: Issue-existence + phantom-reference detection; the Planner-rationale gate (`checkIssueRationale`, reused, not re-implemented); every `depends-on` edge's PR-merged state; every `conflicts-with` edge's open/in-flight state; and, per project named in the task's `Project(s)`, whether a prior active (non-`completed/`) tranche for that project is fully closed but unarchived. (2026-07-13: the immediately-prior task's three-predicate row-adjacency archival bar — Issue closed, PR merged, provenance block present — was removed as a blocking predicate; automated post-merge provenance posting made the signal it protected moot. `DispatchGateInput.priorTask` still exists as a dormant field for caller compatibility, but the gate no longer reads it.) As of task aeg-forge-state-v1 3a (#427), the task's own row/Issue is derived live from the forge (`@atta/aeg-forge-state`'s `deriveTrancheFromForge` — a Milestone + `vinaya/tranche:<slug>`-labeled Issues), not read from `aeg-root/tranches/<slug>.md` on a freshly-fetched `origin/main` — there is no separate "fetched" copy of the forge to go stale.
2. **`classifyLeftover` (`src/leftover-detection.ts`)** — `clean | resume | stop` from the task branch's remote existence, local worktree existence, and commits already ahead of `origin/main` (this is the one remaining check in this seam that genuinely needs a freshly-fetched `origin/main` — `verify-dispatch` still runs `git fetch origin main --quiet` for it). `stop` blocks dispatch — Step 0 never creates a commit, so any commit ahead of main is real prior work that re-running Step 0 would orphan.
3. **`captureBaseline`/`compareToBaseline` (`src/baseline-capture.ts`)** — the current `verify-docs --full` and `verify-coherence` finding counts, printed as an **informational** capture, never a blocking "must be green" bar (live-fire: a brief once asserted "verify-docs full mode must be green" as a pre-flight condition without ever running it — full mode carried 44 pre-existing, unrelated findings and had never been green). The standing contract this seam establishes is **"no worse than the captured baseline,"** re-checkable later via `--check-baseline <file>`.

Exit 0 iff `checkDispatchReadiness` reports `ready: true` AND the leftover verdict is not `stop`; exit 1 otherwise, printing every failing predicate by name — mirroring the message family of `coherence-checks.ts`'s A1/A2/T2/etc.

**`--premise <body-file>`** re-asserts every `Premise:` pin in the given body file (`parsePremiseBlock` + `checkPremises`, `src/premise-check.ts`) against the current on-disk state — the Developer's mechanized re-check of `contracts/brief-developer.md`'s premise obligation, immediately before Step 0. A failed premise means the surface moved since the brief was authored; the Developer stops and re-digs rather than executing against a stale mental model.

**`--simulate <body-file>`** dry-runs the exit gates *before* work starts — `verify-brief`, `verify-docs --pr`, and push-mode C5 (via `PR_BODY_FILE`), all against the intended body file. Because no diff exists yet at this point, premise **coverage** (which needs the real changed-file list) is not evaluated here — only that the `Premise:` block parses to at least one assertion. Full premise-coverage enforcement happens post-diff, in `verify-task.ts` (below) and, in the future, `verify-docs --pr` itself.

**`--check-baseline <file>`** compares current finding counts against a previously captured baseline file, failing if any tool's count regressed past its baseline entry.

### `verify-task.ts` — the Developer's exit composite

`packages/aeg-core/bin/verify-task.ts` wraps the Developer's own pre-PR verification list (`roles/developer.md` § Verification before reporting done) into one command and one summary: typecheck, lint, tests, build (all scoped to `@atta/aeg-core` — a full monorepo application build is the deployment pipeline's job, per `enforcement.md` Ring 1), `verify-docs --pr`, and — against the PR's actual diff — both `checkPremiseCoverage` (a real code surface with zero premise coverage fails) and a premise re-check. No check here is a second implementation; every step shells out to the same command CI runs, or calls the same pure `@atta/aeg-core` evaluator directly.

### Forcing mechanisms (aeg-governance-hardening task 25, #365)

Mechanizing both `verify-dispatch` and `verify-task` was not enough, but neither was *forced* — an agent could simply not invoke them. Task 25 closes that gap for both:

- **`.husky/pre-push`** now runs `verify-dispatch` itself on a `task/*/*` branch's first push (before its PR exists), via the thin shim `packages/aeg-core/bin/check-first-push-dispatch.ts` and the pure evaluator `checkFirstPushDispatchGate` (`src/first-push-dispatch-gate.ts`). Genuine `NOT READY` refuses the push, printing the failing predicate; once a PR exists, later pushes skip the check (dispatch was already validated once — re-blocking mid-task on a sibling's later state change would strand in-flight work). The gate parses the `dispatch-readiness: READY|NOT READY` line specifically, not verify-dispatch's combined exit code — that exit code also folds in `classifyLeftover`'s `stop` verdict, which fires on ANY branch with commits already ahead of `origin/main` (true of every push after the first on a task legitimately mid-flight). Reading the combined exit code would have false-blocked every such push; this was caught live on this task's own second pre-PR push. Fail-open (loud) is two-layered: a `gh auth status` reachability probe runs before trusting any `verify-dispatch` output at all (a degraded/misconfigured `gh` auth state can make its individual `gh issue view`/`gh pr list` calls silently return empty without tripping verify-dispatch's own repo/token check — also caught live, while testing this gate), plus a backstop check for verify-dispatch's own `severity:infra` marker.
- **`open-pr.ts`** now runs `verify-task` itself for task branches, via the pure `gatePlanForBranch(branch)` (`bin/open-pr.ts`) which selects `['verify-brief', 'verify-docs', 'closes-n', 'verify-task']` for a task branch and the original `['verify-brief', 'verify-docs']` — byte-identical, fixture-asserted — for everything else. Invoked wholesale rather than partially re-implemented (per this seam's "no check here is a second implementation" rule, above); `verify-docs --pr` therefore runs twice on a task-branch PR-open, an accepted ~4s overlap with a warm turbo cache.

Both land at ring 0 only — no ring-1 (CI) or ring-2 (audit) backstop yet, the same accepted shape `enforcement.md`'s pairing matrix already carries for the branch-ID check. Building that backstop is a separate, future task.

### Known limitations (accepted, non-blocking for this seam)

- **Cross-tranche `depends-on`/`conflicts-with` edges** (e.g. a topology cell reading `other-tranche #264` rather than a bare same-tranche task id) resolve via a direct `#NNN` extraction when present; an edge that resolves to neither a same-tranche task id nor an embedded `#NNN` is treated conservatively — unresolved `depends-on` blocks dispatch (safer default: don't silently proceed), unresolved `conflicts-with` does not block (a conflict only matters if a PR is known to exist and be open). Both are visible, documented defaults, not silent gaps.
- **Prior-tranche archival** resolves "the previous tranche for project P" as any other active (non-`completed/`) tranche — candidate slugs still come from listing the `aeg-root/tranches/` directory, but each candidate's task/project touch is now forge-derived (task aeg-forge-state-v1 3a, #427), not file-parsed — whose forge-derived task list touches P and currently has zero open task Issues (a `vinaya/tranche:<slug>` label scan, one batched call per candidate) — the same criterion Section 15b's L1 check uses, applied per-project rather than per-tranche.
- **Forge calls are per-task-bounded, not repo-wide-batched** — `verify-dispatch` evaluates one task's dependency/conflict/prior-task set (typically under ten Issues/PRs), a fundamentally different scale than the coherence oracle's whole-tranche sweep (Section 15b), so individual `gh` CLI calls are used rather than a GraphQL batch — the §11 "batched forge calls only" constraint targets N+1 patterns over many issues, not a single task's small, bounded fact set.

### What is explicitly out of scope for

- **Automatic dispatch** — `verify-dispatch` reports readiness; it does not open worktrees, branches, or PRs. A human or automation layer still decides when to dispatch.
- **Wiring `checkPremiseCoverage` into the already-CI-wired `verify-brief.ts`/`checkBriefSections` aggregate** — that gate runs at PR-open time against a body with no guaranteed diff-derived surface-file list yet in every calling context; retrofitting a new blocking requirement into an existing CI-enforced gate, repo-wide, is a bigger decision than this seam's stated surface. `checkPremiseCoverage` is exported and enforced via `verify-task.ts` instead, which always has a real diff to check coverage against.
- **A `Tokens:` field gate** — `Tokens:` is not currently gated anywhere in `brief-validation.ts`; this task does not invent new gating scope for it (see the honest-conformance-sentinel note in this task's PR body).
