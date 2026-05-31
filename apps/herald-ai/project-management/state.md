# Herald — Current State

**Last updated:** May 31, 2026
**Purpose:** Per-product snapshot for Herald. Agents working in `apps/herald-ai/` read this before starting any task. Root `project-management/state.md` has a one-liner delegation pointer.

---

## What Herald is

Standalone forensic CV-to-JD match tool. Sibling AttaLabs product — NOT part of Atta-the-product. Separate Clerk app. English name.

A candidate (job seeker) creates an **Envoy**: a public profile page at `heyherald.com/[username]`. Any recruiter can visit the Envoy, paste a job description, and get a forensic match report — gap analysis, honest signal-backed assessment, no marketing fluff.

---

## Phase plan

### Phase 1 — Candidate use case complete ← CURRENT
Goal: one URL you'd send to a recruiter. Dani's Envoy at `heyherald.com/dani` works end-to-end.

- [ ] **1a. Audit** — run locally, walk full flow: sign-up → onboarding → Envoy renders → paste JD → match report
- [ ] **1b. Match engine** — `POST /api/match` works live with real DB profile, Skeptical Auditor prompt, caching, timeout fallback
- [ ] **1c. Envoy UI** — `ReportView` renders correctly with real data, rate limiting on, share link works
- [ ] **1d. Deploy** — `herald.attalabs.dev` live, Dani's profile deployed, shareable

**Phase 1 done when:** Dani sends the URL to a real job application and it works.

### Phase 2 — Self-service candidate onboarding
Any second person can sign up and get their own Envoy without Dani's intervention.

- [ ] `AIOnboarding` hardened end-to-end: username claim → CV upload → GitHub → theme → live at `[username]`
- [ ] Admin dashboard complete: profile editing, theme switching, live preview
- [ ] Public landing page: `heyherald.com` explains product, sign-up CTA

**Phase 2 done when:** A second person can sign up and get their own Envoy.

### Phase 3 — Recruiter self-serve (light)
Any authenticated user gets a Recruiter area: paste JD + upload N CVs → batch forensic audit → ranked report list. No separate product — additional `/admin/recruiter` area.

- [ ] `recruiterAudits` table: `userId`, `jobDescription`, `cvTexts[]`, `reports[]`, `createdAt`
- [ ] `/admin/recruiter` UI: paste JD, upload N CVs (PDF), trigger batch
- [ ] Batch match engine: Skeptical Auditor × N, results stored, ranked by grade
- [ ] Report dashboard: list of audits, ranked candidates, download/share

**Phase 3 done when:** Upload 10 CVs against a JD, get 10 ranked forensic reports.

### Phase 4 — Recruiter as distinct product surface (future)
Separate onboarding path, pricing tier, dashboard. Recruiter doesn't need a personal Envoy. Team invite. B2B product. Do not spec until Phase 3 is validated.

---

## Current build state

**Routing and data layer — largely in place:**
- `[username]/page.tsx` reads from DB (not hardcoded), loads Sanity theme, renders `EnvoyFlow` ✓
- `admin/page.tsx` auth gate → `AIOnboarding` → `/admin/ui` ✓
- `ThemeBrowser` with Sanity themes, library, font, color scheme ✓
- Settings page exists ✓
- Multi-user DB schema: `heraldProfiles` table, FK to `users` ✓
- API routes scaffolded: `/api/match`, `/api/mcp/signals`, `/api/admin/*` ✓

**Unknown — needs Phase 1a audit:**
- Whether full flow works end-to-end in dev
- Whether `POST /api/match` uses real DB profile or falls back to hardcoded `DANI_PROFILE` in `lib/profile.ts`
- Whether Upstash rate limiting is wired in middleware
- Deploy state: nothing confirmed live at `herald.attalabs.dev`

---

## Stack

- Next.js App Router, React, Tailwind, shadcn/ui
- Neon Postgres + Drizzle ORM (local `heraldProfiles` schema — NOT in `@atta/db`)
- Clerk (separate Herald Clerk app — NOT the AttaLabs ecosystem Clerk app)
- Upstash Redis (rate limiting)
- Claude Sonnet via Vercel AI SDK (Skeptical Auditor persona)
- Sanity CMS (`@atta/cms`) for themes
- GitHub PAT for signal detection

---

## Key files

| File | Purpose |
|------|---------|
| `apps/herald-ai/web/src/app/[username]/page.tsx` | Envoy public page |
| `apps/herald-ai/web/src/app/admin/page.tsx` | Onboarding gate |
| `apps/herald-ai/web/src/app/admin/ui/page.tsx` | Theme dashboard |
| `apps/herald-ai/web/src/app/api/match/route.ts` | Forensic audit endpoint |
| `apps/herald-ai/web/src/db/schema.ts` | Drizzle schema |
| `apps/herald-ai/web/src/lib/prompts.ts` | Skeptical Auditor system prompt — do NOT modify without explicit instruction |
| `apps/herald-ai/web/docs/BUILD-SPEC.md` | Full product spec |

---

## Known issues / tech debt

- `lib/profile.ts` has hardcoded `DANI_PROFILE` — legacy fallback; match engine may still be hitting this instead of DB
- Logo direction not locked: herald trumpet/horn combining instrument with AI signal arcs
- No confirmed deploy at `herald.attalabs.dev`
- Herald auth is a separate Clerk app — out of scope for the AttaLabs ecosystem auth migration
