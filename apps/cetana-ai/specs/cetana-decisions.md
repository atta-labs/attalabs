# Cetana — Decision Log

Architectural decisions for Cetana V0. Each decision records context, what was decided, alternatives considered, and consequences. Format matches `apps/vada-ai/specs/vada-decisions.md`.

---

## D-001 — Strategist is Claude Desktop, not web Claude.ai

**Date:** 2026-05-09
**Status:** Locked

**Context:** Need to choose the Strategist surface — the interface through which the Principal dispatches tasks and manages running agents.

**Decision:** Claude Desktop only for V0. Local stdio MCP transport.

**Alternatives considered:**
- Web Claude.ai with HTTP MCP server: rejected. Web Claude.ai cannot reach localhost MCP servers per Anthropic's architecture — only Desktop supports local stdio. Caught by Reviewer D in Phase 0 Round 3. Would have been a fatal build assumption.
- Tunneled HTTP MCP from a local server: rejected as V2 hardening. Not worth the auth/tunnel complexity for solo internal use.

**Consequences:** No mobile dispatch in V0. No remote dispatch from a non-Desktop client. Acceptable for internal tooling. V2 can add tunnel-based remote dispatch if needed.

---

## D-002 — Single coordinator package with two MCP server entry points

**Date:** 2026-05-09
**Status:** Locked

**Context:** Strategist needs tools like `cetana.dispatch_task`; Executor needs `cetana_request_input`. These are different tool surfaces. How to organize them?

**Decision:** One coordinator package (`apps/cetana-ai/coordinator/`) with two entry points: `mcp-server-strategist.ts` (long-running, Claude Desktop connects) and `mcp-server-executor.ts` (per-task, spawned by `claude -p`). Both share `state.ts`, `events.ts`, `config.ts`, `paths.ts`, `tools/`.

**Alternatives considered:**
- Two separate packages (e.g., `apps/cetana-ai/strategist/` + `apps/cetana-ai/executor/`): rejected. Over-engineering. Sharing core modules across packages adds workspace plumbing with no benefit.
- One server with session-multiplexed routing: rejected. Adds complexity without solving the problem better.

**Consequences:** Slightly non-obvious that two binaries live in one package, but the directory structure is self-documenting. The entry points are the only things that differ; everything else is shared.

---

## D-003 — GitHub Issues + Labels + Milestones (not Projects V2)

**Date:** 2026-05-09
**Status:** Locked

**Context:** Need a roadmap/task backing system. Options: GitHub Issues, GitHub Projects V2, Linear, plain text files.

**Decision:** GitHub Issues + Labels + Milestones. No Projects V2.

**Alternatives considered:**
- GitHub Projects V2: rejected. GraphQL-only API adds friction for solo workflow. REST is simpler.
- Linear: rejected. External dependency, additional auth surface.
- Plain text files: rejected. No structured query API, no native comment threading.

**Consequences:** Task state lives in Issues. Cetana posts comments on dispatch and completion. Issue number IS the task identifier for worktree naming (`issue-{N}` → `feat/issue-{N}`). No kanban-style board in V0 — just issue status tracking.

---

## D-004 — JSONL append-only logs (not SQLite)

**Date:** 2026-05-09
**Status:** Locked

**Context:** Need runtime state persistence for active tasks. Options: JSONL, SQLite, Postgres, plain JSON.

**Decision:** JSONL append-only logs at `~/.cetana/tasks/{task-id}.jsonl`. One file per task. Events are appended, never edited.

**Alternatives considered:**
- SQLite: rejected. Schema is not stable in V0. JSONL defers schema decisions while remaining human-readable and append-safe.
- Postgres (via `@atta/db`): rejected. Overkill for local tooling. Requires DB connection config.
- Plain JSON (one object per task): rejected. Write-in-place means concurrent write risk and no audit history.

**Consequences:** Coordinator hydrates state from JSONL on startup by replaying events. Append-only means the log is also a complete audit trail — every state transition is recorded. `tail -f ~/.cetana/tasks/{id}.jsonl` is the real-time monitoring interface in V0. SQLite is V1+ if JSONL proves insufficient.

---

## D-005 — Git worktrees per task (not branches-in-main)

**Date:** 2026-05-09
**Status:** Locked

**Context:** Executor agents need isolated working environments. Multiple parallel executors cannot share the main working tree.

**Decision:** One `git worktree` per dispatched task at `~/code/atta/.worktrees/issue-{N}/`, on branch `feat/issue-{N}`.

**Alternatives considered:**
- Branches-in-main (switch branch before spawn): rejected. Main working tree is shared; Claude Code in another terminal would be corrupted by the branch switch.
- Docker containers per task: rejected. Way too heavy for V0.
- Named tmux sessions: rejected. Not actual filesystem isolation.

**Consequences:** Worktrees are created on dispatch and must be cleaned up manually in V0. Auto-cleanup is V1. Multiple executors can run in parallel — each has its own worktree, its own branch, its own uncommitted state. The issue number provides a stable namespace for the worktree path.

---

## D-006 — No UI in V0; Tauri shell deferred to V1

**Date:** 2026-05-09
**Status:** Locked

**Context:** Cetana is a coordination tool. A dashboard showing running tasks, agent output, and pending questions would be useful. Is it in V0?

**Decision:** No UI in V0. CLI + `tail -f` on JSONL is the V0 interface. Tauri shell + dashboard + native notifications deferred to V1 if and only if V0 proves daily-driver value over 2 weeks of real use.

**Alternatives considered:**
- Tauri + web dashboard in V0: rejected. Building the UI before validating V0's core value proposition is premature. If V0 doesn't prove useful, no UI investment.
- CLI subcommands (e.g., `cetana list`, `cetana reply`): not in scope for V0. Could be added without UI if needed.

**Consequences:** V0 interaction is: Claude Desktop chat → MCP tools. Monitoring is `tail -f ~/.cetana/tasks/{id}.jsonl`. This is deliberate friction that validates whether the core loop is worth the V1 build investment.

---

## D-007 — Cetana lives inside the Atta monorepo

**Date:** 2026-05-09
**Status:** Locked

**Context:** Where does Cetana V0 code live? Options: Atta monorepo, separate repo.

**Decision:** Inside the Atta monorepo at `apps/cetana-ai/coordinator/`.

**Alternatives considered:**
- Separate repo: rejected. No benefit for internal tooling. Loses access to `@atta/typescript-config` and monorepo conventions. Adds separate clone/CI surface.

**Consequences:** Cetana reuses `@atta/typescript-config`. Biome + Husky hooks apply. Commits follow the same git conventions. `bun install` from root installs all dependencies. Future: if Cetana becomes a public product, it could be extracted to its own repo then. For now, monorepo is simpler.

---

## D-008 — Filesystem-based IPC between strategist and executor servers

**Date:** 2026-05-09
**Status:** Locked

**Context:** The strategist MCP server and executor MCP server are separate processes. When the executor is blocked (waiting for Principal reply), how do the two servers communicate?

**Decision:** Filesystem-based IPC via `~/.cetana/tasks/{taskId}/question.json` (written by executor) and `~/.cetana/tasks/{taskId}/reply.json` (written by strategist). Executor polls for `reply.json` every 1 second.

**Alternatives considered:**
- Unix socket: adds socket lifecycle management (create, bind, cleanup). Not worth it for V0.
- HTTP server on a known port: requires port management, more moving parts.
- Redis pub/sub: external dependency, overkill.
- Shared SQLite: locks under concurrent writes are unreliable for this pattern.

**Consequences:** No network dependency for IPC. Survives process restarts (files persist on disk). Human-inspectable (`cat ~/.cetana/tasks/{id}/question.json`). The executor polls every 1 second with a 30-minute timeout — low overhead for a blocking wait pattern. Proven in Slice -1 (same pattern, `~/.cetana-prototype/` directory).

---

## D-009 — Slice -1 throwaway prototype before Coordinator code

**Date:** 2026-05-09
**Status:** Locked

**Context:** Cetana's entire value proposition depends on one technical mechanism: Claude Code calling a custom MCP tool that blocks until an external process writes a reply. Before building V0, was this mechanism validated?

**Decision:** Yes — mandatory. Slice -1 built at `~/code/cetana-prototype/` (outside monorepo, ~100 lines). Must pass 13/13 criteria including a 7-minute cognitive continuity test before any V0 code is written.

**Consequences:** 2 hours of prototype work eliminated the risk of building V0 on top of an unvalidated assumption. Prototype passed 13/13. Throwaway deleted after V0 ships. The lesson: validate the existential dependency first.

---

## D-010 — Manual worktree cleanup in V0; auto-cleanup is V1

**Date:** 2026-05-09
**Status:** Locked

**Context:** After a task completes and its PR is merged, should the worktree be automatically removed?

**Decision:** Manual cleanup only in V0. `removeWorktree()` exists in `worktree.ts` but is not called automatically. Principal runs `git worktree remove` manually.

**Alternatives considered:**
- Auto-remove on task completion: rejected. Principal may want to inspect the worktree after completion, especially for debugging. Automatic removal during the PR review period would be destructive.
- Auto-remove on PR merge (via GitHub webhook): over-engineering for V0.

**Consequences:** Worktrees accumulate. Principal must periodically clean up merged worktrees (`git worktree list`, `git worktree remove`, `git worktree prune`). This is acceptable friction for internal tooling.

---

## D-011 — Four MCP tools only; no cancel/retry/lifecycle in V0

**Date:** 2026-05-09
**Status:** Locked

**Context:** What tools does V0 expose?

**Decision:** Exactly four: `cetana.dispatch_task`, `cetana.list_active_tasks`, `cetana.reply_to_blocked_task`, `cetana_request_input`. No `cancel_task`, `get_task_lifecycle`, `retry_task`, `pause_task`.

**Consequences:** If an executor goes wrong, Principal kills it via `kill {pid}` (visible in `list_active_tasks` output) and cleans up the JSONL and worktree manually. This is acceptable for V0. The V0 goal is proving the dispatch-block-reply loop works in practice, not covering every edge case.

---

## D-012 — PM docs migrated from Claude.ai project knowledge to repo

**Date:** 2026-05-09
**Status:** Locked

**Context:** `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md` lived in Claude.ai project knowledge. Manual upload required for every update. Cetana V0 needs to read/write these files programmatically.

**Decision:** Migrated to `project-management/` in the Atta monorepo (PR #22, May 9, 2026). All PM docs are now repo files with git history.

**Consequences:** Any Claude session can read/write them via GitHub MCP. No more manual upload loop. File edits are commits. Cetana V0 can read them as regular files in the worktree.

---

## D-013 — Throwaway prototype deleted as final step of V0

**Date:** 2026-05-09
**Status:** Locked

**Context:** The Slice -1 prototype at `~/code/cetana-prototype/` served its purpose (validating the blocking MCP tool mechanism). Should it persist?

**Decision:** No. Deleted as the final step of the V0 build — after V0 is verified working and the PR is merged. The IPC directory (`~/.cetana-prototype/`) is also deleted.

**Consequences:** The prototype's lessons are preserved in `cetana-experiment-log.md`. The code itself is not preserved — it was throwaway by design and V0 supersedes it. Keeping it would create confusion about which implementation is canonical.

---

## D-014 — Tool factories (not singletons) for shared state injection

**Date:** 2026-05-10
**Status:** Locked

**Context:** MCP tool handlers need access to the shared `StateManager` and `CetanaConfig`. How should this be threaded through?

**Decision:** Each tool file exports a factory function (`createDispatchTask({ state, config })`) rather than a plain `{ name, description, handler }` object. The server entry points call the factories with the shared instances.

**Alternatives considered:**
- Module-level singleton (import the state manager as a module): adds implicit coupling, makes testing harder.
- Passing state as a parameter to each handler call: the MCP SDK doesn't support this pattern.

**Consequences:** Clean dependency injection. Test suites can create fresh `StateManager` instances per test. Server entry points are explicit about what shared state they provide.

---

## D-015 — Low-level MCP `Server` class (not `McpServer`)

**Date:** 2026-05-10
**Status:** Locked

**Context:** The MCP SDK provides both `McpServer` (high-level, Zod-integrated) and `Server` (low-level, plain JSON Schema). Which to use?

**Decision:** Low-level `Server` from `@modelcontextprotocol/sdk/server/index.js` with `ListToolsRequestSchema` + `CallToolRequestSchema` handlers. Input validation done manually via `.parse()` on Zod schemas before calling handlers.

**Alternatives considered:**
- `McpServer.tool(name, description, zodShape, handler)`: triggers TypeScript error `TS2589: Type instantiation is excessively deep` due to complex Zod generic inference. Same issue observed in the Vāda MCP server.

**Consequences:** More boilerplate in the server entry points (explicit schema registration). Behavior is identical — Zod validates inputs inside the handler. The pattern is consistent with how the Vāda MCP server is implemented.

---

## D-016 — `cetana_request_input` accepts a `severity` field

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** NO

**Context:** In v3 operational model, escalations have three distinct tiers: `execution` (TL Brief Author mode), `strategy` (TL Strategist mode), `product` (Principal, ratification window). Without a severity signal, the Team Leader must infer routing from the question text — unreliable, especially when the question is ambiguous.

**Decision:** The `cetana_request_input` input schema includes a required `severity` field: `'execution' | 'strategy' | 'product'`. The executor records severity in `question.json`. `list_active_tasks` surfaces severity alongside the question text.

**Alternatives considered:**
- Inferring severity from question keywords: fragile and non-deterministic.
- Separate tools per severity (`cetana_request_execution_input`, etc.): clutters the executor's tool registry and adds cognitive load for the Developer.

**Consequences:** The Developer must explicitly classify escalations at call time, which forces clarity. The schema change is backwards-incompatible with V0 usage (currently no severity field). Code implementation is a follow-up task — the field is specced but not yet wired in `src/tools/request-input.ts`. The severity is declared in the spec so that `cetana_request_input` callers know the contract before the code ships.

---

## D-017 — Brief validation gate via Archivist GitHub Action (V0.7 stub)

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Lock:** NO

**Context:** Briefs dispatched to Developers should be validated for tier field, lock acknowledgments, and Type 1 declarations before execution begins. Without a validation gate, structural brief errors reach the Developer during execution — wasting a commit cycle.

**Decision:** Implement a brief validation GitHub Action (`archivist.yml`, job `brief-validation`) triggered on PR open. In V0.7, the job is a stub that exits 0. In V1, it checks: tier field present, lock acknowledgments for locked decisions, `principal_delegate:` for Tier 3 work. Spec is in `cetana-spec.md` Section 6.

**Alternatives considered:**
- Validate at dispatch time (`cetana.dispatch_task`): catches errors before the worktree is created but requires brief parsing logic in the coordinator — a different concern from CI.
- No validation gate: acceptable for V0 since all briefs are TL-authored and Principal-approved, but becomes a risk as brief complexity grows.

**Consequences:** Developers get a pre-flight check on brief structure. The stub means no immediate value, but the scaffolding is in place for real implementation. Real implementation is a follow-up task.

---

## D-018 — Spec filename is `cetana-spec.md`, not `cetana-v0-spec.md`

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 1
**Lock:** YES

**Context:** The spec was originally named `cetana-v0-spec.md`. This creates a naming pattern conflict with `aeg-project/decisions.md` D-013 (global), which locks all spec filenames to `{product}-spec.md` with no version suffixes.

**Decision:** Rename `apps/cetana-ai/specs/cetana-v0-spec.md` → `apps/cetana-ai/specs/cetana-spec.md` via `git mv`. Version and lock state are tracked inside the file via the `Status:` header. The filename is stable across V0 → V1 → V2 iterations.

**Alternatives considered:**
- Keep `cetana-v0-spec.md` and add a `cetana-spec.md` alias: creates two canonical files, ambiguity about which is authoritative.

**Consequences:** Any existing links to `cetana-v0-spec.md` (e.g., in README, skill files) must be updated to `cetana-spec.md`. This PR handles all in-repo references. Conforms to global D-013.

---

## D-019 — Cetana remains orchestration-focused; Archivist is a separate GitHub Action

**Date:** 2026-05-10
**Status:** ACTIVE
**Type:** 2
**Lock:** NO

**Context:** The v3 operational model adds an Archivist role (post-merge documentation sync, drift detection). Could Cetana host the Archivist logic (as a new MCP tool or a new coordinator component)?

**Decision:** No. Cetana is the dispatch + escalation layer. Archivist is a GitHub Action — a separate CI concern triggered by PR events, not by MCP tool calls. The two are distinct: Cetana operates at task-execution time; Archivist operates at PR merge time. Mixing them would violate the separation of concerns established in v3.

**Alternatives considered:**
- Cetana as Archivist host: single runtime, fewer moving parts. Rejected because Cetana requires Claude Desktop to be running — GitHub Actions run independently of any local process.
- Archivist as a separate long-running service: over-engineered for V0.7, which is a stub anyway.

**Consequences:** The Archivist and Cetana codebases stay separate. `.github/workflows/archivist.yml` is the Archivist entry point. Future Archivist logic does not go into `apps/cetana-ai/coordinator/`. Conforms to the v3 role separation in `aeg-root/state-machine.md`.

---

## D-020 — CLI is the canonical interface; any future UI is a renderer over CLI verbs

**Date:** 2026-05-11
**Status:** ACTIVE
**Type:** 1
**Lock:** YES

**Context:** V0.5 adds a CLI surface to Cetana. A natural follow-on question is whether the CLI exists alongside a future UI, or whether the CLI is the foundation that any future UI builds on top of. This determines whether future UI work can bypass the CLI layer or must route through it.

**Decision:** The CLI is the canonical interface. The five CLI verbs (`init`, `watch`, `status`, `abort`, `reply`) are the stable external contract. Any future UI — Tauri dashboard, web view, menu bar app — renders CLI output or calls the same underlying modules the CLI calls. No UI bypasses the CLI layer with its own direct module calls that the CLI doesn't also make.

**Alternatives considered:**
- CLI and UI as parallel surfaces sharing only coordinator modules: rejected. Parallel surfaces diverge. A UI that calls modules directly will inevitably call them differently, creating two code paths that must both be kept correct. Maintenance cost compounds.
- UI-first with CLI as a debug fallback: rejected. V0 already establishes that the orchestration loop works via CLI (`tail -f`). V0.5 formalizes that. Reversing the primacy to make CLI secondary would invalidate V0 learnings.

**Consequences:** Future briefs proposing a Tauri dashboard, web view, or any other UI surface must reference this decision. The UI implements `cetana watch` output rendering, not its own state polling. This keeps the CLI honest — if the CLI surface is adequate, the V1 UI investment is genuinely deferred (per D-023); if the CLI is inadequate, the gap is visible in CLI output rather than hidden behind UI polish.

---

## D-021 — Install gate: `cetana init` must work end-to-end on a fresh machine

**Date:** 2026-05-11
**Status:** ACTIVE
**Type:** 1
**Lock:** YES

**Context:** V0 requires the user to manually edit `~/.cetana/config.json` to set GitHub owner, repo, token, and model defaults. This is a friction point that makes V0 harder to share or use across machines. V0.5 Step 1 adds `cetana init` to address this. The question is what "done" means for Step 1.

**Decision:** Step 1 (CLI scaffold + `cetana init`) is not done until `cetana init` runs on a machine with no pre-existing `~/.cetana/config.json` and produces a working config file without the user editing JSON by hand. The verification is: delete `~/.cetana/config.json`, run `cetana init`, answer prompts, dispatch a real task. If the task dispatches correctly, Step 1 is done. If any step requires manual JSON editing, Step 1 is not done.

**Alternatives considered:**
- Declare Step 1 done when `cetana init` compiles and runs: rejected. "Compiles and runs" is not verification. The install gate is the correct bar for Step 1 because `cetana init` exists to solve the fresh-machine problem — if it doesn't solve that problem, it hasn't shipped.
- Skip `cetana init` and document the JSON format: rejected. Documentation-as-workaround is exactly the friction V0.5 is removing. Keeping manual JSON editing as the path adds training cost and error surface.

**Consequences:** Developers implementing Step 1 must test against a wiped `~/.cetana/` directory before marking the PR ready. This is the only way to confirm the install gate passes. Any PR that ships `cetana init` with untested fresh-machine behavior is not merged.

---

## D-022 — CLI is a thin client over the same coordinator modules; no parallel code paths

**Date:** 2026-05-11
**Status:** ACTIVE
**Type:** 2
**Lock:** NO

**Context:** With a CLI entry point added alongside the two MCP server entry points, there is a risk of duplicating state management, IPC logic, or JSONL handling in the CLI layer. Each duplication creates a divergence point.

**Decision:** The CLI is a thin client. All CLI commands call the same exported functions from `paths.ts`, `config.ts`, `events.ts`, `state.ts`, `worktree.ts`, and the tool handlers. No business logic lives in `cli.ts`. `cli.ts` handles argument parsing, user prompts (for `cetana init`), and output formatting — nothing else.

If a CLI command needs behavior that doesn't exist as a coordinator module export, the correct action is to add the export to the coordinator module — not to implement the logic inline in `cli.ts`.

**Alternatives considered:**
- CLI with its own state reconstruction (reads JSONL directly instead of using StateManager): rejected. StateManager is the authoritative hydration path. A second reader would diverge silently as new event types are added.
- CLI as a separate package: rejected. No benefit for internal tooling. Reuses same package; only the entry point differs.

**Consequences:** Adding a CLI command means reading the coordinator module API and adding the call. It does not mean writing new business logic. If a developer finds themselves writing state logic in `cli.ts`, they are violating this decision and should refactor the logic into the appropriate coordinator module instead.

---

## D-023 — V1 UI requires documented evidence from V0.5 dogfood; three objective conditions

**Date:** 2026-05-11
**Status:** ACTIVE
**Type:** 1
**Lock:** YES

**Context:** D-006 deferred the Tauri dashboard to V1 contingent on V0 proving daily-driver value over 2 weeks. V0.5 adds a CLI surface. After V0.5, the question of whether to build V1 recurs. "2 weeks of use" is not an objective gate — it doesn't specify volume, concurrency, or what evidence is required. This decision formalizes the gate.

**Decision:** The V1 UI is authorized if and only if all three conditions are met during real Cetana use (V0 + V0.5 combined):

1. **≥20 tasks** dispatched through Cetana
2. **≥3 tasks running concurrently** at some point
3. **Documented "wish this were visual" moments** — written up as specific situations (not vague preferences) where the CLI surface was actively insufficient. Each moment must describe: what was being done, why the CLI output was inadequate, and what a UI would have made easier

All three must be documented in the ratification queue before V1 is authorized. Starting from the date F9 (Step 5 — `cetana reply`) merges to main, a 4-week dogfood window begins. If after 4 weeks fewer than 20 tasks have been dispatched, the gate is not met and V1 is deferred. Revisit after another 4 weeks or when the task count is met.

**Alternatives considered:**
- "2 weeks + 5 tasks" from D-006: rejected as underspecified. Five tasks is too low a threshold to observe concurrent management behavior. "2 weeks" with no task count allows the gate to pass trivially.
- No gate; build V1 immediately: rejected. Building a Tauri dashboard before knowing whether the orchestration loop is daily-driver-useful is exactly the investment risk D-006 identified. V0.5 reduces some friction; it doesn't change the underlying question.
- Gate on "Principal decides": rejected as subjective. The three conditions are designed to be checkable without a judgment call. "Documented moments" is the closest to subjective, and "specific situations with concrete examples" is the bar, not "I think a dashboard would be nice."

**Consequences:** Before any V1 UI brief is written, the ratification queue must contain evidence that all three conditions are met. The TL is responsible for maintaining the count (tasks dispatched, whether ≥3 were concurrent) and for documenting friction moments as they occur during real work. Waiting until V1 is proposed to reconstruct the evidence retroactively is not acceptable — the moments must be written at the time they occur.

---

## D-025 — Install gate path coverage requirement

**Date:** 2026-05-12
**Status:** ACTIVE
**Type:** 2 (governance refinement — extends D-021)
**Supersedes:** —
**Lock:** YES — install-gate PRs cannot bypass path coverage
**Ratifies:** —
**Authored by:** Team Leader (chat session, May 12, 2026)
**Ratified by:** Principal (chat session, May 12, 2026)
**Context:** PR #39 (F5) shipped claiming the D-021 install gate passed. Within 24 hours, two distinct install-gate failures surfaced during Principal validation:
1. PR #42: documented install command (`bun --cwd apps/cetana-ai/cli link`) did not work — the agent verified a different command than what got documented.
2. PR #43: `cetana init` abort path (user declines overwrite) hung the process — the agent only tested the happy path.

Both failures were Principal-runnable, proving the install gate as written in D-021 ("agent verifies install works") was insufficient.
**Decision:** Install-gate PRs MUST cover every code path a user can hit, not just the happy path. Specifically:
1. Brief authors must enumerate distinct user paths (fresh install / existing config accept / existing config decline / network error / permission error / etc.) in the brief's verification section.
2. Agent verification output must include EXACT terminal output (copy-pasted, not paraphrased) for each enumerated path.
3. PR descriptions claiming "install gate verified" without per-path terminal output are insufficient — TL spec review must reject them.
4. Principal must physically run the documented commands before approval for any install-gate-touching PR.
**Alternatives rejected:**
- "Trust agent verification by default" (rejected: two failures in 24 hours proved this fails).
- "Require integration tests for every path" (rejected: not all paths are mockable; adds friction without signal).
- "Add a `cetana doctor` diagnostic command" (deferred: useful but doesn't replace verification discipline).
**Consequences:**
- F6-F9 briefs that touch install behavior or CLI invocation paths must follow D-025 verification protocol.
- Spec reviews must check for per-path terminal output as a hard gate.
- Briefs without enumerated path coverage in their verification section are malformed.
- Calibration lessons in `lessons.md` reinforce this for all future agents.

---

## D-026 — `cetana watch` shape: single-task-by-id, watch-all-active deferred

**Date:** 2026-06-03
**Status:** ACTIVE
**Type:** 2 (feature scope refinement)
**Supersedes:** —
**Lock:** NO
**Ratifies:** —
**Authored by:** Team Leader (dispatch session, June 3, 2026)
**Ratified by:** Principal (PR #79 review)
**Context:** The original F6 spec described `cetana watch` as streaming "all active JSONL logs simultaneously" — equivalent to `tail -f` on every running task. During implementation it became clear that single-task-by-id is the useful primitive: operators know which task they dispatched and want to follow it. Watching all active tasks simultaneously produces interleaved output that's unreadable in a single terminal session. A multi-task fleet view is better served by `cetana status` (F7).
**Decision:** `cetana watch <task-id>` takes exactly one task ID argument. It:
1. Accepts a prefix (≥1 char) and resolves to the unique matching task via `StateManager`.
2. Prints all historical events, then exits if the task is already terminal.
3. Enters live-follow mode (500ms polling, createReadStream delta, trailing-buffer JSONL line reassembly) if the task is still running.
4. Exits naturally on `task.completed` or `task.failed`. Exits on SIGINT without error.
Watch-all-active (watching multiple tasks simultaneously) is deferred indefinitely. If a use case for it emerges, it should be a separate flag or subcommand (`cetana watch --all`), not the default behavior.
**Alternatives rejected:**
- "Watch all active by default, filter with --task flag" (rejected: interleaved output is unreadable; single-task is the 95% case).
- "Watch all active in separate panes via tmux integration" (rejected: out of scope for CLI, adds dependency).
**Consequences:**
- F7 (`cetana status`) is the fleet overview surface. `cetana watch` is the single-task drill-down.
- Brief authors for F7 should not expect `cetana watch` to serve fleet monitoring use cases.
