# Atta Monorepo — Documentation Index

## Skills

- [LangGraph execution + cognitive router internals. Load when working in packages/adapter-langgraph — modifying graph execution, agent dispatch, tool filtering, classifier logic, cost tracking, state reducers, or debugging MAX_REVISIONS / latency issues. Do NOT load for pure Plan compilation (engine-layer) or team config (teams-layer).](./.claude/skills/atta-adapter-langgraph/SKILL.md)
- [Atta engine internals — Flow → Plan compilation via compileFlow, the v2 universal round-based schema, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.](./.claude/skills/atta-engine/SKILL.md)
- [Vāda agent and team configurations. Load when adding/modifying agents, teams, reviewer profiles, or building a verticalized team for a specific domain. Covers the tools-on/tools-off invariant. Do NOT load for engine primitives or adapter runtime.](./.claude/skills/atta-teams/SKILL.md)
- [Clerk authentication patterns across the Atta ecosystem — shared single Clerk app with subdomain SSO for Atta/Vāda; Herald is a standalone exception with its own Clerk app and DB](./.claude/skills/auth/SKILL.md)
- [Enforces TypeScript, export, import, and Biome code style rules across the Atta AI monorepo](./.claude/skills/code-style/SKILL.md)
- [Drizzle ORM patterns for Neon Postgres — schema, queries, JSON fields, migrations across Atta AI apps](./.claude/skills/database/SKILL.md)
- [Executor Protocol — patterns for executing dispatched tasks from the Principal](./.claude/skills/executor-protocol/SKILL.md)
- [Git commit format and rules for the Atta AI monorepo — enforced by commitlint + husky](./.claude/skills/git-commits/SKILL.md)
- [Herald AI forensic match engine — Skeptical Auditor YAML rules, audit API behavior, GitHub signal tool, caching, timeout, and fallback](./.claude/skills/herald-engine/SKILL.md)
- [Shared searchable AI-model picker for all Atta AI products — ModelPicker component, dynamic catalog from models.dev, overlay curation, CatalogProvider SSR pattern](./.claude/skills/model-picker/SKILL.md)
- [Turborepo monorepo structure, workspace conventions, package imports, and task commands for the Atta ecosystem](./.claude/skills/monorepo-structure/SKILL.md)
- [Patterns for Next.js App Router API routes in the Atta AI monorepo — validation, errors, timeouts, LLM calls](./.claude/skills/ui-api-routes/SKILL.md)
- [How the branding document system works — Sanity schema, logo/favicon asset queries, per-product geometry, and the seed script for uploading assets](./.claude/skills/ui-branding/SKILL.md)
- [Rules and patterns for the AIACanvas particle system — AIACanvas, AIASphere, AIARing components in @atta/ui/canvas](./.claude/skills/ui-canvas-animation/SKILL.md)
- [How the CMS theme and UI config system works across all Atta AI products — Sanity schemas, theme generation, font loading, product configs](./.claude/skills/ui-cms-theme/SKILL.md)
- [Rules for building UI across ALL Atta AI apps — component usage, CSS variables, theming, typography, inline styles, library system](./.claude/skills/ui-components/SKILL.md)
- [How the @atta/ui multi-library system works — build-time generation vs runtime switching, how to add a new app or library, and how to debug library resolution](./.claude/skills/ui-library-system/SKILL.md)
- [The complete and ONLY list of CSS color/radius/font tokens allowed in Atta AI UI code, AND the doctrine for which token to reach for in which situation. Hardcoded Tailwind palette colors (green-500, zinc-900, blue-400, etc.), raw hex / oklch / hsl values, and absolute colors (text-white, bg-black) are FORBIDDEN — always use the semantic tokens defined in @atta/ui/styles/globals.css according to the role doctrine below.](./.claude/skills/ui-theme-tokens/SKILL.md)
- [Vāda's product structure (Vāda Teams catalog), wedges/capabilities/moats framework, current phase status, and locked architectural decisions. Load before any architectural decision, cross-cutting change, or when drafting executor tasks that span multiple layers.](./.claude/skills/vada-architecture/SKILL.md)
- [Primitives and patterns for building Vāda home-page sections below the canvas hero — SectionWrapper, SectionLabel, StatusFooter, TwoColumnSection, and the section composition convention.](./.claude/skills/vada-home-sections/SKILL.md)
- [Vāda MCP server — two surfaces: local stdio (current) and hosted HTTP (target). Both expose vada__consult and vada__deliberate tools routed to YAML catalog specs. Load when implementing MCP tools, adding catalog specs, or building/debugging either surface.](./.claude/skills/vada-mcp-server/SKILL.md)
- [How to create and register v2 YAML deliberation specs. Load when adding a new team or new YAML spec. Covers all four flow shapes (solo, brokered ± synthesis, rounds + audit) under the universal round-based schema, auto-discovery, and verify scripts.](./.claude/skills/vada-yaml-authoring/SKILL.md)

## Specification Documents

### attalabs

- [AttaLabs — CMS identity](./apps/attalabs/specs/attalabs-cms-identity.md)
- [Atta — Build Strategy](./apps/attalabs/specs/atta-build-strategy.md)
- [Atta Ecosystem — Vision](./apps/attalabs/specs/atta-ecosystem-vision.md)
- [Attā Fine-Tuning Research — Forward Planning](./apps/attalabs/specs/atta-finetuning-research.md)
- [Atta — Market Research](./apps/attalabs/specs/atta-market-research.md)
- [Atta Naming Decision](./apps/attalabs/specs/atta-naming-decision.md)
- [Cetanā (Architect Layer) — Capability Reality Check](./apps/attalabs/specs/cetana-reality-check.md)

### herald-ai

- [Herald — app architecture](./apps/herald-ai/specs/herald-app-architecture.md)
- [Herald — product backlog](./apps/herald-ai/specs/herald-backlog.md)
- [Herald Decisions](./apps/herald-ai/docs/herald-decisions-legacy.md)

### vada-ai

- [Vāda Engine — Design Decisions](./apps/vada-ai/specs/engine/design-decisions.md)
- [Engine Flow Configurations](./apps/vada-ai/specs/engine/flow-configurations.md)
- [Blind Critic Investigation — Step 2 REVISED Rate](./apps/vada-ai/specs/engine/v2-results/blind-critic-investigation.md)
- [V2 Step 3.5 Part 1 Analysis — A0S vs A1S Baseline Ceiling on Sonnet 4.6](./apps/vada-ai/specs/engine/v2-results/step-1-analysis-sonnet.md)
- [V2 Step 1 Analysis — A0 vs A1 Baseline Ceiling on Haiku 4.5](./apps/vada-ai/specs/engine/v2-results/step-1-analysis.md)
- [V2 Step 3.5 Part 2 Analysis — A0S vs B0S Orchestration-Alone on Sonnet 4.6](./apps/vada-ai/specs/engine/v2-results/step-2-analysis-sonnet.md)
- [V2 Step 2 Analysis — A0 vs B0 Orchestration-Alone on Haiku 4.5](./apps/vada-ai/specs/engine/v2-results/step-2-analysis.md)
- [V2 Task 3.5 Analysis — Sonnet 4.6 Replication](./apps/vada-ai/specs/engine/v2-results/step-3-5-sonnet-replication.md)
- [Spike: Can Fusion Ship as a Team Within MOAT-A?](./apps/vada-ai/specs/fusion-as-team-spike.md)
- [Generic Flow Refactor — Design](./apps/vada-ai/specs/generic-flow-refactor.md)
- [Vāda MCP Architecture — Hosted Target](./apps/vada-ai/specs/mcp-architecture.md)
- [Tools / MCP Capability Spike — S0 Findings](./apps/vada-ai/specs/tools-capability-spike.md)
- [Vāda — product backlog](./apps/vada-ai/specs/vada-backlog.md)
- [Vāda · BYOK Gap Report](./apps/vada-ai/specs/vada-byok-gap-report.md)
- [Vāda · BYOK Architecture (Current State)](./apps/vada-ai/specs/vada-byok-principles.md)
- [Vāda YAML Cost Calculator — Concept Document](./apps/vada-ai/specs/vada-calculator-concept.md)
- [Vāda — Architectural Decision Log](./apps/vada-ai/docs/vada-decisions-legacy.md)
- [Vāda](./apps/vada-ai/specs/vada-human.md)
- [Vāda — Product Recognitions](./apps/vada-ai/specs/vada-product-recognitions.md)
- [Vāda — Product Specification](./apps/vada-ai/specs/vada-product-spec.md)
- [Vāda V1 — Belief-Revision Decision Record](./apps/vada-ai/specs/vada-rethink-v1-decision.md)
- [Vāda — rethink: positioning, teams, model sources, frontier findings](./apps/vada-ai/specs/vada-rethink.md)
- [Vāda Reviewers — Product Specification (v1, revision 5)](./apps/vada-ai/specs/vada-reviewers-spec.md)
- [`karpathy/llm-council` and `Lykhoyda/ask-llm` — Technical Deep Dive](./apps/vada-ai/specs/vada-reviewers-tech-deep-dive.md)
- [Vāda · The Science of Deliberation](./apps/vada-ai/specs/vada-science-of-deliberation.md)
- [Vāda — Current State](./apps/vada-ai/specs/vada-state.md)
- [Vāda Brokered Deliberation — Specification](./apps/vada-ai/specs/vada-teams-catalog/00-overview.md)
- [01 — Architecture](./apps/vada-ai/specs/vada-teams-catalog/01-architecture.md)
- [02 — MCP Tool Interface](./apps/vada-ai/specs/vada-teams-catalog/02-mcp-tool-interface.md)
- [03 — Reviewer Personas](./apps/vada-ai/specs/vada-teams-catalog/03-reviewer-personas.md)
- [04 — Caller Claude Protocol](./apps/vada-ai/specs/vada-teams-catalog/04-caller-claude-protocol.md)
- [05 — Orchestration Rules](./apps/vada-ai/specs/vada-teams-catalog/05-orchestration-rules.md)
- [Outside Read — vada-fusion-native](./apps/vada-ai/specs/vada-teams-catalog/06-outside-read.md)
- [Vāda Web Restructure — Plan](./apps/vada-ai/specs/vada-web-restructure-plan.md)
- [Vāda — YAML Immutability Principle](./apps/vada-ai/specs/vada-yaml-immutability-principle.md)
- [YAML Deliberation Spec — Schema Reference](./apps/vada-ai/specs/yaml-schema-reference.md)

#### Archived

- [Benchmark Comparison Implementation Plan](./apps/vada-ai/specs/legacy/2026-04-18-benchmark-comparison.md)
- [Round Strip UI Implementation Plan](./apps/vada-ai/specs/legacy/2026-04-18-round-strip-ui.md)
- [06 — Implementation Plan (V1 Status + Remaining Work)](./apps/vada-ai/specs/legacy/2026-04-30-brokered-implementation-plan.md)
- [Phase 6 Prompt Validation — Brokered Mode](./apps/vada-ai/specs/legacy/2026-04-30-phase-6-prompt-validation.md)
- [Followups](./apps/vada-ai/specs/legacy/followups.md)
- [Mastra Usage Audit — Phase 2 Task 1](./apps/vada-ai/specs/legacy/mastra-audit.md)
- [Legacy specs](./apps/vada-ai/specs/legacy/README.md)
- [Step 4 Pre-Commitment — The Existential Test](./apps/vada-ai/specs/legacy/step-4-precommit.md)
- [Vāda Product Thesis](./apps/vada-ai/specs/legacy/vada-product-thesis.md)
- [Vāda · V1 Technical Specification](./apps/vada-ai/specs/legacy/vada-v1-tech-spec.md)
- [Vāda V2 — Experiment Plan (Execution)](./apps/vada-ai/specs/legacy/vada-v2-experiment-plan.md)
- [Vāda V2 Specification](./apps/vada-ai/specs/legacy/vada-v2-specification.md)
- [Vāda Workflow Design — Implementation Notes](./apps/vada-ai/specs/legacy/workflow-design.md)

### vinaya

- [Loop Engineering — proposal (NOT ratified)](./apps/vinaya/specs/loop-engineering.md)
- [Vinaya — product backlog](./apps/vinaya/specs/vinaya-backlog.md)
- [Vinaya — Product Spec (seed)](./apps/vinaya/specs/vinaya-spec.md)

## Root-Level Documentation

- [⚠️ ABSOLUTE RULE — NEVER COMMIT WITHOUT EXPLICIT INSTRUCTION](./CLAUDE.md)
- [AttaLabs Monorepo](./README.md)

