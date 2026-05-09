# @vada/mcp-server

Vāda AI as an MCP (Model Context Protocol) server. Exposes Vāda's deliberation engine as callable tools in MCP-compatible clients (Claude Desktop, Cursor, Claude.ai, etc.).

## What it does

The MCP server lets Claude (or any MCP client) call Vāda reviewer agents directly from a conversation. When you ask Claude to "get a critical perspective on this plan," it can call `vada__consult` to dispatch Vāda reviewers and return their analysis — with web search, evidence, and structured reasoning.

## Available tools

### `vada__consult`

Single-shot multi-reviewer consultation. Consult 2–5 Vāda reviewer agents for focused, orthogonal perspectives.
Faster and cheaper than `vada__deliberate`. Use for single-shot critique, strategic analysis, or counter-arguments.

**Parameters:**
- `context` (string, min 50 chars) — Shared background every reviewer sees
- `question` (string, min 10 chars) — The specific decision or claim to evaluate
- `reviewers` (array, 2–5 items) — Reviewer specs: `{ role: 'strategist' | 'critic' | 'devils_advocate', notes?: string }`
- `current_leaning` (string, optional) — Caller Claude's current position
- `stakes` (string, optional) — What goes wrong if the decision is wrong
- `session_title` (string, optional) — For dashboard display

**Returns:**
- `responses` — Per-reviewer structured responses
- `session_id` — UUID for this consultation
- `session_url` — Dashboard URL
- `cost_breakdown` — Token counts and estimated cost

### `vada__deliberate`

Multi-round deliberation with revision. Multiple agents debate across rounds with dual-auditor review. Slower and more expensive than `vada__consult`. Use for high-stakes decisions where structured debate and a full audit trail matter.

**Parameters:**
- `question` (string) — The question or decision to deliberate on
- `team` (string, optional) — Team spec to use. Default: `sparring`.
  - `sparring` — 2 agents, fastest, good default
  - `crucible` — 4–7 agents, higher coverage
  - `war-room` — 6 agents, high-pressure adversarial format
  - `vada-reviewers` — reviewer panel, structured critique
  - `vada-reviewers-synthesis` — reviewer panel with synthesis pass

**Returns:**
- `content` — The final conclusion from the deliberation
- `session_id` — UUID for this session
- `terminal_state` — `CLEAN`, `REVISED`, or `MAX_REVISIONS`
- `cost_breakdown` — Estimated cost and token counts

## Installation (Hosted MCP)

The Vāda MCP server is live at `https://vada.attalabs.dev/api/mcp`. No local process required.

**Auth:** Vāda API key passed as a Bearer token. Generate one in Settings → API Keys on vada.attalabs.dev.

**Transport:** Streamable HTTP (POST + SSE response stream).

**Verify the server is up:**
```bash
curl -s -X POST https://vada.attalabs.dev/api/mcp \
  -H "Authorization: Bearer vada_xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"0.0.1"}}}' | jq .
```

**Claude Code CLI (`~/.claude.json` or project `.mcp.json`):**
```json
{
  "mcpServers": {
    "vada": {
      "type": "http",
      "url": "https://vada.attalabs.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer vada_xxxxxxxx"
      }
    }
  }
}
```

> **Note (Track E12):** Claude.ai web's connector broker currently has a bug affecting bearer-auth MCP servers (`ofid_*` errors). Claude Code CLI is the working integration today. Monitor Track E12 for resolution.

## Installation (Claude Desktop — stdio)

Runs the MCP server as a local process on your machine. Provider keys are read from environment variables.

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

## Environment variables (stdio installs only)

For hosted MCP, provider keys are per-user and envelope-encrypted at rest — no server-side env vars required. See [vada-byok-principles.md](../specs/vada-byok-principles.md) for the key management architecture.

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
  → @atta/engine (YAML → loadSpec → compileSpec → Plan)
  → @vada/agents + YAML specs (apps/vada-ai/yamls/)
  → Anthropic API (LLM calls + web search)
  → @atta/db (session persistence)
```

## Source layout

```
apps/vada-ai/mcp-server/src/
├── index.ts               # Entry point
├── server.ts              # MCP server setup + tool registration
├── tools/
│   ├── consult.ts         # vada__consult (builds inline DeliberationSpec)
│   └── deliberate.ts      # vada__deliberate (multi-round team deliberation)
├── spec-registry.ts       # YAML spec loader + lookupSpec(nameOrId) + ALIASES map
├── session-logger.ts      # Postgres persistence
└── schema.ts              # Zod schemas for tool I/O
```

## Related

- [../CLAUDE.md](../CLAUDE.md) — Vāda AI product overview
- [../specs/vada-teams-catalog/](../specs/vada-teams-catalog/) — Team specs and deliberation design
