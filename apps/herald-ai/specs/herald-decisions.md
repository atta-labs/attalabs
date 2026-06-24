# Herald Decisions

## D-001 — Type 2 — ACTIVE — 2026-06-24

**Herald admin theme save not reflected at :3000 — root cause**

Root cause: **A — inactive theme**. `heraldConfig.userInterface.theme` in Sanity project `e9gbd2d1` references `theme-storm` ("Storm"), not Cobalt. The admin tool correctly writes to `e9gbd2d1` (via `getCmsClientsForProject('herald')` using the hardcoded `PROJECT_IDS.herald = 'e9gbd2d1'` and a valid `SANITY_API_TOKEN_HERALD`). The Cobalt theme document (`theme-cobalt`) exists in that project with both `dark` and `light` fields populated — the save landed. But `heraldConfig` points at Storm, so Herald renders Storm on every request regardless of Cobalt edits.

**Evidence:**
- `heraldConfig` GROQ query → `{ "themeId": "theme-storm", "themeName": "Storm", "colorScheme": "dark" }`
- Cobalt theme query → `{ "_id": "theme-cobalt", "name": "Cobalt", "hasDark": true, "hasLight": true }`
- Admin write client: `projectId = PROJECT_IDS.herald = 'e9gbd2d1'`, token = `SANITY_API_TOKEN_HERALD` (present in `tools/admin/.env.local`)
- Herald read client: `SANITY_PROJECT_ID="e9gbd2d1"` (present in `apps/herald-ai/web/.env.local`)

**Additional finding:** `tools/admin/.env.local` has `SANITY_PROJECT_ID=ofnj2ojb` (Vāda's project ID). This does not affect theme operations (they use `getCmsClientsForProject` with hardcoded IDs), but any admin code that falls back to `cmsConfig.projectId` (the generic `cmsClient`/`cmsWriteClient` from `@atta/cms`) would silently target Vāda instead of Herald. Not the root cause here, but a latent hazard.

**Implication for fix brief:** No code change needed. The fix is a Sanity data operation: call `setActiveThemeAction('herald', 'theme-cobalt', 'dark')` (or use the admin tool's "Set as active" action on Herald → Themes → Cobalt). Optionally clean up the `tools/admin/.env.local` `SANITY_PROJECT_ID` misassignment (Vāda's value in a product-agnostic admin tool env is confusing).
