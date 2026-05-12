# Atta — Roadmap

**Tracks, sequencing, and open questions.** Changes each sprint.

→ [now.md](now.md) — active work
→ [changelog.md](changelog.md) — what shipped
→ [lessons.md](lessons.md) — calibration

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
- ✅ **F5: V0.5 Step 1 — CLI scaffold + init** — May 12, PRs #39/#42/#43. Install gate D-021 verified by Principal. D-025 (path coverage) added.
- ⏭ **F6: V0.5 Step 2 — `cetana watch`** — READY TO DISPATCH. Human-readable JSONL renderer.
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

## Open / unresolved

These need decision but are not blocking:

### ~~Investigate CCPM / APM~~ (RESOLVED May 9, 2026)

Superseded by Cetana V0 unblock. Slice -1 validated the interactive `cetana_request_input` escalation primitive (agent calls a custom MCP tool when blocked, tool blocks until external reply, agent receives reply as tool result and continues coherently). This is the differentiator vs CCPM/APM/Conductor — none have interactive pause/resume. Building Cetana V0 directly inside the monorepo is now the right move; CCPM evaluation is moot.

`cetana-reality-check.md` retained as historical reference but no longer the active sequencing plan.

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

### Cetana V0.7+ — MCP wrapping of Spec Kit templates

Parked idea from Spec Kit evaluation (May 12, 2026): expose MCP tools that wrap Spec Kit's spec/plan/tasks templates:

- `cetana.specify(description)` → produces a `spec.md` artifact using Spec Kit's spec-template format
- `cetana.plan(spec_path)` → produces a `plan.md` artifact using Spec Kit's plan-template format
- `cetana.tasks(plan_path)` → produces a `tasks.md` artifact using Spec Kit's tasks-template format

Not blocking anything. Depends on Cetana V0 being stable and the brief-authoring pattern being settled (not before V0.5 ships).

### Cetana as a Vāda team flow — composing orchestration and deliberation

Surfaced May 12, 2026 (post-F5 reflection). Today Cetana orchestrates execution and Vāda orchestrates deliberation; they don't compose. The interesting V0.7+ direction: integrate them so Cetana can dispatch Vāda deliberations as part of its workflow.

Concrete example: when a Cetana-dispatched agent opens a PR, Cetana could automatically fire a Vāda deliberation team — spec reviewer + code reviewer + risk auditor + Principal-perspective synthesizer — and post the team's synthesis as a PR comment. Principal reads the synthesis, makes the final merge call. Cetana never decides; it surfaces deliberation when deliberation is warranted.

Why this could be the right architecture for V0.7+:
- Cetana already has the MCP surface and event substrate
- Vāda already has reviewer teams and synthesis primitives
- The two systems are complementary, not redundant: Cetana = execution loop, Vāda = deliberation loop
- The Principal interface stays simple: see a synthesis, decide

Why this is NOT V0.5 work:
- V0.5 is locked as the CLI ladder (PR #33). Vāda integration is a different shape entirely.
- Cetana's orchestration loop itself needs to be validated via the 4-week dogfood before adding deliberation hooks.
- Premature integration would couple two systems before either has stabilized.
- The Principal-throughput question (see `lessons.md` anti-pattern on review-rigor degradation) is unresolved.

When to revisit: after F11 (V0.5 dogfood window) generates evidence about which decisions during dispatch would benefit from Vāda deliberation. Likely candidates: spec coherence review on PRs, risk audits for Tier 3 work, multi-AI reviewer rounds triggered automatically by `[NEEDS CLARIFICATION]` markers.

Related: the existing "Cetana V0.7+ MCP wrapping of Spec Kit templates" entry above. Both are about Cetana growing beyond orchestration. The wrapping idea is about *authoring* artifacts; this Vāda integration is about *deliberating over* artifacts. They could land together or separately.

Track: opens after F12 (V1 UI gate evaluation) closes.

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
