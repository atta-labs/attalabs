# Herald — Architecture Decisions

This document captures the **why** behind key architectural choices. Read this to understand the reasoning, not just the implementation.

---

## Why Single-App Multi-Tenant

Herald uses a **single Next.js app** that serves both the Portal (marketing + onboarding + admin) and the Envoy (deployed candidate pages) via middleware-based subdomain routing.

**Why not separate apps?** Because the Envoy and Portal share the same domain, the same auth layer, and the same data source. Splitting them creates deployment complexity with no architectural benefit. Middleware routing is simpler and proven at scale.

---

## Why Turborepo Monorepo

Herald is built as a monorepo despite having only one app in v1. This is intentional:

1. **Proven pattern** — the author has built multi-app Turborepo monorepos with 3+ apps and 8+ packages. The tooling, caching, and workspace management are battle-tested.
2. **Future-ready** — the platform will need shared packages across Portal and Envoy rendering paths. Clean package boundaries are structural, not just convention.
3. **Package boundaries enforce clean architecture** — `@herald/ui` can't reach into the database. `@herald/cms` handles all Sanity concerns. `@herald/mcp` owns the match engine.

---

## Why Sanity CMS (Not Just Drizzle/Neon for Everything)

Herald uses a dual data layer:

- **Sanity CMS** — candidate content (profiles, themes, page configs). Provides real-time preview, structured content editing, and the admin dashboard content management experience.
- **Neon Postgres + Drizzle ORM** — relational data (user accounts, match report history, analytics, rate limiting metadata). Data that needs SQL queries, joins, and aggregations.

**Why not just Postgres for everything?** Because Sanity provides the content management experience the admin dashboard needs — structured schemas, real-time preview, image handling — without building a custom CMS.

---

## Why Vercel AI SDK Tool Handlers (Not True MCP Yet)

The build spec describes "MCP tool handlers" but the v1 implementation is **Vercel AI SDK tool handlers** — server-side functions the LLM calls mid-reasoning, registered via the AI SDK's tool system.

They are NOT yet a standalone MCP server with stdio/SSE transport.

**Why this is correct for v1:**
- The user experience is identical — the LLM calls tools, tools query data, answers are correct
- True MCP transport adds complexity with no v1 user benefit
- The tool definitions are structured so extraction to true MCP transport later is just adding a transport layer

**When to upgrade to true MCP:**
- When external AI clients (Claude Desktop, Cursor) need to connect to a candidate's profile
- This is a Month 3+ milestone

---

## Why Runtime Theme Switching (Not Build-Time)

Herald uses **runtime** theme switching via CSS variables and Sanity CMS, not build-time resolution.

**The key difference:** A fixed set of known candidates can be resolved at build time. Herald has potentially thousands of unknown users who can each choose their own theme. You cannot build-time resolve for dynamic users.

**v1 themes:**
1. **Minimal Dark** (launch theme) — dark editorial, monochrome, serif typography
2. **Neo-Brutalism** (second theme) — heavy borders, primary colors
3. **Terminal** (stretch goal) — green on black, monospace, command-line aesthetic

---

## Why Hardcoded Profile in v1

The Sanity CMS will store all candidate profiles in v2+, but v1 hardcodes Dani's profile as a TypeScript object in `apps/herald/src/lib/profile.ts`.

**Why:**
- Ship faster — no Sanity setup, no auth flow, no onboarding needed for day 1
- The product must be live and useful for Dani's job search within 2 weeks
- Migration from hardcoded → Sanity is trivial: replace the import with a Sanity query
- Validates the core value prop (match reports) without any infrastructure overhead

---

## Why BYOK (Bring Your Own Key)

The AI cost — the most expensive component at scale — is borne by the user via their own API key. The platform provides the infrastructure and intelligence layer, the user pays for the compute.

**v1 exception:** Dani's own profile uses his own API key server-side. Visitors don't need a key — they use the built-in key with rate limiting (5 reports/IP/hour via Upstash Redis).

**v2 (multi-user):** Each user provides their own API key, encrypted in the database. Visitors to any profile use that user's key, rate-limited.

---

## Why No RAG in v1

A full developer profile fits in a single system prompt (~2-4K tokens). Semantic search over chunked content is only needed when:
- Profiles become large enough to exceed context windows
- The marketplace needs cross-profile semantic search
- Users upload long-form content (blog posts, talk transcripts)

For v1, the full profile goes in the system prompt. Simple, fast, correct.

---

*Architecture doc — March 2026*
