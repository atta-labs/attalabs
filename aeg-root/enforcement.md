---
sidebar_title: Enforcement Map
---
# Enforcement Map — how the forge stays valid

This is the single place that answers two questions: **what prevents an invalid artifact from ever being created**, and **what detects one if it slips through anyway**. Every mechanism below is real and installed — nothing aspirational is listed.

**How to read this page (notation used across AEG):**
- **`D-###`** — an entry in the append-only architectural decision log (`aeg-project/decisions.md`). Each records one decision: its context, alternatives rejected, and whether it is locked against silent change. When this page cites `D-078`, that entry is where the full reasoning lives.
- **`§N`** — a numbered section of `state-machine.md`, AEG's normative model document. `§12` is its registry of which rules are mechanically enforced vs. trusted.
- **Check IDs** — deterministic checks are named by family: `C0–C5` (documentation coverage, in `verify-docs`), `A*` (archival), `T*` (topology), `D*` (dispatch), `N*` (numbering), `M*` (manifest), `L*` (lifecycle) — the last six all live in the coherence oracle (`verify-coherence`). The ID is stable so a failure message, this page, and the code always mean the same thing.

**The founding observation (D-078):** agents obey checkers, not documents. A rule that exists only as prose will eventually be violated by an honest agent under context pressure — proven live when a PR satisfied exactly the sections the gate checked and dropped the two it didn't. So every contract rule must be a deterministic check, and every check must sit at the earliest chokepoint that can host it.

---

## The model: three rings, by where a violation dies

| Ring | Where | What happens on violation | Who pays |
|---|---|---|---|
| **0 — Prevention** | The agent's own machine (tool call, commit, push) | The action itself is **refused** — the invalid artifact never exists outside the agent's session. The exact errors feed back; the agent fixes and retries, in-session. | Nobody. Self-correcting. |
| **1 — Detection** | The forge (CI on every PR) | The identical checks re-run; CI goes **red**; the merge gate makes red unmergeable by agents. Covers writers the hooks can't reach (GitHub UI, humans, other tools). | Visible red — a human may look. Post-D-078, red on a gated rule means a *hook bug*, not an agent failure. |
| **2 — Audit** | Post-merge and continuous, across the whole forge | Drift is surfaced as findings (coherence oracle fail-classes, provenance DANGLING markers) regardless of who or what wrote it, including history that predates the gates. | Scheduled clean-up, never a surprise mid-dispatch. |

The same `@atta/aeg-core` functions run at ring 0 and ring 1 — one implementation, two enforcement points, drift between them structurally impossible.

---

## Ring 0 — Prevention (nothing invalid leaves the machine)

| Action | Gate | What is enforced |
|---|---|---|
| Editing a governed file | **Edit gate** (agent harness) | The owning skill/architecture doc must have been loaded this session |
| `git commit` | **Git pre-commit hooks** (husky + commitlint) | Typecheck (all packages+apps), lint, format, cms+aeg-core tests, forbidden UI colors; commit-message grammar |
| `git push` | **Git pre-push hook** (husky) | No direct push to `main`; a `task/<iter>/<id>` branch must literal-match a topology row (`#` column) in a real iteration file (D-073); **doc-owners coverage (C5) on the branch's cumulative diff** — bound code cannot be published without its bound doc (`verify-docs --push`; an open PR's body supplies Doc-waiver lines) |
| PR create / PR body edit | **Forge command gate** — the raw command is denied; the validated `open-pr` wrapper is the only path | Title grammar (`checkForgeTitle`); decision-number freshness (no `## D-NNN` ≤ origin/main's max); full brief contract via `checkBriefSections` — Tier, For, Project, tagged Test Plan, §4 surface map, §7 doc-update list, worktree Step 0, §10 stop conditions, §11 autonomy clause, `Closes #N`, lock-ack (task branches); plan-PR no-`Closes` guard (D-077); **Tier-appropriate docs via `verify-docs --pr` C0–C5 (all branches)**; branch↔topology↔Issue triple via `checkClosesN` (task branches) |
| Issue create / Issue body edit | **Forge command gate** → validated `open-issue` wrapper | Title grammar; the full **eight-field Planner's rationale** (`checkIssueRationale`) on any `iteration:*`-labeled Issue (planner-brief contract, D-055). Non-task Issues pass through. |
| Raw API writes to PRs/Issues (`gh api`, curl, wget) | **Forge command gate** | Denied outright — no unvalidated path to PR/Issue creation or body edits |
| Merge (any tool) | **Merge gate** | CI must be all-green — red or pending is unmergeable |

**Docs coverage, specifically** (another historical pain point): C5 is enforced at *two* ring-0 chokepoints — at every `git push` on the branch's cumulative diff (`verify-docs --push`), and at PR create/edit inside `open-pr.ts` (`verify-docs --pr`, which adds the C0–C4 PR-body contracts). A change to bound code cannot be published, let alone PR'd, without its bound doc.

**The Tier check, specifically** (a historical pain point): enforced twice at ring 0 — `checkTierField` requires the field's presence on task-branch bodies, and `verify-docs --pr`'s C0 requires an explicit `Tier: 3` whenever the diff touches a decision log, for **every** branch type. Both run inside `open-pr.ts` before `gh` executes.

---

## Ring 1 — Detection (what turns GitHub red)

Every PR, on open and every push:

| CI check | Job | Re-runs which ring-0 code |
|---|---|---|
| Brief Validation | `archivist.yml::brief-validation` | `verify-brief.ts` → title grammar (`checkForgeTitle`, all branches), `checkBriefSections`, `checkPlanPrNoCloses` (non-task branches bypass the section checks) |
| Closes #N | `forge-lifecycle.yml::closes-n-gate` | `verify-coherence.ts --closes-n` |
| Coherence oracle (blocking) | `forge-lifecycle.yml::coherence-gate` | A1/A2/A3, T1/T2/T3, D1, N1, M1, M3 fail classes (L1/L2/N2/M2 advisory) |
| Tier-appropriate documentation | `verify-docs.yml` | `verify-docs.ts --pr` C0–C5 |
| Runtime Test Plan checkbox state | `verify-test-plan.yml` | Unticked Test Plan boxes gate merge readiness (D-049) |
| Typecheck (shared packages) + unit tests (all suites; cetana-cli excluded — pre-existing failure, tracked) | `ci.yml` | Same toolchain as pre-commit; apps' typecheck is covered by Vercel builds |
| Biome, commit-message format, forbidden colors | `conventions.yml` | Same toolchain as pre-commit |
| claude-review | `claude-code-review.yml` | **Advisory** — posts a judgment review; its verdict does not yet gate (see Residuals) |

Red CI + the merge gate = no agent can merge it. The Principal can always override — that is a feature, not a hole.

---

## Ring 2 — Audit (drift from any writer, any era)

| Mechanism | Runs | Catches |
|---|---|---|
| **Post-Merge Archivist** (D-078 task 5d) | Automatically on every merge to `main` | Task PRs get their provenance block + explicit Issue close (D-056) with `DANGLING` markers for any absent fact — the audit trail writes itself; missing review passes are flagged, not hidden |
| **Coherence oracle, full-forge** | Every PR + on demand (`verify-coherence.ts`) | Plan↔forge drift regardless of author: closed-without-merge, archived-without-provenance, auto-close misfires, orphan Issues, phantom refs, `#TBD` in active iterations, decision-number duplicates, manifest breakage |
| **Staleness audits** (#218 pattern) | Dispatched | Doc claims contradicting the decision log; emits the fix punch-list as Issues |
| Daily drift check | Scheduled (stub today) | Spec↔code drift (V1) |

---

## Known residuals (accepted, documented in D-078)

1. **File-indirection / exotic clients** — a script wrapping a raw `gh` call, or a non-`gh`/`curl` API client, escapes command-string matching. Ring 1 catches the result. Future hardening if ever needed: a PATH-level `gh` shim.
2. **Session-start window** — harness gates load at session start. **Operational rule: restart running agent sessions after merging any change to the gate glue or its wiring.**
3. **The judgment layer** — every gate here is presence/shape-deterministic. Whether content is *true* (a surface map that matches reality, a Test Plan that tests the right thing) is irreducibly review work — Phase 10, not yet mechanically wired (claude-review runs but does not gate). This is the known next hardening frontier.

---

## Portability: what you get on ANY coding agent (or none)

Every check in this map is a plain CLI binary in `@atta/aeg-core` (`verify-brief`, `verify-docs`, `verify-coherence`, `open-pr`, `open-issue`, `archive-task`) — runnable by any human, any agent, any CI, with zero dependency on a specific vendor. The *triggers* differ by environment. Honest compatibility matrix:

| Enforcement | Any team, any agent, today | Requires |
|---|---|---|
| Commit gates (typecheck, lint, tests, message grammar) | ✅ Full | git + husky — vendor-neutral |
| Push gates (no-direct-main, branch↔topology, docs coverage) | ✅ Full | git + husky — vendor-neutral |
| CI detection (every check, red = unmergeable-by-agents) | ✅ Full | GitHub Actions — vendor-neutral |
| Post-merge audit (provenance, coherence oracle) | ✅ Full | GitHub Actions — vendor-neutral |
| **Forge command gate** (PR/Issue creation refused before it executes) | ⚠️ **Not yet vendor-neutral** | Today: a coding-agent harness that exposes a pre-command hook (~40 lines of deny-and-redirect glue — this repo ships it for its own harness; any harness with an equivalent hook point can host the same glue). The **vendor-neutral form is a PATH-level `gh` shim** — a wrapper binary that intercepts the CLI itself, working identically for every agent and for humans. Planned as the canonical mechanism; until it ships, teams without an interceptable harness run prevention at commit/push and detection at CI. |
| Edit gate (governed files require their architecture doc loaded) | ⚠️ Harness feature | Only meaningful on harnesses with a pre-edit hook; others rely on review + CI. |

The design intent, stated plainly: **nothing in AEG's contracts assumes any particular coding agent.** Where this repo's concrete wiring uses its own harness's hook system, that is an implementation convenience of this repo — not a requirement of the model — and the matrix above is the honest statement of what a team on any other agent gets today.

## Installation appendix (this repo's concrete wiring)

Git hooks: `.husky/pre-commit`, `.husky/pre-push`, commitlint. Forge command gate + edit gate + merge gate: the agent harness's pre-tool hooks under `.claude/hooks/` (`check-forge-gates.sh`, `check-skill.sh`, `check-pr-green.sh`), wired in `.claude/settings.json`. Wrappers and check binaries: `packages/aeg-core/bin/`. CI: `.github/workflows/` (`ci.yml`, `conventions.yml`, `verify-docs.yml`, `verify-test-plan.yml`, `forge-lifecycle.yml`, `archivist.yml`).

---

*Change discipline: this map describes installed mechanisms only. A PR that adds, removes, or weakens a gate updates this file in the same diff (its code surfaces are bound here via `doc-owners`), and weakening any D-078 gate requires `Challenges lock: D-078`.*
