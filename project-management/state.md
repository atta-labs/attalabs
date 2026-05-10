# Atta Ecosystem — Current State

**Last updated:** May 9, 2026 (post Cetana V0 unblock + MCP contract fixes)
**Purpose:** Single snapshot of where everything stands across the Atta ecosystem.

This doc lives in the repo at `project-management/state.md`. For non-PM docs (skills, Vāda specs, legacy material), see `docs-index.md` for paths and read via GitHub MCP. See `coordination.md` for how the system works.

Vāda's own internal phase tracking lives in `apps/vada-ai/specs/vada-state.md`.

---

## Brand & domain

- **Atta** = ecosystem (parent organization, monorepo, code namespace `@atta/*`)
- **AttaLabs** = public domain wrapper only — `attalabs.dev` (purchased April 26, 2026)
- **No product is named Atta** — the previous "Atta-the-product" (memory layer) is now Sati
- Architecture: single Clerk app ("Atta" in Clerk dashboard), cookie scoped to `.attalabs.dev`, SSO across all subdomains
- Naming rule: Pāli name = Atta built it; no Pāli name = it plugs in

Canonical decision doc: `apps/atta-ai/specs/atta-naming-decision.md`.

---

## Products

### Vāda — *production live; hosted MCP shipped; reviewer prompt iteration phase next*

**Status:** Live at `https://vada.attalabs.dev`. Vāda Teams is the catalog of YAML team specifications compiled by the Atta engine. Vāda Reviewers v1 (vendor-diverse team) registered. **Hosted MCP server live at `https://vada.attalabs.dev/api/mcp` (May 4).** **Single-source-keys reversal locked (May 4) — server-side `user_provider_keys` is canonical, IndexedDB demoted.** **`feat/shared-keys-ui` merged (May 5) — `ProviderKeysSection` / `ApiKeysSection` extracted to `@atta/ui/account`, ecosystem-shared key schemas moved to `@atta/db`.** Reviewer prompt iteration phase is next (Track B Item 3b).

**Web app structure:** Routes are flat. Home is at `/`. The `/autonomous/*` and `/brokered/*` route trees no longer exist.

#### Vāda Teams catalog (current state — 9 YAMLs, 5 published)

All YAMLs at `apps/vada-ai/yamls/`. Use Sonnet (`claude-sonnet-4-6`) by default; Vāda Reviewers uses vendor-diverse defaults.

| Team YAML | Display name | Shape | Status |
|---|---|---|---|
| `a0-baseline` | A0 | Single agent, direct answer | Benchmarking baseline (experimental) |
| `a1-baseline` | A1 | Single agent, structured output | Benchmarking baseline (experimental) |
| `brokered-trio` | Brokered Trio | 3 reviewers parallel (Strategist + Critic + Devil's Advocate), single-shot, no synthesis | Engine demo (experimental) |
| `brokered-quartet` | Brokered Quartet | Brokered Trio + Domain Expert | Engine demo (experimental) |
| `crucible` | Crucible | 4 agents × 3 rounds with dual audit and revision | Published |
| `sparring` | Sparring | 2 agents × 3 rounds with dual audit and revision | Published |
| `war-room` | War Room | 6 agents × 3 rounds with dual audit and revision | Published |
| `vada-reviewers` | Reviewers | 3 vendor-diverse reviewers (Gemini + GPT + Grok), uniform critic role, single-shot, no synthesizer | Published — pending prompt iteration |
| `vada-reviewers-synthesis` | Reviewers + Synthesis | Same 3 reviewers + Anthropic Synthesizer producing structured JSON | Published — pending prompt iteration |

The 4 experimental YAMLs are filtered out of the public `/teams` catalog by the `experimental: true` flag (`listPublicSpecs()` returns the 5 published only). Their fate (keep, retire, evolve) depends on data from the Vāda Reviewers benchmark.

#### What's built

- **Hosted MCP server (May 4):** `https://vada.attalabs.dev/api/mcp`. Streamable HTTP transport, bearer auth via `vada_*` API keys (SHA-256 hashed in `api_keys` table). Provider keys envelope-encrypted in `user_provider_keys` (AES-256-GCM, AAD-bound to `clerkId`, `MASTER_ENCRYPTION_KEY` env var, `kms_key_id` reserved for future KMS migration). Implementation: `apps/vada-ai/web/src/app/api/mcp/route.ts`, `packages/auth/src/api-key-auth.ts`, `packages/crypto/`. See D-029.
- **Single-source-keys reversal (May 4):** server-side canonical store; IndexedDB demoted from key-storage role; `@atta/identity` preserved for probe/Ollama/migration utilities. See D-028.
- **Shared keys UI + ecosystem schemas (May 5):** `ProviderKeysSection` and `ApiKeysSection` in `@atta/ui/account`; `apiKeys`, `userProviderKeys`, `mcpSessions` in `packages/db/src/schema/keys.ts`; `userSettings` (face-style) stays in `apps/vada-ai/web/src/db/schema.ts`. Settings tab structure: Account / API Keys / Agent Style. Teams tab removed; team agent model selection moved inline (per D-027 unified storage). See D-030.
- LangGraph-only execution path (Mastra removed)
- **Multi-vendor LlmCallFn** in `@atta/adapter-langgraph` — routes by model prefix (claude-* → Anthropic, gemini-* → Google, gpt-*/o4-* → OpenAI, grok-* → xAI). Per-vendor official SDKs. Closes BYOK Gap 2.
- **`BrokeredWorkflow.synthesis?` field** in `@atta/engine` — optional synthesizer node.
- **Per-node error capture** — `AgentOutput.error?` field; partial failures complete with `terminalState: CLEAN`.
- **Engine vocabulary refactor (May 3)** — `PlanNodeKind` (7 values) and `PlanEdgeKind` (flow, ordering) emitted by all 4 compilers. Resolves OQ-cross-9 as Choice A.
- **Role/engine separation (May 3)** — `AgentRole` deleted from `@atta/agents`. Vendor identity is first-class for unroled agents (Vāda Reviewers' Gemini/GPT/Grok = no role, vendor IS identity).
- **MCP contract surfaces aligned with deployed runtime (May 9, PR #21):** `vada__consult` inputSchema declares structured shape (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`); `vada__deliberate` `team` enum expanded to all 5 published specs.
- `vada__consult` accepts generic `spec_id` — routes to any YAML in the catalog
- `vada__deliberate` MCP tool returns `structured` field alongside `content`
- 9 YAML team specs in catalog (5 published, 4 experimental)
- Domain Expert agent (uses Handlebars `customVars`)
- Benchmarks infrastructure (`benchmark_runs` table, judge script, `/bench` dashboard)
- YAML-driven specs replacing TypeScript mode logic
- Per-agent model overrides
- YAML catalog loader extraction (`@atta/engine/src/catalog-loader.ts`)
- UI driven by `listPublicSpecs()` server-side
- Synthesis structured output persisted to `transcript_entries.structured` JSONB
- SSE typed `synthesis_complete` events with `{ agent, content, structured, is_revision }`
- Auth: single shared `users` table in `@atta/db` keyed by `clerk_id`. Vāda-specific profile data in `vada_profile` table.
- Settings page top bar restored. Account tab uses Clerk `<UserProfile />` themed via `@atta/ui/account`.
- Theme-reactive Clerk modal
- OAuth-only V1: Google + GitHub + Web3 wallets

#### Web app structure

Flat routes at `apps/vada-ai/web/src/app/(main)/`:
- `/` — animated hero homepage
- `/deliberate` — picker + brief flow (lock-icon row removed; key entry now writes server-side)
- `/deliberation` — in-flight session viewer (SSE streaming)
- `/sessions` — unified history
- `/sessions/consultations/[id]` — brokered consultation detail
- `/teams` — catalog page (5 published cards) with animated agent spheres
- `/teams/[slug]` — detail page with agent grid, cost calculator with model picker, embedded flow visualization
- `/trust` — Trust Vāda page (existing content; rewrite pending — references browser-only BYOK which is no longer current)
- `/mcp` — MCP server documentation page
- `/bench` — consolidated benchmarks
- `/settings` — Account / API Keys / Agent Style tabs (Teams tab removed)
- `_archived-science/` — science route hidden, content preserved

**Domain:** `vada.attalabs.dev` (production live). Auto-deploys from `main` via Vercel.

**Next:** Reviewer prompt iteration (Track B Item 3b) dispatched through Cetana V0 once it ships. Hosted MCP empirically dogfooded May 9 via curl — server healthy, Claude.ai web blocked by Track E12 broker bug (`ofid_*`), Claude Code CLI is the working integration. Then synthesizer prompt iteration (3c), then first benchmark run (Item 4).

See `apps/vada-ai/specs/vada-state.md` for full Vāda-internal detail (note: file may be slightly stale post-May-4-5; flagged for next cleanup pass).

### Vitakka — *less active, paused*

**Status:** Concept locked, not actively in development.

**What it is:** Personal AI thinking partner — the focus layer.

**Domain:** `vitakka.attalabs.dev` (when built).

**Next:** Resume after Vāda revenue milestone.

### Sati — *new, conceptual only*

**Status:** Renamed from previous "Atta-the-product" April 26, 2026. No code exists yet.

**What it is:** Memory layer / cross-provider persistent self.

**Domain:** `sati.attalabs.dev` (when built).

**Next:** Buildout downstream of Vitakka resuming.

### Cetana — *V0 build in flight as of May 9, 2026*

**Status:** Architecture validated via Slice -1 escalation prototype on May 9, 2026 (13/13 pass, including 7-minute cognitive continuity). V0 build starting in the monorepo at `apps/cetana-ai/`. Originally specced as late-2026/early-2027 work; pulled forward because copy-paste friction between Claude.ai (strategist) and Claude Code (executor) is now blocking Vāda iteration directly.

**What it is:** Local Mac orchestration tool that lets Claude Desktop chat (the strategist) dispatch Claude Code agents (the executors) into the Atta repo via MCP, watch them work, and unblock them when they hit decision points.

**Validated load-bearing mechanism (Slice -1, May 9):** Agent calls custom MCP tool `cetana_request_input` when blocked, tool blocks until principal/strategist replies via external write, agent receives reply as tool result and continues coherently with no context loss. Tested across a 7-minute pause; first post-resume sentence was a clean continuation, zero re-planning, zero redundant reads. This is the differentiator vs CCPM/APM/Conductor (none have interactive pause/resume).

**Architecture (locked May 9, 2026):**
- Claude Desktop = strategist (uses local stdio MCP; web Claude.ai cannot reach localhost per Anthropic docs)
- GitHub Issues + Labels + Milestones = roadmap, tasks, briefs, PRs (no Projects V2)
- Cetana Coordinator = single Bun service inside `apps/cetana-ai/`, exposes one MCP server with namespaced `cetana.*` tools (`dispatch_task`, `list_active_tasks`, `reply_to_blocked_task`, `request_input`)
- Claude Code = executor, spawned per task, runs in git worktree at `~/code/atta/.worktrees/issue-{N}/`
- JSONL append-only logs at `~/.cetana/tasks/*.jsonl` for runtime state (SQLite later if/when schema stabilizes)
- No UI in V0. CLI + `tail -f` on JSONL. Tauri shell + dashboard deferred to V1 if and only if V0 proves daily-driver value over 2 weeks of real use.

**V0 reuses ecosystem packages:** `@atta/db`, `@atta/auth`, `@atta/ui` (when UI ships in V1), Atta monorepo conventions.

**Domain:** `cetana.attalabs.dev` reserved for if/when Cetana becomes a public product. V0 is internal tooling.

**Open consideration superseded:** Existing agentic-PM frameworks (CCPM, APM) were parked for evaluation post-Reviewer-iteration. That evaluation is now moot — Cetana V0 with the validated escalation primitive does what CCPM/APM do *plus* the interactive pause/resume layer they lack.

**Throwaway prototype:** `~/code/cetana-prototype/` (outside monorepo) — slated for deletion after V0 ships.

**Next:** Build `apps/cetana-ai/` V0 (~2-3 days). Then dispatch reviewer prompt iteration (Track B Item 3b) through it. UI decisions deferred to post-V0 daily use.

### Herald — *pluggable MCP tool*

**Status:** Pluggable MCP tool, not a core product. Has its own auth (separate Clerk app — out of scope for the Atta ecosystem auth migration).

Forensic CV-to-job-description match tool that exposes itself via MCP. Plugs into Vitakka or any MCP-compatible host.

---

## Apps in the monorepo

- `apps/vada-ai/` — Vāda product (web + mcp-server). Production-deployed at `vada.attalabs.dev`. Web hosts the hosted MCP route at `apps/vada-ai/web/src/app/api/mcp/route.ts`.
- `apps/atta-ai/` — ecosystem hub. Production-deployed at `attalabs.dev` (April 28). Hosts engine tools and engine-as-MCP.
- `apps/cetana-ai/` — Cetana V0 in active build (architecture validated May 9, 2026 via Slice -1 escalation prototype). Coordinator + MCP server. No UI in V0. Pulled forward from late-2026 timeline.
- `apps/herald-ai/` — Herald product (web + mobile + mcp). Separate auth.
- `apps/vitakka-ai/` — scaffold; product paused.

`apps/atta-labs-ai/` was deleted April 28 (Operations cleanup).

---

## Shared infrastructure (`@atta/*` packages)

- `@atta/engine` — Plan compiler. Includes optional `BrokeredWorkflow.synthesis` field; per-node error capture; PlanNodeKind/PlanEdgeKind emission across all compilers.
- `@atta/agents` — agent primitives. `AgentRole` deleted (May 3) — role is presentation, not engine.
- `@atta/adapter-langgraph` — LangGraph execution + cognitive router. Multi-vendor: routes by model prefix to Anthropic / Google / OpenAI / xAI per-vendor SDKs.
- `@atta/auth` — Clerk wrapper + bearer-token validation. Includes `verifyApiKeyBearer` for hosted MCP. Single Clerk app SSO model.
- `@atta/crypto` — envelope encryption for sensitive columns (AES-256-GCM, AAD-bound). API key generation + SHA-256 hashing. Master key from `MASTER_ENCRYPTION_KEY` env var; `kms_key_id` field reserved for future KMS migration.
- `@atta/db` — Drizzle ORM + Neon client. Single shared `users` table keyed by `clerk_id`. Ecosystem-shared key tables live here too: `apiKeys`, `userProviderKeys`, `mcpSessions` in `packages/db/src/schema/keys.ts`.
- `@atta/ui` — shadcn/ui + Tailwind + lucide-react + canvas particle system (AIACanvas). Includes `@atta/ui/account` (themed Clerk wrappers + `ProviderKeysSection` + `ApiKeysSection` shared across products). `@atta/ui/engine-flow` subpath shipped (May 3).
- `@atta/cms` — Sanity schemas + typed queries.
- `@atta/storage` — Cloudflare R2 client.
- `@atta/identity` — preserved post-May-4 reversal but no longer canonical key store. Surviving roles: `probeProviderKey` (validate before save), `fetchInstalledOllamaModels` (local Ollama discovery), `MigrationPrompt` (one-time UX for users with pre-reversal IndexedDB keys), `useIdentity` hook used by judge benchmark + model picker. Mounted via `IdentityProvider` in vada-ai and atta-ai layouts.
- `@atta/typescript-config` — base + nextjs tsconfig.
- `@atta/models` — model registry.

`@xyflow/react` is a direct dependency of `apps/vada-ai/web`.

---

## Auth state

**Single Clerk app, ecosystem-wide.** Live in production. Cookie scoped to `.attalabs.dev`.

**Pending (manual, not blocking):** Vitakka Clerk app in dashboard — unused, can delete.

**Apple OAuth:** deferred (needs $99/year Apple Developer account)
**Email auth:** disabled in Clerk dashboard (V1 OAuth-only)

---

## Domain & DNS state

- `attalabs.dev` registered at GoDaddy. Production DNS configured.
- `vada.attalabs.dev` — Vāda production. Live.
- `attalabs.dev` (root) — atta hub. Live.
- `clerk.attalabs.dev` — Clerk frontend API CNAME. Live.
- `*.attalabs.dev` — wildcard CNAME to Vercel.
- Local dev: `attalabs.test`, `vada.attalabs.test` resolve to `127.0.0.1`. (`account.attalabs.test` no longer used per D-030.)
- `atta.com` (€500K) and `atta.ai` (owned, may free 2027) — not pursued.

---

## BYOK architecture state

**Server-side at rest, decrypted per-request, since May 4, 2026 (D-028 + D-029).**

`user_provider_keys` table holds envelope-encrypted provider keys (AES-256-GCM, AAD-bound to `clerkId`, master key from `MASTER_ENCRYPTION_KEY` env var). Decryption happens only inside request handlers (`/api/deliberation/[id]/workflow/run`, `/api/mcp`). Plaintext never logged or persisted. `kms_key_id` column reserved for V2 KMS migration.

Distinct from the prior browser-only BYOK story (pre-May 4), which used IndexedDB + passkey for at-rest storage and transited keys through Vāda's server in cleartext request bodies. That model was strictly stronger for at-rest privacy but incompatible with hosted MCP. The reversal was the explicit cost of shipping hosted MCP.

`@atta/identity` package retained: `IdentityProvider` mounted in vada-ai and atta-ai layouts. The package no longer holds canonical keys.

Two specs:
- `apps/vada-ai/specs/vada-byok-principles.md` — current state, rewritten May 6.
- `apps/vada-ai/specs/vada-byok-gap-report.md` — historical (April 30 framework). All four gaps closed or superseded; document preserved for record.

---

## Hosted MCP — shipped (May 4, 2026)

**Live at:** `https://vada.attalabs.dev/api/mcp`
**Transport:** Streamable HTTP (POST + SSE)
**Auth:** Vāda API key (bearer token in `Authorization` header). SHA-256 hashed in `api_keys` table.
**BYOK:** server-side envelope-encrypted in `user_provider_keys`; same store backs the web app's deliberate page (single canonical store per D-028).
**Two MCP tools:** `vada__consult`, `vada__deliberate`. Identical input/output shapes to the local stdio server.

**Status:** Shipped May 4 via PRs #9 + #10. Phases 1-4 of the implementation plan complete. Phase 5 (stdio session URL fix — `vada.ai` hardcode bug) and Phase 6 (rate limiting, audit log, hardening) remain as future work. Tool contract surfaces aligned with deployed runtime May 9 via PR #21 (structured input schema, expanded team enum, stale references removed). Empirically dogfooded May 9 via curl (server healthy) and Claude.ai web (Track E12 broker bug reconfirmed — Claude Code CLI is the working integration today).

See `apps/vada-ai/specs/mcp-architecture.md` for full spec, `vada-decisions.md` D-029 for the architectural decision.

---

## DB schema management

Vāda's web app maintains its DB schema via `bun run db:push` from `apps/vada-ai/web/`. Ecosystem-shared key tables live in `@atta/db` (`packages/db/src/schema/keys.ts`) and have their own migration handling. No Drizzle migration tracking table exists yet.

When `@atta/db` consolidates further, decide whether to keep `db:push` or move to tracked migrations. No urgency.

---

## Doc system

This ecosystem uses the repo as the source of truth for project management. See `coordination.md` for full rules.

**Project-management files (in repo at `project-management/`):** `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md`. Plus `docs-index.md` at repo root.

**Everything else is repo specs/skills/code, indexed by `docs-index.md`.**

### Recently shipped (April 28 – May 9, 2026)

**May 9 — Cetana V0 unblock.** Slice -1 escalation prototype passed end-to-end (13/13 mechanical + cognitive criteria, 7-minute cognitive continuity test). PM docs migrated from Claude.ai project knowledge to repo at `project-management/` (PR #22). May 9 content updates landing now (this commit).

**May 9 — MCP contract fixes + skill registration unblock (PRs #20 + #21).**
- **PR #20** (`fix/skill-paths-decouple`, commit `865c6c9`) — moved per-skill path globs from custom `paths:` SKILL.md frontmatter into sibling `paths.txt` files. Skill tool was silently dropping any skill with non-standard frontmatter fields, causing the skill-check enforcement hook to demand skills the Skill tool refused to load (Catch-22). 17 skills affected. Hook updated to read `paths.txt` instead of parsing frontmatter.
- **PR #21** (`fix/mcp-schema-drift`, commit `26c20ba`) — aligned Vāda's `vada__consult` and `vada__deliberate` MCP tool surfaces with deployed runtime. `vada__consult` inputSchema now declares structured shape (`context`, `question`, `reviewers[{role, notes?, domain?}]`, plus optional `spec_id`, `current_leaning`, `stakes`, `session_title`) — matching `ConsultInputStructuredSchema`. `vada__deliberate` `team` enum expanded to all 5 published specs. Stale `vada__deliberate_brokered` reference and `domain_expert` description removed. README retired Brokered/Autonomous mode framing, fixed broken specs link, added hosted MCP installation section. Validator (`validateAndNormalize`) untouched; both legacy and structured shapes still accepted.
- **Hosted MCP empirically dogfooded.** Server verified end-to-end via curl (`initialize` + `tools/list` clean with bearer auth). Claude.ai web connector returns `ofid_5a58c66b85d09d04` — Track E12 broker bug reconfirmed. Claude Code CLI is the working integration today.

**May 6 — doc audit PR (`docs/may-5-reality-sync`).** 7 repo files synced to May 4-5 reality:
- D-028, D-029, D-030 appended to `vada-decisions.md`
- `mcp-architecture.md` flipped target → shipped
- `vada-byok-principles.md` rewritten in place (single-source server-side)
- `vada-byok-gap-report.md` resolution status block prepended; original preserved
- `vada-mcp-server/SKILL.md` hosted surface marked live
- `auth/SKILL.md` RULE #5 rewritten (no `account.attalabs.dev` hub)
- `database/SKILL.md` ecosystem-shared schemas + envelope encryption sections added

**May 5 — `feat/shared-keys-ui` merged.**
- `ProviderKeysSection` and `ApiKeysSection` extracted to `packages/ui/account/`
- Ecosystem-shared key schemas (`apiKeys`, `userProviderKeys`, `mcpSessions`) moved to `packages/db/src/schema/keys.ts`
- Settings tabs restructured: Account / API Keys / Agent Style. Teams tab removed.
- Unified team agent model storage: single `vada:team:<specId>` localStorage key for all team types (D-027).

**May 4 — hosted MCP + single-source-keys.**
- Hosted MCP server shipped end-to-end (PRs #9 + #10): bearer auth via `vada_*` API keys, envelope-encrypted provider keys, both MCP tools wired through. See D-029.
- Single-source-keys reversal (PR #13): server-side `user_provider_keys` is canonical; IndexedDB demoted. See D-028.

**May 3 — engine-flow-ui PR.**
- `/teams` cards page (5 published cards)
- `/teams/[slug]` detail pages with agent grid + calculator + flow visualization
- `@atta/ui/engine-flow` module
- Engine vocabulary refactor: `PlanNodeKind` + `PlanEdgeKind` emitted by all 4 compilers
- Role/engine separation: `AgentRole` deleted from engine
- Calculator + vendor registry

**April 28 — production launch.** Vāda + atta hub deployed.

**April 30 – May 1 — Track B Item 2 closeout.** Multi-vendor adapter, engine extensions, docs cleanup, web restructure, Vāda Reviewers v1 YAMLs all merged.

### Stale, references old framing or pre-merge state

- `apps/vada-ai/specs/vada-state.md` (Vāda-internal — needs phase update post-May-4-5)
- `apps/vada-ai/specs/vada-product-spec.md`
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-reviewers-spec.md` — references MCP/BYOK in passing; verify still accurate post-May-4
- `apps/vada-ai/specs/vada-teams-catalog/02-mcp-tool-interface.md` — references old `apiKey` body parameter on workflow/run route (no longer accepted post-D-028; route reads from DB by `clerkId`)
- `apps/vada-ai/specs/vada-teams-catalog/04-caller-claude-protocol.md` — references "Caller Claude owns synthesis" which was reversed by D-016
- `apps/vada-ai/CLAUDE.md` — Settings tab table still shows Teams tab
- Trust page content in `apps/vada-ai/web/.../trust/...` — references browser-only BYOK; needs full rewrite for current trust model
- `apps/atta-ai/specs/cetana-reality-check.md` — V0/V0.7/V1 sequencing now superseded by May 9 unblock; V0 build is in flight directly. File still useful as historical reference but no longer the active plan.
- `.claude/skills/vada-mcp-server/SKILL.md` — references `domain_expert` reviewer role in the "Adding a New Reviewer Profile" how-to; harmless (it's a how-to, not current-state description) but worth aligning when `VADA_DOMAIN_EXPERT` env flag flips.
- `apps/vada-ai/mcp-server/src/server.ts` — runtime error string "team must be 'sparring' or 'crucible'" no longer matches expanded enum (programmer-error path only; low impact).

---

## What exists physically vs. what's planned

**Exists in code (May 9, 2026):**
- `apps/vada-ai/web` — Vāda web app with full teams catalog surface, production-deployed
- `apps/vada-ai/web/src/app/api/mcp/route.ts` — hosted MCP route, live
- `apps/vada-ai/mcp-server` — Vāda's local stdio MCP server with generic `spec_id` routing; tool contract surfaces aligned with runtime May 9 (PR #21)
- `apps/atta-ai/mcp-server` — engine-as-MCP server
- `apps/atta-ai/web` — atta hub, production-deployed
- `apps/herald-ai/*` — Herald surfaces (separate auth)
- `apps/vitakka-ai/` — scaffold; paused
- All `@atta/*` packages including `@atta/crypto`, `@atta/ui/account`, `@atta/db` ecosystem-shared key schemas
- `@atta/ui/engine-flow` module
- 9 YAML teams in `apps/vada-ai/yamls/`
- Calculator + vendor registry
- `apps/vada-ai/specs/vada-reviewers-spec.md` (rev 4)
- `project-management/` directory with `coordination.md`, `state.md`, `plan.md`, `brief-authoring-rules.md` (migrated from project knowledge May 9)
- `.claude/skills/*/paths.txt` — per-skill path globs decoupled from SKILL.md frontmatter (PR #20 May 9, 17 skills)

**Specced but not yet built / iterated:**
- `apps/cetana-ai/` V0 build — architecture validated May 9, build session is the next focused work
- Reviewer system prompt iteration (Track B Item 3b) — to be dispatched through Cetana once V0 ships
- Synthesizer system prompt iteration (3c)
- Vāda Reviewers benchmark (Item 4)

**Drafted briefs awaiting dispatch:**
- Cetana V0 build brief (next session)

**Does not exist yet:**
- `apps/account/web` — DEFERRED indefinitely. D-030 decision: no `account.attalabs.dev` hub.
- `apps/sati-ai/*` — Sati doesn't exist
- `apps/cetana-ai/*` — directory created/scaffolded by next session
- Hosted MCP hardening: rate limiting, audit log retention, KMS migration, per-key tool scoping (V2 work)
- Trust + MCP page content rewrites
- Cetana V1 surfaces (Tauri shell, dashboard, native notifications) — deferred until V0 proves daily-driver value over 2 weeks

---

## Open questions across the ecosystem

- **OQ-cross-1:** Does Sati get built before or after Vāda hits revenue?
- **~~OQ-cross-2~~ (RESOLVED May 5):** No billing hub at `account.attalabs.dev`. Sharing at component level via `@atta/ui/account` (D-030).
- **OQ-cross-3:** `atta.ai` migration — eager vs. wait for natural rebuild moment?
- **OQ-cross-4:** When `@atta/db` consolidates further, keep `db:push` or move to tracked migrations?
- **~~OQ-cross-5~~ (RESOLVED May 9):** V0.7 path collapsed. Cetana V0 directly implements the validated escalation primitive inside the monorepo at `apps/cetana-ai/`. No separate MCP+CLI step.
- **~~OQ-cross-6~~ (RESOLVED May 4):** Neither Path A nor Path B from the gap report. Server-side at rest, envelope-encrypted, decrypted only in request handlers (D-028).
- **~~OQ-cross-7~~ (RESOLVED May 5):** API key management lives in product-local Settings, composed from shared `@atta/ui/account` components (D-030).
- **OQ-cross-8:** Fate of the experimental YAMLs after Vāda Reviewers v1 benchmark.
- **~~OQ-cross-9~~ (RESOLVED May 3):** Engine vocabulary architecture — Choice A. `PlanNodeKind` + `PlanEdgeKind` shipped.
- **~~OQ-cross-10~~ (RESOLVED May 9):** Cetana V0 is not superseded by CCPM/APM. The interactive pause/resume layer (Slice -1 validated) is the differentiator. Sandboxed evaluation no longer needed.
- **OQ-cross-11 (NEW May 9):** Does Cetana V1 (Tauri shell + dashboard) ship after 2 weeks of V0 daily use, or does V0 prove sufficient indefinitely?

Vāda-internal open questions live in `apps/vada-ai/specs/vada-state.md`.
