# Herald — Claude Code Instructions

Herald is a **Multi-Tenant SaaS Platform for Engineers** following the Summon architecture pattern (Game7). It provides an **Autonomous Engineering Envoy** — a forensic technical auditor for recruiters and hiring managers.

**Domain:** heyherald.com
**First customer (v1):** Dani Estevez Martin — Senior Frontend Architect, 15+ years, remote from Thailand
**GitHub:** daniboomerang
**Summon reference repo:** `/Users/daniboomerang/Work/Repositories/game7/summon`

---

## Platform Topology (Summon Pattern)

| Surface | URL | Purpose | Summon Equivalent |
|---------|-----|---------|-------------------|
| Herald Portal | `heyherald.com` | Marketing + Onboarding + Admin Dashboard | Summoner + Admin (merged) |
| Herald Envoy | `[username].heyherald.com` | Deployed recruiter-facing candidate site | Portal |

Single Next.js app with middleware-based subdomain routing. Both `heyherald.com/dani` (path) and `dani.heyherald.com` (subdomain) render the same Envoy page.

---

## Critical Documents

| Document | Purpose | Read When |
|----------|---------|-----------|
| [HERALD-BUILD-SPEC.md](HERALD-BUILD-SPEC.md) | **Complete build specification** — platform topology, onboarding, admin, API contracts, system prompts, UI specs, build order | Before writing ANY code |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions and rationale (why Summon pattern, why Sanity, why runtime themes) | Understanding design choices |
| This file | Routing index + rules | Always loaded automatically |

**IMPORTANT:** Read `HERALD-BUILD-SPEC.md` first. It contains the full spec including the Summon-pattern platform architecture, onboarding flow, admin dashboard, forensic API contract, Skeptical Auditor system prompt, and strict build order.

---

## Monorepo Architecture

### Apps

| App | CLAUDE.md | README | Purpose |
|-----|-----------|--------|---------|
| [apps/herald](apps/herald/) | [CLAUDE.md](apps/herald/CLAUDE.md) | [README.md](apps/herald/README.md) | Next.js 15 app — Portal + Envoy in one codebase |

### Packages

| Package | CLAUDE.md | README | Purpose |
|---------|-----------|--------|---------|
| [packages/ui](packages/ui/) | [CLAUDE.md](packages/ui/CLAUDE.md) | [README.md](packages/ui/README.md) | Shared UI components (shadcn/ui + Tailwind v4 + lucide-react) |
| [packages/cms](packages/cms/) | [CLAUDE.md](packages/cms/CLAUDE.md) | [README.md](packages/cms/README.md) | Sanity CMS schemas, config, typed queries |
| [packages/mcp](packages/mcp/) | [CLAUDE.md](packages/mcp/CLAUDE.md) | [README.md](packages/mcp/README.md) | MCP tool handlers — match engine, GitHub signals, profile |
| [packages/typescript-config](packages/typescript-config/) | [CLAUDE.md](packages/typescript-config/CLAUDE.md) | [README.md](packages/typescript-config/README.md) | Shared TypeScript configs (base, Next.js) |

### Package Dependency Graph

```
apps/herald
├── @herald/ui              → UI components
├── @herald/cms             → Sanity CMS client + queries
├── @herald/mcp             → Match engine, GitHub signals
└── @herald/typescript-config → TypeScript config (via tsconfig extends)

packages/ui
└── @herald/typescript-config

packages/cms
└── @herald/typescript-config

packages/mcp
└── @herald/typescript-config
```

---

## Tech Stack (Aligned with Summon)

| Layer | Technology | Summon Equivalent |
|-------|-----------|-------------------|
| Monorepo | Turborepo + Bun | Same |
| Framework | Next.js 15 (App Router, TypeScript, React 19) | Same |
| Styling | Tailwind CSS v4 + shadcn/ui | Same |
| CMS | Sanity (tenant content, themes, configs) | Same |
| Auth | Clerk (sign-up, login, session management) | Same |
| Storage | Cloudflare R2 (avatars, assets) | Same |
| AI | Vercel AI SDK + Claude API (tool handlers) | Same |
| Database | Neon Postgres + Drizzle ORM (relational data) | Similar |
| Rate Limiting | Upstash Redis + @upstash/ratelimit | N/A |
| Hosting | Vercel | Same |
| DNS | Cloudflare wildcard `*.heyherald.com` | Same |
| Linting | Biome (formatter + linter) | Same |
| Git Hooks | Husky + lint-staged + commitlint | Same |

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

## Build Order (Strict — Do Not Skip Steps)

1. **Static Shell (Envoy Template)** — Build `ReportView` with hardcoded data. No LLM calls. Typography, spacing, Decision Anchor hierarchy.
2. **GitHub Signal Detection** — `/api/mcp/github-signals` fetches `daniboomerang`'s public repos, detects patterns.
3. **Match Engine** — `POST /api/match` with Skeptical Auditor prompt. Wire `JDInput` → `LoadingState` → `ResultView`.
4. **Rate Limiting & Polish** — Upstash Redis (5 reports/IP/hour). Copy Link. PDF export.
5. **Subdomain Routing & Sanity** — Sanity CMS schemas, middleware subdomain routing, Envoy reads from Sanity.
6. **Onboarding Flow** — AI-driven onboarding at `/onboarding` (Summoner pattern). Clerk auth.
7. **Admin Dashboard** — `/admin` with live preview (iframe + postMessage), theme control, content management.

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
