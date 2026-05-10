# Atta — Active Plan

**This file lives in the repo at `project-management/plan.md`.**
**Updated by any Claude agent during working sessions, via GitHub MCP.**

What's being worked on, what's next, what's blocked. Dynamic — changes as work progresses. See `coordination.md` for update rules.

For current state (Vāda phase, auth status, DNS, etc.), see `state.md`.

---

## In flight now

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

**`feat/shared-keys-ui` merged (May 5).** Shared components in `@atta/ui/account`, ecosystem-shared key schemas in `@atta/db`, Settings tabs restructured (Account / API Keys / Agent Style — Teams tab removed). See D-030.

**Doc audit PR merged (May 6).** Branch `docs/may-5-reality-sync`, commit `aa03a51`. 7 repo files synced to May 4-5 reality.

**Currently active work:** Cetana V0 PR open on `feat/cetana-v0`. Pending merge.

**Next focused work:** Configure Claude Desktop with Cetana strategist MCP server. Then Track B Item 3b — Reviewer prompt iteration, dispatched through Cetana V0 (F5). This validates the orchestration loop on real Vāda work.

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
- ⏭ **Item 3b: Reviewer system prompt iteration.** Interactive phase. Now planned to dispatch through Cetana V0 once it ships. Invoke `vada__consult` with `spec_id: "vada-reviewers"`, read 3 reviewer responses, judge whether the prompt is producing the right behavior, tweak, re-run. §4.1.1 of rev 4 spec is the starting prompt.
- ⏭ **Item 3c: Synthesizer system prompt iteration.** Same shape as 3b. §4.1.2 of rev 4 spec is the starting prompt.
- ⏭ **Item 4: First benchmark run.** Six conditions per test case (A0, A1, VR-NS, VR-S-same, VR-S-cross, MW-where-available). Manual judging by Claude in fresh context, Dani as final arbiter. Per-question-type breakdown required.
- ⏭ **Item 5: Iterate or ship.** Decide recommended synthesis mode based on data, not philosophy.

### Track C — BYOK gap remediation (CLOSED May 4-5)

All four gaps from the April 30 gap report are resolved or superseded. See `vada-byok-gap-report.md` "Resolution status" block at top.

- ✅ **Gap 2:** Multi-vendor adapter (closed May 1).
- ✅ **Gap 1:** Resolved differently than the gap report's Path A or Path B framework. Server-side at rest with envelope encryption (Path C, not enumerated). Driven by hosted MCP requirement (D-029).
- ✅ **Gap 3 / Gap 4:** Mostly moot — `@atta/identity` no longer holds canonical keys, so the IndexedDB-specific hygiene items don't apply in their original form. Surviving utilities in the package are healthy.

Track C is closed. New BYOK-related work surfaces under Track E (hosted MCP hardening) instead.

### Track D — Web content

- ⏭ **Trust Vāda page rewrite** — currently references browser-only BYOK; needs full rewrite for server-side at-rest model post-D-028. User-facing prose, not mechanical updates.
- ✅ **MCP page content** — covered in May 6 doc audit.
- ✅ **`/teams` page population** — shipped in engine-flow-ui PR.
- ⏭ **Atta hub structural work** — 3 sections (Vāda Teams blurb, Atta Engine, Ecosystem). Less urgent.

### Track E — Hosted MCP server (SHIPPED May 4-5; hardening remains)

- ✅ **E2: Hosted MCP server implementation** — shipped May 4 (PRs #9 + #10). Live at `https://vada.attalabs.dev/api/mcp`. See D-029.
- ✅ **E3: Settings UI for Vāda API key generation** — shipped via `feat/shared-keys-ui` (May 5). `ApiKeysSection` in Settings → API Keys.
- ✅ **E4: Settings UI for hosted MCP provider keys** — shipped via `feat/shared-keys-ui`. `ProviderKeysSection` in Settings → API Keys. Single-source-keys reversal (D-028) means same store backs web app + hosted MCP.
- ✅ **E5: Database schema for `user_provider_keys`** — shipped May 4 (PR #10), migrated to `@atta/db` May 5 (D-030).
- ✅ **E1: `feat/deliberate-redesign`** — superseded by the inline model picker UX changes that landed during single-source-keys + shared-keys-ui.
- ✅ **E6: MCP tool contract surfaces aligned with deployed runtime** — shipped May 9 (PR #21). `vada__consult` structured inputSchema, `vada__deliberate` expanded team enum, stale references and `domain_expert` removed, README updated with hosted MCP section.

**Hardening remaining (E7+, future):**
- ⏭ **E7: Stdio session URL fix** — stdio MCP server hardcodes `vada.ai` for session URLs; should be `vada.attalabs.dev`. Small fix, separate PR.
- ⏭ **E8: Rate limiting** — per-key + per-user invocation caps. Pricing-tier dependent.
- ⏭ **E9: Audit log retention** — per-decryption events for security audit. Retention policy TBD.
- ⏭ **E10: KMS migration** — move master key from env var to KMS-managed. `kms_key_id` column already reserved.
- ⏭ **E11: Per-key tool scoping** — restrict an API key to specific tools. Useful for embedded integrations.
- ⏭ **E12: OAuth as alternative to bearer-token auth** — Anthropic's claude.ai connector broker has a known bug (`ofid_*` errors) that fails self-hosted MCP servers using bearer-token auth, while OAuth-using vendor-hosted MCP servers (e.g., GitHub at `api.githubcopilot.com/mcp/`) work. Until Anthropic fixes the broker bug, Claude.ai web users cannot connect to hosted Vāda; workaround is Claude Code CLI which works today. If Claude.ai web adoption matters for users, V2 hardening should add OAuth flow as an alternative to bearer auth — different code path on Anthropic's side, more likely to work through the broker. Empirically reconfirmed May 9, 2026 (third independent reproduction; consistent `ofid_*` failure mode).

### Track F — Cetana V0 (NEW, in flight May 9)

- ✅ **F1: Slice -1 escalation prototype** — May 9. 13/13 pass. Validated `cetana_request_input` MCP tool round-trip including 7-minute cognitive continuity. Throwaway prototype at `~/code/cetana-prototype/`.
- ✅ **F2: V0 Coordinator build at `apps/cetana-ai/`.** Single Bun service, two MCP server entry points, 4 tools, 38 passing tests. Shipped May 10.
- ✅ **F3: Worktree manager** — `worktree.ts` with create/remove/list. Part of F2.
- ✅ **F4: GitHub Octokit integration** — `github.ts` with getIssue, postComment, openPR. Part of F2.
- ⏭ **F5: First real-world dispatch** — Track B Item 3b (Reviewer prompt iteration) becomes the first real Cetana V0 dispatch.
- ⏭ **F6: 2-week dogfood evaluation** — after V0 ships and is used for at least 5 real Atta tasks, decide whether Cetana V1 (Tauri shell, dashboard, native notifications) is justified.

### Track G — Tooling hygiene (NEW, ad-hoc)

- ✅ **G1: Skill paths decoupled from SKILL.md frontmatter (May 9, PR #20).** Per-skill globs moved to sibling `paths.txt` files; hook updated to read from there. Restored Skill tool registration for 17 skills.

---

## Up next — sequencing recommendation

**Currently:** PM docs migrated to repo (PR #22). May 9 MCP fixes shipped (PRs #20 + #21). May 9 content updates landing now.

**Immediate next step:** Cetana V0 build session. Brief drafting + dispatch. ~2-3 days.

**After V0 ships:** Generate Vāda API key in Settings → API Keys, configure Claude Code with `https://vada.attalabs.dev/api/mcp` + bearer token. Then Track B Item 3b (Reviewer prompt iteration) dispatched via Cetana V0 — first real-world dispatch.

**Then:** Synthesizer prompt iteration (3c), then first benchmark run (Item 4).

**In parallel (when capacity allows):**
- Trust page rewrite
- Atta hub structural work
- P2/P3 cleanup pass: `vada-state.md`, `vada-product-spec.md`, `vada-reviewers-spec.md`, `vada-teams-catalog/02-mcp-tool-interface.md`, `vada-teams-catalog/04-caller-claude-protocol.md`, `apps/vada-ai/CLAUDE.md` Settings tab table

**Held / not blocking:**
- Hosted MCP hardening (Track E7-E11) — when ready to invest weeks
- Cetana V1 (Tauri shell + dashboard) — deferred until V0 proves daily-driver value over 2 weeks
- ~~CCPM / APM evaluation~~ — superseded by Cetana V0 unblock May 9 (the interactive escalation primitive is the differentiator they lack)

---

## Manual work pending (no agent needed)

- **Vitakka Clerk app deletion** — unused, no users, no consumers. 2 minutes.
- **Vercel env audit** — confirm no stray `NEXT_PUBLIC_CLERK_*FALLBACK_REDIRECT_URL` env vars. 5 minutes.
- **Worktree cleanup** — many redundant after May 4-9 merges. Run `git worktree list` and remove anything pointing to merged branches. Includes `.worktrees/skill-paths-decouple` and `.worktrees/mcp-schema-drift` after PRs #20 + #21 merge.
- **Add OpenAI + xAI keys server-side** — Anthropic key already configured; need OpenAI and xAI to verify multi-vendor routing on hosted MCP for full Reviewers benchmark.
- **Generate Vāda API key + configure Claude Desktop / Claude Code connector** — final step in dogfooding setup; hosted MCP is live but not yet used end-to-end. Settings → API Keys.
- **Delete `~/code/cetana-prototype/`** — after Cetana V0 ships and is verified working. The throwaway from Slice -1 has served its purpose.
- **Rotate any Vāda API keys exposed in chat transcripts** — May 9 dogfooding session pasted a real `vada_*` key into Claude.ai conversation history. Revoke and regenerate before reuse.

---

## Open / unresolved

These need decision but are not blocking:

### ~~Investigate CCPM / APM~~ (RESOLVED May 9, 2026)

Superseded by Cetana V0 unblock. Slice -1 validated the interactive `cetana_request_input` escalation primitive (agent calls a custom MCP tool when blocked, tool blocks until external reply, agent receives reply as tool result and continues coherently). This is the differentiator vs CCPM/APM/Conductor — none have interactive pause/resume. Building Cetana V0 directly inside the monorepo is now the right move; CCPM evaluation is moot.

### Vāda Reviewers post-benchmark decisions

The rev 4 spec has 7 deferred questions (§7.2-7.7) intentionally left open until v1 ships and benchmark data arrives:

- §7.2 Structured schema enforcement on reviewers (leaning no for v1)
- §7.3 Reviewer tool access (leaning no for v1)
- §7.4 Brief authorship UX in web UI (design during UI implementation)
- §7.5 Final product name ("Reviewers" through v1; eat-our-own-dogfood naming review before external launch)
- §7.7 Synthesizer-as-scaffold-not-conclusion UX
- Default synthesis mode: data-driven decision based on VR-NS vs VR-S-same vs VR-S-cross benchmark results
- Threshold values in success criteria (70%, 50%) — calibrate during first run

### Fate of experimental YAMLs

After Vāda Reviewers v1 benchmark, decide what happens to `a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet` (currently filtered from public catalog):

- Keep as benchmarking-only?
- Promote to published if any prove pedagogically useful?
- Retire entirely?

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

### Vāda Desktop — CLI-subprocess providers (post-Reviewers-v1)

Karpathy's `llm-council` (https://github.com/karpathy/llm-council) is the precedent: a local tool that spawns multiple LLM CLIs in parallel and runs council-style deliberation. Vāda Desktop is the polished, engine-backed version of the same pattern, already partially specced as v1.5 in `vada-reviewers-spec.md` §3.5 and analyzed in `vada-reviewers-tech-deep-dive.md` Section 9.

**What it would be:** A desktop app (Tauri/Electron) that runs Vāda's engine locally. CLI subprocesses (Claude Code, Gemini CLI, Codex CLI, Grok CLI, Ollama) replace HTTP API clients as the "providers." User authenticates each CLI once with their existing subscription. Vendor-diverse Reviewers runs without BYOK.

**Why it matters as a product surface:** subscription-paid execution is the lowest-friction distribution path for individual prosumers. Most users with Claude Pro / ChatGPT Plus / Gemini subscriptions don't have API keys. The hosted Vāda's BYOK model is friction. Vāda Desktop with CLI subprocesses lets users use what they already pay for. Same legal/ToS posture as Aider and llm-council itself — tolerated by vendors because it's user-on-own-machine, not commercial subscription exploitation. Open source.

**What it would require:** ~1-2 days adapter work (route Vāda's `LlmCallFn` to CLI subprocesses for matching model prefixes — already specced as v1.5 engine constraint #6), plus the desktop UI build (~2-3 weeks). Engine, teams, YAMLs unchanged.

**Why not now:** Reviewer prompt iteration ships first. Building Desktop UX around prompts that may still change is wasted work. After Reviewers v1 ships, Desktop becomes the obvious next distribution path for individual prosumers.

**Open questions:**
- Does this product get a Pāli name, or is it "Vāda Desktop" — same product, different surface?
- Does Vāda Desktop ship as part of Vāda's open-source surface area, or as a separate commercial product?
- How does it relate to the Anthropic Claude Apps marketplace path?

**Plan:** evaluate after Reviewer prompt iteration ships and hosted MCP is dogfooded.

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
- `.claude/skills/vada-mcp-server/SKILL.md` — references `domain_expert` reviewer role in "Adding a New Reviewer Profile" how-to; harmless but worth aligning when `VADA_DOMAIN_EXPERT` env flag flips
- `apps/vada-ai/mcp-server/src/server.ts` — runtime error string "team must be 'sparring' or 'crucible'" no longer matches expanded enum (programmer-error path; low impact)

---

## Recently completed (April 28 – May 9, 2026)

### May 9 — Cetana V0 unblock + PM docs migration
- Slice -1 escalation prototype: 13/13 pass. Custom MCP tool `cetana_request_input` blocks for 7 minutes, returns reply via external file write, agent resumes coherently with no context loss. Cognitive continuity validated.
- Throwaway prototype at `~/code/cetana-prototype/` (slated for deletion after V0 ships).
- PM docs migrated to repo: `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md` moved from Claude.ai project knowledge to `project-management/` via PR #22.
- May 9 content updates: earlier commit on PR #22.

### May 9 — MCP contract fixes + skill registration unblock
- **PR #20** (`fix/skill-paths-decouple`, commit `865c6c9`) merged. Moved per-skill path globs from custom `paths:` SKILL.md frontmatter into sibling `paths.txt` files. Skill tool's frontmatter parser silently drops skills with non-standard fields; the skill-check enforcement hook was demanding skills the Skill tool refused to load. 17 skills affected. Hook updated to read `paths.txt` instead of parsing frontmatter.
- **PR #21** (`fix/mcp-schema-drift`, commit `26c20ba`) merged. Aligned Vāda's `vada__consult` and `vada__deliberate` MCP surfaces with deployed runtime: structured inputSchema (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`); team enum expanded to all 5 published specs; stale `vada__deliberate_brokered` reference and `domain_expert` description removed; README retired Brokered/Autonomous mode framing, fixed broken specs link, added hosted MCP installation section. Validator (`validateAndNormalize`) untouched — both legacy and structured shapes still accepted.
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
