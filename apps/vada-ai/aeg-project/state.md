# Vāda — Current State

**Last updated:** June 2, 2026
**Purpose:** Per-product snapshot for Vāda. Agents working in `apps/vada-ai/` read this before starting any task. Root `aeg-project/state.md` has full ecosystem context.

---

## What Vāda is

YAML-driven deliberation runtime. The engine executes deliberation configurations expressed as YAML files. Other applications invoke Vāda via MCP by passing a YAML spec and a question; the engine runs it and returns the result. Live at `vada.attalabs.dev`. Hosted MCP at `vada.attalabs.dev/api/mcp`.

---

## Phase plan

### ✅ Complete — engine, schema, MCP, vendor registry
All shipped. Universal round-based schema v2 (D-033), hosted MCP, single-source BYOK, vendor registry (12 vendors), provider key validation (PR #65).

### Phase B — Reviewers iteration ← CURRENT

**B3b — Reviewer system prompt v2** — PR #77 open (June 1, 2026). Anti-convergence structured output. Pending merge.

**B3c — Synthesizer prompt iteration** — not started. Same pattern as B3b. Do after B3b merges and Reviewers are tested end-to-end.

**B4 — First benchmark run** — not started. Requires: Reviewers working end-to-end + benchmark architecture redesign (current judge measures transcript concatenation, not synthesized output — structural flaw).

**B5 — Iterate or ship Vāda Reviewers v1** — not started. Decision based on benchmark data.

### Blocked on manual action
**Reviewers have never been tested end-to-end.** To unblock: add OpenAI + xAI API keys to Vercel env vars for `vada.attalabs.dev`. Without these, the 3-vendor Reviewers team (Anthropic + Google + OpenAI/xAI) can't run. Anthropic works by default.

---

## Current build state

**Production live:**
- `vada.attalabs.dev` — full web app
- `vada.attalabs.dev/api/mcp` — hosted MCP, Streamable HTTP, bearer auth
- 2 published teams: `vada-reviewers`, `vada-reviewers-synthesis`
- 7 experimental teams (hidden from public catalog): `a0-baseline`, `a1-baseline`, `brokered-trio`, `brokered-quartet`, `crucible`, `sparring`, `war-room`

**Recent PRs:**
- PR #147 — Homepage rewrite: removed engine/YAML sections (PositioningSection, MechanismSection, EcosystemSection), added product-focused sections (WhatItIs, WhyItWorks, TryIt, McpDeveloper), CMS branding fetch removed from page.tsx (open)
- PR #65 — provider key validation before `runLangGraph` dispatch ✓
- PR #77 — Reviewers system prompt v2 (open, pending merge)

**Known bugs:**
- Sparring duplicates Critic message — open, not fixed
- Trust page content references browser-only BYOK — stale, needs rewrite
- `vada-reviewers-synthesis` synthesizer template bug fixed in D-033 migration — confirmed resolved

**Never tested:**
- Reviewers end-to-end with real vendor-diverse models (blocked on OpenAI + xAI keys)
- MCP via Claude Code CLI (server confirmed healthy via curl; Claude.ai web has Track E12 broker bug)

---

## Stack

- Next.js App Router, React, Tailwind, shadcn/ui
- Neon Postgres + Drizzle ORM (`@atta/db` for shared tables, `apps/vada-ai/web/src/db/schema.ts` for app-local)
- Clerk (shared AttaLabs Clerk app, `.attalabs.dev` cookie)
- `@atta/engine` — Plan compiler (`compileFlow`, `loadFlow`, `validateFlow`)
- `@atta/adapter-langgraph` — LangGraph execution, SDK-shape dispatch (3 branches: anthropic, google-genai, openai-compat)
- `@atta/models` — vendor registry (12 vendors), model catalog, `resolveDispatchModel`
- `@atta/crypto` — envelope encryption (AES-256-GCM) for provider keys
- LangGraph (`@xyflow/react` for visualization)

---

## Key files

| File | Purpose |
|------|---------|
| `apps/vada-ai/specs/vada-state.md` | Full Vāda-internal state (detailed, may be slightly stale) |
| `apps/vada-ai/specs/vada-decisions.md` | Vāda-specific decision log |
| `apps/vada-ai/specs/yaml-schema-reference.md` | YAML schema v2 definitive reference |
| `apps/vada-ai/specs/vada-reviewers-spec.md` | Reviewers team spec (rev 5 + v2 prompt) |
| `apps/vada-ai/yamls/` | All 9 deliberation YAML specs |
| `apps/vada-ai/web/src/app/api/deliberation/[id]/workflow/run/route.ts` | Main deliberation route |
| `apps/vada-ai/web/src/app/api/mcp/route.ts` | Hosted MCP endpoint |
| `.claude/skills/vada-architecture/SKILL.md` | Architecture master reference — read before any cross-cutting change |

---

## What's NOT done yet

- Reviewer system prompt v2 — PR #77 open, not merged
- End-to-end Reviewers test (needs OpenAI + xAI keys in Vercel)
- Synthesizer prompt iteration (B3c)
- Benchmark run (B4)
- Benchmark architecture redesign (judge measures wrong thing)
- Trust page rewrite (references stale BYOK model)
- `vada.attalabs.dev/api/mcp` via Claude Code CLI tested with real deliberation (not just curl health check)
- Vāda API key generation UI confirmed working for a new user
- Sparring duplicate Critic message bug

---

## Open questions

- OQ-C: How does the engine express Principal-terminated loops?
- OQ-G: How are YAML forks named without `-vN` convention?
- OQ-H: Adapter refactor to new TemplateState shape (round-namespaced) — when?
- OQ-I: Shape detection vs generic walker in `compileFlow` — keep or revisit with adapter refactor?
- OQ-cross-8: Fate of the 7 experimental YAMLs after benchmark data exists
