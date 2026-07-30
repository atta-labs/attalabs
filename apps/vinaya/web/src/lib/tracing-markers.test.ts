import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Marker ↔ file-tracing coupling guard.
 *
 * Neither doctrine reader is handed a repo root: each walks up from
 * `process.cwd()` until it finds a MARKER file (`ROOT_MARKER` in
 * `github-links.ts`; `CONFIG_DIR`/`REGISTRY_FILE` in
 * `repo-state/read-root.ts`). On Vercel, only files that Next's output
 * tracing detects exist in the lambda, and a computed path is never
 * detected — so a marker that is not declared in `outputFileTracingIncludes`
 * is simply absent at runtime, the walk throws, and the routes that call it
 * 500. Locally every marker resolves, so nothing reproduces there and the
 * build stays green: this failure is invisible until production serves it.
 *
 * That has now happened twice. #649 was the first tracing declaration
 * existing at all; #664 then renamed `findRepoRoot()`'s marker to
 * `vinaya.config.json` AND split off `.vinaya/projects.md` as
 * `read-root.ts`'s own marker, updated the include list for the second, and
 * never declared the first — a commit that looked complete, built green, and
 * left `/the-harness` and `/docs` returning 500 in production only (#707).
 *
 * Three prose warnings already existed by the end of that fix. Prose is what
 * failed; this test is the check that could not. It parses the constants out
 * of source rather than importing them, because both modules are
 * `server-only` and reach `node:child_process` transitively — the same
 * static-source discipline `import-boundary.test.ts` and
 * `(site)/start/_lib/stages.test.ts` already use in this app.
 */

const WEB_ROOT = join(__dirname, '..', '..')
const REPO_ROOT = join(WEB_ROOT, '..', '..', '..')

function read(relPath: string): string {
  return readFileSync(join(WEB_ROOT, relPath), 'utf8')
}

/** Pulls `const <name> = '<value>'` out of a source file. */
function constant(source: string, name: string): string {
  const match = source.match(new RegExp(`\\bconst\\s+${name}\\s*=\\s*(['"])([^'"]+)\\1`))
  if (!match) {
    throw new Error(
      `tracing-markers: could not find \`const ${name}\` in its source file. If the constant was renamed, ` +
        'update this guard in the same commit — it exists to catch exactly that change.'
    )
  }
  return match[2] as string
}

/**
 * Every path declared in `next.config.ts`'s `outputFileTracingIncludes`,
 * normalised to be repo-root-relative (the entries are written relative to
 * `apps/vinaya/web`, so `../../../x` means `<repo root>/x`).
 */
function tracedPaths(): string[] {
  const config = read('next.config.ts')
  const block = config.match(/outputFileTracingIncludes:\s*\{([\s\S]*?)\}\s*,/)
  if (!block) throw new Error('tracing-markers: no `outputFileTracingIncludes` block found in next.config.ts')
  return [...(block[1] as string).matchAll(/(['"])([^'"]+)\1/g)]
    .map((m) => m[2] as string)
    .filter((entry) => entry.startsWith('../'))
    .map((entry) => entry.replace(/^(?:\.\.\/)+/, ''))
}

describe('repo-root markers are declared for output file tracing', () => {
  const markers: { label: string; path: string }[] = [
    {
      label: 'github-links.ts ROOT_MARKER',
      path: constant(read('src/lib/github-links.ts'), 'ROOT_MARKER')
    },
    {
      label: 'read-root.ts CONFIG_DIR/REGISTRY_FILE',
      path: `${constant(read('src/lib/repo-state/read-root.ts'), 'CONFIG_DIR')}/${constant(
        read('src/lib/repo-state/read-root.ts'),
        'REGISTRY_FILE'
      )}`
    }
  ]

  for (const marker of markers) {
    it(`traces ${marker.label} (${marker.path})`, () => {
      expect(
        tracedPaths(),
        `\`${marker.path}\` is walked for at runtime but is not in next.config.ts's ` +
          'outputFileTracingIncludes. Add it there in this same commit, or the routes that ' +
          'walk for it will 500 in production while the build stays green.'
      ).toContain(marker.path)
    })

    it(`${marker.label} names a file that exists (${marker.path})`, () => {
      expect(
        existsSync(join(REPO_ROOT, marker.path)),
        `\`${marker.path}\` does not exist at the repo root, so the upward walk can never ` +
          'succeed — in production or locally.'
      ).toBe(true)
    })
  }

  it('traces the doctrine directory the markers are used to locate', () => {
    expect(tracedPaths().some((entry) => entry.startsWith('aeg-root/'))).toBe(true)
  })
})
