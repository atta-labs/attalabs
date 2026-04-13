# Herald App — Claude Code Instructions

The main Next.js 16 application. Serves both the **Herald Portal** (marketing + onboarding + admin dashboard) and the **Herald Envoy** (deployed candidate pages) from a single codebase via proxy-based subdomain routing.

Pattern: Portal + Onboarding + Admin merged into one codebase.

---

## Architecture

```
apps/herald-ai/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                # Landing page (always public)
│   │   ├── home/page.tsx           # Always-public landing (even when logged in)
│   │   ├── admin/                  # Admin dashboard + AI onboarding
│   │   │   ├── layout.tsx             # Fixed TopBar + scrollable content
│   │   │   └── page.tsx               # Onboarding if new, dashboard if done
│   │   ├── [username]/             # Envoy routes ([username].heyherald.com)
│   │   │   └── page.tsx               # Public candidate page (fetches from DB)
│   │   ├── sign-in/                # Clerk sign-in page
│   │   ├── sign-up/                # Clerk sign-up page
│   │   ├── not-found.tsx           # Custom 404 page
│   │   ├── api/
│   │   │   ├── match/                 # POST /api/match — forensic audit
│   │   │   │   └── route.ts
│   │   │   ├── mcp/signals/           # GET /api/mcp/signals — GitHub signal detection
│   │   │   │   └── route.ts
│   │   │   └── admin/
│   │   │       ├── onboarding-chat/   # POST — AI onboarding chat (streaming)
│   │   │       │   └── route.ts
│   │   │       ├── onboarding/        # POST — save onboarded profile to DB
│   │   │       │   └── route.ts
│   │   │       ├── parse-cv/          # POST — upload CV, extract profile via @atta/herald-ai-mcp
│   │   │       │   └── route.ts
│   │   │       ├── check-username/    # GET — check username availability
│   │   │       │   └── route.ts
│   │   │       └── profile/           # POST — update profile from dashboard
│   │   │           └── route.ts
│   │   ├── layout.tsx              # Root layout (fonts, ClerkProvider)
│   │   └── globals.css             # Theme tokens as CSS variables
│   ├── components/
│   │   ├── envoy/                  # Envoy components (recruiter-facing)
│   │   │   ├── ReportView.tsx          # Forensic audit report display
│   │   │   ├── JDInput.tsx             # Job description input
│   │   │   ├── LoadingState.tsx        # 3-step deterministic progress
│   │   │   └── EnvoyFlow.tsx           # Orchestrates input → loading → result
│   │   ├── portal/                 # Portal components (candidate-facing)
│   │   │   ├── AIOnboarding.tsx        # Gemini-style AI onboarding chat
│   │   │   ├── OnboardingForm.tsx      # Simple form fallback (not used in v1)
│   │   │   ├── ProfileEditor.tsx       # Dashboard profile editor
│   │   │   └── LandingPage.tsx         # Public landing page content
│   │   └── shared/
│   │       └── TopBar.tsx              # Navigation bar (auth-aware)
│   ├── db/
│   │   ├── schema.ts              # Drizzle schema (users table)
│   │   ├── queries.ts             # DB queries (getUserByUsername, createUser, etc.)
│   │   └── index.ts               # Neon DB client
│   ├── lib/
│   │   ├── profile.ts             # Hardcoded DANI_PROFILE (legacy, DB is primary now)
│   │   ├── prompts.ts             # Skeptical Auditor system prompt
│   │   ├── signals.ts             # GitHub signal extraction
│   │   ├── types.ts               # MatchReport type
│   │   └── sample-report.ts       # Hardcoded sample report (legacy)
│   └── proxy.ts                   # Clerk middleware (protects /admin)
├── drizzle.config.ts              # Drizzle ORM config for Neon
├── next.config.ts                 # Next.js config (GitHub avatar domains)
├── postcss.config.js
├── package.json
└── tsconfig.json
```

---

## Critical Rules

### RULE #1: Two render paths, one codebase

| URL | Render Path | Auth Required |
|-----|------------|---------------|
| `heyherald.com` | Landing page | No |
| `heyherald.com/admin` | Onboarding or Dashboard | Yes (Clerk) |
| `[username].heyherald.com` or `heyherald.com/[username]` | Envoy (public candidate page) | No |

### RULE #2: Profiles live in Neon Postgres

All candidate data comes from the `users` table via Drizzle ORM. The hardcoded `DANI_PROFILE` in `lib/profile.ts` is legacy — only used by the match engine as a fallback.

### RULE #3: AI Onboarding uses Vercel AI SDK

The onboarding chat at `/admin` uses:
- `streamText` on the server with Claude Haiku
- `useChat` on the client with `DefaultChatTransport`
- 4 tools: `check_username`, `verify_github`, `request_cv_upload`, `complete_onboarding`
- CV parsing via `@atta/herald-ai-mcp` package (`parseCv` tool)

### RULE #4: Envoy components are separate from Portal components

```
components/
├── envoy/     # Only used on [username] pages (recruiter sees these)
├── portal/    # Only used on admin/onboarding pages (candidate sees these)
└── shared/    # TopBar (used by both)
```

### RULE #5: Fonts and theme tokens

Three fonts via `next/font/google`: Playfair Display, DM Mono, DM Sans.
Theme tokens as CSS variables in `globals.css`. No hardcoded hex values in components.

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/match` | POST | Forensic audit — JD + profile → MatchReport via Claude |
| `/api/mcp/signals` | GET | GitHub signal detection for a username |
| `/api/admin/onboarding-chat` | POST | AI onboarding conversation (streaming) |
| `/api/admin/onboarding` | POST | Save onboarded profile to DB |
| `/api/admin/parse-cv` | POST | Upload CV → extract profile via @atta/herald-ai-mcp |
| `/api/admin/check-username` | GET | Check username availability |
| `/api/admin/profile` | POST | Update profile from dashboard |

---

## Database

Neon Postgres via Drizzle ORM. Single `users` table:

| Column | Type | Purpose |
|--------|------|---------|
| `clerk_id` | varchar PK | Clerk user ID |
| `username` | varchar unique | URL slug (heyherald.com/username) |
| `github_handle` | varchar | GitHub handle for signal detection |
| `name`, `title`, `location`, `availability` | varchar | Profile identity |
| `summary` | text | Professional summary |
| `stack` | text (JSON) | Skills array |
| `projects` | text (JSON) | Projects array |
| `experience` | text (JSON) | Experience array |
| `onboarding_complete` | boolean | Whether onboarding is done |

---

## Environment Variables

```env
# Required
ANTHROPIC_API_KEY=           # Claude API for match reports + CV parsing
GITHUB_PAT=                  # GitHub PAT for signal detection
DATABASE_URL=                # Neon Postgres connection string
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Optional
GITHUB_TOKEN=                # Higher GitHub API rate limits
```

---

## Specifications

| Spec | Path | Purpose |
|------|------|---------|
| Build Spec | [docs/BUILD-SPEC.md](docs/BUILD-SPEC.md) | Complete product spec — vision, flows, API contracts, prompts |
| Architecture | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture decisions and rationale |

---

## Related Documentation

- [Herald AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md) — Monorepo routing index

---

## Herald API Conventions

### The Skeptical Auditor

- The system prompt in `src/lib/prompts.ts` is **verbatim** from BUILD-SPEC.md Section 08
- Do NOT modify it without explicit instruction from the user
- Zero marketing language in any AI output
- Every claim must reference a detectable signal
- Gaps are always honest, always paired with mitigation

### Match API (`POST /api/match`)

- Input: `{ job_description: string }` — frontend sends ONLY the JD
- Server-side: fetches GitHub signals, merges with profile, calls Claude
- Model: Claude Sonnet via Vercel AI SDK (`@ai-sdk/anthropic`)
- LLM timeout: 25s with partial report fallback
- Signal fetch: 3s timeout, degrades gracefully to empty signals
- Caching: hash(JD + profile) → in-memory 24h
- Parse + retry once on malformed JSON response
- Never show a spinner of death — always degrade gracefully

### Signal API (`GET /api/mcp/signals?username=[handle]`)

- Uses GITHUB_PAT for authentication (personal + org + private repos)
- Identity-filtered: commits by author, PRs by author
- Returns `RawSignal[]` with audit tone (Detected/Observed/Confirmed)
- No code leakage, no LLM interpretation — raw facts only

### Rate Limiting

- 5 match reports per IP per hour (Upstash Redis)
- Applied in middleware, not in individual route handlers
- Error message: "You've run several audits recently. Try again in an hour."
