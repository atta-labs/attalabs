import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Marker ↔ file-tracing coupling guard.
 *
 * Neither doctrine reader is handed a repo root: each walks up from
 * `process.cwd()` until it finds a MARKER (`ROOT_MARKER` in
 * `github-links.ts`; the `aeg-root` directory in
 * `docs/load-aeg-docs.ts`). On Vercel, only files that Next's output tracing
 * detects exist in the lambda, and a computed path is never detected — so a
 * marker that is not declared in `outputFileTracingIncludes` is simply absent
 * at runtime, the walk throws, and the routes that call it 500. Locally every
 * marker resolves, so nothing reproduces there and the build stays green:
 * this failure is invisible until production serves it.
 *
 * That has now happened twice. #649 was the first tracing declaration
 * existing at all; #664 then renamed `findRepoRoot()`'s marker to
 * `vinaya.config.json` AND split off `.vinaya/projects.md` as
 * `read-root.ts`'s own marker, updated the include list for the second, and
 * never declared the first — a commit that looked complete, built green, and
 * left the two doctrine-reading routes (then `/the-harness` and `/docs`, today
 * `/docs/harness` and `/docs/reference`) returning 500 in production only (#707).
 *
 * Constants are parsed out of source rather than imported because these
 * modules are `server-only` and reach `node:child_process` transitively —
 * the same static-source discipline `import-boundary.test.ts` and
 * `(site)/start/_lib/stages.test.ts` already use in this app.
 *
 * The guard is written to fail LOUDLY rather than narrow silently, because a
 * guard that passes while the coupling is broken is worse than no guard: it
 * licenses the belief that this is covered. Concretely, it refuses to run
 * rather than skip when it cannot parse what it is checking, it discovers
 * upward walks instead of trusting a hand-written list, and it resolves
 * declared paths instead of pattern-matching them (`'../vinaya.config.json'`
 * points at `apps/vinaya/vinaya.config.json`, traces nothing, and must not
 * be mistaken for the repo-root declaration).
 */

const WEB_ROOT = join(__dirname, '..', '..')
const SRC_ROOT = join(WEB_ROOT, 'src')
const REPO_ROOT = join(WEB_ROOT, '..', '..', '..')

function read(relPath: string): string {
  return readFileSync(join(WEB_ROOT, relPath), 'utf8')
}

/**
 * Pulls `const <name> = '<value>'` out of a source file, requiring the whole
 * right-hand side to be one string literal. A concatenated or computed marker
 * is rejected rather than silently truncated to its first fragment.
 */
function constant(source: string, name: string): string {
  const line = source.match(new RegExp(`\\bconst\\s+${name}\\s*=\\s*(.+)$`, 'm'))
  if (!line) {
    throw new Error(
      `tracing-markers: could not find \`const ${name}\`. If it was renamed or moved, update this ` +
        'guard in the same commit — it exists to catch exactly that change.'
    )
  }
  const rhs = (line[1] as string).trim().replace(/;$/, '')
  const literal = rhs.match(/^(['"])([^'"]+)\1$/)
  if (!literal) {
    throw new Error(
      `tracing-markers: \`${name}\` is no longer a plain string literal (got \`${rhs}\`). This guard ` +
        'can only verify a literal marker; make it a literal, or teach the guard to evaluate it.'
    )
  }
  return literal[2] as string
}

/** The literal directory name a `path.join(dir, '<name>')` walk looks for. */
function joinedDirLiteral(source: string, label: string): string {
  const match = source.match(/path\.join\(\s*dir\s*,\s*(['"])([^'"]+)\1\s*\)/)
  if (!match) {
    throw new Error(`tracing-markers: could not find the \`path.join(dir, '…')\` marker in ${label}.`)
  }
  return match[2] as string
}

/**
 * `outputFileTracingIncludes` parsed as route key → declared entries. Parsing
 * per key rather than flattening the block matters the moment the key is
 * narrowed from `'/**'` to specific routes: a marker declared under one route
 * and not another re-opens the original 500, and a flattened check would
 * still be green.
 */
function tracingConfig(): Map<string, string[]> {
  const config = read('next.config.ts')
  const block = config.match(/outputFileTracingIncludes:\s*\{([\s\S]*?)\n\s*\}/)
  if (!block) {
    throw new Error('tracing-markers: no `outputFileTracingIncludes` block found in next.config.ts')
  }
  const byKey = new Map<string, string[]>()
  const entryRe = /(['"])([^'"]+)\1\s*:\s*\[([^\]]*)\]/g
  let match = entryRe.exec(block[1] as string)
  while (match !== null) {
    const paths = [...(match[3] as string).matchAll(/(['"])([^'"]+)\1/g)].map((m) => m[2] as string)
    byKey.set(match[2] as string, paths)
    match = entryRe.exec(block[1] as string)
  }
  if (byKey.size === 0) {
    throw new Error('tracing-markers: `outputFileTracingIncludes` parsed to zero route keys — parser is stale.')
  }
  return byKey
}

/**
 * Entries are written relative to this app directory, so they are resolved
 * against it and compared as real paths. A wrong depth (`'../x'`) resolves
 * somewhere that is not the repo root and is correctly rejected.
 */
function declaresPath(entries: string[], absoluteTarget: string): boolean {
  return entries.some((entry) => resolve(WEB_ROOT, entry) === absoluteTarget)
}

/** A directory marker is only satisfied by a recursive glob over that exact directory. */
function declaresDirectory(entries: string[], absoluteDir: string): boolean {
  return entries.some((entry) => entry.endsWith('/**') && resolve(WEB_ROOT, entry.slice(0, -3)) === absoluteDir)
}

/** Every file under `src/` that walks up from `process.cwd()`. */
function walkingFiles(): string[] {
  const found: string[] = []
  const visit = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        visit(full)
        continue
      }
      if (!name.endsWith('.ts') && !name.endsWith('.tsx')) continue
      if (name.endsWith('.test.ts')) continue
      // Matches any mention of `process.cwd()`, not one spelling of the walk:
      // keying discovery to `let dir = …` let `let current = process.cwd()` and
      // `let dir = resolve(process.cwd())` pass unseen. The wider match yields
      // the same three files today and cannot silently miss a fourth.
      if (/process\.cwd\(\)/.test(readFileSync(full, 'utf8'))) {
        found.push(relative(SRC_ROOT, full))
      }
    }
  }
  visit(SRC_ROOT)
  return found.sort()
}

const githubLinks = read('src/lib/github-links.ts')
const loadAegDocs = read('src/lib/docs/load-aeg-docs.ts')

/**
 * Every upward walk, and the marker each one needs present at the repo root.
 *
 * `repo-state/read-root.ts`'s `.vinaya/projects.md` walk is deliberately
 * absent: the registry is read only by Studio's tranche board, which does not
 * live in this app. The `walkingFiles()` guard below is what keeps that an
 * observation rather than an assumption — the moment a third walk appears in
 * `src/`, it fails until it is listed here and declared in `next.config.ts`.
 */
const WALKS = [
  {
    file: 'lib/github-links.ts',
    label: 'ROOT_MARKER',
    marker: constant(githubLinks, 'ROOT_MARKER'),
    kind: 'file' as const
  },
  {
    file: 'lib/docs/load-aeg-docs.ts',
    label: "path.join(dir, '…')",
    marker: joinedDirLiteral(loadAegDocs, 'load-aeg-docs.ts'),
    kind: 'directory' as const
  }
]

describe('repo-root markers are declared for output file tracing', () => {
  it('knows about every upward walk in src/', () => {
    expect(
      walkingFiles(),
      'a file walks up from process.cwd() but is not covered by this guard. Add its marker to ' +
        'WALKS and declare that marker in next.config.ts, or it will 500 in production only.'
    ).toEqual(WALKS.map((w) => w.file).sort())
  })

  it("declares tracing under a key covering every route ('/**')", () => {
    expect(
      [...tracingConfig().keys()],
      "the tracing key is no longer '/**', so declaring a marker somewhere no longer implies it is " +
        'declared for the routes that walk. Teach this guard which routes each marker must be traced for.'
    ).toContain('/**')
  })

  for (const walk of WALKS) {
    it(`traces ${walk.file} ${walk.label} (${walk.marker})`, () => {
      const entries = tracingConfig().get('/**') ?? []
      const target = join(REPO_ROOT, walk.marker)
      const declared = walk.kind === 'directory' ? declaresDirectory(entries, target) : declaresPath(entries, target)
      expect(
        declared,
        `\`${walk.marker}\` is walked for at runtime but is not declared in next.config.ts's ` +
          `outputFileTracingIncludes (resolved against ${WEB_ROOT}). Add it in this same commit, or ` +
          'the routes that walk for it will 500 in production while the build stays green.'
      ).toBe(true)
    })

    it(`${walk.file} ${walk.label} names something that exists (${walk.marker})`, () => {
      expect(
        existsSync(join(REPO_ROOT, walk.marker)),
        `\`${walk.marker}\` does not exist at the repo root, so the upward walk can never succeed — ` +
          'in production or locally.'
      ).toBe(true)
    })
  }
})
