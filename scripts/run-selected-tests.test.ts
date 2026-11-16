import { describe, expect, it } from 'bun:test'
import { type GroupCommand, planCommands, summarize } from './run-selected-tests'

/**
 * The selected-test run's rules, on small `test-selection` command documents
 * written inline. Neither the library, bun nor vitest is started here.
 */

function group(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mcp@default',
    runner: 'bun',
    cwd: 'apps/herald-ai/mcp',
    args: ['./src/tools/parse-cv.test.ts'],
    exclude: [],
    tests: ['apps/herald-ai/mcp/src/tools/parse-cv.test.ts'],
    ...overrides
  }
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    schema: 'test-selection-command',
    schemaVersion: 1,
    base: 'a'.repeat(40),
    head: 'b'.repeat(40),
    tests: [],
    groups: [],
    ungrouped: [],
    problems: [],
    fallbacks: [],
    leftOut: { packages: [], tests: [] },
    ...overrides
  }
}

const VITEST_GROUP = group({
  id: '@atta/auth@default',
  runner: 'vitest',
  cwd: 'packages/auth',
  args: ['src/__tests__/api-key-auth.test.ts'],
  tests: ['packages/auth/src/__tests__/api-key-auth.test.ts']
})

describe('planCommands', () => {
  it('builds `bun test` with the group args in the group folder for a bun group', () => {
    expect(planCommands(plan({ groups: [group()] }))).toEqual({
      ok: true,
      commands: [
        {
          id: 'mcp@default',
          runner: 'bun',
          cwd: 'apps/herald-ai/mcp',
          command: 'bun',
          args: ['test', './src/tools/parse-cv.test.ts'],
          testFiles: 1
        }
      ]
    })
  })

  it('builds `bunx vitest run` with the group args in the group folder for a vitest group', () => {
    expect(planCommands(plan({ groups: [VITEST_GROUP] }))).toEqual({
      ok: true,
      commands: [
        {
          id: '@atta/auth@default',
          runner: 'vitest',
          cwd: 'packages/auth',
          command: 'bunx',
          args: ['vitest', 'run', 'src/__tests__/api-key-auth.test.ts'],
          testFiles: 1
        }
      ]
    })
  })

  it('passes a group exclude to each runner', () => {
    const result = planCommands(
      plan({
        groups: [
          group({ args: [], exclude: ['./src/slow.test.ts'] }),
          { ...VITEST_GROUP, args: [], exclude: ['src/x.test.ts'] }
        ]
      })
    )
    expect(result.ok && result.commands.map((command) => command.args)).toEqual([
      ['test', '--path-ignore-patterns=./src/slow.test.ts'],
      ['vitest', 'run', '--exclude', 'src/x.test.ts']
    ])
  })

  it('returns no command for the empty plan', () => {
    expect(planCommands(plan())).toEqual({ ok: true, commands: [] })
  })

  it('ignores fallbacks and leftOut', () => {
    const result = planCommands(
      plan({
        groups: [group()],
        fallbacks: [{ id: 'unattributed', reason: 'r', paths: ['package.json'] }],
        leftOut: {
          packages: [{ dir: '.', name: 'root', reason: 'other-runner', script: 'turbo test' }],
          tests: ['x.test.ts']
        }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('refuses a plan with ungrouped tests and names them', () => {
    const result = planCommands(plan({ groups: [group()], ungrouped: ['packages/x/a.test.ts'] }))
    expect(result).toEqual({ ok: false, reasons: ['ungrouped test: packages/x/a.test.ts'] })
  })

  it('refuses a plan with problems and names them', () => {
    const problem = { kind: 'outside-suite', path: 'packages/y/b.test.ts' }
    const result = planCommands(plan({ problems: [problem] }))
    expect(result).toEqual({ ok: false, reasons: [`problem: ${JSON.stringify(problem)}`] })
  })

  it('refuses a group whose runner is neither bun nor vitest', () => {
    const result = planCommands(plan({ groups: [group(), group({ id: 'web@jest', runner: 'jest' })] }))
    expect(result).toEqual({ ok: false, reasons: ['group web@jest names runner "jest", expected "bun" or "vitest"'] })
  })

  it('refuses a document of another schema or version', () => {
    for (const document of [plan({ schema: 'something-else' }), plan({ schemaVersion: 2 }), null, 'text']) {
      const result = planCommands(document)
      expect(result.ok).toBe(false)
      expect(!result.ok && result.reasons).toHaveLength(1)
    }
    const result = planCommands(plan({ schemaVersion: 2 }))
    expect(!result.ok && result.reasons[0]).toContain('expected "test-selection-command" version 1')
  })
})

describe('summarize', () => {
  const bun: GroupCommand = {
    id: 'mcp@default',
    runner: 'bun',
    cwd: 'apps/herald-ai/mcp',
    command: 'bun',
    args: ['test', './src/tools/parse-cv.test.ts'],
    testFiles: 1
  }
  const vitest: GroupCommand = {
    id: 'auth@default',
    runner: 'vitest',
    cwd: 'packages/auth',
    command: 'bunx',
    args: ['vitest', 'run', 'a.test.ts', 'b.test.ts'],
    testFiles: 2
  }

  it('exits 0 when every group passed, with one line per group and a totals line', () => {
    expect(
      summarize([
        { command: bun, passed: true },
        { command: vitest, passed: true }
      ])
    ).toEqual({
      lines: [
        'passed  bun  apps/herald-ai/mcp  1 test file',
        'passed  vitest  packages/auth  2 test files',
        'selected tests: 2 groups and 3 test files run, 0 groups failed'
      ],
      exitCode: 0
    })
  })

  it('exits 0 with a zero totals line when no group ran', () => {
    expect(summarize([])).toEqual({
      lines: ['selected tests: 0 groups and 0 test files run, 0 groups failed'],
      exitCode: 0
    })
  })

  it('exits non-zero when a group failed and still reports every group', () => {
    const { lines, exitCode } = summarize([
      { command: bun, passed: false },
      { command: vitest, passed: true }
    ])
    expect(exitCode).toBe(1)
    expect(lines).toEqual([
      'FAILED  bun  apps/herald-ai/mcp  1 test file',
      'passed  vitest  packages/auth  2 test files',
      'selected tests: 2 groups and 3 test files run, 1 groups failed'
    ])
  })
})
