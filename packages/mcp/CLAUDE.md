# MCP Package — Claude Code Instructions

MCP (Model Context Protocol) tool handlers for Herald. This package contains the match engine, GitHub signal detection, and profile tools that power the forensic audit reports.

v1 uses Vercel AI SDK tool handlers (server-side functions the LLM calls mid-reasoning). The package is structured for future extraction to a standalone MCP server with stdio/SSE transport.

Pattern: Similar to `@summon/composer` in scope (AI pipeline), but the MCP transport structure is informed by Summon's `/api/mcp` route in the admin app.

---

## Architecture

```
packages/mcp/
├── src/
│   ├── tools/               # Individual tool handler definitions
│   │   ├── match.ts             # Forensic match engine (JD → MatchReport)
│   │   ├── github-signals.ts    # GitHub repo scanning + signal detection
│   │   └── profile.ts          # Profile data retrieval
│   ├── prompts/             # System prompts
│   │   └── skeptical-auditor.ts # Verbatim auditor prompt (NEVER modify)
│   ├── types.ts             # Shared types (MatchReport, MatchRequest, EngineeringSignal)
│   └── index.ts             # Public exports
├── CLAUDE.md
├── README.md
├── package.json
└── tsconfig.json
```

---

## Critical Rules

### RULE #1: The Skeptical Auditor prompt is VERBATIM

The system prompt in `src/prompts/skeptical-auditor.ts` is copied exactly from HERALD-BUILD-SPEC.md Section 08. **NEVER modify it** without explicit instruction from the user.

Key linguistic constraints enforced by the prompt:
- Zero marketing language
- Every claim must reference a detectable signal
- Gaps are honest, always paired with mitigation
- Interview hooks must be hyper-specific
- Tone: senior engineer writing internal memo, not recruiter

### RULE #2: Tools are independently testable

Each tool in `src/tools/` is a pure function that can be tested without the AI SDK. The AI SDK integration happens in the app's API route (`apps/herald/src/app/api/match/route.ts`), not here.

```typescript
// ✅ Good — tool is a pure function
export async function detectGitHubSignals(handle: string): Promise<EngineeringSignal[]> {
  const repos = await fetchPublicRepos(handle)
  return scanForPatterns(repos)
}

// ❌ Bad — tool is coupled to AI SDK
export const githubSignalTool = tool({
  // AI SDK specific code in the package
})
```

### RULE #3: Types are the contract

The `MatchReport` interface is the API contract between the LLM output and the UI. It must match HERALD-BUILD-SPEC.md Section 07 exactly.

```typescript
interface MatchReport {
  grade: 'A' | 'A-' | 'B+' | 'B'
  recommendation: 'Strong Fit' | 'Good Fit' | 'Borderline'
  confidence_reasoning: string[]
  engineering_signal: EngineeringSignal[]
  gaps: Array<{ gap: string; mitigation: string }>
  interview_hooks: string[]
}

interface EngineeringSignal {
  title: string
  observation: string
  interpretation: string
  confidence: 'High' | 'Medium' | 'Low'
}
```

---

## Tool Handlers

### `match` — Forensic Match Engine

**Input:** Job description + candidate profile + GitHub signals
**Output:** `MatchReport` JSON
**LLM:** Claude API via Vercel AI SDK
**Prompt:** Skeptical Auditor (verbatim)
**Constraints:**
- Latency target: <6 seconds
- Hard timeout: 10 seconds → return partial report
- Caching: `hash(JD + profile)` → 24h cache

### `github-signals` — Signal Detection

**Input:** GitHub username
**Output:** `EngineeringSignal[]`
**API:** GitHub public REST API (`https://api.github.com/users/{handle}/repos`)
**Signals detected:** See HERALD-BUILD-SPEC.md Section 09

| Signal | Pattern | What It Proves |
|--------|---------|---------------|
| Monorepo Architecture | `turbo.json` exists | Multi-package workspace management |
| Schema Validation | `zod` imports | Boundary validation, production thinking |
| Headless UI | `@radix-ui` imports | Behaviour/presentation separation |
| Web3 Integration | `wagmi`/`ethers` imports | Blockchain experience |
| Active Engineering | Commits within 90 days | Current hands-on practice |
| AI/LLM Integration | `@anthropic-ai/sdk`/`openai` imports | Production LLM systems |
| Modern ORM | `drizzle-orm` imports | Type-safe database access |

### `profile` — Profile Retrieval

**Input:** Username
**Output:** Candidate profile object
**v1:** Returns hardcoded `DANI_PROFILE` from `apps/herald/src/lib/profile.ts`
**v2+:** Reads from Sanity CMS via `@herald/cms`

---

## Future: Standalone MCP Server

When external AI clients (Claude Desktop, Cursor) need to connect to candidate profiles, this package extracts to a standalone MCP server:

1. Add MCP transport layer (stdio/SSE)
2. Register tools as MCP tools
3. Deploy as Cloudflare Worker (like Summon's MCP server)
4. App's `/api/mcp` route becomes a proxy (same pattern as Summon admin)

The tool implementations stay the same — only the transport changes.

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
- [HERALD-BUILD-SPEC.md Section 07](../../HERALD-BUILD-SPEC.md) — Forensic API contract (MatchReport schema)
- [HERALD-BUILD-SPEC.md Section 08](../../HERALD-BUILD-SPEC.md) — Skeptical Auditor system prompt (verbatim)
- [HERALD-BUILD-SPEC.md Section 09](../../HERALD-BUILD-SPEC.md) — GitHub signal detection patterns
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — "Why Vercel AI SDK (Not True MCP Yet)" decision
- [.claude/rules/api-conventions.md](../../.claude/rules/api-conventions.md) — API coding rules
