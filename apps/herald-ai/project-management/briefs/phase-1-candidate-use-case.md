# Brief: Herald Phase 1 — Candidate Use Case Complete

**For:** Sonnet (Claude Code, interactive session)
**Reason:** Multi-file audit + fix across a Next.js app; well-defined goal but requires runtime judgment during the audit phase
**Owner:** Dani
**Goal:** Herald Phase 1 complete — `POST /api/match` uses real DB profile, Envoy renders correctly, rate limiting wired, deployed to `herald.attalabs.dev` and shareable

**Tier:** 1
**Spike:** no
**principal_delegate:** Developer may decide minor UI polish details (spacing, loading states) without escalating. All structural or schema changes escalate.

---

## Context

Herald is a standalone forensic CV-to-JD match tool at `apps/herald-ai/`. It is NOT part of Atta-the-product — separate Clerk app, separate DB schema, separate deploy.

The product flow: a candidate (Dani) creates an Envoy at `heyherald.com/dani`. A recruiter visits that page, pastes a job description, and gets a forensic match report — gap analysis, honest signal-backed assessment, no marketing fluff. The AI persona is the "Skeptical Auditor."

The routing and data layer is largely built. What's unknown is whether the full flow works end-to-end. Phase 1 is: audit what's broken, fix it, deploy. It ends when Dani can send a real URL to a job application.

**What's built (routing/data layer confirmed in code):**
- `apps/herald-ai/web/src/app/[username]/page.tsx` — reads from DB, loads Sanity theme, renders `EnvoyFlow`
- `apps/herald-ai/web/src/app/admin/page.tsx` — auth gate → `AIOnboarding` → `/admin/ui`
- `apps/herald-ai/web/src/app/admin/ui/page.tsx` — `ThemeBrowser` with Sanity themes
- `apps/herald-ai/web/src/app/api/match/route.ts` — forensic audit endpoint (status unknown)
- `apps/herald-ai/web/src/db/schema.ts` — `heraldProfiles` table, FK to `users`
- All admin API routes scaffolded

**Known risks:**
- `apps/herald-ai/web/src/lib/profile.ts` contains hardcoded `DANI_PROFILE` — match engine may be hitting this fallback instead of DB
- Upstash rate limiting may not be wired in middleware
- Nothing confirmed deployed at `herald.attalabs.dev`

**Product context:** `apps/herald-ai/project-management/state.md`
**Full spec:** `apps/herald-ai/web/docs/BUILD-SPEC.md`
**Architecture:** `apps/herald-ai/web/docs/ARCHITECTURE.md`

**Critical rule — Skeptical Auditor prompt:**
The system prompt in `src/lib/prompts.ts` is verbatim from BUILD-SPEC.md Section 08. Do NOT modify it. Zero marketing language. Every claim references a detectable signal. Gaps are honest and paired with mitigation.

---

## Pre-flight checks

1. Working directory: `apps/herald-ai/web/` — confirm it exists and is the correct path
2. `bun install` passes from `apps/herald-ai/web/`
3. Env vars present: `ANTHROPIC_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `GITHUB_PAT`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — list any missing ones and STOP
4. DB reachable: run `bun run db:push` from `apps/herald-ai/web/` — confirm no errors
5. `bun run build` from `apps/herald-ai/web/` — note any build errors before touching anything
6. Read `apps/herald-ai/web/docs/BUILD-SPEC.md` fully before starting Part 1

If any pre-flight check fails, STOP and report what failed and what's needed to unblock.

---

## Part 1 — Audit

Walk the full flow locally and produce a written audit report before fixing anything.

**1.1** Start dev server (`bun run dev` from `apps/herald-ai/web/`). Confirm it starts without errors.

**1.2** Walk the candidate flow:
- Sign up / sign in (Clerk)
- Hit `/admin` — does `AIOnboarding` render?
- Complete onboarding (or skip if already done for the test account) — does it write to DB?
- Hit `/admin/ui` — does `ThemeBrowser` render with real Sanity themes?
- Hit `/[username]` — does the Envoy page render with DB data (not hardcoded)?

**1.3** Walk the recruiter flow on the Envoy:
- Navigate to `localhost:3000/[username]`
- Does `JDInput` render?
- Paste a sample JD
- Does `POST /api/match` fire?
- Does it use the DB profile (not `DANI_PROFILE` fallback)?
- Does `ReportView` render the result correctly?
- Does rate limiting trigger after 5 attempts?

**1.4** Check middleware (`apps/herald-ai/web/src/proxy.ts` or `middleware.ts`) — is Upstash rate limiting actually wired?

**1.5** Write a short audit summary: what works, what's broken, what's missing. This becomes the basis for Parts 2–4.

**STOP after Part 1 and report the audit summary.** Do not proceed to fixes without reporting findings.

---

## Part 2 — Fix match engine

Based on audit findings from Part 1.

**2.1** Confirm `POST /api/match` route (`src/app/api/match/route.ts`):
- Reads profile from DB via `getUserByUsername` (or equivalent), NOT from `DANI_PROFILE` in `lib/profile.ts`
- Fetches GitHub signals via `GET /api/mcp/signals`
- Merges profile + signals before calling Claude
- Uses `ANTHROPIC_API_KEY` via Vercel AI SDK (`@ai-sdk/anthropic`)
- Has 25s LLM timeout with partial report fallback
- Has 3s signal fetch timeout that degrades gracefully to empty signals
- Caches result: `hash(JD + profile)` → in-memory 24h
- Retries once on malformed JSON response

If `DANI_PROFILE` is being used as primary source anywhere in the live path (not just as a type reference), fix it to use DB. The hardcoded fallback in `lib/profile.ts` is legacy — DB is canonical.

**2.2** Confirm the Skeptical Auditor system prompt in `src/lib/prompts.ts` matches BUILD-SPEC.md Section 08 verbatim. If it drifted, restore it. Do NOT rewrite or improve it.

**2.3** Confirm `MatchReport` type in `src/lib/types.ts` matches what the API returns and what `ReportView` expects. Fix any type mismatches.

---

## Part 3 — Fix Envoy UI and rate limiting

**3.1** `ReportView` (`src/components/envoy/ReportView.tsx`):
- Renders all report sections correctly with real data
- No hardcoded sample data (`sample-report.ts` is legacy — should only be used for UI development, not in the live render path)
- Error state renders gracefully if API fails

**3.2** `EnvoyFlow` (`src/components/envoy/EnvoyFlow.tsx`):
- Input → loading → result transitions work correctly
- `LoadingState` shows the 3-step deterministic progress (not a spinner)
- "Copy link" or share functionality works (copies `window.location.href` or equivalent)

**3.3** Rate limiting:
- Confirm Upstash Redis middleware is wired in `src/proxy.ts` (or `middleware.ts`)
- 5 match reports per IP per hour
- Applied in middleware, NOT in the route handler
- Error message on limit: "You've run several audits recently. Try again in an hour."
- If not wired, wire it using the existing Upstash client

**3.4** TopBar (`src/components/shared/TopBar.tsx`):
- Auth-aware: shows sign-in for anonymous users on Envoy pages
- Shows dashboard link for authenticated users

---

## Part 4 — Deploy

**4.1** Confirm `bun run build` passes from `apps/herald-ai/web/` with all fixes applied.

**4.2** The Vercel project for Herald exists. Confirm env vars are set in Vercel dashboard (same list as pre-flight step 3). If any are missing, list them and STOP — do NOT attempt to set them programmatically.

**4.3** Confirm the Vercel deploy target is `herald.attalabs.dev`.

**4.4** Push to trigger deploy and confirm `https://herald.attalabs.dev/dani` returns a 200 with the Envoy page.

---

## Part 5 — Cleanup (Tier 0, bundle with this PR)

Two stray files were created in `project-management/` by error on May 31. Delete them:
- `project-management/_herald-state-patch.md`
- `project-management/_herald-state-pointer.md`

Also patch the Herald section in `project-management/state.md`. Find the line:
```
### Herald — *standalone AttaLabs product; not part of Atta*
```
And replace the entire Herald section header line with:
```
### Herald — *standalone AttaLabs product; Phase 1 in progress — see `apps/herald-ai/project-management/state.md`*
```
Then add these two lines immediately after the new header, before the existing body text:
```
**Full state:** `apps/herald-ai/project-management/state.md` — read that file for Herald detail.
**Current phase:** Phase 1 — candidate use case (Envoy end-to-end, match engine, deploy to `herald.attalabs.dev`).
```

---

## Verification

Before marking done:

- [ ] `bun run typecheck` passes from `apps/herald-ai/web/`
- [ ] `bun run lint` passes (or `biome check`)
- [ ] `bun run build` passes
- [ ] Full flow works in dev: sign-up → onboarding → Envoy renders with DB data → paste JD → real report renders
- [ ] `POST /api/match` uses DB profile, not `DANI_PROFILE`
- [ ] Rate limiting triggers after 5 requests from same IP
- [ ] Skeptical Auditor prompt in `prompts.ts` is unchanged from BUILD-SPEC.md Section 08
- [ ] `https://herald.attalabs.dev/dani` returns 200 after deploy
- [ ] Stray files deleted, root `state.md` Herald section patched
- [ ] `git diff main --stat` shows only files touched as part of this brief
- [ ] `apps/herald-ai/project-management/now.md` updated: Phase 1 tasks marked complete, next 3 things set to Phase 2 tasks

---

## Stop conditions

- Any pre-flight check fails → STOP and report
- Audit (Part 1) reveals a problem not covered by Parts 2–4 → STOP and report before fixing
- `POST /api/match` requires a DB migration beyond `db:push` → STOP
- Vercel env vars missing → STOP and list what's needed
- About to touch files outside `apps/herald-ai/` or `project-management/` → STOP
- About to modify `src/lib/prompts.ts` → STOP
- Build fails after fixes and cause isn't obvious → STOP and report

---

## Constraints

- Do NOT modify `src/lib/prompts.ts`
- Do NOT add new DB tables or schema changes beyond what's already in `heraldProfiles`
- Do NOT add Phase 2 or Phase 3 features
- Do NOT modify any `@atta/*` packages
- Do NOT touch `apps/vada-ai/`, `apps/cetana-ai/`, or any other app
- Do NOT use `--no-verify` or force push

---

## Deliverable

**PR title:** `feat(herald): Phase 1 — candidate use case complete`

**PR description must include:**
1. Audit summary (what was broken, what was already working)
2. What was fixed and why
3. Verification steps run and results
4. Any remaining manual steps for Dani (env vars, etc.)
5. Anything deferred to Phase 2

**After PR is opened:** report the PR URL and a one-paragraph summary of what needed fixing.
