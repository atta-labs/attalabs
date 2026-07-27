Closes #395

**For:** Sonnet (coding-agent CLI on a dev machine, dispatched locally, unattended)
**Owner:** Principal
**Project:** aeg, vada, herald, atta, attalabs
**Tier:** 1

## Summary

Three CI-cost/infra fixes as one task (task 31, consolidated per the Planner's record on #395). **(1) Vercel shallow-clone:** Vercel's build container is a depth-10, single-branch clone — `refs/heads/main` doesn't exist on preview deploys, so `turbo-ignore --fallback=main` (task 22) errored "a ref or SHA is invalid" and silently failed open, building everything. All four `vercel.json` `ignoreCommand`s now prepend `(git fetch --deepen=100 origin || true) && (git fetch --depth=100 origin main:main || true)` before `turbo-ignore`. **(2) Permission gap:** `direct-main-push-detection` (`archivist.yml`) was missing `pull-requests: read` for the commits→pulls association API and 403'd on every real `main` push; scope added, and the job now also runs on `workflow_dispatch` for on-demand verification. **(3) 9-job consolidation:** the 9 sub-30s PR-gate jobs across 5 workflow files (each billed a full rounded-up minute per push) now run as 9 sequential steps of one **"AEG gate suite"** job in `forge-lifecycle.yml` — one checkout/setup/install; `verify-docs.yml`, `verify-test-plan.yml`, `conventions.yml` deleted; `brief-validation` removed from `archivist.yml`; `ci.yml` and `claude-code-review.yml` untouched. Same gates, same strictness — packaging only. Closes #395.

**Git-history-depth fix chosen and why (brief §12 requirement):** bounded fetches in the `ignoreCommand` itself, not a Vercel dashboard setting. `--deepen=100` gives the deploy branch history past Vercel's depth-10 default (fork-point reachability for branches with >10 own commits); `--depth=100 origin main:main` materializes `refs/heads/main` — the missing ref that is the actual root cause — with enough history for the merge-base. On production main-deploys the `main:main` fetch refuses (checked-out branch) and falls through via `|| true` — `main` already exists there. In-repo config was chosen over a project-level dashboard setting because it is versioned, auditable in this diff, and needs no out-of-band Principal action; bounded depth over `--unshallow` per the Issue's trap (a fork point >100 commits stale degrades to today's fail-open, never worse). Any fetch failure (including possible missing git credentials in Vercel's ignore-step environment, which cannot be probed locally) also degrades to today's exact fail-open behavior.

**Real-environment proof status (brief §12 requirement):** NOT fully achievable within this branch, stated plainly. The git topology (shallow + single-branch → `main` unresolvable → resolvable after the exact prepended fetches, `turbo-ignore` skips) is reproduced and proven locally (Test plan below). What a local clone cannot prove: whether Vercel's build container permits `git fetch` against origin at ignore-step time. Follow-up observation required: the first docs-only/unaffected-app PR after merge should show Vercel checks skipping instead of building — same post-merge-expectation shape task 22's PR (#375) used.

## Test plan

- [x] **[agent]** Vercel-like shallow clone reproduction — `git clone --depth=10 --single-branch --branch task/aeg-governance-hardening/31` of this repo, then before/after the new `ignoreCommand` fetches:
  ```
  == BEFORE fix: can 'main' resolve? ==
  fatal: Needed a single revision
  exit=128
  == shallow? ==
  true
  $ (git fetch --deepen=100 origin || true) && (git fetch --depth=100 origin main:main || true)
   * [new branch]      main       -> main
  == AFTER fix ==
  f579d84073f7862a8c7b2e1486421a2bf1e8cfa8      (git rev-parse --verify main)
  f579d84073f7862a8c7b2e1486421a2bf1e8cfa8      (git merge-base main HEAD)
  $ npx -y turbo-ignore @atta/vada-ai-web --fallback=main
  ≫   Falling back to ref main
  ≫   This project and its dependencies are not affected
  ⏭ Ignoring the change
  exit=0
  ```
- [x] **[agent]** `jq -e .ignoreCommand` on all four `vercel.json` files — all valid JSON.
- [x] **[agent]** YAML validity + parsed structure of both edited workflows — `bunx js-yaml` parses both; a structural dump of `forge-lifecycle.yml` shows 1 job, union trigger `[opened, synchronize, reopened, edited, labeled, unlabeled]`, permissions `{contents: read, issues: write, pull-requests: write}`, 17 steps with the intended `if:` guard on every gate step (all 9 gates `!cancelled()`-guarded; core-event scope on 7; `edited` reaches only the Test Plan step; `labeled`/`unlabeled` only the docs gate). Caught and fixed one real YAML subtlety in the process: unquoted `name: Closes #N …` parses `#` as a comment (step name silently truncated to "Closes" — a latent quirk inherited from the original job); now quoted.
- [x] **[agent]** Gate scripts run locally exactly as the consolidated steps invoke them, pass AND fail directions:
  ```
  closes-n (BRANCH + PR_BODY with Closes #395):  PASS exit=0
  closes-n (no Closes):                          FAIL exit=1
  verify-test-plan (unticked [agent] box):       FAIL exit=1
  verify-test-plan (pure-logic sentinel form):   PASS exit=0
  commitlint --from origin/main --to HEAD:       "found 0 problems, 0 warnings" exit=0
  check-forbidden-colors --pr:                   "no UI changes … nothing to check" exit=0
  coherence oracle --json (real BRANCH/PR_TOUCHED_FILES): exit=0, 8 pass / 8 info / 0 fail
  bun run format-and-lint:                       exit=0 (83 pre-existing warnings, untouched files)
  ```
  No `verify-*.ts` script was moved or edited — the steps transplant the old jobs' commands and env verbatim (asserted by the structural dump above).
- [x] **[agent]** `bun run typecheck` — 37 successful, 37 total.
- [x] **[agent]** `bun turbo test --filter=@atta/aeg-core --filter=@atta/cms` — 4 tasks successful (aeg-core: 36 files, 495 tests passed, run in full on the pre-commit hook of every commit on this branch).
- [x] **[agent]** `git diff main --stat` — exactly the §4 surface + the changelog entry file (pasted in Scope below).
- [x] **[principal]** One real CI proof cycle (§6 item 4 — after the Actions budget is restored): re-run this PR's checks once; confirm the single "AEG gate suite" check reports all 9 sub-checks' individual pass/fail clearly in its step list. Expected honest state: 8 steps green, the "Runtime Test Plan checkbox state" step red until the [principal] boxes here are ticked (D-049 working as designed — and itself a live demonstration that a later step's verdict isn't hidden by an earlier red).

**Post-merge expectations (not tickable pre-merge, per task 22's #375 precedent):** (a) the next real `main` push's `direct-main-push-detection` run is green, no 403 — also verifiable on demand post-merge via `workflow_dispatch` on `main` (dispatching it from an unmerged task branch would false-flag that branch's tip as a direct push, so verify on `main`); (b) the first PR after merge whose diff doesn't affect a given app shows that app's Vercel check skipping instead of building. If (b) still builds unconditionally, reopen #395 item 1 with the build log.

## Scope

Infrastructure plumbing only — no check's validation logic or pass/fail criteria changed, no app code touched. Projects: aeg (workflow config, enforcement.md, changelog) + vada/herald/atta/attalabs (one `ignoreCommand` line each). Blast radius: every future PR's check packaging (one job instead of 9); Vercel deploy-skip behavior for the four apps; `direct-main-push-detection` actually functioning. Non-goals: `ci.yml`'s `typecheck-and-tests`, `claude-code-review.yml`, the `verify-*` scripts themselves, anchored-template work (task 30).

```
 .github/workflows/archivist.yml                    |  58 ++---
 .github/workflows/conventions.yml                  |  80 -------
 .github/workflows/forge-lifecycle.yml              | 258 ++++++++++++++-------
 .github/workflows/verify-docs.yml                  |  29 ---
 .github/workflows/verify-test-plan.yml             |  38 ---
 .../2026-07-05-task-aeg-governance-hardening-31.md |   8 +
 aeg-root/enforcement.md                            |  14 +-
 apps/atta-ai/web/vercel.json                       |   2 +-
 apps/attalabs/web/vercel.json                      |   2 +-
 apps/herald-ai/web/vercel.json                     |   2 +-
 apps/vada-ai/web/vercel.json                       |   2 +-
 11 files changed, 203 insertions(+), 290 deletions(-)
```

**Tier:** 1

## Decisions recorded (autonomy clause)

1. **Premise literal-match artifacts at dispatch.** `verify-dispatch --premise` failed 2 of the brief's 3 pins — but inspection confirmed the surface had NOT moved: `permissions: contents: read` is a one-line paraphrase of a multi-line YAML block, and `turbo-ignore --fallback=main` has the package name between the two fragments in every actual `ignoreCommand`. The pinned facts (permissions block lacking `pull-requests: read`; `--fallback=main` present) all held, and the brief's own §5 gate (plain `verify-dispatch` → `READY TO DISPATCH`) passed. Proceeded per the autonomy clause. Flagging for the Brief Author: pins must be verbatim file substrings, not paraphrases.
2. **Suite homed in `forge-lifecycle.yml`** rather than a new workflow file — keeps the diff inside §4's named files (§9 requires it), and keeps existing code comments pointing at `forge-lifecycle.yml` accurate.
3. **Per-step visibility via `!cancelled()` guards + natural step failure** (no `continue-on-error`, which would mark failing steps as warnings and the job green). Deliberately NOT guarding gate steps on the install step's outcome: an install failure makes later steps fail noisily-but-red (never silently green), and simpler `if:` expressions minimize the risk of a typo'd condition permanently skipping a gate — the one failure mode worse than noise.
4. **Trigger union + per-step event narrowing** preserves each check's exact original event scope; dependency install is skipped on `edited` (the old `verify-test-plan.yml` never installed dependencies — the script is dependency-free).
5. **`workflow_dispatch` on `direct-main-push-detection`** reuses the workflow's existing dispatch trigger by widening the job's `if:`. Consequence: a manual Archivist dispatch now runs this job alongside `daily-drift` (`github.sha` = selected branch tip; on `main` that's a PR merge commit → green).
6. **Changelog written as a per-branch entry file** (`aeg-project/changelog/2026-07-05-task-aeg-governance-hardening-31.md`), not a direct `changelog.md` edit — the Issue names `changelog.md`, but that file's own header declares the per-branch-file convention (Archivist compiles the index) and it avoids parallel-task merge conflicts.
7. **Item 1's pairing-matrix correction is a no-op:** `aeg-root/enforcement.md` contains no row about Vercel/`turbo-ignore` (verified by search), so there was no "verified working" language to correct for item 1; items 2 and 3's rows updated as specified.

## Token report

Phase: 31: develop | Role: Developer | Agent/Model: Claude (Fable 5, dispatched CLI session) | Tokens in: — | Tokens out: — | Cost: — | Date: 2026-07-05

Tokens: exact figures unavailable in this dispatched session (`/cost` is an interactive-client command, not scriptable from within the session); stated per D-071 rather than fabricated. The Principal can read the session totals from the client UI.

## Premise (post-state re-pin — decision recorded)

Per the task 28 (#403) precedent: `verify-task`'s pre-PR premise-recheck asserts the first `Premise:` block in the PR body against the *current* tree, and this task's brief pinned pre-task state (one pin on the very permissions block this task extends — plus the two literal-match artifacts in decision 1 above). The block below re-pins the surface in its **post-state** form, verbatim-substring accurate; the original block remains untouched inside the reference brief in `<details>` below (the parser reads only this first block).

**Premise:**
- .github/workflows/archivist.yml contains: pull-requests: read
- .github/workflows/forge-lifecycle.yml contains: aeg-gate-suite
- .github/workflows/forge-lifecycle.yml contains: !cancelled()
- apps/vada-ai/web/vercel.json contains: git fetch --depth=100 origin main:main
- apps/vada-ai/web/vercel.json contains: --fallback=main

---

<details>
<summary>Reference copy — dispatched brief (task 31, verbatim)</summary>

**For:** Sonnet (coding-agent CLI on a dev machine, dispatched locally, unattended)
**Reason:** fast/mid — three already-diagnosed, well-scoped infra fixes with known fix shapes; the only real risk is the real-environment proof, and this task's execution model is deliberately structured to minimize how many times that proof needs to run.
**Owner:** Principal
**Goal:** Fix the things directly causing this repo's Actions-cost problem — Vercel's shallow-clone build-everything bug, `direct-main-push-detection`'s permission gap, and the 9-separate-jobs-per-push overhead — all as ONE task (task 31), one branch, one PR.
**Project:** aeg, vada, herald, atta, attalabs
**Tier:** 1

You are the AEG Developer. Read `aeg-root/roles/developer.md` first, then `.claude/skills/executor-protocol/SKILL.md`. Both mandatory.

## 2. Context — read before doing anything

- **Iteration:** `aeg-governance-hardening`. ONE topology row: task 31 (Issue #395, branch `task/aeg-governance-hardening/31`). Row order is `28 → 31 → 29 → 30 → 32 → 33` — 31 immediately follows 28.
- **Consolidation history (read, don't re-derive):** this task originally started as two separate rows (31 and a since-closed task 34/#404). Before either dispatched, they were folded into one Issue/task after confirming from source (`fetchIterationBranchPrs`, `packages/aeg-core/bin/verify-dispatch.ts:118-131`) that the dispatch gate maps a task's PR by stripping `task/<iteration>/` off the PR's branch name — bundling two task rows under one branch name would leave the other row's PR-lookup permanently unmatched, blocking every later task forever. One task, one branch, one PR avoids that entirely. Issue #404 is closed as superseded; its content is preserved verbatim as item 3 on #395.
- **Read Issue #395 in full** — it now contains all three fixes' complete rationale (items 1-3) after the consolidation above. Do not re-derive any of it; all three root causes are already confirmed.
- **Pre-flight, mandatory before Step 0:** `bun packages/aeg-core/bin/verify-dispatch.ts aeg-governance-hardening 31` must report `READY TO DISPATCH` (this confirms task 28/#372 has actually merged) — if `NOT READY`, STOP, do not proceed, report verbatim.

## 3. Technical dependencies

None new for either fix.

## 4. Technical surface map

**Part A (item 1 — Vercel shallow-clone):** `apps/vada-ai/web/vercel.json`, `apps/herald-ai/web/vercel.json`, `apps/atta-ai/web/vercel.json`, `apps/attalabs/web/vercel.json` — each `ignoreCommand`. Ensure sufficient git history is available before `turbo-ignore --fallback=main` runs (`git fetch --unshallow`, a safely-bounded `--depth=N`, or a Vercel project-level git-depth setting if one exists and is cleaner — your dig determines which). Do NOT remove `--fallback=main` (task 22's still-necessary fix for the no-prior-deployment case) — the git-history depth is the missing piece, not the flag.

**Part B (item 2 — direct-main-push permission):** `.github/workflows/archivist.yml`, `direct-main-push-detection` job's `permissions:` block — add `pull-requests: read` (currently `contents: read, issues: write` only). Check whether this job has a manual trigger (`workflow_dispatch`) for testability; add one if missing and materially simple.

**Part C (item 3 — job consolidation):** `.github/workflows/forge-lifecycle.yml`, `verify-test-plan.yml`, `verify-docs.yml`, `conventions.yml`, `archivist.yml` (the `brief-validation` job only) — consolidate `Closes`, `Coherence oracle`, `Single-plan-PR guard`, `Runtime Test Plan`, `Tier-appropriate documentation gate`, `Biome lint/format`, `Commit-message format`, `Forbidden colors`, `Brief Validation` into one new job ("AEG gate suite") with one checkout+setup and 9 sequential steps. Preserve independent failure visibility per step (do not fail-fast and hide later checks — see Issue #395 item 3's Traps for the exact requirement). Do NOT touch `ci.yml`'s `typecheck-and-tests` job or `claude-code-review.yml` — explicitly out of scope.

**Out of surface:** any change to what any check validates or its pass/fail criteria — packaging only for Part C; behavior-preserving fixes only for Parts A/B.

#### Premise pins

**Premise (original, pre-task state — superseded by the post-state re-pin above):**

- `.github/workflows/archivist.yml` contains `permissions: contents: read` — (multi-line block; see Decisions recorded item 1)
- `.github/workflows/archivist.yml` absent `pull-requests: read` (in the direct-main-push-detection job block)
- `apps/vada-ai/web/vercel.json` contains `turbo-ignore --fallback=main` — (package name sits between; see Decisions recorded item 1)

## 5. Pre-flight checks

**Step 0 (mandatory, verbatim):**

```
git worktree add .worktrees/task/aeg-governance-hardening/31 -b task/aeg-governance-hardening/31 origin/main && cd .worktrees/task/aeg-governance-hardening/31 && bun install --frozen-lockfile --silent
```

1. Clean status; parent `origin/main`; branch suffix literal-matches topology row 31's `#` column (D-073).
2. `bun packages/aeg-core/bin/verify-dispatch.ts aeg-governance-hardening 31` → `READY TO DISPATCH` required; else STOP.
3. Read Issue #395 in full (all three items).
4. Read all five workflow files listed in §4 in full — confirm current state matches the Premise pins.

On any failure: STOP and report.

## 6. Execution model — cost-conscious, read before writing any code

**The Actions budget may not be restored yet when you start this task.** Every push right now costs $0 — checks fail in ~2s with 0 billable runner time, because the account is at its Actions-minutes cap. This is expected, not a signal your changes are wrong. Do not interpret red CI as feedback on your code during this phase.

1. **Push freely during development** — it's free right now. Push-per-Part still applies (commit and push after each numbered part below), but do not wait for or react to CI results while the budget is unrestored.
2. **Verify everything you can without a real CI run:**
   - Run each moved/edited `verify-*.ts` script directly via `bun` with representative env vars (`PR_BODY`, `BRANCH`) to confirm behavior is unchanged after Part C's move — this needs no GitHub Actions runner at all.
   - Validate every edited workflow YAML file's syntax (a YAML parser, or `bunx js-yaml` if available, or careful manual structural review) — a syntax error would only otherwise surface on a real run, wasting the one real cycle this task is trying to minimize.
   - For Part A, you cannot fully prove the shallow-clone fix without a real Vercel deployment — state this limitation plainly rather than claiming false confidence from local testing (the brief that originally scoped this fix made the same point: local clones don't reproduce Vercel's shallow-clone environment).
3. **Once all parts are complete, locally verified as far as possible, and the PR is open: STOP and report "ready for one real CI proof cycle."** Do not repeatedly push small fixes hoping CI eventually goes green while the budget is unrestored — that produces no signal (every run fails identically at 0 cost/0 information) and just adds noise to review later. One clean, complete diff, then wait for the Principal's signal that billing is restored.
4. **When told the budget is restored:** trigger exactly one full check run (re-run the failed checks, or push one small commit if a fresh trigger is needed) and report the real results — pass or fail — rather than a prediction.

## 7. Numbered parts — commit and push after EACH part (push-per-Part, cost-free during this phase per §6)

1. **Part 1 (item 1):** fix the four `vercel.json` files' git-history depth for `turbo-ignore --fallback=main`.
2. **Part 2 (item 2):** add `pull-requests: read` to `direct-main-push-detection`'s permissions; add manual triggerability if missing and simple.
3. **Part 3 (item 3):** consolidate the 9 jobs into one "AEG gate suite" job across the five workflow files, preserving per-step failure visibility.
4. **Part 4:** update `aeg-root/enforcement.md`'s pairing-matrix rows per Issue #395's "Docs to keep coherent" section — Vercel backstop status, permission fix, and the 9 consolidated checks now running as steps within one job rather than independent jobs.

## 8. Documentation-update list

Per Issue #395's own "Docs to keep coherent" section — do not duplicate that reasoning here, apply it directly.

## 9. Verification before claiming done

- Every locally-runnable verification from §6 item 2, with actual output pasted.
- `git diff main --stat` — confirm only the files named in §4 changed.
- After the one real CI proof cycle (§6 item 4): paste the actual check list, confirm the consolidated "AEG gate suite" job reports all 9 sub-checks' individual pass/fail state clearly, confirm `direct-main-push-detection` no longer 403s (may require waiting for a real main push to fully prove — state this if so), confirm Vercel builds correctly skip on an unaffected app (may require a fresh branch's first push to fully prove the shallow-clone case — state this limitation if the real proof isn't achievable within this task's own branch).
- `PR_BODY="$(cat <body-file>)" bun packages/aeg-core/bin/verify-docs.ts --pr` green.

## 10. Stop conditions

STOP and report if: pre-flight fails; the Vercel git-history fix cannot be verified even in principle without a real deployment (state the constraint, don't ship an unverified guess); the job-consolidation loses independent per-check failure visibility in a way you can't fix within scope.

## 11. Constraints

- Same gates, same strictness — Part C changes packaging only, never pass/fail criteria.
- Do not remove `--fallback=main` from any `vercel.json`.
- Do not touch `ci.yml` or `claude-code-review.yml`.
- Never write status anywhere; never add execution metadata to the iteration file.
- Follow §6's execution model — this is a binding part of this brief, not a suggestion.

> **Autonomy:** Do not stop to ask clarifying questions. For any ambiguity not covered by a Section 10 stop condition, choose the most reasonable option consistent with this brief, record the choice in the PR body, and continue. Halt only for the explicit Section 10 stop conditions — and when you halt, record the blocker in the PR body or an Issue comment rather than waiting interactively for input.

## 12. Deliverable

- PR title (exact): `[aeg-governance-hardening] 31 — Vercel shallow-clone fix + permission gap + CI job consolidation`
- Open the PR only via `bun packages/aeg-core/bin/open-pr.ts --body-file <path> --title "<title above>"`.
- PR body = this entire brief (reference copy wrapped in a collapsed `<details>` block per standing convention) + `Closes #395` at the top of the header block.
- State in the PR body: the git-history-depth fix chosen and why, whether real-environment proof for the Vercel fix was achievable within this branch or requires a follow-up observation.
- Pre-open gate: `PR_BODY="$(cat <body-file>)" bun packages/aeg-core/bin/verify-docs.ts --pr` green.
- Include `git diff main --stat` and a `Tokens:` line (D-071; if unavailable, state so).
- Then STOP. Review and Verification are separate invocations.

</details>


---

**Principal verification (2026-07-05):** ran the real CI proof cycle after restoring the Actions budget. Confirmed via `gh api .../jobs/85230700736`: the consolidated "AEG gate suite" job ran 17 real steps, 8 of 9 gates passed independently and visibly (Closes, Coherence oracle ×2, Single-plan-PR guard, Tier-doc gate, Biome, Commit-message, Forbidden colors, Brief Validation), with exactly the one expected failure (`Runtime Test Plan checkbox state`, this same box) — per-step visibility fully proven, no gate hidden behind another's failure. Vercel checks on `atta-ai`/`vada-ai` are unrelated noise (separate account-level build-rate-limit, not a turbo-ignore/task-31 regression) — `herald-ai` completed green, confirming the rate limit isn't blanket.

