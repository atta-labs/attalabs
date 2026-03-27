# @herald/mcp

MCP (Model Context Protocol) tool handlers for Herald. Contains the match engine, GitHub signal detection, and profile tools that power forensic audit reports.

## Status

**v1:** Vercel AI SDK tool handlers (server-side functions). Structured for future extraction to standalone MCP server with stdio/SSE transport.

## Tools

| Tool | Purpose |
|------|---------|
| `match` | Forensic match engine — takes JD + profile, returns `MatchReport` via Claude |
| `github-signals` | Scans GitHub repos for engineering signal patterns |
| `profile` | Retrieves candidate profile (hardcoded v1, Sanity v2+) |

## Usage

```tsx
import { detectGitHubSignals } from '@herald/mcp/tools/github-signals'
import type { MatchReport } from '@herald/mcp/types'

const signals = await detectGitHubSignals('daniboomerang')
```

## Key Constraint

The **Skeptical Auditor** system prompt in `src/prompts/skeptical-auditor.ts` is **verbatim** from the build spec. Never modify it without explicit instruction.
