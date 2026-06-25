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
   - `extraActions` on the public-profile topbar (`envoy-shell.tsx`) carries a Palette icon button → `/{username}/ui` **only when `isOwner`**.
   - `envoy-shell.tsx` `OWNER_LINKS` becomes empty: Bulk Audit / UI / Settings are gone from the profile topbar's centered nav. The Settings gear is intentionally NOT duplicated on the profile topbar — the main `HeraldTopBar` is the single place for Settings access.
   - `extraActions` is an existing slot on the shared `@atta/ui/topbar` (introduced as a backwards-compatible prop). No `@atta/ui` change is part of this decision; cross-iteration blast radius into vada-production-v1/6 (#181) stays zero.

3. **D-035 preserved by route-group construction.** Because `(profile)` and `(owner)` are sibling route groups, they get distinct layouts that feed distinct `LibraryProvider`s. The `[username]/layout.tsx` is the deliberately empty parent — its emptiness is load-bearing. A future maintainer who adds a provider there breaks D-035 silently. The verification recipe in `herald-app-architecture.md` §4 (set `user.library = retro`, confirm chrome stays build-time, only `/[username]` switches) is extended to also cover `/[username]/ui` + `/[username]/settings`.

**Supersedes:** D-036's route layout for `/ui` + `/settings` (flat under `(app)`) and D-036's nav-links treatment of UI + Settings in `HeraldTopBar`. The rest of D-036 (flat routes for `/bulk-audit` and `/onboarding`; single shared `HeraldTopBar`; no avatar; `HeraldAccountMenu` as sign-out) stays in force.

**Alternatives rejected:**

- *Make `/ui` + `/settings` plain children of `app/[username]/` (no route group split).* Rejected — they would inherit `[username]/layout.tsx`'s `EnvoyLibraryShell` (user library), breaking D-035 (Lock: YES). The route-group split is the cheapest structural enforcement of "owner pages render build-time chrome regardless of profile theme."
- *Modify `@atta/ui/topbar` to expose a new owner-actions API.* Rejected — `extraActions` already exists and is unused by Vāda; using it touches zero shared code. A `@atta/ui` API change would collide with vada-production-v1/6 (#181, SmartTextInput extraction) on the same package; serializing cross-iteration work to win a small ergonomic gain is the wrong trade.
- *Keep the nav links and just rewrite the hrefs (`/ui` → `/{username}/ui`).* Rejected — the cluttered centered nav was half the motivation. Right-cluster icon buttons match the existing affordance pattern (theme toggle, account menu, CV download/open on the docked identity bar) and free the centered nav for top-level surfaces (Bulk Audit, profile shortcut).
- *Add a Settings gear to the public-profile topbar too, duplicating the main `HeraldTopBar`'s gear.* Rejected — duplication is a maintenance burden; the main `HeraldTopBar` is visible on every other authenticated route, and signed-in visitors of someone else's profile rarely need a one-click route to their own Settings from that context. If the need surfaces, adding the gear to the profile topbar is a one-line extension.

**Consequences:**

- New: `app/[username]/(owner)/layout.tsx` (auth + ownership + build-time `CandidateShell` + `HeraldTopBar`), `app/[username]/(profile)/layout.tsx` (moved `EnvoyLibraryShell` + `EnvoyShell` wrap), `app/[username]/(owner)/ui/page.tsx`, `app/[username]/(owner)/settings/page.tsx`, `app/[username]/(profile)/page.tsx`.
- Deleted: `app/(app)/ui/` and `app/(app)/settings/`. The `(app)` layout still wraps `/bulk-audit` and `/onboarding`.
- Modified: `app/[username]/layout.tsx` (metadata-only passthrough), `app/[username]/envoy-shell.tsx` (empty `OWNER_LINKS`, Palette `extraActions` for owner, `username` prop chain), `components/HeraldTopBar.tsx` (drop UI + Settings, add Settings gear `extraActions`), `src/proxy.ts` (matchers no longer carry `/ui` + `/settings`; owner layout handles auth), `api/admin/profile/route.ts` (`revalidatePath` calls now target `/{username}/ui` + `/{username}/settings`), and the two existing `/settings?tab=api-keys` links in `BulkAudit.tsx` and `JDInput.tsx` are now built from `{username}` (threaded through `EnvoyFlow` + the bulk-audit page).
- Identity perimeter (D-031) and library resolution (D-035) are unchanged; D-061 is a routing + nav refactor that preserves both. The central-CMS library resolution introduced by D-060 supplies the build-time `library.id` consumed by both `(app)/layout.tsx` and `(owner)/layout.tsx`.
- Mobile / desktop hamburger behavior unchanged — `extraActions` participates in both rows of the shared `TopBar`.
- The `[username]` URL space now reserves the `/ui` and `/settings` subpaths under every username. Existing usernames must not be `ui` or `settings` (the static route group wins, but the username would shadow itself); the audit team will add a username block-list entry as a small follow-up to onboarding. Not a blocker — neither word is a plausible vanity URL.
