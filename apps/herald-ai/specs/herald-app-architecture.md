# Herald — app architecture

**Status:** draft
**Scope:** Herald web app (`apps/herald-ai/web`) — routes, topbar, library resolution, settings, public profile, audit pipeline.
**Last updated:** 2026-06-14 (post `herald-onto-engine` task 2, PR for #89).

This spec records the architecture established by the `herald-profile-refactor` work (June 2026) plus the `herald-onto-engine` migration (tasks 1–2, June 13–14). It is the canonical reference for how the Herald app is structured. Decisions behind it: D-031 (standalone Clerk/DB), D-034 (one Bulk Audit operation), D-035 (library resolution), D-036 (flat routes + unified topbar), D-044 (auditor on `@atta/engine` via solo YAML), D-045 (endpoints unified into `/api/audit`).

---

## 1. Product shape

Herald is a forensic hiring-audit tool plus a public forensic profile. There is **one audit operation — Bulk Audit**: N CVs × M job descriptions → one evidence-based match report per pair. A recruiter runs many CVs against one role; a candidate runs their own CV against many roles. It is the same operation; the user chooses the inputs. The earlier Candidate/Recruiter *mode split* (D-032) is retired (D-034).

The audit cross-checks claimed skills against public GitHub activity (an agent inspects real shipped code — languages, recency), grades the match, and extracts interview questions from the candidate's actual work. No GitHub is noted, not auto-penalized; the rest is weighted accordingly.

The **public profile** (`/[username]`) is a permanent, shareable forensic profile (CV, experience, stack, GitHub) that recruiters can audit and candidates can share.

---

## 2. Routes

The signed-in app lives under an `(app)` route group (a route group adds **no** URL segment — it only shares a layout). The old `/candidate/*` tree is deleted.

```
app/(app)/layout.tsx        shared signed-in layout: auth guard + CandidateShell + HeraldTopBar
app/(app)/bulk-audit/       /bulk-audit   logged-in home, the audit tool
app/(app)/ui/               /ui           public-profile appearance editor
app/(app)/settings/         /settings     Profile / Experience / Connections / API Keys / Account
app/(app)/onboarding/       /onboarding   AIOnboarding gate
app/(marketing)/            marketing / landing
app/[username]/             public profile + EnvoyShell (its own layout)
```

- Logged-in home is `/bulk-audit`.
- Onboarding gate: signed-in but `!onboardingComplete` → `/onboarding`; complete → `/bulk-audit`.
- `/[username]` is the only surface outside the `(app)` group with a published profile; it has its own layout (`EnvoyLibraryShell` + `EnvoyShell`).
- There is no "Dashboard" concept. Nav is **Bulk Audit · UI · Settings · /username**.

---

## 3. Topbar

There is **one shared topbar** everywhere except the public profile's own shell.

- `HeraldTopBar` (`src/components/HeraldTopBar.tsx`) is a **server component** that calls `auth()`, looks up the user for `username` + `onboardingComplete`, and renders the shared `@atta/ui/topbar` `TopBar` with `isSignedIn={!!userId}` (SSR auth — no sign-in/out flash), `signedInLinks` = Bulk Audit / UI / Settings / `/username`, and `accountMenu={<HeraldAccountMenu/>}`.
- **No avatar in any topbar.** Identity lives in Settings → Account.
- `HeraldAccountMenu` is a themed Sign-out button (library `Button` via `useComponents()`, not Clerk `UserButton`). Responsive: text on desktop, icon-only on mobile.
- All topbar action buttons (theme toggle, sign-in/out, profile CV download/open) share one compact size (~h-8).

### Public profile topbar (`/[username]`)

The public profile uses a **two-bar** structure, identical on desktop and mobile:

1. **Row 1** is the shared `TopBar` — logo left, owner nav links centered (when `isOwner`), theme + auth right. Literally the same component as every other page.
2. **Row 2** is a sticky identity bar directly beneath: avatar (with pennant), name + title, CV download/open. Slides in as the hero scrolls away (`useHeroCollapse`).

The earlier bespoke desktop centered-identity column was deleted (it caused overlap). Identity and the topbar are never in the same row.

---

## 4. Library resolution — the critical invariant (D-035)

Herald has two library-resolution paths. Getting these crossed is the single most expensive bug this refactor produced, so the rule is explicit:

- **App chrome** — topbar, Settings, /ui editor, Bulk Audit, everything under `(app)` — MUST render the **build-time CMS library** (`@atta/ui/components`, aliased to `packages/ui/generated/herald/components.ts`, generated from `heraldConfig.userInterface.library.id`). This is the app's fixed design system. It is **not** user-configurable.
- **The user's saved library preference (`user.library`)** applies **only** to their public `/[username]` profile, resolved dynamically via `useComponents()` / `LibraryProvider` (`EnvoyLibraryShell`).

Concretely:
- `app/(app)/layout.tsx` feeds `CandidateShell` → `LibraryProvider` the **build-time** library id, sourced from `getHeraldConfig(cmsClient).userInterface.library.id` (the same value the generator reads). It deliberately ignores `user.library`.
- `app/[username]/layout.tsx` feeds `EnvoyLibraryShell` → `LibraryProvider` the **user's** `user.library`.
- App-chrome components that pick components must import from `@atta/ui/components` (build-time) — not via `useComponents()` against a user-library provider. (`useComponents()` is correct only inside the `(app)` tree if and only if that tree's provider is fed the build-time id, which it is.)

**Verification:** set `user.library` to something other than the build-time library (e.g. retro). The app chrome (topbar, settings, /ui) must stay on the build-time library; only `/[username]` renders the user's choice. The two are independent.

---

## 5. Settings

- Five tabs: Profile, Experience, Connections, API Keys, Account. (CV is folded into Experience; there is no separate CV tab.) Tabs are a single non-wrapping row that scrolls horizontally if a chunky library (brutal) exceeds the width.
- Publish/Unpublish lives in the page header beside the "Settings" title (single title source in `page.tsx`); labels "Publish profile" / "Unpublish profile"; keyless-confirm flow preserved.
- The Account tab renders `HeraldAccountTab` (Herald-local) — an identity summary plus a "Manage account" button that opens Clerk's `<UserProfile/>` in a full-screen modal, sidestepping the column-width cramping. `@atta/ui/account`'s `AttaUserProfile` is unchanged (Vāda still uses it embedded).

---

## 6. Identity & data (recap of D-031)

Herald is standalone: its own Clerk app (`closing-blowfish-4`), own Neon DB, own `user_provider_keys`. Shared at the code level only (`@atta/ui/account`, `@atta/crypto`, `@atta/db/queries`). No SSO across the Herald boundary. See `.claude/skills/auth/SKILL.md` → "Herald exception".

---

## 7. Billing (recap of D-033)

One provider key per Herald user. Profile audits (a recruiter auditing a published profile) run on the **profile owner's** key; Bulk Audit runs on the **logged-in user's** key. Same `getProviderKeys(db, clerkId)` path; only `clerkId` differs. Publishing does not require a key; the audit tool renders only when a key exists; the audit endpoint 503s without one.

---

## 8. Audit pipeline (D-044, D-045)

Both audit call paths run through one endpoint — `POST /api/audit` — backed by the shared `@atta/engine` + `@atta/adapter-langgraph` substrate. There is no `generateText()` call anywhere in Herald: the legacy `/api/match` and `/api/recruiter/batch` routes are retired.

The auditor agent (system prompt + model + classifier behaviour + message template) lives in `apps/herald-ai/web/yamls/herald-auditor.yaml` — a v2.0 solo flow with one agent (`SkepticalAuditor`, `claude-sonnet-4-20250514`, `classifier.mode: skip`). On the first request the route loads the YAML via `loadFlow(readFileSync(...))` (cached at module load) and compiles it with `compileFlow(flow, userPrompt, undefined, { schema: MATCH_REPORT_SCHEMA })`. The `{{schema}}` customVar is substituted into the agent's system prompt at compile time, so the model-instruction and `parseMatchReport`'s validation share one schema definition. The Plan is executed by `LangGraphAdapter.execute({ plan })` with `providerKeys: { anthropic: apiKey }`.

### One endpoint, two payload shapes (D-045)

`POST /api/audit` dispatches on payload shape:

- **Single shape** — `{ job_description, username? | _test_profile_override? }` → returns a `MatchReport`. The Envoy single-profile audit (`EnvoyFlow.tsx`). Auth is open; the audit runs on the **profile owner's** stored BYOK key (DB-resolved by `username`, D-033). Test and Dani-fallback paths use the server `ANTHROPIC_API_KEY`.
- **Batch shape** — `{ jd, candidates[] }` → returns `{ results: { username, report, error? }[] }`. The Bulk Audit (`BulkAudit.tsx`). Requires a Clerk session; runs on the **logged-in user's** stored BYOK key (D-033); 402 if missing. `Promise.all` fan-out across candidates (≤ 10).

Both shapes call the same `runSingleMatch(profile, jd, apiKey)` cell — the engine-backed unit of work. Everything around it is preserved verbatim from D-044:

- **2-attempt retry, 25s timeout** wrapping `adapter.execute(...)` via `Promise.race`. `Conclusion.terminalState === 'FAILED'` advances to the next retry attempt rather than throwing — the engine surfaces errors via the Conclusion shape, not exceptions.
- **`extractSignals` pre-fetch** (3s timeout, best-effort) still produces the GitHub signal evidence appended to `userPrompt`. Task 7 (#102) will retire this pre-fetch by giving the auditor agent a GitHub tool declared in the YAML.
- **24h in-memory cache** keyed on `sha256(jd + profile)`. Shared by both shapes — a batch entry that re-tests an already-cached profile+JD pair hits cache.
- **`parseMatchReport`** with its **code-enforced NO-FIT hard-requirement gate** is unchanged. The gate is deliberately Herald code, not a model gate — it must never become model-controlled.
- **`buildPartialReport` fallback** is unchanged: both attempts failing yields a `B+ / Good Fit / Low confidence` partial report so the UI never crashes (single shape). The batch shape returns `{ error: 'Audit failed' }` for that individual candidate inside the `results[]`, so the rest of the batch is unaffected.

Rate limit: `src/proxy.ts` applies the Upstash 5/h per-IP cap to `POST /api/audit` (was `/api/match` pre-D-045). Side effect: batch calls are now in scope of the cap, but one batch call counts as one hit even when it audits up to 10 candidates internally.

The engine and adapter packages are consumed unchanged: `git diff main --stat` against `packages/engine` and `packages/adapter-langgraph` is empty in this PR, which means no Vāda blast radius by construction.

`apps/herald-ai/web/next.config.ts` transpiles `@atta/engine` + `@atta/adapter-langgraph` and adds `outputFileTracingIncludes: { '/**': ['./yamls/**'] }` so the YAML is bundled into the serverless function (Vāda's pattern, scoped to Herald's local `yamls/` dir).

---

## 9. Known follow-ups (not built here)

- N×M matrix UI and polymorphic inputs (link / pasted text / .md / .pdf / stored profile). Plugs straight into the existing `/api/audit` cell — `runSingleMatch` is the per-pair primitive.
- Per-audit vendor + model picker on the Bulk Audit surface (`herald-onto-engine` task 3b, #90) — leverages the engine's vendor-agnostic Plan to let the user choose any model their stored keys support.
- Per-key rate limit / cap on profile audits (abuse surface: strangers spend the owner's key budget — D-033).
- `herald.attalabs.dev` deploy verification.
- Auditor signal-gathering as a YAML-declared tool (`herald-onto-engine` task 7, #102) — retires the `extractSignals` pre-fetch.
