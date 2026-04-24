# Vāda AI

Multi-agent deliberation engine. Multiple LLM agents debate a question across rounds, producing a synthesized conclusion with a full audit trail. Ships as an MCP server (consult reviewers from any chat client) and a web UI.

"Vāda" means "deliberation" in Pali. Part of the [Attā AI](../../README.md) ecosystem.

**Domain:** vada.ai

---

## Surfaces

| Surface | Path | Status |
|---------|------|--------|
| Web app | `web/` | Active — Next.js 16, LangGraph deliberation engine |
| MCP server | `mcp-server/` | Active — `vada__consult` Brokered mode |
| Mobile | `mobile/` | Scaffold |

## Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@vada/agents` | `agents/` | Agent definitions (system prompts, tools, display metadata) |
| `@vada/teams` | `teams/` | Team configs (Sparring, Crucible, War Room, A0/A1 baselines) |

## Architecture Layers

```
User → MCP client / Web UI
         ↓
  @vada/mcp-server      — routes deliberation requests
         ↓
  @atta/engine          — compiles Team + Workflow → Plan (pure, no runtime)
         ↓
  @atta/adapter-langgraph — executes Plan via LangGraph + Anthropic SDK
         ↓
  @vada/agents + @vada/teams  — agent configs, system prompts, tool lists
```

## Getting Started

```bash
# From monorepo root
bun run dev:vada          # Start web app (port 3002)
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — Product overview for Claude Code
- [web/CLAUDE.md](web/CLAUDE.md) — Web app architecture and rules
- [specs/vada-product-spec.md](specs/vada-product-spec.md) — Full product spec
- [specs/brokered-deliberation/](specs/brokered-deliberation/) — MCP tool spec
