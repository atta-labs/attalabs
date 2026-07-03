---
sidebar_title: Enforcement Map
---
# Enforcement Map — how the forge stays valid

This page answers two questions: **what prevents an invalid artifact from ever being created**, and **what detects one if it slips through anyway**. Every mechanism listed is real and installed — nothing aspirational. The full architectural reasoning behind each gate lives in the decision log (`aeg-project/decisions.md`); the normative registry of every gate lives in `state-machine.md`.

**The founding observation:** agents obey checkers, not documents. A rule that exists only as prose will eventually be violated by an honest agent under context pressure — proven live when a pull request satisfied exactly the sections the checker verified and dropped the two it didn't. So every contract rule must be a deterministic check, and every check must sit at the earliest chokepoint that can host it.

---

## The model: three rings, by where a violation dies

| Ring | Where | What happens on violation | Who pays |
|---|---|---|---|
| **0 — Prevention** | The agent's own machine (command, commit, push) | The action itself is **refused** — the invalid artifact never exists outside the agent's session. The exact errors feed back; the agent fixes and retries, in-session. | Nobody. Self-correcting. |
| **1 — Detection** | The forge (CI on every pull request) | The identical checks re-run; CI goes **red**; the merge gate makes red unmergeable by agents. Covers writers the local gates can't reach (web UI, humans, other tools). | Visible red — a human may look. Red on a gated rule now means a *gate bug*, not an agent failure. |
| **2 — Audit** | After merge, continuously, across the whole forge | Drift is surfaced as findings, regardless of who or what wrote it — including history that predates the gates. | Scheduled clean-up, never a surprise mid-dispatch. |

The same check implementations run at ring 0 and ring 1 — one codebase, two enforcement points, so the local gates and CI can never disagree.

---

## Ring 0 — Prevention (nothing invalid leaves the machine)

| Action | Gate | What must be true before the action is allowed |
|---|---|---|
| Editing a governed file | **Edit gate** | The architecture document that owns the file has been loaded in this session — no editing governed code from pattern-matching alone |
| `git commit` | **Git pre-commit hooks** | The code compiles, passes lint and formatting, the unit tests pass, and the commit message follows the repo's message convention |
| `git push` | **Git pre-push hook** | No pushing straight to `main`. A task branch's name must exactly match its planned task row in the iteration plan. Any changed code that has a designated owning document must have that document updated in the same branch (a waiver, with a stated reason, can be declared on the open pull request — or, before a pull request exists, as a `Doc-waiver:`/`Doc-ack:` trailer in the branch's own last commit message; D-080). |
| Creating a pull request, or editing its title/description | **Forge command gate** — the raw command is refused; the validated wrapper is the only path | The title follows the naming convention. The description carries every required section of the task brief: the impact tier, the executing model, the project(s) touched, a tagged test plan, the file surface the task may touch, the documentation it must update, the isolated-worktree setup step, the stop conditions, the standing autonomy clause, the Issue this work closes, and an explicit acknowledgment whenever a locked decision is touched. A *plan* pull request must never close a task Issue. Any newly added decision-log entry must use the next free number (no collisions with what is already merged). The documentation required by the change's impact tier is present. The branch, its planned task row, and the Issue it closes all agree with each other. |
| Creating a task Issue, or editing its title/description | **Forge command gate** → validated wrapper | The title follows the naming convention, and the Issue carries the complete planning rationale — what the task is and is not, its sizing, the projects and blast radius it touches, why its dependency edges exist, the known traps, the suggested agent class, the stop-and-escalate conditions, and the documents it must keep coherent. Issues outside the task system pass through untouched. |
| Writing to pull requests or Issues through the raw API | **Forge command gate** | Refused outright — there is no unvalidated path |
| Merging | **Merge gate** | Every CI check is green — red or pending cannot be merged by an agent |

**Documentation coverage, specifically** (a historical pain point): the code→document ownership rule is enforced at *two* prevention chokepoints — at every push (over the branch's cumulative change set) and again at pull-request creation and editing. A change to owned code cannot be published, let alone turned into a pull request, without its owning document.

**The impact-tier rule, specifically** (another historical pain point): a change that touches the decision log must explicitly declare its impact tier, and the documentation that tier demands must be present — checked before the pull request can exist, for every branch type.

---

## Ring 1 — Detection (what turns the forge red)

Every pull request, on open and on every push, re-runs the same checks in CI:

| CI check | Re-verifies |
|---|---|
| Brief validation | Title convention (all branches) and every required brief section (task branches) |
| Closes linkage | A task pull request names, and will close, exactly its planned Issue |
| Coherence oracle | Plan↔forge consistency across the whole repository: tasks closed without a merge, archived without their audit record, orphaned Issues, phantom references, unplanned placeholders in active iterations, duplicate decision numbers, broken document manifests, open task Issues missing a planner-rationale field (R1, D-078 — the same grammar the ring-0 Issue gate above enforces at creation) |
| Documentation gate | Tier declaration and tier-appropriate documentation, including code→document ownership |
| Test-plan state | Unticked test-plan boxes block merge readiness |
| Typecheck + unit tests | The full shared-package toolchain (application builds are verified by the deployment pipeline) |
| Conventions | Lint/format, commit-message grammar, no hardcoded UI colors |
| AI review | **Advisory** — posts a judgment review of the change; its verdict does not yet block anything |

Red CI plus the merge gate means no agent can merge the change. The Principal can always override — that is a feature, not a hole.

---

## Ring 2 — Audit (drift from any writer, any era)

| Mechanism | Runs | Catches |
|---|---|---|
| **Post-merge archivist** | Automatically on every merge to `main` | Every merged task gets its permanent audit record (what shipped, from what intent, checked by whom) and its Issue is closed and verified; any fact that cannot be sourced is flagged as missing, never invented |
| **Coherence oracle, full sweep** | Every pull request, and on demand | The same plan↔forge drift classes as ring 1, but across all history — including violations that predate the gates |
| **Docs coherence gate (C6)** | `verify-docs.ts` full mode, on demand (not yet CI-wired) | Every surfaced doc in the surfaced-doc manifest (`state-machine.md` §15c) is reachable in the doc-nav tree, with no orphans and no dangling cross-references |
| **Staleness audits** | Dispatched periodically | Documentation whose claims contradict recorded decisions; each contradiction becomes a tracked fix Issue |
| Daily drift check | Scheduled (stub today) | Specification↔code drift |

---

## Portability: what you get on ANY coding agent (or none)

Every check on this page is a plain command-line program — runnable by any human, any agent, any CI, with zero dependency on any vendor. The *triggers* differ by environment:

| Enforcement | Any team, any agent, today | Requires |
|---|---|---|
| Commit gates | ✅ Full | git hooks — vendor-neutral |
| Push gates | ✅ Full | git hooks — vendor-neutral |
| CI detection | ✅ Full | The forge's CI — vendor-neutral |
| Post-merge audit | ✅ Full | The forge's CI — vendor-neutral |
| **Forge command gate** | ⚠️ **Not yet vendor-neutral** | Today it needs a coding-agent harness that can intercept commands before they run (~40 lines of refuse-and-redirect glue on any harness that has such a hook point). The **vendor-neutral form is a wrapper binary placed ahead of the real `gh` on the PATH** — it would work identically for every agent and for humans, and is the planned canonical mechanism. Until it ships, teams without an interceptable harness get prevention at commit/push and detection at CI. |
| Edit gate | ⚠️ Harness feature | Only meaningful on harnesses with a pre-edit hook; others rely on review and CI |

The design intent, stated plainly: **nothing in AEG's contracts assumes any particular coding agent.** Where a repository's concrete wiring uses one harness's hook system, that is an implementation convenience of that repository — never a requirement of the model. Concrete wiring locations for this repository are recorded in the decision log entries that installed each gate and in `state-machine.md`'s gate registry.

---

## Known residuals (accepted and recorded in the decision log)

1. **Indirection** — a script file wrapping a raw command, or an exotic API client, escapes command interception. Ring 1 catches the result. The PATH-level wrapper binary above is the hardening if it is ever needed.
2. **Session-start window** — local gates load when an agent session starts. **Operational rule: restart running agent sessions after merging any change to the gates or their wiring.**
3. **The judgment layer** — every gate here is deterministic about presence and shape. Whether content is *true* (a file-surface list that matches reality, a test plan that tests the right thing) is irreducibly review work — not yet mechanically wired (the AI review runs but does not block). This is the known next hardening frontier.

---

*Change discipline: this map describes installed mechanisms only. A change that adds, removes, or weakens a gate must update this page in the same change set (the gate code is bound to this page by the document-ownership rule), and the tool-layer gates are a locked decision — weakening them requires a superseding decision-log entry, never a quiet edit.*
