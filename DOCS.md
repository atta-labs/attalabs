# Attā AI — Documentation Index

One-page index of all live documentation in the repo.

---

## Claude Code Skills

Skills live at `.claude/skills/<name>/SKILL.md`. Load via the `Skill` tool.

### Architecture & Product

| Skill | Load When |
|-------|-----------|
| `vada-architecture` | High-level Vāda architecture, layer stack, phase status, moat framework |
| `vada-brokered` | Brokered mode — `vada__consult`, reviewer personas, Caller Claude protocol |
| `vada-mcp-server` | MCP server implementation (`apps/vada-ai/mcp-server/`) |
| `vada-home-sections` | Vāda home page section primitives (`SectionWrapper`, `TwoColumnSection`, etc.) |

### Engine & Runtime

| Skill | Load When |
|-------|-----------|
| `atta-engine` | Plan compiler (`packages/engine/`) — types, validation, compilers, node ID scheme |
| `atta-adapter-langgraph` | LangGraph execution + cognitive router (`packages/adapter-langgraph/`) |
| `atta-teams` | Agent and team configs (`apps/vada-ai/agents/`, `apps/vada-ai/teams/`) |

### Infrastructure

| Skill | Load When |
|-------|-----------|
| `database` | Drizzle ORM, Neon Postgres, migrations |
| `auth` | Clerk patterns, middleware, per-product isolation |
| `model-picker` | `ModelPicker` component, dynamic model catalog, overlay curation |
| `monorepo-structure` | Workspace layout, package imports, Turborepo tasks |

### UI

| Skill | Load When |
|-------|-----------|
| `ui-components` | Component usage, CSS variables, theming |
| `ui-theme-tokens` | Complete semantic color/font/radius token list — hardcoded palette forbidden |
| `ui-library-system` | Build-time UI library generation, runtime switching, adding apps/libraries |
| `ui-cms-theme` | SSR theme loading, fonts, Sanity studios |
| `ui-canvas-animation` | `AIACanvas`, `AIASphere`, `AIARing` — animated canvas primitives |
| `ui-branding` | Logos, favicons, brand assets, seed script |
| `ui-api-routes` | Route patterns, validation, LLM call patterns |

### Herald AI

| Skill | Load When |
|-------|-----------|
| `herald-engine` | Forensic audit, Skeptical Auditor, signal detection |

### Process

| Skill | Load When |
|-------|-----------|
| `executor-protocol` | Dispatched task rules — verification, reporting, commit discipline |
| `git-commits` | Commit format and conventions |
| `code-style` | TypeScript rules, export patterns, Biome config |

---

## CLAUDE.md Files

| File | Scope |
|------|-------|
| [`CLAUDE.md`](CLAUDE.md) | Monorepo root — tech stack, workspace, shared rules, skill index |
| [`apps/vada-ai/CLAUDE.md`](apps/vada-ai/CLAUDE.md) | Vāda AI product overview |
| [`apps/vada-ai/web/CLAUDE.md`](apps/vada-ai/web/CLAUDE.md) | Vāda web app — architecture, API routes, session states |
| [`apps/herald-ai/CLAUDE.md`](apps/herald-ai/CLAUDE.md) | Herald AI product overview |
| [`packages/ui/CLAUDE.md`](packages/ui/CLAUDE.md) | `@atta/ui` component library |
| [`packages/cms/CLAUDE.md`](packages/cms/CLAUDE.md) | `@atta/cms` — Sanity schemas, typed queries, theme utilities |
| [`packages/db/CLAUDE.md`](packages/db/CLAUDE.md) | `@atta/db` — Drizzle schema, Neon client |
| [`packages/auth/CLAUDE.md`](packages/auth/CLAUDE.md) | `@atta/auth` — Clerk wrapper |

---

## Vāda AI Specs

All specs live at `apps/vada-ai/specs/`.

### Brokered Deliberation (`brokered-deliberation/`)

Read in order (00 → 06); each assumes the previous ones.

| File | Purpose |
|------|---------|
| `00-overview.md` | What Brokered is, operational model, design principles |
| `01-architecture.md` | Component diagram, data flow, sequence diagrams |
| `02-mcp-tool-interface.md` | `vada__consult` schema, parameters, return shape |
| `03-reviewer-personas.md` | System prompts for each persona, output formats |
| `04-caller-claude-protocol.md` | How Caller Claude uses Vāda, when to invoke, how to synthesize |
| `05-orchestration-rules.md` | When to run more rounds, when to escalate |
| `06-implementation-plan.md` | Commit sequence, test gates, verification |

### Engine (`engine/`)

| File | Purpose |
|------|---------|
| `design-decisions.md` | Architectural decisions with rationale (tools: string[], Haiku rule, etc.) |
| `mastra-audit.md` | Mastra removal audit (historical — see `legacy/`) |

### Engine V2 Results (`engine/v2-results/`)

Reviewer rounds (Gemini, ChatGPT, DeepSeek) on architectural questions.

| File | Purpose |
|------|---------|
| `blind-critic-investigation.md` | Analysis of BlindCritic audit failures |
| `step-1-analysis.md` / `step-1-analysis-sonnet.md` | Round analysis — Step 1 |
| `step-2-analysis.md` / `step-2-analysis-sonnet.md` | Round analysis — Step 2 |
| `step-3-5-sonnet-replication.md` | Sonnet replication of Steps 3-5 |

### Legacy (`legacy/`)

Historical specs — superseded. Read only if investigating prior design decisions.

| File | Purpose |
|------|---------|
| `README.md` | Legacy index with deprecation notes |
| `vada-product-thesis.md` | Original product thesis |
| `vada-v1-tech-spec.md` | V1 implementation spec |
| `vada-v2-experiment-plan.md` | V2 experiment design |
| `vada-v2-specification.md` | V2 full spec |
| `workflow-design.md` | Original Mastra workflow design |
| `2026-04-18-benchmark-comparison.md` | Benchmark comparison (pre-LangGraph) |
| `2026-04-18-round-strip-ui.md` | Round strip UI design notes |
| `followups.md` | Deferred follow-up items |
| `step-4-precommit.md` | Pre-commit analysis notes |

### Root Specs

| File | Purpose |
|------|---------|
| `vada-product-spec.md` | Full product truth — positioning, features, pre-launch requirements |
| `vada-science-of-deliberation.md` | Foundational deliberation theory |
| `vada-byok-principles.md` | BYOK architecture principles |
| `vada-human.md` | Vāda's human-facing narrative |
