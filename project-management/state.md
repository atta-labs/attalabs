# Atta Ecosystem — Current State

**Last updated:** May 6, 2026 (post hosted MCP + single-source-keys + shared-keys-ui + doc audit)
**Purpose:** Single snapshot of where everything stands across the Atta ecosystem.

This doc lives in Claude.ai project knowledge. For non-project-knowledge docs (skills, Vāda specs, legacy material), see `docs-index.md` for paths and ask for content on demand. See `atta-coordination.md` for how the two-layer doc system works.

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

**Next:** Generate Vāda API key + configure Claude.ai connector + dogfood hosted MCP via Claude.ai. Then reviewer prompt iteration (Track B Item 3b — interactive Dani + Sonnet pair-mode), then synthesizer prompt iteration (3c), then first benchmark run (Item 4).

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

### Cetana — *long-horizon, V4+ direction (with V0/V0.7 path)*

**Status:** Concept locked in `apps/atta-ai/specs/atta-ecosystem-vision.md` and `apps/atta-ai/specs/cetana-reality-check.md`. No code yet.

**What it is:** Deliberation-guided execution. Vāda used as a planning authority over a body of work.

**V0 path (`pm-orchestrator.yaml`):** A Vāda Teams YAML for project-management deliberation. No new product — just another team in the catalog.

**V0.7 path (MCP + CLI):** Server exposing the four coordination files as live MCP tools, plus an `atta` CLI for terminal access.

**V1:** Adds automated adversarial review on completed task results, persistent decision records, state machine, UI.

**Domain:** `cetana.attalabs.dev` (when V1 built).

**Open consideration (May 6):** Existing agentic-PM frameworks (CCPM, APM) ship close to what Cetana V0/V0.7 specs. Sandboxed evaluation deferred to post-Reviewer-iteration. May change Cetana sequencing if either tool fits. See `atta-plan.md` "Investigate CCPM / APM" section.

**Next:** Don't build now. Reviewer prompt iteration ships first.

**Earliest realistic V1 build:** late 2026 / early 2027.

### Herald — *pluggable MCP tool*

**Status:** Pluggable MCP tool, not a core product. Has its own auth (separate Clerk app — out of scope for the Atta ecosystem auth migration).

Forensic CV-to-job-description match tool that exposes itself via MCP. Plugs into Vitakka or any MCP-compatible host.

---

## Apps in the monorepo

- `apps/vada-ai/` — Vāda product (web + mcp-server). Production-deployed at `vada.attalabs.dev`. Web hosts the hosted MCP route at `apps/vada-ai/web/src/app/api/mcp/route.ts`.
- `apps/atta-ai/` — ecosystem hub. Production-deployed at `attalabs.dev` (April 28). Hosts engine tools and engine-as-MCP.
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

**Status:** Shipped May 4 via PRs #9 + #10. Phases 1-4 of the implementation plan complete. Phase 5 (stdio session URL fix — `vada.ai` hardcode bug) and Phase 6 (rate limiting, audit log, hardening) remain as future work.

See `apps/vada-ai/specs/mcp-architecture.md` for full spec, `vada-decisions.md` D-029 for the architectural decision.

---

## DB schema management

Vāda's web app maintains its DB schema via `bun run db:push` from `apps/vada-ai/web/`. Ecosystem-shared key tables live in `@atta/db` (`packages/db/src/schema/keys.ts`) and have their own migration handling. No Drizzle migration tracking table exists yet.

When `@atta/db` consolidates further, decide whether to keep `db:push` or move to tracked migrations. No urgency.

---

## Doc system

This ecosystem uses a two-layer doc model — see `atta-coordination.md` for full rules.

**Project knowledge (Claude.ai) — 4 files:** `atta-coordination.md`, `atta-current-state.md`, `atta-plan.md`, `docs-index.md`.

**Repo — everything else.**

### Recently shipped (April 28 – May 6, 2026)

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

---

## What exists physically vs. what's planned

**Exists in code (May 6, 2026):**
- `apps/vada-ai/web` — Vāda web app with full teams catalog surface, production-deployed
- `apps/vada-ai/web/src/app/api/mcp/route.ts` — hosted MCP route, live
- `apps/vada-ai/mcp-server` — Vāda's local stdio MCP server with generic `spec_id` routing
- `apps/atta-ai/mcp-server` — engine-as-MCP server
- `apps/atta-ai/web` — atta hub, production-deployed
- `apps/herald-ai/*` — Herald surfaces (separate auth)
- `apps/vitakka-ai/` — scaffold; paused
- All `@atta/*` packages including `@atta/crypto`, `@atta/ui/account`, `@atta/db` ecosystem-shared key schemas
- `@atta/ui/engine-flow` module
- 9 YAML teams in `apps/vada-ai/yamls/`
- Calculator + vendor registry
- `apps/vada-ai/specs/vada-reviewers-spec.md` (rev 4)

**Specced but not yet built / iterated:**
- Reviewer system prompt iteration (Track B Item 3b)
- Synthesizer system prompt iteration (3c)
- Vāda Reviewers benchmark (Item 4)

**Drafted briefs awaiting dispatch:**
(none currently — all closed or superseded by May 4-5 work)

**Does not exist yet:**
- `apps/account/web` — DEFERRED indefinitely. D-030 decision: no `account.attalabs.dev` hub.
- `apps/sati-ai/*` — Sati doesn't exist
- `apps/cetana-ai/*` — Cetana doesn't exist (V0 is just a YAML)
- Hosted MCP hardening: rate limiting, audit log retention, KMS migration, per-key tool scoping (V2 work)
- Trust + MCP page content rewrites

---

## Open questions across the ecosystem

- **OQ-cross-1:** Does Sati get built before or after Vāda hits revenue?
- **~~OQ-cross-2~~ (RESOLVED May 5):** No billing hub at `account.attalabs.dev`. Sharing at component level via `@atta/ui/account` (D-030).
- **OQ-cross-3:** `atta.ai` migration — eager vs. wait for natural rebuild moment?
- **OQ-cross-4:** When `@atta/db` consolidates further, keep `db:push` or move to tracked migrations?
- **OQ-cross-5:** Cetana V0/V0.7 naming — is V0.7 (MCP+CLI) actually Cetana, or a separate product?
- **~~OQ-cross-6~~ (RESOLVED May 4):** Neither Path A nor Path B from the gap report. Server-side at rest, envelope-encrypted, decrypted only in request handlers (D-028).
- **~~OQ-cross-7~~ (RESOLVED May 5):** API key management lives in product-local Settings, composed from shared `@atta/ui/account` components (D-030).
- **OQ-cross-8:** Fate of the experimental YAMLs after Vāda Reviewers v1 benchmark.
- **~~OQ-cross-9~~ (RESOLVED May 3):** Engine vocabulary architecture — Choice A. `PlanNodeKind` + `PlanEdgeKind` shipped.
- **OQ-cross-10 (NEW May 6):** Does Cetana V0/V0.7 get superseded by adopting an existing agentic-PM framework (CCPM or APM)? Both ship the core mechanics in cetana-reality-check.md. Sandboxed evaluation deferred to post-Reviewer-iteration. See `atta-plan.md` "Investigate CCPM / APM" section.

Vāda-internal open questions live in `apps/vada-ai/specs/vada-state.md`.
