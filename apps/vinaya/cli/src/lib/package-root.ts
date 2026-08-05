import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Walk up from the CALLING module's own location to the nearest
 * `package.json` — never a fixed `../..`/`../../..` relative depth. A fixed
 * depth is only correct for one specific layout (this workspace's `src/`
 * tree); once bundled into a single-file `dist/index.js` (what a real
 * `npm install` ships), the depth from the bundled file to the package root
 * is different, and a fixed walk silently lands one or more directories
 * short or short of the mark.
 *
 * `moduleUrl` must be the CALLER's own `import.meta.url`, not this module's —
 * the walk starts from wherever the caller physically lives (workspace
 * `src/commands/`, `src/checks/`, or a bundle's single `dist/` file), which
 * is the whole reason this needs to be a parameter rather than computed once
 * here and cached.
 */
export function packageRoot(moduleUrl: string): string {
  let dir = dirname(fileURLToPath(moduleUrl))
  while (!existsSync(join(dir, 'package.json'))) {
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return dir
}
