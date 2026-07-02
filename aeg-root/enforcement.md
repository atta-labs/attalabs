---
sidebar_title: Enforcement Map
---
# Enforcement Map — how the forge stays valid

This is the single place that answers two questions: **what prevents an invalid artifact from ever being created**, and **what detects one if it slips through anyway**. Every mechanism below is real and installed — nothing aspirational is listed. Normative sources: `state-machine.md` §12 (the gate registry), D-069 (self-enforcement charter), D-073/D-074/D-075/D-077 (individual gates), D-078 (tool-layer prevention).

**The founding observation (D-078):** agents obey checkers, not documents. A rule that exists only as prose will eventually be violated by an honest agent under context pressure — proven live when a PR satisfied exactly the sections the gate checked and dropped the two it didn't. So every contract rule must be a deterministic check, and every check must sit at the earliest chokepoint that can host it.

---

## The model: three rings, by where a violation dies

| Ring | Where | What happens on violation | Who pays |
|---|---|---|---|
| **0 — Prevention** | The agent's own machine (tool call, commit, push) | The action itself is **refused** — the invalid artifact never exists outside the agent's session. The exact errors feed back; the agent fixes and retries, in-session. | Nobody. Self-correcting. |
| **1 — Detection** | The forge (CI on every PR) | The identical checks re-run; CI goes **red**; the T9 merge gate makes red unmergeable by agents. Covers writers the hooks can't reach (GitHub UI, humans, other tools). | Visible red — a human may look. Post-D-078, red on a gated rule means a *hook bug*, not an agent failure. |
| **2 — Audit** | Post-merge and continuous, across the whole forge | Drift is surfaced as findings (coherence oracle fail-classes, provenance DANGLING markers) regardless of who or what wrote it, including history that predates the gates. | Scheduled clean-up, never a surprise mid-dispatch. |

The same `@atta/aeg-core` functions run at ring 0 and ring 1 — one implementation, two enforcement points, drift between them structurally impossible.

---

## Ring 0 — Prevention (nothing invalid leaves the machine)

| Agent action | Gate | What is enforced | Installed at |
|---|---|---|---|
| `Edit`/`Write` on governed paths | Skill-check hook | The owning skill must have been invoked this session | `.claude/hooks/check-skill.sh` |
| `git commit` | pre-commit + commit-msg | Typecheck, lint, format, tests; commit-message grammar | `.husky/pre-commit`, commitlint |
| `git push` | pre-push | No direct push to `main`; a `task/<iter>/<id>` branch must literal-match a topology row (`#` column) in a real iteration file (D-073) | `.husky/pre-push` |
| `gh pr create` / `gh pr edit --body*` | Forge-gate hook **denies** the raw command → forces `open-pr.ts` | Title grammar (`checkForgeTitle`); decision-number freshness (no `## D-NNN` ≤ origin/main's max); full brief contract via `checkBriefSections` — Tier, For, Project, tagged Test Plan, §4 surface map, §7 doc-update list, worktree Step 0, §10 stop conditions, §11 autonomy clause, `Closes #N`, lock-ack (task branches); plan-PR no-`Closes` guard (D-077); **Tier-appropriate docs via `verify-docs --pr` C0–C5 (all branches)**; branch↔topology↔Issue triple via `checkClosesN` (task branches) | `.claude/hooks/check-forge-gates.sh` → `packages/aeg-core/bin/open-pr.ts` |
| `gh issue create` / `gh issue edit --body*` | Same hook → forces `open-issue.ts` | Title grammar; the full **eight-field Planner's rationale** (`checkIssueRationale`) on any `iteration:*`-labeled Issue (planner-brief contract, D-055). Non-task Issues pass through. | `.claude/hooks/check-forge-gates.sh` → `packages/aeg-core/bin/open-issue.ts` |
| `gh api` POST/PATCH to `/pulls`, `/issues`; curl/wget writes to those endpoints | Forge-gate hook | Denied outright — no unvalidated path to PR/Issue creation or body edits | `.claude/hooks/check-forge-gates.sh` |
| Merge (any tool) | T9 merge gate | `gh pr checks` must be all-green — red or pending is unmergeable | `.claude/hooks/check-pr-green.sh` |

**The Tier check, specifically** (a historical pain point): enforced twice at ring 0 — `checkTierField` requires the field's presence on task-branch bodies, and `verify-docs --pr`'s C0 requires an explicit `Tier: 3` whenever the diff touches a decision log, for **every** branch type. Both run inside `open-pr.ts` before `gh` executes.

---

## Ring 1 — Detection (what turns GitHub red)

Every PR, on open and every push:

| CI check | Job | Re-runs which ring-0 code |
|---|---|---|
| Brief Validation | `archivist.yml::brief-validation` | `verify-brief.ts` → `checkBriefSections`, `checkPlanPrNoCloses` (non-task branches bypass) |
| Closes #N | `forge-lifecycle.yml::closes-n-gate` | `verify-coherence.ts --closes-n` |
| Coherence oracle (blocking) | `forge-lifecycle.yml::coherence-gate` | A1/A2/A3, T1/T2/T3, D1, N1, M1, M3 fail classes (L1/L2/N2/M2 advisory) |
| Tier-appropriate documentation | `verify-docs.yml` | `verify-docs.ts --pr` C0–C5 |
| Runtime Test Plan checkbox state | `verify-test-plan.yml` | Unticked Test Plan boxes gate merge readiness (D-049) |
| Typecheck, tests, Biome, commit-message format, forbidden colors | `conventions.yml` + standard CI | Same toolchain as pre-commit |
| claude-review | `claude-code-review.yml` | **Advisory** — posts a judgment review; its verdict does not yet gate (see Residuals) |

Red CI + the T9 hook = no agent can merge it. The Principal can always override — that is a feature, not a hole.

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
2. **Session-start window** — hooks load at session start. **Operational rule: restart running agent sessions after merging any change to `.claude/hooks/` or `.claude/settings.json`.**
3. **The judgment layer** — every gate here is presence/shape-deterministic. Whether content is *true* (a surface map that matches reality, a Test Plan that tests the right thing) is irreducibly review work — Phase 10, not yet mechanically wired (claude-review runs but does not gate). This is the known next hardening frontier.

---

*Change discipline: this map describes installed mechanisms only. A PR that adds, removes, or weakens a gate updates this file in the same diff (its code surfaces are bound here via `doc-owners`), and weakening any D-078 gate requires `Challenges lock: D-078`.*
