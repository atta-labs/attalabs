# Herald

**Your AI speaks for you when you're not in the room.**

Herald is a multi-tenant SaaS platform for engineers. Each engineer gets a deployed subdomain (`username.heyherald.com`) that acts as a **Forensic Technical Auditor** — a recruiter pastes a job description and gets an evidence-based match report with engineering signals, honest gap analysis, and hyper-specific interview hooks.

**Live at:** [heyherald.com](https://heyherald.com)

---

## Platform

| Surface | URL | Purpose |
|---------|-----|---------|
| **Herald Portal** | `heyherald.com` | Marketing, onboarding, admin dashboard |
| **Herald Envoy** | `[username].heyherald.com` | Deployed recruiter-facing candidate page |

### How It Works

**For Engineers (candidates):**
1. Sign up at `heyherald.com`
2. Claim your username, upload CV, connect GitHub
3. Get a deployed Envoy at `username.heyherald.com`
4. Manage your page from the admin dashboard (themes, content, analytics)

**For Recruiters:**
1. Visit `dani.heyherald.com`
2. Paste a job description
3. Herald's AI analyzes the candidate's profile, projects, and GitHub activity
4. Get a structured **Forensic Match Report**: grade, evidence, gaps, interview hooks
5. Forward it to the hiring committee — decision-ready

---

## Architecture

Herald follows the **Summon pattern** (Game7) — a single Next.js app serving both Portal and Envoy via middleware-based subdomain routing.

```
herald/
├── apps/
│   └── herald/                 # Next.js 15 (Portal + Envoy)
├── packages/
│   ├── ui/                     # Shared UI components (shadcn/ui)
│   ├── cms/                    # Sanity CMS schemas + queries
│   ├── mcp/                    # MCP tool handlers (match engine, GitHub signals)
│   └── typescript-config/      # Shared TypeScript configs
├── biome.json                  # Biome formatter + linter
├── commitlint.config.js        # Commit message validation
├── CLAUDE.md                   # AI context (Claude Code)
├── HERALD-BUILD-SPEC.md        # Complete build specification
└── docs/ARCHITECTURE.md        # Architecture decisions
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 15 (App Router, React 19) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| CMS | Sanity |
| AI | Vercel AI SDK + Claude API |
| Auth | Clerk |
| Storage | Cloudflare R2 |
| Database | Neon Postgres + Drizzle ORM |
| Rate Limiting | Upstash Redis |
| Hosting | Vercel |
| DNS | Cloudflare (wildcard `*.heyherald.com`) |
| Linting | Biome |
| Git Hooks | Husky + commitlint |

---

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Type check all packages
bun run typecheck

# Lint + format + typecheck
bun run check

# Build for production
bun run build
```

---

## Documentation

| Document | Purpose |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | AI context and rules — monorepo routing index pointing to all package docs |
| [HERALD-BUILD-SPEC.md](HERALD-BUILD-SPEC.md) | Complete build specification — platform, API contracts, UI specs, build order |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions and rationale |

Each package and app has its own `CLAUDE.md` and `README.md`:

| Package | CLAUDE.md | README |
|---------|-----------|--------|
| [apps/herald](apps/herald/) | [CLAUDE.md](apps/herald/CLAUDE.md) | [README.md](apps/herald/README.md) |
| [packages/ui](packages/ui/) | [CLAUDE.md](packages/ui/CLAUDE.md) | [README.md](packages/ui/README.md) |
| [packages/cms](packages/cms/) | [CLAUDE.md](packages/cms/CLAUDE.md) | [README.md](packages/cms/README.md) |
| [packages/mcp](packages/mcp/) | [CLAUDE.md](packages/mcp/CLAUDE.md) | [README.md](packages/mcp/README.md) |
| [packages/typescript-config](packages/typescript-config/) | [CLAUDE.md](packages/typescript-config/CLAUDE.md) | [README.md](packages/typescript-config/README.md) |

---

## Vision

**v1:** Personal portfolio tool — Dani is the first customer. Hardcoded profile, deployed Envoy, forensic match reports.

**v2:** Multi-tenant platform — engineers sign up, onboard, and get their own deployed Envoy with admin dashboard.

**v3:** Talent marketplace — recruiters search across all candidates, paste a job description, get ranked matches.

v1 is the road to v2. Ship the Envoy, prove the value, then build the platform around it.

---

*Herald — March 2026*
