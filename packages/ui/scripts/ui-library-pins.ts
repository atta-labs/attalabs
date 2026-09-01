import type { UILibrary } from '../lib/library-loader'

/**
 * Repo-committed per-app UI library pins, read by `generate-ui.ts` at build time.
 *
 * This is the only input to `generateUIIndex` — there is no live CMS fetch in the
 * build path. A checkout at a given SHA must produce the same generated output on
 * every build; a live fetch broke that (reproduced: identical turbo hash, `retro`
 * pass vs `animate` fail 40 minutes apart). Changing a pin changes what the next
 * build emits — commit the change and redeploy.
 *
 * `tools/admin`'s per-project Library picker no longer writes anywhere — its
 * publish action was removed, since it reached no build-time app's generated
 * output. `userInterface.library` still exists as a CMS field (edit it
 * directly in Sanity Studio if needed for other purposes), but nothing in a
 * build-time app's pipeline reads it; only this pin file does.
 */
export const UI_LIBRARY_PINS = {
  vada: 'retro',
  herald: 'animate',
  attalabs: 'retro',
  vinayaPortal: 'animate',
  vinayaStudio: 'retro'
} as const satisfies Record<string, UILibrary>

export type PinnedApp = keyof typeof UI_LIBRARY_PINS
