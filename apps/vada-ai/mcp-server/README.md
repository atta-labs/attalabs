# @vada/mcp-server

Vāda AI as an MCP (Model Context Protocol) server. Exposes Vāda's deliberation engine as callable tools in MCP-compatible clients (Claude Desktop, Cursor, Claude.ai, etc.).

## What it does

The MCP server lets Claude (or any MCP client) call Vāda reviewer agents directly from a conversation. When you ask Claude to "get a critical perspective on this plan," it can call `vada__consult` to dispatch Vāda reviewers and return their analysis — with web search, evidence, and structured reasoning.

## Available tools

### `vada__consult` (Brokered mode)

Consult 2–N Vāda reviewer agents in parallel for focused, orthogonal perspectives.
Faster and cheaper than `vada__deliberate`. Use for single-shot critique, strategic
analysis, or counter-arguments.

**Parameters:**
- `brief` (string) — The question or proposal to review (compressed, reviewer-ready framing)
- `reviewers` (string[]) — Reviewer profiles: `strategist`, `critic`, `devils_advocate` (min 2)

**Returns:**
- `responses` — Per-reviewer structured responses (Key Points / Risks / Recommendation)
- `session_id` — UUID for this consultation

### `vada__deliberate` (Autonomous mode)

Run a full multi-agent deliberation. Multiple agents debate across rounds with dual-auditor revision. Slower and more expensive than `vada__consult`. Use for high-stakes decisions where structured debate and a full audit trail matter.

**Parameters:**
- `question` (string) — The question or decision to deliberate on
- `team` (string, optional) — `sparring` (default, 2 agents) or `crucible` (4+ agents) or `war_room` (6 agents)

**Returns:**
- `content` — The final conclusion from the deliberation
- `session_id` — UUID for this session
- `terminal_state` — `CLEAN`, `REVISED`, or `MAX_REVISIONS`
- `cost_breakdown` — Estimated cost and token counts

## Installation (Claude Desktop)

1. Build or run the server:
   ```bash
   # From the monorepo root:
   bun run apps/vada-ai/mcp-server/src/index.ts
   ```

2. Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "vada": {
         "command": "bun",
         "args": ["run", "/path/to/attaai/apps/vada-ai/mcp-server/src/index.ts"],
         "env": {
           "ANTHROPIC_API_KEY": "sk-ant-...",
           "DATABASE_URL": "postgresql://..."
         }
       }
     }
   }
   ```

3. Restart Claude Desktop.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for LLM calls and web search |
| `DATABASE_URL` | Recommended | Neon Postgres connection string for session persistence |
| `VADA_MODEL` | No | Override the reviewer model (default: `claude-sonnet-4-6`) |

## Architecture

The MCP server is a thin adapter over the existing Vāda engine stack:

```
MCP client (Claude Desktop, Cursor, etc.)
  → stdio transport
  → @vada/mcp-server (vada__consult / vada__deliberate)
  → @atta/adapter-langgraph (cognitive router + LangGraph execution)
  → @atta/engine (compile workflow → Plan)
  → @vada/agents + @vada/teams (agent configs)
  → Anthropic API (LLM calls + web search)
  → @atta/db (session persistence)
```

## Source layout

```
apps/vada-ai/mcp-server/src/
├── index.ts               # Entry point
├── server.ts              # MCP server setup + tool registration
├── tools/
│   ├── consult.ts         # vada__consult (Brokered mode)
│   └── deliberate.ts      # vada__deliberate (Autonomous mode)
├── reviewer-profiles.ts   # Persona registry — system prompts
├── teams-registry.ts      # Team → engine mapping
├── session-logger.ts      # Postgres persistence
└── schema.ts              # Zod schemas for tool I/O
```

## Related

- [../CLAUDE.md](../CLAUDE.md) — Vāda AI product overview
- [../specs/brokered-deliberation/](../specs/brokered-deliberation/) — Brokered mode full spec
- [.claude/skills/vada-brokered/SKILL.md](../../../.claude/skills/vada-brokered/SKILL.md) — Brokered implementation guide
