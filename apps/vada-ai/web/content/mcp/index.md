---
title: "MCP Integration · Vāda"
description: "Connect Vāda's deliberation tools to any MCP-compatible client — Claude Desktop, Cursor, Claude Code, or your own software."
section: Integrations
---

# Vāda · MCP Integration

Vāda ships an MCP server that exposes its deliberation engine as two callable tools: `vada__consult` and `vada__deliberate`. Any MCP-compatible client — Claude Desktop, Cursor, Claude Code, a TypeScript application — can invoke these tools to run deliberations from within a conversation or pipeline.

The server runs as a local process using the stdio transport. Your API keys stay in your environment; the server uses them directly to call model providers on your behalf.

<ArchitectureDiagram />

## How it works

When a client calls a Vāda tool, the MCP server:

1. Validates the input against the tool's schema
2. Looks up the appropriate deliberation spec from the YAML catalog
3. Compiles the spec into an executable plan via the engine
4. Runs the plan through the LangGraph adapter, which dispatches agents to the model provider
5. Writes the session to the database (if `DATABASE_URL` is configured)
6. Returns the conclusion, structured output, and a session URL

The YAML catalog is auto-discovered from the filesystem. Adding a YAML file to the catalog makes that team available to `vada__deliberate` immediately — no code change required.

---

## Consumers

<ConsumersDiagram />

There are two classes of consumer:

### AI assistants

Claude Desktop, Cursor, Claude Code, and any other assistant that speaks MCP can invoke Vāda tools mid-conversation. The assistant decides when to call Vāda based on the tool descriptions — typically when the user is making a high-stakes decision that warrants structured adversarial review.

**Prerequisites for all AI assistant installs:**

- Node.js 18+ installed
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
- Postgres database URL (optional — omit to skip session persistence)
- Clone the repo: `git clone https://github.com/attaai/attaai`
- Build the MCP server from the repo root: `cd apps/vada-ai/mcp-server && bun run build` (or run directly with `bun run src/index.ts`)

#### Claude Desktop

Config file location:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "vada": {
      "command": "bun",
      "args": ["run", "/path/to/attaai/apps/vada-ai/mcp-server/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DATABASE_URL": "postgresql://...",
        "VADA_USER_ID": "your-clerk-user-id"
      }
    }
  }
}
```

Quit Claude Desktop completely and relaunch. The MCP server starts automatically on next launch. Open a new conversation and type `/` — you should see `vada__consult` and `vada__deliberate` in the tool list.

#### Cursor

Config file: `~/.cursor/mcp.json` (or Cursor Settings → MCP)

```json
{
  "mcpServers": {
    "vada": {
      "command": "bun",
      "args": ["run", "/path/to/attaai/apps/vada-ai/mcp-server/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "DATABASE_URL": "postgresql://...",
        "VADA_USER_ID": "your-clerk-user-id"
      }
    }
  }
}
```

Open Cursor Settings → MCP and click Reload, or restart Cursor. The `vada__consult` and `vada__deliberate` tools will appear in Cursor chat.

#### Claude Code

```bash
claude mcp add vada -- bun run /path/to/attaai/apps/vada-ai/mcp-server/src/index.ts
```

Set environment variables in `~/.claude.json` or via `claude mcp edit vada`. Verify with `claude mcp list` — vada should appear in the list.

### Software clients

TypeScript applications and other programs can connect to the Vāda MCP server using the `@modelcontextprotocol/sdk`.

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'bun',
  args: ['run', '/path/to/attaai/apps/vada-ai/mcp-server/src/index.ts'],
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    DATABASE_URL: process.env.DATABASE_URL,
    VADA_USER_ID: process.env.VADA_USER_ID
  }
})

const client = new Client({ name: 'my-app', version: '1.0.0' })
await client.connect(transport)

// Call vada__consult
const result = await client.callTool({
  name: 'vada__consult',
  arguments: {
    context: 'We are a B2B SaaS company with 200 paying customers...',
    question: 'Should we raise prices by 20% in Q3?',
    reviewers: [
      { role: 'strategist', notes: 'Focus on competitive positioning' },
      { role: 'critic', notes: 'What evidence would disprove this?' },
      { role: 'devils_advocate', notes: 'Make the case for lowering prices' }
    ],
    current_leaning: 'Leaning yes — costs have risen and customers are sticky',
    stakes: 'Revenue impact + potential churn in the 20-50 seat tier'
  }
})
```

---

## Tool reference

### `vada__consult`

Consults 2–5 specialized reviewers on a question. Each reviewer responds independently — no cross-visibility, no rounds, no synthesis. Faster and cheaper than `vada__deliberate`. Use for single-shot critique, pressure-testing a position, or getting structured adversarial perspectives.

**When to invoke:**

- The user is leaning toward a decision and wants to stress-test it
- Multiple perspectives would catch blind spots a single reasoning pass would miss
- The user asks for reviewer input or deliberation
- Stakes are real and getting it wrong matters

**When not to invoke:**

- Simple factual questions
- Emotional support or venting
- Tasks with one obvious right answer

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `context` | string (min 50 chars) | Yes | Background every reviewer sees — decision context, constraints, current state |
| `question` | string (min 10 chars) | Yes | The specific decision or claim to evaluate |
| `reviewers` | array (2–5 items) | Yes | Reviewer specs — see below |
| `current_leaning` | string | No | Your current position and what you're uncertain about |
| `stakes` | string | No | What goes wrong if this decision is wrong |
| `session_title` | string | No | Label for the dashboard display |

Each reviewer spec:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | enum | Yes | `strategist`, `critic`, `devils_advocate`, or `domain_expert` |
| `notes` | string (min 20 chars) | No | Specific angle you want this reviewer to probe — leave blank and they'll produce generic output |
| `domain` | string | Conditionally | Required when role is `domain_expert` |

**Available reviewer roles:**

- **strategist** — Maps the decision landscape. Surfaces tradeoffs, hidden costs, long-term implications. Asks: what is the real decision here, and what's the cost of being wrong?
- **critic** — Probes assumptions. Finds logical gaps, evidence holes, unstated premises. Asks: what has to be true for this to work, and is it?
- **devils_advocate** — Challenges the frame entirely. Forces the opposite thesis. Asks: what if the question itself is wrong?
- **domain_expert** — Context-specific expertise grounded in a named domain. Requires a `domain` field.

**Example call:**

```json
{
  "context": "We are considering switching our primary database from Postgres to MongoDB. We have 3 engineers, 50k records, mostly document-shaped data with occasional relational joins. Migration would take ~6 weeks.",
  "question": "Should we migrate from Postgres to MongoDB?",
  "reviewers": [
    {
      "role": "strategist",
      "notes": "Focus on long-term maintenance burden and hiring implications"
    },
    {
      "role": "critic",
      "notes": "What assumptions about our data shape are we making that might be wrong?"
    },
    {
      "role": "devils_advocate",
      "notes": "Make the case for staying on Postgres despite the document-shaped data"
    }
  ],
  "current_leaning": "Leaning toward migration — the data is document-shaped and our team is excited",
  "stakes": "6 weeks of engineering time, potential production stability risk"
}
```

**Response shape:**

```json
{
  "responses": [
    {
      "role": "strategist",
      "response": "## Key Points\n...\n## Risks\n...\n## Recommendation\n...",
      "latency_ms": 8200,
      "model": "claude-sonnet-4-6"
    }
  ],
  "session_id": "uuid",
  "session_url": "https://vada.ai/s/uuid",
  "cost_breakdown": {
    "estimated_usd": 0.012,
    "tokens_input": 1840,
    "tokens_output": 2100,
    "duration_ms": 24600
  }
}
```

---

### `vada__deliberate`

Runs a full multi-agent deliberation. Agents debate across rounds with a synthesizer producing a structured conclusion, an auditor reviewing it, and a reviser correcting any flagged issues. Slower and more expensive than `vada__consult`. Use for high-stakes decisions where structured debate, an audit trail, and a committed conclusion matter.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `question` | string | Yes | The question or decision to deliberate on |
| `team` | string | No | Team name (default: `sparring`). See catalog below. |

**Available teams:**

| Team | Agents | Typical runtime | Best for |
|------|--------|-----------------|----------|
| `sparring` | 2 | 30–90 s | Fast two-perspective debate |
| `crucible` | 4–7 | 2–5 min | Comprehensive multi-perspective deliberation |
| `war-room` | 6 | 3–6 min | Adversarial high-stakes decisions |
| `vada-reviewers` | 4 | 2–4 min | Structured review panel (Reviewers) |
| `vada-reviewers-synthesis` | 4 + synthesis | 3–5 min | Review panel with synthesized conclusion (Reviewers + Synthesis) |

**Example call:**

```json
{
  "question": "Should we raise our Series A at a $12M valuation now, or wait 6 months for stronger metrics?",
  "team": "sparring"
}
```

**Response shape:**

```json
{
  "content": "After deliberation, the panel recommends...",
  "structured": {
    "recommendation": "Wait 6 months",
    "key_condition": "Monthly recurring revenue must reach $80k by month 4",
    "unresolved_points": ["Investor appetite in Q4 is unknown"],
    "review_by": "2026-11-01"
  },
  "session_id": "uuid",
  "session_url": "https://vada.ai/s/uuid",
  "terminal_state": "CLEAN",
  "cost_breakdown": {
    "estimated_usd": 0.18,
    "tokens_input": 12000,
    "tokens_output": 8400,
    "duration_ms": 58000
  }
}
```

`structured` is present when the team spec declares an `output_schema` (sparring, crucible, war-room, Reviewers + Synthesis, a1-baseline). It is `null` for specs without structured output (a0-baseline).

`terminal_state` values:

| Value | Meaning |
|-------|---------|
| `CLEAN` | Auditor accepted the conclusion on first pass |
| `REVISED` | Auditor flagged issues; synthesizer revised successfully |
| `MAX_REVISIONS` | Auditor kept flagging; revision limit reached — conclusion is the best available |

---

## Authentication

Vāda's MCP server uses three environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key — used for all LLM calls and web search |
| `DATABASE_URL` | Recommended | Neon Postgres connection string — enables session persistence and the `session_url` audit trail |
| `VADA_USER_ID` | Optional | Your Vāda account ID — links MCP sessions to your dashboard. Find it in [Settings](/settings). |
| `GOOGLE_API_KEY` | Optional | Unlocks Google Gemini models in custom YAML specs |
| `OPENAI_API_KEY` | Optional | Unlocks OpenAI models in custom YAML specs |
| `VADA_MODEL` | Optional | Override the default model (default: `claude-sonnet-4-6`) |

Keys are held in process memory for the duration of each tool call. They are never written to disk or logged.

---

## Catalog

The full list of available teams for `vada__deliberate`:

| ID | Display name | Aliases |
|----|--------------|---------|
| `sparring` | Sparring | — |
| `crucible` | Crucible | — |
| `war-room` | War Room | — |
| `vada-reviewers` | Reviewers | — |
| `vada-reviewers-synthesis` | Reviewers + Synthesis | — |
| `a0-baseline` | A0 Baseline | `a0` |
| `a1-baseline` | A1 Baseline | `a1` |
| `brokered-trio` | Brokered Trio | — |
| `brokered-quartet` | Brokered Quartet | — |

Baseline specs (`a0`, `a1`) are for evaluation and benchmarking. `brokered-trio` and `brokered-quartet` are accessible by full ID but not exposed as named options in the tool description.

The catalog is auto-discovered — adding a YAML file to `apps/vada-ai/yamls/` makes that team available immediately.

Browse available teams at [/teams](/teams).

---

## Troubleshooting

**Tool not appearing in the client**

Verify the server starts without errors by running it directly:

```bash
ANTHROPIC_API_KEY=sk-ant-... bun run /path/to/attaai/apps/vada-ai/mcp-server/src/index.ts
```

If it exits immediately, the `ANTHROPIC_API_KEY` environment variable is missing or not being passed through the client config.

**"Unknown spec" error from `vada__deliberate`**

The team name is not in the catalog. Use one of the IDs from the Catalog section above. Check spelling — `war-room` not `war_room`.

**Sessions not appearing in the dashboard**

`VADA_USER_ID` is either not set or doesn't match your Vāda account ID. Find your ID in [Settings → Account](/settings). `DATABASE_URL` must also be set for sessions to persist.

**Deliberation times out**

Crucible and War Room runs can take 3–6 minutes. Check your MCP client's tool timeout setting. For Claude Desktop, there is no configurable timeout. For programmatic clients, set `timeout` on the `callTool` call to at least 360000 ms.

**Wrong model being used**

Set `VADA_MODEL` in the server environment to override the default (`claude-sonnet-4-6`). The value must be a model ID recognized by the Anthropic API.
