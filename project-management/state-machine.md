# State Machine — Atta Operational Model

The constitution. This document is the authoritative reference for artifacts, mutation permissions, authority hierarchy, escalation paths, and governance mechanics in the Atta operational model. Roles derive from this document; this document does not derive from roles.

If you are unsure whether an action is permitted, the answer is here. If you find a contradiction between a role doc and this document, this document wins.

For the prose walkthrough of the process (eleven phases), see `process.md`. For the visual schema, see `diagrams/process-flow.md` and `diagrams/system-architecture.md`. For role-specific instructions, see `roles/`.

---

## Section 1: Purpose

The Atta operational model is not role-based. It is a **state transition system**.

Artifacts have states. Roles are interfaces that are authorized to trigger certain transitions. The architecture looks like this:

```
Artifact class
  → state (draft, ratified, target, superseded, ...)
  → authorized transitions (who can mutate, ratify, retire)
  → escalation path (what happens when a decision exceeds role authority)
```

Roles exist because different decisions require different accountability levels. The Principal (Dani) is accountable for irreversible decisions (Type 1). The Team Leader is accountable for reversible decisions (Type 2) within a ratification window. The Developer executes. The Archivist automates.

"What can I do?" is answered by the mutation permission matrix. "Whose decision is this?" is answered by the authority hierarchy. "What if I'm stuck?" is answered by the escalation paths. "Is what I'm doing consistent with what was decided?" is answered by the decision logs.

The state machine framing exists because it's precise. "The TL manages PM docs" is imprecise — it says who, not when, with what constraints, and at what authority level. The matrix below is precise.

---

## Section 2: Artifact Classes

Every artifact in the system falls into one of four persistence classes. Persistence class determines how long the artifact survives, how it can be recovered, and what authority is required to mutate it.

### Class 1: Repo files (canonical, git-tracked)

**What:** Specs (`apps/*/specs/*.md`), skills (`.claude/skills/*/SKILL.md`), PM docs (`project-management/*.md`, `project-management/roles/*.md`, `project-management/diagrams/*.md`), source code (`apps/*/`, `packages/*/`), decision logs (per-product `*-decisions.md` + global `decisions.md`), scripts (`scripts/`), CI workflows (`.github/workflows/`).

**Persistence:** Survives anything short of repo deletion. Git history preserves every mutation with authorship and timestamp.

**Create:** PR merged to main by Principal (or delegated merge for Tier 0/1 work).
**Mutate:** PR opened by Developer, reviewed by TL (specs/skills) and Principal (code), merged by Principal.
**Ratify:** See Section 5 (ratification mechanism applies to specs).
**Read-only:** All roles always.

### Class 2: GitHub objects (governance + audit)

**What:** Issues (with labels, milestones, body), Pull Requests, CI run results, Issue/PR comments.

**Persistence:** Survives unless deliberately deleted. GitHub's own retention. Treated as permanent for operational purposes.

**Create:** TL or Developer (Issues); Developer (PRs); Archivist (advisory PR comments); any role (Issue comments with appropriate authority).
**Mutate:** Labels: TL and Developer via Cetana tools; Archivist via automation. Body: TL (briefs are frozen after dispatch — see Section 7). Status: Cetana automation on dispatch/completion.
**Read-only:** All roles always.

### Class 3: Local filesystem (runtime)

**What:** `~/.cetana/config.json` (static config), `~/.cetana/tasks/N.jsonl` (JSONL append-only event log), `~/.cetana/tasks/N/` (IPC files: `question.json`, `reply.json`, `mcp-config.json`).

**Persistence:** Survives process restarts. Lost on machine reinstall. Recoverable from `~/.cetana` backup if needed. StateManager rehydrates from JSONL on startup.

**Create:** Cetana Coordinator (config on first run; JSONL files on dispatch; IPC files on block/reply).
**Mutate:** JSONL: append-only by Cetana servers (strategist + executor). IPC files: written and deleted by Cetana servers per IPC protocol. Config: Principal edits `~/.cetana/config.json` directly.
**Read-only:** All roles can inspect. JSONL is human-readable for `tail -f` monitoring.

### Class 4: Worktrees (per-task isolation)

**What:** `~/code/atta/.worktrees/issue-N/` — full repo checkout on `feat/issue-N` branch.

**Persistence:** Survives as long as the directory exists. Manual cleanup by Principal. Archivist flags merged worktrees as cleanup candidates.

**Create:** Cetana `dispatch_task` (via `worktree.ts`).
**Mutate:** Developer works in the worktree — commits, file changes, test runs.
**Retire:** Principal runs `git worktree remove` after PR is merged.
**Read-only:** All roles can inspect at any time.

### Class 5: Conversation logs (ephemeral)

**What:** Chat sessions (Claude Desktop, web, Claude Code), Cetana JSONL progress events.

**Persistence:** Ephemeral. Chat sessions are not reliably retrievable across Claude versions or session boundaries. Cetana progress events are runtime-local.

**Create:** Any conversational agent.
**Promote:** TL selects decisions made during conversation and promotes them to decision log entries (see decision log schema, Section 6). Principal must ratify Type 1 promotions.
**Cannot mutate:** No role can retroactively edit conversation logs.

---

## Section 3: Mutation Permission Matrix

Rows = artifact types. Columns = roles. Each cell describes what the role can do. "—" means the role has no authority over this artifact.

| Artifact | Principal | Team Leader | Developer | Archivist |
|----------|-----------|-------------|-----------|-----------|
| **Conversation logs** | Promotes decisions to decision log, flags for retention | Writes during chat, proposes promotions to D-### | Reads only (no chat sessions during Cetana dispatch) | Cannot mutate |
| **Briefs (dispatched)** | Can amend via reply to escalation | Can amend via `cetana.reply_to_blocked_task` — logged as JSONL event, NOT brief edit | Reads only — brief is frozen after dispatch; escalate via `cetana_request_input` if wrong | Cannot mutate |
| **Briefs (pre-dispatch)** | Approves issue brief, sets `status:ready` | Writes brief per `.claude/skills/brief-authoring/SKILL.md`, opens Issue | — | Validates structure, sets `status:blocked` if malformed |
| **Specs** (`apps/*/specs/*.md`) | Approves PR; ratifies via D-### if spec-only | Coherence review on PR; can open spec-only PRs | Writes in PR per brief scope | Validates cross-references; flags stale specs in drift cron |
| **Decision logs** (per-product + global) | Approves Type 1 entries; ratifies PENDING Type 2 at windows | Appends Type 2 entries; announces Type 1 to ratification queue | Appends in PR per brief scope | Validates D-### sequence and supersession integrity |
| **Skills** (`.claude/skills/*/SKILL.md`) | Approves PR | Coherence review | Writes in PR per brief scope | Flags stale skill references in drift cron |
| **`state.md`**, **`now.md`** | Approves PR | Writes in PR (append-style for `now.md` "in flight" entries) | Flags state changes needed in PR description | — |
| **`roadmap.md`** | Approves PR | Writes in PR (sprint-level updates) | — | Flags stale track status in drift cron |
| **`changelog.md`** | Approves PR | Appends entries per PR (never edits existing) | — | — |
| **`lessons.md`** | Approves PR | Appends lessons; monthly review | — | — |
| **`coordination.md`**, **`state-machine.md`** | Approves PR; final authority on system-level rule changes | Proposes changes via PR | — | Flags inconsistencies in drift cron |
| **`thinking.md`** | Reads | Writes freely in any TL session (best-effort, optional) | Reads | Flags if untouched >7 days in drift cron |
| **`ratification-queue.md`** | Approves/rejects/defers items at ratification windows | Appends items; marks resolved after Principal action | Appends items via escalation (`severity: product`) | — |
| **Source code** | Merges PR | — | Writes in PR per brief scope; opens PR | — |
| **GitHub Issue labels** | — | Writes via Cetana tools or direct GitHub | Writes via Cetana tools | Writes via automation (archivist.yml) |
| **Worktrees** | Removes after PR merge | — | Works in (Cetana creates per dispatch) | Flags merged worktrees as cleanup candidates |
| **JSONL logs** | Reads (audit) | Reads | Appends via `cetana_request_input` tool | — |
| **CI/GitHub Actions** | Approves workflow changes via PR | Proposes workflow changes via PR | — | Runs as GitHub Actions automation |

---

## Section 4: Authority Hierarchy of Truth

When two artifacts make conflicting claims, which one wins? The answer depends on whether you are in **audit mode** or **planning mode**.

### Audit mode

**Used when:** verifying current state, resolving contradictions, running the verify-docs script, post-mortem analysis.

**Question this answers:** "What is currently true?"

**Ordering (highest to lowest authority):**

1. Active decision logs (D-### Status: ACTIVE) — the most recent explicit decision governs
2. Ratified specs (specs with `Status: ratified` header + supporting D-### — see Section 5)
3. Shipped code (main branch — what actually runs)
4. Aspirational specs (`Status: target` — describes future state, does not outrank running code)
5. PM docs (`state.md`, `now.md`, `roadmap.md`, `changelog.md`, `lessons.md`) — status snapshots
6. Skills + `thinking.md` — operational guidance, not constitutional claims
7. Briefs / Issues / PR descriptions — intent at time of writing
8. Conversation logs / Cetana JSONL logs — lowest; ephemeral, not curated

When audit mode returns a contradiction (e.g., an ACTIVE decision says X but shipped code does Y), the Archivist opens a CONTRADICTION entry (see Section 11). The contradiction must be resolved before new Tier 3 work touches the affected subsystem.

### Planning mode

**Used when:** designing future state, writing briefs, setting targets, architectural design.

**Question this answers:** "What should we change it to?"

**Ordering (highest to lowest authority):**

1. Active decision logs (intent governs the next mutation)
2. Target specs (`Status: target` — describes where we're going)
3. Ratified specs (current accepted state — starting point for change)
4. Shipped code (current runtime substrate — what we're changing from)
5. PM docs — current priorities
6. Skills + `thinking.md` — operational context
7. Briefs / Issues / PR descriptions — prior intent
8. Conversation logs — lowest

**Mode selection rule:** "What is currently true?" → audit mode. "What should we change it to?" → planning mode. The verify-docs script runs in audit mode. Brief authoring runs in planning mode. When in doubt, name the mode you're using.

---

## Section 5: Spec Ratification Mechanism

A spec file (`apps/*/specs/*.md`) exists in one of four states:

| State | Header value | Meaning | Authority rank (audit mode) |
|-------|-------------|---------|----------------------------|
| Draft | `Status: draft` | Not yet ratified; represents intent, not commitment | Below shipped code |
| Target | `Status: target` | Describes future state; aspirational | Below shipped code (planning mode rank: above code) |
| Ratified | `Status: ratified` | Explicitly ratified; represents committed decision | Above shipped code |
| Retired | `Status: retired` | No longer authoritative; kept for historical record | Below all active artifacts |

**A spec is ratified if and only if both are true:**

1. The spec file contains the following metadata block at the top:
   ```markdown
   Status: ratified
   Ratified on: YYYY-MM-DD
   Ratified by: Principal (or TL with explicit Principal delegation)
   Ratifies via: D-### (the decision log entry that authorized this ratification)
   ```

2. The PR that introduced or last modified the spec was either:
   - A spec-only PR (no code changes) approved by Principal, OR
   - Referenced by an ACTIVE decision log entry with field `Ratifies: <path-to-spec>`

A spec without these markers is `draft`. A spec marked `Status: target` is aspirational.

**All specs in this repo as of the v3 model ship are draft** — no deliberate ratification pass has been done. Future PRs ratify specs as appropriate. The new `cetana-spec.md` is `draft` as of this PR; a future spec-only PR can ratify it once the V0 operational pattern is confirmed by real use.

---

## Section 6: Decision Log Schema

Every entry in any decision log (per-product or global) uses this format:

```markdown
## D-NNN — One-line title

**Date:** YYYY-MM-DD
**Status:** ACTIVE | SUPERSEDED | RETIRED | EXPIRED | PENDING
**Type:** 1 (irreversible — Principal must ratify) | 2 (reversible — TL can ratify)
**Supersedes:** D-NNN (if applicable)
**Superseded by:** D-NNN (if applicable)
**Lock:** YES | NO (if YES, future briefs must reference or challenge)
**Ratifies:** <path to spec> (if this decision ratified a spec)
**Authored by:** Principal | TL (session timestamp or chat reference)
**Ratified by:** Principal | TL (delegated, if Type 2)
**Context:** Brief setup of the problem — 1-3 sentences.
**Decision:** What was decided — 1-3 sentences.
**Alternatives rejected:** What was considered and why rejected — bullet list.
**Consequences:** What this implies for the codebase and future decisions.
```

**Status semantics:**

- **ACTIVE** — current canonical decision; governs the area it covers
- **SUPERSEDED** — replaced by a newer decision (fill `Superseded by:` with the new D-###)
- **RETIRED** — explicitly retired without replacement (context changed, decision no longer relevant)
- **EXPIRED** — context-bound; the assumptions that made this decision valid no longer apply (e.g., V0-only decisions after V1 ships)
- **PENDING** — Type 2 decision made in a solo TL session; decision is in effect but awaits Principal ratification at the next ratification window. A PENDING decision cannot be acted on as ACTIVE for Type 1 matters.

**Append-only invariant:** Decision logs are never edited in place. Status changes are new entries that reference the old D-### via `Supersedes:`. The original entry gets `Superseded by:` filled in, but its body is not changed. This preserves the audit trail.

---

## Section 7: Escalation Paths

When a Developer reaches a decision point not covered by the brief, they call `cetana_request_input` with a `severity` field.

### Three severity levels

**`severity: execution`** — routine question answerable by the TL in Brief Author mode.

Examples: "The brief says to use Library X but it's been deprecated"; "should this return null or throw?"; "I need a flag I didn't anticipate."

Routing: adds GitHub label `needs:execution-input`. TL sees the blocked task via `cetana.list_active_tasks`, formulates a reply, calls `cetana.reply_to_blocked_task`. Developer resumes.

**`severity: strategy`** — question about which design path to take; requires TL Strategist mode.

Examples: "The brief assumed approach A but I see a structural issue — should I switch to B?"; "this work touches an area we haven't discussed."

Routing: adds GitHub label `needs:strategy-input`. Same technical path as execution; different cognitive mode for the TL.

**`severity: product`** — question requiring Principal decision. Rare. Reserved for Type 1 decisions discovered during execution.

Examples: "This affects user-visible behavior in a way the brief didn't address"; "I need to make an irreversible architectural decision."

Routing: adds GitHub label `needs:principal-input`. If Principal is immediately available: TL surfaces the question, Principal decides, reply is sent. If Principal is not available: item goes to `ratification-queue.md`; Developer terminates the task and resumes via a follow-up dispatch after the next ratification window.

### Type 1 decisions during execution

Type 1 (irreversible) decisions discovered during a Developer dispatch cannot be self-ratified by the TL in solo session. They ALWAYS go to the ratification queue unless Principal is actively present in the Claude Desktop chat. "Actively present" means the Principal has replied to an escalation in this session — not just that a Claude Desktop chat is open.

V0 timeout limit: `cetana_request_input` has a 30-minute timeout. For decisions queued for ratification windows (which may be hours away), the Developer should terminate after receiving the queue acknowledgment. V0.7 will add longer-lived blocking.

### Emergency override

If the Developer determines the brief itself is wrong in a way that blocks all forward paths, they call `cetana_request_input` with `severity: execution` and include a flag `brief_amendment_needed: true` in the question text. The TL either issues an amendment (logged as a JSONL event, not a brief edit — briefs are frozen) or kills the task. The original brief is preserved as the audit record regardless of what the amendment says.

---

## Section 8: Lock Mechanism

A decision log entry with `Lock: YES` signals that a design branch is closed. The decision was made deliberately and is not open for reconsideration without an explicit challenge.

### What a lock means

Future briefs that touch the locked area MUST include one of:

```markdown
Conforms to lock: D-NNN
```

or:

```markdown
Challenges lock: D-NNN
Reason: <why this lock should be reconsidered>
```

A brief that touches a locked area without either acknowledgment is malformed. In V0, the Archivist surfaces this as an advisory PR comment. In V1, the Brief Validation gate will reject the brief outright.

### What a lock does NOT mean

A lock is not permanent. It means "we closed this branch deliberately." If new information changes the calculus, the TL can propose a D-### entry that SUPERSEDES the locked decision. The Principal must ratify if the original was Type 1. Once superseded, the new decision's `Lock: YES/NO` governs.

### Current V0 enforcement

Advisory only. The Archivist posts a comment on the PR if a missing lock acknowledgment is detected. This is V0 discipline — agents are expected to follow it, not just wait to be caught.

---

## Section 9: Tiered Documentation

Every piece of work is assigned an impact tier. The tier determines what documentation is required before the PR is ready to open.

### The tiers

**Tier 0 — Trivial.**

Qualifies when: the change is isolated, self-contained, no API or contract changes, no patterns shifted.

Required documentation: code comments where non-obvious. PR description following template.

**Tier 1 — Implementation.**

Qualifies when: a meaningful feature or fix that changes behavior but stays within existing architectural contracts.

Required documentation: Tier 0 items, plus specs updated to reflect new behavior, skills updated if conventions shifted, `bun run verify-docs --pr` passes.

**Tier 3 — Product/roadmap.**

No Tier 2 — deliberately eliminated. Classification disputes go to Tier 3 if in doubt.

Qualifies when ANY of the following are true:
- Introduces or breaks public contracts (API, MCP tool surface, schema)
- Changes roadmap sequencing or product direction
- Creates or modifies ACTIVE locks (`Lock: YES` in a decision log)
- Requires Type 1 decisions
- Affects more than one product boundary
- Changes persistence or storage semantics
- Changes escalation or governance rules
- Requires Principal ratification to safely continue

Required documentation: all Tier 1 items, plus decision log entry appended (with status, type, rationale, alternatives), PM docs updated if state changed, Lock entry created if irreversible, `docs-index.md` regenerated. Merge happens during ratification window.

### Spike exception

A brief tagged `spike: true` reduces documentation to: code passes typecheck and lint, decision log entry capturing what was tried and what was learned. Spike code does NOT merge to main — it rebases away or converts to a Tier 1+ task in a separate brief.

### Tier detection rule

When in doubt between Tier 1 and Tier 3: choose Tier 3. The cost of excess documentation is low. The cost of under-documented architectural changes is high — that is precisely how the BYOK gap happened (spec lagged implementation for weeks with no formal documentation of the divergence).

---

## Section 10: Ratification Windows

The Principal's availability is bounded. Continuous interruption for approvals is operationally unsustainable for a solo-founder + AI swarm workflow. Ratification windows solve this by batching governance decisions.

### What batches at a ratification window

- Type 1 decisions requiring Principal ratification
- Tier 3 PR merges (require Principal presence to merge)
- Lock approvals
- `severity: product` escalations (queued because Principal was unavailable)
- PENDING Type 2 decisions (made in solo TL sessions, not yet ratified)

### Cadence

1-2 daily windows. Typical times: 9am and 5pm (local time), adjusted as needed. Dani sets the actual times; the queue doesn't assume a specific schedule.

Items append to `project-management/ratification-queue.md`. The format is defined in that file. At each window, the Principal reads the queue, resolves items (ratify, reject, or defer), and updates the `Resolution:` field.

### What does NOT wait for a ratification window

- Tier 0 and Tier 1 PR merges — anytime
- `severity: execution` and `severity: strategy` escalations — TL resolves immediately
- Type 2 decisions made in a session where Principal is actively present

### TL responsibility at windows

Before the window, the TL ensures all pending items have been appended to `ratification-queue.md` with enough context for the Principal to decide without asking follow-up questions. After the window, the TL reads the resolutions and updates the relevant artifacts (decision logs, spec headers, PM docs) to reflect what was ratified.

---

## Section 11: Contradiction Mechanism

The Archivist monitors for contradictions — cases where shipped code, a ratified spec, and an active decision log disagree. These are high-signal problems: they indicate that documentation lagged a code change, or that a decision was made without updating its referenced artifact.

### What triggers contradiction detection

- Archivist drift cron (daily): compares spec modification dates to referenced code modification dates; flags specs significantly older than the code they describe
- Post-merge validation: when a PR changes code, Archivist checks referenced decision logs for semantic relatedness
- Direct report: any role can open a CONTRADICTION entry manually

### Contradiction entry format

When a contradiction is detected, the Archivist creates a `## CONTRADICTION — <topic>` entry in the relevant decision log:

```markdown
## CONTRADICTION — <brief topic description>
Detected: YYYY-MM-DD
Artifacts in conflict:
- D-NNN (decision log entry)
- apps/product/specs/spec-name.md
- apps/product/src/affected-module.ts
Escalation: Severity:Strategy
Status: unresolved
Owner: TL
```

This entry auto-escalates as `severity: strategy` and blocks new Tier 3 work touching the affected subsystem until resolved. Resolution replaces the `Status: unresolved` with `Status: resolved — see D-NNN` (the new decision that resolved it).

---

## Section 12: Enforced vs. Trusted Discipline

Not everything in this system is enforced. Some discipline is trusted — expected of agents, but not mechanically verified. Being explicit about this is important so agents know where the hard edges are.

### Enforced (CI blocks merge)

- **Tier-appropriate documentation** — `scripts/verify-docs.ts` checks that the PR's impact tier has the corresponding artifact changes. Fails CI if missing. (V0.7 stub currently exits 0; full implementation V0.7.)
- **Typecheck, lint, tests** — standard CI gates; always blocking.
- **Brief validation** — Archivist GitHub Action checks brief structure on Issue open; sets `status:blocked` if malformed. (V0.7 stub currently no-ops; full implementation V0.7.)
- **D-### sequencing** — post-merge Archivist validates that decision log numbers are sequential without gaps or duplicates across all decision logs. (V0.7 stub; full implementation V0.7.)

### Trusted (agent discipline — no CI enforcement in V0)

- **Decision logging during chat** — TL is expected to announce and log significant decisions during the conversation itself, not after. CI cannot verify this.
- **`thinking.md` updates** — best-effort optional working memory. Not depended on by any other process.
- **Ratification window attendance** — Principal must show up at windows. No mechanism enforces this; it's a commitment.
- **Lock acknowledgment in briefs** — advisory Archivist comment in V0; blocking in V1.
- **Spec ratification passes** — no automated trigger. Requires deliberate decision to ratify.

### Emergency override

When a human needs to bypass a gate:

- `[skip-archivist]` in the commit message: suppresses Archivist advisory comments for this commit
- `[override:docs]` PR label: suppresses the `verify-docs` gate for this PR
- Author must be the Principal (verified by GitHub commit author field)

Every override is logged as `task.failed` with reason "Archivist override invoked" in the Cetana JSONL. This is not a security mechanism — it's an audit mechanism. The Principal can always override; the log ensures the override is visible.

---

## Section 13: Append-Only Artifacts

The following artifacts are append-only and must never be edited in place except to add `SUPERSEDED`, `RETIRED`, or `EXPIRED` status fields to existing entries:

- All decision logs (per-product `*-decisions.md` + global `decisions.md`)
- `project-management/ratification-queue.md`
- `project-management/retrospectives/*.md` (when created)
- Cetana JSONL logs at `~/.cetana/tasks/`

**"Append-only" means:**

- New entries go at the end (or a clearly marked new section)
- Existing entries are not rewritten to match new understanding
- Status transitions are new entries that reference old ones, not in-place edits to the old entry
- The log grows; it never shrinks

The point of append-only is that the log is an audit trail, not a living document. If you find yourself wanting to edit an existing entry, you are almost certainly writing a new entry that supersedes it.

**Exception:** Filling in `Superseded by:` or `Ratified by:` fields on an existing entry is permitted — these are forward references that cannot be known at time of writing. They are narrow, targeted edits that preserve the append-only intent.
