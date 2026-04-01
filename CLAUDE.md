# Herald — Claude Code Instructions

Herald is a **Multi-Tenant SaaS Platform** that gives any professional a deployed subdomain with an AI-powered **Forensic Match Audit**. A recruiter pastes a job description and gets a structured, evidence-based match report.

**Domain:** heyherald.com
**First customer (v1):** Dani Estevez Martin — Senior Frontend Architect, 15+ years, remote from Thailand
**GitHub:** daniboomerang

---

## Platform Topology

| Surface | URL | Purpose |
|---------|-----|---------|
| Herald Portal | `heyherald.com` | Marketing + Onboarding + Admin Dashboard |
| Herald Envoy | `[username].heyherald.com` | Deployed recruiter-facing candidate page |

Single Next.js app with middleware-based subdomain routing. Both `heyherald.com/dani` (path) and `dani.heyherald.com` (subdomain) render the same Envoy page.

---

## Critical Documents

| Document | Purpose | Read When |
|----------|---------|-----------|
| [HERALD-BUILD-SPEC.md](HERALD-BUILD-SPEC.md) | **Complete build specification** — platform topology, onboarding, admin, API contracts, system prompts, UI specs, build order | Before writing ANY code |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions and rationale | Understanding design choices |
| This file | Routing index + rules | Always loaded automatically |

**IMPORTANT:** Read `HERALD-BUILD-SPEC.md` first. It contains the full spec including the platform architecture, onboarding flow, admin dashboard, forensic API contract, Skeptical Auditor system prompt, and strict build order.

---

## Monorepo Architecture

### Apps

| App | CLAUDE.md | README | Purpose |
|-----|-----------|--------|---------|
| [apps/herald](apps/herald/) | [CLAUDE.md](apps/herald/CLAUDE.md) | [README.md](apps/herald/README.md) | Next.js 16 app — Portal + Envoy in one codebase |

### Packages

| Package | CLAUDE.md | README | Purpose |
|---------|-----------|--------|---------|
| [packages/ui](packages/ui/) | [CLAUDE.md](packages/ui/CLAUDE.md) | [README.md](packages/ui/README.md) | Shared UI components (shadcn/ui + Tailwind v4 + lucide-react) |
| [packages/cms](packages/cms/) | [CLAUDE.md](packages/cms/CLAUDE.md) | [README.md](packages/cms/README.md) | Sanity CMS schemas, config, typed queries |
| [packages/mcp](packages/mcp/) | [CLAUDE.md](packages/mcp/CLAUDE.md) | [README.md](packages/mcp/README.md) | MCP tool handlers — match engine, signal detection, profile |
| [packages/typescript-config](packages/typescript-config/) | [CLAUDE.md](packages/typescript-config/CLAUDE.md) | [README.md](packages/typescript-config/README.md) | Shared TypeScript configs (base, Next.js) |

### Package Dependency Graph

```
apps/herald
├── @herald/ui              → UI components
├── @herald/cms             → Sanity CMS client + queries
├── @herald/mcp             → Match engine, signal detection
└── @herald/typescript-config → TypeScript config (via tsconfig extends)

packages/ui, packages/cms, packages/mcp
└── @herald/typescript-config
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| CMS | Sanity (candidate content, themes, configs) |
| Auth | Clerk (sign-up, login, session management) |
| Storage | Cloudflare R2 (avatars, assets) |
| AI | Vercel AI SDK + Claude API (tool handlers) |
| Database | Neon Postgres + Drizzle ORM (relational data) |
| Rate Limiting | Upstash Redis + @upstash/ratelimit |
| Hosting | Vercel |
| DNS | Cloudflare wildcard `*.heyherald.com` |
| Linting | Biome (formatter + linter) |
| Git Hooks | Husky + lint-staged + commitlint |

---

## Tooling

### Biome

Biome replaces ESLint + Prettier. Config at root `biome.json`.

```bash
bun run lint              # Lint only
bun run format            # Format only
bun run format-and-lint   # Both
bun run check             # Typecheck + lint + format
```

### Husky + Commitlint

- **pre-commit**: Runs `bun run check` (typecheck + biome)
- **commit-msg**: Validates commit message format via commitlint

Commit format: `Type: Brief description`
Types: `Build`, `Docs`, `Feat`, `Chore`, `Fix`, `Perf`, `Refactor`, `Revert`, `Style`, `Test`

### Turbo Tasks

```bash
bun run dev          # Start dev server (Turbopack)
bun run build        # Production build
bun run typecheck    # TypeScript check across all packages
bun run check        # Typecheck + lint + format
bun run clean        # Clean build artifacts
```

---

## Build Progress

| Step | Status | What |
|------|--------|------|
| 1 | **Done** | Static Shell — ReportView with editorial layout |
| 2 | **Done** | Signal Detection — GitHub PAT, identity-filtered, org repos |
| 3 | **Done** | Match Engine — Claude Sonnet + deterministic loading + frontend flow |
| 4 | Partial | Rate limiting (in-memory), Copy Link, Export PDF |
| 5 | **Done** | DB profiles via Neon Postgres + Drizzle (no Sanity needed for v1) |
| 6 | **Done** | AI Onboarding — Gemini-style chat with tools + CV parsing via @herald/mcp |
| 7 | Partial | Admin dashboard — profile editor works, needs themes + analytics |

---

## Rules (Always Active)

### Git Commits

Use format `Type: Brief description` with bullet points. Types: `Feat`, `Fix`, `Refactor`, `Style`, `Docs`, `Chore`.
NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` attribution.

### Code Style

- TypeScript strict mode, no `any`
- Prefer named exports over default exports
- Use `type` imports for type-only imports
- Biome for formatting (configured in `biome.json`)

### UI Rules

- Use shadcn/ui components — do not build custom primitives
- Use `lucide-react` for icons
- Follow the Minimal Dark theme tokens defined in `HERALD-BUILD-SPEC.md` Section 10
- Single-column editorial layout, generous whitespace
- Information density increases as user scrolls (Decision Anchor → Reasoning → Signals → Gaps → Hooks)

### Service Layer

- Separate into `queries.ts` (read: `getX()`) and `actions.ts` (mutations: `xAction()`)
- Server Actions for mutations, direct function calls for queries

### AI / LLM Rules

- The Skeptical Auditor system prompt in `HERALD-BUILD-SPEC.md` Section 08 is **verbatim** — do not modify it without explicit instruction
- Zero marketing language in any AI output
- Every claim must reference a detectable signal
- Gaps are always honest, always paired with mitigation

### Rate Limiting

- 5 match reports per IP per hour (Upstash Redis)
- Apply in middleware before `/api/match`
- Graceful error message, never raw 429

---

## Rule Modules

| Rule | File | Loads When |
|------|------|-----------|
| UI patterns | [.claude/rules/ui-patterns.md](.claude/rules/ui-patterns.md) | `.tsx`/`.jsx` files |
| API conventions | [.claude/rules/api-conventions.md](.claude/rules/api-conventions.md) | `api/`, `route.ts` files |
| Git conventions | [.claude/rules/git-conventions.md](.claude/rules/git-conventions.md) | All files |

---

## Environment Variables

```env
# AI
ANTHROPIC_API_KEY=           # Claude API key for match reports

# CMS
SANITY_PROJECT_ID=           # Sanity project ID
SANITY_DATASET=              # Sanity dataset
SANITY_API_TOKEN=            # Sanity write token
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=

# Database (relational data)
DATABASE_URL=                # Neon Postgres connection string

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Storage
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
R2_BUCKET_NAME=

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# GitHub (optional — public API works without auth, but rate limited)
GITHUB_TOKEN=                # Personal access token for higher rate limits
```
