import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * One-way import boundary: web must never import cli internals.
 * Matches import/export module specifiers only — never raw file text —
 * so prose that merely names a package path (e.g. inside a doc comment)
 * cannot fire this guard.
 */

const SRC_ROOT = join(__dirname, '..', '..', 'src')

// Matches `import ... from '<spec>'` / `export ... from '<spec>'`, including
// multi-line named-import blocks, anchored at the start of a source line.
const FROM_CLAUSE_RE = /^\s*(?:import|export)\b[^'"]*?\bfrom\s*(['"])([^'"]+)\1/gm
// Matches bare `import '<spec>'` (no binding, no `from`).
const BARE_IMPORT_RE = /^\s*import\s*(['"])([^'"]+)\1/gm
// Matches dynamic `import('<spec>')` anywhere in the file.
const DYNAMIC_IMPORT_RE = /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g

interface Violation {
  file: string
  specifier: string
}

function extractSpecifiers(source: string): string[] {
  const specifiers = new Set<string>()
  for (const re of [FROM_CLAUSE_RE, BARE_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0
    let match = re.exec(source)
    while (match !== null) {
      specifiers.add(match[2])
      match = re.exec(source)
    }
  }
  return [...specifiers]
}

/** True if `specifier` reaches into the cli package, by either reach form. */
function reachesIntoCli(specifier: string): boolean {
  // Both names: `@attalabs/vinaya` is the published package (vinaya-cli-v1
  // task 9, #700); `@atta/vinaya-cli` was its workspace name before that
  // rename and is kept so an import written against the old name is still
  // caught rather than silently allowed.
  if (/^@attalabs\/vinaya(\/|$)/.test(specifier)) return true
  if (/^@atta\/vinaya-cli(\/|$)/.test(specifier)) return true
  if (/^(\.\.\/)+cli(\/|$)/.test(specifier)) return true
  return false
}

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      walk(full, files)
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

function findViolations(root: string): Violation[] {
  const violations: Violation[] = []
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf-8')
    for (const specifier of extractSpecifiers(source)) {
      if (reachesIntoCli(specifier)) {
        violations.push({ file: relative(root, file), specifier })
      }
    }
  }
  return violations
}

describe('import boundary: web must not import cli', () => {
  it('detects a named workspace import into cli, under both the current and former package name', () => {
    expect(reachesIntoCli('@attalabs/vinaya')).toBe(true)
    expect(reachesIntoCli('@atta/vinaya-cli')).toBe(true)
  })

  it('detects a named subpath import into cli', () => {
    expect(reachesIntoCli('@attalabs/vinaya/lib/config')).toBe(true)
    expect(reachesIntoCli('@atta/vinaya-cli/lib/config')).toBe(true)
  })

  it('detects a relative escape into cli', () => {
    expect(reachesIntoCli('../cli/src/lib/config')).toBe(true)
    expect(reachesIntoCli('../../cli/src/lib/config')).toBe(true)
  })

  it('extracts the specifier from an import/export statement, not raw text', () => {
    expect(extractSpecifiers(`import { x } from '@atta/vinaya-cli'`)).toContain('@atta/vinaya-cli')
    expect(extractSpecifiers(`import { loadConfig } from '../../cli/src/lib/config'`)).toContain(
      '../../cli/src/lib/config'
    )
  })

  it('does not fire on prose that merely mentions a package path', () => {
    const prose = "'The router lives at packages/example-router/src/index.ts, not a real import.'"
    const specifiers = extractSpecifiers(prose)
    expect(specifiers.some(reachesIntoCli)).toBe(false)
  })

  it('does not fire on prose in a file that opens with a side-effect import', () => {
    const src = `import 'server-only'\n/**\n * Config is loaded from '../../cli/src/lib/config' by the CLI.\n */\n`
    expect(extractSpecifiers(src).some(reachesIntoCli)).toBe(false)
  })

  it('finds no cross-import from web into cli in the real source tree', () => {
    const violations = findViolations(SRC_ROOT)
    const message = violations.map((v) => `${v.file} imports '${v.specifier}'`).join('\n')
    expect(violations, `web imports cli internals:\n${message}`).toHaveLength(0)
  })
})
