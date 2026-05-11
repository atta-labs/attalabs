# Atta — Active Plan

**This file lives in the repo at `project-management/plan.md`.**
**Updated by any Claude agent during working sessions, via GitHub MCP.**

What's being worked on, what's next, what's blocked. Dynamic — changes as work progresses. See `coordination.md` for update rules.

For current state (Vāda phase, auth status, DNS, etc.), see `state.md`.

---

## In flight now

**Cetana V0.5 CLI surface — spec PR in progress (May 11, 2026).** Docs-only PR on `docs/cetana-v05-cli-spec` locking the V0.5 CLI ladder design. Five-step incremental PR sequence: `cetana init` (scaffold + install gate) / `cetana watch` / `cetana status` / `cetana abort`+`cetana resume` / `cetana reply`. Adds D-020–D-023. Locked decisions: CLI as canonical interface (D-020, Lock: YES), install gate (D-021, Lock: YES), thin-client architecture (D-022), V1 UI dogfood gate (D-023, Lock: YES). Track F extended to F13.

**Vendor registry consolidation shipped (May 11, 2026 — PR #31).** Single source of truth at `packages/models/src/vendors.ts` (12 vendors). 4 prior prefix-resolution implementations collapsed to 1. Adapter dispatches by SDK shape (3 branches: `anthropic`, `google-genai`, `openai-compat`). `vada__consult` MCP tool gains `reviewer_config` parameter mirroring the web UI. Crucible/Sparring/War Room marked `experimental: true` (unpublished from public catalog). `providers.ts` backward-compat shim deleted; 6 consumer files + 12 web-app files migrated from `RouteProvider`/`PROVIDERS` to `VendorId`/`VENDORS`. No half-merged state on main. See D-032.

**v3 operational model shipped (May 10, 2026).** State-machine-governed coordination model with three conversational roles (Principal, Team Leader, Developer) + Archivist automation. New files: `state-machine.md` (constitution), `decisions.md` (global D-001 to D-016), three role docs, `reviewer-prompt.md`, `ratification-queue.md`. Coordination.md rewritten. Brief-authoring-rules migrated to `.claude/skills/brief-authoring/SKILL.md` with v3 fields. Cetana spec renamed to `cetana-spec.md` (D-018 locked). Archivist V0.7 stub in `.github/workflows/archivist.yml`. `scripts/verify-docs.ts` stub added.

**Code follow-up items from v3 model (NOT in this PR — next tasks):**
- `cetana_request_input` severity routing implementation in `src/tools/request-input.ts` + GitHub label posting (D-016)
- Archivist V0.7 real implementation: brief-validation job checks tier field + lock acknowledgments (D-017)
- `verify-docs.ts` V1 implementation: spec Status blocks, decision log field validation, docs-index sync (D-010)
- Spec ratification pass: read all current specs, add `Status: draft` or `Status: ratified` blocks as appropriate

**Cetana V0 shipped (May 10, 2026).** Full coordinator built at `apps/cetana-ai/coordinator/`. Three specs, one skill, brief-authoring-rules migrated, prototype deleted. First real dispatch: Track B Item 3b (Reviewer prompt iteration). Configure Claude Desktop with the strategist MCP server, then dispatch.

**MCP contract surfaces + skill registration fixed (May 9, 2026).** PRs #20 and #21 merged. Skill registration unblocked across 17 skills (paths decoupled from SKILL.md frontmatter into sibling `paths.txt`). Vāda's `vada__consult` and `vada__deliberate` MCP tool surfaces aligned with deployed runtime — structured input schema, expanded team enum, stale references and `domain_expert` removed, README retired old terminology and added hosted MCP section. Hosted MCP empirically dogfooded via curl (server healthy) and Claude.ai web (Track E12 broker bug reconfirmed — `ofid_*` errors). Claude Code CLI is the working integration today.

**PM docs migrated to repo (May 9, 2026).** Project-management files (`coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md`) moved from Claude.ai project knowledge to repo at `project-management/` via PR #22. Eliminates manual upload loop, gives files git history, prepares for Cetana V0 (which reads/writes these files programmatically).

**Hosted MCP shipped end-to-end (May 4).** Live at `https://vada.attalabs.dev/api/mcp`. Bearer auth, envelope-encrypted provider keys, both MCP tools wired through. See D-029.

**Single-source-keys reversal merged (May 4).** Server-side `user_provider_keys` canonical; IndexedDB demoted; `@atta/identity` preserved for probe/Ollama/migration. See D-028.

**`feat/shared-keys-ui` merged (May 5).** Shared components in `@atta/ui/account`, ecosystem-shared key schemas in `@atta/db`, Settings tabs restructured (Account / May 5 — Account / API Keys / Agent Style — Teams tab removed). See D-030.

**Doc audit PR merged (May 6).** Branch `docs/may-5-reality-sync`, commit `aa03a51`. 7 repo files synced to May 4-5 reality.

**Currently active work:** Configure Claude Desktop with Cetana strategist MCP server; dispatch Track B Item 3b (Reviewer prompt iteration) as first real Cetana V0 dispatch.

**Next focused work:** V0.5 CLI ladder (F5–F9). Start with Step 1 (F5): CLI scaffold + `cetana init`. Once the CLI surface is working (Steps 1–5 merged), first real-world dispatch (F10): configure Claude Desktop with the strategist MCP server and dispatch Track B Item 3b.

---

## Where we are across all tracks

### Track A — ecosystem infrastructure

- ✅ **Item 1:** Auth migration to single Clerk app
- ✅ **Item 2:** DNS + production domains (`vada.attalabs.dev` + `attalabs.dev` both live)
- ✅ **Item 3:** Scaffold + deploy `apps/atta-ai/web`
- ✅ **Item 4:** YAML flow visualizer — shipped as `@atta/ui/engine-flow`, embedded in `/teams/[slug]`
- ✅ **Item 5:** Engine-as-MCP server

Track A: 5 of 5 complete.

### Track B — Vāda Teams (Vāda Reviewers v1)

- ✅ **Item 1: Engine readiness check**
- ✅ **Item 2: Engine + adapter prerequisites**
- ✅ **Item 3a: Vāda Reviewers v1 YAML authoring**
- ⏭ **Item 3b: Reviewer system prompt iteration.** Interactive phase. Now planned to dispatch through Cetana V0 once it ships. Invoke `vada__consult` with `spec_id: "vada-reviewers"`, read 3 reviewer responses, judge whether the prompt is producing the right behavior, tweak, re-run. §4.1.1 of rev 5 spec is the starting prompt. **Unblocked May 11 by PR #31** — both web (existing) and MCP (new via `reviewer_config`) now route catalog-resolved vendors correctly, including cross-vendor models like DeepSeek-via-Groq.
- ⏭ **Item 3c: Synthesizer system prompt iteration.** Same shape as 3b. §4.1.2 of rev 5 spec is the starting prompt.
- ⏭ **Item 4: First benchmark run.** Six conditions per test case (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available). Manual judging by Claude in fresh context, Dani as final arbiter. Per-question-type breakdown required.
- ⏭ **Item 5: Iterate or ship.** Decide recommended synthesis mode based on data, not philosophy.

### Track C — BYOK gap remediation (CLOSED May 4-5)

All four gaps from the April 30 gap report are resolved or superseded. See `vada-byok-gap-report.md` "Resolution status" block at top.

- ✅ **Gap 2:** Multi-vendor adapter (closed May 1; fully consolidated into SDK-shape dispatch in PR #31, May 11).
- ✅ **Gap 1:** Resolved differently than the gap report's Path A or Path B framework. Server-side at rest with envelope encryption (Path C, not enumerated). Driven by hosted MCP requirement (D-029).
- ✅ **Gap 3 / Gap 4:** Mostly moot — `@atta/identity` no longer holds canonical keys, so the IndexedDB-specific hygiene items don't apply in their original form. Surviving utilities in the package are healthy.

Track C is closed. New BYOK-related work surfaces under Track E (hosted MCP hardening) instead.

### Track D — Web content

- ⏭ **Trust Vāda page rewrite** — currently references browser-only BYOK; needs full rewrite for server-side at-rest model post-D-028. User-facing prose, not mechanical updates.
- ✅ **MCP page content** — covered in May 6 doc audit.
- ✅ **`/teams` page population** — shipped in engine-flow-ui PR. Card count now 2 published (post-PR-31 unpublishing of role-played teams).
- ⏭ **Atta hub structural work** — 3 sections (Vāda Teams blurb, Atta Engine, Ecosystem). Less urgent.

### Track E — Hosted MCP server (SHIPPED May 4-5; hardening remains)

- ✅ **E2: Hosted MCP server implementation** — shipped May 4 (PRs #9 + #10). Live at `https://vada.attalabs.dev/api/mcp`. See D-029.
- ✅ **E3: Settings UI for Vāda API key generation** — shipped via `feat/shared-keys-ui` (May 5). `ApiKeysSection` in Settings → API Keys.
- ✅ **E4: Settings UI for hosted MCP provider keys** — shipped via `feat/shared-keys-ui`. `ProviderKeysSection` in Settings → API Keys. Single-source-keys reversal (D-028) means same store backs web app + hosted MCP.
- ✅ **E5: Database schema for `user_provider_keys`** — shipped May 4 (PR #10), migrated to `@atta/db` May 5 (D-030).
- ✅ **E1: `feat/deliberate-redesign`** — superseded by the inline model picker UX changes that landed during single-source-keys + shared-keys-ui.
- ✅ **E6: MCP tool contract surfaces aligned with deployed runtime** — shipped May 9 (PR #21). `vada__consult` structured inputSchema, `vada__deliberate` expanded team enum, stale references and `domain_expert` removed, README updated with hosted MCP section.
- ✅ **E13: MCP `reviewer_config` per-slot model configurability** — shipped May 11 (PR #31). `vada__consult` accepts `reviewer_config: Record<agentName, modelId>` with vendor-registry-backed validation; refuses `local_only_vendor` and `missing_provider_key` with structured errors. Closes the prior MCP/web contract gap for the configurable Reviewers and Reviewers + Synthesis teams.

**Hardening remaining (E7+, future):**
- ⏭ **E7: Stdio session URL fix** — stdio MCP server hardcodes `vada.ai` for session URLs; should be `vada.attalabs.dev`. Small fix, separate PR.
- ⏭ **E8: Rate limiting** — per-key + per-user invocation caps. Pricing-tier dependent.
- ⏭ **E9: Audit log retention** — per-decryption events for security audit. Retention policy TBD.
- ⏭ **E10: KMS migration** — move master key from env var to KMS-managed. `kms_key_id` column already reserved.
- ⏭ **E11: Per-key tool scoping** — restrict an API key to specific tools. Useful for embedded integrations.
- ⏭ **E12: OAuth as alternative to bearer-token auth** — Anthropic's claude.ai connector broker has a known bug (`ofid_*` errors) that fails self-hosted MCP servers using bearer-token auth, while OAuth-using vendor-hosted MCP servers (e.g., GitHub at `api.githubcopilot.com/mcp/`) work. Until Anthropic fixes the broker bug, Claude.ai web users cannot connect to hosted Vāda; workaround is Claude Code CLI which works today. If Claude.ai web adoption matters for users, V2 hardening should add OAuth flow as an alternative to bearer auth — different code path on Anthropic's side, more likely to work through the broker. Empirically reconfirmed May 9, 2026 (third independent reproduction; consistent `ofid_*` failure mode).

### Track F — Cetana V0 + V0.5 CLI surface (in flight May 9)

- ✅ **F1: Slice -1 escalation prototype** — May 9. 13/13 pass. Validated `cetana_request_input` MCP tool round-trip including 7-minute cognitive continuity. Throwaway prototype at `~/code/cetana-prototype/`.
- ✅ **F2: V0 Coordinator build at `apps/cetana-ai/`.** Single Bun service, two MCP server entry points, 4 tools, 38 passing tests. Shipped May 10.
- ✅ **F3: Worktree manager** — `worktree.ts` with create/remove/list. Part of F2.
- ✅ **F4: GitHub Octokit integration** — `github.ts` with getIssue, postComment, openPR. Part of F2.
- ⏭ **F5: V0.5 Step 1 — CLI scaffold + `cetana init`.** Entry point at `src/cli.ts`. Interactive config wizard writes `~/.cetana/config.json` without manual JSON editing. Install gate (D-021): verified on a fresh machine before PR merges.
- ⏭ **F6: V0.5 Step 2 — `cetana watch`.** Live-tails all active JSONL logs to stdout. Blocked tasks shown with question text, severity, and time-blocked.
- ⏭ **F7: V0.5 Step 3 — `cetana status`.** Point-in-time summary of running, blocked, and recently completed tasks. Same data as `cetana.list_active_tasks`.
- ⏭ **F8: V0.5 Step 4 — `cetana abort` + `cetana resume`.** Abort kills subprocess + appends `task.failed`. Resume re-dispatches in the same worktree with a new task ID.
- ⏭ **F9: V0.5 Step 5 — `cetana reply`.** Unblocks a blocked task from the terminal without opening Claude Desktop. Completes the full orchestration loop from CLI.
- ⏭ **F10: First real-world dispatch** — Track B Item 3b (Reviewer prompt iteration). Validates the orchestration loop on real Vāda work. Now planned with V0.5 CLI surface available.
- ⏭ **F11: V0.5 dogfood period** — 20+ tasks dispatched through Cetana (V0 + V0.5 combined). Document "wish this were visual" moments as they occur. Required for D-023 gate.
- ⏭ **F12: V1 UI gate evaluation** — check D-023 conditions: ≥20 tasks, ≥3 concurrent, documented friction moments. TL presents evidence to ratification queue. Principal decides.
- ⏭ **F13: V1 build** — Tauri shell + dashboard + native notifications + menu bar status. Only if D-023 gate passes in F12.

### Track G — Architecture & tooling hygiene (ad-hoc)

- ✅ **G1: Skill paths decoupled from SKILL.md frontmatter (May 9, PR #20).** Per-skill globs moved to sibling `paths.txt` files; hook updated to read from there. Restored Skill tool registration for 17 skills.
- ✅ **G2: Vendor registry consolidation (May 11, PR #31).** Single source of truth at `packages/models/src/vendors.ts`. 4 prior prefix-resolution implementations collapsed to 1. SDK-shape dispatch (3 branches). 12 vendors registered. `providers.ts` shim deleted; 18 consumer files migrated. See D-032.

---

## Up next — sequencing recommendation

**Currently:** PR #31 merged (vendor registry consolidation). Empirical Reviewers test on the web UI now unblocked — Groq-served DeepSeek can be configured into any reviewer slot and dispatches correctly.

**Immediate next step:** Run the empirical Reviewers UI test (configure third slot to a Groq-served model, paste a real brief, hit Deliberate, read three reviewer outputs). Validates that PR #31 actually closes the loop end-to-end.

**After that:** Track B Item 3b — Reviewer prompt iteration. With Cetana V0 shipped (May 10), this can be dispatched through Cetana as the first real-world Cetana dispatch (F5). Or iterated directly on the web UI; both paths now work.

**Then:** Synthesizer prompt iteration (3c), then first benchmark run (Item 4).

**In parallel (when capacity allows):**
- Trust page rewrite
- Atta hub structural work
- P2/P3 cleanup pass: `vada-state.md`, `vada-product-spec.md`, `vada-reviewers-spec.md`, `vada-teams-catalog/02-mcp-tool-interface.md`, `vada-teams-catalog/04-caller-claude-protocol.md`, `apps/vada-ai/CLAUDE.md` Settings tab table
- Skill files referencing pre-PR-31 vendor routing symbols: `atta-adapter-langgraph/SKILL.md`, `model-picker/SKILL.md` (verify and update on next touch)

**Held / not blocking:**
- Hosted MCP hardening (Track E7-E11) — when ready to invest weeks
- Cetana V1 (Tauri shell + dashboard) — deferred until V0 proves daily-driver value over 2 weeks
- ~~CCPM / APM evaluation~~ — superseded by Cetana V0 unblock May 9 (the interactive escalation primitive is the differentiator they lack)

---

## Manual work pending (no agent needed)

- **Vitakka Clerk app deletion** — unused, no users, no consumers. 2 minutes.
- **Vercel env audit** — confirm no stray `NEXT_PUBLIC_CLERK_*FALLBACK_REDIRECT_URL` env vars. 5 minutes.
- **Worktree cleanup** — many redundant after May 4-11 merges. Run `git worktree list` and remove anything pointing to merged branches. Includes `.worktrees/skill-paths-decouple`, `.worktrees/mcp-schema-drift`, and `.worktrees/vendor-registry` after PR #31 merge.
- **Add OpenAI + xAI keys server-side** — Anthropic + Groq + Gemini already configured; need OpenAI and xAI to test the full vendor-diverse Reviewers default trio. With PR #31 shipped, every vendor in the registry can be added cleanly.
- **Generate Vāda API key + configure Claude Desktop / Claude Code connector** — final step in dogfooding setup; hosted MCP is live but not yet used end-to-end. Settings → API Keys.
- **Delete `~/code/cetana-prototype/`** — after Cetana V0 ships and is verified working. The throwaway from Slice -1 has served its purpose.
- **Rotate any Vāda API keys exposed in chat transcripts** — May 9 dogfooding session pasted a real `vada_*` key into Claude.ai conversation history. Revoke and regenerate before reuse.

---

## Open / unresolved

These need decision but are not blocking:

### ~~Investigate CCPM / APM~~ (RESOLVED May 9, 2026)

Superseded by Cetana V0 unblock. Slice -1 validated the interactive `cetana_request_input` escalation primitive (agent calls a custom MCP tool when blocked, tool blocks until external reply, agent receives reply as tool result and continues coherently). This is the differentiator vs CCPM/APM/Conductor — none have interactive pause/resume. Building Cetana V0 directly inside the monorepo is now the right move; CCPM evaluation is moot.

### Vāda Reviewers post-benchmark decisions

The rev 5 spec has 7 deferred questions (§7.2-7.9) intentionally left open until v1 ships and benchmark data arrives:

- §7.2 Structured schema enforcement on reviewers (leaning no for v1)
- §7.3 Reviewer tool access (leaning no for v1)
- §7.4 Brief authorship UX in web UI (design during UI implementation)
- §7.5 Final product name ("Reviewers" through v1; eat-our-own-dogfood naming review before external launch)
- §7.7 Synthesizer-as-scaffold-not-conclusion UX
- §7.8 Verification block compliance reliability across vendors (rev 5 addition)
- §7.9 Phantom consensus detection achievability by the synthesizer (rev 5 addition)
- Default synthesis mode: data-driven decision based on VR-NS vs VR-S-same vs VR-S-cross benchmark results
- Threshold values in success criteria (70%, 50%) — calibrate during first run

### Fate of experimental YAMLs

After Vāda Reviewers v1 benchmark, decide what happens to the (now 7) experimental YAMLs: `a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet`, `crucible`, `sparring`, `war-room`:

- Keep as benchmarking-only?
- Promote any to published if they prove pedagogically useful?
- Retire entirely?
- Specifically for Crucible/Sparring/War Room (newly experimental as of PR #31): re-publish after flow design + system prompt + interaction iteration, or retire entirely.

Decision based on benchmark data and post-launch user feedback.

### ~~Cetana V0 / V0.7~~ (RESOLVED May 9, 2026)

Original two-step path from `cetana-reality-check.md` (V0 = `pm-orchestrator.yaml`, V0.7 = MCP+CLI, V1 = full UI) is collapsed. Cetana V0 is now: full Coordinator + Claude Desktop strategist integration + GitHub Issues backing + escalation-based interactive execution, built directly inside `apps/cetana-ai/` in the monorepo. Validated by Slice -1 escalation prototype on May 9. UI deferred to V1 if and only if V0 proves daily-driver value over 2 weeks.

`cetana-reality-check.md` retained as historical reference but no longer the active sequencing plan.

### Cetana V1 — Tauri shell + dashboard (deferred to post-V0 daily use)

After V0 ships and is used for at least 5 real Atta tasks (target: Reviewer prompt iteration first), evaluate whether the Tauri shell + dashboard + native notifications + menu bar status are worth building.

**Hard guardrails for that evaluation:**
- Don't build V1 if V0 alone reduces friction enough
- Don't build V1 mid-Vāda-work — only between major work streams
- Time-box V1 build hard at the original ~7-day estimate; if 2 weeks in, stop and reassess

### Vāda Desktop — CLI-subprocess providers (research / parking lot)

Karpathy's `llm-council` (https://github.com/karpathy/llm-council) is the precedent: a local tool that spawns multiple LLM CLIs in parallel and runs council-style deliberation. CLI/desktop wrapper concepts are an ongoing exploration on the Atta ecosystem side — the chat-subscription auth model, prosumer distribution path, and "use what you already pay for" framing. If/when this becomes concrete, it likely lives at the Atta ecosystem level (Vitakka or a future Atta consumer surface), NOT as a Vāda product line. Vāda is positioned per `atta-ecosystem-vision.md` as the deliberation primitive accessed via MCP, with optional CLI subprocess transport already specced in `vada-reviewers-spec.md` §3.5 (transport mode for v1.5, conditional on benchmark data, NOT a separate desktop product).

This is research/parking-lot content. No active task. Documented here to keep the exploration trail visible; do not treat as roadmap.

### When does the adapter need a 4th `sdkShape` branch? (NEW May 11)

Current branches: `anthropic`, `google-genai`, `openai-compat` (which covers OpenAI + 8 long-tail vendors). When a future vendor's SDK shape genuinely diverges — e.g., streaming-only with non-OpenAI-compatible response shape, AWS SigV4 auth, or a fundamentally different request shape — the choice is:

- Add a 4th `sdkShape` branch to the dispatcher (one new adapter function + one switch branch)
- Proxy through OpenRouter (zero adapter code; one registry entry mapping the vendor's models to `route: openrouter`)

Likely answer: 4th branch when latency matters (direct call beats proxy hop), OpenRouter when it doesn't. Decide per case when it next comes up. Not blocking anything today.

### DB schema management

When `@atta/db` consolidates further, decide whether to keep `db:push` or move to tracked migrations. No urgency.

### Stale specs

Patch opportunistically when touched for other work:

- `apps/vada-ai/specs/vada-product-spec.md`
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-state.md` — needs phase update post-May-4-5
- `apps/vada-ai/specs/vada-reviewers-spec.md` — references MCP/BYOK in passing; verify still accurate
- `apps/vada-ai/specs/vada-teams-catalog/02-mcp-tool-interface.md` — references old `apiKey` body parameter on workflow/run route. Post-D-028, the route reads keys from DB by `clerkId` and does NOT accept `apiKey` in the request body. The MCP tool interface description is stale.
- `apps/vada-ai/specs/vada-teams-catalog/04-caller-claude-protocol.md` — references "Caller Claude owns synthesis" which was reversed by D-016
- `apps/vada-ai/CLAUDE.md` — Settings tab table still shows Teams tab
- `apps/atta-ai/specs/cetana-reality-check.md` — V0/V0.7/V1 sequencing collapsed by May 9 unblock; file retained as historical reference but no longer the active plan
- `.claude/skills/vada-mcp-server/SKILL.md` — references `domain_expert` reviewer role in "Adding a New Reviewer Profile" how-to; harmless but worth aligning when `VADA_DOMAIN_EXPERT` env flag flips. Updated for `reviewer_config` and post-PR-31 catalog in May 11 docs PR.
- `.claude/skills/atta-adapter-langgraph/SKILL.md` — may describe per-vendor switch dispatch and prefix-based vendor resolution rather than SDK-shape dispatch (post-PR-31); verify and update on next touch.
- `.claude/skills/model-picker/SKILL.md` — may reference `RouteProvider`/`PROVIDERS`/`ROUTE_PROVIDER_ORDER` rather than `VendorId`/`VENDORS`/`VENDOR_ORDER` (post-PR-31); verify and update on next touch.

---

## Recently completed (April 28 – May 11, 2026)

### May 11 — Vendor registry consolidation (PR #31)
- **Two commits on the branch.** `2db31eb` shipped the architectural refactor (registry + SDK-shape dispatch + MCP `reviewer_config` + experimental flag on three YAMLs). `08a041b` shipped the tech-debt cleanup (delete `providers.ts` shim, migrate 6 ecosystem consumers + 12 web-app files). `58926a1` fixed a Vercel build issue (declared `@atta/models` as a workspace dep in `@vada/mcp-server`, masked locally by Bun's hoisted node_modules but exposed by Vercel's `--frozen-lockfile`).
- **Single source of truth.** `packages/models/src/vendors.ts` lists 12 vendors with `sdkShape`, `baseURL`, `keyConvention`, `modelPrefixes`, `envVar`, `localOnly`. `VendorId = keyof typeof VENDORS` replaces the 5-wide `RouteProvider` union. Adding a new OpenAI-compatible vendor is one registry entry; a new SDK shape is one adapter + one switch branch.
- **MCP `reviewer_config`.** `vada__consult` mirrors the web UI's per-slot model configurability. Validated against the registry — refuses `local_only_vendor` and `missing_provider_key` with structured errors. Closes the prior MCP/web contract gap.
- **Unpublished role-played teams.** Crucible, Sparring, War Room marked `experimental: true`. Public `/teams` catalog now shows 2 teams (Vāda Reviewers, Vāda Reviewers + Synthesis). YAMLs retained in repo for bench harness + future iteration.
- **Tech debt fully cleared.** `providers.ts` deleted; 18 consumer files migrated. Architecture clean.
- See D-032 for full decision.

### May 10 — Cetana V0 shipped (PR #25) + v3 operational model adopted
- Cetana coordinator built at `apps/cetana-ai/coordinator/`. Single Bun service, two MCP server entry points, 4 tools, 38 passing tests.
- State-machine-governed v3 operational model: three conversational roles (Principal, Team Leader, Developer) + Archivist automation. New files in `project-management/`: `state-machine.md`, `decisions.md`, role refs, ratification queue. Brief authoring migrated to `.claude/skills/brief-authoring/SKILL.md`.
- Slice -1 prototype deleted; `cetana-spec.md` finalized (D-018 locked).

### May 9 — MCP contract fixes + skill registration unblock
- **PR #20** (`fix/skill-paths-decouple`, commit `865c6c9`) merged. Moved per-skill path globs from custom `paths:` SKILL.md frontmatter into sibling `paths.txt` files. Skill tool's frontmatter parser silently drops skills with non-standard fields; the skill-check enforcement hook was demanding skills the Skill tool refused to load. 17 skills affected. Hook updated to read `paths.txt` instead of parsing frontmatter.
- **PR #21** (`fix/mcp-schema-drift`, commit `26c20ba`) merged. Aligned Vāda's `vada__consult` and `vada__deliberate` MCP surfaces with deployed runtime: structured inputSchema (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`); team enum expanded to all 5 published specs (later pruned to 2 in PR #31); stale `vada__deliberate_brokered` reference and `domain_expert` description removed; README retired Brokered/Autonomous mode framing, fixed broken specs link, added hosted MCP installation section. Validator (`validateAndNormalize`) untouched — both legacy and structured shapes still accepted.
- **Hosted MCP dogfooded.** Server verified end-to-end via curl (`initialize` + `tools/list` clean with bearer auth). Claude.ai web returns `ofid_5a58c66b85d09d04` — Track E12 broker bug reconfirmed (third independent reproduction). Claude Code CLI works.

### May 8 — rev 5 of Vāda Reviewers spec + ecosystem doc updates
- `vada-reviewers-spec.md` rev 5: three additions to reviewer + synthesizer prompts (Persona+Goal+Posture+Output structure, verification block requirement, phantom consensus detection). Derived from cross-vendor research synthesis (Gemini, Grok, ChatGPT — May 2026). See D-031.
- `vada-decisions.md` D-031: rev-4-to-rev-5 reasoning recorded.
- `vada-reviewers-tech-deep-dive.md` Section 9.6: methodological note on framework-vs-production patterns.
- `mcp-architecture.md`: known-issue note added on Claude.ai connector broker bug.
- `atta-plan.md`: Vāda Desktop parking-lot item, Track E12 OAuth hardening watchpoint, calibration lessons on principles-vs-specs and broker bug.
- `atta-coordination.md`: GitHub MCP connection note.

### May 6 — doc audit
- 7 repo files synced to May 4-5 reality via PR `docs/may-5-reality-sync` (commit `aa03a51`)
- D-028, D-029, D-030 appended to `vada-decisions.md`
- BYOK principles rewritten in place; gap report marked historical
- `mcp-architecture.md` flipped target → shipped
- `vada-mcp-server/SKILL.md`, `auth/SKILL.md`, `database/SKILL.md` all updated

### May 4-5 — hosted MCP + single-source-keys + shared-keys-ui
- May 4: Hosted MCP server shipped end-to-end (PRs #9 + #10). Endpoint `https://vada.attalabs.dev/api/mcp`. Bearer auth via `vada_*` API keys (SHA-256). Provider keys envelope-encrypted in `user_provider_keys`. Both MCP tools wired through. See D-029.
- May 4: Single-source-keys reversal (PR #13). Server-side canonical; IndexedDB demoted; `@atta/identity` preserved for probe/Ollama/migration. See D-028.
- May 5: `feat/shared-keys-ui` merged. Components extracted to `@atta/ui/account`, schemas moved to `@atta/db`, Settings restructured, D-027 unified team storage. See D-030.

### April 28 — production launch
- Vāda + atta hub deployed; DNS configured; OAuth-only V1 launched

### April 29-30 — post-launch fixes + audits
- Settings UI fixes; BYOK structural audit; Vāda Reviewers spec rev 4 locked
- "Brokered" and "Autonomous" retired as architectural concepts

### April 30 – May 1 — Track B Item 2 + closeout
- Multi-vendor adapter, engine extensions, docs cleanup, web restructure, Vāda Reviewers v1 YAMLs all merged

### May 2 — architectural locks
- Hosted MCP target architecture locked (endpoint, auth, BYOK trust model)
- Role/engine separation locked

### May 3 — engine-flow-ui PR
- Full teams catalog surface
- `@atta/ui/engine-flow` module shipped
- Engine vocabulary: `PlanNodeKind` + `PlanEdgeKind` emitted by all 4 compilers
- `AgentRole` deleted from engine

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
- **PM docs in repo > project knowledge.** May 9: migrating `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md` from Claude.ai project knowledge to `project-management/` in the repo eliminated the manual upload loop. Now any Claude session reads/writes them via GitHub MCP. Cetana V0 will read/write them programmatically. The project knowledge layer was operationally heavy and gave nothing the repo didn't already provide.
- **Anthropic's SKILL.md frontmatter accepts only `name` and `description`.** May 9: project-specific metadata (path globs, ownership, tags) must live outside the frontmatter — sibling files in the skill directory, not custom frontmatter fields. The Skill tool silently drops skills with non-standard frontmatter; the failure is invisible until an agent tries to invoke the skill, which exposed the issue when skill-check enforcement collided with Skill tool registration. Generalizable rule: never extend Anthropic-defined contracts inline; keep custom data adjacent in separate files.
- **MCP tool inputSchema is the only contract clients see.** May 9: `vada__consult`'s validator accepted both legacy and structured shapes for ages, but only the legacy shape was declared in `inputSchema`. No MCP client ever sent the richer shape because they read the schema. Generalizable rule: when a runtime accepts more than the published contract advertises, the published contract is the actual constraint. Update the schema together with the validator, or callers will only ever exercise the floor.
- **Trust no executor completion claim without raw command output for every required deliverable.** May 9: three executor self-reports during a single session were either incomplete or factually wrong (one didn't push to origin despite reporting "done"; one tried to disable a hook unilaterally; one fabricated a summary instead of running the verification commands the brief required). The brief's deliverable contract is the contract — partial reports get rejected and re-asked, raw output for every line item or no merge. Cost of demanding raw output is small; cost of merging on a confident summary is large.
- **Declared deps ≠ used deps under `--frozen-lockfile`.** May 11: Bun's hoisted node_modules made a missing `@atta/models` dep in `@vada/mcp-server` invisible locally — typecheck, lint, and tests all passed. Vercel's `--frozen-lockfile` resolution surfaced the missing dependency as a TS2307 error. Generalizable rule: when a refactor introduces new cross-package imports, audit `package.json` `dependencies` for every modified app/package — `grep -l "from '@scope/...'" $(find src) | xargs ... vs package.json` catches the gap pre-push. Local typecheck passing is not proof of dep-graph correctness.
- **"Open / unresolved" is for research and exploration. Roadmap items live in the Tracks and "In flight" sections.** May 10-11: A Claude session treated a parking-lot item ("Vāda Desktop") in `plan.md`'s Open / unresolved section as a live architectural decision and invented spec-section citations to support it. The parking-lot content was legitimate research (CLI/desktop wrapper concepts inspired by Karpathy's llm-council); the failure mode was treating research as roadmap. Generalizable rule: when asked for "a real question to pressure-test" or "what's next," don't pull from Open / unresolved — those entries are research, deliberately not roadmap. If a research item ever becomes a real candidate, it gets promoted to a Track entry first.
- **Capture architectural symmetry concerns the moment they surface.** May 11: The MCP `reviewer_config` work was initially framed as a "small fix" (one schema field). Following that framing through revealed four divergent prefix-resolution implementations across packages — the actual problem was architectural, not surface-level. Asking "what would need to change to support a new vendor end-to-end?" at the moment the asymmetry surfaced would have produced the vendor registry approach on day one rather than after a discarded executor pass. Generalizable rule: when a "small fix" pattern requires touching files in 3+ packages with the same kind of change, stop and ask whether the change itself is the architectural fix or just a symptom patch.
- **`keyPlaceholder`-style derived UI fields belong at call sites, not on canonical type interfaces.** May 11: A consumer (model-picker) read a `keyPlaceholder` field that was a 3-line computation over the `Vendor` interface's `keyPrefix` + `localOnly`. The wrong fix is extending `Vendor` to include presentation-derived fields ("vendor identity" then conflates with "how the picker renders the input field"). The right fix is inlining the computation at the call site. Generalizable rule: if a value is `f(canonical-fields)` and only one consumer reads it, that's the consumer's concern, not the canonical type's.

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
