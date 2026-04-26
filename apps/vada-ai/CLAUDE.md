# Vada AI — Product Overview

Vada AI is a multi-agent deliberation engine. Multiple LLM agents debate a question across rounds, producing a synthesized conclusion with a full audit trail. Ships as an MCP server and a web UI. "Vāda" means "deliberation" in Pali.

**Domain:** vada.ai

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vada-ai-web` | Active |
| MCP Server | `mcp-server/` | `@vada/mcp-server` | Active |
| Mobile | `mobile/` | `@atta/vada-ai-mobile` | Scaffold |

---

## Packages (product-specific)

| Package | Path | Purpose |
|---------|------|---------|
| `@vada/mcp-server` | `mcp-server/` | MCP server — `vada__consult` + `vada__deliberate` tools |

Agent display metadata (`VadaAgentVisual` type + per-agent configs) lives in `web/src/components/agents/visuals/` (web-only, no separate package). The `@vada/agents` and `@vada/agent-metadata` packages are **deleted** — do not reference them.

---

## Specifications

### Active

| Spec | Path | Purpose |
|------|------|---------|
| Product spec | [specs/vada-product-spec.md](specs/vada-product-spec.md) | Full product truth — positioning, features, launch requirements |
| Product recognitions | [specs/vada-product-recognitions.md](specs/vada-product-recognitions.md) | Foundational recognitions about what Vāda is (YAML-driven runtime, not closed app) |
| Current state | [specs/vada-state.md](specs/vada-state.md) | Current phase, completed milestones, next work |
| Decisions log | [specs/vada-decisions.md](specs/vada-decisions.md) | Append-only log of architectural decisions and rationale |
| YAML immutability | [specs/vada-yaml-immutability-principle.md](specs/vada-yaml-immutability-principle.md) | Foundational principle: YAML files are immutable once benchmarked |
| Science of deliberation | [specs/vada-science-of-deliberation.md](specs/vada-science-of-deliberation.md) | Foundational deliberation theory |
| BYOK principles | [specs/vada-byok-principles.md](specs/vada-byok-principles.md) | BYOK architecture principles |
| Vāda human | [specs/vada-human.md](specs/vada-human.md) | Human-facing narrative |

### Brokered Deliberation (`specs/brokered-deliberation/`)

`vada__consult` MCP tool — full spec in read order (00 → 06).

| Spec | Purpose |
|------|---------|
| [00-overview.md](specs/brokered-deliberation/00-overview.md) | What Brokered is, operational model, design principles |
| [01-architecture.md](specs/brokered-deliberation/01-architecture.md) | Component diagram, data flow, sequence diagrams |
| [02-mcp-tool-interface.md](specs/brokered-deliberation/02-mcp-tool-interface.md) | Tool schema, parameters, return shape |
| [03-reviewer-personas.md](specs/brokered-deliberation/03-reviewer-personas.md) | System prompts for each persona, output formats |
| [04-caller-claude-protocol.md](specs/brokered-deliberation/04-caller-claude-protocol.md) | How Caller Claude uses Vāda, when to invoke |
| [05-orchestration-rules.md](specs/brokered-deliberation/05-orchestration-rules.md) | When to escalate, when to add rounds |
| [06-implementation-plan.md](specs/brokered-deliberation/06-implementation-plan.md) | Commit sequence, test gates, verification |

### Engine (`specs/engine/`)

| Spec | Purpose |
|------|---------|
| [design-decisions.md](specs/engine/design-decisions.md) | Architectural decisions with rationale |
| [flow-configurations.md](specs/engine/flow-configurations.md) | Reference for RoundsWorkflow variants (NoAudit, WithAudit, etc.) |
| [v2-results/](specs/engine/v2-results/) | Reviewer rounds (Gemini, ChatGPT, DeepSeek) on engine design |

### Concepts & Future Work

| Spec | Purpose |
|------|---------|
| [vada-calculator-concept.md](specs/vada-calculator-concept.md) | YAML cost calculator UI — estimate deliberation cost before running |

### Legacy (`specs/legacy/`)

Historical specs — superseded. See [specs/legacy/README.md](specs/legacy/README.md) for deprecation index.

---

## Documentation

| Doc | Path | Purpose |
|-----|------|---------|
| Web CLAUDE.md | [web/CLAUDE.md](web/CLAUDE.md) | Web app architecture, API routes, session states |
| MCP Server README | [mcp-server/README.md](mcp-server/README.md) | MCP server usage and tool docs |

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — Atta AI monorepo routing index
- [.claude/skills/vada-architecture/SKILL.md](../../.claude/skills/vada-architecture/SKILL.md) — Architecture master reference
- [.claude/skills/vada-brokered/SKILL.md](../../.claude/skills/vada-brokered/SKILL.md) — Brokered mode in depth
- [.claude/skills/vada-yaml-authoring/SKILL.md](../../.claude/skills/vada-yaml-authoring/SKILL.md) — Authoring YAML deliberation specs
- [.claude/skills/atta-teams/SKILL.md](../../.claude/skills/atta-teams/SKILL.md) — YAML specs + agent visuals (teams and agents are all YAML; display types in web/src/components/agents/visuals/)
