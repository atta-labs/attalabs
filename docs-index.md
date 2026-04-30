# Atta Monorepo — Documentation Index

## Skills

- [LangGraph execution + cognitive router internals. Load when working in packages/adapter-langgraph — modifying graph execution, agent dispatch, tool filtering, classifier logic, cost tracking, state reducers, or debugging MAX_REVISIONS / latency issues. Do NOT load for pure Plan compilation (engine-layer) or team config (teams-layer).](./.claude/skills/atta-adapter-langgraph/SKILL.md)
- [Vāda engine internals — Plan compilation, Agent/Workflow/Team types, validation rules, terminal states, and immutability invariants. Load when working inside packages/engine or debugging unexpected Plan graph structure. Do NOT load for adapter/router/provider runtime work.](./.claude/skills/atta-engine/SKILL.md)
- [Vāda agent and team configurations. Load when adding/modifying agents, teams, reviewer profiles, or building a verticalized team for a specific domain. Covers the tools-on/tools-off invariant. Do NOT load for engine primitives or adapter runtime.](./.claude/skills/atta-teams/SKILL.md)
- [Clerk authentication patterns across the Atta ecosystem — single Clerk app, subdomain SSO via cookie scope, shared users table](./.claude/skills/auth/SKILL.md)
- [Enforces TypeScript, export, import, and Biome code style rules across the Atta AI monorepo](./.claude/skills/code-style/SKILL.md)
- [Drizzle ORM patterns for Neon Postgres — schema, queries, JSON fields, migrations across Atta AI apps](./.claude/skills/database/SKILL.md)
- [Executor Protocol — patterns for executing dispatched tasks from the Principal](./.claude/skills/executor-protocol/SKILL.md)
- [Git commit format and rules for the Atta AI monorepo — enforced by commitlint + husky](./.claude/skills/git-commits/SKILL.md)
- [Herald AI forensic match engine — Skeptical Auditor prompt rules, match API behavior, signal detection, caching, timeout, and fallback](./.claude/skills/herald-engine/SKILL.md)
- [Shared searchable AI-model picker for all Atta AI products — ModelPicker component, dynamic catalog from models.dev, overlay curation, CatalogProvider SSR pattern](./.claude/skills/model-picker/SKILL.md)
- [Turborepo monorepo structure, workspace conventions, package imports, and task commands for the Atta ecosystem](./.claude/skills/monorepo-structure/SKILL.md)
- [Patterns for Next.js App Router API routes in the Atta AI monorepo — validation, errors, timeouts, LLM calls](./.claude/skills/ui-api-routes/SKILL.md)
- [How the branding document system works — Sanity schema, logo/favicon asset queries, per-product geometry, and the seed script for uploading assets](./.claude/skills/ui-branding/SKILL.md)
- [Rules and patterns for the AIACanvas particle system — AIACanvas, AIASphere, AIARing components in @atta/ui/canvas](./.claude/skills/ui-canvas-animation/SKILL.md)
- [How the CMS theme and UI config system works across all Atta AI products — Sanity schemas, theme generation, font loading, product configs](./.claude/skills/ui-cms-theme/SKILL.md)
- [Rules for building UI across ALL Atta AI apps — component usage, CSS variables, theming, typography, inline styles, library system](./.claude/skills/ui-components/SKILL.md)
- [How the @atta/ui multi-library system works — build-time generation (Vada pattern) vs runtime switching (Herald pattern), how to add a new app or library, and how to debug library resolution](./.claude/skills/ui-library-system/SKILL.md)
- [The complete and ONLY list of CSS color/radius/font tokens allowed in Atta AI UI code. Hardcoded Tailwind palette colors (green-500, zinc-900, blue-400, etc.) and raw hex / oklch / hsl values are FORBIDDEN — always use the semantic tokens defined in @atta/ui/styles/globals.css.](./.claude/skills/ui-theme-tokens/SKILL.md)
- [Vāda's product structure, two deliberation modes, wedges/capabilities/moats framework, current phase status, and locked architectural decisions. Load before any architectural decision, cross-cutting change, or when drafting executor tasks that span multiple layers.](./.claude/skills/vada-architecture/SKILL.md)
- [Vāda Brokered mode — single-shot advisory dispatch via MCP. Load when working on vada__deliberate, reviewer personas, caller protocol, or the MCP server tools. Distinct from Autonomous mode (multi-round browser sessions).](./.claude/skills/vada-brokered/SKILL.md)
- [Primitives and patterns for building Vāda home-page sections below the canvas hero — SectionWrapper, SectionLabel, StatusFooter, TwoColumnSection, and the section composition convention.](./.claude/skills/vada-home-sections/SKILL.md)
- [Vāda MCP server — dual-mode Claude integration and deliberation tools](./.claude/skills/vada-mcp-server/SKILL.md)
- [How to create and register YAML deliberation specs. Load when adding a new team, new deliberation mode, or new brokered spec. Covers both rounds-based and reviewers-based patterns, spec-registry registration, and verify scripts.](./.claude/skills/vada-yaml-authoring/SKILL.md)

## Specification Documents

### atta-ai

- [Atta Ecosystem — Vision](./apps/atta-ai/specs/atta-ecosystem-vision.md)
- [Attā Fine-Tuning Research — Forward Planning](./apps/atta-ai/specs/atta-finetuning-research.md)
- [Atta Naming Decision](./apps/atta-ai/specs/atta-naming-decision.md)
- [Cetanā (Architect Layer) — Capability Reality Check](./apps/atta-ai/specs/cetana-reality-check.md)

### vada-ai

- [Vāda Brokered Deliberation — Specification](./apps/vada-ai/specs/brokered-deliberation/00-overview.md)
- [01 — Architecture](./apps/vada-ai/specs/brokered-deliberation/01-architecture.md)
- [02 — MCP Tool Interface](./apps/vada-ai/specs/brokered-deliberation/02-mcp-tool-interface.md)
- [03 — Reviewer Personas](./apps/vada-ai/specs/brokered-deliberation/03-reviewer-personas.md)
- [04 — Caller Claude Protocol](./apps/vada-ai/specs/brokered-deliberation/04-caller-claude-protocol.md)
- [05 — Orchestration Rules](./apps/vada-ai/specs/brokered-deliberation/05-orchestration-rules.md)
- [06 — Implementation Plan (V1 Status + Remaining Work)](./apps/vada-ai/specs/brokered-deliberation/06-implementation-plan.md)
- [Phase 6 Prompt Validation — Brokered Mode](./apps/vada-ai/specs/brokered-deliberation/phase-6-prompt-validation.md)
- [Vāda Engine — Design Decisions](./apps/vada-ai/specs/engine/design-decisions.md)
- [Engine Flow Configurations](./apps/vada-ai/specs/engine/flow-configurations.md)
- [Blind Critic Investigation — Step 2 REVISED Rate](./apps/vada-ai/specs/engine/v2-results/blind-critic-investigation.md)
- [V2 Step 3.5 Part 1 Analysis — A0S vs A1S Baseline Ceiling on Sonnet 4.6](./apps/vada-ai/specs/engine/v2-results/step-1-analysis-sonnet.md)
- [V2 Step 1 Analysis — A0 vs A1 Baseline Ceiling on Haiku 4.5](./apps/vada-ai/specs/engine/v2-results/step-1-analysis.md)
- [V2 Step 3.5 Part 2 Analysis — A0S vs B0S Orchestration-Alone on Sonnet 4.6](./apps/vada-ai/specs/engine/v2-results/step-2-analysis-sonnet.md)
- [V2 Step 2 Analysis — A0 vs B0 Orchestration-Alone on Haiku 4.5](./apps/vada-ai/specs/engine/v2-results/step-2-analysis.md)
- [V2 Task 3.5 Analysis — Sonnet 4.6 Replication](./apps/vada-ai/specs/engine/v2-results/step-3-5-sonnet-replication.md)
- [Vāda · BYOK Gap Report](./apps/vada-ai/specs/vada-byok-gap-report.md)
- [Vāda · BYOK Architecture (Current State)](./apps/vada-ai/specs/vada-byok-principles.md)
- [Vāda YAML Cost Calculator — Concept Document](./apps/vada-ai/specs/vada-calculator-concept.md)
- [Vāda — Architectural Decision Log](./apps/vada-ai/specs/vada-decisions.md)
- [Vāda](./apps/vada-ai/specs/vada-human.md)
- [Vāda — Product Recognitions](./apps/vada-ai/specs/vada-product-recognitions.md)
- [Vāda — Product Specification](./apps/vada-ai/specs/vada-product-spec.md)
- [Vāda · The Science of Deliberation](./apps/vada-ai/specs/vada-science-of-deliberation.md)
- [Vāda — Current State](./apps/vada-ai/specs/vada-state.md)
- [Vāda — YAML Immutability Principle](./apps/vada-ai/specs/vada-yaml-immutability-principle.md)
- [YAML Deliberation Spec — Schema Reference](./apps/vada-ai/specs/yaml-schema-reference.md)

#### Archived

- [Benchmark Comparison Implementation Plan](./apps/vada-ai/specs/legacy/2026-04-18-benchmark-comparison.md)
- [Round Strip UI Implementation Plan](./apps/vada-ai/specs/legacy/2026-04-18-round-strip-ui.md)
- [Followups](./apps/vada-ai/specs/legacy/followups.md)
- [Mastra Usage Audit — Phase 2 Task 1](./apps/vada-ai/specs/legacy/mastra-audit.md)
- [Legacy specs](./apps/vada-ai/specs/legacy/README.md)
- [Step 4 Pre-Commitment — The Existential Test](./apps/vada-ai/specs/legacy/step-4-precommit.md)
- [Vāda Product Thesis](./apps/vada-ai/specs/legacy/vada-product-thesis.md)
- [Vāda · V1 Technical Specification](./apps/vada-ai/specs/legacy/vada-v1-tech-spec.md)
- [Vāda V2 — Experiment Plan (Execution)](./apps/vada-ai/specs/legacy/vada-v2-experiment-plan.md)
- [Vāda V2 Specification](./apps/vada-ai/specs/legacy/vada-v2-specification.md)
- [Vāda Workflow Design — Implementation Notes](./apps/vada-ai/specs/legacy/workflow-design.md)

## Root-Level Documentation

- [⚠️ ABSOLUTE RULE — NEVER COMMIT WITHOUT EXPLICIT INSTRUCTION](./CLAUDE.md)
- [Atta AI](./README.md)

