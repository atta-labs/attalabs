import { describe, expect, it } from 'bun:test'
import { buildReport, parseArguments } from './test-selection-report'

/**
 * The report's comparison rules, on small recorded documents written inline:
 * a `turbo test --affected --dry=json` listing (only the fields the report
 * reads) and a `test-selection` command document. Neither turbo nor the
 * library is started here — turbo's affected answer depends on the working
 * tree, so a live run would not be reproducible.
 */

const HEADINGS = [
  '### Turbo starts',
  '### Library requires',
  '### Turbo starts, library requires nothing',
  '### Library requires, turbo does not start',
  '### Test files no test script runs'
]

function turboTask(pkg: string, directory: string, command: string, task = 'test') {
  return { taskId: `${pkg}#${task}`, task, package: pkg, directory, command }
}

const TURBO = {
  id: 'recorded',
  version: '1',
  packages: ['@atta/ui', '@atta/engine', '@atta/db', '@atta/auth'],
  tasks: [
    turboTask('@atta/ui', 'packages/ui', 'bun test'),
    turboTask('@atta/engine', 'packages/engine', 'bun test'),
    turboTask('@atta/db', 'packages/db', '<NONEXISTENT>'),
    turboTask('@atta/auth', 'packages/auth', 'bun test'),
    turboTask('@atta/auth', 'packages/auth', 'tsc --noEmit', 'typecheck')
  ]
}

const PLAN = {
  schema: 'test-selection-command',
  schemaVersion: 1,
  base: 'a'.repeat(40),
  head: 'b'.repeat(40),
  tests: [],
  groups: [
    {
      id: 'engine@default',
      runner: 'bun',
      cwd: 'packages/engine',
      args: [],
      exclude: [],
      tests: ['packages/engine/src/a.test.ts', 'packages/engine/src/b.test.ts']
    },
    {
      id: 'engine@other',
      runner: 'bun',
      cwd: 'packages/engine',
      args: [],
      exclude: [],
      tests: ['packages/engine/src/c.test.ts']
    },
    {
      id: 'cms@default',
      runner: 'bun',
      cwd: 'packages/cms',
      args: [],
      exclude: [],
      tests: ['packages/cms/src/x.test.ts']
    },
    {
      id: 'auth@default',
      runner: 'bun',
      cwd: 'packages/auth',
      args: [],
      exclude: [],
      tests: ['packages/auth/src/y.test.ts']
    }
  ],
  ungrouped: ['apps/x/u1.test.ts', 'apps/x/u2.test.ts'],
  problems: [{ reason: 'recorded' }],
  fallbacks: [],
  leftOut: { packages: ['apps/herald-ai/web'], tests: ['scripts/z.test.ts', 'apps/herald-ai/web/tests/a.test.ts'] }
}

function lines(report: string): string[] {
  return report.split('\n')
}

/** The lines strictly between a heading (matched as a whole line) and the next heading, blank lines dropped. */
function section(report: string, heading: string): string[] {
  const all = lines(report)
  const start = all.indexOf(heading)
  expect(start).toBeGreaterThan(-1)
  const rest = all.slice(start + 1)
  const end = rest.findIndex((line) => line.startsWith('#'))
  return (end === -1 ? rest : rest.slice(0, end)).filter((line) => line !== '')
}

describe('buildReport', () => {
  const report = buildReport(TURBO, PLAN)

  it('starts with the report heading', () => {
    expect(lines(report)[0]).toBe('## Test selection report')
  })

  it('holds the five headings as whole lines, in order', () => {
    const headingLines = lines(report).filter((line) => line.startsWith('### '))
    expect(headingLines).toEqual(HEADINGS)
  })

  it('lists the folders whose test script turbo starts, sorted, without missing scripts or other tasks', () => {
    expect(section(report, '### Turbo starts')).toEqual(['- `packages/auth`', '- `packages/engine`', '- `packages/ui`'])
  })

  it('counts the required test files per folder, sorted, then the three count lines', () => {
    expect(section(report, '### Library requires')).toEqual([
      '- `packages/auth`: 1',
      '- `packages/cms`: 1',
      '- `packages/engine`: 3',
      'Ungrouped tests: 2',
      'Fallback scopes: 0',
      'Problems: 1'
    ])
  })

  it('lists the folders turbo starts in which the library requires nothing', () => {
    expect(section(report, '### Turbo starts, library requires nothing')).toEqual(['- `packages/ui`'])
  })

  it('lists the folders the library requires in which turbo starts no test script', () => {
    expect(section(report, '### Library requires, turbo does not start')).toEqual(['- `packages/cms`'])
  })

  it('lists the left-out test files sorted by path', () => {
    expect(section(report, '### Test files no test script runs')).toEqual([
      '- `apps/herald-ai/web/tests/a.test.ts`',
      '- `scripts/z.test.ts`'
    ])
  })

  it('keeps ungrouped tests out of the comparison sections', () => {
    expect(report).not.toContain('apps/x/u1.test.ts')
  })

  it('prints None for every empty section', () => {
    const empty = buildReport(
      { tasks: [] },
      { ...PLAN, groups: [], ungrouped: [], problems: [], fallbacks: [], leftOut: { packages: [], tests: [] } }
    )
    for (const heading of HEADINGS) {
      const body = section(empty, heading)
      expect(body[0]).toBe('None')
    }
    expect(section(empty, '### Library requires')).toEqual([
      'None',
      'Ungrouped tests: 0',
      'Fallback scopes: 0',
      'Problems: 0'
    ])
  })

  it('matches folders by path, not by package name', () => {
    const report2 = buildReport({ tasks: [turboTask('renamed', './packages/cms/', 'bun test')] }, PLAN)
    expect(section(report2, '### Turbo starts, library requires nothing')).toEqual(['None'])
  })

  it('refuses a document with an unknown schema or version', () => {
    expect(() => buildReport(TURBO, { ...PLAN, schema: 'something-else' })).toThrow(/test-selection-command/)
    expect(() => buildReport(TURBO, { ...PLAN, schemaVersion: 2 })).toThrow(/test-selection-command/)
  })

  it('refuses a turbo listing with no tasks', () => {
    expect(() => buildReport({}, PLAN)).toThrow(/tasks/)
  })
})

describe('parseArguments', () => {
  it('takes no arguments as the default range', () => {
    expect(parseArguments([])).toEqual({ ok: true, range: null })
  })

  it('takes both flags in either order', () => {
    expect(parseArguments(['--base', 'a', '--head', 'b'])).toEqual({ ok: true, range: { base: 'a', head: 'b' } })
    expect(parseArguments(['--head', 'b', '--base', 'a'])).toEqual({ ok: true, range: { base: 'a', head: 'b' } })
  })

  it.each([
    [['--base', 'a']],
    [['--head', 'b']],
    [['--base']],
    [['--base', 'a', '--head']],
    [['--base', 'a', '--base', 'c', '--head', 'b']],
    [['--base=a', '--head', 'b']],
    [['--base', 'a', '--head=b']],
    [['--base', 'a', '--head', 'b', 'extra']],
    [['-b', 'a']]
  ])('refuses %j', (argv) => {
    const parsed = parseArguments(argv)
    expect(parsed.ok).toBe(false)
  })
})
