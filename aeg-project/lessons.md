# Atta — Lessons

**Calibration lessons and anti-patterns.** Append-only. Review monthly.

→ [state.md](state.md) — current operational state
→ [changelog.md](changelog.md) — what shipped

---

## Calibration lessons

Lessons accumulated through April-May:

- **Brief authoring rules now mandatory.** Every executor brief specifies model selection, worktree requirement, file scope boundaries, stop conditions, deliverable format.
- **Verify SPEC-A before going to SPEC-B.** When a brief tells the agent to prefer one path, the agent must demonstrate the preferred path is impossible before choosing the alternate.
- **Generic tools beat per-team handlers.** The catalog framing requires `vada__consult` to accept `spec_id` and route to any YAML.
- **Diagnose before designing.** Read-only diagnostic before fix briefs; visual verification via screenshots before merge.
- **Specs can lie. Implementations don't.** The BYOK structural-promise gap had been there for an unknown duration; only revealed by audit.
- **Three parallel agents is sustainable.** Different worktrees, different file scopes, different branches from `origin/main`.
- **Don't test on prod.** Wildcard preview domains for multi-developer teams.
- **PR-mergeability ≠ branch-pushed-to-origin.** Force-pushing a worktree to origin syncs origin/branch, but does NOT guarantee the PR will merge cleanly into main.
- **Pre-push verification must include production build.** Local typecheck/lint pass with all dev deps installed; Vercel uses `--frozen-lockfile` and stricter resolution.
- **UX coherence walkthrough must precede architectural lock.** "What does the user click? What does it mean? What state do they end up in?" — should have killed the two-store sync architecture immediately if asked when D-029 was first locked. Cost: a sync bug surfaced within minutes of feature use, multiple review rounds, and an architectural reversal (D-028) within the same week.
- **Vercel "Sensitive" env var flag hides the Value field on Edit.** Pasting into the Notes field instead of Value passes silently. `vercel env pull` is the only reliable verification path for the project owner. Hours-long debugging marathon caused by this. See D-029 Consequences.
- **Vercel Hobby plan suppresses function stdout/stderr in dashboard UI.** Diagnostic console.error PRs are useless on Hobby. Local debug via `vercel env pull` + `bun run dev` is the correct path.
- **SHA-256 + unique index is the right hash mechanism for short-lived bearer tokens with high entropy.** bcrypt's per-request CPU cost is unjustified when the token has 256 bits of randomness and the lookup uses an indexed unique constraint.
- **Sycophancy at architectural decision points is dangerous.** Reflexive flipping when challenged is just as bad as defending a wrong choice. The right answer requires reasoning, not capitulation.
- **When something feels uncannily like a spec we already wrote, check if we already wrote it.** May 6: Claude got excited about a project management framework idea before noticing it was already specced as Cetana V0/V0.7. Pattern: pivots to "shiny new architectural ideas" mid-execution. Counter: pause, search project knowledge for the closest existing concept, then decide whether to investigate.
- **Research synthesis often duplicates existing spec work.** May 8: a parallel research thread (Gemini, Grok, ChatGPT — multi-agent orchestration patterns) returned five "convergent patterns." Three were already in `vada-reviewers-spec.md` rev 4. The fix wasn't a new principles doc — it was a rev 5 patch to the existing spec. Always check the relevant spec first; new research usually patches existing specs rather than spawning new ones. Standalone principles docs risk drifting from implementation.
- **Self-hosted MCP servers with bearer-token auth currently fail through Claude.ai's connector broker.** May 7-8: Vāda's hosted MCP at `vada.attalabs.dev/api/mcp` is healthy and works via Claude Code CLI, but Claude.ai web rejects it with `ofid_*` broker errors. GitHub's hosted MCP at `api.githubcopilot.com/mcp/` works via OAuth. Different code paths in Anthropic's broker. Workaround for Vāda users today: Claude Code CLI. Future hardening: add OAuth as an alternative to bearer auth (Track E12). Reconfirmed May 9 (third reproduction; consistent failure mode).
- **Validate the existential dependency before building the product around it.** May 9: Cetana V0 was almost designed and partially built before validating that Claude Code (headless mode) could actually call a custom MCP tool that blocks for arbitrary duration and resumes coherently. Slice -1 prototype (~100 lines, 2 hours) settled the question definitively. Generalizable rule: if the entire product depends on one technical mechanism nobody has confirmed at runtime, prototype that mechanism in isolation before designing anything around it.
- **Reviewer pressure-testing materially improved the Cetana architecture.** May 9: Multi-AI synthesis caught a fatal architectural assumption (web Claude.ai cannot reach localhost MCP servers — only Claude Desktop can). Without that catch, V0 would have been built on impossible plumbing. Generalizable rule: when an architecture depends on a transport assumption, verify it against vendor docs before locking the spec.
- **PM docs in repo > project knowledge.** May 9: migrating `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md` from Claude.ai project knowledge to the repo (in `project-management/` at the time; later split into `aeg-root/` + `aeg-project/` — D-041) eliminated the manual upload loop. Now any Claude session reads/writes them via GitHub MCP. Cetana V0 will read/write them programmatically. The project knowledge layer was operationally heavy and gave nothing the repo didn't already provide.
- **Anthropic's SKILL.md frontmatter accepts only `name` and `description`.** May 9: project-specific metadata (path globs, ownership, tags) must live outside the frontmatter — sibling files in the skill directory, not custom frontmatter fields. The Skill tool silently drops skills with non-standard frontmatter; the failure is invisible until an agent tries to invoke the skill, which exposed the issue when skill-check enforcement collided with Skill tool registration. Generalizable rule: never extend Anthropic-defined contracts inline; keep custom data adjacent in separate files.
- **MCP tool inputSchema is the only contract clients see.** May 9: `vada__consult`'s validator accepted both legacy and structured shapes for ages, but only the legacy shape was declared in `inputSchema`. No MCP client ever sent the richer shape because they read the schema. Generalizable rule: when a runtime accepts more than the published contract advertises, the published contract is the actual constraint. Update the schema together with the validator, or callers will only ever exercise the floor.
- **Trust no executor completion claim without raw command output for every required deliverable.** May 9: three executor self-reports during a single session were either incomplete or factually wrong (one didn't push to origin despite reporting "done"; one tried to disable a hook unilaterally; one fabricated a summary instead of running the verification commands the brief required). The brief's deliverable contract is the contract — partial reports get rejected and re-asked, raw output for every line item or no merge. Cost of demanding raw output is small; cost of merging on a confident summary is large.
- **Declared deps ≠ used deps under `--frozen-lockfile`.** May 11: Bun's hoisted node_modules made a missing `@atta/models` dep in `@vada/mcp-server` invisible locally — typecheck, lint, and tests all passed. Vercel's `--frozen-lockfile` resolution surfaced the missing dependency as a TS2307 error. Generalizable rule: when a refactor introduces new cross-package imports, audit `package.json` `dependencies` for every modified app/package — `grep -l "from '@scope/...'" $(find src) | xargs ... vs package.json` catches the gap pre-push. Local typecheck passing is not proof of dep-graph correctness.
- **"Open / unresolved" is for research and exploration. Roadmap items live in the Tracks and "In flight" sections.** May 10-11: A Claude session treated a parking-lot item ("Vāda Desktop") in `plan.md`'s Open / unresolved section as a live architectural decision and invented spec-section citations to support it. The parking-lot content was legitimate research (CLI/desktop wrapper concepts inspired by Karpathy's llm-council); the failure mode was treating research as roadmap. Generalizable rule: when asked for "a real question to pressure-test" or "what's next," don't pull from Open / unresolved — those entries are research, deliberately not roadmap. If a research item ever becomes a real candidate, it gets promoted to a Track entry first.
- **Capture architectural symmetry concerns the moment they surface.** May 11: The MCP `reviewer_config` work was initially framed as a "small fix" (one schema field). Following that framing through revealed four divergent prefix-resolution implementations across packages — the actual problem was architectural, not surface-level. Asking "what would need to change to support a new vendor end-to-end?" at the moment the asymmetry surfaced would have produced the vendor registry approach on day one rather than after a discarded executor pass. Generalizable rule: when a "small fix" pattern requires touching files in 3+ packages with the same kind of change, stop and ask whether the change itself is the architectural fix or just a symptom patch.
- **`keyPlaceholder`-style derived UI fields belong at call sites, not on canonical type interfaces.** May 11: A consumer (model-picker) read a `keyPlaceholder` field that was a 3-line computation over the `Vendor` interface's `keyPrefix` + `localOnly`. The wrong fix is extending `Vendor` to include presentation-derived fields ("vendor identity" then conflates with "how the picker renders the input field"). The right fix is inlining the computation at the call site. Generalizable rule: if a value is `f(canonical-fields)` and only one consumer reads it, that's the consumer's concern, not the canonical type's.
- **Install gate verification must use Principal-runnable commands, not agent-runnable commands.** May 12: PR #39 (F5) claimed the install gate passed, but the documented invocation (`bun link --cwd apps/cetana-ai/cli`) was never actually what the agent ran. The agent ran something equivalent that worked in its environment; the docs captured a guess. The Principal hit "Script not found 'link'" trying to follow the docs verbatim. Future install-gate PRs must paste the EXACT commands the agent ran (copy-pasted from terminal, not paraphrased) and the Principal should physically run the documented commands before approving merge. Brief specs that include "install gate" requirements must require this explicit copy-paste evidence, not just a "verified" claim.
- **Install gate verification must cover every code path a user can hit, not just the happy path.** May 12: PR #39 (F5) verified `cetana init` for the fresh-config happy path. The existing-config-decline-overwrite path was never tested, and it shipped with a process hang. The Principal hit it within minutes of post-merge validation. Fix: when a brief specifies an install gate, the verification step must enumerate the distinct code paths (e.g., fresh install / existing config accept / existing config decline / network error / permission error) and the agent must run each. A single "smoke test passed" claim is insufficient.
- **Scope sprawl on an atomic PR (#207).** June 27, 2026: PR #207 absorbed three out-of-iteration workstreams (TextReveal, Herald `JDInput` refactor, admin theme-editor `a8a0f5c6`) under Principal instruction ("keep the deliberate-page work atomic"). Shipped successfully, but produced a self-contradicting PR narrative ("Herald byte-identical" → later refactored, both still in the body) and a `Doc-waiver` carrying an unrelated admin commit. A coherence pass was needed at merge time to reconcile PR body, AEG changelog, iteration topology, decisions, and skills. **Lesson:** when keeping work atomic is the explicit call, log absorbed scope at the moment of absorption — append to the PR body + add an Out-of-iteration section to the iteration file + flag the contradicting earlier note — so the records stay coherent in real time instead of needing reconstruction afterward. The cost of logging is small; the cost of post-hoc reconciliation across five docs is large.

---

## Anti-patterns to avoid

- ❌ Trusting an agent's self-report without diff inspection or visual verification
- ❌ Letting an agent jump to a fallback approach without demonstrating the preferred approach is impossible
- ❌ Recommending merge-to-main without preview testing
- ❌ Editing docs to match broken implementations
- ❌ Greping only camelCase variants when env vars use SCREAMING_SNAKE_CASE
- ❌ Carrying forward retired architectural concepts in framing
- ❌ Drafting executor briefs that assume the engine is greenfield
- ❌ Iterating blindly on visualizer bugs without diagnosing the data model
- ❌ Force-pushing a worktree without verifying the PR will merge cleanly into main
- ❌ Pre-push verification that omits production build (`bun build` or equivalent)
- ❌ Locking architecture without walking through the user-facing UX implications first
- ❌ Pasting environment variable values into Notes instead of Value when the Sensitive flag is enabled in Vercel
- ❌ Adding bcrypt cost to high-entropy bearer-token validation when SHA-256 + unique index is sufficient
- ❌ Maintaining "two stores with sync" architectures unless there's a user-visible reason for the second store to exist
- ❌ Pivoting to investigate a new architectural idea mid-execution without first checking whether it's already specced and parked in the project's own docs
- ❌ Designing a product around a technical mechanism without first prototyping the mechanism in isolation to confirm it works
- ❌ Locking transport architecture without confirming transport assumptions against vendor docs
- ❌ Adding custom fields to SKILL.md frontmatter (Anthropic Skill tool drops the skill silently)
- ❌ Letting MCP tool inputSchema and runtime validator drift — schema is the only contract clients see
- ❌ Accepting executor "done" reports that skip the brief's deliverable contract; demand raw command output line by line
- ❌ Treating Open / unresolved parking-lot items as roadmap. Research isn't a task.
- ❌ Extending canonical type interfaces (Vendor, ModelEntry, etc.) with presentation-layer or call-site-specific derived fields. Inline the derivation at the consumer.
- ❌ Adding cross-package imports during a refactor without auditing every modified `package.json` for the corresponding `dependencies` entry. `--frozen-lockfile` surfaces the gap; local Bun hoisting hides it.
- ❌ Treating an agent's "install gate verified" claim as evidence without the Principal running the documented commands
- ❌ Documenting install commands that differ from what the agent actually ran (paraphrasing vs copy-pasting)
- ❌ Accepting "verified" as a status without raw terminal output as evidence
- ❌ Verifying only the happy path of an install gate and declaring it passed
- ❌ Treating "process printed success message" as evidence of clean exit — a process can print and then hang on pending I/O handles
- ❌ Using `process.exit()` to paper over event-loop liveness bugs — find and close the dangling handle instead
- ❌ **Letting orchestration speed outpace review rigor.** Every time Cetana ships a feature, friction per task drops. That's the goal. But there's a real risk: as dispatch becomes cheaper, the Principal may dispatch tasks faster than they can meaningfully review the output. The two install-gate failures on May 12, 2026 (PR #39 → PR #42 fix → PR #43 fix) are a small instance: the agent claimed verified, the Principal trusted, two bugs slipped through. Higher orchestration speed without higher review rigor is how trust degrades. Mitigations: (a) review gates must scale with throughput — when shipping >5 PRs/day becomes routine, review checklists need to get more explicit, not less; (b) D-025-style path-coverage requirements should be added for other failure-prone areas as they emerge; (c) the Principal should periodically run "is this still being reviewed properly?" audits — pick a recent PR at random, re-review it fully, compare findings to what was caught at merge time; (d) sustained dogfooding (D-023's 4-week gate) before V1 surface adoption helps surface review degradation before tooling makes it worse. The general principle: tooling that automates orchestration should ship with explicit guardrails against degrading the human-judgment loops it depends on.

---

## L‑001 — One agent per branch; the other stashes and idles

**Context:** During `herald-profile-refactor`, multiple Claude Code agents were run against the same branch (and the same files — `ProfileEditor.tsx`, `envoy-shell.tsx`, a shared `@atta/ui/account` file). This produced a long, avoidable deconfliction episode: overlapping uncommitted edits across a worktree *and* the main checkout, a stale `feat/herald-admin-portal` branch that turned out to be an ancestor (no unique work), and an `AttaUserProfile` fix that was nearly stranded on `main`.

**Lesson:** Only **one agent** edits a given branch at a time. If a second agent has work in progress, it runs `git stash push -u` and idles until the first has committed and pushed; then it pulls, pops, keeps only its unique change, and commits. Never choreograph two agents committing to the same files — serialize them. Write agent prompts that start with `git pull --rebase` and a stop-condition: "if `git status` shows another agent's uncommitted work, STOP and report."

**Anti-pattern:** Two agents on one branch "to go faster." It is slower — the deconfliction cost dwarfs the parallelism gain at this scale.

---

## L‑002 — The pushed code is the source of truth, not the agent's "done" report

**Context:** Several agent reports stated a fix had landed when the pushed file showed otherwise — most notably the EnvoyShell structural rewrite (the desktop-overlap fix), which a report described as done while the committed file still contained the bespoke centered-identity column. A button-size fix was reported as "matched" but had been matched to the *wrong* (chunky) size. The library-resolution fix was first applied in the *opposite* direction to the product rule and reported as correct.

**Lesson:** After any agent reports "done," verify against the **pushed code on the remote** (read the actual file / diff) before treating it as complete — especially for structural changes and anything cross-cutting. Reports describe intent; the diff is the fact. This is the audit-mode ordering (D-004): shipped code outranks the claim about it.

---

## L‑003 — Recover loose work immediately; don't let it sit uncommitted across checkouts

**Context:** An `AttaUserProfile` width fix lived only as an unstaged change in the **main** checkout (wrong branch) while the work belonged on `herald-profile-refactor`. A phantom "second stash" was reported that never existed. The fix was eventually recovered by pasting its diff and pushing it directly to the branch.

**Lesson:** When a needed change exists only as uncommitted work — especially in a different worktree/branch than where it belongs — move it to its home branch and commit it promptly (cherry-pick, or grab the diff and push directly). Uncommitted work spread across a worktree + the main checkout is how changes get lost or duplicated. The Team Leader pushing a small verified diff directly via the forge is a fine recovery path when the agent's tree is tangled.

---

## L‑004 — Slow down at architectural decision points; confirm the product model before prescribing a fix

**Context:** The `/ui`-page library mismatch was twice mis-diagnosed by the Team Leader ("it's the preview iframe"; "it's just a variant color difference") before the Principal restated the actual product rule: app chrome = build-time CMS library; user preference applies only to the public profile (D-035). The first agent fix then went in the wrong direction because the brief encoded the wrong model.

**Lesson:** Before writing a fix brief for a strategic/architectural symptom, confirm the **product invariant** with the Principal (or the spec) rather than reasoning ahead of evidence. A confidently-wrong brief sends an agent in the wrong direction and costs a full round-trip. When the Principal restates a rule, encode it verbatim and note that the prior commit was the mistake to undo. (Reinforces the existing spec-check gate: read the product's specs before answering architectural questions about it.)

---

## herald-onto-engine — retrospective (June 2026)

**Duration:** June 13, 2026 → June 15, 2026 (first task PR #104 merged → last task PR #123 merged)
**Tasks completed:** 8 of 8 planned (tasks 1, 2, 3b, 4, 5, 6, 7a, 7b)
**Tasks dropped/deferred:** Task 3a ("multi-vendor structured output in the engine") — deliberately dropped June 12, before the iteration started, by Brief Author dig proving Herald didn't need it (Herald's prompt already requested JSON-as-text and parsed it, like Vāda). Not an execution failure — removed from scope before any code was written.

### What went well

- **The planner readiness gate caught the 7→7a+7b split before the brief shipped.** Task 7 assumed the engine could run custom client-side tools; the dig proved it couldn't (`node-executor.ts` + `graph-state.ts` confirmed there was no call→tool→call loop). Splitting into 7a (shared engine capability) and 7b (Herald's tool) prevented a silent engine gap from landing inside a Herald-framed brief where it would have been invisible.
- **The Brief Author dig dropped task 3a before code was written.** Both model self-corrections (3a drop, 7→7a+7b split) happened in the planning phase, not during execution — the design-time error catching the brief author promises was demonstrated in production for the first time.
- **Engine adoption (task 1) was zero-engine-change.** The engine already ran any vendor as text; Herald's YAML expressed the call without requiring any modification to `packages/engine` or `packages/adapter-langgraph`. Confirmed by empty diffs on both packages after task 1 merged.
- **Additive/opt-in constraint on task 7a held.** The 6-gate `resolveRegisteredCustomTools` test suite proved byte-identical behavior for Vāda agents (no custom tools declared → empty array, loop unreachable). 31 baseline adapter tests stayed green after 7a shipped.
- **Wave parallelism worked.** Task 7a ran independently from the Herald chain (no deps) and completed before 7b needed it. Max concurrent inflight: 2-3 tasks in wave 3.

### What stalled or caused rework

- **PR #132 was required after iteration close.** The auditor had a max_tokens truncation bug (reports cut mid-sentence), a stale model pin, and a JD URL charset encoding issue — all surfaced by runtime production use, not by the iteration's test suite. CI-green ≠ report quality.
- **Task 6 (per-key rate limit) shipped with graceful degradation only.** Upstash Redis creds expired before the iteration started, so rate limiting was wired up at the `/api/audit` middleware layer but could not enforce — the operational dependency (fresh creds) was known pre-dispatch but not resolved as a pre-flight step.
- **PRICING table gap was pre-existing but surfaced during task 1 smoke test.** `claude-sonnet-4-20250514` (the YAML's pinned model) was not in the adapter's PRICING table, so every Herald audit reported `$0.00` cost. Not caused by the iteration; deferred as its own fix (currently listed in the Herald backlog).

### Carry-forward lessons

- **Shared-engine additivity requires unit-test proof, not just "should work."** The `resolveRegisteredCustomTools` 6-gate suite (D-047) is the pattern — assert byte-identical behavior for callers without custom tools, not only that custom tools work. Any future shared-engine capability should carry the same invariant proof.
- **Runtime production testing should follow within days of iteration close.** The auditor quality issues (PR #132) were invisible to typecheck/lint/tests; they required a real audit in a real browser. The Verification phase (D-049) formalizes this — `[principal]` items are the mechanism.
- **Operational credential gaps block task 6-class work.** Both Upstash Redis creds (rate limiting) and OpenAI/xAI keys (Vāda benchmarks) have been blocked by expired or missing secrets. A pre-flight cred check should be a named item in any iteration brief that has an operational dependency.

### Decisions made this iteration (Type 1, ratified)

- **D-044** — Herald auditor migrated onto `@atta/engine` via solo YAML (task 1). Status: ACTIVE.
- **D-045** — Herald endpoints unified into `/api/audit`; `SKEPTICAL_AUDITOR_PROMPT` deleted (task 2). Status: ACTIVE.
- **D-047** — Custom client-side tool execution added to `@atta/adapter-langgraph` as additive/opt-in capability (task 7a). Status: ACTIVE.

### Unbuilt tasks

Task 3a (multi-vendor structured output in the engine): dropped intentionally pre-brief (June 12). Principal-approved drop after Brief Author dig proved Herald didn't need it. Backlogged as an optional future engine enhancement.

---

## aeg-governance-ui-v2 — retrospective (June 2026)

**Duration:** June 18, 2026 → June 20, 2026 (first task PR #144 merged → last task PR #155 merged)
**Tasks completed:** 4 of 4 planned (topology tasks 1, 2, 3, 4 — task 1 split into 1a+1b by Brief Author = 5 planned PRs; 1 unplanned PR #152 task/theme also merged)
**Tasks dropped/deferred:** None. All topology tasks completed.

### What went well

- **Contracts-first before UI.** Task 1a (5 role-seam contracts) merged June 18 — before any UI work dispatched. The governance model was structurally complete before the Studio was built to visualize it. This is the right sequencing and held cleanly.
- **1a/1b Brief Author split.** Separating governance writing (1a) from the discovery audit (1b) let both proceed without touching the same files. The spike found 16 gaps and produced `aeg-root/discovery/2026-06-17-governance-gaps.md` — a structured backlog of remaining inconsistencies before the next iteration.
- **Exact-copy Studio refactor pattern held.** Task 2's brief said "copy exactly, do not redesign." The refactor lifted the science layout from `apps/vada-ai/web/src/app/(main)/_archived-science/` verbatim and adapted only nav items. No redesign debt was introduced.
- **Token ledger display closed the open loop.** Task 4 delivered the Studio view half of D-048 (the `parseLedger` + `sumLedger` model half had shipped in aeg-ui-v1 task 9). The two-session deferred pattern (model first, then view) worked — `sumLedger()` was a clean hook when task 4 consumed it.

### What stalled or caused rework

- **task/theme was unplanned.** CMS config wiring (PR #152) was not in the iteration topology — it was added mid-iteration because the Studio rendered with bare tokens after task 2. A non-functional requirements check during task 2's brief would have caught that `NextWebShell` wiring was missing. Cost: one extra PR, one extra round-trip.
- **No GitHub Issues were filed.** All topology entries carry `#TBD` — Issues were never created. The iteration ran without the Issue layer entirely. Forge-derived status was impossible; the task-ledger map in the retrospective is assembled from PR head branches alone, not Issue numbers.
- **Per-task Archivist did not run on any of the 6 PRs.** All provenance blocks are absent. The Iteration Archivist flag (in DANGLING) carries this forward for Principal decision.

### Carry-forward lessons (add to calibration section if not already there)

- **Check non-functional requirements (theme, auth, CMS wiring) at brief time, not post-merge.** When a task creates a new surface or shell, the brief's surface map should list environmental wiring (CMS config, `NextWebShell`, `IdentityProvider`) alongside functional routes. Missing these produces an unplanned cosmetic follow-up PR.
- **File Issues before dispatching any task.** `#TBD` is not a valid forge reference. The brief-developer contract requires an Issue number before the Developer starts. Iteration planning should create the Issues immediately after the topology is locked — not defer to "TBD."

### Decisions made this iteration (Type 1, ratified)

No Type 1 decisions were authored during task execution (June 18–20). The planning-phase decisions immediately before this iteration:
- **D-050** — Iteration Archivist as a first-class AEG role (June 17). Status: ACTIVE.
- **D-051** — Agent implementation packages at `packages/agents/<name>/`; workspace glob extended (June 17). Status: ACTIVE.

### Unbuilt tasks

None. All 4 topology tasks completed.

---

## L‑005 — Stale skills/specs actively mislead: the auth skill said "never per-project Clerk" while Herald had its own

**Context:** `.claude/skills/auth/SKILL.md` asserted "one Clerk app for the entire ecosystem / never create a per-project Clerk app" as a hard rule, while D-031 had already established Herald as a standalone with its own Clerk app. An agent reading the skill would have applied the wrong identity model to Herald.

**Lesson:** When a decision creates an exception to a documented rule, update the skill/spec in the **same** pass, not "later." A stale skill is worse than a missing one — it asserts a falsehood with authority. Capture exceptions explicitly (the auth skill now has a "Herald exception" section). Doc updates ride as a separate PR from the code, but they are not optional follow-ups — do them while the change is fresh.

---

## L‑006 — A Planner commit landed on `main` with no worktree; nothing stopped it

**Context:** During an aeg planning session (June 2026), a plan-artifact commit (iteration topology + decision entry) was made **directly on `main`**, with no worktree branch and no PR. Nothing in the harness or Husky stopped it. The Developer brief has carried a worktree-first Step 0 for a long time, but that discipline lived only in the Developer's brief — no other role had a worktree gate, and no mechanism enforced one. The same session also surfaced that an agent could `gh pr merge` a red PR: the green-merge invariant was *trusted* (documented), not *enforced*, because branch protection is unavailable on this private+free repo (classic protection and rulesets both 403).

**Root cause:** worktree-first discipline and the green-merge invariant were **role-doc conventions, not mechanical gates** — and they covered only the Developer. Non-Developer roles (notably the Planner, which commits the iteration file and decision logs) had no Step 0 and no enforcement, so a direct-to-`main` commit was the path of least resistance, and a red merge was one command away.

**Lesson / fix (these guardrails):** promote the invariants from trusted to enforced (D-069), for free, without branch protection:
- `.husky/pre-commit` refuses commits while on `main`; `.husky/pre-push` refuses pushes targeting `main`. Direct-to-`main` is now mechanically blocked for every role.
- `.claude/hooks/check-pr-green.sh` (a `PreToolUse` merge-gate hook, sibling to `check-skill.sh`) intercepts every agent merge path — `gh pr merge`, `gh api …/merge`, `curl …/merge`, GitHub MCP `merge_pull_request` — and denies the merge unless `gh pr checks <pr>` is all-green, failing closed when greenness can't be proven.
- Worktree-first discipline is made universal: a Step 0 in `roles/planner.md` for plan artifacts, and the "every repo-file change goes through a worktree + PR" rule in `coordination.md` for all roles.

**Generalizable rule:** when an invariant matters enough to document, ask whether the path of least resistance violates it. If it does, the invariant needs a mechanical gate, not just a role-doc sentence. A convention only one role reads is not a system property — enforce it at the harness/hook layer where every role hits it.

**Anti-pattern:** relying on role-doc prose to enforce a git-flow invariant (worktree-first, green-merge) while the un-gated direct path stays one command away.

---

## aeg-ui-v1 — retrospective (June 2026)

**Duration:** June 14, 2026 → June 20, 2026 (PR #105 merged → PR #153 merged — task 9 view half)
**Tasks completed:** 10 of 10 planned
**Tasks dropped/deferred:** none

### What went well

- **The pure `@atta/aeg-core` foundation held.** Task 1's zero-I/O constraint (no filesystem, no GitHub client, only typed inputs) produced 49 passing tests and an immediately consumable substrate. All downstream tasks (3, 4, 5, 6, 7, 9) consumed it without modification. The pureness constraint also let both Studio (local) and the future Portal (hosted) inherit it — the multi-consumer design was free because I/O was never a coupling point. PR #105.
- **The 4→6→5 serialization of the app-surface wave prevented shared-shell collisions.** The planner declared conflicts explicitly and serialized; none of the three tasks (projects/iterations nav, dependency graph, kanban) touched each other's routing files. No merge conflicts across the wave.
- **Task 9's model/view split was flagged in the brief and kept the iteration moving.** The brief for PR #122 explicitly noted "#110 stays open for the Studio view follow-up" — this prevented task 9's view half from blocking the iteration's main wave (which would have stalled on the pages surface then occupied by task 6).
- **`@atta/ui/engine-flow` was reused for the graph view (task 6) without modifying the shared package.** Zero blast radius on Vāda/Herald from task 6's dependency graph — exactly what the planner readiness gate was designed to confirm in advance.
- **`@atta/aeg-core` reused as a fixture source.** The live iteration + registry files were vendored as test fixtures at `packages/aeg-core/src/fixtures/` — tests proved real-world correctness rather than synthetic coverage.

### What stalled or caused rework

- **Four runtime failures merged CI-green across this iteration.** A missing DB migration (Studio kanban), a missing env var (Herald BYOK key), a missing IdentityProvider (ModelPicker render path), and an unexecuted polymorphic-input test plan (Herald bulk audit) all slipped past typecheck + lint + unit-test gates. Root cause: no role owned runtime verification. This structural gap was the direct motivation for D-049 (Verification Phase), which this iteration produced as its own remedy in task 10. The remedy was produced by the same iteration that created the evidence — an honest self-correction.
- **Task 9 view half landed on a different iteration's branch.** The view half of task 9 (PR #153) merged on branch `task/aeg-governance-ui-v2/4` rather than a `task/aeg-ui-v1/*` branch. As a result, GitHub's auto-close did not fire on Issue #110, which remains open. The work is complete; the signal is wrong.
- **Local worktrees not cleaned up after merges.** `.worktrees/task/aeg-ui-v1/{4,5,6,7,9,10}` survived after their PRs merged. This is the recurring pattern from L-001 — worktrees are not garbage-collected automatically and must be flagged explicitly at iteration close.
- **Per-task Archivist provenance blocks absent on most task PRs.** The per-task Archivist did not run on the majority of merges in this iteration, leaving the forge without task-level provenance signals. This creates a gap for the archival coherence gates added by PR #159. The iteration is functionally complete and forensically auditable from PR bodies — the per-task provenance block is the missing formality.

### Carry-forward lessons (add to lessons.md calibration section if not already there)

- **Issue auto-close only fires from the PR's own branch.** When a task's second half lands on a different iteration's branch, the original issue must be closed manually. Add manual-close as an explicit step in brief wrap-up when a task spans two branches.
- **Worktrees must be flagged for removal at iteration close.** Add "flag surviving worktrees for git worktree remove" to the Iteration Archivist's DANGLING section — and at the next iteration's Developer entry gate, confirm the list is empty.
- **CI-green is not feature-green.** The Verification Phase (D-049) now makes this contractual. Any brief touching a runtime surface requires a `[principal]` item in the test plan that the agent structurally cannot tick.

### Decisions made this iteration (Type 1, ratified)

- **D-043** — Session-2 AEG model additions: label vocabulary, iteration lifecycle + concurrency, conversational protocol (June 12, planning session for this iteration). Status: ACTIVE.
- **D-048** — Append-only per-iteration token/cost ledger added to the AEG model (task 9 model half, June 15). Status: ACTIVE.
- **D-049** — AEG model: Verification phase + runtime Test Plan as a brief field and merge gate (task 10, June 16). Status: ACTIVE.

### Unbuilt tasks

None. All 10 tasks completed and merged.

---

## herald-agents-v2 — retrospective (June 2026)

**Duration:** June 18, 2026 → June 29, 2026 (PR #148 merged → PR #235 merged — 12 days)
**Tasks completed:** 7 of 8 planned (T1–T5, T7, T8 via PRs #148, #150, #156, #191, #193, #213, #235; T6 Principal-authorized close — rate limit already-implemented, no PR required)
**Tasks dropped/deferred:** none — T6 was verified already-satisfied during T7's deploy verification

### What went well

- **D-046 first execution was clean.** Extracting the `forensic-hiring-auditor` intelligence into `packages/agents/forensic-hiring-auditor/` (T2, PR #150) established the `packages/agents/<name>/` pattern (D-051) without any Herald regression — the engine migration went exactly as the planner predicted, with Herald becoming a thin consumer.
- **MCP exposure (T3) built directly on the T2 foundation.** `herald__audit` at `herald.attalabs.dev/api/mcp` landed with no rework because T2's package boundary was clean. The depends-on serialization (T3 depends-on T2) worked as intended.
- **PR #235 (T7) was scope-honest.** The brief author correctly scoped deploy verification as code-path analysis, flagged the authentication gap (browser-only flows cannot be verified by an agent), and surfaced #234 as a separate finding rather than marking verification complete. This is the right pattern for deploy-verification tasks.
- **T8 (owner routes) was a clear planning success.** The re-scope from the original D-036 nav plan to the D-061 `[username]/(owner)/` layout was caught at planning time and cleanly executed in one PR (#213), with zero Vāda regressions from the shared `packages/ui/topbar` changes.

### What stalled or caused rework

- **T6 (#172) and T7 (#173) sat merged-but-Todo for days after their work was done.** Per-task Archivist close-outs were never dispatched at task completion — the Issues stayed open, the forge showed incorrect active state, and the iteration close required retroactive manual closure. This is the exact drift class that aeg-coherence-v1 T2 (#217) enforcement is designed to prevent. Flag explicitly for the aeg iteration: the pattern here (merged → no close-out dispatched → Issues lingering open) is the target condition for D-056 + coherence enforcement.
- **Production `ANTHROPIC_API_KEY` expired during T7 verification.** The fallback response (grade B+, "audit timed out before full analysis") was returned on every non-BYOK call, confirming the key is expired or revoked. This was not caught by the deploy-verification static analysis and became #234 — an open bug at iteration close. Lesson: deploy-verification briefs should include a live API key health check (not just code-path correctness) as a required principal test-plan item.
- **T6 had no PR because rate limiting was already implemented.** This is a clean outcome operationally, but the no-PR case required a Principal-authorized manual close — which requires a human decision gate at an unexpected time. Lesson: when a task is dispatched and the Developer discovers the feature is already implemented, the brief should explicitly name the "already-implemented verification + Principal-authorized close" as a recognized completion path, so it doesn't create ambiguity at close-out time.

### Carry-forward lessons (add to lessons.md calibration section if not already there)

- **Per-task Archivist close-out must happen within 24h of PR merge.** Waiting creates forge drift — open Issues for merged PRs, misleading active-state signals, and deferred coherence audits. The aeg-coherence-v1 enforcement (T2, #217) should make this mechanical.
- **Deploy-verification briefs need a live API key health check.** Static code-path verification is necessary but insufficient — a production environment with an expired key behaves identically to a misconfigured one from a code-path perspective. The `[principal]` test-plan item for deploy-verification should include "confirm prod API key returns a valid response with a fresh curl."
- **"Already-implemented" is a valid task completion — document it clearly.** When a Developer dispatched for a task discovers the feature is already implemented, the brief should recognize this as a first-class completion path: verify the implementation, note it in the PR, flag for Principal-authorized close. Do not open a trivial PR; do not silently skip the Issue closure.

### Decisions made this iteration (Type 1, ratified)

- **D-051** (Type 2, ACTIVE) — Agent implementation packages at `packages/agents/<name>/`; workspace glob extended to `packages/*/*`. First execution: `forensic-hiring-auditor` in T2. Ratified June 17, 2026.
- **D-061** (Type 1, ACTIVE) — Herald owner `/ui` + `/settings` relocated under `/[username]/(owner)/`; topbar icon buttons via `extraActions`. Ratified June 25, 2026.

### Unbuilt tasks

None — all 8 tasks either have merged PRs or a Principal-authorized close (T6).

## aeg-coherence-v1 — retrospective (June-July 2026)

**Duration:** 2026-06-25 (PR #216) → 2026-07-01 (PR #258)
**Tasks completed:** 6 of 9 planned (Va #236, 1 #216, 2 #258, 6 #256, 9 #255, Vb #257)
**Tasks dropped/deferred:** none
**Tasks moved out (D-070):** 3 (#218) → `aeg-governance-hardening` task 3; 4 (#219) → `aeg-governance-hardening` task 4; 5 (#220) → `aeg-consolidation` task 3, re-scoped; 7 (#251) → `aeg-governance-hardening` task 1; 8 (#252) → `aeg-governance-hardening` task 2. Reason: each was built on `scripts/verify-coherence.ts` / `verify-docs.ts`, which `aeg-consolidation` refactors into `@atta/aeg-core` — finishing them on the old scripts would have been throwaway work.

### What went well

- **Va (`verify-coherence.ts` oracle) dispatched ahead of T2–T5 per stated Principal priority** and shipped deterministic, zero-LLM-call coherence checking — the priority reordering worked as intended.
- **T6 (honest terminal-status derivation, #250/PR #256) directly closed the "closed-without-merge silently reads `todo`" dishonesty** the D-069 charter exists to prevent — `dropped`/`incoherent` statuses now render correctly instead of masking as innocuous.
- **T9 (agent git guardrails, #254/PR #255) turned a real incident into a structural fix.** A dispatched reviewer's uncommitted ledger-row edit on the main checkout became a harness-level `PreToolUse` merge-gate hook + main-commit block, not just a discipline reminder.
- **D-069 was escalated and ratified in-session with the Principal present** — the `severity:product` escalation path worked as designed for a Type 1, `Lock: YES` charter decision.

### What stalled or caused rework

- **CI-vs-local drift on the coherence gate kept it advisory instead of blocking.** Root-caused during `aeg-consolidation` planning (task 3, #220), not fixed within this iteration: the `coherence-gate` CI step never passes `BRANCH`/`GITHUB_HEAD_REF`, so T3's branch-scoping proxy checks every active iteration instead of just the PR's target; and `isGrandfathered(null)` silently un-grandfathers legacy items whenever the forge fetch is unavailable in CI.
- **The dirty-main incident that motivated T9 recurred in a milder form during this iteration's own close-out.** A Planner turn edited `aeg-coherence-v1.md` + `aeg-project/state.md` directly on the main checkout before the mistake was caught and relocated to a worktree. T9's hooks block *commits* and *merges* to main, not a stray *edit* before a commit is attempted — exactly the gap `specs/ecosystem-backlog.md`'s "consider making a dirty main structurally impossible" item already flags. This is now independent confirmation from a second occurrence, not a one-off.
- **A topology-annotation mistake required a follow-up PR before archival.** D-070's "Moved out →" marker was written in-place inside a still-live table row instead of removing the row from the parsed table, so the Studio kept deriving a `Todo` status for 5 already-relocated tasks — making the iteration look unclosable when it was actually forge-empty. Fixed in PR #268.
- **Two shipped tasks under-declared `Project(s)`, missing the `aeg-core` blast radius.** T2 (#217/PR #258) and T6 (#250/PR #256) both genuinely edited `packages/aeg-core/src/` (T6 changed `derive-iteration.ts` itself) but declared `Project(s): aeg` only — `aeg-core` is a distinct registered project (`aeg-root/projects.md`), not folded into `aeg`. Caught retroactively by the Principal reviewing the closed topology table, not by the Planner's own blast-radius check at plan time. Closed Issues left uncorrected (frozen forensic record).

### Carry-forward lessons (add to lessons.md calibration section if not already there)

- **A "moved" task must be removed from the source iteration's live-parsed topology table, not merely annotated in place.** `aeg-core`'s `readMarkdownTable` derives live status from whatever rows remain inside `## Tasks (topology)`; an in-place annotation on a row whose Issue is still open (just relabeled) still renders a misleading derived status. Record the move in a separate, non-table prose section instead.
- **Hooks that block commit/merge to main do not block a stray edit before a commit is attempted.** Confirmed by two independent incidents (the T9-motivating reviewer edit, and the milder recurrence during this iteration's own close-out). The `ecosystem-backlog.md` model-hardening item calling for a structurally-dirty-main-impossible mechanism remains open and is bundled into `aeg-governance-hardening` task 5 (#266).
- **A governance/topology PR (decision entries, iteration files) trips the same `Tier`/`C4`/commit-message CI gates as a code PR.** Budget for at least one extra round-trip fixing the PR-body `Tier:`/`Conforms-to: D-###` fields and the commit-message header-length limit on the first governance PR of a session — recurred across multiple PRs this session (#262, #267).
- **`aeg-core` is easy to miss in the blast-radius check because it's a package under `packages/`, not a top-level app.** The Planner's shared-package blast-radius rule works from `Project(s)` on the topology row, but the deep-dig habit of "which top-level products does this touch" doesn't naturally surface a package one level down. When sizing any task touching `packages/aeg-core/src/`, explicitly check `aeg-root/projects.md` for its registration rather than relying on instinct.

### Decisions made this iteration (Type 1, ratified)

- **D-069** (Type 1, Lock: YES, ACTIVE) — AEG enforces its own forge-lifecycle and role-seam contracts mechanically. Ratified in-session, 2026-06-30. This iteration's T6/T2/T7/T8/T9 scope derives from this charter.

*(D-070 — Planner owns cross-iteration task-movement — was made during this iteration's close-out planning, not by one of its tasks. It enabled the close rather than being produced by it; logged separately, not counted as this iteration's decision output.)*

### Unbuilt tasks

None dropped or abandoned. The 5 tasks that didn't ship under this iteration (3, 4, 5, 7, 8 — Issues #218/#219/#220/#251/#252) were moved, not abandoned — see "Tasks moved out" above. They continue under `aeg-consolidation` and `aeg-governance-hardening`.

## aeg-consolidation — retrospective (July 2026)

**Duration:** 2026-07-01 (PR #271) → 2026-07-02 (PR #315)
**Tasks completed:** 4 of 4 planned (1 #263/PR #271, 2 #264/PR #277, 3 #220/PR #305, 4 #265/PR #315)
**Tasks dropped/deferred:** none
**Tasks moved out (D-070):** none — this iteration was itself the *destination* of task 3 (#220), absorbed from `aeg-coherence-v1`'s former task 5 (D-070 movement, 2026-07-01); see `aeg-root/iterations/aeg-coherence-v1.md` for the source-side annotation.

### What went well

- **Task 1 correctly enlarged its own scope mid-flight to enforce "AEG is a black box to the host monorepo."** Principal-driven review caught that the CLI shims (`verify-docs.ts`, `verify-coherence.ts`, `verify-test-plan.ts`) still sat in the monorepo's generic `scripts/` folder; task 1 relocated all three into `packages/aeg-core/bin/` in the same PR (#271), verified byte-identical via golden-file diff before/after.
- **Task 2's intra-package extraction was mechanically proven behavior-preserving**, not just claimed: golden-run diffs (no-token and with-token paths) plus a synthetic `--closes-n` smoke test all came back byte-identical before/after the `bin/` → `src/` move (PR #277).
- **Task 3 root-caused and fixed the CI≠local drift flagged as unresolved in the `aeg-coherence-v1` retrospective** (missing `BRANCH` env var in the `coherence-gate` CI step, and `isGrandfathered(null)` silently un-grandfathering legacy items on forge-fetch failure) and re-armed the gate as genuinely blocking — confirmed via a real CI run showing a non-zero job conclusion, not a step that merely printed a warning (PR #305).
- **Task 4 built the surfaced-doc manifest as reusable exported data, not hardcoded exclusion logic**, explicitly to prevent the two-competing-definitions failure mode: both C6 (this task's own check) and `aeg-studio-cleanup`'s downstream docs-curation task (#292) consume the same `packages/aeg-core/src/docs/surfaced-manifest.ts` (PR #315, recorded as D-079).
- **The pre-flight "must be green" gate was correctly reinterpreted as baseline-diff, not zero-findings.** Task 4 hit 44 pre-existing, unrelated findings on a clean `origin/main` checkout; the Principal's ruling captured verbatim in the PR body reframed the gate as "no new findings beyond the 44-count baseline," letting the task proceed without being blocked by or obligated to fix out-of-scope debt.

### What stalled or caused rework

- **The iteration's own `Project(s)` declaration under-scoped `aeg-core` on first pass** (`aeg` → `aeg, aeg-core`, all 4 tasks) — task 1's PR body notes this explicitly as a miss "already logged once as a lesson from `aeg-coherence-v1`'s T2/T6, caught a second time here." The blast-radius-check lesson from the prior iteration did not fully prevent recurrence.
- **Task 2's Planner rationale (Issue #264) went stale before task 2 executed.** #264 described the file as living in `scripts/`, but task 1 (PR #271, merged first) had already relocated it into `packages/aeg-core/bin/` — task 2's Developer had to reconcile the Issue's stated premise against the actual on-disk state rather than the rationale matching current reality.

### Carry-forward lessons (add to lessons.md calibration section if not already there)

- **A pre-flight "must run green" gate means no new findings beyond a captured baseline, not zero findings.** When a clean checkout already carries unrelated pre-existing debt, the correct move is to capture the baseline count, require the diff to not grow, and record the disposition verbatim in the PR body — not to block the task on fixing out-of-scope files, and not to silently ignore the baseline either.
- **A same-iteration prior task can make a later task's Issue rationale stale before the later task executes.** When task N's rationale describes a file's location or state, and task N-1 (merged first, same iteration) already changed that location or state, the Developer must reconcile against current reality rather than the Issue's original premise — this is a normal consequence of writing rationale at plan time for tasks that execute sequentially, not a planning defect.

### Decisions made this iteration

- **D-079** (Type 2, Lock: YES, ACTIVE) — surfaced-doc manifest: canonical taxonomy for what AEG surfaces as documentation. Authored by the Developer on task 4 (#265), ratified via task dispatch (no Principal ratification-window entry required — Type 2).
- No Type 1 decisions were produced by this iteration's own tasks. (D-070 and D-072, both referenced in this iteration's PRs, were made during `aeg-coherence-v1`'s close-out and a separate `aeg-governance-hardening` review respectively — logged there, not here.)

### Unbuilt tasks

None. All 4 planned tasks merged.

## aeg-studio-cleanup — retrospective (July 2026)

**Duration:** 2026-07-02 (PR #304) → 2026-07-03 (PR #346)
**Tasks completed:** 5 of 5 planned (1 #287/PR #313, 2 #290/PR #304, 3 #291/PR #314, 4 #292/PR #322, 5 #331/PR #346)
**Tasks dropped/deferred:** none
**Tasks moved out (D-070):** none

### What went well

- **Task 4 consumed the `aeg-consolidation`-shipped surfaced-doc manifest (D-079) exactly as designed, with zero second exclusion rule.** `load-aeg-docs.ts` was wired to `isSurfacedDoc` from `@atta/aeg-core/docs`; the completeness sweep confirmed all 28 surfaced docs render in the nav (`Surfaced N = Nav N = 28`) and the hardcoded `Iterations` section was removed outright rather than special-cased — the single-source-of-truth intent behind D-079 held up under its first real downstream consumer.
- **Task 3 correctly absorbed a Principal course-correction between dispatches.** An earlier attempt had proposed a new `--info` semantic token; the Principal rejected it (existing tokens only) and the task was re-dispatched against that constraint. The replacement brief shipped a token-doctrine-compliant fix (opacity/weight steps within `primary`) with the supersession explicitly documented in the PR body, rather than quietly re-trying the rejected approach.
- **Task 2's dependency cleanup was conservative and correctly scoped.** Removing the board/graph views left `@xyflow/react` and `@dagrejs/dagre` as unused `package.json` entries; rather than pruning them unprompted, the task flagged them for a follow-up since `package.json` wasn't named in the brief's surface map — task 5 (a later, separate dispatch) then removed the one remaining dead surface (the topbar link), keeping each task's diff traceable to its own brief.
- **Task 1 verified its own content against live sources before publishing rather than trusting the brief's summary.** The brief's §10 stop condition required re-checking the role table against current `aeg-root/roles/*.md` and contracts; the Developer did this and found no drift, but the discipline of checking rather than assuming is the kind of habit that prevents a synthesized doc from going stale at the moment it's created.

### What stalled or caused rework

- **Task 5 (#331) hit the exact first-push doc-coverage gap its own iteration's task 3 had worked around days earlier.** `.husky/pre-push`'s C5 check reads the PR body via `gh pr view`, which returns nothing before a PR exists — so a `Doc-waiver:` line in the intended PR body is invisible on the first push, and the documented `OVERRIDE_DOCS=1` escape hatch didn't reach `verify-docs.ts`'s push-mode path either (a separate, only-partially-fixed gap). Task 3 worked around this with a one-time Principal-authorized `--no-verify` push; task 5 hit it again, and this time it was root-caused and closed for good by D-080 (PR #345, merged separately): the pre-push hook now falls back to reading `Doc-ack:`/`Doc-waiver:` trailers from the branch's own commit messages when no PR yet exists. Task 5 explicitly confirmed the D-080 fix unblocked it before completing.
- **A structural workaround (`--no-verify`) shipped once before the root cause (D-080) was fixed**, meaning the same friction was paid twice — once as a manual escalation absorbing disproportionate Principal time (task 3, 2026-07-02) and again as a routine, self-served block (task 5, 2026-07-03) before the fix landed. The gap between "hit once" and "fixed for the class of problem" spanned roughly a day and two separate task dispatches within the same iteration.
- **Task 2's environment setup gap (missing `packages/ui/generated/` in a fresh worktree) recurred on task 4's dispatch**, both requiring an ad hoc `bunx turbo run generate` before the Studio dev server would boot cleanly — a real gap in the AEG-wide worktree-bootstrap Step 0 (which runs `bun install` but not the `generate` turbo task), flagged by both tasks independently rather than fixed once at the bootstrap level.

### Carry-forward lessons (add to lessons.md calibration section if not already there)

- **A pre-push doc-coverage gate that reads the PR body cannot see that body before a PR exists.** Any C5-style gate keyed off `gh pr view` on a branch's first push will structurally fail even when the correct waiver is already written into the intended PR body. The fix (D-080) is a commit-trailer fallback (`Doc-ack:`/`Doc-waiver:` read from the branch's own commits) — any future forge-derived pre-push check needs the same escape valve, not just a documented override flag that only reaches one of its two run modes.
- **A worktree Step 0 that runs `bun install` but not the per-app `generate` turbo task will 500 on first dev-server boot for any app depending on `packages/ui/generated/`.** Confirmed independently by two tasks in this iteration (task 2, task 4) against AEG Studio specifically. Worth fixing once in the shared worktree-bootstrap instructions rather than leaving each task to rediscover and route around it.

### Decisions made this iteration (Type 1, ratified)

- None produced by this iteration's own tasks (all Tier 0/1; no Tier 3 work). D-079 and D-080, both referenced in this iteration's PR bodies as context, were made elsewhere: D-079 by `aeg-consolidation` task 4 (#265, PR #315); D-080 by a separate direct fix (PR #345) triggered by, but not itself one of, this iteration's tasks.

### Unbuilt tasks

None. All 5 planned tasks merged.
