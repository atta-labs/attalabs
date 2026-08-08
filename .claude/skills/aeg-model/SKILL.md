---
name: aeg-model
description: The AEG governance model — the four truth domains, the three-ring enforcement architecture, tranche lifecycle, and the role/contract seam. Load when working inside aeg-root/** (enforcement.md, state-machine.md, tranche-model.md, roles/*.md, contracts/*.md, templates/*.md, process docs, glossary.md). Do NOT load for the gate implementations themselves (packages/aeg-core, packages/aeg-forge-state) or for how the gates ship as a product (apps/vinaya) — see the aeg-core / aeg-forge-state / vinaya-architecture skills for those.
---

# AEG Model — Governance Doctrine (`aeg-root/`)

## Context

`aeg-root/` is not documentation *about* a system that lives elsewhere — it **is** the system, expressed as prose. Agentic Execution Governance (AEG) is the discipline layer that governs how a human's intent becomes reviewed, merged, coherent code produced by agents; `aeg-root/` is its normative spec. Every hook, every CI check, every CLI in `packages/aeg-core`/`packages/aeg-forge-state` is a *mechanization* of a rule stated here first — never the other way around. Editing a file in this tree is editing the rulebook every agent (including the one editing it) is bound by. Get the model wrong here and every downstream enforcement point silently inherits the mistake — this is the tree `enforcement.md`'s own closing line calls out: *"a change that adds, removes, or weakens a gate must update this page in the same change set."*

The founding observation the whole tree is built from (`enforcement.md`): **agents obey checkers, not documents.** A rule that exists only as prose will eventually be violated by an honest agent under context pressure — proven live when a pull request satisfied exactly the sections a checker verified and dropped the two it didn't. So every contract rule here must resolve to a deterministic check, and every check must sit at the earliest chokepoint that can host it.

## Architecture: the whole model in one pass

### The four truth domains (`tranche-model.md` §1) — this is the whole design

Every fact in AEG lives in exactly **one** place. Nothing is duplicated; no artifact tries to be two things.

| Domain | Holds | Mutable by |
|---|---|---|
| **The forge Issue** | Task identity + metadata (project label, dependency/conflict edges) | Planner, at plan time |
| **The thin tranche file** *(retired — a Milestone + labeled Issues now play this role)* | Planning topology only | Planner, at plan time |
| **The Git forge** (branch/PR/review/merge state) | All live execution *status* — derived, never stored | the act of working |
| **The PR body** | The just-in-time brief — full execution context | Brief Author, once, at dispatch |

The cardinal rule, enforced everywhere below: **the forge holds what is happening; the Issue holds the plan. Never copy "what is happening" into the Issue or a repo file.** This is why there is no status column anywhere — opening a branch/PR *is* the `in-flight`/`in-review` signal, a merge *is* the `merged` signal, and any file that tries to cache that state recreates the racing, drifting status store the model was built specifically to eliminate.

### Three rings, by where a violation dies (`enforcement.md`)

| Ring | Where | What happens on violation |
|---|---|---|
| **Ring 0 — Hooks** | The agent's own machine (edit, commit, push) | The action is **refused** before the invalid artifact ever exists outside the session. Self-correcting, nobody pays. |
| **Ring 1 — Branch Rules** | The forge (CI on every PR) | The identical checks re-run; CI goes red; the merge gate makes red unmergeable — covers writers ring 0 can't reach (web UI, humans, other tools). |
| **Ring 2 — Audits** | After merge, continuously | Drift surfaces as findings regardless of who wrote it, including history that predates the gates. |

The load-bearing property: **the same check implementation runs at ring 0 and ring 1** — one codebase, two enforcement points, so local gates and CI can never disagree. `packages/aeg-core`'s pure evaluators are that shared implementation (see the **aeg-core** skill); `.husky/*` and `.claude/hooks/*.sh` are ring 0's local wiring; `.github/workflows/*.yml` is ring 1's forge wiring; both call the same functions.

### Tranche lifecycle (`tranche-model.md` §11)

`planned → active → complete → archived`. A tranche is `active` the moment one task has an open branch; `complete` only when **every** task's PR is merged (derived, never declared); `archived` when the Archivist moves its file to `aeg-root/tranches/completed/` — never deleted, kept as durable forensic history alongside the Issues' frozen rationale.

### The role / contract seam

Nine roles (`roles/*.md`), each self-locating: Planner, Brief Author, Developer, Reviewer, Security, Archivist, Tranche Archivist, Principal, plus the manual-flow narration. A role validates its **own** preconditions from live forge state before acting and refuses when it isn't its turn — the forge just sends a notification; role self-location is one of the four things AEG adds over raw GitHub (`tranche-model.md` §10). `contracts/*.md` are the typed seams *between* consecutive roles (e.g. `brief-developer.md`, `developer-reviewer.md`) — what one role guarantees to hand the next. A role's frontmatter (`role_id`, `performs`, `refuses_when`) is itself machine-read: `verify-registry.ts`'s G5 check fails CI if a contract cites a `role_id` that isn't defined, or a role's frontmatter is incomplete.

### Where truth lives — the map

| Doc | Owns |
|---|---|
| `enforcement.md` | The ring 0/1/2 registry — every hook, CI check, and audit, with its `implementation` path |
| `state-machine.md` | Derivation rules + label vocabulary (§14), the doc-coverage seam (§15), plan↔forge coherence (§15b), the surfaced-doc manifest (§15c), dispatch readiness (§15d) |
| `tranche-model.md` | The four truth domains, tranche lifecycle, the conflict model (§5), anti-regression rules (§9) |
| `roles/*.md` | Per-role entry gates, refusal conditions, what each role owns/never does |
| `contracts/*.md` | Producer/consumer seam contracts between roles |
| `templates/*.md` | `brief-template.md`, `issue-rationale-template.md`, `pr-report-template.md` — the literal skeletons `roles/developer.md`'s canonical PR body and `roles/planner.md`'s rationale grammar are filled from |
| `process.md` / `coordination.md` / `aeg-manual-flow.md` | The manual (no-dispatch-tool) run mechanics |
| `documentation-coherence.md` | Who reads/writes documentation at each role seam |
| `glossary.md` | Coined-vocabulary definitions — the `reader-resolvable-prose` check (`state-machine.md`-adjacent, ships in `packages/aeg-core`) derives its "is this term defined" list live from this file's own entry headings, never a hard-coded list |

## Anti-regression rules — never violate these while editing here (`tranche-model.md` §9)

1. **No execution metadata in the Issue or a repo file.** Never add `status`, `PR #`, `merged date`, `assignee history` to any doctrine artifact — the forge already holds these; copying them in recreates the racing status store.
2. **No dynamic conflict scanner.** Do not propose a script that diffs in-flight branches to "catch conflicts the Planner missed" — that needs a live task→changed-files map, the exact mutable state the design forbids. When unsure two tasks collide: declare the conflict and serialize.
3. **No planning metadata on Issues.** No priority, estimates, points, roadmap fields — mechanically enforced by `open-issue.ts`'s rationale-grammar gate, not just discipline.
4. **No committed report/scratch files.** A one-off audit finding, coverage report, or working brief goes in a PR body or Issue/PR comment — never a new repo file. This has broken AEG Studio's tranche loader twice already (it globs every `.md` under `aeg-root/tranches/` as a tranche file).

## The change-discipline rule for this tree specifically

`enforcement.md`'s own closing line: a change that adds, removes, or weakens a gate must update that page's registry **in the same change set** — the gate code is bound to the page by the document-ownership rule (`.vinaya/doc-owners`), and the tool-layer gates are a locked decision; weakening one is a reviewed change with its reasoning in the PR, never a quiet edit. `state-machine.md` §15's `.vinaya/doc-owners` seam is itself governed the same way, one layer up — see the **aeg-core** skill for the mechanics of `evaluateC5`.

## Anti-patterns

- ❌ Treating `aeg-root/**` as prose to keep "roughly in sync" — G1–G5 (`verify-registry.ts`) and the coherence oracle read it as **data**: every `implementation` cell must resolve to a real path, every cited `#NNN` must resolve to a real Issue/PR, every role/contract cross-reference must resolve.
- ❌ Citing a bare forge number or a legacy `-vN` tranche slug in reader-facing prose — the `reader-resolvable-prose` check exists to catch exactly this, but know the rule rather than leaning on the checker.
- ❌ Coining a new piece of vocabulary (`tranche`, `brief`, `provenance`, …) without a `glossary.md` entry or an inline definition.
- ❌ Adding a hook or CLI under `.husky/`, `.claude/hooks/`, or `packages/aeg-core/bin/` without a matching row in `enforcement.md`'s ring tables — breaks G1 (implementation-exists) / G2 (no-orphan-hook).
- ❌ Writing a status field, "current spend" total, or any stored aggregate anywhere in this tree — everything here is either a Planner-time plan or a derived-at-read-time view.
- ❌ Editing `state-machine.md`'s label vocabulary or derivation rules by hand instead of in the code they're rendered from — §14 states the vocabulary is **code-owned** (`packages/aeg-forge-state/src/labels.ts`, `packages/aeg-core/src/state-machine-model.ts`); the page is a rendering, not a second source.

## When you need more context

- `enforcement.md` — the ring registry itself, read start to finish before touching any gate's doctrine
- `state-machine.md` — derivation rules, label vocabulary, the four coherence seams (§15–§15d)
- `tranche-model.md` — the four truth domains and the full reasoning behind them
- `roles/*.md`, `contracts/*.md` — per-role and per-seam detail
- **aeg-core** skill — the pure evaluators that mechanize the rules stated here
- **aeg-forge-state** skill — the one sanctioned adapter that reads live forge state
- **vinaya-architecture** skill — how this model ships as the Vinaya product
