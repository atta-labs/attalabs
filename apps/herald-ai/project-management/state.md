# Herald — Current State

**Last updated:** June 2, 2026
**Purpose:** Per-product snapshot for Herald. Agents working in `apps/herald-ai/` read this before starting any task.

---

## What Herald is

Standalone forensic CV-to-JD match tool. Sibling AttaLabs product — NOT part of Atta-the-product. Separate Clerk app. English name.

A candidate creates an **Envoy**: a public profile page at `herald.attalabs.dev/[username]`. Any recruiter visits the Envoy, pastes a job description, and gets a forensic match report — gap analysis, honest signal-backed assessment, no marketing fluff.

---

## Phase plan

### Phase 1 — Candidate use case complete ✅ (June 1, 2026)
- Match engine reads from DB via `username` ✓
- GitHub signals fetched server-side ✓
- Upstash Redis failure degrades gracefully ✓
- Client timeout fixed (35s) ✓
- Live at `herald.attalabs.dev/dani` ✓

### Phase 2 — Self-service onboarding + admin redesign ✅ (June 1–2, 2026)
- Onboarding crash fixed (ToolPart null guards) ✓ PR #74
- TopBar shown during onboarding (exit to home) ✓
- CV paste-text mode in onboarding ✓
- Avatar upload (Vercel Blob, `herald-ai-blob`, FRA1) ✓
- CV upload (Vercel Blob) ✓
- Bio field (freeform presentation paragraph) ✓
- Two-column admin editor: profile left, live Envoy preview right ✓
- Theme picker integrated into admin editor ✓
- DB: `avatar_url`, `cv_url`, `bio` columns in `herald_profiles` ✓
- PR #75 merged

**Phase 2 done. Needs production verification** (avatar/CV upload flows not tested in prod).

### Phase 3 — Recruiter self-serve ← NEXT
Any authenticated user gets a Recruiter area: paste JD + upload N CVs → batch forensic audit → ranked report list.

- [ ] `recruiterAudits` table: `userId`, `jobDescription`, `cvTexts[]`, `reports[]`, `createdAt`
- [ ] `/admin/recruiter` UI: paste JD, upload N CVs (PDF), trigger batch
- [ ] Batch match engine: Skeptical Auditor × N, results stored, ranked by grade
- [ ] Report dashboard: list of audits, ranked candidates, download/share

**Phase 3 done when:** Upload 10 CVs against a JD, get 10 ranked forensic reports.

### Phase 4 — Recruiter as distinct product surface (future)
Separate onboarding, pricing tier, team invite. B2B. Do not spec until Phase 3 is validated.

---

## Current build state

**Production live:**
- `herald.attalabs.dev/dani` — Envoy page ✓
- `herald.attalabs.dev/admin` — Admin area (onboarding + editor) ✓
- Match engine: DB profile, server-side signals, graceful Redis degradation ✓
- Vercel Blob: `herald-ai-blob` store, FRA1, public access ✓
- All Vercel env vars confirmed present (June 1)

**Needs production verification:**
- Avatar upload → URL saved → renders on Envoy
- CV upload → URL saved → Download CV button on Envoy
- Bio save → reflects on Envoy
- Second user onboarding end-to-end

**Known issues:**
- Upstash Redis creds expired — rate limiting degraded (graceful fallback in place)
- Drizzle constraint naming mismatch: `herald_profiles_username_key` vs `herald_profiles_username_unique` — prompts on every `drizzle-kit push`
- `lib/profile.ts` `DANI_PROFILE` — retained as type reference, not in live path

---

## Stack

- Next.js App Router, React, Tailwind, shadcn/ui
- Neon Postgres + Drizzle ORM (local `heraldProfiles` schema)
- Clerk (separate Herald Clerk app)
- Upstash Redis (rate limiting — currently degraded)
- Claude Sonnet via Vercel AI SDK (Skeptical Auditor)
- Vercel Blob (`herald-ai-blob`, FRA1) for avatar + CV storage
- Sanity CMS for themes
- GitHub PAT for signal detection

---

## Key files

| File | Purpose |
|------|---------|
| `apps/herald-ai/web/src/app/[username]/page.tsx` | Envoy public page |
| `apps/herald-ai/web/src/app/admin/page.tsx` | Onboarding gate |
| `apps/herald-ai/web/src/app/admin/ui/page.tsx` | Admin editor (two-column) |
| `apps/herald-ai/web/src/app/api/match/route.ts` | Forensic audit endpoint |
| `apps/herald-ai/web/src/app/api/admin/upload/route.ts` | Vercel Blob upload |
| `apps/herald-ai/web/src/components/portal/AdminEditorPage.tsx` | Two-column profile editor |
| `apps/herald-ai/web/src/db/schema.ts` | Drizzle schema |
| `apps/herald-ai/web/src/lib/prompts.ts` | Skeptical Auditor prompt — do NOT modify |
| `apps/herald-ai/web/docs/BUILD-SPEC.md` | Full product spec |
