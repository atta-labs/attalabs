# Herald App — Claude Code Instructions

The main Next.js 15 application. Serves both the **Herald Portal** (marketing + onboarding + admin dashboard) and the **Herald Envoy** (deployed candidate pages) from a single codebase via middleware-based subdomain routing.

Pattern: Portal + Onboarding + Admin merged into one codebase.

---

## Architecture

```
apps/herald/
├── src/
│   ├── app/
│   │   ├── (portal)/               # Portal routes (heyherald.com)
│   │   │   ├── page.tsx                # Landing / marketing page
│   │   │   ├── layout.tsx              # Portal layout (nav, footer)
│   │   │   ├── onboarding/            # Multi-step onboarding (Step 6)
│   │   │   │   └── page.tsx
│   │   │   └── admin/                 # Admin dashboard (Step 7)
│   │   │       ├── page.tsx
│   │   │       ├── preview/           # Live preview of Envoy (iframe + postMessage)
│   │   │       ├── theme/             # Theme selection & customisation
│   │   │       ├── content/           # Profile content management
│   │   │       └── analytics/         # Match report analytics
│   │   ├── [username]/             # Envoy routes ([username].heyherald.com)
│   │   │   └── page.tsx               # Public candidate page
│   │   ├── api/
│   │   │   ├── match/                 # POST /api/match — forensic audit
│   │   │   │   └── route.ts
│   │   │   ├── mcp/                   # MCP tool handler proxy
│   │   │   │   └── route.ts
│   │   │   └── chat/                  # AI onboarding chat (Step 6)
│   │   │       └── route.ts
│   │   ├── layout.tsx              # Root layout (fonts, metadata)
│   │   └── globals.css             # Theme tokens as CSS variables
│   ├── components/
│   │   ├── envoy/                  # Envoy components (recruiter-facing)
│   │   │   ├── ReportView.tsx          # Main forensic artifact display
│   │   │   ├── JDInput.tsx             # Job description input
│   │   │   ├── LoadingState.tsx        # 3-step deterministic progress
│   │   │   └── ResultView.tsx          # Report wrapper with actions
│   │   ├── portal/                 # Portal components (candidate-facing)
│   │   │   ├── OnboardingChat.tsx      # AI-driven onboarding (Step 6)
│   │   │   ├── AdminDashboard.tsx      # Dashboard shell (Step 7)
│   │   │   └── PortalPreview.tsx       # Live preview iframe (Step 7)
│   │   └── shared/                 # Components used by both Portal and Envoy
│   ├── lib/
│   │   ├── profile.ts              # Hardcoded Dani profile (v1)
│   │   └── prompts.ts              # Re-exports from @herald/mcp
│   └── middleware.ts               # Subdomain routing + rate limiting
├── public/
├── CLAUDE.md
├── README.md
├── package.json
├── tsconfig.json
├── postcss.config.js
└── next.config.ts
```

---

## Critical Rules

### RULE #1: Two render paths, one codebase

The app serves two completely different experiences based on the URL:

| URL | Render Path | Layout | Auth Required |
|-----|------------|--------|---------------|
| `heyherald.com/*` | `(portal)/` routes | Portal layout (nav, footer) | Some routes (admin, onboarding) |
| `[username].heyherald.com` | `[username]/` route | Envoy layout (minimal, editorial) | No |
| `heyherald.com/dani` | `[username]/` route | Envoy layout | No |

Middleware detects subdomain and rewrites to the correct route.

### RULE #2: Envoy components are the priority (Steps 1-4)

The build order is strict. Steps 1-4 focus entirely on the Envoy (recruiter-facing) components. Portal components (onboarding, admin) come in Steps 6-7.

**Do NOT build Portal components until Envoy is production-ready.**

### RULE #3: Component organisation follows the two-face pattern

```
components/
├── envoy/     # Only used on [username] pages (recruiter sees these)
├── portal/    # Only used on (portal) pages (candidate sees these)
└── shared/    # Used by both (rare — be intentional)
```

Never put Envoy-specific components in `shared/`. Never import Portal components from Envoy pages.

### RULE #4: v1 uses hardcoded profile, not Sanity

Step 1-4: `apps/herald/src/lib/profile.ts` contains `DANI_PROFILE` as a TypeScript object.
Step 5+: Replace with Sanity query via `@herald/cms`.

### RULE #5: Fonts are loaded in the root layout

Three fonts loaded via `next/font/google`:

```tsx
import { Playfair_Display, DM_Mono, DM_Sans } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display' })
const dmMono = DM_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-mono' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
```

### RULE #6: Theme tokens are CSS variables in globals.css

```css
:root {
  --background: #0D0B08;
  --foreground: #E8D5B7;
  --accent: #C8A84B;
  --muted-foreground: #7A6A50;
  --card: #1A1610;
  --border: #2A2318;
  --destructive: #C85A4B;
}
```

Components use Tailwind classes (`bg-background`, `text-foreground`, `text-accent`) — never hardcoded hex values.

---

## Middleware (Subdomain Routing)

```typescript
// src/middleware.ts
// 1. Extract hostname from request
// 2. If subdomain exists (e.g. dani.heyherald.com) → rewrite to /dani
// 3. If path matches /api/match → check rate limit (Upstash Redis)
// 4. If path matches /admin or /onboarding → check Clerk auth
```

---

## API Routes

| Route | Method | Purpose | Build Step |
|-------|--------|---------|------------|
| `/api/match` | POST | Forensic audit — JD + profile → MatchReport | Step 3 |
| `/api/mcp` | POST | MCP tool handler proxy to `@herald/mcp` | Step 3 |
| `/api/chat` | POST | AI onboarding conversation | Step 6 |

---

## Build Order (What To Build When)

| Step | What | Components/Routes |
|------|------|-------------------|
| 1 | Static Shell | `ReportView`, `[username]/page.tsx`, `layout.tsx`, `globals.css` |
| 2 | GitHub Signals | Wire `@herald/mcp/tools/github-signals` into ReportView |
| 3 | Match Engine | `JDInput`, `LoadingState`, `ResultView`, `/api/match` |
| 4 | Rate Limiting | `middleware.ts` (Upstash), Copy Link, PDF export |
| 5 | Sanity Integration | `middleware.ts` (subdomain routing), replace hardcoded profile |
| 6 | Onboarding | `(portal)/onboarding/`, `OnboardingChat`, `/api/chat` |
| 7 | Admin Dashboard | `(portal)/admin/`, `AdminDashboard`, `PortalPreview` |

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `@herald/ui` | Shared UI components (shadcn) |
| `@herald/cms` | Sanity CMS client and queries (Step 5+) |
| `@herald/mcp` | Match engine, GitHub signals, profile tools |
| `next` | Framework |
| `react` / `react-dom` | UI runtime |
| `tailwindcss` | Styling |

---

## Environment Variables

```env
# Required for Steps 1-2 (none — hardcoded data)

# Required for Step 3
ANTHROPIC_API_KEY=           # Claude API for match reports

# Required for Step 4
UPSTASH_REDIS_REST_URL=      # Rate limiting
UPSTASH_REDIS_REST_TOKEN=

# Required for Step 5
SANITY_PROJECT_ID=           # CMS
SANITY_DATASET=
SANITY_API_TOKEN=

# Required for Step 6
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=  # Auth
CLERK_SECRET_KEY=

# Required for Step 7
CLOUDFLARE_ACCOUNT_ID=       # R2 storage
CLOUDFLARE_API_TOKEN=
R2_BUCKET_NAME=

# Optional
GITHUB_TOKEN=                # Higher GitHub API rate limits
```

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
- [HERALD-BUILD-SPEC.md](../../HERALD-BUILD-SPEC.md) — Complete build specification
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — Architecture decisions
- [.claude/rules/ui-patterns.md](../../.claude/rules/ui-patterns.md) — UI rules (loaded for .tsx files)
- [.claude/rules/api-conventions.md](../../.claude/rules/api-conventions.md) — API rules (loaded for route.ts files)
