# @atta/mcp-server

Vāda AI as an MCP (Model Context Protocol) server. Exposes Vāda's deliberation engine as callable tools in MCP-compatible clients (Claude Desktop, Cursor, Claude.ai, etc.).

## What it does

The MCP server lets Claude (or any MCP client) call Vāda reviewer agents directly from a conversation. When you ask Claude to "get a critical perspective on this plan," it can call `vada__consult` to dispatch a Vāda Critic agent and return its analysis — with web search, evidence, and structured reasoning.

## Available tools

### `vada__consult`

Consult a single Vāda reviewer agent for a focused perspective.

**Parameters:**
- `prompt` (string) — The question or proposal to review
- `reviewer_profile` (string) — One of: `strategist`, `critic`, `devils_advocate`

**Returns:**
- `response` — The reviewer's full analysis
- `session_id` — UUID for this consultation
- `session_url` — `https://vada.ai/s/<id>` (dashboard view, coming soon)
- `cost_breakdown` — Estimated cost and token counts

## Installation (Claude Desktop)

1. Build or run the server:
   ```bash
   # From the monorepo root:
   bun run packages/mcp-server/src/index.ts
   ```

2. Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "vada": {
         "command": "bun",
         "args": ["run", "/path/to/attaai/packages/mcp-server/src/index.ts"],
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

## Running locally for testing

First, create the DB table (one-time setup):
```bash
DATABASE_URL=postgresql://... bun packages/mcp-server/scripts/migrate.ts
```

Then run the smoke test:
```bash
ANTHROPIC_API_KEY=sk-ant-... DATABASE_URL=postgresql://... \
  bun packages/mcp-server/scripts/smoke-test.ts
```

## Architecture

The MCP server is a thin adapter over the existing Vāda engine stack:

```
Claude Desktop
  → stdio transport
  → @atta/mcp-server (vada__consult)
  → @atta/adapter-langgraph (cognitive router + LangGraph execution)
  → @atta/engine (compile Solo workflow)
  → Anthropic API (reviewer LLM call + web search)
  → @atta/db (session persistence)
```

The cognitive router (Phase 3a.4) runs before each reviewer turn to classify which tools the agent needs for the specific question.
