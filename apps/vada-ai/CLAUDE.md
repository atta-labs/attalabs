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
| `@vada/agents` | `agents/` | Agent definitions with display metadata |
| `@vada/teams` | `teams/` | Team configs (Sparring, Crucible, War Room, A0/A1) |
| `@vada/mcp-server` | `mcp-server/` | MCP server — `vada__consult` + `vada__deliberate` tools |

---

## Specifications

### Active

| Spec | Path | Purpose |
|------|------|---------|
| Product spec | [specs/vada-product-spec.md](specs/vada-product-spec.md) | Full product truth — positioning, features, launch requirements |
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
| [v2-results/](specs/engine/v2-results/) | Reviewer rounds (Gemini, ChatGPT, DeepSeek) on engine design |

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
