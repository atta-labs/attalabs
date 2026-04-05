# MCP Package — Claude Code Instructions

MCP (Model Context Protocol) tool handlers for Herald AI. Contains the CV parser, match engine types, and prompts that power the platform.

v1 uses Vercel AI SDK tool handlers. The package is structured for future extraction to a standalone MCP server with stdio/SSE transport.

---

## Architecture

```
apps/herald-ai/mcp/
├── src/
│   ├── tools/
│   │   └── parse-cv.ts          # CV text → structured CandidateProfile via Claude Haiku
│   ├── prompts/
│   │   └── cv-parser.ts         # System prompt for CV extraction
│   ├── types.ts                 # CandidateProfile, MatchReport interfaces
│   └── index.ts                 # Public exports
├── CLAUDE.md
├── README.md
├── package.json
└── tsconfig.json
```

---

## Tools

### `parseCv` — CV Text Extraction

**Input:** CV text (extracted from PDF/TXT) + Anthropic API key
**Output:** `CandidateProfile` (name, title, location, summary, stack, projects, experience)
**Model:** Claude Haiku (fast, cheap — CV parsing doesn't need Sonnet)
**Prompt:** Verbatim from `src/prompts/cv-parser.ts`

Used by: `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts`

---

## Types

### `CandidateProfile`

The canonical profile shape extracted from CVs and stored in the database.

```typescript
interface CandidateProfile {
  name: string
  title: string
  location?: string
  availability?: string
  summary: string
  stack: string[]
  projects: Array<{ title: string; description: string }>
  experience: Array<{ company: string; role: string; period: string; highlights: string[] }>
}
```

### `MatchReport`

The forensic audit output from the match engine.

```typescript
interface MatchReport {
  candidate: { name: string; title: string; github?: string }
  grade: 'A' | 'A-' | 'B+' | 'B'
  recommendation: string
  confidence: string
  confidence_reasoning: string[]
  signal: Array<{ title: string; observation: string; interpretation: string; confidence: string }>
  gaps: Array<{ gap: string; mitigation: string }>
  interview_hooks: string[]
}
```

---

## Critical Rules

### RULE #1: Tools are independently testable

Each tool is a pure function. AI SDK integration happens in the app's API routes, not here.

### RULE #2: The CV parser prompt is strict

The prompt in `src/prompts/cv-parser.ts` extracts only what is explicitly stated. No embellishment, no inference.

---

## Dependencies

- `@ai-sdk/anthropic` — Anthropic provider
- `ai` — Vercel AI SDK
- `@atta/typescript-config` — Shared TypeScript config

---

## Related Documentation

- [Root CLAUDE.md](../../../CLAUDE.md) — Monorepo routing index
- [BUILD-SPEC.md](../web/docs/BUILD-SPEC.md) — Build specification
