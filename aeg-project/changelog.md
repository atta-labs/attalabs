# Atta — Changelog

**Completed work log.** Append-only, most recent first.

> **Structure:** This file is compiled from individual changelog entries in `changelog/YYYY-MM-DD-<branch>.md`. Agents write entries to individual files per branch to avoid merge conflicts on parallel work. The Archivist compiles entries into this index.

→ [state.md](state.md) — current operational state (active work: derived from forge — see `coordination.md`)
→ [lessons.md](lessons.md) — calibration

---

## June 27, 2026 — Vāda deliberate page: production UX + Council deliberations (PR #207)

### Vāda / @atta/ui

- **vada-production-v1 (PR #207)** — Brings the deliberate page to production and ships Council end-to-end; grew past its "tool badges" title by Principal decision. Core: Council teams (`vada-council`, `vada-council-synthesis`) + `CouncilFeed` (explicit vendor-color spheres — grey-sphere bug fixed by construction, completion-fill streaming, locked `{agreements, disagreements, bottomLine}` synthesis), frontier-chat input + morphing Configure↔Submit, dropdown restyle/labels, tool badges, `RouteAwareFooter`. Shared `@atta/ui`: `SmartPromptInput` dependency injection (closes #213), inline-mode generalization, `TextReveal` added to contract + 4 libraries. Rode-along (out of iteration): Herald `JDInput` bare-variant refactor (supersedes "Herald byte-identical"); admin theme-editor fix `a8a0f5c6` + one Herald owner-tree file (kept per Principal, Doc-waiver); Sanity theme contrast (WCAG AA). Deferred: token streaming (adapter V2), multimodal ingestion, topbar basic sweep. Council vada-local D-035; DI contract global D-064. Tier 1.

---

## June 25, 2026 — Herald: owner `/ui` + `/settings` relocated under `/[username]/(owner)/` (task 8, D-061)

### Herald / UI

- **Task 8 (#210, PR #213)** — Relocates Herald's owner appearance editor and Settings hub from the flat `(app)` route group into the `/[username]/(owner)/` segment, alongside a sibling `(profile)` route group at the same level. The `[username]/layout.tsx` is deliberately reduced to a metadata + passthrough so it introduces no `LibraryProvider` — the two sibling groups each feed their own: `(profile)` uses `EnvoyLibraryShell` (user library), `(owner)` uses `CandidateShell` with the build-time library id. This is the structural enforcement of D-035 (Lock: YES — "owner chrome = build-time library; public profile = user library"); the brief's verification recipe (`user.library = retro` ⇒ chrome stays build-time, only `/A` switches) extends cleanly to the new routes. Topbar nav rewrites: `HeraldTopBar` drops the duplicate UI + Settings centered links and gains a right-cluster `Settings` button (icon + label) via the shared `extraActions` slot → `/{me}/settings`; `envoy-shell` renders a `Theme` button (Palette icon + label) → `/{username}/ui` only when `isOwner`. Below `md` the topbar collapses to logo · color-scheme toggle · hamburger — `extraActions` + `accountMenu` move into the hamburger sheet. Single mobile-section rewrite in `packages/ui/topbar/index.tsx`; the prop surface is unchanged. Vāda inherits this as a strict accessibility improvement — its existing `extraActions` Settings icon, previously hidden below `md`, now appears in the hamburger sheet. AEG Studio uses `TopBarNoAuth` and is unaffected. Old `app/(app)/ui/` and `app/(app)/settings/` deleted; internal hrefs, `proxy.ts` matchers, and `revalidatePath` calls all swept to the new owner-segment routes. Engine / adapter / `@atta/cms` / `@atta/db` / `@atta/auth` / `@atta/identity` / `@atta/models` / `@atta/storage` / `@atta/crypto` untouched. **Ratifies D-061** (status ACTIVE; renumbered from a draft D-060 after rebase onto main — PR #212's D-060 is the central-CMS centralisation; task 8 is now D-061). **Supersedes:** D-036's route layout for `/ui` + `/settings` and its `HeraldTopBar` nav-link treatment of UI + Settings (rest of D-036 still in force). **Conforms-to D-035** (Lock: YES — preserved). **Inherits D-060** (central-CMS theme/library resolution — `(owner)/layout.tsx` consumes the same `getHeraldConfig(...).userInterface.library.id` post-resolution). Tier 3. Closes #210.
- **Outstanding (not a blocker, recorded for the next task):** the `ui-library-system` skill staleness flagged in TL review — the new C5 coherence gate (D-062, PR #216) is now armed against the `packages/ui/topbar/**` and `packages/ui/libraries/**` bindings, so a future shared-topbar / library edit without the matching SKILL.md update will fail verify-docs; the pre-existing skill staleness itself remains a punch-list item for `aeg-coherence-v1` T4 (Planner §7 auto-derivation, #219) and T3 (bind-all + staleness audit, #218).

---

## June 25, 2026 — Centralize CMS themes and component libraries under Attalabs (D-060)

### CMS / Cross-product

- **task/aeg-governance-ui-v2/centralize-themes-attalabs (no Issue, PR #212)** — Centralises the storage, mutation, and schema representation of UI themes (`uiTheme`) and component libraries (`library`) into the central Attalabs Sanity database (`l5n0n8nn`). Per-product schemas (Vāda, Vitakka, Herald, Attā) change `theme` and `library` from reference fields to raw string IDs so the central registry is the single source of truth. `getProductUiConfig` in `@atta/cms` is rewritten to dynamically resolve theme/library metadata from the `attalabs` client by string ID, with backward compatibility for the legacy reference objects and graceful `null` fallback to prevent silent chrome regressions. Admin tool CRUD theme actions and `setActiveThemeAction` now write directly to the `attalabs` client. Studio "Themes" / "Libraries" listings are restricted to the Attalabs Sanity Studio. Migration: 19 themes (`theme-*`) and 4 libraries (`library-*`) replicated from old dataset `atta` (`892o2m9f`) into `attalabs` (`l5n0n8nn`) via `packages/cms/scripts/migrate-themes-and-libraries.ts`; verification query confirmed exact counts. D-035 (Lock: YES) preserved by construction — the build-time config shape `getHeraldConfig().userInterface.library.id` is reproduced through the dynamic lookup. CI test stabilisation bundled: `vitest` added to the root `check` pipeline (filtered to `@atta/cms`) and `test` task wired into `turbo.json`; `@atta/engine` `plan-baseline` snapshots relocated from `/tmp` into a local `baselines/` directory to unblock `compile-flow.test.ts`. **Ratifies D-060** (status ACTIVE). Tier 3. Pending manual action: `SANITY_API_TOKEN_ATTALABS` must be set in Vercel + local `.env.local` for `tools/admin` to authorize mutations (already logged in root `aeg-project/state.md`).

---

## June 24, 2026 — Vāda T3a follow-up: equip synthesis-team reviewers with web search

### Vāda / Adapter

- **T3a follow-up (no Issue, PR #209)** — Extends the T3a treatment (PR #205, #178) to the synthesis-team reviewers. Adds `tools: [web_search]` to the Gemini, GPT, and Grok reviewer agents in `vada-reviewers-synthesis.yaml`, placed identically (after `editable: true`, before `classifier:`) to the format used in `vada-reviewers.yaml`. The synthesizer agent (Claude/Anthropic, commit-only role) is deliberately unchanged — no tools. Immutability respected — `benchmarked: false` on the YAML at edit time. `apps/vada-ai/specs/vada-reviewers-spec.md` cleaned of three stale "no tool access / still open" passages (§2.3, §4.1 fidelity-gap note, §7.3 resolved note, §8 open-questions strikethrough). Tier 1. Conforms-to D-053. No new Issue opened — direct sibling of #178 (T3a), tracked through the PR alone.

---

## June 25, 2026 — AEG coherence seam — `aeg-root/doc-owners` + `verify-docs` C5 (D-062)

### AEG
- **aeg-coherence-v1 task 1 (#214, PR #216)** — Lands the AEG coherence seam: a single CODEOWNERS-shaped file at `aeg-root/doc-owners` maps code-surface globs to doc pointers; `scripts/verify-docs.ts` gains check **C5** that, for each changed code file in a PR, glob-matches against every binding and enforces *bind-or-waive* (strong-pass: bound doc in diff; url-ack: `Doc-ack: <pointer> — <note>` PR-body field for URL pointers; waiver: `Doc-waiver: <pointer> — <reason>` per-binding, logged; dangling: distinct FAIL when an in-repo pointer doesn't exist on disk). Dormant when `aeg-root/doc-owners` is absent OR no binding's glob matches a changed code file — no output, no error — so the seam is safe to ship to repos that haven't adopted it. C1–C4 are byte-for-byte unchanged. Tier-orthogonal: a Tier-0 PR touching a bound surface MUST satisfy C5; a Tier-3 PR touching no bound surface satisfies C5 trivially. Both gates run; both must pass. **Ratifies D-062** (reserved → ACTIVE). **Conforms-to D-010** (verify-docs is the hard gate) **and D-058** (coherence obligation, output side). Tier 3.
- **Seed bindings (gate live on day one):** (1) `packages/ui/topbar/**` → `.claude/skills/ui-components/SKILL.md`; (2) `packages/ui/libraries/**` → `.claude/skills/ui-library-system/SKILL.md`; (3) `apps/herald-ai/web/src/app/[username]/**` → `apps/herald-ai/specs/herald-app-architecture.md`; (4) `scripts/verify-docs.ts` → `aeg-root/state-machine.md`. Binding 4 is self-referential — this PR edits `scripts/verify-docs.ts`, so C5 on this very PR required `aeg-root/state-machine.md` in the diff; the new §15 of state-machine.md satisfies it. Glob syntax is deliberately simple — only `*` (sequence not containing `/`) and `**` (any sequence including `/`) are special; Next.js dynamic-route segments like `[username]` match without escaping, narrower than CODEOWNERS' `fnmatch` character classes.
- **PR-body fields, not labels.** `Doc-ack:` and `Doc-waiver:` are parsed from the PR body alongside `Conforms-to:` and `Tier:`; the closed Section-14 label vocabulary is unchanged. A follow-up `Fix(aeg-coherence-v1)` commit on the same branch widened the separator tolerance: em-dash `—`, en-dash `–`, or plain ASCII hyphen `-` (with surrounding whitespace) all parse identically, so `Doc-waiver: <pointer> - <reason>` works for humans typing on a US keyboard. Documented in `roles/developer.md` (PR-body table) and §15 of `state-machine.md`.
- **Surface:** `aeg-root/doc-owners` (NEW seed file, 4 bindings + header comment block); `scripts/verify-docs.ts` (adds `parseDocOwners`, `globToRegex`, `evaluateC5`, `runC5`, tolerant separator regex); `scripts/verify-docs.test.ts` (six required C5 paths + multi-binding + separator-tolerance hyphen tests; 21 pass total); `aeg-root/state-machine.md` (new §15 — Coherence Seam — Doc Coverage; cross-refs in §9 + §12); `aeg-root/roles/developer.md` (`Doc-ack:`/`Doc-waiver:` PR-body fields; "Documentation is part of every task" frames update-or-waive as a DoD gate per D-058 + D-062); `aeg-root/roles/reviewer.md` (item 6 — correctness-not-presence, since coverage is mechanical); `aeg-root/contracts/developer-reviewer.md` (new doc-owners coverage row + producer/consumer obligations); `aeg-project/decisions.md` (D-062 full entry replacing the reservation stub). Lock: NO on D-062 — single-file format and dormancy semantics are deliberately narrow; broadening either is a new `D-###` that supersedes. Closes #214.

---

## June 16, 2026 — AEG pre-merge forge gate in Developer role

### AEG
- **Pre-merge gate** — Added a pre-merge verification gate to the Developer role that any Developer must run before any merge-adjacent action (commenting "MERGE", helping the Principal merge, or pushing a "fix CI" commit after review). The gate verifies: (1) at least one reviewer has `state: APPROVED` on the PR, (2) the PR body's Test Plan section has no unchecked `- [ ] **[agent]**` lines, (3) the PR body's Test Plan section has no unchecked `- [ ] **[principal]**` lines. If any check fails, the Developer posts a comment listing the exact missing items and blocks — the Principal decides whether to proceed. The check is tool-agnostic and forge-readable: `gh pr view <n> --json reviews,statusCheckRollup,body`. Surface: `aeg-root/roles/developer.md` (new `Pre-merge gate` section after verification) + `aeg-root/aeg-manual-flow.md` (gate documented as Step 6 prerequisite in §5). Tier 1.

---

## June 16, 2026 — AEG Studio kanban board + task detail (task 5)

### AEG
- **Task 5 (#100)** — Studio iteration pages now offer a kanban view of an iteration's tasks plus a per-task detail view that surfaces the brief from the PR body. New route `/projects/<name>/iterations/<slug>/board` reads the iteration via `@atta/aeg-core`'s `parseIteration`, loads the live forge facts through the existing `fetchForgeFacts` adapter, and hands both to `deriveIteration` — derived status is read from `aeg-core`, never re-derived in the component. Columns map to the seven `DerivedStatus` values from `iterations/README.md` §3 in lifecycle order (`backlog` → `todo` → `in-flight` → `in-review` → `changes-requested` → `merged` → `blocked`); each task card shows id, title, issue number, project chips, and a blockers indicator when `dependsOnNotMerged` or `conflictsWithOpenOrInFlight` is non-empty. Clicking a card opens `/projects/<name>/iterations/<slug>/tasks/<id>` — the detail view shows the derived-status badge, an identity panel (issue, projects, depends-on/conflicts-with edges with blocker highlighting), a forge-links panel (Issue + PR with state), and the brief markdown rendered from the PR body via `react-markdown`/`remark-gfm`. The brief is fetched from the **PR body**, not the Issue — the model's "where briefs live" rule (`iterations/README.md` §7).
- **`@atta/aeg-studio` lib additions:** `src/lib/forge/fetch-pull-request-brief.ts` — server-only batched GraphQL fetch of `{ number, url, state, body }` for one or more `task/<iteration>/<id>` head refs, mirroring `fetchForgeFacts`'s no-token / unreachable degradation contract. `src/lib/forge/resolve-repo.ts` — reads `AEG_REPO` env or `git remote get-url origin`, returns `null` when neither resolves. `src/lib/forge/load-snapshot.ts` — high-level loader that combines repo resolution + forge facts + `deriveIteration` for one iteration; shared between board and task-detail pages so the live-status read happens once per request.
- **Graceful degradation verified locally** against the live `aeg-ui-v1` iteration (8 tasks already merged at task-5 start time): with `gh auth`, every merged task lands in the `Merged` column and task 5 lands in `Backlog` (no PR yet) — matches `gh pr list` exactly. Without a token, every task drops to `Backlog`, a "Live status unavailable" banner renders, and no exception is thrown — the topology remains useful before GitHub is reachable. Task-detail under the same no-token mode renders the identity panel, hides the PR/Issue links, and shows a "Live brief unavailable" notice for the brief section. The iteration topology page (#118) and graph page (#121) are untouched apart from a new "View as board" CTA next to the existing "View as graph" CTA.
- Tier 1 — `aeg` only. **No `@atta/ui` edits**, no `@atta/aeg-core` edits, no shared Studio layout edits (`StudioShell` / `StudioSidebar` untouched — the board lives under the per-iteration namespace, not in the global Explore sidebar). Semantic tokens only. Closes #100.

---

## June 16, 2026 — Polymorphic audit inputs in Bulk Audit (task 5)

### Herald
- **Task 5 (#92, PR #123)** — Bulk Audit's JD and CV slots are now polymorphic. Each JD slot is `text | url` and each CV slot is `text | markdown (.md) | pdf | profile` (a published Herald username). All input kinds normalise to the text the audit cell consumes, and **every kind runs under the logged-in user's BYOK key** via the existing batch shape. The auditor agent / YAML / engine / tool-execution path are unchanged (Task 7b's surface, since merged as PR #120). New module `src/lib/audit-input/` holds the pure resolution layer: `resolve.ts` (`resolveJdInput`, `resolveCvInput`), `url-fetch.ts` (SSRF-safe URL fetch + HTML-to-text extraction), `client.ts` (thin client helper), and `types.ts` (`JdInput`/`CvInput`/`ResolvedJd`/`ResolvedCv`). A new authenticated endpoint `POST /api/audit/resolve-input` accepts JSON (`text`/`url`/`profile`) and multipart (`.pdf`/`.md`, 5 MB cap) and returns `{ resolved }` — PDFs are parsed with `unpdf` (the same library `/api/admin/parse-cv` uses); markdown is the file body as-is; profile lookup goes through the existing `getUserByUsername` and 404s when the profile isn't published.
- **Unified BYOK wiring.** `/api/audit` `handleBatch` now accepts a polymorphic `candidates` array — entries can be a legacy username string, `{ kind: 'username', value }`, or `{ kind: 'text', label, text }` (ad-hoc CV from any non-profile kind). All entries run through `runSingleMatch` with the SAME `creds` resolved from the logged-in user's stored BYOK preference. The previous single-shape `_test_profile_override` detour (which routed to the server's `ANTHROPIC_API_KEY` env fallback) is no longer used by Bulk Audit — that fix was the BYOK-billing gap flagged in PR #123's review.
- **SSRF defense-in-depth (PR #123 review fix).** `url-fetch.ts` was rewritten from a single `fetch` with `redirect: 'follow'` to a five-layer pipeline: (1) syntactic validation (protocol allow-list, literal-IP / hostname block-list, IPv4-mapped-IPv6 detection like `::ffff:127.0.0.1`); (2) per-hop DNS resolution via `node:dns/promises` `lookup({ all: true })` — rejects if ANY returned A/AAAA record points at private/loopback/link-local (closes the round-robin DNS-rebinding hole); (3) IP pinning via an undici `Agent` with a custom `connect.lookup` that returns the validated IP, so the actual TCP connect can't be rebound between resolve and connect; (4) manual redirect handling with `redirect: 'manual'` and a hop cap (3) — each `Location` re-runs the full validate→resolve→pin pipeline; (5) the existing 1 MB body cap and 8 s wall time. Dependencies (`lookup`, `fetchImpl`) are now injectable, so tests exercise the actual logic instead of stubbing it.
- **Components:** `JdInputControl.tsx` (Tabs: Paste text / URL) and `CvInputControl.tsx` (Tabs: Paste text / .md / .pdf / Profile, key-based file-input remount on kind switch). `BulkAudit.tsx` lists JDs and Candidates symmetrically with per-slot add/remove and kind tabs (replacing the prior newline-separated usernames textarea), resolves every filled slot in parallel before fan-out, then runs the existing N×M matrix.
- **Tests:** 31 unit tests in `tests/audit-input-resolve.test.ts` (up from 16 in the initial PR). New SSRF coverage: `assertSafeResolvedAddresses` (loopback/RFC1918/cloud-metadata/IPv6-ULA/IPv4-mapped-IPv6 rejection, multi-record round-robin enforcement, empty-set rejection); `fetchAndExtractText` (302 → 169.254.169.254 blocked at hop 2; 302 → 10.0.0.1 blocked; 302 → hostname-that-resolves-to-127.0.0.1 blocked at the DNS-rebinding step; redirect-chain hop cap; clean follow of a 2-hop public chain; pinned address propagation; clear "Redirect blocked" error for a `localhost:6379` redirect target). Existing coverage retained: `validateJdUrl` allow/deny, `extractMainText`, JD/CV text-length validators.
- Tier 1 — Herald-only, no `@atta/ui` edits, no engine/adapter/`@atta/db` edits, semantic tokens only. Closes #92.

---

## June 15, 2026 — Append-only per-iteration token/cost ledger — model half (task 9)

### AEG
- **Task 9 (#110, model half)** — Defines the per-iteration token/cost ledger as a new `state-machine.md` §13 append-only artifact and teaches `@atta/aeg-core` to parse + sum it. One sibling file per iteration (`aeg-root/iterations/<name>.tokens.md`); fixed columns `Phase | Role | Agent/Model | Tokens in | Tokens out | Cost | Date`. The append rule, added to every role's doc and to `aeg-manual-flow.md`: at the end of a role's turn, append one row; never edit a row; re-entry (re-plan, re-develop after `CHANGES_REQUESTED`, re-review) appends a new row; the iteration total is `sum(rows)`, derived at read time, never stored — same philosophy as forge-derived task status and the append-only decision log. Two capture sources are designed in honestly: terminal roles (Developer in Claude Code; Archivist when automated) self-report exact numbers via the session meter; claude.ai roles (Planner; Brief Author; Reviewer; Security) append with numeric cells as `—` and the Principal fills them later from the claude.ai UI usage figure — V1 accepts the manual seam because chat turns are the cheap ones and coding (terminal) dominates spend. The sibling-file form is chosen over an inline `## Token ledger` section to avoid the merge-collision domain the topology file's "Planner-only at plan time" rule was set up to remove; the parser also accepts the inline form. `parseLedger(md) → LedgerRow[]` tolerates em-dash / `-` / empty cells as `null`, tolerates thousand-separator commas in integer cells, and skips malformed rows rather than throwing; `sumLedger(rows) → LedgerTotals` is pure (nulls contribute zero; row count preserved). Surface: 5 new files in `packages/aeg-core/src` (`types.ts` additions; `parse-ledger.ts`; `sum-ledger.ts`; tests + fixture; `index.ts` re-exports) + edits to `aeg-root/iterations/README.md` §12, `state-machine.md` §3/§13, `aeg-manual-flow.md` §5, and all six role docs. New live ledger at `aeg-root/iterations/aeg-ui-v1.tokens.md` with backfill policy noted (older tasks predate the obligation; not backfilled). 87 tests pass (75 prior + 12 new). **Cost-table dependency noted, not fixed:** the adapter PRICING table currently misses some recent models (e.g. `claude-sonnet-4-20250514`) so cost cells can read `$0.00` for otherwise-real rows; tokens are still exact, cost is best-effort. **#110 stays open** — the Studio display half (per-task and per-iteration totals on iteration pages and task detail) is the second half of the same task and depends on the iteration-pages surface currently occupied by #99 in the serialized 4→6→5 wave; bundling it here would collide with #99. D-048 logged (Status ACTIVE, Type 1, Lock NO).

---

## June 15, 2026 — Herald auditor gathers GitHub signals via engine custom-tool (task 7b)

### Herald
- **Task 7b (#103)** — Wires Herald's auditor to gather GitHub evidence through the custom client-side tool execution shipped in task 7a (#102/#115) instead of the deterministic `extractSignals` pre-fetch. `herald-auditor.yaml` now declares a `custom_tools` entry on `SkepticalAuditor` — `fetch_github_signals(github_handle: string) → string[]` — with a TOOLS section in the system prompt telling the model to call it exactly once when the candidate profile includes a github_handle. The audit doctrine (linguistic rules, hard/soft requirement classification, grading logic, mitigation rule) is unchanged. `app/api/audit/route.ts` registers a TS handler on `LangGraphAdapter` (`customTools: { fetch_github_signals: githubSignalToolHandler }`) that wraps the existing `extractSignals` with the same 3s per-call budget — worst-case GitHub latency is preserved, only the call site moves from a pre-LLM pre-fetch into the engine's tool loop. The "GITHUB SIGNALS:" pre-pended block is dropped from the prompt; instead, the profile header now includes a `GitHub handle:` line so the model has the argument it needs (or an explicit "(none provided — do not call fetch_github_signals)" when missing). `extractSignals` itself is retained (it's the tool body, and `/api/mcp/signals` still consumes it directly); only the deterministic pre-fetch invocation is retired. **Per-attempt LLM timeout bumped 25s → 45s** because the agentic loop runs at least two model turns per audit (turn 1: decide & emit tool_use → tool exec → turn 2: synthesize the JSON report); end-to-end smoke against Claude Sonnet on a real GitHub profile measured ~42s for the full loop with 17 signal entries returned and a CLEAN `MatchReport` (grade A, 7 signal entries, parsed successfully). NO-FIT hard-requirement gate, SHA-256 cache, 2-attempt retry, and `buildPartialReport` fallback are unchanged — all enforced in `parseMatchReport` as before, so the model still cannot override the disqualifying-requirement code rule. Surface: 2 files (`apps/herald-ai/web/yamls/herald-auditor.yaml`, `apps/herald-ai/web/src/app/api/audit/route.ts`); **zero `packages/` changes** — the engine and adapter were consumed unchanged per the 7a/7b split (Vāda still untouched).

---

## June 15, 2026 — AEG Studio task-dependency-graph view (task 6)

### AEG
- **Task 6 (#99)** — Studio iteration pages now offer a graph view of the topology table. New route `/projects/<name>/iterations/<slug>/graph` reads the iteration via `@atta/aeg-core`'s `parseIteration` and renders `Task[]` as a directed graph with `@xyflow/react` (the React Flow library that powers `@atta/ui/engine-flow`). `dependsOn` edges are drawn as solid directed arrows ranked left-to-right by Dagre, with the arrow pointing from the upstream task to the dependent (so the visual flow is "earliest required → latest required"). `conflictsWith` edges are drawn as dashed, marker-less lines in `--warning`, deduplicated across the symmetric pair (`{a→b, b→a}` collapses to a single line). Custom `TaskNode` renders the task id, title, issue number, and project chips on a `--card` surface; a small legend in the section header tells the two edge types apart. The graph container is sized exactly to the laid-out content at `zoom=1` (the page scrolls vertically; the graph section scrolls horizontally only when wider than the viewport), reusing the auto-height pattern from `FlowGraph` for parity with how Vāda renders its Plan visualizations. A "View as graph" CTA on the iteration page links to the new route; the breadcrumb adds a `…/graph` segment with a return link to the topology table. **Zero edits to `@atta/ui/engine-flow`, `@atta/ui`, or shared Studio layout** (`StudioShell` / `StudioSidebar` untouched — kanban (#100) territory). `Tier: 1`. Verified locally against the live `aeg-ui-v1` iteration: the 9 tasks render with the correct `1→3`, `1→4`, `1→5`, `1→6`, `1→7`, `1→9`, `2→4`, `2→5`, `2→6`, `2→7`, `3→5`, `4→9` directed edges, plus the symmetric `4↔5`, `4↔6`, `5↔6` conflicts collapsed to three dashed lines. Closes #99.

---

## June 15, 2026 — `ModelPicker` tolerates missing `IdentityProvider` when `configuredRoutes` is supplied

### UI / Herald

- **Fix** — `packages/ui/libraries/basic/components/model/model-picker.tsx` previously called `useIdentity()` unconditionally, which throws when no `IdentityProvider` is mounted in the tree. Herald uses server-side BYOK (keys stored encrypted in Postgres, resolved at SSR) and does not mount `IdentityProvider`, so any page rendering `ModelPicker` — including `/settings` via `ProfileEditor` → `AuditModelSection` — crashed with `useIdentity must be used within <IdentityProvider>` despite the call site passing an explicit `configuredRoutes` prop. The fix: export `IdentityContext` from `@atta/identity/react` and read it via `React.useContext(IdentityContext)` inside the picker; when `configuredRoutes` is supplied by the caller, the picker no longer requires identity at all (`effectiveConfigured = configuredRoutes ?? (identity ? identityConfigured : new Set())`). The identity-driven path is preserved verbatim for Vāda / Atta / Attalabs (which mount the provider): when `configuredRoutes` is undefined the picker still derives the configured-vendor set from `identity.state.keys + identity.state.providers`. Herald's call site (`AuditModelSection.tsx`) is unchanged. No `IdentityProvider` added to Herald — the architectural mismatch (browser BYOK component coupled to a server-BYOK consumer) is fixed at the component boundary, not papered over.

---

## June 15, 2026 — Shared docs renderer in `@atta/aeg-core` + Studio docs section (task 7)

### AEG
- **Task 7 (#101)** — Adds a shared docs renderer to `@atta/aeg-core` (new `./docs` sub-export) and wires Studio's `/docs` route to it. The renderer is content-source-agnostic: pure helpers (`parseDocFrontmatter` / `deriveTitle` / `stripLeadingH1` / `buildDocNav` / `findDoc` / `getNextDoc` / `getPrevDoc`) take the markdown body + a list of `Doc` records, group them into ordered sections, and two React components (`DocSidebar` client, `DocPage` RSC) consume that model — no `fs` and no hardcoded paths inside `aeg-core`. The `/docs` route in `apps/aeg/web/studio` owns the I/O: `src/lib/docs/load-aeg-docs.ts` walks `aeg-root/` at the app boundary, derives `title` from the first H1 (frontmatter `title` overrides), `section` from the parent directory (`contracts/` → Contracts, `roles/` → Roles, `diagrams/` → Diagrams, `iterations/` → Iterations, `skills/` → Skills, root → Overview), and feeds the `DocNav` to the renderer. Markdown is rendered with `react-markdown` + `remark-gfm` rather than MDX — `<X>` placeholders in role docs (e.g. `roles/planner.md`) break MDX as unterminated JSX, and `aeg-root/**/*.md` has no JSX surface to preserve. `apps/aeg/web/studio/src/app/docs/page.tsx` redirects to `/docs/process` (the canonical entry doc per its own opening lines); `[...slug]/page.tsx` is the catch-all and statically prerenders all 22 aeg-root docs. **Zero edits to `StudioSidebar.tsx` / `StudioShell.tsx` / root `layout.tsx`** (task 2's planted `/docs` placeholder link is reused as-is; #98's territory is untouched). Built shared so the future Portal inherits it (D-001).

---

## June 15, 2026 — AEG Studio projects + iterations pages (task 4)

### AEG
- **Task 4 (#98)** — Studio sidebar now lists the repo's real projects (read from `aeg-root/projects.md` via `@atta/aeg-core`'s `parseRegistry`), and the navigational spine is wired: `/projects` (all projects) → `/projects/<name>` (project detail with active vs. archived iterations) → `/projects/<name>/iterations/<slug>` (iteration topology table from `parseIteration`). Active/archived is sourced from the file location (top of `aeg-root/iterations/` vs. `iterations/completed/`) per `iterations/README.md` §11 — the in-file `Lifecycle:` marker is parsed but not treated as authority. An iteration appears under a project when any task in its topology table declares that project, so cross-project iterations (`aeg-ui-v1` under both `aeg` and `aeg-core`) surface correctly under each. Surface: 4 new files in `apps/aeg/web/studio/src` (`lib/aeg-fs/`, `projects/page.tsx`, `projects/[name]/page.tsx`, `projects/[name]/iterations/[slug]/page.tsx`), plus modifications to `StudioShell.tsx` (now async, reads registry) and `StudioSidebar.tsx` (accepts `projects` prop, replaces the prior stubs). **Zero `@atta/ui` edits** (consumed only — Vāda/Herald not in blast radius). Semantic tokens only. Verified against this repo: `/projects` lists all 7 registered projects; `/projects/aeg` shows `aeg-ui-v1` under Active; `/projects/herald` shows `herald-onto-engine` under Active; `/projects/aeg/iterations/aeg-ui-v1` renders all 9 task rows with correct issue numbers, projects, depends-on and conflicts-with edges. Kanban (#100), graph (#99), and docs (#101) routes are intentionally untouched — they own their own surfaces in the serialized 4→6→5/7 wave.

---

## June 15, 2026 — N×M matrix audit UI in Bulk Audit (task 4)

### Herald
- **Task 4 (#91)** — Bulk Audit now accepts N CVs (Herald usernames, max 10) × M job descriptions (max 5) and renders one forensic match report per pair as an N×M grid, replacing the previous single-JD stacked view. Pure UI work in `apps/herald-ai/web/src/components/audit/BulkAudit.tsx` — `/api/audit`, `runSingleMatch`, the `extractSignals` pre-fetch, the SHA-256 cache, the 25s LLM timeout, the NO-FIT hard-requirement gate, and `buildPartialReport` are consumed unchanged. The matrix fans out client-side: for each (cv, jd) pair the UI POSTs `{ jd, candidates: [username] }` to the existing batch shape, so the in-route 10-candidate cap and existing validations are trivially respected. Each cell tracks its own `loading | loaded | error` state — a failed pair (HTTP error or `report: null` from the API) shows a destructive error card while sibling cells continue to render their `ReportView` (reused as-is from the single-pair path). Inputs use a dynamic JD list (add/remove, cap 5) plus the existing newline-separated username textarea (cap 10); column headers show truncated JD previews. No `@atta/ui` source edits, no engine/adapter edits, semantic color tokens only (one inline-style exception: runtime-computed `gridTemplateColumns: repeat(M, …)` — values not expressible in Tailwind). Closes #91. (`herald-onto-engine` task 4.)

---

## June 14, 2026 — Custom client-side tool execution in `@atta/adapter-langgraph` (task 7a)

### Engine / adapter
- **Task 7a (#102)** — Adds custom client-side tool execution to `@atta/adapter-langgraph` as an additive, opt-in capability. The adapter previously supported only Anthropic-executed server tools (`web_search`, `web_fetch`); there was no loop for app-supplied TypeScript handlers. 7a builds that loop with a trivial throwaway tool (`add(a,b)`) covered by unit tests — Herald's real GitHub tool is task 7b, deliberately not bundled here. Surface shape: agents declare tool specs in YAML (`custom_tools: [{ name, description, parameters }]`, threaded through `flow-schema` → `flow-loader` → `compile-flow` → `Plan.agents`); the app registers handlers on the adapter (`LangGraphAdapter({ customTools: { add: async ({a,b}) => a+b } })`); the Anthropic vendor branch in `llm.ts` routes to a new bounded multi-turn loop (`runAnthropicCustomToolLoop`, capped at `MAX_CUSTOM_TOOL_ITERATIONS = 10`) only when the agent declares a custom tool AND a matching handler is registered AND the agent has no `outputSchema`. The gate `resolveRegisteredCustomTools` is extracted as a pure function and is the single source of truth — six additivity-invariant tests prove it returns `[]` for every Vāda case. The 31 existing adapter tests stay green unchanged; combined with the gate tests, this is the byte-identical proof. Diff scope: 11 files in `packages/{adapter-langgraph, engine, atta-agents}`, **zero `apps/` changes**. D-047 logged (Status ACTIVE, Type 1, Lock NO).

---

## June 14, 2026 — Herald per-key rate limit on profile audits

### Herald
- **Task 6 (#93)** — Closes the D-033 abuse hole: strangers running audits on a published profile spend the owner's BYOK key, previously bounded only by a per-IP cap (5/h) — distributed callers (rotating IPs) could still drain the owner's budget. New per-owner-key limiter (30 audits/h, prefix `herald:audit:owner`, keyed on the profile owner's `clerkId`) runs inside `app/api/audit/route.ts handleSingle` right after the owner is resolved by `username`. Scoped to the single-shape profile-audit path only — the batch shape runs on the logged-in user's own key and is lower priority. Both limiters now share `src/lib/rate-limit.ts`; `proxy.ts` imports the per-IP instance unchanged (existing Upstash bucket preserved via `herald:match` prefix). Fail-open semantics mirror the per-IP limiter: missing env vars or limiter errors log a warning and allow the request — today's Upstash creds are expired (known backlog), the mechanism activates with refreshed creds. Conservative 30/h cap chosen to cover a launch-day flurry (5–10 distinct recruiters × 2–3 audits) while bounding worst-case owner spend at ~30 LLM calls/h.

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
