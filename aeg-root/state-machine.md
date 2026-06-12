# State Machine — the Agentic Execution Governance (AEG) Model

The constitution. This document defines the **Agentic Execution Governance (AEG)** model — the authoritative reference for artifacts, mutation permissions, authority hierarchy, escalation paths, and governance mechanics. AEG is governance plus orchestration of delegated AI execution; it is not project management (there is no product plan, timeline, or resource tracking here).

**AEG is forge-native, orchestrator-independent.** It depends on a Git forge (GitHub/GitLab) as its source of truth for execution state — task status is *derived* from Issue/branch/PR/merge state, never stored. It does not depend on any orchestration tool. Where this document names a specific tool (in this repo, Cetana), it is naming *this repo's* orchestration tool by way of example; AEG itself names no tool, and a tool may know AEG while AEG does not know the tool.

If you are unsure whether an action is permitted, the answer is here. If a role doc and this document conflict, this document wins.

For the prose walkthrough (eleven phases), see `process.md`. For the iteration/task model, see `iterations/README.md`. For role-specific instructions, see `roles/`. For the role-seam contracts, see `contracts/`.

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

Roles exist because different decisions require different accountability levels. The Principal is accountable for irreversible (Type 1) decisions. The Team Leader is accountable for reversible (Type 2) decisions within a ratification window. The Developer executes. The Reviewer (code and security specializations) judges shipped code with fresh context but cannot mutate it. The Archivist closes out.

The conversational role set is: **Principal, Team Leader, Developer, Reviewer** (plus the non-conversational Archivist). This four-role model was established by D-026 (superseding the original three-role D-001 to add the Reviewer). The **Team Leader has three modes** — Strategist, Planner, Brief Author (`roles/team-leader.md`, `roles/planner.md`) — but they are modes of one role, not new roles; the role count is unchanged. Security is a specialization of Reviewer, not a separate role.

**Role seams are governed by contracts.** Where one role hands work to the next (Planner → Brief Author, Brief Author → Developer, Developer → Reviewer, …), what crosses the boundary is defined **once**, in a contract file under `aeg-root/contracts/`, not described twice in two role docs (which drift). A contract is the single source of truth for its seam: the producing role fills it, the consuming role drains it, and the two role docs *point at* the contract rather than redefining it. The first is `contracts/planner-brief.md`; others are added as each seam is modeled. See Section 2 (Class 1) and Section 3.

**A task is a forge Issue, and its status is derived, never stored** (see Section 2, Class 2, and `iterations/README.md` §3). No role writes a status field; transitions are facts about the forge (branch exists, PR open, review decision, merged).

"What can I do?" → the mutation permission matrix. "Whose decision is this?" → the authority hierarchy. "What if I'm stuck?" → the escalation paths. "Is what I'm doing consistent with what was decided?" → the decision logs. "What must I hand the next role?" → the seam contract. "Which label goes where?" → the label vocabulary (Section 14).

### One AEG model, at the root. Always orient from there.

There is exactly one AEG model in this monorepo, at the repo-root `aeg-root/` (constitution, flow, roles, skills, contracts, the project registry `projects.md`). It exists nowhere else. **Any agent, executing any task for any project — an app, a package, a library, the monorepo itself — orients from `aeg-root/` first:** it reads the constitution, the role doc, the active iteration, and the decision log there. It never expects a per-project copy of the model.

Living **state** is held in `aeg-project/` folders: one at the repo root (for monorepo-level tasks) and one per project (`apps/<x>/aeg-project/`, `packages/<y>/aeg-project/`). A task updates the root `aeg-project/decisions.md` + `changelog.md` (governance is global) **plus** the `aeg-project/` slice of each project it touches (one for a single-project task, several for a cross-project task — resolve which via `aeg-root/projects.md`). An `aeg-project/` folder holds state only — never the model — which is what forces every agent back to `aeg-root/` for the rules. (D-041.)

---

## Section 2: Artifact Classes

Every artifact falls into one of five persistence classes. Persistence class determines how long it survives, how it's recovered, and what authority mutates it.

### Class 1: Repo files (canonical, git-tracked)

**What:** Specs (`apps/*/specs/*.md`), skills (canonical `aeg-root/skills/*/SKILL.md`, with a generated agent-surface view e.g. `.claude/skills/*` — D-039), **role-seam contracts (`aeg-root/contracts/*.md`)**, agent definitions, AEG model + state docs (`aeg-root/*.md` + `aeg-root/{roles,iterations,contracts,diagrams}/*.md` for the model; `aeg-project/*.md` for the state — D-041), source code, decision logs (per-project `*-decisions.md` + global `decisions.md`), scripts, CI workflows.

**Persistence:** Survives anything short of repo deletion. Git history preserves every mutation with authorship and timestamp.

**Create:** PR merged to main by Principal (or delegated merge for Tier 0/1).
**Mutate:** PR opened by Developer, reviewed by Reviewer (code + security) and TL (specs) and Principal (code), merged by Principal.
**Read-only:** All roles always.

**Contracts change as a unit.** A role-seam contract (`contracts/*.md`) is the single source of truth for what crosses a role boundary. Editing it is a **Tier 3** change requiring a `D-###`, because it alters a cross-role interface; and the producer and consumer sides change **together** — you cannot change what one role emits without, in the same PR, updating what the next role consumes. The two role docs on either side reference the contract; they never redefine the seam, so they need no field-level edit when the contract's *prose* changes, but the same PR must confirm both still point at it and match. (The first contract is `contracts/planner-brief.md`: Planner produces, Brief Author consumes.)

### Class 2: Forge objects (execution state + audit)

**What:** Issues (a task **is** an Issue — identity + metadata: the `tier:*` label, the `Project:` field, ticket link, dependency/conflict references — see Section 14 for the label vocabulary and the field-vs-label rule), Pull Requests, review decisions, CI run results, Issue/PR comments.

**Persistence:** Survives unless deliberately deleted. Treated as permanent for operational purposes.

**This is where execution status lives — derived, not written.** A task's status is computed from forge facts: Issue open/unassigned = `backlog`; assigned, no branch = `todo`; branch `task/<iteration>/<n>` exists, no PR = `in-flight`; PR open = `in-review`; PR `reviewDecision: CHANGES_REQUESTED` = `changes-requested`; merged = `merged`; an `aeg:blocked` label = `blocked`. No role sets a status field — opening the branch/PR and merging are the transitions.

**The provenance block (D-030) is a Class 2 object too — a close-out projection, not stored status.** At close-out the Archivist assembles a provenance record (task → intent → reviews → model → merge metadata) and posts it as a comment on the **merged** PR. It is *assembled from facts the merge already froze*, written once, append-only — a projection of frozen forge facts in exactly the way derived status is a projection of live forge facts. It is therefore explicitly **not** the forbidden "stored status" of `iterations/README.md` §9: it lives on the merged PR (never in the iteration file or the Issue), it records history (not current state), and nothing ever updates it. See `roles/archivist.md` and §13.

**Create:** TL (Issues, in Planner mode); Developer (PRs); Reviewer (review verdicts/comments); Archivist (advisory PR comments + the provenance block); any role (Issue comments with appropriate authority).
**Mutate:** Labels — the closed vocabulary in Section 14 (`tier:*`, `aeg:blocked`, `needs:*-input`, `needs:brief-correction`, `override:docs`), applied by the role and at the transition Section 14 specifies. **No `status:*` labels** — status is derived. Issue/PR body — the brief lives in the **PR body** (frozen after open — Section 7); the Issue body holds metadata only, never the brief, never planning fields (priority/estimates), which a required template + CI reject.
**Read-only:** All roles always.

### Class 3: Orchestration-tool runtime (ephemeral, optional)

**What:** If an orchestration tool is used, its runtime state — static config, append-only event logs, IPC files. In this repo that is Cetana (`~/.cetana/config.json`, `~/.cetana/tasks/N.jsonl`, `~/.cetana/tasks/N/`). **This class only exists when a tool is in use; AEG does not require it.**

**Persistence:** Survives process restarts; lost on machine reinstall; recoverable from the tool's backup.

**Create / mutate:** the orchestration tool, per its own protocol. The Principal edits the tool's config directly.
**Read-only:** All roles can inspect; the event log is human-readable for monitoring.

This is a tool detail, not part of the AEG model. Nothing canonical depends on it.

### Class 4: Worktrees (per-task isolation)

**What:** `.worktrees/task/<iteration>/<n>/` — a full repo checkout on branch `task/<iteration>/<n>`.

**Persistence:** Survives as long as the directory exists. Manual cleanup by the Principal; the Archivist flags merged worktrees as candidates.

**Create:** The Developer's worktree-first pre-flight Step 0 (manual flow), or an automation layer at dispatch (it creates the same worktree). Branch convention `task/<iteration>/<n>` is what lets any role derive a task's status from the forge.
**Mutate:** Developer works in the worktree — commits, file changes, test runs.
**Retire:** Principal runs `git worktree remove` after merge.
**Read-only:** All roles can inspect.

### Class 5: Conversation logs (ephemeral)

**What:** Chat sessions (any chat or coding-agent surface); an orchestration tool's progress events.

**Persistence:** Ephemeral; not reliably retrievable across sessions.

**Create:** Any conversational agent.
**Promote:** TL promotes decisions made during conversation to decision log entries (Section 6); Principal ratifies Type 1 promotions.
**Cannot mutate:** No role retroactively edits conversation logs.

---

## Section 3: Mutation Permission Matrix

Rows = artifact types. Columns = roles. "—" means no authority. The Reviewer is absent as a mutation authority (it has read + PR-review-comment authority only — see the subsection after the table).

| Artifact | Principal | Team Leader | Developer | Archivist |
|----------|-----------|-------------|-----------|-----------|
| **Conversation logs** | Promotes decisions to log, flags for retention | Writes during chat, proposes promotions to D-### | Reads only | Cannot mutate |
| **Iteration topology files** (`iterations/*.md`) | Approves PR | Writes (Planner mode) at plan time — task→issue map + edges + grouping; **no status, no PR numbers, no dates** | — | Flags execution-metadata creep in drift cron |
| **Role-seam contracts** (`contracts/*.md`) | Approves PR; Type 1 ratification (a contract is a cross-role interface) | Proposes via PR; changes producer + consumer sides together (Tier 3) | — | Flags a role doc that contradicts its contract in drift cron |
| **Task Issues** (identity + metadata) | Approves merge | Creates (Planner mode); metadata + Planner's rationale — no brief, no status, no planning fields | Reads; references via `Closes #N` | Validates template (no forbidden fields) |
| **Briefs (dispatched)** | Can amend via reply to escalation | Can amend via reply to escalation — logged as an event, NOT a brief edit | Reads only — brief is frozen after dispatch; escalate if wrong | Cannot mutate |
| **Briefs (pre-dispatch)** | Approves the brief | Writes the brief just-in-time per the `brief-authoring` skill, consuming the planner-brief contract; pastes to Developer (lands in PR body) | — | Validates structure; flags malformed (`needs:brief-correction`) |
| **Specs** (`apps/*/specs/*.md`) | Approves PR; ratifies via D-### if spec-only | Coherence review on PR; can open spec-only PRs | Writes in PR per brief scope | Validates cross-references; flags stale specs in drift cron |
| **Decision logs** (per-project + global) | Approves Type 1 entries; ratifies PENDING Type 2 at windows | Appends Type 2 entries; announces Type 1 to ratification queue | Appends in PR per brief scope | Validates D-### sequence and supersession integrity |
| **Skills** (canonical `aeg-root/skills/*/SKILL.md`) | Approves PR | Coherence review | Writes in PR per brief scope | Flags stale skill references in drift cron |
| **Agent defs** | Approves PR | Coherence review | Writes in PR per brief scope | Flags stale agent references in drift cron |
| **`state.md`**, **`now.md`** | Approves PR | Writes in PR (append-style for `now.md`) | Flags state changes needed in PR description | Updates per-project state at close-out, for every project the task listed |
| **Per-project backlogs** (`apps/*/specs/*-backlog.md`), `specs/ecosystem-backlog.md` | Approves PR | Writes (held/future items — out of the flow) | — | — |
| **`changelog.md`** | Approves PR | Appends per PR (never edits existing) | — | Appends at close-out |
| **`lessons.md`** | Approves PR | Appends lessons; monthly review | — | — |
| **`coordination.md`**, **`state-machine.md`** | Approves PR; final authority on system-level rule changes | Proposes changes via PR | — | Flags inconsistencies in drift cron |
| **`thinking.md`** | Reads | Writes freely in any TL session (best-effort, optional) | Reads | Flags if untouched >7 days |
| **`ratification-queue.md`** | Approves/rejects/defers items at windows | Appends items; marks resolved after Principal action | Appends via escalation (`severity: product`) | — |
| **Source code** | Merges PR | — | Writes in PR per brief scope; opens PR | — |
| **Forge labels** (the Section 14 vocabulary) | Applies `override:docs` (Principal-only) | Applies `tier:*` (Planner, at cut) + `needs:*-input` / `aeg:blocked` (by hand or via automation) | Applies `needs:*-input` / `aeg:blocked` (by hand or via automation) | Applies `needs:brief-correction`; asserts `tier:*` label == PR-body `Tier:` (drift cron) |
| **Task status** | — | — | — | — *(nobody writes it — derived from the forge)* |
| **Provenance block** (on the merged PR) | Reads (audit) | Reads (audit) | — | Assembles + posts at close-out (append-only; from frozen facts) |
| **Worktrees** | Removes after merge | — | Works in (created at dispatch) | Flags merged worktrees as cleanup candidates |
| **Orchestration-tool runtime** (if used) | Edits config; reads (audit) | Reads | Appends events via the tool | — |
| **CI/forge Actions** | Approves workflow changes via PR | Proposes workflow changes via PR | — | Runs as forge-CI automation |

### Reviewer & Security review authority (D-026, extended by D-030)

The Reviewer role has two specializations — code review (`roles/reviewer.md`) and security review (`roles/security.md`) — and one narrow authority profile:

- **Read:** all Class 1 (repo) and Class 2 (forge) artifacts, plus the brief (in the PR body) and the PR diff. **Including the `Project:` spec(s) in `apps/*/specs/`** — the code Reviewer checks the diff for **spec-conformance**, not only brief-conformance (D-030): a diff can satisfy its brief and still contradict or drift from the project's specced behavior, and catching that gap is the Reviewer's job. A spec **contradiction** is a BLOCKER; **drift** is a MAJOR finding; if the diff is right but the spec is stale, that is a `severity:strategy` escalation, not a failure. This adds **no new persistent artifact** — it reads the project spec that already exists. Always read-only on canonical artifacts.
- **Write:** PR review verdicts and review comments only (a Class 2 object). The verdict is the structured block in the role doc (`APPROVE | REQUEST CHANGES` for code, with a `SPEC CONFORMANCE` line; `PASS | FAIL` for security). A REQUEST CHANGES sets the PR's review decision, which is the derived `changes-requested` status — the Reviewer writes no status field.
- **Cannot:** edit code, specs, skills, decision logs, PM docs; mutate labels; or merge. The Reviewer reports; the Developer remediates; the Principal merges.
- **Independence:** fresh context (a separate invocation), never reviewing work it authored. This is the whole point.
- **Escalation:** a finding that exceeds review authority is marked `[ESCALATE] severity:strategy|product` and routed to the TL or Principal.

Because the Reviewer never mutates a canonical artifact, it has no column. Its position is Phase 10 (`process.md`): code-reviewer pass → security pass → Principal code review → TL spec review → merge.

---

## Section 4: Authority Hierarchy of Truth

When two artifacts conflict, which wins? Depends on **audit mode** vs **planning mode**. Note that *live task status* is never in this hierarchy — it is derived from the forge, which is definitional, not a claim to be ranked.

### Audit mode — "What is currently true?"

Used when verifying state, resolving contradictions, running verify-docs, post-mortems. Ordering (highest first):

1. Active decision logs (D-### Status: ACTIVE)
2. Ratified specs (`Status: ratified` + supporting D-###)
3. Shipped code (main — what actually runs)
4. Aspirational specs (`Status: target`)
5. PM docs (`state.md`, `now.md`, iteration files, `changelog.md`, `lessons.md`) — status snapshots / plan topology
6. Skills + `thinking.md`
7. Briefs / Issues / PR descriptions — intent at time of writing
8. Conversation logs / tool runtime logs — lowest

A contradiction (an ACTIVE decision says X, shipped code does Y) → the Archivist opens a CONTRADICTION entry (Section 11), which blocks new Tier 3 work on the affected subsystem until resolved.

### Planning mode — "What should we change it to?"

Used when designing future state, writing briefs, planning iterations. Ordering:

1. Active decision logs (intent governs the next mutation)
2. Target specs (`Status: target`)
3. Ratified specs (current accepted state)
4. Shipped code (what we're changing from)
5. PM docs — current priorities + the iteration's plan
6. Skills + `thinking.md`
7. Briefs / Issues / PR descriptions — prior intent
8. Conversation logs — lowest

**Mode selection:** "currently true?" → audit. "change it to?" → planning. verify-docs runs in audit mode; brief authoring and iteration planning run in planning mode.

---

## Section 5: Spec Ratification Mechanism

A spec file exists in one of four states:

| State | Header | Meaning | Authority rank (audit) |
|-------|--------|---------|------------------------|
| Draft | `Status: draft` | Intent, not commitment | Below shipped code |
| Target | `Status: target` | Aspirational future state | Below shipped code (planning rank: above code) |
| Ratified | `Status: ratified` | Committed decision | Above shipped code |
| Retired | `Status: retired` | Historical record | Below all active artifacts |

**Ratified iff both:** (1) the file carries the metadata block (`Status: ratified` / `Ratified on:` / `Ratified by:` / `Ratifies via: D-###`); and (2) the PR that introduced/last-modified it was either a spec-only PR approved by the Principal, or referenced by an ACTIVE decision entry with `Ratifies: <path>`. Otherwise it is `draft`.

Most specs are `draft` — no deliberate ratification pass has been done. Future PRs ratify as appropriate.

> Note (D-030): the Reviewer's spec-conformance check (§3) reads the project spec **as written** — at whatever ratification state it currently holds. A `draft` spec is still the project's stated intent and is checked against; a contradiction with a `ratified` spec is the most serious. The Reviewer never edits the spec; if it's wrong, that's an escalation.

---

## Section 6: Decision Log Schema

```markdown
## D-NNN — One-line title

**Date:** YYYY-MM-DD
**Status:** ACTIVE | SUPERSEDED | RETIRED | EXPIRED | PENDING
**Type:** 1 (irreversible — Principal must ratify) | 2 (reversible — TL can ratify)
**Supersedes:** D-NNN (if applicable)
**Superseded by:** D-NNN (if applicable)
**Lock:** YES | NO
**Ratifies:** <path to spec> (if this decision ratified a spec)
**Authored by:** Principal | TL
**Ratified by:** Principal | TL (delegated, if Type 2)
**Context:** 1-3 sentences.
**Decision:** 1-3 sentences.
**Alternatives rejected:** bullet list.
**Consequences:** what this implies.
```

**Status semantics:** ACTIVE (current canonical), SUPERSEDED (replaced — fill `Superseded by:`), RETIRED (retired without replacement), EXPIRED (context-bound assumptions no longer apply), PENDING (Type 2 made in a solo TL session, in effect but awaiting Principal ratification — cannot be acted on as ACTIVE for Type 1 matters).

**Append-only invariant:** logs are never edited in place. Status changes are new entries referencing the old via `Supersedes:`; the original gets `Superseded by:` filled and its `Status:` flipped to SUPERSEDED, body otherwise unchanged.

**Numbering is per-log, not globally unique.** Each log carries its own `D-###` sequence; numbers collide across logs deliberately. The legacy Vāda log (`apps/vada-ai/specs/vada-decisions.md`) runs its own sequence; the Cetana log (`apps/cetana-ai/specs/cetana-decisions.md`) runs its own. There is a Vāda D-025 and a global D-025 and they are different decisions. **Always disambiguate by naming the log** (e.g. "global D-026", "vada-decisions D-033"). The global log has apparent gaps because some early v3 decisions were filed in project logs. Within any single log, numbers are sequential and append-only; the Archivist validates within-log sequencing (Section 12).

---

## Section 7: Escalation Paths

When a Developer reaches a decision not covered by the brief, it escalates through the escalation mechanism — a manual escalation note, or, if dispatched by an automation layer, that layer's request-input mechanism — tagged with a `severity` that routes it. Each severity has a matching `needs:*-input` label (Section 14).

### Three severity levels

**`severity: execution`** — routine, answerable by the TL in Brief Author mode. ("Library X is deprecated"; "null or throw?"; "I need an unanticipated flag.") Adds label `needs:execution-input`; the TL replies; the Developer resumes.

**`severity: strategy`** — which design path to take; TL Strategist mode. ("The brief's approach A has a structural issue — switch to B?"; "this touches an undiscussed area"; "the diff is right but the spec is stale.") Adds `needs:strategy-input`; same path, different cognitive mode.

**`severity: product`** — requires a Principal decision. Rare; reserved for Type 1 decisions discovered during execution. Adds `needs:principal-input`. If the Principal is present, they decide and reply; if not, the item goes to `ratification-queue.md` and the Developer terminates, resuming via a follow-up dispatch after the window.

While blocked, the task carries an `aeg:blocked` label (the one status with no native forge fact). The Reviewer uses the same severity vocabulary for `[ESCALATE]` findings.

### Type 1 decisions during execution

Type 1 (irreversible) decisions cannot be self-ratified by the TL in a solo session. They ALWAYS go to the ratification queue unless the Principal is actively present (has replied to an escalation in this session). For queued items, the Developer terminates after acknowledgment and resumes after the window.

### Emergency override

If the brief itself is wrong in a way that blocks all paths, the Developer escalates with `severity: execution` and a `brief_amendment_needed` flag. The TL issues an amendment (logged as an event, not a brief edit — briefs are frozen) or kills the task. The original brief is preserved as the audit record.

---

## Section 8: Lock Mechanism

A decision entry with `Lock: YES` signals a closed design branch.

**A lock means:** future briefs touching the locked area MUST include `Conforms to lock: D-NNN` or `Challenges lock: D-NNN` + reason. A brief touching a locked area without either is malformed (advisory Archivist comment in V0; Brief Validation gate rejects it in V1).

**A lock does NOT mean permanence:** if new information changes the calculus, the TL proposes a D-### that SUPERSEDES the locked decision; the Principal ratifies if the original was Type 1.

**Current enforcement:** advisory only — the Archivist comments if a lock acknowledgment is missing. V0 discipline.

---

## Section 9: Tiered Documentation

Every piece of work is assigned an impact tier; the tier determines required documentation before the PR is ready. The tier is declared two ways that must agree — the `Tier:` field in the PR body (the binding source of truth, read by verify-docs) and the `tier:*` label on the Issue (the scannable projection). Section 14 defines the field-vs-label rule and the sync obligation.

**Tier 0 — Trivial.** Isolated, no API/contract changes, no patterns shifted. Required: code comments where non-obvious, PR description following template, declare `Tier: 0` in the PR body.

**Tier 1 — Implementation.** A meaningful feature/fix within existing architectural contracts. Required: Tier 0 + specs updated, skills updated if conventions shifted, `verify-docs --pr` passes.

**Tier 3 — Project/roadmap.** No Tier 2 (deliberately eliminated; disputes go to Tier 3). Qualifies when ANY of: introduces/breaks public contracts (including a role-seam contract in `contracts/`); changes roadmap sequencing or project direction; creates/modifies ACTIVE locks; requires Type 1 decisions; affects more than one project boundary; changes persistence/storage semantics; changes escalation/governance rules; requires Principal ratification to continue. Required: Tier 1 + decision entry (status, type, rationale, alternatives), state docs updated if state changed, Lock entry if irreversible, `docs-index.md` regenerated. Merge during a ratification window.

**Spike exception:** `spike: true` reduces docs to typecheck + lint + a decision entry capturing what was tried/learned. Spike code does not merge.

**Tier detection:** when in doubt between 1 and 3, choose 3 — the cost of excess docs is low; under-documented architectural change is how the BYOK gap happened. verify-docs assumes Tier 3 when a PR declares no tier.

---

## Section 10: Ratification Windows

1-2 daily windows batch governance decisions so the Principal isn't continuously interrupted.

**Batches at a window:** Type 1 decisions; Tier 3 PR merges; lock approvals; `severity: product` escalations; PENDING Type 2 decisions.

**Does NOT wait:** Tier 0/1 merges (anytime); `severity: execution`/`strategy` escalations (TL resolves); Type 2 decisions made with the Principal present.

**Cadence:** the Principal sets the times; the queue assumes no specific schedule. Items append to `ratification-queue.md`. **TL responsibility:** before the window, ensure pending items are appended with enough context to decide without follow-up; after, update artifacts to reflect what was ratified.

---

## Section 11: Contradiction Mechanism

The Archivist monitors for contradictions — shipped code, a ratified spec, and an active decision log disagreeing.

**Triggers:** the drift cron (spec dates vs referenced code dates); post-merge semantic-relatedness checks; or a direct report by any role.

**Entry format:** a `## CONTRADICTION — <topic>` entry in the relevant log listing the conflicting artifacts, `Escalation: Severity:Strategy`, `Status: unresolved`, `Owner: TL`. It auto-escalates as `severity: strategy` and blocks new Tier 3 work on the affected subsystem until resolved (`Status: resolved — see D-NNN`).

---

## Section 12: Enforced vs. Trusted Discipline

AEG runs along an **advisory → enforced gradient**. A mechanism can be *advisory* (it produces a finding; nothing blocks) or *enforced* (CI/gates block merge). A repo tightens mechanisms from advisory to enforced one at a time — it does not flip everything at once. **Observe mode (D-030) is the floor of this gradient:** every mechanism advisory, nothing enforced (see below). Full AEG is the ceiling: the gates below enforced.

### Observe mode — the advisory floor (D-030)

The lowest-commitment way to run AEG: read-only over a team's existing process. The roles produce their outputs — Reviewer/Security verdicts, the Planner's topology, the Archivist's provenance — but **none of it blocks a merge**; a finding is a comment, not a gate. Status is still **derived** from the forge (read-only); AEG writes nothing it wouldn't write in full mode except that the gates run **report-only** (they print what *would* fail). This is the "monitoring, not restriction" on-ramp (`aeg-manual-flow.md` §8); a team climbs from here by promoting one gate at a time to enforced.

### Enforced (CI blocks merge)

- **Tier-appropriate documentation** — the `verify-docs` script checks the PR's tier has the corresponding artifact changes; fails CI if missing. **Real (D-027)**, not a stub. The blocking workflow is installed at `.github/workflows/verify-docs.yml`. The gate also runs locally (this repo: `bun run verify-docs --pr`). (In observe mode this runs report-only.)
- **Typecheck, lint, tests** — standard CI gates; always blocking.
- **Issue template / no forbidden fields** — a required Issue template + a CI check reject planning metadata (priority/estimates/points) on task Issues, keeping them execution-only.
- **Brief validation** — Archivist Action checks brief structure; flags malformed briefs (`needs:brief-correction`). (Stub today; full implementation V0.7.)
- **D-### sequencing** — post-merge Archivist validates within-log sequencing (cross-log collisions expected — Section 6). (Stub today; full V0.7.)

### Trusted (agent discipline — no CI enforcement in V0)

- **Code-review and security passes** — Phase 10 requires them (D-026), including the spec-conformance check (D-030), but no CI bot dispatches them automatically yet; Principal + agent discipline. Automating dispatch is future work.
- **Dispatch gates** (depends-on merged / no conflicting PR open) — read from the forge and complied with; mechanical enforcement arrives when an automation tool runs dispatch (`iterations/README.md` §8).
- **Label discipline** (Section 14) — `tier:*` present on every task Issue and kept in sync with the PR-body `Tier:`; `needs:*-input` / `aeg:blocked` present-when-true *and removed when false*; no `status:*` labels; no label outside the closed set. Trusted discipline; the Archivist drift cron asserts the tier label/field match and flags stale `needs:*` labels.
- **Contract conformance** (a role doc matches its `contracts/*.md` seam) — trusted discipline; the Archivist drift cron flags a role doc that contradicts its contract. The contract is the source of truth; a divergent role doc is the bug.
- **Provenance assembly at close-out** (D-030) — the Archivist assembles it; trusted discipline today, automatable later. It records, it never gates.
- **Decision logging during chat** — TL announces and logs during the conversation; CI cannot verify.
- **No execution metadata in the iteration file; no dynamic conflict scanner** — the two anti-regression rules (`iterations/README.md` §9); trusted discipline, flagged by the Archivist drift cron and the Planner's gates.
- **`thinking.md` updates; ratification-window attendance; lock acknowledgment (advisory in V0); spec ratification passes** — all trusted.

### Emergency override

- `[skip-archivist]` in a commit message: suppresses Archivist advisory comments.
- `override:docs` PR label (or `[override:docs]` in the body, or `OVERRIDE_DOCS=1`): suppresses the verify-docs gate for this PR.
- Author should be the Principal (verified by the forge commit author field).

Every override is logged (verify-docs prints that the override was active; the Archivist records it). This is an audit mechanism, not a security one — the Principal can always override; the log keeps it visible.

---

## Section 13: Append-Only Artifacts

Append-only; never edited in place except to add `SUPERSEDED`/`RETIRED`/`EXPIRED` status or fill forward-reference fields:

- All decision logs (per-project `*-decisions.md` + global `decisions.md`)
- `aeg-project/ratification-queue.md`
- `aeg-project/retrospectives/*.md` (when created)
- **The provenance block on a merged PR** (D-030) — assembled once at close-out from frozen facts, posted as a PR comment, never updated. Append-only by construction: a record of what shipped, not a status to maintain.
- An orchestration tool's runtime event logs, if one is used

**"Append-only" means:** new entries go at the end; existing entries are not rewritten to match new understanding; status transitions are new entries referencing old ones; the log grows, never shrinks. If you want to edit an existing entry, you are almost certainly writing a new entry that supersedes it.

**Exception:** filling `Superseded by:` / `Ratified by:` on an existing entry (and flipping its `Status:` to match) is permitted — narrow forward-reference edits that preserve the append-only intent.

---

## Section 14: Label Vocabulary

Labels are a Class 2 (forge) concern. This section is the **single source of truth** for the label system: the closed set, what each label means, who applies it and when, and whether it is mandatory.

### The governing principle: a label only exists where the forge can't tell you natively

The forge already tells you, for free, whether a branch exists, a PR is open, a review was requested, and a merge happened — so **status is derived, never labeled** (the `No status:* labels` rule). A label earns a place in the vocabulary *only* when it marks something the forge cannot show you natively: impact (tier), a block that has no branch/PR fact behind it, a routing of "who must answer," or a deliberate override. If the forge can answer it, it is not a label.

### "Mandatory" has two shapes

- **Always-mandatory** — present on every task, exactly once. (Only `tier:*`.)
- **Conditional-mandatory** — present **if and only if** the condition it signals is true. The obligation runs both ways: it MUST be added when the condition becomes true, and it MUST be removed when the condition becomes false. A stale `needs:principal-input` on a resolved Issue is as much a violation as a missing one — a conditional label is a **live signal, not a sticker**.

The only genuinely **optional** label is `override:docs`, because it is an escape hatch — forcing it would be a contradiction.

### The closed set

No label outside this table may be applied to a task Issue or its PR. (The Archivist drift cron flags out-of-vocabulary labels.)

| Label | On | Marks (what the forge can't say) | Who applies / when | Mandatory? |
|---|---|---|---|---|
| `tier:0` / `tier:1` / `tier:3` | Issue (+ mirrors the PR-body `Tier:`) | Impact tier — drives required docs (§9) and whether it merges at a ratification window. The forge has no concept of "impact." | **Planner** sets it at Issue cut (plan-time estimate). The **PR-body `Tier:`** is the binding value at merge; the Developer corrects the field if execution reveals a different tier, and re-syncs the label. | **Always-mandatory** — exactly one per task |
| `aeg:blocked` | Issue | A block that has **no forge fact** behind it ("waiting on an answer" isn't visible from branch/PR state). | Developer/TL when a task is blocked on an escalation; **removed** the moment it unblocks. | Conditional-mandatory |
| `needs:execution-input` | Issue | Routes an open escalation to the **TL (Brief Author mode)** (§7). | Developer at escalation; removed when answered. | Conditional-mandatory |
| `needs:strategy-input` | Issue | Routes to the **TL (Strategist mode)**. | Developer at escalation; removed when answered. | Conditional-mandatory |
| `needs:principal-input` | Issue | Routes to the **Principal** — the surface the Principal scans to see what is waiting on them. | Developer at escalation; removed when answered. | Conditional-mandatory |
| `needs:brief-correction` | Issue/PR | The Archivist's "this brief is malformed" flag (§3, §12). | Archivist (automation); removed when the brief is fixed. | Conditional-mandatory |
| `override:docs` | PR | Suppresses the verify-docs gate for one PR (§12). | **Principal only**, deliberately. | **Optional** (escape hatch) |

### Two rules that are easy to get wrong

1. **Project is a field, not a label.** A task's project(s) live in the `Project:` field (Issue body + PR body), resolved against `aeg-root/projects.md` — **never** as a label. (Multi-valued, registry-validated; a label can't carry that cleanly, and it would collide with the "no planning metadata on Issues" rule.) If you reach for a "project label," stop — set the `Project:` field.

2. **Tier is a field *and* a synced label, and the field wins.** The PR-body `Tier:` is the **source of truth** (it's what `verify-docs` reads, it lives in the reviewed PR body, it has history). The `tier:*` label is a **mandatory projection** of it onto the Issue so the board is scannable (filter `tier:3` to see what needs a ratification window). They MUST agree; the Archivist asserts `label == field` and flags a mismatch. Ordering: the **Planner sets the label at cut** as a plan-time estimate; the **field is the execution-time truth at merge**. If they disagree, the field is right and the label is corrected — never the reverse.

### Why no other labels

Everything teams commonly reach for is already covered without a label: *status* (derived from the forge), *priority/estimates/points* (planning metadata — lives in the company's tool, rejected on Issues by §2 + CI), *project* (the `Project:` field), *assignee* (a native forge field, and assignment is the `todo` transition). Adding a label for any of these would re-introduce a second, drifting source of truth for a fact the model already has a home for. The vocabulary stays small on purpose.
