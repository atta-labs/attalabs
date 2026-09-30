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

/** Every library id a pin or an override may name. */
export const UI_LIBRARIES = ['basic', 'animate', 'retro'] as const satisfies readonly UILibrary[]

/**
 * Env var that replaces an app's pin for one generator run. CI's matrix-typecheck
 * job sets it to typecheck each app under all three libraries, not only its pinned
 * one. Unset (or empty) means the pin wins and output is unchanged.
 */
export const UI_LIBRARY_OVERRIDE_ENV = 'UI_LIBRARY_OVERRIDE'

function isUILibrary(value: string): value is UILibrary {
  return (UI_LIBRARIES as readonly string[]).includes(value)
}

/**
 * The library `generate-ui.ts` writes for `app`: the override when set, else the
 * pin. An override naming no known library throws — a typo must fail the run, not
 * silently fall back to the pin and report a green that was never checked.
 */
export function resolveUILibrary(
  app: PinnedApp,
  override: string | undefined = process.env[UI_LIBRARY_OVERRIDE_ENV]
): { library: UILibrary; overridden: boolean } {
  if (override === undefined || override === '') return { library: UI_LIBRARY_PINS[app], overridden: false }
  if (!isUILibrary(override)) {
    throw new Error(
      `generate-ui: ${UI_LIBRARY_OVERRIDE_ENV}="${override}" is not a UI library (expected one of: ${UI_LIBRARIES.join(', ')})`
    )
  }
  return { library: override, overridden: true }
}
