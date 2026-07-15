# Herald — app architecture

**Status:** draft
**Scope:** Herald web app (`apps/herald-ai/web`) — routes, topbar, library resolution, settings, public profile, audit pipeline, MCP surface.
**Last updated:** 2026-06-25 (post `herald-agents-v2` task 8 — owner routes under `/[username]`, topbar icon buttons, PR for D-061; reconciled with D-060 central-CMS theme/library resolution).

This spec records the architecture established by the `herald-profile-refactor` work (June 2026) plus the `herald-onto-engine` migration (tasks 1–2, June 13–14), the `herald-agents-v2` MCP surface (task 3), and the `herald-agents-v2` owner-routes relocation (task 8, D-061). It is the canonical reference for how the Herald app is structured. Decisions behind it: D-031 (standalone Clerk/DB), D-034 (one Bulk Audit operation), D-035 (library resolution — Lock: YES), D-036 (flat routes + unified topbar), D-044 (auditor on `@atta/engine` via solo YAML), D-045 (endpoints unified into `/api/audit`), D-046 (agent package extraction), D-051 (MCP surface), D-060 (central-CMS theme/library resolution under attalabs), D-061 (owner `/ui` + `/settings` relocated under `/[username]` — supersedes the route + nav portion of D-036).

---

## 1. Product shape

Herald is a forensic hiring-audit tool plus a public forensic profile. There is **one audit operation — Bulk Audit**: N CVs × M job descriptions → one evidence-based match report per pair. A recruiter runs many CVs against one role; a candidate runs their own CV against many roles. It is the same operation; the user chooses the inputs. The earlier Candidate/Recruiter *mode split* (D-032) is retired (D-034).

The audit cross-checks claimed skills against public GitHub activity (an agent inspects real shipped code — languages, recency), grades the match, and extracts interview questions from the candidate's actual work. No GitHub is noted, not auto-penalized; the rest is weighted accordingly.

The **public profile** (`/[username]`) is a permanent, shareable forensic profile (CV, experience, stack, GitHub) that recruiters can audit and candidates can share.

---

## 2. Routes

The signed-in app lives under an `(app)` route group (a route group adds **no** URL segment — it only shares a layout). The old `/candidate/*` tree is deleted. The owner appearance editor and Settings hub were relocated from the `(app)` group to the public-profile segment under `/[username]/(owner)/` (D-061) — same identity space as the profile they edit, owner-gated, but rendered on the build-time library per D-035.

```
app/(app)/layout.tsx              shared signed-in layout: auth guard + CandidateShell + HeraldTopBar
app/(app)/bulk-audit/             /bulk-audit             logged-in home, the audit tool
app/(app)/onboarding/             /onboarding             AIOnboarding gate
app/(marketing)/                  marketing / landing
app/[username]/layout.tsx         metadata-only passthrough (icon route)
app/[username]/(profile)/         /[username]             public profile + EnvoyShell + EnvoyLibraryShell (user library)
app/[username]/(owner)/layout.tsx auth-gate + CandidateShell(build-time library) + HeraldTopBar
app/[username]/(owner)/ui/        /[username]/ui          public-profile appearance editor (owner-only)
app/[username]/(owner)/settings/  /[username]/settings    Profile / Experience / Connections / API Keys / Account (owner-only)
```

- Logged-in home is `/bulk-audit`.
- Onboarding gate: signed-in but `!onboardingComplete` → `/onboarding`; complete → `/bulk-audit`. The owner layout enforces the same gate before its ownership check so a half-onboarded user (still username-less) routes to `/onboarding` instead of 404.
- **Owner gate (D-061):** `/[username]/(owner)/*` resolves the signed-in user; redirects anonymous to `/sign-in`; calls `notFound()` if the signed-in user's `username` does not match the `[username]` URL segment. The public profile `/[username]` remains open and unaffected.
- Route groups (parentheses) add no URL segment: the public URL of `(profile)/page.tsx` is `/[username]`; the owner URLs are `/[username]/ui` and `/[username]/settings`. The `[username]/layout.tsx` is intentionally a no-op wrapper (returns `children` plus the icon metadata) — putting any `LibraryProvider` there would cross the D-035 paths.
- There is no "Dashboard" concept. Nav from the main `HeraldTopBar` is **Bulk Audit · /username** (UI + Settings are now right-cluster icon buttons, see §3).

---

## 3. Topbar

There is **one shared topbar** everywhere except the public profile's own shell, plus two icon-button slots (D-061):

- `HeraldTopBar` (`src/components/HeraldTopBar.tsx`) is a **server component** that calls `auth()`, looks up the user for `username` + `onboardingComplete`, takes an optional `context` prop (`'main' | 'owner'`), and renders the shared `@atta/ui/topbar` `TopBar` with:
  - `isSignedIn={!!userId}` (SSR auth — no sign-in/out flash),
  - `signedInLinks` = Bulk Audit + `/username` on `context='main'`; just `/username` on `context='owner'`,
  - `extraActions` = a Settings button (gear icon + responsive "Settings" label, matching `HeraldAccountMenu`) → `/{username}/settings`, rendered whenever the user is signed in + onboarded,
  - `accountMenu={<HeraldAccountMenu/>}`.
- **No avatar in any topbar.** Identity lives in Settings → Account.
- `HeraldAccountMenu` is a themed Sign-out button (not Clerk `UserButton`). Responsive: icon-with-text on `md+`, icon-only below. Its default `Button` resolves **build-time to the CMS chrome library** via the FLAT `@atta/ui/components` import (aliased per §4 D-035), superseding its earlier `useComponents()` pattern. Note: the `@atta/ui/components/button` **subpath** does NOT resolve to the build-time library — it bypasses the alias and always resolves to `basic` (see §4 and ui-library-system's "Subpath Import Bypass Bug"); the flat import is the build-time one. The one exception is the public-profile tree (`envoy-shell` under `[username]/(profile)`): that call site injects its `useComponents()`-resolved Button via the optional `ButtonComponent` prop, so the candidate's runtime library still drives it (ui-retro-contract-v1 f/u 3 corrects f/u 2's subpath reading). `envoy-shell.tsx`'s own pre-hydration fallback (`comps.Button ?? BasicButton`, used before the runtime import resolves) must import that `BasicButton` flatly too — a prior subpath import there resolved a structurally different `installed/button.tsx` signature than `HeraldAccountMenu`'s flat-imported `ButtonComponent` prop type expects, breaking `@atta/herald-ai-web`'s typecheck with no runtime symptom (caught only by `tsc`, not by any test).
- Topbar action buttons share one compact `h-8` height. Outline buttons with both icon + label (Sign out, Settings) use `gap-2 px-2.5 text-xs md:px-3`; pure icon affordances (theme toggle, CV download/open on the docked identity bar) use `size='icon' h-8 w-8`.
- `extraActions` is the right-cluster slot in the shared `TopBar` (rendered immediately before `accountMenu`). It is a backwards-compatible slot — Vāda already uses it; D-061 reuses it on Herald rather than introducing a new prop on `@atta/ui/topbar`.
- The `(owner)` layout (`/[username]/(owner)/layout.tsx`) renders `HeraldTopBar` with `context='owner'`; the `(app)` layout renders it without a prop (defaulting to `'main'`). The Bulk Audit link is therefore present on `/bulk-audit` and `/onboarding` but absent from `/[username]/ui` + `/[username]/settings` — the owner appearance/settings space does not double up with the audit nav.
- **Responsive collapse (D-061).** Below `md` the topbar shrinks to logo · `ColorSchemeToggle` · hamburger. Nav links, `extraActions` (Herald: Settings gear · Palette/Theme), and `accountMenu` (Sign out / Sign in) all move into the hamburger sheet, so the bar reads as a clean two-button row at narrow widths. The shared `@atta/ui/topbar` orchestrates this — `extraActions` and `accountMenu` are no longer mirrored in the mobile actions row; the sheet hosts them instead. Vāda's existing `extraActions` Settings button inherits the same placement (previously inaccessible on mobile; now lives in the sheet beneath the nav links).

### Public profile topbar (`/[username]`)

The public profile uses a **two-bar** structure, identical on desktop and mobile:

1. **Row 1** is the shared `TopBar` — logo left, no centered nav links (D-061 removes Bulk Audit / UI / Settings from the profile topbar), theme + auth right. When `isOwner`, `extraActions` carries a Theme (Palette icon) button → `/{username}/ui` (the appearance editor) and a Settings (gear icon) button → `/{username}/settings` (D-113 — reverses D-061's "single Settings entry point," which is superseded).
2. **Row 2** is a sticky identity bar directly beneath: avatar (with pennant), name + title, CV download/open. Slides in as the hero scrolls away (`useHeroCollapse`).

The earlier bespoke desktop centered-identity column was deleted (it caused overlap). Identity and the topbar are never in the same row.

**Topbar-unreachable-after-report investigation (herald-hardening-v1 Task 11, #465).** Reported: after a report renders on the single-profile audit page, Row 1 becomes unreachable by scrolling back up. Investigated live against a real running dev server, a real seeded DB profile, and a real browser session (Playwright + a cached Chromium build), across: immediate submit (no prior scroll), scroll-to-collapse-hero-then-submit with both a short and a long (multi-signal/multi-gap) report, real wheel-scroll in both directions, and a mobile (iPhone 13) viewport — in every case Row 1 stayed fully reachable and clickable (confirmed via `elementFromPoint` hit-testing at the topbar's screen coordinates, not just bounding-box visibility). `EnvoyFlow.tsx`'s existing `useEffect` (forces `setIsCollapsed(false)` whenever `state !== 'input'`) correctly hides Row 2's docked bar once a report renders in every case tried; no overlay or scroll-lock was found blocking Row 1 in any of these paths. **Not reproduced — root cause remains unconfirmed.** No fix was made to `envoy-shell.tsx` or `EnvoyFlow.tsx`'s layout wrapper for this issue; per the task brief's explicit instruction, a blind fix was not shipped. Recommend either closing as unreproducible or a follow-up with real-device (not headless/emulated) testing if the report recurs.

**Expected hydration mismatch on Row 2's docked bar (ui-retro-contract-v1 f/u, #540).** `EnvoyNavContent` sits inside a `<Suspense>` boundary (required by its `useSearchParams()` call), which makes it eligible for React's selective/out-of-order hydration — it can hydrate independently of, and later than, `<main>`. Row 2's div (`className` via `dockedTransition`, and `aria-hidden`) both depend on `isCollapsed`, whose correct value depends on scroll position at load — something SSR cannot know. If the page loads already scrolled past the hero (e.g. browser scroll restoration on refresh), `JDInput`'s `IntersectionObserver` can flip `isCollapsed` before/during that delayed hydration, producing a genuine, expected server/client attribute mismatch on that one div. This is not a bug to "fix" architecturally — reordering the Suspense boundary or state ownership would add real risk chasing a value that's supposed to differ. `suppressHydrationWarning` is applied on that div (React's own documented escape hatch for exactly this class of environment-dependent attribute), which silences the console error without changing render behavior — the first `IntersectionObserver` callback settles `isCollapsed` to the correct value immediately after hydration regardless.

---

## 4. Library resolution — the critical invariant (D-035)

Herald has two library-resolution paths. Getting these crossed is the single most expensive bug this refactor produced, so the rule is explicit:

- **App chrome** — main `HeraldTopBar`, Bulk Audit, onboarding, the owner appearance editor at `/[username]/ui`, and the owner Settings at `/[username]/settings` — MUST render the **build-time CMS library** (`@atta/ui/components`, aliased to `packages/ui/generated/herald/components.ts`, generated from `heraldConfig.userInterface.library.id`). This is the app's fixed design system. It is **not** user-configurable.
- **The user's saved library preference (`user.library`)** applies **only** to their public `/[username]` profile (the `(profile)` route group), resolved dynamically via `useComponents()` / `LibraryProvider` (`EnvoyLibraryShell`).

Concretely (post-D-061, which inherits the central-CMS resolution introduced by D-060):

- **Where the build-time id comes from (D-060 — central CMS resolution).** Theme and library metadata live centrally in the `attalabs` (`l5n0n8nn`) Sanity dataset. In each product's local dataset (e.g. `heraldConfig`), `userInterface.theme` and `userInterface.library` are stored as simple string IDs. The `cms` package's resolver (`getProductUiConfig` / `getHeraldConfig`) intercepts those string IDs (or legacy references), fetches the fully populated structures from the central `attalabs` database, and reconstructs the standard `PortalUiConfig` shape so downstream consumers see the same object regardless of where the metadata physically lives. The build-time UI generator (`scripts/generate-ui.ts`) consumes this same resolver, so the alias `@atta/ui/components` → `packages/ui/generated/herald/components.ts` always matches what `getHeraldConfig(cmsClient).userInterface.library.id` returns at runtime — the field is a `library.id` string regardless of central vs. legacy storage.

- **Where the build-time id is plugged in (D-061 — per-route resolution).**
  - `app/(app)/layout.tsx` feeds `CandidateShell` → `LibraryProvider` the build-time library id (`getHeraldConfig(cmsClient).userInterface.library.id`). It deliberately ignores `user.library`. Wraps `/bulk-audit` and `/onboarding`.
  - `app/[username]/(owner)/layout.tsx` mirrors the `(app)` layout: feeds `CandidateShell` the **build-time** library id, then renders the same `HeraldTopBar` + main. Wraps `/[username]/ui` and `/[username]/settings`. Two layouts, one library-resolution rule — adding a third app-chrome surface follows this template.
  - `app/[username]/(profile)/layout.tsx` feeds `EnvoyLibraryShell` → `LibraryProvider` the **user's** `user.library`. This is the only place `user.library` drives rendering.
  - `app/[username]/layout.tsx` is a metadata-only passthrough (icon route + `return children`). It deliberately does **not** wrap children in a `LibraryProvider` — putting one there would cross the build-time and user paths and reintroduce the D-035 regression. The `(owner)` and `(profile)` route groups exist precisely so the two sibling layouts can feed their own providers without inheriting a parent provider.
  - App-chrome components that pick components must import from `@atta/ui/components` (build-time) — not via `useComponents()` against a user-library provider. (`useComponents()` is correct only inside an app-chrome tree if and only if that tree's provider is fed the build-time id, which `(app)/layout.tsx` and `(owner)/layout.tsx` both do.)

**Verification recipe (unchanged from D-035, expanded to cover D-061):** set `user.library` to something other than the build-time library (e.g. `retro`). The main app chrome (`HeraldTopBar` on `/bulk-audit`, `/onboarding`) must stay on the build-time library; the owner editors at `/[username]/ui` and `/[username]/settings` must stay on the build-time library; only `/[username]` (the public profile) renders the user's choice. The three surfaces are independent — and they all resolve their library id through the same D-060 central-CMS path, so confirming `getHeraldConfig(...).userInterface.library.id` returns the expected string is sufficient to know the build-time generation was correct.

**Per-user profile theme (colors/typography) — a sibling concern to library, resolved differently (D-114).** Distinct from `user.library` above: a candidate can also pick a custom color theme (a `uiTheme` Sanity document — e.g. "Matrix Light") for their public profile via `/[username]/ui`. This is stored as `herald_profiles.theme_id` (a bare string, the `uiTheme` document's `_id` — the DB has no idea which Sanity project it belongs to) plus `color_scheme`/`font_sans` overrides, and rendered by `app/[username]/(profile)/page.tsx` into an attribute-scoped CSS override (`generateThemeCSS`) that wins the specificity battle against the global `NextWebShell` scheme block.

- **Same D-060 rule as library resolution, easy to miss because the call site takes a generic client.** `getThemeById(client, themeId)` (`@atta/cms`) runs a raw GROQ lookup against whatever `SanityClient` it's handed — unlike `getProductUiConfig`/`getHeraldConfig`, it does **not** internally redirect to the central project. The caller must pass `createProductClient('attalabs')`, exactly as `/[username]/(owner)/ui/page.tsx` already does when listing themes to choose from.
- **The bug this closed (D-114):** `(profile)/page.tsx` was calling `getThemeById(cmsClient, user.themeId)` — `cmsClient` is Herald's own per-product project (`e9gbd2d1`). Post-D-060, `uiTheme` documents live only in the central `attalabs` project (`l5n0n8nn`), so this always returned `null` and the user's chosen theme silently never applied on the public profile, on every refresh (not a caching issue — the route is `force-dynamic`). The `/ui` editor's live preview masked this during editing because it applies the theme object already in memory (fetched from the central project for the picker list), never calling `getThemeById` at all.
- **Fixed:** `(profile)/page.tsx` now calls `getThemeById(createProductClient('attalabs'), user.themeId)`.
- **Verification recipe:** set a `uiTheme` on a test profile via `/[username]/ui`, save, then load `/[username]` in a fresh request (not the editor's iframe preview) and confirm the `<style>` block's `--background`/`--foreground` etc. match the chosen theme's tokens, not the app-wide default.

---

## 5. Settings

- Six tabs: Profile, Experience, Connections, API Keys, Herald Model, Account. (CV is folded into Experience; there is no separate CV tab.) Tabs are a single non-wrapping row that scrolls horizontally if a chunky library (brutal) exceeds the width.
- Publish/Unpublish lives in the page header beside the "Settings" title (single title source in `page.tsx`); labels "Publish profile" / "Unpublish profile"; keyless-confirm flow preserved. The publish gate now reads `hasAnyKey` (any vendor key is sufficient) instead of the retired `hasAnthropicKey` (task 3b).
- The **API Keys** tab is multi-vendor (task 3b). It composes `@atta/ui/account`'s `ProviderKeysSection` — the same component Vāda uses — for the per-vendor key list (all 12 vendors except Ollama, backed by `/api/keys/provider`). `@atta/ui/account` is unchanged (empty diff against `packages/ui/account` in this PR — Vāda unaffected).
- The **Herald Model** tab holds `AuditModelSection` (moved out of API Keys — the model picker was getting lost at the bottom of a long vendor-key list): a `ModelPicker` filtered to vendors the user has keys for, persisted via `POST /api/admin/audit-model` into `herald_profiles.audit_model_vendor` + `audit_model_id`. Per-user default only (V1) — no per-audit override. Auto-fallback: revoking the selected vendor's key never breaks an audit; the dispatch path resolves to the YAML default (`anthropic` / `claude-sonnet-4-20250514`) at audit time. See `apps/herald-ai/web/src/lib/audit-key.ts`.
- The Account tab renders `HeraldAccountTab` (Herald-local) — an identity summary plus a "Manage account" button that opens Clerk's `<UserProfile/>` in a full-screen modal, sidestepping the column-width cramping. `@atta/ui/account`'s `AttaUserProfile` is unchanged (Vāda still uses it embedded).

---

## 6. Identity & data (recap of D-031)

Herald is standalone: its own Clerk app (`closing-blowfish-4`), own Neon DB, own `user_provider_keys`. Shared at the code level only (`@atta/ui/account`, `@atta/crypto`, `@atta/db/queries`). No SSO across the Herald boundary. See `.claude/skills/auth/SKILL.md` → "Herald exception".

---

## 7. Billing (recap of D-033)

Profile audits (a recruiter auditing a published profile) run on the **profile owner's** vendor key; Bulk Audit runs on the **logged-in user's** vendor key. Same `getProviderKeys(db, clerkId)` path; only `clerkId` differs. Which vendor + model the audit dispatches against is the user's per-user selection (task 3b) — D-033 governs **whose** key, orthogonal to **which vendor**. Publishing does not require a key; the audit tool renders only when the owner has at least one vendor key; the audit endpoint 503s/402s without one.

---

## 8. Audit pipeline (D-044, D-045)

Both audit call paths run through one endpoint — `POST /api/audit` — backed by the shared `@atta/engine` + `@atta/adapter-langgraph` substrate. There is no `generateText()` call anywhere in Herald: the legacy `/api/match` and `/api/recruiter/batch` routes are retired.

The auditor agent (system prompt + classifier behaviour + message template) lives in `apps/herald-ai/web/yamls/herald-auditor.yaml` — a v2.0 solo flow with one agent (`SkepticalAuditor`, `classifier.mode: skip`). On the first request the route loads the YAML via `loadFlow(readFileSync(...))` (cached at module load) and compiles it with `compileFlow(flow, userPrompt, creds.modelId, { schema: MATCH_REPORT_SCHEMA })`. The `{{schema}}` customVar is substituted into the agent's system prompt at compile time, so the model-instruction and `parseMatchReport`'s validation share one schema definition. The Plan is executed by `LangGraphAdapter.execute({ plan })` with `providerKeys: { [creds.vendor]: creds.apiKey }`.

The vendor + model + apiKey for each call are resolved by `resolveAuditCredentials(clerkId)` (`src/lib/audit-key.ts`, task 3b) which reads the user's saved selection from `herald_profiles.audit_model_vendor` / `audit_model_id`, intersects it with the vendor-key map currently stored, and auto-falls-back to the YAML default (`anthropic` / `claude-sonnet-4-20250514`) when the saved vendor's key has been revoked. The audit **never** dispatches against a vendor with no key — the UI's `configuredRoutes` filter and the server's fallback enforce the same invariant. Returns null when the user has no usable key at all; the route then surfaces a 402/503 to the recruiter, matching the pre-3b shape.

### One endpoint, two payload shapes (D-045)

`POST /api/audit` dispatches on payload shape:

- **Single shape** — `{ job_description, username? | _test_profile_override? }` → returns a `MatchReport`. The Envoy single-profile audit (`EnvoyFlow.tsx`). Auth is open; the audit runs on the **profile owner's** stored BYOK key (DB-resolved by `username`, D-033). Test and Dani-fallback paths use the server `ANTHROPIC_API_KEY` on the YAML default model.
- **Batch shape** — `{ jd, candidates[] }` → returns `{ results: { username, report, error? }[] }`. The Bulk Audit (`BulkAudit.tsx`). Requires a Clerk session; runs on the **logged-in user's** stored BYOK key (D-033); 402 if missing. `Promise.all` fan-out across candidates (≤ 10).

Both shapes call the same `runSingleMatch(profile, jd, creds)` cell — the engine-backed unit of work. Everything around it is preserved verbatim from D-044:

- **2-attempt retry, 25s timeout** wrapping `adapter.execute(...)` via `Promise.race`. `Conclusion.terminalState === 'FAILED'` advances to the next retry attempt rather than throwing — the engine surfaces errors via the Conclusion shape, not exceptions.
- **`extractSignals` pre-fetch** (3s timeout, best-effort) still produces the GitHub signal evidence appended to `userPrompt`. Task 7 (#102) will retire this pre-fetch by giving the auditor agent a GitHub tool declared in the YAML.
- **24h in-memory cache** keyed on `sha256(jd + profile + vendor + modelId)` (task 3b extended the key with vendor + modelId so switching models invalidates cleanly; pre-3b it was `sha256(jd + profile)`). Shared by both shapes — a batch entry that re-tests an already-cached profile+JD+model triple hits cache.
- **`parseMatchReport`** with its **code-enforced NO-FIT hard-requirement gate** is unchanged. The gate is deliberately Herald code, not a model gate — it must never become model-controlled.
- **`buildPartialReport` fallback** is unchanged: both attempts failing yields a `B+ / Good Fit / Low confidence` partial report so the UI never crashes (single shape). The batch shape returns `{ error: 'Audit failed' }` for that individual candidate inside the `results[]`, so the rest of the batch is unaffected.

Rate limit: `src/proxy.ts` applies the Upstash 5/h per-IP cap to `POST /api/audit` (was `/api/match` pre-D-045). Side effect: batch calls are now in scope of the cap, but one batch call counts as one hit even when it audits up to 10 candidates internally.

The engine and adapter packages are consumed unchanged: `git diff main --stat` against `packages/engine` and `packages/adapter-langgraph` is empty in this PR, which means no Vāda blast radius by construction.

`apps/herald-ai/web/next.config.ts` transpiles `@atta/engine` + `@atta/adapter-langgraph` and adds `outputFileTracingIncludes: { '/**': ['./yamls/**'] }` so the YAML is bundled into the serverless function (Vāda's pattern, scoped to Herald's local `yamls/` dir).

The recruiter-facing input control is `JDInput` (`src/components/envoy/JDInput.tsx`), built on the shared `@atta/ui/smart-prompt-input` composite (`SmartPromptInput`, D-064 injection contract — Herald supplies primitives via `useComponents()`). Post-PR #207 `JDInput` opts in to `textareaVariant='bare'` + `surface='popover'` so it renders aligned with Vāda's deliberate-page hero (elevated `bg-popover`, outer focus halo, footer-less inline submit) — intentionally NOT the prior byte-identical default. `JDInput` also takes an `isPublished` prop (threaded from `EnvoyFlow` ← `[username]/(profile)/page.tsx`'s `user.isPublished`) so the "no API key" and "not published" owner-only notices render as independently-conditioned rows inside one sticky footer, instead of two separately-conditioned sticky elements that could overlap.

**Loading UX and cost display (herald-hardening-v1 Task 11, #465).** `LoadingState.tsx`'s original 3-step animation only covered the first 5s; a real single-profile audit typically takes ~70-90s (the server's 90s LLM timeout, up to 2 attempts). It now rotates a small set of extended labels and shows a live elapsed-seconds counter after the initial 5s, purely client-side/cosmetic — never coupled to the real fetch, which still reveals whenever it actually resolves (`EnvoyFlow.tsx`'s `ANIMATION_DURATION`/`tryReveal` gating is unchanged). Separately, `Conclusion.estimatedCostUsd` (computed in `buildSuccessfulConclusion`/`buildFailedConclusion` from real token counts, previously only `console.info`'d) is now threaded through `MatchReport.estimatedCostUsd` and rendered on `ReportView.tsx` near the header when present.

**Report display fixes (herald-hardening-v1 Task 13, #520).** Three fixes to `ReportView.tsx`, found live reviewing real audit PDFs: (1) `MatchReport.githubSignals?: RawSignal[]` (captured per-invocation in `run()`, see `.claude/skills/herald-engine/SKILL.md` § GitHub Signal Tool) now renders as a "GitHub Evidence" section — repo, evidence text, confidence badge per signal — positioned after Detected Signals; omitted entirely when absent/empty (no GitHub handle, or `GITHUB_PAT` broken — an operational credential issue tracked separately, not a code fix). (2) The NO-FIT case previously rendered `report.grade` ("NO FIT") as the 80px headline AND `report.recommendation` ("No Fit", forced identical by `parse.ts`'s code-enforced hard-gate) as a plain-text line right below it — the same disqualification, twice. Now, when `grade === 'NO FIT'`, that line is a framed destructive badge ("Disqualified — Hard Requirement Not Met") instead; every other grade's rendering is unchanged. (3) Style: the estimated-cost line moved from `text-muted-foreground` to `text-warning`; the candidate title line moved from `text-xs` to `text-sm`.

---

## 9. MCP surface (D-046, D-051)

Herald exposes one MCP tool — `herald__audit` — at `herald.attalabs.dev/api/mcp`. The route handler lives at `apps/herald-ai/web/src/app/api/mcp/route.ts`; the server definition lives in `apps/herald-ai/mcp-server/` (`@herald/mcp-server`).

**Tool:** `herald__audit({ profile: string, jd: string }) → MatchReport`

The handler mirrors Vāda's MCP pattern:

- **Bearer auth** — `verifyApiKeyBearer(authHeader, 'herald', ...)` against Herald's `api_keys` table (same schema as Vāda, `product` defaults to `'herald'`).
- **Rate limiting** — same Upstash pattern as `/api/audit`.
- **BYOK resolution** — delegates to `resolveAuditCredentials(clerkId)` (the same path as the `/api/audit` route), so vendor + model selection and fallback logic are identical.
- **Dispatch** — calls `run()` from `@atta/forensic-hiring-auditor` and returns the `MatchReport`.

`candidateInfo` (`name`, `title`, `github`) is passed as empty strings in the MCP context — the auditor reads the free-form `profile` text for evaluation; the `candidate` field in the output will be empty strings. A future improvement could extract these from the profile text.

---

## 10. Known follow-ups (not built here)

- N×M matrix UI and polymorphic inputs (link / pasted text / .md / .pdf / stored profile). Plugs straight into the existing `/api/audit` cell — `runSingleMatch` is the per-pair primitive.
- Per-audit (one-off) vendor + model override on the Bulk Audit surface. The per-user default landed in task 3b (#90); a per-audit override (e.g. "run THIS batch on GPT-5 even though my default is Claude") is the natural next step but explicitly out of scope for V1.
- Per-key rate limit / cap on profile audits (abuse surface: strangers spend the owner's key budget — D-033).
- `herald.attalabs.dev` deploy verification.
- Auditor signal-gathering as a YAML-declared tool (`herald-onto-engine` task 7, #102) — retires the `extractSignals` pre-fetch.
