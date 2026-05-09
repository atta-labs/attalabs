# Atta Ecosystem — Current State

**Last updated:** May 6, 2026 (post hosted MCP + single-source-keys + shared-keys-ui + doc audit)
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

Live at `https://vada.attalabs.dev`. Vāda Teams is the catalog of YAML team specifications compiled by the Atta engine. Vāda Reviewers v1 (vendor-diverse team) registered. Hosted MCP server live at `https://vada.attalabs.dev/api/mcp` (May 4). Single-source-keys reversal locked (May 4) — server-side `user_provider_keys` is canonical, IndexedDB demoted. `feat/shared-keys-ui` merged (May 5). Reviewer prompt iteration phase is next (Track B Item 3b).

(Full Vāda detail unchanged from May 6 snapshot; see `apps/vada-ai/specs/vada-state.md` for internal phase tracking.)

### Vitakka — *less active, paused*

Concept locked, not actively in development. Personal AI thinking partner — the focus layer. Domain `vitakka.attalabs.dev` (when built). Resume after Vāda revenue milestone.

### Sati — *new, conceptual only*

Renamed from previous "Atta-the-product" April 26, 2026. No code exists yet. Memory layer / cross-provider persistent self. Domain `sati.attalabs.dev` (when built). Buildout downstream of Vitakka resuming.

### Cetana — *long-horizon, V4+ direction (with V0/V0.7 path)*

Concept locked in `apps/atta-ai/specs/atta-ecosystem-vision.md` and `apps/atta-ai/specs/cetana-reality-check.md`. No code yet. Deliberation-guided execution. V0 path (`pm-orchestrator.yaml`) is a Vāda Teams YAML. V0.7 path is MCP+CLI. V1 adds adversarial review, decision records, state machine, UI. Domain `cetana.attalabs.dev` (when V1 built). Don't build now. Reviewer prompt iteration ships first. Earliest realistic V1 build: late 2026 / early 2027.

### Herald — *pluggable MCP tool*

Pluggable MCP tool, not a core product. Has its own auth (separate Clerk app — out of scope for ecosystem auth migration). Forensic CV-to-job-description match tool that exposes itself via MCP.

---

## Apps in the monorepo

- `apps/vada-ai/` — Vāda product (web + mcp-server). Production-deployed at `vada.attalabs.dev`.
- `apps/atta-ai/` — ecosystem hub. Production-deployed at `attalabs.dev` (April 28).
- `apps/herald-ai/` — Herald product (web + mobile + mcp). Separate auth.
- `apps/vitakka-ai/` — scaffold; product paused.
- `apps/cetana-ai/` does not exist yet (V0 is just a YAML in the spec).

---

## Shared infrastructure (`@atta/*` packages)

`@atta/engine`, `@atta/agents`, `@atta/adapter-langgraph`, `@atta/auth`, `@atta/crypto`, `@atta/db`, `@atta/ui` (includes `@atta/ui/account` + `@atta/ui/engine-flow`), `@atta/cms`, `@atta/storage`, `@atta/identity`, `@atta/typescript-config`, `@atta/models`. `@xyflow/react` is a direct dependency of `apps/vada-ai/web`.

---

## Auth state

Single Clerk app, ecosystem-wide. Live in production. Cookie scoped to `.attalabs.dev`. Vitakka Clerk app in dashboard — unused, can delete. Apple OAuth deferred. Email auth disabled in Clerk dashboard (V1 OAuth-only).

---

## Domain & DNS state

- `attalabs.dev` registered at GoDaddy. Production DNS configured.
- `vada.attalabs.dev` — Vāda production. Live.
- `attalabs.dev` (root) — atta hub. Live.
- `clerk.attalabs.dev` — Clerk frontend API CNAME. Live.
- `*.attalabs.dev` — wildcard CNAME to Vercel.
- Local dev: `attalabs.test`, `vada.attalabs.test` resolve to `127.0.0.1`.
- `atta.com` (€500K) and `atta.ai` (owned, may free 2027) — not pursued.

---

## BYOK architecture state

Server-side at rest, decrypted per-request, since May 4, 2026 (D-028 + D-029). `user_provider_keys` table holds envelope-encrypted provider keys. Distinct from prior browser-only BYOK story (pre-May 4). `@atta/identity` package retained for probe/Ollama/migration utilities, no longer canonical key store.

Two specs:
- `apps/vada-ai/specs/vada-byok-principles.md` — current state.
- `apps/vada-ai/specs/vada-byok-gap-report.md` — historical.

---

## Hosted MCP — shipped (May 4, 2026)

Live at `https://vada.attalabs.dev/api/mcp`. Streamable HTTP. Bearer auth via `vada_*` API keys (SHA-256 hashed). Provider keys envelope-encrypted in `user_provider_keys`. Two MCP tools: `vada__consult`, `vada__deliberate`. Phases 1-4 of implementation plan complete. Phase 5 (stdio session URL fix) and Phase 6 (rate limiting, audit log, hardening) remain.

See `apps/vada-ai/specs/mcp-architecture.md` for full spec, `vada-decisions.md` D-029.

---

## DB schema management

Vāda's web app maintains schema via `bun run db:push` from `apps/vada-ai/web/`. Ecosystem-shared key tables in `@atta/db` have their own migration handling. No Drizzle migration tracking table yet. When `@atta/db` consolidates further, decide whether to keep `db:push` or move to tracked migrations.

---

## Doc system

This ecosystem uses the repo as the source of truth for project management. See `coordination.md` for full rules.

**Project-management files (in repo, this directory):** `coordination.md`, `state.md`, `plan.md`. Plus `docs-index.md` at repo root.

**Everything else is repo specs/skills/code, indexed by `docs-index.md`.**

### Recently shipped (April 28 – May 6, 2026)

(See `plan.md` for the rolling completed-work log. Highlights: hosted MCP shipped May 4, single-source-keys reversal May 4, shared-keys-ui merged May 5, doc audit PR merged May 6.)

### Stale, references old framing or pre-merge state

- `apps/vada-ai/specs/vada-state.md` (Vāda-internal — needs phase update post-May-4-5)
- `apps/vada-ai/specs/vada-product-spec.md`
- `apps/vada-ai/specs/vada-product-recognitions.md`
- `apps/vada-ai/specs/vada-reviewers-spec.md` — references MCP/BYOK in passing; verify still accurate post-May-4
- `apps/vada-ai/specs/vada-teams-catalog/02-mcp-tool-interface.md` — references old `apiKey` body parameter (no longer accepted post-D-028)
- `apps/vada-ai/specs/vada-teams-catalog/04-caller-claude-protocol.md` — references "Caller Claude owns synthesis" (reversed by D-016)
- `apps/vada-ai/CLAUDE.md` — Settings tab table still shows Teams tab
- Trust page content in `apps/vada-ai/web/.../trust/...` — references browser-only BYOK; needs full rewrite

---

## What exists physically vs. what's planned

**Exists in code (May 6, 2026):**
- `apps/vada-ai/web` — Vāda web app, production-deployed
- `apps/vada-ai/web/src/app/api/mcp/route.ts` — hosted MCP route, live
- `apps/vada-ai/mcp-server` — Vāda's local stdio MCP server
- `apps/atta-ai/mcp-server` — engine-as-MCP server
- `apps/atta-ai/web` — atta hub, production-deployed
- `apps/herald-ai/*` — Herald surfaces (separate auth)
- `apps/vitakka-ai/` — scaffold; paused
- All `@atta/*` packages
- 9 YAML teams in `apps/vada-ai/yamls/`
- Calculator + vendor registry
- `apps/vada-ai/specs/vada-reviewers-spec.md` (rev 4)

**Specced but not yet built / iterated:**
- Reviewer system prompt iteration (Track B Item 3b)
- Synthesizer system prompt iteration (3c)
- Vāda Reviewers benchmark (Item 4)

**Does not exist yet:**
- `apps/account/web` — DEFERRED indefinitely.
- `apps/sati-ai/*` — Sati doesn't exist
- `apps/cetana-ai/*` — Cetana doesn't exist (V0 is just a YAML)
- Hosted MCP hardening
- Trust + MCP page content rewrites

---

## Open questions across the ecosystem

- **OQ-cross-1:** Does Sati get built before or after Vāda hits revenue?
- **~~OQ-cross-2~~ (RESOLVED May 5):** No billing hub at `account.attalabs.dev`.
- **OQ-cross-3:** `atta.ai` migration — eager vs. wait for natural rebuild moment?
- **OQ-cross-4:** When `@atta/db` consolidates further, keep `db:push` or move to tracked migrations?
- **OQ-cross-5:** Cetana V0/V0.7 naming — is V0.7 (MCP+CLI) actually Cetana, or a separate product?
- **~~OQ-cross-6~~ (RESOLVED May 4):** Server-side at rest, envelope-encrypted, decrypted only in request handlers.
- **~~OQ-cross-7~~ (RESOLVED May 5):** API key management lives in product-local Settings.
- **OQ-cross-8:** Fate of the experimental YAMLs after Vāda Reviewers v1 benchmark.
- **~~OQ-cross-9~~ (RESOLVED May 3):** Engine vocabulary architecture — Choice A.
- **OQ-cross-10 (NEW May 6):** Does Cetana V0/V0.7 get superseded by adopting an existing agentic-PM framework (CCPM or APM)?

Vāda-internal open questions live in `apps/vada-ai/specs/vada-state.md`.

---

> **Note:** This is the May 6 snapshot moved as-is from Claude.ai project knowledge. A follow-up commit will update it for May 9 reality (Cetana V0 in flight after Slice -1 validation, etc.).
