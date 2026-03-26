# Herald

**Your AI speaks for you when you're not in the room.**

Herald is an AI-powered portfolio agent that generates forensic match reports for recruiters and hiring managers. Paste a job description, get an evidence-based audit of candidate fit — with engineering signals, honest gap analysis, and hyper-specific interview hooks.

**Live at:** [heyherald.com](https://heyherald.com)

---

## How It Works

1. A recruiter visits `dani.heyherald.com`
2. They paste a job description
3. Herald's AI analyzes the candidate's profile, projects, and GitHub activity
4. It generates a structured **Forensic Match Report**: grade, evidence, gaps, interview hooks
5. The recruiter forwards it to the hiring committee — decision-ready

---

## Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| App | Next.js 15 (App Router) |
| AI | Vercel AI SDK (MCP-compatible tool handlers) |
| Database | Neon Postgres + Drizzle ORM |
| Auth | Clerk |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Rate Limiting | Upstash Redis |
| Hosting | Vercel |
| DNS | Cloudflare |

---

## Monorepo Structure

```
herald/
├── apps/herald/          # Next.js 15 — public portfolio + match API
├── packages/ui/          # Shared UI components (shadcn base)
├── packages/db/          # Drizzle schema + queries
├── packages/config/      # Shared types, constants
├── CLAUDE.md             # AI context (Claude Code reads this)
├── HERALD-BUILD-SPEC.md  # Complete build specification
└── docs/                 # Architecture docs
```

---

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun dev

# Build all packages
bun run build

# Type check
bun run type-check
```

---

## Architecture Docs

- [CLAUDE.md](CLAUDE.md) — AI context and rules (for Claude Code)
- [HERALD-BUILD-SPEC.md](HERALD-BUILD-SPEC.md) — Complete build specification
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Architecture decisions and rationale

---

## Vision

**Option A (v1):** Personal portfolio tool — every developer gets an AI-powered portfolio page. Shareable URL. Recruiters visit, chat with the AI, run match reports.

**Option B (future):** Talent marketplace — recruiters search across all candidates. Paste a job offer, get a ranked list of best matches.

A is the road to B. Ship A, accumulate users, their profiles populate the database, B emerges naturally.

---

*Herald — March 2026*
