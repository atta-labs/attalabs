# @atta/herald-ai-web

The main Herald application — a Next.js 15 app serving both the **Portal** (marketing + onboarding + admin) and the **Envoy** (deployed candidate pages).

## Quick Start

```bash
# From monorepo root
bun install
bun run dev
```

The app runs at `http://localhost:3000`.

## Two Faces, One App

| URL Pattern | What It Serves |
|-------------|---------------|
| `heyherald.com` | Portal — marketing, onboarding, admin dashboard |
| `[username].heyherald.com` | Envoy — recruiter-facing forensic audit page |
| `heyherald.com/dani` | Envoy — same as subdomain (path-based fallback) |

## Tech Stack

- **Next.js 15** — App Router, React 19, Turbopack
- **Tailwind CSS v4** — Styling with CSS variables for theming
- **shadcn/ui** — Component primitives
- **Vercel AI SDK** — LLM tool handlers (Claude API)
- **Clerk** — Authentication (Portal routes)
- **Upstash Redis** — Rate limiting

## Project Structure

```
src/
├── app/
│   ├── (portal)/         # Portal routes (heyherald.com)
│   ├── [username]/       # Envoy routes (subdomain or path)
│   └── api/              # API routes (match, mcp, chat)
├── components/
│   ├── envoy/            # Recruiter-facing components
│   ├── portal/           # Candidate-facing components
│   └── shared/           # Shared components
└── lib/                  # Utilities, hardcoded data (v1)
```

## Environment Variables

See [CLAUDE.md](./CLAUDE.md) for the full list organised by build step.
