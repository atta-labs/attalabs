---
name: brief-authoring
sidebar_title: Brief Authoring
description: Rules for authoring task briefs dispatched to Developer agents. Load when writing or reviewing a brief. Covers the Brief Author's conversational protocol, required sections, inheriting the Planner's rationale via the planner-brief contract, the contract-conformance checklist, the mandatory technical-dependency / tech-surface-map / agent-selection-with-reasoning sections, the optional Ticket/Project fields, model selection, the model integration (tier field, principal_delegate, Type 1/2 declaration, lock acknowledgment), the mandatory worktree-first step, the brief-lands-in-the-PR-body rule, the standing autonomy clause, the explicit documentation-update list, the post-PR review passes, and anti-patterns.
---

<!-- CANONICAL SOURCE (D-039). This file is the canonical home of the `brief-authoring` skill, inside the AEG unit (aeg-root/skills/). D-039 provides for an agent-specific GENERATED VIEW under .claude/skills/ (or another agent's equivalent), rebuilt from this file rather than authored by hand — but no such generator exists yet, and this repo has no generated view of this skill: agents are pointed at aeg-root/ directly (root CLAUDE.md). Edit THIS file; if a generator is ever built, regenerate rather than hand-editing its output. -->

# Brief Authoring Rules

Every task brief the Planner / Brief Author writes or dispatches must follow these rules. They exist because vague briefs produce vague work, and well-structured briefs can be handed to any Developer agent — a coding agent dispatched by an automation layer, or a direct paste — with no additional context.

**This skill is Brief Author mode.** Load it when the Planner / Brief Author is authoring or reviewing a brief. Do not load for strategy/architecture (Strategist mode) or for planning a whole iteration (Planner mode — see `aeg-root/roles/planner.md`).

**Where the brief lives.** The brief is the task's full execution context. It is **pasted to the Developer, not committed**, and it **lands in the PR body** when the Developer opens the PR — that is its permanent, durable home, read by the Reviewer and Archivist. A brief is **never** put in the task's forge Issue (the Issue holds identity + metadata + the Planner's rationale, not the brief; a brief there would go stale before work starts). Context lives entirely in the brief: if it isn't in the brief, it doesn't exist.

**The brief is the prompt, and the prompt is where control over the agent lives.** Brief authoring is the single highest-leverage governance act in AEG: a precise brief makes a capable agent do exactly the right thing; a vague one makes the same agent improvise. Treat every required section below as a control surface, not paperwork.

---

## Conversational protocol — how the Brief Author talks to the Principal

The Brief Author follows the shared conversational protocol (`aeg-root/aeg-manual-flow.md` §4.5) — the same legibility discipline the Planner uses, specialized for briefing. The Principal must always know **who is speaking, which stage of briefing they're in, what was just read, and what comes next.** Briefing one task is smaller than planning a whole iteration, so this is lighter than the Planner's version — but the spine is identical, and the close-out is just as important.

The Brief Author's stages — name them, and say which you're in:

**Announce the role + the task on entry.** *"I'm the Brief Author. I'll turn task <n>'s Planner rationale (Issue #N) into the executable brief — first I read the rationale, then I dig the current code for the perishable detail, then I run the contract checklist, then hand you the brief to dispatch."*

1. **Inherit** — read the task's Planner rationale (the contract's producer side). Narrate it back briefly: *"3a's rationale: boundary is the engine's structured-output path, blast radius is engine+vada+herald, the trap is the Anthropic-only sdkShape. Starting from that — not a blank page."* This is conversational-protocol "reflect back," and it proves the contract is being consumed, not re-derived.

2. **Dig** — the deep pass for the *perishable* detail (current signatures, exact file list, final model pick). Narrate the load-bearing reads: *"Reading `llm.ts` now to get the current vendor-branch shape for the surface map."* If the dig **contradicts** the rationale (boundary moved, sizing broke), STOP and say so — that's a `severity:strategy` escalation back to the Planner, announced, not a silent fix.

   **Mechanized pre-authoring gate (D-081).** Before beginning the rest of the Dig, run `bun packages/aeg-core/bin/verify-dispatch.ts <iteration> <n>`. It mechanically re-derives the precondition checks below — row-existence, Issue-existence, prior-iteration archival — directly from a freshly-fetched `origin/main` and the live forge, and prints the exact failing predicate by name (plus a leftover-branch verdict and an informational finding-count baseline). A `NOT READY` result is the same STOP this section describes below — read the printed blocker and act on it; do not re-derive the fact by hand. The manual `gh`/`jq` procedures that follow remain as the **why** (what each precondition means, and how to verify it by hand if `verify-dispatch` is ever unavailable) — they are no longer the primary workflow. This exists because four Developer agents independently re-derived, and stopped on, the exact same archival fact from scratch during the 2026-07-02/03 dispatch wave, at real token cost, hours after it first became true — a fact any of these checks answers deterministically in seconds. **This gate now also runs mechanically** (aeg-governance-hardening task 25, #365) — `.husky/pre-push` invokes it on a task branch's first push — but running it yourself here, before the Dig, remains the cheaper, earlier catch: it stops you before any work is spent, not after. (D-120, 2026-07-13: prior-task archival — the row-adjacency check formerly listed here — was removed from this composed gate; see check (c) below, now superseded.)

   **Read obligation (D-058) — complete during Dig, before Draft:** As part of the Dig, identify any specs/skills/docs relevant to this task's code surface and read them. This obligation is conditional — if no docs exist for this surface, it is trivially satisfied. The Planner's "Docs to keep coherent" rationale field is the starting point; your own reading may surface additional docs the Planner missed. Then:
   - (a) Surface in **Context (§2)** what the Developer must know from those docs — explicitly, not by reference ("read X for context" is not surfacing knowledge).
   - (b) Populate **§7 doc-update list** from this reading — name every doc this task will make incoherent. The §7 list is the DoD obligation (parallel to tests); a §7 populated from memory rather than reading is the failure D-058 exists to close. If genuinely no documented surface is touched, state "No doc updates required (Tier 0)" in §7 explicitly.

   **Task-status coherence precondition (D-056) — SUPERSEDED by D-120 (2026-07-13).** This precondition (D-052 item 1, the per-task archival / row-adjacency gate) is no longer a hard-STOP for the Brief Author — D-077's automated post-merge provenance posting made the drift signal it protected moot. See `docs/decisions-legacy.md` D-120. Preserved below as historical record — do NOT enforce it:

   ~~Before authoring any brief, apply the full coherence precondition from `aeg-root/contracts/brief-developer.md`. The archival bar for any prior task is all three of: (1) Issue closed, (2) PR merged to main, (3) provenance block present on the merged PR. "PR merged" alone is NOT sufficient. **STOP — do NOT author the brief** if any predicate fails for any in-scope prior task; report to the Principal what is owed.~~

   ~~**Accepted-backfill never bypasses this precondition.** Deferring provenance backfill on already-closed historical iterations is a permitted debt record. But that acceptance clause is strictly limited to closed historical iterations. Proceeding with a new brief on an unarchived active prior — citing "we accepted the backfill gap" — is not permitted. An accepted historical backlog is a debt record, not a gate bypass. The coherence precondition applies to active prior tasks; it cannot be waived by citing accepted historical gaps.~~

   ~~**Scope of "prior task" (state all three explicitly in your STOP report):**~~
   - ~~**Mid-iteration task:** every earlier task in the same iteration that this task depends on.~~
   - ~~**First task of an iteration:** the entire previous iteration of that product must be archived (all Issues closed, all PRs in main, all provenance blocks present, iteration file in `completed/`).~~
   - ~~**ALL tasks:** every cross-iteration dependency declared in the topology must satisfy all three predicates.~~

   **Precondition checks — three checks, in order (D-120: check (c), prior-task coherence, is superseded — see below):**

   - **(a) Row-existence (D-054, D-075).** Confirm via the forge (`iteration:<slug>`-labeled Issue titled `[<slug>] <n> — …`, and its Milestone) — not `aeg-root/iterations/<name>.md` — that this task's row exists **at all** (`findMilestoneForSlug` + `listTasksForSlug`, `@atta/aeg-forge-state`). This is distinct from and prior to check (b)'s `#TBD`/blank check: a missing row means the plan/Issue for this task has not merged/opened yet, and there is nothing to inspect — no Issue, no dependencies, no `Project(s)` value. If the row is absent: **STOP — do NOT author the brief:** *"Task <id> is not present in iteration `<name>`'s forge-derived task list (no `iteration:<name>`-labeled Issue with this task id yet) — the plan/Issue for this task hasn't merged/opened. Not authorable until it does."*

   - **(b) Issue-existence (D-054).** Confirm via the forge (`iteration:<slug>`-labeled Issue titled `[<slug>] <n> — …`, and its Milestone) — not `aeg-root/iterations/<name>.md` — that the Issue carries a real GitHub Issue number, not `#TBD`, not blank. If none exists, the task has no forge Issue. **STOP — do NOT author the brief:** *"Task <id> in iteration `<name>` has no Issue (#TBD) — it is backlog, not dispatchable. The Planner must cut the Issue first."* First task ever in a brand-new iteration may lack Issues if the Planner has not finished cutting them; stop and surface the gap regardless. A brief cannot carry a `Closes #N` reference if there is no N.

   - ~~**(c) Prior-task coherence (D-052, D-056).**~~ **SUPERSEDED by D-120 (2026-07-13)** — no longer a Brief Author check. Preserved as historical record: ~~For every in-scope prior task, verify all three archival predicates. First: query the most-recently-merged task PR in this iteration:~~
     ```
     gh pr list --state merged --json number,headRefName,mergedAt \
       | jq '[.[] | select(.headRefName | startswith("task/<iteration>/"))] | sort_by(.mergedAt) | last'
     ```
     ~~Then check all three predicates on that PR:~~
     - ~~**Issue closed:** `gh issue view <issue-N> --json state | jq '.state'` — must be `"CLOSED"`~~
     - ~~**PR in main:** confirmed by the merged status of the PR above~~
     - ~~**Provenance block present:**~~
       ```
       gh pr view <N> --json comments \
         | jq '.comments[].body | select(test("AEG.*provenance|provenance.*task"; "i"))'
       ```
     ~~If any predicate fails, **STOP — do NOT author the brief.** Report the exact status of all three predicates: *"Prior task PR #N (Issue #M) does not pass the coherence gate: Issue #M is [open/closed], PR #N is [merged/unmerged], provenance block is [present/absent]. The Archivist must fully close out the prior task before this brief can be authored."* First task in an iteration (no prior merged task PR) passes trivially.~~

   - **(d) Iteration archival (D-052).** For each product named in the brief's `Project:` field, check whether a prior iteration for that product exists in `aeg-root/iterations/` but is absent from `aeg-root/iterations/completed/`. If any such unarchived iteration exists and all its task PRs are merged, the Iteration Archivist has not run. **STOP — do NOT author the brief:** *"Product `<X>`'s previous iteration `<name>` is complete but not archived — the Iteration Archivist must run before this task can be briefed. Dispatch it first."* First iteration on a product passes trivially.

   A brief authored for an unauthorable task is a wasted dispatch round-trip: the Developer's gates (`developer.md` entry gate items 3, 5, and 7) will refuse it at execution. Catch it here, one stage earlier.

3. **Draft** — write the brief, every required section. Move in confirmable steps for a big brief; for a small one, draft it and reflect the shape back before finalizing.

4. **Contract checklist** — run the seven-field conformance check (below) out loud, so the Principal sees every Planner field landed in its brief home. This is the briefing analogue of the Planner's readiness gate: a visible gate, not a silent one. Then run it **mechanically** on the drafted brief file, before dispatch:

   ```
   bun packages/aeg-core/bin/verify-brief.ts --body-file <path-to-brief.md>
   ```

   Same validator CI runs at PR time, one stage earlier — a missing section costs a re-draft here instead of a red gate after the Developer has already done the work. Exits non-zero and names each missing section. The branch is read from the brief's own Step 0 `git worktree add … -b <branch>` line, so `Closes #N` is required only when that line declares a `task/<iter>/<n>` branch.

5. **Clarifications** — if any `[NEEDS CLARIFICATION]` markers remain, present them as a numbered list and **wait** — never dispatch with unresolved markers.

6. **Done — close out clearly.** Signal completion and whose move it is: *"Brief complete for task <n>. Contract checklist passes, no open clarifications, Tier declared, worktree Step 0 in place. The brief is ready to dispatch — that's yours (assign the Issue / paste to the Developer). Next task in the wave is <m>."* The Principal must never wonder whether the brief is finished or what happens next.

**Durability note (protocol step 7):** a brief is **not committed** — it's pasted and lands in the PR body when the Developer opens the PR. Say so plainly, so the Principal knows the brief lives in the dispatch/PR, not in a repo file, and isn't surprised that it's not on `main`. (The *rationale* it was built from is durable, on the forge; the brief is the perishable execution layer.)

Keep it light — a sentence per seam. Terse remains the house style; this adds signposting, not bulk.

---

## Start from the Planner's rationale — governed by the Planner→Brief contract

Every task you author a brief for arrives with a **Planner's rationale** (in the Issue body and the iteration file — see `roles/planner.md`). You are the **consumer side** of the **`aeg-root/contracts/planner-brief.md`** contract — the single source of truth for what crosses the Planner→Brief Author seam. That contract maps every field the Planner emits to the exact brief section that consumes it. **Read the contract; consume every right-column mapping — drop no field.**

The rationale arrives in the **D-078 grammar** (bold-inline `**<Field>** — …` or `### <Field>` heading) — the same format `verify-coherence`'s R1 check and the `bin/open-issue.ts` creation gate parse. You don't need to parse it yourself; by the time a task reaches you it has already passed the gate. See the contract's "Rationale grammar (D-078)" section if a field is ambiguous.

The contract's field-by-field mapping (authoritative version lives in the contract; reproduced here for convenience — if they ever differ, the contract wins):

| Planner emits (rationale) | You consume it in |
|---|---|
| Boundary | Context (§2) + Technical Surface Map (§4) |
| Sizing | re-confirm only; if your dig finds it no longer fits → stop-and-escalate |
| Project(s) + blast radius | `Project:` field + blast-radius re-verification (§8) |
| Dependency rationale | Technical Dependencies (§3) |
| Traps to avoid | Context (§2) + Constraints (§11) |
| Suggested agent-class | `For:` + `Reason:` header (confirm/deviate; you make the final pick) |
| Stop-and-escalate | Stop conditions (§10) |
| Docs to keep coherent | §7 documentation-update list — starting point, supplemented by your own Dig reading (D-058) |

**Read it first and build on it. Do not start from a blank page.** The division of labor is deliberate:
- The **Planner** did a deep technical pass to find the seams and persisted the *durable* conclusions (which don't decay) — that's the contract's producer side.
- You do your own deep pass now, at dispatch, to add the *perishable* detail that has to be current (exact signatures, the precise file list, the final model pick) — because the codebase has moved since planning.

So the brief = the planner's rationale (inherited via the contract) + the current execution detail (you add). You are not re-deciding the boundary or the blast radius; you are turning the planner's conclusions into an executable prompt against today's code. If your dig contradicts the planner's rationale (the code moved enough to change the boundary or break the sizing), that is a `severity:strategy` stop-and-escalate back toward the Planner, **not** a silent override.

### Contract-conformance checklist (run before dispatch — say it out loud)

Before a brief is dispatchable, confirm **every one of the seven Planner fields landed in its named brief home.** This is the consumer-side gate of the planner-brief contract — the briefing analogue of the Planner's readiness gate. Tick each; a dropped field is a lost conclusion and makes the brief malformed.

- [ ] **Boundary** → is the brief's **Context (§2)** scoped to it, and does the **Technical Surface Map (§4)** make its in/out-of-surface set concrete against current code?
- [ ] **Sizing** → re-confirmed it still fits one PR? (If the dig says it no longer fits → **stop-and-escalate**, don't silently re-split.)
- [ ] **Project(s) + blast radius** → does the `**Project:**` field carry the identical project set, and does **§8 verification** re-verify every named blast-radius consumer?
- [ ] **Dependency rationale** → did each edge's *why* become a concrete **Technical Dependency (§3)** "what must already exist" precondition?
- [ ] **Traps to avoid** → is every trap an explicit "do NOT do X; do Y instead" in **Context (§2) / Constraints (§11)**? (Highest-value field — never drop it.)
- [ ] **Suggested agent-class** → did you confirm or deviate (with reason) and make the final pick in the **`For:` + `Reason:`** header?
- [ ] **Stop-and-escalate** → are the Planner's stop conditions copied into the brief's **Stop conditions (§10)**, substance-verbatim?
- [ ] **No instruction contradicts the surface map** → if the brief tells the executor to **delete or rename a shared symbol** (a constant, type, export, function), confirm **every importer is inside the §4 surface.** If an importer is out-of-surface, the "delete it" instruction and the "don't touch that file" boundary contradict — defer the deletion to the task that owns the importer, and say so in the brief. (See the **shared-symbol importer check** in §4.)
- [ ] **Row-existence and Issue-existence preconditions (D-054, D-075)** → does the task's row exist at all in the iteration topology file, read from a freshly-fetched `origin/main`? If not, the plan PR hasn't merged — **STOP** and do not author the brief. If the row exists, does its Issue column carry a real GitHub Issue number (not `#TBD`, not blank)? If not, the task is backlog — **STOP** and surface the need for the Planner to cut the Issue before proceeding. A brief cannot carry `Closes #N` without a real N. (Mirrors Developer entry gate items 3 and 7; catches it one stage earlier, during Dig.)
- [ ] ~~**Task-status coherence precondition (D-052, D-056)** → for every in-scope prior task, do all three predicates hold: Issue closed, PR merged to main, provenance block present?~~ **SUPERSEDED by D-120 (2026-07-13)** — no longer a checklist item; D-052 item 1 is removed as a hard-STOP. See `docs/decisions-legacy.md` D-120. (Mirrors Developer entry gate item 5, prior-iteration-archival, which remains live; item 4 is the superseded one.)
- [ ] **Read obligation + §7 populated from reading (D-058)** → did you identify and read the relevant specs/skills/docs for this task's code surface during the Dig? Does §7 name every doc this task will make incoherent (or state "No doc updates required" if none)? A §7 populated from memory rather than from reading is malformed — the Brief Author's reading is what makes the DoD obligation trustworthy.

Plus the brief's own structural gates: worktree Step 0 present; `Tier:` declared; doc-update list non-empty for Tier 1+; **Test Plan (§9) present and tagged** — either `Test Plan: unit-tests-only` (and §4 has no runtime surface) or a checkbox list with at least one `[agent]` or `[principal]` item per reachable surface kind; the standing autonomy clause present in §11; no `[NEEDS CLARIFICATION]` left unresolved. When all boxes tick, announce it (protocol step 4/6) and the brief is dispatchable.

**The structural half of that paragraph is mechanical — run it, don't eyeball it:** `bun packages/aeg-core/bin/verify-brief.ts --body-file <brief.md>` (protocol step 4). The judgment items above it stay human; the presence items below it are exactly what the gate checks. Note the gate applies **whatever the branch is** — a standalone `fix/*` brief is graded identically to a `task/*` one, because it is equally a brief (the `fix/*` bypass that used to skip it let a fix brief ship with no §7 list; D-129).

---

## Required sections (in order)

**Start from the template file:** copy `aeg-root/templates/brief-template.md` and fill its placeholders — it packages the 12-section shape below as a literal skeleton, so you never reconstruct the container from prose. The sections below remain the source of truth for what each one must *contain*; the template changes where you start, not what is required.

### 1. Header block

```
**For:** [model + environment, e.g., "Sonnet (a coding-agent CLI on a dev machine, interactive session)"]
**Reason:** [why this model/environment was chosen — see "Agent/model selection" below]
**Owner:** [who owns the task — the Principal, by default]
**Goal:** [one sentence: what ships]
```

**Role-chain preamble (mandatory, every brief):** every brief opens by naming the executor's role and its reading chain: *"You are the AEG Developer. Read `aeg-root/roles/developer.md` first"* — plus the host repo's own execution-discipline skill if one exists (this repo: `.claude/skills/executor-protocol/SKILL.md`). The chain lives **in the brief** (an AEG artifact) because the host repo must never point into AEG (D-072); a bare "read the repo's executor skill" dispatch without this preamble is malformed.

### 2. Context — read before doing anything

Full background the executor needs:
- What the project is and what state it's in
- What was previously validated (reference prototypes, prior PRs, experiments)
- Why this work is happening now (not "later")
- What's locked and should not be relitigated
- Relevant decisions already made (reference decision-log entries by log + number)
- **The Planner's rationale for this task** (inherited via the contract — boundary, blast radius, traps, stop conditions). Carry it forward; the executor must see the planner's reasoning, not just the goal.

Length: as long as needed. This section prevents the executor re-deriving architecture that's already decided.

### 3. Technical dependencies (mandatory — the "what must already exist" map)

**List every technical precondition this task depends on, by name.** This is distinct from the forge `depends-on` edge (which is task→task); this is the *code/system* dependencies. It is where the Planner's **Dependency rationale** (the *why* of each edge) becomes the concrete *what-must-exist*. The executor must know what it is building on. Identify and state:
- **New shared exports/APIs it needs** — does this task require a function, type, or export that another task is adding to a shared package? (If yes, that's a `depends-on` and the export must exist at dispatch.)
- **Schema/migration preconditions** — does it need a DB column, a migration, a vendor-registry entry, a config key that must be present first?
- **Capability preconditions** — does it rely on a capability that may not exist yet (e.g. "structured output on this vendor")? If the capability is being added by a dependency task, say so and confirm it merged.
- **External services / credentials** — what must be provisioned and authenticated (keys, tokens, endpoints) for the task to run *and* to be verified?

A task whose technical dependencies aren't all satisfiable at dispatch is **not dispatchable** — STOP and surface it.

### 4. Technical surface map (mandatory — the "what this touches" map)

**Name the bounded set of files, packages, APIs, and schemas this task will create or modify.** This is the perishable detail the planner deliberately left to brief-time — derive it now, against the current codebase, starting from the planner's **Boundary**. It must be a *nameable, bounded* surface (if you cannot bound it, the task is too big — kick back to the Planner). Include:
- The exact files/dirs to create or modify (paths).
- The shared packages touched and — echoing the planner's blast radius — the consumers that must be re-verified.
- The APIs/schemas/contracts read or changed.
- What is explicitly **out of surface** (adjacent files the executor must NOT touch).

This map is what makes "only the expected files changed" checkable at review (Section 8) and what stops scope creep.

#### Shared-symbol importer check (mandatory before writing any "delete" or "rename" instruction)

Before the brief instructs the executor to **delete, rename, or change the signature of a shared symbol** — a constant, type, export, function, or file that other code imports — **find every importer first** (a repo-wide search for the symbol name), and confirm each importer is **inside the §4 surface**. Then:
- **All importers in-surface** → the delete/rename instruction is safe; write it.
- **Any importer out-of-surface** → the instruction contradicts the out-of-surface boundary: "delete X" breaks the typecheck of a file the brief also says "do not touch." **Do not write the contradiction.** Instead, **defer the deletion to the task that owns the out-of-surface importer**, and say so explicitly in the brief (e.g. *"keep `SYMBOL` for now — `/api/other` still imports it; task N deletes it when it migrates that importer; until then the old and new definitions are kept in lockstep"*).

A brief that says "delete a shared symbol" **and** "don't touch one of its importers" is **malformed** — it forces the executor to either break out-of-surface code or violate the delete instruction. The importer check is what stops the Brief Author writing two individually-sensible instructions that are jointly impossible. (This is the brief-time analogue of the dig discipline: verify the actual importer set against the codebase before asserting a delete is safe, rather than assuming the symbol is used only where you expect.)

#### Premise pins (mandatory when §4 names a real code surface, D-081)

Every brief whose Technical Surface Map (§4) includes a real code file carries a **`Premise:`** block — one or more pinned, checkable facts about that surface as it stood at authoring time:

```
**Premise:**
- packages/aeg-core/src/docs/surfaced-manifest.ts contains: export function isSurfacedDoc
- apps/herald-ai/web/src/lib/prompts.ts absent: SKEPTICAL_AUDITOR_PROMPT
```

Exactly three assertion kinds — `contains:<literal-substring>`, `absent:<literal-substring>`, `sha256:<hex>` (whole-file hash). This is a pin format, not a DSL; do not invent additional kinds. `verify-dispatch --premise <body-file>` re-asserts every pin immediately before the Developer's Step 0 — a failed premise means the surface moved between authoring and dispatch (the live-fire failure this closes: two briefs described a target architecture a later, uncited migration had already superseded), and is a stop condition, not a silent re-guess.

**Authoring rules:**

- **At least one assertion's path must fall inside the §4 surface map** — `checkPremiseCoverage` (Brief Validation) fails a brief with a real code surface and zero premise coverage.
- **Pin the fact your brief's reasoning most depends on** — usually "the function/export this brief says exists, still exists" or "the constant this brief says is absent, is still absent." A premise pinning something trivial and unrelated to the brief's actual reasoning defeats the point.
- **A Tier 0 brief with zero runtime/code surface has nothing to pin** — omit the `Premise:` block entirely (mirrors the Test Plan's `unit-tests-only` exemption, §9).
- **Do not pin more than a handful of facts** — this is a targeted stale-premise detector, not a full pre-flight snapshot of the surface.
- **This is a Brief-Author-only field — the Planner does not emit a premise-candidate field in the rationale.** Premises are perishable, file-content-level detail (current signatures, current constants), squarely the Brief Author's half of the Planner/Brief Author division of labor (see "Start from the Planner's rationale" above) — not a durable conclusion the Planner should be pinning at plan time, when the file content is more likely to have moved by dispatch.

### 5. Pre-flight checks

Numbered checklist. **The first pre-flight step is always creating a worktree — no exceptions.**

#### Step 0 (mandatory, verbatim) — create the worktree

Every brief's pre-flight begins with the worktree command. Never write a brief that assumes the executor is already in the right place, and never tell it to "create a branch" without first creating a worktree:

```
git worktree add .worktrees/task/<iteration>/<n> -b task/<iteration>/<n> origin/main && cd .worktrees/task/<iteration>/<n> && bun install --frozen-lockfile --silent
```

The branch convention is `task/<iteration>/<n>` — this is what lets any role derive the task's status from the forge (branch exists, PR open, merged). When dispatched by an automation layer, the layer creates this worktree for you; the brief still states the command explicitly so a manual paste behaves identically.

This is non-negotiable because work done on the wrong branch or in a dirty main checkout is the most common, most expensive avoidable failure.

#### Remaining pre-flight checks

After the worktree exists, verify: working dir clean (`git status`); branch correct (`git log --oneline -3` shows `origin/main` as parent); target dir does/doesn't exist as required; required tools present at the right version; external services authenticated; reference material accessible; **every technical dependency from Section 3 is actually present** (the new export exists, the migration ran, the capability is live). **Also verify the dispatch gates against the forge:** every `depends-on` task's PR is merged, and no `conflicts-with` sibling's PR is open. Each check has a clear pass/fail; on failure the executor STOPs and reports.

**Branch-ID verification (mandatory, before writing Step 0 into the brief).** Before writing the Step 0 `git worktree add` command into the brief, confirm via the forge (`iteration:<slug>`-labeled Issue titled `[<slug>] <n> — …`, and its Milestone) — not `aeg-root/iterations/<name>.md` — that the branch-name suffix you are about to write (`<n>`) literal-matches this task's forge-derived id — character for character: no added prefix (no `T` in front of a bare number), no case change, no truncation. If it doesn't match, do NOT author the brief with the wrong branch name — use the forge-derived id instead. A brief whose Step 0 branch name doesn't literal-match its forge-derived task id is malformed; refuse to dispatch it and fix the branch name before handing it over. (D-073 — closes a confirmed gap where every numbered task branch in `vada-production-v1` used a `T`-prefix, e.g. `T1`, against a topology `#` column of bare `1`, undetected for over a week until a CI gate first checked it.)

### 6. Numbered parts with numbered tasks

Break work into Parts (major areas) and numbered tasks within each. Each task specifies: exact files to create/modify (from the Section 4 surface map); exact function/type signatures (not prose); constraints (no auto-remove, no extra tools, no UI in V0); verification steps. Do NOT leave implementation details to the executor's judgment unless you explicitly trust it and say so.

### 7. Documentation-update list (explicit, tier-tied)

Do not leave documentation as an implication of the tier checklist. **List the exact doc artifacts this brief must touch, by name.** This is what `verify-docs` (a real gate — Section 10) and the code-reviewer check against.

- **Spec files in the surface map must carry a `Status:` field** — any spec file listed in §4 that lacks one must have `Status: draft|target|ratified|retired` added as part of this task. The `verify-docs` C1 gate (accepted values: draft, target, ratified, retired) will fail the PR otherwise.
- **Never list a new file for a one-off report, audit finding, coverage summary, or working brief (D-074).** If the task's deliverable is a finding, an audit result, or a coverage report, its home is the PR body (task-scoped) or an Issue/PR comment (not task-scoped) — never a new file under `aeg-root/` or a product's `aeg-project/`. A committed scratch file has already broken AEG Studio once (a coverage report committed as `aeg-root/iterations/<name>.audit.md` was silently parsed as a broken iteration by the Studio loader) and produced a stale permanent brief once (`aeg-project/briefs/<name>-brief.md`, contradicting this skill's own "pasted, not committed" rule above). See `iterations/README.md` §9 rule 4.
- **Tier 0** — usually none. State "No doc updates required (Tier 0)."
- **Tier 1** — name each: which spec(s) reflect the new behavior, which skill(s) if a convention shifted, `docs-index.md` if files were added/removed/renamed.
- **Tier 3** — all Tier 1 items, plus: a decision anchor — either (a) the exact decision log file (`docs/decisions-legacy.md` or which `apps/*/specs/*-decisions.md`) and the D-### to append, or (b) a `Conforms-to: D-###` field in the brief's header (for work that implements an existing decision without introducing a new one — omit the decision log file from the doc-update list in this case). Also: which state changes (the per-project pinned state Issue, D-110; the iteration file; per-project backlogs); whether a `Lock: YES` entry is created. **Never** list `roadmap.md` or `now.md` — both retired (`roadmap.md` by D-029; `now.md` by D-057). Active-work state is derived from the forge, not written to a file.

A Tier 1+ brief with an empty doc-update list is malformed.

**Head this section `Documentation-update list`, literally.** The gate's heading pattern is `(?:documentation|doc)[- ]update(?:\s+list)?` — `## Documentation-update list`, `## 7. Documentation update`, `## Doc-update list` all match; the natural-sounding **`## Documentation to update` does not**, and a brief headed that way fails the gate with "no Documentation-update list section found" even though the list is right there. Two live fix briefs were written that way. Run the `--body-file` check above and the wording is caught before dispatch instead of at PR time.

### 8. Verification before claiming done

Typecheck passes; lint passes; tests pass; production build passes (catches stricter resolution typecheck misses); manual smoke tests; **every consumer named in the blast radius (Section 4) re-verified** (a shared-package change must prove it didn't regress the other consumers — that's what putting them in `Project(s)` was for); the repo's `verify-docs --pr` gate passes (real gate — D-027); `git diff main --stat` confirms only expected files (the Section 4 surface) were touched. *(The exact commands are this repo's toolchain — substitute the repo's declared equivalents; the obligations are universal.)*

These are the **static** gates — they prove the code compiles, lints, types, tests, and matches the declared surface. They do not prove the feature works. Runtime verification is its own section (§9), separately required, separately gated.

### 9. Test Plan (mandatory — tagged runtime verification, executed before merge)

**The Test Plan is a required brief field.** It is the *runtime* counterpart to §8's static gates: the named, executable observations that prove the shipped change actually works against a booted app, not just that it compiles. The Verification phase (`aeg-root/roles/developer.md` § Verification) consumes this section directly — without a Test Plan, Verification has nothing to run and the merge gate is undefined.

Every Test Plan item carries one of two tags, by who can structurally execute it:

- **`[agent]`** — non-auth, scriptable items the dispatched Developer-agent runs against the booted app: SSRF rejections, route response shapes, parse-error responses, render smoke, malformed-input behavior. Each item names a concrete observable (HTTP status + body, a console line, a DOM node) and the exact command/curl that produces it. Verification pastes the actual output as evidence — paraphrase is not evidence.
- **`[principal]`** — auth-gated, key-dependent, or visual items only the Principal can run in a real signed-in browser: a signed-in BYOK audit returning a CLEAN report, a ModelPicker render behind Clerk, a visual confirmation that a card lands in the right column. Each item names what the Principal does and what they should observe. The Principal ticks the box.

Pure-logic tasks (a parser, a sum function, a markdown normaliser — no API route, no page, no server action) declare:

```
**Test Plan:** unit-tests-only
```

This is a **first-class allowed value**, not an empty skip — it is the explicit declaration that the brief touches no runtime surface and that the CI unit-test gate is the whole proof. A brief that *does* touch a runtime surface and declares `unit-tests-only` is malformed; Brief Validation rejects it.

A well-formed Test Plan looks like:

```
**Test Plan:**
- [ ] **[agent]** SSRF: `curl -X POST .../api/resolve-input -d '{"url":"http://10.0.0.1"}'` → 400 "URL rejected"
- [ ] **[agent]** Malformed upload: `.md` with binary bytes → 400 "Parse error: …"
- [ ] **[agent]** Route smoke: `GET /api/audit/health` → 200 `{"ok":true}`
- [ ] **[principal]** Sign in → upload a CV (PDF) → run audit → CLEAN report with grade A/B/C/D
- [ ] **[principal]** ModelPicker renders in `/settings`; switching persists across a refresh
```

The unchecked boxes are the merge gate: an unticked `[agent]` box means the Developer has not yet posted the evidence comment; an unticked `[principal]` box means the Principal has not yet verified in the browser. A PR with an unticked box is not mergeable.

#### Authoring rules

- **Every brief with runtime surface has a Test Plan with at least one `[agent]` item and at least one `[principal]` item when both kinds of paths are reachable.** A brief that touches an API route (= an `[agent]`-runnable surface) AND a page behind Clerk (= a `[principal]`-runnable surface) lists both. A brief that touches only one of those lists only that kind.
- **A Test Plan is `unit-tests-only` if and only if the §4 Technical Surface Map has no runtime surface in it** — no API route, no page, no server action, no `runtime`-marked file. (If §4 lists, say, `apps/herald-ai/web/src/app/api/foo/route.ts`, you cannot declare `unit-tests-only`.) The two fields are coupled; Brief Validation mechanically rejects a body that declares `Test Plan: unit-tests-only` while also carrying a tagged `- [ ]`/`- [x]` checkbox item (`checkTestPlanExclusivity`, `packages/aeg-core/src/brief-validation.ts`) — not just cross-checked in prose.
- **Items name concrete observables, not properties.** "The audit works" is not a test plan item. "Sign in → upload `tests/fixtures/cv-anna.pdf` → audit returns a `MatchReport` with `grade` in `A|B|C|D` and `signals.length > 0`" is.
- **`[agent]` items must be scriptable from the dispatched-agent surface** — they need no human auth, no Principal-stored BYOK keys, no human eyes on a render. If an item needs any of those, it is `[principal]`. Mis-tagging an `[agent]` item that actually requires auth is the failure mode the Verification phase exists to remove (`roles/developer.md` § Verification); the Brief Author owns the tagging.
- **The Principal cannot tick `[agent]` boxes and the agent cannot tick `[principal]` boxes.** This asymmetry is the whole shape of the gate (mirror of D-048's chat-vs-terminal token capture). A brief that pretends one actor can satisfy the other's half is malformed.
- **If there is no principal-runnable surface, omit the `[principal]` item entirely — never write a placeholder like `**[principal]** None`.** An untickable placeholder box blocks the merge gate forever; Brief Validation mechanically rejects it (`checkPrincipalPlaceholder`, `packages/aeg-core/src/brief-validation.ts`).

#### Where the Test Plan lives in the brief

A discrete top-level section between §8 (Verification before claiming done) and §10 (Stop conditions). It does **not** belong inside §6's numbered tasks (that's the build plan, not the verification plan) or inside §8 (that's the static gates, not the runtime ones). Keeping it discrete is what lets Verification find it without parsing prose.

#### Why it is its own gate, not just part of §8

Across the `aeg-ui-v1` iteration, four features merged CI-green and were broken at runtime — missing DB migration, missing env var, missing IdentityProvider, an unexecuted polymorphic-input test plan. The structural cause: §8's static gates ran (and passed), and the test plan in the brief was *read* by the code-reviewer but never *executed* against the booted app. A separate, named, mandatory Test Plan section + the Verification phase that consumes it is what closes the gap. (See D-049.)

### 10. Stop conditions

Explicit list that causes STOP-and-report rather than improvising: pre-flight failures (incl. worktree couldn't be created); a technical dependency from Section 3 not actually present; a dispatch gate not satisfied (a `depends-on` PR not merged, or a `conflicts-with` sibling's PR open); the executor's own dig contradicts the inherited Planner's rationale (boundary moved / sizing broke — escalate `severity:strategy`); the task's stop-and-escalate condition from the Planner's rationale is hit; **a brief instruction turns out to contradict another** (e.g. "delete a shared symbol" vs. "don't touch an out-of-surface importer of it") — do the safe half (keep the symbol), flag the contradiction in the PR body, and let the Brief Author/Principal resolve it; design gap discovered; test fails after multiple attempts; about to touch files outside the Section 4 surface; any destructive action not explicitly authorized.

The §10 stop conditions are **load-bearing** — they are the genuine escalations, and the standing autonomy clause (§11) explicitly does **not** suppress them. An agent that halts here is doing the right thing; an agent that halts for a low-value clarifying question it could resolve itself is not (that is what the autonomy clause removes).

### 11. Constraints

What the executor must NOT do: off-limits branches/paths (the out-of-surface set from Section 4); explicitly deferred features (do not add); the planner's **traps to avoid** turned into explicit "do NOT do X; do Y instead"; forbidden patterns (skipping verification hooks, an unapproved datastore, auto-remove); and — always — **never write status anywhere** (status is derived from the forge) and **never add execution metadata to the iteration file**.

#### Standing autonomy clause (mandatory — every brief carries it, verbatim)

Every brief's Constraints section includes this clause, word for word:

> **Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not covered by a Section 10 stop condition, choose the most reasonable option consistent with this brief, record the choice in the PR body, and continue. Halt only for the explicit Section 10 stop conditions — and when you halt, record the blocker in the PR body or an Issue comment rather than waiting interactively for input.

This clause is what makes a dispatched agent run to completion unattended instead of pausing for input it can resolve itself. It removes the *low-value* check-ins; it does **not** suppress the §10 stop conditions, which remain the genuine escalations (a contradicted boundary, an under-specified format, a hit stop-and-escalate trap) and must still halt the agent. The line it draws: resolve-and-record for everything inside the brief's discretion; halt-and-record for the §10 conditions; never pause interactively for a question the brief already answers or the Developer is empowered to decide.

**Permission-prompt friction is a tool-layer concern, not a brief concern.** "Do you want to run this command / make this edit?" prompts come from the coding-agent's permission system, not from the brief — handle them there (e.g. your coding-agent's permission settings). The brief governs *what* to build and *when* to halt; the tool governs *whether each action needs approval*. Don't try to solve permission friction in the brief.

### 12. Deliverable

What the executor opens/commits/creates at the end:
- PR title (exact format)
- **The brief pasted into the PR body** — plus the `Tier:` declaration (`Tier: 0|1|3`) and the `Closes #N` reference to the task's Issue (so the merge auto-closes it). The `Ticket:`/`Project:` lines (if present) ride into the PR body too.
- **The reference copy is wrapped in a collapsed `<details>` block — standing convention (task 30, #393; first hand-applied on PR #392).** The PR body's *report half* (start from `aeg-root/templates/pr-report-template.md`) carries the real gate-read fields in their anchored homes; the brief rides below it inside `<details><summary>…</summary>…</details>`, collapsed by default, so the brief's own `Tier:` / Test Plan / `Closes` text can never be mistaken — visually or mechanically — for the PR's real fields. A `<details>` block hides nothing from the raw body, so provenance/archival tooling that greps the full PR body still finds the complete brief text.
- Files modified (`git diff main --stat`)
- PR description sections required
- What to report back and in what format

**Pre-PR gate (inherited by every brief):** The Deliverable section must instruct the executor to run `bun packages/aeg-core/bin/verify-docs.ts --pr` locally with `PR_BODY` set to the intended PR body before opening — and fix any failure. Never dispatch a brief that would produce a red verify-docs build on open.

**The PR is not "done" when opened — it is done when it has passed review AND verification.** After the PR opens (`process.md`): **Phase 10 — Review:** code-reviewer pass (independent, fresh context, `roles/reviewer.md`) → security pass (`roles/security.md`, runs the config-security scan if agent/MCP config changed) → Principal code review → Brief Author spec review. **Phase 11 — Verification (`roles/developer.md` § Verification):** the brief's §9 Test Plan is executed — the Developer-agent runs every `[agent]` item and posts the actual output as evidence; the Principal ticks every `[principal]` box in a real browser. **Phase 12 — Merge:** the Principal merges once both halves are ticked. The brief ends by telling the Developer to open the PR and stop — the review passes and the Verification phase are separate invocations; the Developer addresses REQUEST CHANGES / FAIL findings and re-runs `[agent]` items in follow-up commits on the same branch.

---

## Agent/model selection (with reasoning — the `For:` + `Reason:` lines are mandatory)

The brief MUST declare which agent/model runs the task **and why**. The planner already suggested an **agent-class** (high/mid/fast) in the rationale, as part of sizing; you **confirm the final pick** at dispatch, against current reality (the actual models available, the task's true difficulty now). This is the contract's "Suggested agent-class → `For:`/`Reason:`" mapping.

- Inherit the planner's class; only deviate with a stated reason.
- The `Reason:` line is not optional and not "because it's good" — it names *why this capability level fits this task* (e.g. "high — multi-file refactor crossing the engine boundary with three structured-output unknowns"; "mid — reuse of an existing component plus registry wiring, no architecture").
- The pick is the Brief Author's; the class was the Planner's. Class at plan time, pick at brief time.

| Situation | Model choice |
|-----------|-------------|
| Architecture judgment, multi-file coordination, debugging complex failures | a high-capability model |
| Clear spec, 1-2 files, mechanical implementation | a mid / fast model |
| Doc writing, markdown, specs | a mid-capability model |
| Cross-cutting review (reads many files, judges correctness) | a high-capability model |
| Code review / security review pass | judgment over speed — a high/mid model |

When an automation layer dispatches, it passes the model through; the brief can override per its own mechanism if needed. *(In this repo the model tiers are Opus / Sonnet / Haiku — substitute your provider's equivalents.)*

---

## Optional metadata fields (the reference fields)

These two qualify a task and ride into the PR body. Both are reference-only — never read as instruction.

```
**Project:** [project(s) this task touches — e.g. "vada" or "engine, herald"]
```
Multi-valued. Resolves against `.vinaya/projects.md`. **Required in a multi-project repo; omitted entirely in a single-project repo** (no registry → one project → no field). Routes the Developer to the right specs and the Archivist to the right per-project state; a value that doesn't resolve to a registry row makes the brief malformed (refuse, don't guess). It must match the Planner's `Project(s)` for the task, including every shared-package consumer in the blast radius — see `roles/planner.md` and the planner-brief contract.

```
**Ticket:** [external ticket link(s) — e.g. "SAT-412 — https://…"]
```
N↔M, reference-only provenance (the company's ticket system, e.g. Jira/Linear). No agent reads it, needs access to it, or is blocked by it; it is never a substitute for brief context. Omit if there's no ticket system.

---

## Model integration (the per-brief governance fields)

Every brief includes the following metadata. These fields gate dispatch and ratification.

**Tier self-check (mandatory — run this before declaring Tier, never before):**
Look at the surface map. Then:
- Code only, no spec files, no decision log → **Tier 0** (unless it introduces a meaningful new capability)
- Code + at least one spec file updated → **Tier 1**
- Code + decision log entry → **Tier 3**
- If Tier 0: C3 and C4 do not apply. No doc file needed. No `Conforms-to` needed.

Write the Tier **last**, after the surface map is fully defined. Never declare Tier before the surface map is complete.

### Required

```
**Tier:** [0 | 1 | 3]
```

- **Tier 0** — trivial. Checklist: typecheck, lint, tests, PR description.
- **Tier 1** — implementation. Checklist: Tier 0 + specs updated + `verify-docs` passes.
- **Tier 3** — project/roadmap change. Checklist: Tier 1 + decision log entry + state docs updated + lock entry if applicable. **C4 compliance (verify-docs gate):** the PR must carry either (a) a `decisions.md` or per-project `*-decisions.md` change in the diff, or (b) a `Conforms-to: D-###` field in the PR body for work that implements an existing decision without introducing a new one. A Tier 3 brief with neither is malformed — do not dispatch it.

When in doubt, assign Tier 3. verify-docs defaults to Tier 3 when the PR body has no `Tier:` field, so always declare it explicitly. The `Tier:` in the PR body is the **binding source of truth**; the `tier:*` label on the Issue is its synced projection (`state-machine.md` §14 — field wins on conflict).

```
**Conforms-to:** [D-### — the existing decision this work implements]
```

Required on every Tier 3 brief **unless** a decision log file (`decisions.md` or `*-decisions.md`) is in the §4 surface map (in which case the new D-### entry is the decision anchor and this field is omitted). For conforming work — implementing an established pattern without introducing a new architectural choice — state the D-### of the governing decision here. The `verify-docs` C4 gate reads this field from the PR body; a Tier 3 PR with no decision log change and no `Conforms-to:` field fails the gate. (See §7 doc-update list for the full Tier 3 decision-anchor rule.)

### Optional

```
**principal_delegate:** [scope of any authority delegated to the Developer]
```
Present only when the Principal explicitly delegates a decision. Without it, contested choices escalate via the escalation mechanism. Scope must be specific: "Developer may choose the output format," not "Developer may decide architecture." (The standing autonomy clause in §11 already empowers the Developer to resolve in-brief ambiguity without asking; `principal_delegate` is for a *named, specific* decision the Principal hands over beyond that.)

```
**spike:** true
```
Exploratory briefs only. Reduces to typecheck + lint + a decision log entry capturing what was tried and learned. Spike code does not merge.

### Type 1/2 declaration

If the brief executes a Type 1 (irreversible) decision:

```
**Executes Type 1 decision:** D-### — [one-line description]
**Ratified:** [date, or "PENDING — do not dispatch until ratified"]
```

A brief executing a PENDING Type 1 decision is not dispatchable.

### Briefs are frozen after dispatch

Once dispatched, a brief is frozen. The Developer executes what was dispatched — no mid-task amendments. If scope must change after dispatch: stop the task (via the escalation mechanism with stop instructions), author a new brief with the revised scope, dispatch the new brief. The original brief is preserved as the audit record.

---

## Handling ambiguity in briefs

Use **`[NEEDS CLARIFICATION]`** inline markers to surface gaps rather than guessing:

```
[NEEDS CLARIFICATION: Which DB table owns this? users or sessions?]
[NEEDS CLARIFICATION: Should this endpoint require auth? Not stated.]
```

**Use it when:** two reasonable interpretations exist and the wrong one means a re-do; the brief references a decision not yet logged; a constraint (auth, timeout, error behavior) is implied but unstated; you're unsure an existing pattern applies. **Do not use it for:** stylistic preferences (pick one, note it); things resolvable by reading the codebase (read first); pure implementation details (the Developer decides).

**Resolution protocol:** before dispatching, collect all markers, present them to the Principal as a numbered list, wait for resolution on each (don't dispatch with unresolved markers), replace each with the answer inline. If the Principal defers one, replace with `[DEVELOPER DECIDES: ...]` so the executor knows it's intentional. (This is conversational-protocol stage 5 — surfaced, numbered, waited on.)

These markers are resolved **before dispatch**, by the Principal — they are the Brief Author's pre-flight ambiguity check, not a license for the agent to stop mid-run. They are distinct from the standing autonomy clause (§11), which governs ambiguity the agent meets *during* execution: a dispatched brief has **no** open `[NEEDS CLARIFICATION]` markers (they were all resolved or turned into `[DEVELOPER DECIDES: …]`), so at run time the agent resolves-and-records rather than pausing. A pre-flight `[NEEDS CLARIFICATION]` should be resolved in the brief; if an ambiguity surfaces mid-execution instead, the Developer follows the autonomy clause (resolve, record, continue) unless it rises to a §10 stop condition — but a well-authored brief anticipates most of these.

Source: GitHub Spec Kit evaluation, May 12, 2026. Adopted as inline convention only — Spec Kit CLI not adopted.

---

## Anti-patterns

- ❌ **Skipping the read-obligation Dig step (D-058)** — authoring a brief without identifying and reading the relevant specs/skills/docs means §2 carries stale or absent doc-knowledge, and §7 is populated from memory rather than reading; both lead to a Developer who either over-updates or under-updates docs, defeating the DoD gate
- ❌ Running the whole briefing silently and dumping the brief at the end — violating the conversational protocol; the Principal couldn't see the rationale-inherit, the dig, or the contract checklist, so couldn't govern them
- ❌ Starting from a blank page instead of the Planner's rationale — re-deriving (often differently) what the planner already concluded, and losing the traps the planner flagged
- ❌ Dropping any field of the planner-brief contract — every rationale field has a named home in the brief; a dropped field is a lost conclusion (run the contract-conformance checklist)
- ❌ Skipping the contract-conformance checklist before dispatch — the gate that proves no field was dropped
- ❌ **Telling the executor to delete or rename a shared symbol without first finding every importer** — if an importer is out-of-surface, "delete X" and "don't touch that file" contradict, and the executor is forced to break code or disobey. Run the §4 shared-symbol importer check; defer the deletion to the task that owns the out-of-surface importer.
- ❌ Omitting the Technical Dependencies section — the executor discovers mid-task that something it needs doesn't exist yet
- ❌ Omitting the Technical Surface Map — "only expected files changed" becomes uncheckable and scope creeps
- ❌ A `For:`/`Reason:` line with no real reasoning ("Sonnet because it's good") — the capability choice must be justified against the task
- ❌ Dropping a blast-radius consumer from verification — a shared-package change ships a regression in a consumer nobody re-checked
- ❌ Omitting the worktree-first Step 0 — the executor starts on the wrong branch or a dirty main checkout
- ❌ Telling the executor to "create a branch" without first creating a worktree
- ❌ Putting the brief in the Issue instead of handing it over to land in the PR body
- ❌ "Implement X as you see fit" — the executor has no taste, only instructions
- ❌ Omitting pre-flight checks (incl. the forge dispatch gates + technical-dependency presence) — the executor starts on a dirty tree or against an unmet dependency
- ❌ An empty documentation-update list on a Tier 1+ brief
- ❌ Listing `roadmap.md` in a doc-update list — it's retired
- ❌ Instructing the executor to write status anywhere — status is derived from the forge
- ❌ Omitting the standing autonomy clause (§11) — the agent pauses for input it could resolve itself, defeating unattended dispatch; or, the inverse, writing a clause so broad it tells the agent to push past the §10 stop conditions (those must still halt it)
- ❌ **Omitting the Test Plan (§9)** — Verification has nothing to run; runtime verification falls through the gap between agent and Principal exactly the way it did across `aeg-ui-v1` (the regression D-049 was created to remove)
- ❌ **Test Plan items with no tag** — `[agent]` vs `[principal]` is the whole shape of the gate; an untagged item cannot be routed to the actor who can run it
- ❌ **`Test Plan: unit-tests-only` on a brief whose §4 surface includes a runtime path** — the two fields are coupled; declaring `unit-tests-only` while listing API routes or pages in §4 is malformed (Brief Validation rejects it)
- ❌ **Mis-tagging a `[principal]` item as `[agent]` to make the agent half complete** — the asymmetry is structural (auth, BYOK keys, eyes-on-a-render); reclassifying loses the gate's whole point
- ❌ **A Test Plan item phrased as a property rather than an observation** — "the audit works" is not a test plan item; the named command + the named observable is
- ❌ Not specifying stop conditions — the executor improvises when it should ask
- ❌ Conflating what with how — specify BOTH
- ❌ Leaving scope boundaries implicit — the executor will touch adjacent files
- ❌ Skipping the deliverable section
- ❌ Treating "PR opened" as "done" — done is "passed code-review + security review"
- ❌ Assuming the executor has read prior session context — it hasn't
- ❌ A `Project:` value that doesn't resolve against the registry, or that omits a blast-radius consumer the Planner listed — malformed; fix or `aeg add-project` first
- ❌ Closing out without signaling completion + whose move is next — the Principal is left unsure whether the brief is dispatchable
- ❌ **Authoring a brief for a task whose Issue column is `#TBD` or blank** — the task is backlog, not dispatchable; there is no `#N` for `Closes #N`; the Developer's D-054 gate (entry gate item 3) will refuse it at execution. Catch it during Dig and surface the owed Planner action (cut the Issue) rather than handing the Principal a brief the Developer will immediately refuse.
- ~~❌ **Authoring a brief for a task whose prior task doesn't pass the coherence gate**~~ — **SUPERSEDED by D-120 (2026-07-13).** This is no longer an anti-pattern; a prior task's archival state (Issue/PR/provenance) no longer blocks authoring or dispatching a brief. Preserved as historical record only.
- ❌ **A brief with a real §4 code surface and no `Premise:` block, or a `Premise:` block whose assertions all pin unrelated paths** — `checkPremiseCoverage` rejects it; the whole point of the pin is that it covers the surface the brief's reasoning depends on (D-081)
- ❌ **Instructing the executor (or a §7 doc-update list) to commit a new file for a one-off report, audit finding, coverage summary, or working brief** — that content's permanent home is the PR body or an Issue/PR comment, never a new repo file (D-074, `iterations/README.md` §9 rule 4). A brief that tells the Developer "write your findings to `aeg-root/iterations/<name>-audit.md`" is malformed in exactly the way a brief that puts itself in the Issue instead of the PR body is malformed — it invents an unsanctioned new home for content the model already gave a home to (PR body, or an Issue/PR comment).

---

## Canonical example

A well-formed prior build brief (all sections, explicit pre-flight with pass/fail conditions, numbered parts with function signatures, explicit stop conditions, a precise deliverable format) is the reference shape. *(In this repo, the Cetana V0 build brief is the worked example.)*
