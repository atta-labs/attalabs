# Herald — Current State

**Last updated:** July 4, 2026
**Purpose:** Per-product snapshot for Herald. Agents working in `apps/herald-ai/` read this before starting any task.
**Current iteration:** `herald-hardening-v1` (July 2026) — closing out items left dangling after herald-agents-v2's close, including this file's own housekeeping.

---

## What Herald is

Standalone forensic CV-to-JD match tool. Sibling AttaLabs product — NOT part of Atta-the-product. Separate Clerk app (closing-blowfish-4). English name.

A candidate creates an **Envoy**: a public profile page at `herald.attalabs.dev/[username]`. Any recruiter visits the Envoy, pastes a job description, and gets a forensic match report — gap analysis, honest signal-backed assessment, no marketing fluff. The same operation scales to **Bulk Audit**: N CVs × M JDs → one forensic report per pair.

---

## Pending manual operations

- **Provision fresh Upstash Redis creds** — per-key rate limiting degrades gracefully but is inactive. Provision at upstash.com, update `.env.local` + Vercel env vars for `herald.attalabs.dev`.
- **`MASTER_ENCRYPTION_KEY`** must be present in Herald's Vercel env for BYOK decrypt path to work.

---

## Phase plan

### Phase 1 — Candidate use case complete ✅ (June 1, 2026)
- Match engine reads from DB via `username` ✓
- GitHub signals fetched server-side ✓
- Upstash Redis failure degrades gracefully ✓
- Client timeout fixed (35s) ✓
- Live at `herald.attalabs.dev/dani` ✓

### Phase 2 — Self-service onboarding + admin redesign ✅ (June 1–2, 2026)
- Onboarding crash fixed (ToolPart null guards) ✓
- TopBar shown during onboarding ✓
- CV paste-text mode in onboarding ✓
- Avatar upload (Vercel Blob, `herald-ai-blob`, FRA1) ✓
- CV upload (Vercel Blob) ✓
- Bio field (freeform presentation paragraph) ✓
- Two-column admin editor: profile left, live Envoy preview right ✓
- Theme picker integrated ✓
- DB: `avatar_url`, `cv_url`, `bio` columns in `herald_profiles` ✓

### Phase 3 — Engine migration + Bulk Audit + multi-vendor BYOK ✅ (June 13–16, 2026 — herald-onto-engine iteration + PR #132)

Herald's AI call migrated onto `@atta/engine` + `@atta/adapter-langgraph` as a YAML-declared flow. Endpoints unified. Multi-vendor BYOK + per-audit model selection added. Bulk Audit expanded to full N×M matrix with polymorphic inputs. Auditor upgraded to a tool-using YAML agent that gathers its own GitHub evidence. Auditor quality fixed post-iteration (PR #132).

**Key decisions:** D-044 (engine migration), D-045 (endpoint unification), D-047 (custom client-side tool execution in shared engine).

### Phase 4 — Agent migration + UX overhaul ✅ (herald-agents-v2 iteration, complete — closed 2026-06-30)

Herald's auditor migrated into `packages/agents/forensic-hiring-auditor/` (D-046/D-051, task 2 — PR #150). MCP surface exposed at `/api/mcp` as `herald__audit` (task 3 — PR #156). Bulk Audit result surface overhauled (task 4 — PR #191): matrix now has row/column headers, compact result cards (grade + confidence badge + hard-req ratio + signal count + recommendation excerpt), and inline expandable full report via Collapsible. Report quality improved (task 5 — PR #193): evidence-tiered prompt (High/Medium/Low signal classification, recency weighting, quantitative grade thresholds, interview hook rules) with fixture-based before/after regression tests. Owner appearance editor and Settings hub relocated from `(app)/{ui,settings}` to `/[username]/(owner)/{ui,settings}` via sibling route-group split (D-061, task 8 — PR #213); D-035 (Lock: YES) preserved by construction. Topbar gained right-cluster icon+label buttons (Settings on `HeraldTopBar`, Theme on `envoy-shell`) and a mobile collapse (logo · color-scheme · hamburger).

Task 6 (per-owner per-day rate limit, #172) — verified already-implemented during task 7's deploy verification; closed by Principal, no PR (AEG no-PR-backing close rule). Task 7 (deploy verification, #173 — PR #235) confirmed Phase 2 flows and Bulk Audit code paths in production; surfaced open bug #234 (prod `ANTHROPIC_API_KEY` likely expired, causing partial-fallback audits — tracked separately, see `herald-hardening-v1` task 2) and a Drizzle unique-constraint naming fix.

All 8 herald-agents-v2 tasks merged or closed as of 2026-06-30; iteration archived to `aeg-root/iterations/completed/herald-agents-v2.md` (close-out: `aeg-project/changelog/2026-06-30-herald-agents-v2-close.md`). Current iteration is `herald-hardening-v1` (see header) — closing #234 and this file's own bookkeeping.

### Phase 5 — Recruiter as distinct product surface (future)
Separate onboarding, pricing tier, team invite. B2B. Do not spec until Phase 4 validated.

---

## Current build state

**Production live:**
- `herald.attalabs.dev/[username]` — Envoy page ✓
- `herald.attalabs.dev/admin` — Admin area (onboarding + editor) ✓
- `POST /api/audit` — unified forensic audit endpoint (single + bulk, dispatched by payload shape) ✓
- `/api/mcp` — Herald MCP server ✓
- Multi-vendor BYOK: API Keys tab supports all 12 vendors ✓
- Per-audit model selection: `audit_model_vendor` + `audit_model_id` in `herald_profiles` ✓

**Needs production verification:**
- Admin end-to-end: `https://herald.attalabs.dev/admin` — avatar upload, CV upload, bio save, theme picker
- Bulk Audit N×M matrix in production — matrix layout + expandable cells (herald-agents-v2 task 4)

**Known issues:**
- Upstash Redis creds expired — per-key rate limit wired at `/api/audit` middleware but not enforced (graceful degradation). Provision fresh creds at upstash.com.
- `MASTER_ENCRYPTION_KEY` must be present in Herald's Vercel env for the BYOK decrypt path to work (audit calls with a stored provider key will fail without it).
- Drizzle constraint naming mismatch: `herald_profiles_username_key` vs `herald_profiles_username_unique` — prompts on every `drizzle-kit push`. Cosmetic.

---

## Stack

- Next.js App Router, React, Tailwind, shadcn/ui
- Neon Postgres + Drizzle ORM (local `heraldProfiles` schema)
- Clerk (separate Herald Clerk app — closing-blowfish-4)
- Upstash Redis (per-key rate limiting — currently degraded)
- `@atta/engine` + `@atta/adapter-langgraph` — auditor runs as a YAML flow via the shared engine substrate
- `@atta/crypto` BYOK: provider keys envelope-encrypted in `herald_provider_keys` (AES-256-GCM, AAD-bound to `clerkId`)
- Vercel Blob (`herald-ai-blob`, FRA1) for avatar + CV storage
- Sanity CMS for themes
- GitHub PAT for signal detection (exercised as a YAML-declared custom tool via `@atta/forensic-hiring-auditor`)

---

## Key files

| File | Purpose |
|------|---------|
| `apps/herald-ai/web/src/app/[username]/page.tsx` | Envoy public page |
| `apps/herald-ai/web/src/app/admin/page.tsx` | Onboarding gate |
| `apps/herald-ai/web/src/app/admin/ui/page.tsx` | Admin editor (two-column) |
| `apps/herald-ai/web/src/app/api/audit/route.ts` | Unified forensic audit endpoint (`handleSingle` + `handleBatch`, shared `runSingleMatch` cell) |
| `apps/herald-ai/web/src/app/api/admin/upload/route.ts` | Vercel Blob upload |
| `apps/herald-ai/web/src/lib/audit-key.ts` | `resolveAuditCredentials` — per-user BYOK resolution + model selection |
| `apps/herald-ai/web/src/lib/prompts.ts` | `MATCH_REPORT_SCHEMA` — parser contract, `{{schema}}` template input (do not modify) |
| `apps/herald-ai/web/src/components/portal/AdminEditorPage.tsx` | Two-column profile editor |
| `apps/herald-ai/web/src/db/schema.ts` | Drizzle schema |
| `apps/herald-ai/web/docs/BUILD-SPEC.md` | Full product spec |
| `apps/herald-ai/web/src/components/audit/BulkAudit.tsx` | Bulk Audit matrix + AuditCell (compact result card + inline expandable report) |
| `packages/agents/forensic-hiring-auditor/` | Self-contained agent package: YAML, signals, parser, `run()` export (D-046/D-051) |
