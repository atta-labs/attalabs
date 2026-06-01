# Herald — Current State

**Last updated:** June 1, 2026
**Purpose:** Per-product snapshot for Herald. Agents working in `apps/herald-ai/` read this before starting any task. Root `project-management/state.md` has a one-liner delegation pointer.

---

## What Herald is

Standalone forensic CV-to-JD match tool. Sibling AttaLabs product — NOT part of Atta-the-product. Separate Clerk app. English name.

A candidate (job seeker) creates an **Envoy**: a public profile page at `heyherald.com/[username]`. Any recruiter can visit the Envoy, paste a job description, and get a forensic match report — gap analysis, honest signal-backed assessment, no marketing fluff.

---

## Phase plan

### Phase 1 — Candidate use case complete ✅ DONE (June 1, 2026)
Goal: one URL you'd send to a recruiter. Envoy at `heyherald.com/dani` works end-to-end.

- [x] **1a. Audit** — full flow audited; 3 bugs found and fixed
- [x] **1b. Match engine** — `POST /api/match` now reads profile from DB via `username` param; signals fetched server-side from `githubHandle`; `_test_profile_override` removed from live path
- [x] **1c. Envoy UI** — `ReportView` renders correctly with real data; rate limiting degrades gracefully on Redis failure; share link works
- [x] **1d. Deploy** — PR #70 merged; deploy triggered to `herald.attalabs.dev` *(confirm 200 manually)*

**Bugs fixed in Phase 1 (PR #70):**
- Upstash Redis creds expired → `proxy.ts` now wraps `ratelimit.limit()` in try/catch, degrades gracefully (Option A)
- Match route used `_test_profile_override` (client-side profile) instead of DB → route now accepts `username`, fetches via `getUserByUsername`
- GitHub signals always empty → signals now fetched server-side from DB profile's `githubHandle`

### Phase 2 — Self-service candidate onboarding ← NEXT
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

**Phase 1 complete — all core flows working:**
- `[username]/page.tsx` reads from DB, loads Sanity theme, renders `EnvoyFlow` ✓
- `POST /api/match` reads profile from DB via `username`, fetches GitHub signals server-side ✓
- `admin/page.tsx` auth gate → `AIOnboarding` → `/admin/ui` ✓
- `ThemeBrowser` with Sanity themes, library, font, color scheme ✓
- Rate limiting: degrades gracefully on Redis failure; real rate limiting needs fresh Upstash creds ⚠️
- Deploy: PR #70 merged, deploy triggered — confirm `https://herald.attalabs.dev/dani` returns 200 ⚠️

**Unknown / needs manual verification:**
- Whether `https://herald.attalabs.dev/dani` is live (deploy not confirmed post-merge)
- Whether Upstash Redis creds in Vercel env vars are also expired (not just `.env.local`)

---

## Stack

- Next.js App Router, React, Tailwind, shadcn/ui
- Neon Postgres + Drizzle ORM (local `heraldProfiles` schema — NOT in `@atta/db`)
- Clerk (separate Herald Clerk app — NOT the AttaLabs ecosystem Clerk app)
- Upstash Redis (rate limiting — currently degraded, needs fresh creds)
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
| `apps/herald-ai/web/src/app/api/match/route.ts` | Forensic audit endpoint — reads profile from DB via `username` |
| `apps/herald-ai/web/src/db/schema.ts` | Drizzle schema |
| `apps/herald-ai/web/src/lib/prompts.ts` | Skeptical Auditor system prompt — do NOT modify without explicit instruction |
| `apps/herald-ai/web/docs/BUILD-SPEC.md` | Full product spec |

---

## Known issues / tech debt

- Upstash Redis creds expired in `.env.local` — real rate limiting inactive; graceful degradation in place
- Logo direction not locked: herald trumpet/horn combining instrument with AI signal arcs
- `lib/profile.ts` retains `DANI_PROFILE` as a type reference — no longer used in live path, can be deleted in Phase 2 cleanup
- Herald auth is a separate Clerk app — out of scope for AttaLabs ecosystem auth migration
