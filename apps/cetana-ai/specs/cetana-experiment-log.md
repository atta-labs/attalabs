# Cetana — Experiment Log

Status: draft

**Purpose:** Full journey of how Cetana came to be and what was learned. Future Claude reads this to understand WHY the architecture is what it is, without re-litigating decisions.

---

## Section 1 — Phase 0: Architecture Exploration (April–May 2026)

### The problem

By late April 2026, Vāda's reviewer prompt iteration (Track B Item 3b) required many rapid dispatch cycles: invoke a team, read 3 reviewer responses, judge whether the prompts are producing the right behavior, tweak, re-run. Each cycle involved:

1. Copy a brief from Claude.ai to a new Claude Code CLI session
2. Watch the session run (sometimes monitoring multiple windows)
3. Copy results back to Claude.ai for synthesis and judgment
4. Tweak the brief, repeat

This was costing 30–60 minutes per iteration — not because the work was hard, but because the coordination overhead was brutal. The actual agent work took 3–5 minutes. The surrounding context switches, copy-pasting, and re-establishing context took 5–10x that.

The question: is there existing tooling that handles this better, or do we need to build something?

### Tool landscape survey

Surveyed in May 2026:

- **Conductor.build** — multi-agent orchestration platform. Cloud-hosted, not local. No interactive pause/resume.
- **Vibe Kanban / Bloop** — shut down. Dead end.
- **Nimbalyst** — project management overlay. Not agentic.
- **CCPM (Claude Code Project Manager, ~8.1k GitHub stars)** — dispatches Claude Code sessions, tracks tasks. No interactive pause/resume when agent hits a decision point.
- **APM (Agent Project Manager)** — similar to CCPM. Same gap.
- **Cursor 3 Agents** — parallel Cursor agents in shared workspace. No structured pause/resume.
- **Claude Cowork + Dispatch** — Claude.ai-side session management. Cannot reach localhost MCP.
- **claude-army** — batch dispatch, no interactive escalation.

**Conclusion:** Nothing combined roadmap + dispatch + interactive pause/resume in one surface for a solo developer workflow. The interactive pause/resume layer was missing everywhere.

---

## Section 2 — Phase 0: Multi-AI Reviewer Rounds (May 2026)

Architecture was stress-tested through four rounds of multi-AI synthesis before any code was written.

### Round 1 — Initial architecture sketch

Submitted to Gemini, Grok, DeepSeek, and ChatGPT-shaped reviewers for adversarial review. Key catches:

- **Two MCP servers was over-engineering.** Original design had a separate "strategist server" and "executor server" as independent packages. Reviewers converged: same codebase, two entry points. Collapsed to one coordinator package.
- **Tauri shell in V0 was scope creep.** All reviewers flagged this. Dashboard demoted to V1. "Removed the highest-risk fake-progress surface."
- **Stream-json regex pattern matching for escalation was brittle.** Original design detected escalation by watching Claude's stdout for patterns. Reviewers: use a dedicated MCP tool that blocks — deterministic, not fragile. This became the Slice -1 mandate.

### Round 2 — Refined architecture

After incorporating Round 1 feedback:

- **Reviewer C:** "Build the bash prototype before the Bun service." This was the right call. Became the Slice -1 mandate. Eliminated the risk of building V0 around an unvalidated assumption.
- **Dashboard demoted:** confirmed. V0 = CLI + `tail -f`.
- **Single MCP server:** confirmed. Two entry points (`mcp-server-strategist.ts`, `mcp-server-executor.ts`) sharing core modules.

### Round 3 — Architecture validated against vendor docs

**Critical catch from Reviewer D:**

> "Web Claude.ai cannot reach localhost MCP servers per Anthropic's architecture. Only Claude Desktop supports local stdio MCP transport."

This was a fatal architectural assumption Claude had been carrying: that the Strategist could be a web Claude.ai session with an HTTP MCP server on localhost. That path is dead. Web Claude.ai runs in a sandboxed browser environment that cannot make localhost connections.

**Fix:** Strategist must be Claude Desktop (local stdio). Tunnel + remote dispatch deferred to V2.

**Why this matters:** If this assumption had survived into the V0 build, the entire transport layer would have been wrong. The architecture review cycle caught it at zero implementation cost. Generalizable lesson: verify transport assumptions against vendor docs before locking the spec.

### Round 4 — Final pre-build review

Two refinements added:

1. **Slice -1 must test cognitive continuity (long pause), not just IPC.** The mechanical test (does the tool block? does the reply arrive?) was necessary but not sufficient. The real question was: does the agent maintain coherent context across an arbitrary-length pause? A 7-minute pause was added to the test protocol as a hard requirement.

2. **Subjective pass criterion added:** "Did this feel better than copy-paste?" Not just a mechanical pass/fail — Principal (Dani) had to feel it in the UX.

Final scope: 4 MCP tools, no Tauri, no dashboard, JSONL not SQLite, worktrees not branches.

---

## Section 3 — Phase 1: Slice -1 Escalation Prototype (May 9, 2026)

### Setup

Built at `~/code/cetana-prototype/` (outside monorepo — throwaway). ~100 lines of code across 5 files:

- `escalation-server.ts` — the MCP server with `cetana_request_input` tool
- `.mcp.json` — MCP config pointing Claude Code at the escalation server
- `prompt.txt` — test brief asking the agent to call `cetana_request_input` before creating a file
- `run-test.sh` — orchestration script: spawn Claude Code, poll for question, wait for human reply, verify
- `test-repo/` — minimal git repo for Claude Code to work in

### The test

```
prompt.txt:
You are testing an escalation mechanism. Your task:
- Call cetana_request_input to ask "What word should I put in choice.txt?"
- Wait for the response
- Create choice.txt with exactly that word
- Verify and exit
```

### What happened

1. Claude Code loaded the MCP server via stdio
2. Listed tools — `cetana_request_input` appeared in the registry
3. Called the tool with the question
4. Tool wrote `question.txt` to `~/.cetana-prototype/` and began polling for `reply.txt`
5. `run-test.sh` surfaced the question to the Principal
6. Principal waited 7 minutes (deliberate pause to test cognitive continuity)
7. Principal wrote `echo 'pizza' > ~/.cetana-prototype/reply.txt`
8. Tool read `reply.txt`, deleted both files, returned `"pizza"` to the agent
9. Agent's first post-resume sentence: **"The principal chose pizza. Creating choice.txt now."**
10. `choice.txt` created with content `pizza`
11. Process exited 0

**Bug found and fixed mid-test:** `path.expandUser()` doesn't exist in Node.js. The agent caught this immediately and substituted `os.homedir()`. Clean recovery, no re-planning.

### Results: 13/13 pass

**Mechanical (8/8):** MCP loaded ✓, tool listed ✓, tool called ✓, blocked ✓, reply received ✓, agent resumed ✓, file created ✓, exit 0 ✓

**Cognitive continuity (5/5):** No redundant reads ✓, no re-planning ✓, no duplicated work ✓, no hallucination ✓, sequential events ✓

Wall-clock: 7m38s. Claude Code 2.1.118, Bun 1.2.14, macOS.

### Subjective verdict

"This felt better than copy-paste." — Principal

---

## Section 4 — Phase 2: V0 Build (May 9–10, 2026)

V0 built inside the Atta monorepo at `apps/cetana-ai/` via a single build session on `feat/cetana-v0`. The Slice -1 prototype's IPC pattern (filesystem-based question/reply handoff via `~/.cetana/tasks/{taskId}/`) was ported directly — same mechanism, monorepo conventions.

Architecture as locked in Phase 0 was implemented without alteration:
- One coordinator package with two MCP server entry points
- Four MCP tools (3 Strategist-side, 1 Executor-side)
- JSONL append-only logs
- Worktrees for task isolation
- GitHub Issues as task backing

The Slice -1 prototype was deleted as the final step.

See `cetana-v0-spec.md` for the locked architecture. See `cetana-decisions.md` for the full decision log.

---

## Section 5 — Phase 3: V1 Evaluation (Deferred)

**Plan:** 2 weeks of V0 daily use on real Atta tasks (starting with Vāda Reviewer prompt iteration, Track B Item 3b). Then evaluate whether Tauri shell + dashboard + native notifications + menu bar status are worth building.

**Hard guardrails:**
- Don't build V1 if V0 alone reduces friction enough
- Don't build V1 mid-Vāda-work — only between major work streams
- Time-box V1 build at 7 days; if 2 weeks in, stop and reassess
- "V0 proved daily-driver sufficient" is a valid outcome — V1 is not mandatory

---

## Section 6 — Calibration Lessons

### Validate the existential dependency before building the product

Cetana V0 was almost designed and partially specced before validating that Claude Code (headless mode) could actually call a custom MCP tool that blocks for arbitrary duration and resumes coherently. The Slice -1 prototype (~100 lines, ~2 hours) settled the question definitively.

Generalizable: if the entire product depends on one technical mechanism nobody has confirmed at runtime, prototype that mechanism in isolation before designing anything around it.

### Reviewer pressure-testing materially improved the architecture

Multi-AI synthesis (Round 3) caught the fatal transport assumption: web Claude.ai cannot reach localhost MCP servers. Without that catch, V0 would have been built on impossible plumbing. The fix was architectural, not cosmetic — had it been discovered during implementation, it would have required rebuilding the transport layer.

Generalizable: when an architecture depends on a transport assumption, verify it against vendor docs before locking the spec.

### PM docs in repo beat project knowledge

Migrating `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md` from Claude.ai project knowledge to `project-management/` in the repo eliminated the manual upload loop. Any Claude session can read/write them via GitHub MCP. Cetana V0 will read/write them programmatically. The project knowledge layer added operational overhead with no compensating benefit.

### The V0 → V0.7 → V1 path collapsed

The original `cetana-reality-check.md` (April 2026) described a three-step path: V0 = YAML deliberation team inside Vāda, V0.7 = MCP + CLI exposing coordination state, V1 = full UI + state machine. That path was designed before the Slice -1 prototype existed.

Slice -1 changed the picture entirely. The blocking escalation primitive was validated. The transport assumption (Claude Desktop required, not web Claude.ai) was confirmed. The "cheap YAML team" step became unnecessary — V0 could directly implement the full coordinator with interactive pause/resume. The path collapsed to: V0 (full coordinator) → V1 (Tauri UI, if needed).

The `cetana-reality-check.md` is retained as historical record but is no longer the active sequencing plan.

### Filesystem-based IPC is the right call for V0

The `question.json` / `reply.json` handoff pattern was proven in Slice -1 and ported to V0 without alteration. It has no network dependency, requires no additional infrastructure, survives process restarts (both files are human-readable), and is debuggable with `ls` and `cat`. The cost is that the strategist MCP server and executor MCP server cannot exchange state via in-memory channels — they're separate processes — but JSONL logs already cover that need.

SQLite would have required schema decisions and migration tooling before the data model was stable. JSONL defers those decisions while remaining append-only and inspectable.

---

## Section 7 — Phase 4: V3 Operational Model Adoption (May 10, 2026)

### What changed

Cetana V0 shipped with two roles: Strategist (Claude Desktop) and Executor (Claude Code). The v3 operational model clarified and formalized these roles as Team Leader and Developer, added the Principal as the explicit authority above them, and introduced the Archivist as a fourth role (GitHub Action, not a runtime component).

This phase integrated Cetana into the v3 model documentation without changing the V0 code — the architecture was already correct. The changes were naming, spec updates, and new documentation artifacts.

### Key decisions logged in this phase

**D-016 — severity field on `cetana_request_input`:** The v3 model requires escalations to carry a severity: `execution` (TL handles in Brief Author mode), `strategy` (TL handles in Strategist mode), `product` (Principal handles at ratification window). The field is now in the spec. Code implementation is a follow-up task — the schema is declared so Developers know the contract before the implementation lands.

**D-017 — Brief Validation Gate (stub):** A GitHub Action (`archivist.yml`, job `brief-validation`) validates brief structure on PR open. V0.7 stub exits 0. Real implementation is deferred to V1.

**D-018 — Spec filename locked to `cetana-spec.md`:** Renamed from `cetana-v0-spec.md` to conform to the global D-013 lock. Version state is tracked inside the file via `Status:` header, not in the filename. Lock: YES.

**D-019 — Archivist is a GitHub Action, not a Cetana component:** Cetana handles dispatch + escalation at task-execution time. Archivist handles post-merge documentation sync at PR-merge time. These are different triggers, different contexts, and appropriately separate components.

### New PM artifacts created in this phase

The following files were added to the repo as part of v3 operational model adoption:

- `aeg-root/state-machine.md` — the constitution; artifact states, roles, authority matrix, decision schema, lock mechanism, tiered documentation, ratification windows
- `aeg-project/decisions.md` — global cross-product decision log, D-001 to D-016
- `aeg-root/roles/principal.md` — what the Principal owns and does not own; communication style
- `aeg-root/roles/team-leader.md` — TL modes (Strategist / Brief Author), tools, anti-patterns
- `aeg-root/roles/developer.md` — Developer execution rules, stop conditions, verification checklist, anti-patterns
- `aeg-root/reviewer-prompt.md` — template for stateless AI adversarial reviewer rounds
- `aeg-project/ratification-queue.md` — append-only queue of decisions and Tier 3 merges awaiting Principal ratification
- `aeg-root/coordination.md` — rewritten from v2 (Claude.ai project knowledge model) to v3 (git-based, role-aware session start protocol)
- `.claude/skills/brief-authoring/SKILL.md` — migrated from `project-management/brief-authoring-rules.md`; v3 model integration section added
- `scripts/verify-docs.ts` — V0.7 stub, exits 0; real implementation is follow-up
- `.github/workflows/archivist.yml` — V0.7 stub with three no-op jobs

### What this did NOT change

The V0 coordinator code (`apps/cetana-ai/coordinator/src/`) was not modified in this phase. Severity routing on `cetana_request_input` is specced but requires a code follow-up PR. The Archivist action is scaffolded but not implemented.

The blocking escalation mechanism, the five-layer stack, the filesystem-based IPC, and all Cetana architecture decisions from Phases 1–3 remain unchanged.

---

## Phase 5 — V0.5 Step 1 shipped (May 11-12, 2026)

After PR #33 locked the V0.5 CLI ladder (May 11), Step 1 (F5) shipped over three PRs:

**PR #39 — Initial F5 implementation (May 12)**
- New `@atta/cetana-cli` package at `apps/cetana-ai/cli/`
- Five commands: `init`, `dispatch`, `list`, `reply`, `logs`
- Hierarchical config (local `.cetana.json` overrides `~/.cetana/config.json`)
- Heartbeat-based CRASHED detection (`isAlive(pid)` via `process.kill(pid, 0)`)
- Coordinator `src/index.ts` public API surface added (D-022 thin-client compliance)
- 25/25 tests pass
- Install gate claimed verified by agent

**PR #42 — Install command fix (May 12)**
- Principal hit "Script not found 'link'" running documented install command
- Root cause: `bun link` is not a workspace script; `bun --cwd <path> link` does not work
- Fix: `cd apps/cetana-ai/cli && bun link`
- First install-gate calibration lesson: "install gate verification must use Principal-runnable commands"

**PR #43 — Abort path hang fix (May 12)**
- Principal declined overwrite during `cetana init` re-run; process hung
- Root cause: `process.stdin.resume()` left readline open; abort branch returned without closing the stream
- Fix: `process.stdin.destroy()` on abort branch
- Regression test: pipes "n" via subprocess, 2-second timeout race, asserts exit 0
- Second install-gate calibration lesson: "verify every code path, not just the happy path"

**End state:**
Cetana V0.5 Step 1 is Principal-verified. Five working commands. D-021 honored. D-025 added (path-coverage requirement).

Next: F6 (`cetana watch`) — human-readable JSONL renderer. Ready to dispatch.

**What this phase taught:**
1. Agent-only verification of install gates is insufficient. D-025 encodes this.
2. Bun's command surface differs from npm's — `bun link` is not a workspace script.
3. Node/Bun event-loop liveness with interactive stdin requires explicit stream cleanup.
4. Pre-commit hook failures on unrelated files cascade into PR scope creep (3 vada-ai files bundled into #39). Format hygiene is a maintenance concern.
