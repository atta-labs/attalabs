# Herald — Architecture Decisions

This document captures the **why** behind key architectural choices. Read this to understand the reasoning, not just the implementation.

---

## Why Turborepo Monorepo

Herald is built as a monorepo despite having only one app in v1. This is intentional:

1. **Proven pattern** — the author built Game7/Summon as a Turborepo monorepo with 3 apps and 8+ packages. The tooling, caching, and workspace management are battle-tested.
2. **Future-ready** — Option B (talent marketplace) will need a separate `apps/studio` for admin. The monorepo is already structured for this.
3. **Package boundaries enforce clean architecture** — `@herald/db` can't accidentally import React components. `@herald/ui` can't reach into the database. TypeScript path aliases + workspace isolation make this structural, not just a convention.

---

## Why Vercel AI SDK Tool Handlers (Not True MCP Yet)

The build spec describes "MCP tool handlers" but the v1 implementation is **Vercel AI SDK tool handlers** — server-side functions the LLM calls mid-reasoning, registered via the AI SDK's tool system.

They are NOT yet a standalone MCP server with stdio/SSE transport.

**Why this is correct for v1:**
- The user experience is identical — the LLM calls tools, tools query data, answers are correct
- True MCP transport (enabling Claude Desktop, Cursor, and other external clients to connect) adds complexity with no v1 user benefit
- The tool definitions in `packages/mcp/` are structured so extraction to true MCP transport later is just adding a transport layer, not reorganizing code

**When to upgrade to true MCP:**
- When you want external AI clients (Claude Desktop, Cursor) to connect to a candidate's profile
- When the marketplace (Option B) needs cross-client access to candidate data
- This is a Month 3+ milestone

---

## Why Runtime Theme Switching (Not Build-Time)

Game7/Summon uses **build-time** tenant resolution — a fixed set of known tenants where build-time alias resolution is optimal. Herald uses **runtime** theme switching via a React context provider.

**The key difference:** Game7 has 2-3 known tenants. Herald has potentially thousands of unknown users who can each choose their own theme. You cannot build-time resolve for dynamic users.

**v1 themes:**
1. **Minimal Dark** (launch theme) — dark editorial, gold accents, serif typography
2. **Neo-Brutalism** (second theme) — heavy borders, primary colors, neobrutalism library
3. **Terminal** (stretch goal) — green on black, monospace, command-line aesthetic

---

## Why Hardcoded Profile in v1

The database schema supports multi-user profiles, but v1 hardcodes Dani's profile as a TypeScript object in `apps/herald/src/lib/profile.ts`.

**Why:**
- Ship faster — no DB setup, no auth flow, no profile editor needed for day 1
- The product must be live and useful for Dani's job search within 2 weeks
- DB migration from hardcoded → dynamic is trivial: replace the import with a DB query
- Validates the core value prop (match reports) without any infrastructure overhead

---

## Why BYOK (Bring Your Own Key)

The AI cost — the most expensive component at scale — is borne by the user via their own API key. The platform provides the infrastructure and intelligence layer, the user pays for the compute.

**v1 exception:** Dani's own profile uses his own API key server-side. Visitors don't need a key — they use the built-in key with rate limiting (5 reports/IP/hour via Upstash Redis).

**v2 (multi-user):** Each user provides their own API key, encrypted in the `ai_config` table. Visitors to any profile use that user's key, rate-limited.

---

## Why No RAG in v1

The build spec includes a `knowledge_chunks` table with pgvector embeddings. This is **Month 2+**.

A full developer profile fits in a single system prompt (~2-4K tokens). Semantic search over chunked content is only needed when:
- Profiles become large enough to exceed context windows
- The marketplace needs cross-profile semantic search
- Users upload long-form content (blog posts, talk transcripts)

For v1, the full profile goes in the system prompt. Simple, fast, correct.

---

*Architecture doc — March 2026*
