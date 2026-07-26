import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * one-way import boundary: cli must never import web internals.
 * Matches import/export module specifiers only — never raw file text.
 */

const CLI_ROOT = join(import.meta.dir, '..')
const SCAN_DIRS = [join(CLI_ROOT, 'src'), join(CLI_ROOT, 'tests')]

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
      specifiers.add(match[2] as string)
      match = re.exec(source)
    }
  }
  return [...specifiers]
}

/** True if `specifier` reaches into the web package, by either reach form. */
function reachesIntoWeb(specifier: string): boolean {
  if (/^@atta\/vinaya-web(\/|$)/.test(specifier)) return true
  if (/^(\.\.\/)+web(\/|$)/.test(specifier)) return true
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

function findViolations(roots: string[]): Violation[] {
  const violations: Violation[] = []
  for (const root of roots) {
    for (const file of walk(root)) {
      const source = readFileSync(file, 'utf-8')
      for (const specifier of extractSpecifiers(source)) {
        if (reachesIntoWeb(specifier)) {
          violations.push({ file: relative(CLI_ROOT, file), specifier })
        }
      }
    }
  }
  return violations
}

describe('import boundary: cli must not import web', () => {
  it('detects a named workspace import into web', () => {
    expect(reachesIntoWeb('@atta/vinaya-web')).toBe(true)
  })

  it('detects a named subpath import into web', () => {
    expect(reachesIntoWeb('@atta/vinaya-web/src/lib/forge')).toBe(true)
  })

  it('detects a relative escape into web', () => {
    expect(reachesIntoWeb('../web/src/lib/forge')).toBe(true)
    expect(reachesIntoWeb('../../web/src/lib/forge')).toBe(true)
  })

  it('extracts the specifier from an import/export statement, not raw text', () => {
    expect(extractSpecifiers(`import { x } from '@atta/vinaya-web'`)).toContain('@atta/vinaya-web')
    expect(extractSpecifiers(`import { loadSnapshot } from '../../web/src/lib/forge'`)).toContain(
      '../../web/src/lib/forge'
    )
  })

  it('does not fire on prose that merely mentions apps/vinaya/web', () => {
    const prose = "'apps/vinaya/web is the Portal + Studio site.'"
    const specifiers = extractSpecifiers(prose)
    expect(specifiers.some(reachesIntoWeb)).toBe(false)
  })

  it('does not fire on prose in a file that opens with a side-effect import', () => {
    const src = `import 'server-only'\n/**\n * Config is loaded from '../../web/src/lib/forge' by the CLI.\n */\n`
    expect(extractSpecifiers(src).some(reachesIntoWeb)).toBe(false)
  })

  it('finds no cross-import from cli into web in the real source tree', () => {
    const violations = findViolations(SCAN_DIRS)
    const message = violations.map((v) => `${v.file} imports '${v.specifier}'`).join('\n')
    expect(violations.length, `cli imports web internals:\n${message}`).toBe(0)
  })
})
