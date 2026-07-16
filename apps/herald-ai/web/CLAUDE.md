# Herald App — Claude Code Instructions

## Session start (REQUIRED)

Before any task in this product, read:
1. `apps/herald-ai/aeg-project/state.md` — current phase, what's built, what's unknown
2. `apps/herald-ai/aeg-project/now.md` — what's in flight and what's next

These files are the source of truth for Herald's current state. Do not rely on memory or project knowledge.

---

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
│   │   │   ├── audit/                 # POST /api/audit — forensic audit (single + batch)
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
│   │   ├── prompts.ts             # MATCH_REPORT_SCHEMA — parser contract for auditor output
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

### RULE #6: Library resolution — build-time chrome, runtime public profile (D-035, `Lock: YES`)

Herald is the only **hybrid** consumer of `@atta/ui`'s library system: it uses build-time resolution *and* runtime switching, on **disjoint route subtrees**. Crossing them silently is a recurring regression class ([`packages/governance/decisions.md`](../../../../packages/governance/decisions.md) D-035, `Lock: YES`).

| Surface | Route subtree | LibraryProvider fed with | Source |
|---------|---------------|--------------------------|--------|
| **App chrome (build-time)** | `app/(app)/*` (`/bulk-audit`, `/onboarding`) **and** `app/[username]/(owner)/*` (`/{username}/ui`, `/{username}/settings`) | `getHeraldConfig(cmsClient).userInterface.library.id` — the product's CMS-managed library | `app/(app)/layout.tsx` and `app/[username]/(owner)/layout.tsx` each wrap children in `<CandidateShell initialLibrary={chromeLibrary}>` |
| **Public profile (runtime per-user)** | `app/[username]/(profile)/*` (`/{username}` only) | `user.library` from Herald's DB | `app/[username]/(profile)/layout.tsx` wraps children in `<EnvoyLibraryShell initialLibrary={userLibrary}>` |

`app/[username]/layout.tsx` is intentionally a **no-op passthrough** (`return children` + the icon `generateMetadata`). It deliberately does **not** wrap children in any `LibraryProvider` — putting one there would inherit a provider into both the `(profile)` and `(owner)` subtrees, crossing the build-time and per-user paths. The route-group split (`(profile)` vs `(owner)`) exists precisely so the two sibling layouts can feed their own providers without the parent leaking one. **Touching `[username]/layout.tsx` to "save a hop" is the canonical D-035 regression — don't.**

**Where the build-time library id comes from (post-D-060).** Theme and library metadata live centrally in the `attalabs` Sanity dataset. The `@atta/cms` resolver (`getProductUiConfig` / `getHeraldConfig`) intercepts the string `library` id stored in `heraldConfig.userInterface.library`, fetches the full `library` document from `attalabs`, and reconstructs `config.userInterface.library` so consumers (the build-time generator **and** `(app)/layout.tsx` / `(owner)/layout.tsx` at runtime) see the same `library.id` string. That string is what both layouts feed `CandidateShell`, and what `generate-ui.ts` reads to write the `packages/ui/generated/herald/components.ts` alias target. Herald therefore looks build-time to the generator and runtime to its public-profile subtree, with both pulling the same source-of-truth id through the central resolver.

**Verification recipe (D-035, expanded for D-061).** Set `user.library = retro` in Herald's DB (or via the appearance editor). Reload `/bulk-audit`, `/onboarding`, `/{username}/ui`, `/{username}/settings`, and `/{username}` (the public profile). The first four must stay on the **build-time** library; only the last switches to `retro`. The three surfaces (`(app)`, `(owner)`, `(profile)`) are independent — and all resolve their library id through the same D-060 central-CMS path.

**When this pattern is the right one:** the app is both an authenticated tool (chrome stays on the brand's design system) *and* a public per-user surface (visitors style it for themselves); the chrome must stay uneditable by the user even on routes sharing the user's URL namespace (e.g. `/{username}/settings`); and you can keep two layout files in sync, both feeding `LibraryProvider` from different sources.

For the two base patterns this composes, and the library system's own mechanics, see [`.claude/skills/ui-library-system/SKILL.md`](../../../../.claude/skills/ui-library-system/SKILL.md).

---

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/audit` | POST | Forensic audit — JD + profile → MatchReport (single or batch, dispatched on payload shape) |
| `/api/mcp/signals` | GET | GitHub signal detection for a username |
| `/api/admin/onboarding-chat` | POST | AI onboarding conversation (streaming) |
| `/api/admin/onboarding` | POST | Save onboarded profile to DB |
| `/api/admin/parse-cv` | POST | Upload CV → extract profile via @atta/herald-ai-mcp |
| `/api/admin/check-username` | GET | Check username availability |
| `/api/admin/profile` | POST | Update profile from dashboard |

---

## Database

Neon Postgres via Drizzle ORM. Herald uses two tables:

- **`users`** — shared base table from `@atta/db` (clerk_id, email, name, etc.)
- **`heraldProfiles`** — Herald-specific table, FK → `users.clerkId`

`@atta/db` is declared as a workspace dependency in `package.json`.

| Column | Type | Purpose |
|--------|------|---------|
| `clerk_id` | varchar PK (FK → users) | Clerk user ID |
| `username` | varchar unique | URL slug (heyherald.com/username) |
| `github_handle` | varchar | GitHub handle for signal detection |
| `name`, `title`, `location`, `availability` | varchar | Profile identity |
| `summary` | text | Professional summary |
| `stack` | text (JSON) | Skills array |
| `projects` | text (JSON) | Projects array |
| `experience` | text (JSON) | Experience array |
| `theme_id`, `color_scheme`, `library` | varchar | Per-user UI customisation |
| `font_sans` | varchar | Per-user font override |
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

- The auditor's system prompt lives in `packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml` (D-051) — not in this app. `src/lib/prompts.ts` holds only `MATCH_REPORT_SCHEMA`, the parser contract injected into the YAML's `{{schema}}` template var at compile time
- Do NOT modify the YAML without explicit instruction from the user
- Zero marketing language in any AI output
- Every claim must reference a detectable signal
- Gaps are always honest, always paired with mitigation

### Audit API (`POST /api/audit`)

- Single shape: `{ job_description, username? }` → `MatchReport` (no `username` → falls back to the hardcoded `DANI_PROFILE` on the server's `ANTHROPIC_API_KEY`). Batch shape: `{ jd, candidates: [...] }` → `{ results: [...] }`. Dispatched on presence of `candidates` (D-045)
- Both shapes call the shared engine-backed cell `runSingleMatch`, which calls `run()` from `@atta/forensic-hiring-auditor` (`loadFlow` → `compileFlow` → `LangGraphAdapter.execute` against `packages/agents/forensic-hiring-auditor/yamls/herald-auditor.yaml`, D-051) — no direct SDK call in this app
- GitHub signal fetching is a model-invoked custom tool (`fetch_github_signals`, D-047), not a Herald pre-fetch — 3s timeout, degrades to no signals
- LLM timeout: `AUDIT_LLM_TIMEOUT_MS` = 90s per attempt, 2 attempts, then falls back to a partial report
- Batch requires Clerk auth and runs on the logged-in user's stored BYOK key (402 if missing); 1–10 candidates per call
- Caching: hash(JD + profile + vendor + model) → in-memory 24h
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
