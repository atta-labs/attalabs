# Atta — Changelog

**Completed work log.** Append-only, most recent first.

→ [now.md](now.md) — active work
→ [roadmap.md](roadmap.md) — tracks + sequencing
→ [lessons.md](lessons.md) — calibration

---

## June 14, 2026 — Herald multi-vendor BYOK + audit model selector

### Herald
- **Task 3b (#90)** — Herald Settings → API Keys is now multi-vendor: Anthropic-only UI replaced with `@atta/ui/account` `ProviderKeysSection` (reused unchanged, Vāda safe); new Herald-local `AuditModelSection` lets the user pick which model the forensic audit runs against (filtered to vendors they have keys for, persisted via `POST /api/admin/audit-model` into two new `herald_profiles` columns). `/api/audit` reads the selection via the shared `resolveAuditCredentials` helper and auto-falls-back to the YAML default when the chosen vendor's key has been revoked — server-side guard mirrors the UI filter so a stale selection never silently breaks an audit. The `hasAnthropicKey` boolean retires across the publish gate, profile editor, and EnvoyFlow (any vendor key is sufficient now). D-033 whose-key logic unchanged. V1 scope: per-user default only; per-audit override deferred.

---

## June 14, 2026 — AEG Studio shell scaffolded

### AEG
- **PR #108** — AEG Studio shell scaffolded (`apps/aeg/web/studio`) — top bar + sidebar, stub data; no real artifact reads yet (those land in #97 / #98–#100 / #101).

---

## June 14, 2026 — Conventions enforced in CI (commit format, Biome, forbidden colors)

### Process / tooling
- **D-046 (this PR)** — Three conventions promoted from local-hook-only to CI-enforced: commit-message format, Biome lint/format, and the no-hardcoded-colors UI rule. The gap was structural: Husky / lint-staged / the `check-skill.sh` PreToolUse hook only bind a local Claude Code agent's edits — they are silent for writes via the GitHub API/MCP, direct pushes, and hand-merges. Evidence on main: non-conforming commit headers (PR #105 and several `Record …` / `Backlog …` / `Reconcile …` history entries) authored via the API where commitlint never ran. New CI workflow `.github/workflows/conventions.yml` adds three independent jobs — `commit-lint` (reuses `commitlint.config.js`), `biome` (runs `bun run format-and-lint`), `no-hardcoded-colors` (new diff-scoped script `scripts/check-forbidden-colors.ts` that encodes the four pattern groups from `ui-theme-tokens/SKILL.md`). The color check is deliberately under-matching: scans only added lines, skips `globals.css` and CSS custom-property definitions, finds 11 known legacy violations in `packages/ui` but does not block PRs that don't re-touch those lines. Local hooks are unchanged. `state-machine.md` §12 updated to move the three conventions from "Trusted (agent discipline)" to "Enforced (CI blocks merge)". **Principal follow-up:** arm the three new checks as required status checks in GitHub Settings → Branches → ruleset for `main`; until armed, the gate runs but does not block.

---

## June 14, 2026 — verify-docs Tier-parsing fix

### Process / tooling
- **PR #106** — `fix(verify-docs)`: the docs gate could not parse a bold `**Tier:** 3` field in a PR body (the `**` wraps the colon; the old regex expected the colon outside the bold), so a correctly-tiered PR parsed as `null`, silently defaulted to Tier 3 (strictest), and then failed on the *unrelated* C4 rule (tier-3 needs a decision log). This is how PR #105 (aeg-core) merged red. Two fixes: (1) `readTierFromPrBody` now matches plain `Tier:`, bold-colon `**Tier:**`, and bold-label `**Tier**:`; (2) a missing/unparseable Tier is now an **explicit error** (new check `C0 tier-required`, "declare your tier") instead of a silent escalation to strict — the script never guesses the tier. Output consolidated into `finish()` so the early C0 exit prints consistently. Full mode unchanged; genuine Tier-3-without-decision-log still fails C4 once the tier parses. Surfaced operationally after #105; follow-up: add the docs check to `main`'s required status checks once this lands.

---

## June 3, 2026 — Cetana F6 (`cetana watch`)

### Cetana
- **PR #79** — F6: `cetana watch <task-id>`. Streams human-readable JSONL output for a single task. Print-and-exit if task is already complete; live-follow mode (500ms polling, trailing-buffer JSONL line reassembly) if still running. Renders 🚀 dispatched, 🤖 text, 🔧 tool calls, ✅ tool results, ⏸ blocks, 💥 crashes. Tool name resolution via cross-message id→name map. 21 watch tests (8 renderProgressMessage, 8 renderEvent, 5 CLI integration). D-026 added: single-task-by-id shape ratified; watch-all-active deferred to F7 fleet view.

---

## June 2, 2026 — Per-product PM, Vāda Reviewers prompt v2, Herald admin verified

### Project management
- **Per-product PM created for Vāda** — `apps/vada-ai/aeg-project/state.md` + `now.md` committed to main. Phase plan, build state, known bugs, open questions.
- **Per-product PM created for Cetana** — `apps/cetana-ai/aeg-project/state.md` + `now.md` committed to main. CLI ladder, architecture, locked decisions.
- Herald already had per-project PM from June 1.

### Vāda
- **PR #77 merged** — Reviewers system prompt v2. Anti-convergence: ONE primary concern mandatory, structured output format enforced (PRIMARY CONCERN / EVIDENCE / WHAT THE DRAFT GETS RIGHT / WHAT WOULD CHANGE MY MIND), phantom consensus flag named and required. v1 archived in spec. Both `vada-reviewers.yaml` and `vada-reviewers-synthesis.yaml` updated.

### Herald
- **PR #75 merged** — Admin redesign: avatar upload (Vercel Blob, `herald-ai-blob` store, FRA1), CV upload, bio field, two-column profile editor + live Envoy preview, onboarding TopBar, CV paste-text mode. DB: `avatar_url`, `cv_url`, `bio` columns in `herald_profiles`. `bun.lock` committed (was incorrectly gitignored — fixes non-deterministic Vercel installs).
- **PR #74 merged** — Four defensive null guards in `AIOnboarding.tsx` — fixes onboarding crash (`TypeError: Cannot read properties of undefined (reading 'state')`).

### Process
- **PR #76 merged** — PM sync: `now.md` replaced, `changelog.md` prepended with June 1 entries, `roadmap.md` patched (sequencing, F6 flagged, Track B Item 3b unblock noted).
- **Worktree convention locked** — every agent prompt must start with `git worktree add .worktrees/<branch> -b <branch> origin/main && cd .worktrees/<branch>`. Enforced going forward.

---

## June 1, 2026 — Herald Phase 1 + admin redesign + Cetana spawner + Vāda key validation

### Herald
- **PR #70** — Match route reads profile from DB via `username`; signals fetched server-side; Upstash Redis failure degrades gracefully. Envoy live at `herald.attalabs.dev`.
- **PR #74** — Four defensive null guards in `AIOnboarding.tsx` — fixes onboarding crash.
- **Commit 9f30581** — `EnvoyFlow.tsx` client timeout raised 25s→35s; `vercel.json` added with `maxDuration: 30`. Fixes "audit took longer than expected" on cold LLM calls.
- **PR #71** — localStorage mock reset fix; `planToVisualNodes` cross-round edge fix.
- **PR #75** — Herald admin redesign: avatar upload (Vercel Blob), CV storage, bio field, two-column admin UI, onboarding TopBar, CV paste mode. DB: `avatar_url`, `cv_url`, `bio` columns added to `herald_profiles`.

### Cetana
- **PR #68** — Claude binary resolution via `which claude` + fallback paths; model tier resolution via `resolveDispatchModel`; `repoPath` from config.

### Vāda
- **PR #65** — Provider key validation before `runLangGraph` dispatch. Returns HTTP 400 with `missing_provider_key` error.

### Issues closed
- #59, #63, #67, #69 — all closed June 1.

---

## June 1, 2026

### PR #68 — fix(cetana): resolve claude binary, model tier resolution, repoPath from config
**Branch:** `fix/cetana-spawner-path` → `main`
**Fixes:** Three root causes preventing `cetana dispatch` from working after install.
- Claude binary: `spawn('claude', ...)` used bare string; Bun subprocess doesn't inherit full shell PATH. Fix: `resolveClaudeBinary()` runs `which claude` then falls back to known NVM/homebrew/global paths. Full PATH including `/opt/homebrew/bin` injected into subprocess env.
- Model: config defaulted to `claude-sonnet-4-6` hardcoded string. Fix: config stores `anthropic/balanced` tier spec; `resolveDispatchModel()` in `@atta/models` resolves to current non-decommissioned balanced model at dispatch time via `FALLBACK_CATALOG`. Model deprecations now require one line in `deprecations.ts` + one entry in `fallback.ts` — nothing else.
- repoPath: hardcoded to `~/code/atta`. Fix: `repoPath` added to `CetanaConfig` and `CliConfigSchema`; `cetana init` prompts for it defaulting to `git rev-parse --show-toplevel`.
**Files:** `packages/models/src/dispatch.ts`, `coordinator/src/claude-spawner.ts`, `coordinator/src/config.ts`, `coordinator/src/paths.ts`, `cli/src/lib/config.ts`, `cli/src/commands/init.ts`

### PR #70 — feat(herald): Phase 1 — candidate use case complete
**Branch:** `feat/herald-phase-1` → `main`
**Goal:** Herald Envoy works end-to-end; Dani can send `herald.attalabs.dev/dani` to a job application.
**Bugs fixed:**
1. Match route used `_test_profile_override` (client sent full profile) instead of reading from DB. Fix: route now accepts `username`, fetches via `getUserByUsername(username)`. `_test_profile_override` removed from live path.
2. GitHub signals always empty — `EnvoyFlow` was sending `github_signal: { patterns: [] }` and route trusted it. Fix: signals now fetched server-side from DB profile's `githubHandle` via `fetchSignalsWithTimeout`.
3. Upstash Redis creds expired — `ratelimit.limit(ip)` threw, crashing all match requests with 500. Fix: `proxy.ts` wraps call in try/catch, logs warning, falls through on failure. Real rate limiting needs fresh Upstash creds provisioned manually.
**Note:** `DANI_PROFILE` in `lib/profile.ts` retained as type reference only — no longer in live path. Can be deleted in Phase 2 cleanup.

### PR #71 — fix: resolve 2 remaining test failures from #29 audit
**Branch:** `fix/remaining-test-failures-29` → `main`
**Fixes:**
1. `clearReviewerConfig > removes the entry from localStorage` — localStorage mock not reset between tests; `has()` returned stale true. Fix: `beforeEach` now resets the mock.
2. `planToVisualNodes` cross-round edges test — off-by-one in grouping logic for last-agent-of-Rn → all-agents-of-Rn+1 edges. Fix: corrected grouping in `planToVisualNodes`.

### PR #65 — fix(vada): validate provider keys for default agent models before dispatch
**Branch:** `fix/reviewers-missing-key-validation` → `main`
**Fix:** Route `apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts` now validates all non-local-vendor agents have configured provider keys before calling `runLangGraph`. Loads plan from `session.specId`, builds `agentVendorOverrides` from plan defaults (skipping anthropic as always-available), applies `reviewerConfig` overrides on top, checks each vendor against `configuredProviders`. Returns `{ error: 'missing_provider_key', agent, model, vendor }` with HTTP 400 on failure. Only file touched: `route.ts`.
**Closes:** #59

---

## 2026-05-13 — Chore: D-033 cleanup — signal-type rejection + RevisionCondition tighten (D-034)

Follow-up to PR #47. Two hardening changes identified during PR #47's diff review.

- **`buildRevisionCondition` throws on unsupported signal types.** Was silently coercing `signal.type: 'equals' | 'matches'` to `'contains'`, masking YAML authoring errors. Now throws explicitly with an actionable message naming the unsupported type. `compile-flow.ts`.
- **`RevisionCondition` collapsed to single-variant interface.** The v1 union had three variants (`contains`, `json-field-equals`, `json-field-truthy`); only `contains` was ever reachable from a v2 YAML. Collapsed to a plain interface with `type: 'contains'` (discriminator preserved for forward extensibility). `types.ts`.
- **Dead adapter switch-case branches deleted.** `json-field-equals` and `json-field-truthy` case blocks removed from `packages/adapter-langgraph/src/adapter.ts` and `graph-builder.ts`, plus the orphaned `getJsonField` helper (no callers).
- **Test coverage.** New test in `compile-flow.test.ts` mutates a sparring flow's audit round to use `signal.type: 'equals'`, asserts `compileFlow` throws with the exact message. 68 engine tests total.

5 files touched, +35/-86. Net deletion of 51 lines — what a cleanup PR should look like.

PR: #48
Commit: `c83b4311a7aca187d6b0cb38b0d185b447bf28ff` on `chore/d033-signal-and-revision-cleanup`.
Conforms to: `vada-decisions.md` D-033 (universal flow schema).
Logged as: `vada-decisions.md` D-034.

---

## 2026-05-13 — Refactor: Universal round-based schema + compileFlow (D-033 PR 2)

The architectural heavy lift of D-033. Vāda's YAML schema, engine compiler, and 29 consumer files migrated to the v2 universal round-based model in a single atomic PR.

- **Schema v2:** every flow is `{ schema_version: "2.0", id, defaults, agents, rounds }`. The three v1 shapes (brokered-no-synthesis, brokered-with-synthesis, rounds-based) collapsed into one model. Synthesizer = single-agent round. Audit = round. Revision = declarative via `on_failure: { action: revise, target, max_revisions, signal }`.
- **Engine compiler:** `compileFlow(flow, question, model?, customVars?) → Plan` replaces `compileSpec` + per-shape compilers. Greenfield 386-line implementation, no v1 shims. Shape detection at the top emits matching v1 Plan node ids (`solo`, `reviewer-{name}`, `brokered-synthesis`, `round-{r}-{name}`, `terminal-{k}`, `audit-{name}-{k}`, `__END__`) so the adapter executes the graph identically across shapes.
- **Catalog migration:** all 9 YAMLs hand-converted to `schema_version: "2.0"`. Every one validated by `validateFlow`. Behavioural verification: all existing engine tests pass against the migrated catalog (67/67).
- **Engine API surface:** `index.ts` now exports `loadFlow`, `compileFlow`, `validateFlow`, `resolveAgentFailure`, `InvalidFlowConfigError`, `Flow`, `FlowSchema`, and supporting types. Old exports (`loadSpec`, `compileSpec`, `specToTeam`, `Team`, `BrokeredWorkflow`, `RoundsWorkflow`, `SoloWorkflow`, `CustomWorkflow`, `Workflow`) all **deleted**. No backwards-compat shim.
- **Engine internals deleted:** `spec-types.ts`, `spec-schema.ts`, `spec-loader.ts`, `validate.ts`, `compile.ts`, the entire `compilers/` directory.
- **Consumer migration:** 29 files updated. MCP servers, route handler, 6 UI components, verify scripts, and `apps/vada-ai/web/src/lib/flow-helpers.ts` (new — 39 lines, shared shape detection).
- **Synthesis template bug fix:** `vada-reviewers-synthesis` synthesizer template was `{{reviewerResponses}}` — a variable the engine never populated. Synthesizer was running blind in production. Migration replaced with `{{#each allPreviousOutputs}}[{{this.agentName}}] {{this.content}}{{/each}}`.

60 files touched, +477/-2637.

PR: #47
Commit: `45521c72cdab5e881202b92a9f83d5682523c706` on `feat/generic-flow-refactor-pr2`.
Conforms to: `vada-decisions.md` D-033.
Tests: 67 engine, 33 UI; 21/21 typecheck; biome clean.

---

## 2026-05-13 — Docs: v2 naming + framing audit (D-025 global)

Cross-product brand architecture refactor. v2 framing locked: AttaLabs = dev/lab ecosystem; Atta = product (deep-thinking AI). No `-AI` suffix. Pāli rule demoted. Cetana = internal tooling. Herald = standalone product.

PR: #46. Logged as global D-025.

---

## 2026-05-12 — Cetana V0.5 Step 1: CLI scaffold + init (F5 complete)

Shipped the `cetana` CLI binary. Five commands: `init`, `dispatch`, `list`, `reply`, `logs`. 26 passing tests. Install gate verified.

PRs: #39, #42, #43.

---

## 2026-05-11 — Vendor registry consolidation (PR #31)

Single source of truth at `packages/models/src/vendors.ts`. 12 vendors. SDK-shape dispatch. MCP `reviewer_config`. Experimental flag on 3 YAMLs. Tech debt cleared.

---

## 2026-05-10 — Cetana V0 shipped + v3 operational model adopted

Cetana coordinator at `apps/cetana-ai/coordinator/`. State-machine-governed v3 model with three roles + Archivist automation.

PR: #25.

---

## 2026-05-09 — MCP contract fixes + skill registration unblock

PRs #20 + #21. Skill paths decoupled. MCP schema drift fixed. Hosted MCP dogfooded via curl.

---

## 2026-05-04 — Hosted MCP + single-source-keys + shared-keys-ui

Hosted MCP live at `https://vada.attalabs.dev/api/mcp`. Single-source BYOK. Shared keys UI.

PRs: #9, #10, #13. May 5: `feat/shared-keys-ui`. See D-028, D-029, D-030.

---

## 2026-05-03 — Engine-flow-ui PR

Full teams catalog surface. `@atta/ui/engine-flow`. `PlanNodeKind` + `PlanEdgeKind`. `AgentRole` deleted.

---

## 2026-04-30 — Track B Item 2 + closeout

Multi-vendor adapter, engine extensions, docs, Vāda Reviewers v1 YAMLs merged.

---

## 2026-04-28 — Production launch

Vāda + AttaLabs hub deployed. DNS configured. OAuth-only V1 launched.
