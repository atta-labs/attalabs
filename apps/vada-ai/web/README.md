# Vāda AI Web

Next.js 16 web app for Vāda AI. Users submit a question, configure agents, and watch a live deliberation stream. Sessions are persisted, resumable, and exportable.

Part of [Vāda AI](../README.md).

---

## Stack

- **Framework:** Next.js 16 (App Router, TypeScript, React 19)
- **Deliberation runtime:** `@atta/adapter-langgraph` — LangGraph + Anthropic SDK
- **Database:** Neon Postgres via `@atta/db` (Drizzle ORM)
- **Auth:** Clerk via `@atta/auth`
- **UI:** `@atta/ui` (shadcn/ui + Tailwind v4)
- **CMS:** Sanity via `@atta/cms`

## Running Locally

```bash
# From monorepo root
bun run dev:vada
```

App runs on port 3002. Requires `.env.local` with Clerk, Neon, and Anthropic credentials.

## Verification Scripts

```bash
# From apps/vada-ai/web
bun scripts/verify-sparring-port.ts     # Sparring team end-to-end smoke test
bun scripts/verify-crucible-port.ts     # Crucible team smoke test (V1 baseline check)
bun scripts/verify-baselines.ts         # A0/A1 baselines smoke test
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — Architecture, API routes, critical rules for Claude Code
- [../CLAUDE.md](../CLAUDE.md) — Vāda AI product overview
- [../specs/](../specs/) — Full specifications
