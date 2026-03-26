# Herald — AI Context for Claude Code

Herald is an AI-powered portfolio agent that acts as a **Forensic Technical Auditor** for recruiters and hiring managers. A recruiter pastes a job description, and Herald generates a structured match report with evidence-based engineering signals, honest gap analysis, and hyper-specific interview hooks.

**Domain:** heyherald.com
**Candidate (v1):** Dani Estevez Martin — Senior Frontend Architect, 15+ years, remote from Thailand
**GitHub:** daniboomerang

---

## Repository Structure

| Path | Purpose |
|------|---------|
| `apps/herald` | Next.js 15 app (App Router, TypeScript, Tailwind v4, shadcn/ui) |
| `packages/ui` | Shared UI components (shadcn base) |
| `packages/db` | Drizzle ORM schema + queries (Neon Postgres) |
| `packages/config` | Shared types, constants, validation schemas |

This is a fresh **Turborepo** monorepo. Patterns are informed by Game7/Summon architecture but the codebase is entirely new and standalone.

---

## Critical Documents

| Document | Purpose | Read When |
|----------|---------|-----------|
| [HERALD-BUILD-SPEC.md](HERALD-BUILD-SPEC.md) | **Complete build specification** — API contracts, system prompts, UI specs, GitHub signals, candidate profile, build order | Before writing ANY code |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions and rationale | Understanding design choices |
| This file | Routing index + rules | Always loaded automatically |

**IMPORTANT:** Read `HERALD-BUILD-SPEC.md` first. It contains the full spec: hardcoded candidate profile, forensic API contract, Skeptical Auditor system prompt, GitHub signal detection patterns, UI/UX requirements with exact color tokens, rate limiting spec, and strict build order.

---

## Build Order (Strict — Do Not Skip Steps)

1. **Static Shell** — Build `ReportView` with hardcoded data. No LLM calls. Typography, spacing, Decision Anchor hierarchy. Must look like a finished premium product before any AI is wired.
2. **GitHub Signal Detection** — `/api/mcp/github-signals` fetches `daniboomerang`'s public repos, detects patterns, returns structured `engineering_signal` array.
3. **Match Engine** — `POST /api/match` with Skeptical Auditor system prompt. Wire `JDInput` → `LoadingState` → `ResultView`. Hash-based caching. 10s timeout with partial report fallback.
4. **Rate Limiting & Polish** — Upstash Redis (5 reports/IP/hour). Copy Link. PDF export. Final typography pass.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| AI | Vercel AI SDK (tool handlers, upgradeable to MCP transport later) |
| Database | Neon Postgres + Drizzle ORM (v1 uses hardcoded profile, DB ready for multi-user) |
| Auth | Clerk (configured but not blocking v1 public pages) |
| Rate Limiting | Upstash Redis + @upstash/ratelimit |
| Hosting | Vercel |
| DNS | Cloudflare (wildcard *.heyherald.com) |
| Package Manager | Bun |

---

## Rules (Always Active)

### Git Commits

Use format `Type: Brief description` with bullet points. Types: `Feat`, `Fix`, `Refactor`, `Style`, `Docs`, `Chore`.
NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` attribution.

### Code Style

- TypeScript strict mode, no `any`
- Prefer named exports over default exports
- Use `type` imports for type-only imports
- Biome for formatting (when configured)

### UI Rules

- Use shadcn/ui components — do not build custom primitives
- Use `lucide-react` for icons
- Follow the Minimal Dark theme tokens defined in `HERALD-BUILD-SPEC.md` Section 07
- Single-column editorial layout, generous whitespace
- Information density increases as user scrolls (Decision Anchor → Reasoning → Signals → Gaps → Hooks)

### Service Layer

- Separate into `queries.ts` (read: `getX()`) and `actions.ts` (mutations: `xAction()`)
- Server Actions for mutations, direct function calls for queries

### AI / LLM Rules

- The Skeptical Auditor system prompt in `HERALD-BUILD-SPEC.md` Section 05 is **verbatim** — do not modify it without explicit instruction
- Zero marketing language in any AI output. See the linguistic rules in the prompt.
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
| UI patterns | `.claude/rules/ui-patterns.md` | `.tsx`/`.jsx` files |
| API conventions | `.claude/rules/api-conventions.md` | `api/`, `route.ts` files |
| Git conventions | `.claude/rules/git-conventions.md` | All files |

---

## Environment Variables (Required)

```env
# AI
ANTHROPIC_API_KEY=           # Claude API key for match reports

# Database (v2 — not needed for hardcoded v1)
DATABASE_URL=                # Neon Postgres connection string

# Auth (v2 — not blocking v1)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# GitHub (optional — public API works without auth, but rate limited)
GITHUB_TOKEN=                # Personal access token for higher rate limits
```
