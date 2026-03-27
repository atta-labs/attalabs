# HERALD — Master Build Specification v2.0

## Claude Code Handoff Document

---

## 01. Project Vision

Herald is a **Multi-Tenant SaaS Platform for Engineers** — following the architecture patterns established in the Summon platform (Game7). It provides an **Autonomous Engineering Envoy** that acts as a **Forensic Technical Auditor** for recruiters and hiring managers.

The platform has two faces:

1. **Herald Portal** (`heyherald.com`) — The marketing site, onboarding flow, and admin dashboard. This is where engineers sign up, claim their username, upload their CV/GitHub, select a theme, and manage their deployed Envoy. Equivalent to Summon's Summoner + Admin (merged into one app).

2. **Herald Envoy** (`[username].heyherald.com`) — The deployed, public-facing candidate site. This is what engineers send to recruiters. A recruiter pastes a job description and gets a forensic match report with evidence-based engineering signals, honest gap analysis, and hyper-specific interview hooks.

**The one sentence:** "Paste your job description. See instantly how well I fit — and why."

**First customer (v1):** Dani Estevez Martin — Senior Frontend Architect, 15+ years, remote from Thailand. GitHub: **daniboomerang**.

---

## 02. Platform Topology (The Summon Pattern)

Herald follows the same **Single-App, Multi-Tenant Architecture** as the Summon platform.

### Topology

| Surface | URL | Purpose | Summon Equivalent |
|---------|-----|---------|-------------------|
| **Herald Portal** | `heyherald.com` | Marketing + Onboarding + Admin Dashboard | Summoner + Admin (merged) |
| **Herald Envoy** | `[username].heyherald.com` | Deployed recruiter-facing candidate site | Portal |

### Architecture

- **Single Next.js app** with middleware-based subdomain routing (same as Summon Portal)
- Next.js middleware reads `Host` header → extracts subdomain → maps to username → fetches tenant data from Sanity
- `heyherald.com/dani` (path-based) and `dani.heyherald.com` (subdomain) both work and render the same page
- Cloudflare wildcard DNS (`*.heyherald.com`) → Vercel

---

## 03. Core Architecture

### Tech Stack (Aligned with Summon)

| Layer | Technology | Summon Equivalent |
|-------|-----------|-------------------|
| Monorepo | Turborepo + Bun | Same |
| Framework | Next.js 15 (App Router, TypeScript) | Same |
| Styling | Tailwind CSS v4 + shadcn/ui | Same |
| CMS | Sanity (tenant content, themes, page configs) | Same |
| Auth | Clerk (sign-up, login, session management) | Same |
| Storage | Cloudflare R2 (avatars, assets) | Same |
| AI | Vercel AI SDK + Claude API (tool handlers) | Same |
| Database | Neon Postgres + Drizzle ORM (relational data: users, match history, analytics) | Similar |
| Rate Limiting | Upstash Redis + @upstash/ratelimit | N/A |
| Hosting | Vercel | Same |
| DNS | Cloudflare wildcard `*.heyherald.com` | Same |

### Monorepo Structure

```
herald/
├── apps/
│   └── herald/                     # Next.js 15 app (Portal + Envoy)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (portal)/           # Herald Portal routes (marketing, onboarding, admin)
│       │   │   │   ├── page.tsx            # Landing / marketing page
│       │   │   │   ├── onboarding/         # Multi-step onboarding flow
│       │   │   │   │   └── page.tsx
│       │   │   │   └── admin/              # Admin dashboard
│       │   │   │       ├── page.tsx
│       │   │   │       ├── preview/        # Live preview of deployed Envoy
│       │   │   │       ├── theme/          # Theme selection & customisation
│       │   │   │       ├── content/        # Profile content management
│       │   │   │       └── analytics/      # Match report analytics
│       │   │   ├── [username]/         # Herald Envoy (public candidate page)
│       │   │   │   └── page.tsx
│       │   │   ├── api/
│       │   │   │   ├── match/             # POST /api/match (forensic audit)
│       │   │   │   │   └── route.ts
│       │   │   │   ├── mcp/               # MCP tool handlers (proxies to @herald/mcp)
│       │   │   │   │   └── route.ts
│       │   │   │   └── chat/              # AI onboarding chat (like Summoner)
│       │   │   │       └── route.ts
│       │   │   ├── layout.tsx
│       │   │   └── middleware.ts       # Subdomain routing + rate limiting
│       │   ├── components/
│       │   │   ├── envoy/                 # Envoy components (recruiter-facing)
│       │   │   │   ├── ReportView.tsx
│       │   │   │   ├── JDInput.tsx
│       │   │   │   ├── LoadingState.tsx
│       │   │   │   └── ResultView.tsx
│       │   │   ├── portal/                # Portal components (candidate-facing)
│       │   │   │   ├── OnboardingChat.tsx
│       │   │   │   ├── AdminDashboard.tsx
│       │   │   │   └── PortalPreview.tsx
│       │   │   └── shared/                # Shared components
│       │   └── lib/
│       │       ├── profile.ts             # Hardcoded Dani profile (v1)
│       │       └── prompts.ts             # Skeptical Auditor system prompt
│       └── public/
├── packages/
│   ├── ui/                         # Shared UI components (shadcn base)
│   ├── cms/                        # Sanity schemas + config (like @summon/cms)
│   ├── mcp/                        # MCP tool handlers — match engine, GitHub signals, profile
│   │                                 # v1: Vercel AI SDK tools. Extractable to standalone MCP server later.
│   └── typescript-config/          # Shared TypeScript configs (like @summon/typescript-config)
├── .husky/                         # Git hooks (pre-commit, commit-msg)
├── biome.json                      # Biome formatter + linter config
├── commitlint.config.js            # Commit message validation
├── lint-staged.config.js           # Pre-commit staged file checks
├── turbo.json
└── package.json
```

---

## 04. The Onboarding Flow (The "Summoner")

Goal: Turn a visitor into a deployed subdomain in under 3 minutes.

### Flow Steps

1. **Identity** — Create account via Clerk. Claim unique `[username]` (URL-safe, checked for uniqueness).
2. **The Brain** — Upload CV (PDF/Markdown) + Connect GitHub handle. This becomes the candidate's "Truth Layer" that the Skeptical Auditor references.
3. **The Look** — Select initial theme (Minimal Dark default). Optional: upload avatar, customise accent color.
4. **Deployment** — On completion, Sanity record created, middleware immediately routes `[username].heyherald.com` to tenant data.

### AI-Driven Onboarding (Like Summoner)

The onboarding uses Claude via Vercel AI SDK with tool handlers (same pattern as Summon's Summoner):

- `check_username` — Verify username availability
- `analyze_cv` — Extract skills, experience, projects from uploaded CV
- `analyze_github` — Fetch and analyze GitHub repos for engineering signals
- `generate_profile` — Create structured candidate profile from collected data
- `ask_confirm` — Show summary for final review before deployment

---

## 05. The Admin Dashboard

The admin dashboard lives at `heyherald.com/admin` (protected by Clerk auth). It follows the Summon Admin pattern.

### Features

| Feature | Description | Summon Equivalent |
|---------|-------------|-------------------|
| **Live Preview** | iframe showing `[username].heyherald.com` with real-time updates via postMessage | Portal Preview |
| **Theme Control** | Select/customise theme (Minimal Dark, Neo-Brutalism, Terminal) | Theme Management |
| **Content Management** | Edit profile, projects, experience. Override AI-generated content. | Content Editor |
| **Asset Management** | Upload avatar, project screenshots (Cloudflare R2) | Image Upload |
| **Analytics** | JD submissions, match grades, recruiter activity | N/A (new) |

### Live Preview Protocol (PostMessage — same as Summon)

```typescript
// Admin sends → Envoy iframe receives and applies
{ type: 'PREVIEW_THEME', theme: ThemeConfig, colorScheme: 'dark' | 'light' }
{ type: 'PREVIEW_PROFILE', profile: CandidateProfile }
{ type: 'PREVIEW_REPORT', report: MatchReport }
```

---

## 06. Candidate Profile (Hardcoded for v1)

This is the complete profile object. Store in `apps/herald/src/lib/profile.ts`.

In v2, this data lives in Sanity CMS, populated during onboarding.

```typescript
export const DANI_PROFILE = {
  name: "Dani Estevez Martin",
  title: "Senior Frontend Architect",
  location: "Koh Phangan, Thailand (Remote)",
  availability: "Available immediately",
  github: "daniboomerang",
  summary: "Senior Frontend Architect with 15+ years experience. Deep specialisation in React/Next.js architecture, Web3/blockchain integration, and AI/LLM-powered interfaces. Currently building Herald — an AI-powered portfolio agent — as a live demonstration of full-stack AI integration capability.",
  stack: [
    "React", "Next.js", "TypeScript", "Vercel AI SDK",
    "TanStack Query", "Radix UI", "Framer Motion",
    "Tailwind CSS", "shadcn/ui",
    "Turborepo", "Bun", "Biome",
    "Storybook", "OpenAPI codegen",
    "Web3", "ethers.js", "wagmi",
    "MCP (Model Context Protocol)",
    "Claude API", "OpenAI API", "Streaming LLMs",
    "Sanity CMS", "Postgres", "Drizzle ORM"
  ],
  projects: [
    {
      title: "AI Landing Page Generator",
      description: "Parallel section generation pipeline using Claude models. Optimised for speed with streaming, prompt efficiency, and concurrent section processing. Built Designer + Composer service architecture.",
      stack: ["Claude API", "Next.js", "TypeScript", "Vercel AI SDK"],
      signals: ["streaming", "parallel processing", "prompt engineering", "service architecture"]
    },
    {
      title: "Multi-Tenant UI Portal (Game7)",
      description: "Swappable component libraries resolved at build time via Turborepo aliases. Sanity CMS integration for tenant content. OKLCH color science for AI-powered theme generation. Multi-chain Web3 integration.",
      stack: ["React", "Next.js", "TypeScript", "Turborepo", "Sanity", "Web3"],
      signals: ["monorepo", "multi-tenant", "build-time optimisation", "CMS integration", "blockchain"]
    },
    {
      title: "Herald (This Product)",
      description: "AI-powered portfolio agent with MCP server architecture. Forensic match reporting, streaming LLM responses, runtime theme switching, Turborepo monorepo.",
      stack: ["Next.js 15", "MCP", "Claude API", "Turborepo", "Sanity", "Neon"],
      signals: ["MCP", "agent architecture", "monorepo", "AI integration"]
    }
  ],
  experience: [
    {
      company: "Game7",
      role: "Senior Frontend Architect",
      period: "2022 — 2026",
      highlights: [
        "Architected multi-tenant portal system serving multiple Web3 gaming communities",
        "Built Summoner onboarding system with automated tenant deployment pipeline",
        "Implemented swappable component library system via Turborepo build-time aliases",
        "Led Web3 multi-chain integration (Ethereum, Polygon, Arbitrum)",
        "Introduced AI-powered theme generation with OKLCH color science"
      ]
    }
  ],
  github_handle: "daniboomerang"
}
```

---

## 07. The Forensic API Contract

**Endpoint:** `POST /api/match`

**Input:**
```typescript
interface MatchRequest {
  job_description: string
  candidate_profile: {
    summary: string
    skills: string[]
    projects: Array<{ title: string; description: string }>
    github_signal: { patterns: string[] }
  }
}
```

**Output Schema (Forensic Artifact):**
```typescript
interface MatchReport {
  grade: "A" | "A-" | "B+" | "B"
  recommendation: "Strong Fit" | "Good Fit" | "Borderline"
  confidence_reasoning: string[]  // Bullet points explaining grade logic
  engineering_signal: Array<{
    title: string           // e.g. "Architectural Boundaries"
    observation: string     // What forensic patterns were found
    interpretation: string  // What this proves about seniority
    confidence: "High" | "Medium" | "Low"
  }>
  gaps: Array<{
    gap: string             // Specific missing skill
    mitigation: string      // Contextual reason candidate remains strong fit
  }>
  interview_hooks: string[] // 2-3 hyper-specific technical questions based on detected patterns
}
```

**Operational Rules:**
- Latency target: <6 seconds
- Hard timeout: 10 seconds → return partial report, never spinner of death
- Caching: `hash(JD + profile)` → 24h cache to minimise API cost
- Error state: graceful degradation, never blank screen

---

## 08. The Skeptical Auditor System Prompt

Use this prompt **verbatim** for the `/api/match` LLM call. Do not modify without explicit instruction.

```
You are a forensic technical auditor producing a hiring decision artifact for a senior engineering role.

LINGUISTIC RULES:
- Every claim must reference a specific, detectable signal: a technology, architectural pattern, code structure, or engineering decision
- Zero marketing language. Never use: passionate, innovative, results-driven, team player, self-starter, rockstar, ninja, guru, dynamic, proactive
- If a claim cannot be supported by evidence from the profile or GitHub signals, do not make it
- Gaps are honest and specific, always paired with a concrete mitigation that references real experience
- Interview hooks must be hyper-specific — a generic question fails the spec. Bad: "Tell me about your React experience." Good: "Your Turborepo setup uses build-time alias resolution for component libraries — walk me through why you chose that over runtime switching and what the tradeoffs were."
- Tone: a senior engineer writing an internal memo to a hiring committee, not a recruiter writing a job post

GRADING LOGIC:
- A: Meets or exceeds all core requirements with evidence. Gaps are minor or mitigated.
- A-: Strong match, one meaningful gap with credible mitigation.
- B+: Good match, 2 gaps, at least one without strong mitigation.
- B: Partial match, worth interviewing for modified scope or future role.

OUTPUT: Return valid JSON matching the schema exactly. No prose, no markdown, no explanation outside the JSON object.
```

---

## 09. GitHub Signal Detection

**GitHub Handle:** `daniboomerang`
**API:** GitHub public API — no auth required for public repos (optional token for higher rate limits)

**Signals to detect and map to `engineering_signal`:**

```typescript
const GITHUB_SIGNALS = [
  {
    pattern: "turbo.json exists in any repo",
    title: "Monorepo Architecture",
    interpretation: "Indicates experience managing complex multi-package workspaces and build orchestration at scale"
  },
  {
    pattern: "zod imports in source files",
    title: "Schema Validation Discipline",
    interpretation: "Defensive programming pattern — validates data at boundaries, indicates production-grade thinking"
  },
  {
    pattern: "radix-ui or @radix-ui imports",
    title: "Headless UI Architecture",
    interpretation: "Separation of behaviour from presentation — senior frontend pattern, enables design system flexibility"
  },
  {
    pattern: "wagmi or ethers imports",
    title: "Web3 Integration",
    interpretation: "Direct experience with blockchain wallet connectivity and on-chain data"
  },
  {
    pattern: "commits within last 90 days",
    title: "Active Engineering",
    interpretation: "Demonstrates current hands-on coding practice, not just architectural oversight"
  },
  {
    pattern: "@anthropic-ai/sdk or openai imports",
    title: "AI/LLM Integration",
    interpretation: "Direct API integration experience with production LLM systems"
  },
  {
    pattern: "drizzle-orm imports",
    title: "Modern ORM Patterns",
    interpretation: "Type-safe database access with schema-as-code — indicates preference for correctness over convenience"
  }
]
```

**Implementation:** Fetch `https://api.github.com/users/daniboomerang/repos`, scan top 10 repos by recent activity, detect patterns, populate `engineering_signal` array.

---

## 10. UI/UX Requirements

### Design Language — Minimal Dark Editorial

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0D0B08` | Page background (near-black warm) |
| Primary text | `#E8D5B7` | Body text (warm cream) |
| Accent | `#C8A84B` | Grade badges, CTAs, links (gold) |
| Secondary text | `#7A6A50` | Labels, metadata |
| Card background | `#1A1610` | Report cards, input areas |
| Border | `#2A2318` | Subtle dividers |
| Error | `#C85A4B` | Rate limit messages, errors |

| Font | Family | Usage |
|------|--------|-------|
| Display | Playfair Display | Headings, grade display (serif, italic for emphasis) |
| Body / Mono | DM Mono | Code-like content, signal titles, technical data |
| UI | DM Sans | Labels, buttons, navigation |

### Component Specifications

**`JDInput`** — Default/first state for recruiter landing
- Large textarea, prominent, full-width
- Placeholder: "Paste the job description here. I'll show you exactly how I fit — and why."
- CTA button: "Generate Audit" (gold accent, full-width below textarea)
- Subtle candidate preview above — name, title, one-line summary — so recruiter knows whose page they're on

**`LoadingState`** — 3-step deterministic progress
- Step 1: "Forensic Analysis of Job Requirements..."
- Step 2: "Cross-referencing Architecture & Signals..."
- Step 3: "Generating Decision Artifact..."
- Each step completes visually before next begins (fake deterministic timing, not spinner)
- Total perceived time: 4-6 seconds regardless of actual LLM latency

**`ReportView`** — The forensic artifact
- **Decision Anchor (top, prominent):** Grade (A/A-/B+/B) + Recommendation label + one-line verdict
- **Confidence Reasoning:** Bulleted evidence list — why this grade
- **Engineering Signals:** Card grid — title, observation, interpretation, confidence badge
- **Gaps:** Honest gap + mitigation pairs — never hidden, presented matter-of-factly
- **Interview Hooks:** 2-3 specific questions, styled as a callout box
- **Actions (sticky bottom bar):** "Copy Link" + "Download PDF" — forwardability is the priority

**Layout:** Single column, generous whitespace, editorial feel. Information density increases as you scroll — anchor → reasoning → signals → gaps → hooks.

---

## 11. Routing & Subdomain

### Envoy Routes (Public)
- Dynamic route: `/[username]` — default username is `dani`
- `heyherald.com/dani` works from day one (path-based)
- `dani.heyherald.com` works when Cloudflare wildcard DNS is configured
- Next.js middleware reads `Host` header → extracts subdomain → maps to username
- Both routes render the same page, same component tree

### Portal Routes (Platform)
- `heyherald.com` — Marketing / landing page
- `heyherald.com/onboarding` — Multi-step onboarding (protected by Clerk)
- `heyherald.com/admin` — Admin dashboard (protected by Clerk)
- `heyherald.com/admin/preview` — Live preview of deployed Envoy
- `heyherald.com/admin/theme` — Theme selection & customisation
- `heyherald.com/admin/content` — Profile content management
- `heyherald.com/admin/analytics` — Match report analytics

---

## 12. Rate Limiting

**Required in v1 — do not skip.**

- Tool: Upstash Redis + `@upstash/ratelimit`
- Limit: 5 match report generations per IP per hour
- Apply in Next.js middleware before hitting `/api/match`
- Graceful error: "You've run several audits recently. Try again in an hour." — not a 429 JSON error

---

## 13. Build Order (Strict — Follow This Sequence)

### Step 1 — Static Shell (Envoy Template)
Scaffold `apps/herald`. Build `ReportView` with hardcoded Dani profile data and hardcoded sample report JSON. No LLM calls. Focus entirely on typography, spacing, the Decision Anchor hierarchy, and forwardability.

**Deliverable:** A URL at `/dani` that looks like a finished premium forensic audit product with hardcoded data. This becomes the Envoy template that every `[username].heyherald.com` will render.

### Step 2 — GitHub Signal Detection
Implement `/api/mcp/github-signals` — fetch `daniboomerang`'s public repos, detect patterns from the signal list in Section 09, return structured `engineering_signal` array. Wire this into the ReportView.

**Deliverable:** Real GitHub signals populating the report.

### Step 3 — Match Engine
Implement `POST /api/match` with the Skeptical Auditor system prompt from Section 08. Wire `JDInput` → `LoadingState` → `ResultView`. Add hash-based caching. Add 10s timeout with partial report fallback.

**Deliverable:** Full working audit flow — paste JD, get forensic report.

### Step 4 — Rate Limiting & Polish
Add Upstash rate limiting. Add "Copy Link" functionality. Add PDF generation. Final polish pass on typography and spacing.

**Deliverable:** Production-ready Envoy for Dani.

### Step 5 — Subdomain Routing & Sanity Integration
Set up Sanity CMS schemas for tenant data (profiles, themes, configs). Implement Next.js middleware for subdomain routing. Connect Envoy to pull data from Sanity instead of hardcoded profile.

**Deliverable:** `dani.heyherald.com` served from Sanity data.

### Step 6 — Onboarding Flow
Build the onboarding wizard at `heyherald.com/onboarding` with Clerk auth. AI-driven chat (like Summoner) that collects username, CV, GitHub, theme preference. On completion, creates Sanity records and deploys Envoy at `[username].heyherald.com`.

**Deliverable:** New engineers can sign up and get a deployed Envoy.

### Step 7 — Admin Dashboard
Build `heyherald.com/admin` with Clerk-protected routes. Live preview (iframe + postMessage), theme control, content management, asset upload (Cloudflare R2), analytics.

**Deliverable:** Full Summon-style admin experience for managing deployed Envoy.

---

## 14. Environment Variables (Required)

```env
# AI
ANTHROPIC_API_KEY=           # Claude API key for match reports

# CMS
SANITY_PROJECT_ID=           # Sanity project ID
SANITY_DATASET=              # Sanity dataset (production/development)
SANITY_API_TOKEN=            # Sanity write token
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=

# Database (relational data — users, match history, analytics)
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

---

## 15. Launch Prompt for Claude Code

Paste this as the first message when opening Claude Code in this repo:

```
Read CLAUDE.md and HERALD-BUILD-SPEC.md. This is Herald — a multi-tenant SaaS platform for engineers, following the Summon architecture pattern.

Start with Step 1 from the build spec: Static Shell (Envoy Template).

Build the ReportView component at apps/herald using the hardcoded Dani profile (Section 06) and a sample match report (Section 07 schema). No LLM calls yet.

Stack: Next.js 15, App Router, TypeScript, Tailwind v4, shadcn/ui. Theme tokens in Section 10.

The UI must look like a finished premium product before a single AI call is wired. Focus on typography, spacing, the Decision Anchor hierarchy (grade + recommendation at top), and editorial layout.

First deliverable: /dani renders a complete forensic audit report with hardcoded data.
```

---

*Herald Build Spec v2.0 — March 2026*
*Multi-tenant SaaS platform following the Summon architecture pattern*
*Synthesised from architecture sessions across Claude, Gemini, and ChatGPT*
