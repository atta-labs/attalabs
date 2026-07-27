# Herald decisions — legacy archive (frozen 2026-07-27)

**History, not machinery.** No check reads this file. No gate requires an entry.
It is kept because `D-###` citations across code, specs and skills resolve here.

Do not add entries. A decision that still binds belongs in the spec for the
surface it governs, where a doc-ownership binding keeps it current. A decision
about one change belongs in that change's pull request.

---

# Herald Decisions

**Status:** draft

---

## D-001 — Herald admin theme save not reflected at :3000 — root cause

**Date:** 2026-06-24
**Status:** ACTIVE
**Type:** 2
**Authored by:** TL

Root cause: **A — inactive theme**. `heraldConfig.userInterface.theme` in Sanity project `e9gbd2d1` references `theme-storm` ("Storm"), not Cobalt. The admin tool correctly writes to `e9gbd2d1` (via `getCmsClientsForProject('herald')` using the hardcoded `PROJECT_IDS.herald = 'e9gbd2d1'` and a valid `SANITY_API_TOKEN_HERALD`). The Cobalt theme document (`theme-cobalt`) exists in that project with both `dark` and `light` fields populated — the save landed. But `heraldConfig` points at Storm, so Herald renders Storm on every request regardless of Cobalt edits.

**Evidence:**
- `heraldConfig` GROQ query → `{ "themeId": "theme-storm", "themeName": "Storm", "colorScheme": "dark" }`
- Cobalt theme query → `{ "_id": "theme-cobalt", "name": "Cobalt", "hasDark": true, "hasLight": true }`
- Admin write client: `projectId = PROJECT_IDS.herald = 'e9gbd2d1'`, token = `SANITY_API_TOKEN_HERALD` (present in `tools/admin/.env.local`)
- Herald read client: `SANITY_PROJECT_ID="e9gbd2d1"` (present in `apps/herald-ai/web/.env.local`)

**Additional finding:** `tools/admin/.env.local` has `SANITY_PROJECT_ID=ofnj2ojb` (Vāda's project ID). This does not affect theme operations (they use `getCmsClientsForProject` with hardcoded IDs), but any admin code that falls back to `cmsConfig.projectId` (the generic `cmsClient`/`cmsWriteClient` from `@atta/cms`) would silently target Vāda instead of Herald. Not the root cause here, but a latent hazard.

**Implication for fix brief:** No code change needed. The fix is a Sanity data operation: call `setActiveThemeAction('herald', 'theme-cobalt', 'dark')` (or use the admin tool's "Set as active" action on Herald → Themes → Cobalt). Optionally clean up the `tools/admin/.env.local` `SANITY_PROJECT_ID` misassignment (Vāda's value in a product-agnostic admin tool env is confusing).

---

## D-061 — Owner `/ui` + `/settings` relocated under `/[username]/(owner)/`; topbar buttons via `extraActions`

**Date:** 2026-06-25
**Status:** ACTIVE
**Type:** 1
**Tier:** 3
**Lock:** NO (the relocation is reversible; the D-035 invariant it preserves is the locked one — see below)
**Authored by:** Developer (dispatched by Principal, herald-agents-v2 task 8)
**Ratified by:** Principal (in-session)

**Context:** Under D-036, `/ui` (public-profile appearance editor) and `/settings` lived as flat routes inside the `(app)` route group, alongside `/bulk-audit` and `/onboarding`. The editor and Settings hub both target the user's own profile, so the URL space wanted them under the profile's identity (`/[username]/ui`, `/[username]/settings`) — same noun, owner-only verb. The main `HeraldTopBar` had Bulk Audit / UI / Settings / `/username` as centered links; on the public profile topbar, the owner saw the same three labels duplicated. Both were navigational noise.

A naive relocation — making `/ui` and `/settings` plain children of `app/[username]/` — would inherit `EnvoyLibraryShell` (the user's library) from the parent `[username]/layout.tsx`, breaking D-035 (Lock: YES). The owner editor and Settings must render the **build-time** library, not the visitor's profile theme.

**Decision:**

1. **Route relocation via route groups (no URL segment added).**
   - `app/[username]/(profile)/page.tsx` — the public profile, wrapped by `(profile)/layout.tsx` which renders `EnvoyLibraryShell` + `EnvoyShell` (user library — unchanged from D-035).
   - `app/[username]/(owner)/ui/page.tsx` + `app/[username]/(owner)/settings/page.tsx` — under `(owner)/layout.tsx`, a server-component layout that (a) resolves `userId` via `auth()`, (b) loads the signed-in user, (c) redirects anonymous → `/sign-in`, (d) redirects non-onboarded → `/onboarding`, (e) calls `notFound()` when the signed-in user's `username` ≠ the `[username]` URL segment, and (f) wraps children in `CandidateShell` fed the **build-time** library id (mirroring `app/(app)/layout.tsx`) + the same `HeraldTopBar` used everywhere else in app chrome.
   - `app/[username]/layout.tsx` is restructured to a no-op passthrough (returns `children`, keeps the icon `generateMetadata`). It deliberately does NOT wrap children in any `LibraryProvider` — the two sibling route groups feed their own providers.
   - `app/(app)/ui/` and `app/(app)/settings/` are **deleted**, with no redirect. Middleware matchers, `revalidatePath` calls in `api/admin/profile/route.ts`, and internal links are swept.

2. **Topbar buttons via `extraActions`, not nav links.**
   - `HeraldTopBar.signedInLinks` drops `UI` + `Settings`. It now takes an optional `context: 'main' | 'owner'` prop:
     - `context='main'` (default — used by `app/(app)/layout.tsx`): Bulk Audit + `/username`.
     - `context='owner'` (used by `app/[username]/(owner)/layout.tsx`): `/username` only — the owner appearance/settings space does not double up with the audit nav. The Settings gear in `extraActions` still routes between the two owner surfaces.
   - `extraActions` on `HeraldTopBar` carries a Settings button → `/{me}/settings` whenever the user is signed in + onboarded. The button uses the same responsive icon+label pattern as `HeraldAccountMenu` (icon-only ≤ md, icon + "Settings" ≥ md) so it visually matches the Sign out button next to it instead of looking like an unlabelled icon affordance.
   - `extraActions` on the public-profile topbar (`envoy-shell.tsx`) carries a Theme button (Palette icon + "Theme" label) → `/{username}/ui` **only when `isOwner`**. The label is "Theme" rather than "UI" because the editor changes user-facing styling (colors, fonts, library) — "UI" is implementation jargon.
   - `envoy-shell.tsx` `OWNER_LINKS` becomes empty: Bulk Audit / UI / Settings are gone from the profile topbar's centered nav. The Settings gear is intentionally NOT duplicated on the profile topbar — the main `HeraldTopBar` is the single place for Settings access.

3. **Responsive collapse — shared `@atta/ui/topbar` update.** Below `md` the topbar shows logo · `ColorSchemeToggle` · hamburger only. `extraActions` and `accountMenu` are no longer rendered in the mobile actions row; they move into the hamburger sheet (after the nav links, before Sign-in). The hamburger now renders unconditionally below `md` since there is always at least Sign-in or account UI to surface. This is a single mobile-section rewrite inside `packages/ui/topbar/index.tsx` — the prop surface (`signedInLinks`, `extraActions`, `accountMenu`, `isSignedIn`) is unchanged.
   - **Vāda impact:** Vāda's `(main)/layout.tsx` already passes an `extraActions` Settings icon button. Before this change it was hidden below `md` (the mobile actions row never rendered `extraActions`); after this change it appears in Vāda's hamburger sheet at narrow widths — strictly an accessibility improvement.
   - **AEG Studio:** uses `withAuth={false}` → `TopBarNoAuth`, which is untouched by this change.
   - The brief's stop-and-escalate clause guarded against this change colliding with vada-production-v1/6 (#181, SmartTextInput extraction). #181 is not currently open, and the changes are on disjoint files (`topbar/index.tsx` vs. `smart-prompt-input/`), so the collision is not triggered. The Principal authorised the change in-session.

4. **D-035 preserved by route-group construction.** Because `(profile)` and `(owner)` are sibling route groups, they get distinct layouts that feed distinct `LibraryProvider`s. The `[username]/layout.tsx` is the deliberately empty parent — its emptiness is load-bearing. A future maintainer who adds a provider there breaks D-035 silently. The verification recipe in `herald-app-architecture.md` §4 (set `user.library = retro`, confirm chrome stays build-time, only `/[username]` switches) is extended to also cover `/[username]/ui` + `/[username]/settings`.

**Supersedes:** D-036's route layout for `/ui` + `/settings` (flat under `(app)`) and D-036's nav-links treatment of UI + Settings in `HeraldTopBar`. The rest of D-036 (flat routes for `/bulk-audit` and `/onboarding`; single shared `HeraldTopBar`; no avatar; `HeraldAccountMenu` as sign-out) stays in force.

**Alternatives rejected:**

- *Make `/ui` + `/settings` plain children of `app/[username]/` (no route group split).* Rejected — they would inherit `[username]/layout.tsx`'s `EnvoyLibraryShell` (user library), breaking D-035 (Lock: YES). The route-group split is the cheapest structural enforcement of "owner pages render build-time chrome regardless of profile theme."
- *Modify `@atta/ui/topbar` to expose a new owner-actions API (e.g. a `signedInOwnerLinks` prop).* Rejected — `extraActions` already exists and is in production use by Vāda; reusing it on Herald required no prop-surface change. The part (3) mobile-section rewrite below DOES edit the shared package, but only the rendering of those existing slots, not their API contract — so vada-production-v1/6 (#181, SmartTextInput) collision risk is absent (disjoint files within `packages/ui/`).
- *Keep the nav links and just rewrite the hrefs (`/ui` → `/{username}/ui`).* Rejected — the cluttered centered nav was half the motivation. Right-cluster icon buttons match the existing affordance pattern (theme toggle, account menu, CV download/open on the docked identity bar) and free the centered nav for top-level surfaces (Bulk Audit, profile shortcut).
- *Add a Settings gear to the public-profile topbar too, duplicating the main `HeraldTopBar`'s gear.* Rejected — duplication is a maintenance burden; the main `HeraldTopBar` is visible on every other authenticated route, and signed-in visitors of someone else's profile rarely need a one-click route to their own Settings from that context. If the need surfaces, adding the gear to the profile topbar is a one-line extension.

**Consequences:**

- New: `app/[username]/(owner)/layout.tsx` (auth + ownership + build-time `CandidateShell` + `HeraldTopBar`), `app/[username]/(profile)/layout.tsx` (moved `EnvoyLibraryShell` + `EnvoyShell` wrap), `app/[username]/(owner)/ui/page.tsx`, `app/[username]/(owner)/settings/page.tsx`, `app/[username]/(profile)/page.tsx`.
- Deleted: `app/(app)/ui/` and `app/(app)/settings/`. The `(app)` layout still wraps `/bulk-audit` and `/onboarding`.
- Modified: `app/[username]/layout.tsx` (metadata-only passthrough), `app/[username]/envoy-shell.tsx` (empty `OWNER_LINKS`, Palette `extraActions` for owner, `username` prop chain), `components/HeraldTopBar.tsx` (drop UI + Settings, add Settings gear `extraActions`), `src/proxy.ts` (matchers no longer carry `/ui` + `/settings`; owner layout handles auth), `api/admin/profile/route.ts` (`revalidatePath` calls now target `/{username}/ui` + `/{username}/settings`), and the two existing `/settings?tab=api-keys` links in `BulkAudit.tsx` and `JDInput.tsx` are now built from `{username}` (threaded through `EnvoyFlow` + the bulk-audit page).
- Identity perimeter (D-031) and library resolution (D-035) are unchanged; D-061 is a routing + nav refactor that preserves both. The central-CMS library resolution introduced by D-060 supplies the build-time `library.id` consumed by both `(app)/layout.tsx` and `(owner)/layout.tsx`.
- Mobile / desktop hamburger behavior is **updated** by part (3) above: at `md+` the right cluster keeps `ColorSchemeToggle · extraActions · accountMenu`; below `md` the row collapses to `ColorSchemeToggle · hamburger` and the sheet hosts `extraActions` + `accountMenu` after the nav links. This affects every consumer of the shared `TopBar`.
- The `[username]` URL space now reserves the `/ui` and `/settings` subpaths under every username. Existing usernames must not be `ui` or `settings` (the static route group wins, but the username would shadow itself); the audit team will add a username block-list entry as a small follow-up to onboarding. Not a blocker — neither word is a plausible vanity URL.

---

## D-113 — Public-profile owner topbar also gets a Settings button, reversing D-061's "single Settings entry point"

**Date:** 2026-07-06
**Status:** ACTIVE
**Type:** 2
**Tier:** 1
**Lock:** NO
**Authored by:** Principal (in-session, direct UI request)
**Ratified by:** Principal

**Context:** D-061 deliberately rejected duplicating a Settings gear on the public-profile topbar (`envoy-shell.tsx`), reasoning that the main `HeraldTopBar` (visible on every other authenticated route) was a sufficient single entry point, and that "signed-in visitors of someone else's profile rarely need a one-click route to their own Settings from that context." D-061 explicitly flagged the reversal as cheap: *"If the need surfaces, adding the gear to the profile topbar is a one-line extension."* In practice, an owner viewing their own public profile (the most common context for using the Theme button next to it) had no way to reach Settings without navigating away first — the Principal judged this friction real enough to reverse the decision.

**Decision:** `envoy-shell.tsx`'s owner-only `extraActions` cluster now renders both the existing Theme button (Palette icon → `/{username}/ui`) and a new Settings button (gear icon → `/{username}/settings`), matching the outline icon+label style (`h-8 gap-2 px-2.5 text-xs md:px-3`) already shared by Theme/Settings/Sign-out. Both buttons are wrapped in Herald's own `flex items-center gap-2` container (not a shared-`@atta/ui/topbar` change) so they space correctly in both the desktop row and the mobile hamburger sheet, which only wraps the whole `extraActions` slot in a bare flex row with no `gap`. No change to `@atta/ui/topbar`'s prop surface or rendering.

**Supersedes:** D-061's "Settings gear is not duplicated on the profile topbar" clause (part 2, and the rejected-alternative "Add a Settings gear to the public-profile topbar too, duplicating the main `HeraldTopBar`'s gear"). The rest of D-061 (route-group split, `context` prop, responsive collapse, D-035 preservation) is unaffected and stays in force.

**Alternatives rejected:**
- *Leave Settings reachable only via the main `HeraldTopBar`.* Rejected — this is the status quo D-061 shipped, and it is the friction this decision closes.
- *Replace the Theme button with a combined menu (Theme + Settings under one dropdown).* Rejected — no dropdown affordance exists elsewhere in Herald's topbar chrome (D-036 explicitly avoided a dropdown account menu); two equally-weighted labelled buttons match the existing Settings/Theme/Sign-out visual language instead of introducing a new interaction pattern for one extra link.

**Consequences:**
- Modified: `apps/herald-ai/web/src/app/[username]/envoy-shell.tsx` (Settings button added to owner `extraActions`, wrapped in a local gap container).
- Docs: `apps/herald-ai/specs/herald-app-architecture.md` §"Public profile topbar" updated to describe both buttons; the "single Settings entry point" phrasing there is retired.
- No shared-package (`packages/ui/topbar`) change — blast radius is Herald-only.

---

## D-114 — Per-user profile theme lookup restored to D-060's central-CMS resolution (bug fix, not a new decision)

**Date:** 2026-07-06
**Status:** ACTIVE
**Type:** 2
**Tier:** 1
**Lock:** NO
**Conforms-to-lock:** D-060 — this entry does not challenge D-060's central-CMS architecture; it corrects a call site that violated it
**Authored by:** Principal (in-session bug report) + Developer (diagnosis and fix, same session)
**Ratified by:** Principal

**Context:** User reported: selected a custom public-profile theme ("Matrix Light") via `/[username]/ui`, saved it, then visited their own public profile and refreshed — the theme never applied. This is a `state-machine.md` §11 contradiction in substance (shipped code disagreeing with an ACTIVE, Lock: YES decision) caught and fixed in the same session rather than by the async Archivist drift cron, so it's logged directly rather than opened as an unresolved CONTRADICTION entry.

Root cause: `app/[username]/(profile)/page.tsx` resolved the user's saved `themeId` via `getThemeById(cmsClient, user.themeId)`. `cmsClient` (`@atta/cms`) is scoped to Herald's own per-product Sanity project (`e9gbd2d1`). D-060 moved all `uiTheme` documents out of every per-product project into the central `attalabs` project (`l5n0n8nn`) and hid Themes/Libraries from the per-product studio sidebars. `getThemeById` takes a generic `SanityClient` and does no redirection itself (unlike `getProductUiConfig`, which D-060 did update) — so this call always returned `null`, and the theme CSS was silently never injected, on every request (route is `force-dynamic`; not a cache-staleness bug). The write path was unaffected: `herald_profiles.theme_id` was written correctly by `POST /api/admin/profile`, and `revalidatePath` fired correctly on save. The `/ui` editor's own live preview masked the bug during editing because it applies the theme object already held in memory (fetched from the central project for the picker list) via `postMessage`, never calling `getThemeById`.

This was a leftover of the D-060 migration: the `/ui` editor's theme-*list* fetch was correctly pointed at `createProductClient('attalabs')`, but the profile page's theme-*resolution* (by the saved ID) was never revisited. Confirmed against production data: `theme-matrix` returns `null` from Herald's project and a real document (`{"_id":"theme-matrix","name":"Matrix"}`) from the `attalabs` project.

**Decision:** `app/[username]/(profile)/page.tsx` now calls `getThemeById(createProductClient('attalabs'), user.themeId)` instead of `getThemeById(cmsClient, user.themeId)`. Verified against the reporting user's own account (`theme_id: 'theme-matrix'`, `font_sans: 'Poppins'`): re-fetched `/pepito` post-fix and confirmed the theme's color tokens and chosen font are now actually injected into the rendered page.

**Alternatives rejected:** None — this is a single-line correction restoring already-decided (D-060) behavior; there was no design choice to make.

**Consequences:**
- Modified: `apps/herald-ai/web/src/app/[username]/(profile)/page.tsx` (theme lookup now targets the central project).
- Docs: `apps/herald-ai/specs/herald-app-architecture.md` §4 gets a new "Per-user profile theme" subsection documenting the resolution path and this bug. `.claude/skills/ui-cms-theme/SKILL.md` gets a new rule + anti-pattern + worked example so any future per-user/per-entity theme feature (in any product) doesn't repeat this exact mistake — `getThemeById`/`getThemeByName`/`getThemes`/`getLibraries` must always be called with `createProductClient('attalabs')`, never a product's own `cmsClient`.
- No schema/DB change, no shared-package (`packages/ui/topbar`, `packages/cms` public API) change — the fix is a one-line client swap at a single call site.
