/**
 * Test selection report — what turbo's affected run starts for a change,
 * beside what the published `@attalabs/test-selection` library requires for
 * the same change.
 *
 * A report only: it decides nothing about which tests run. The pull-request
 * CI job keeps running `turbo test --affected`; this script prints the two
 * answers side by side so the difference is visible on every pull request.
 *
 *   bun scripts/test-selection-report.ts                      # merge base of origin/main and HEAD .. HEAD
 *   bun scripts/test-selection-report.ts --base <commit> --head <commit>
 *
 * Turbo's side: `turbo test --affected --dry=json` with `TURBO_SCM_BASE` and
 * `TURBO_SCM_HEAD` set on its process, keeping the `test` tasks whose command
 * exists. The library's side: the JSON document `test-selection` prints
 * (`schema: test-selection-command`, `schemaVersion: 1`), started under Bun.
 * Packages are compared by folder path — turbo names packages, the library
 * names folders.
 *
 * Exits 0 when it printed a report; otherwise prints one message of its own
 * on standard error, prints no report, and exits non-zero.
 */

import { spawnSync } from 'node:child_process'

const MAX_BUFFER = 512 * 1024 * 1024
const NONEXISTENT = '<NONEXISTENT>'

export type Range = { base: string; head: string }

export type ParsedArguments = { ok: true; range: Range | null } | { ok: false; message: string }

/**
 * `--base <commit> --head <commit>`, both or neither. A flag takes the next
 * argument as its value. `range: null` means: use the defaults.
 */
export function parseArguments(argv: readonly string[]): ParsedArguments {
  if (argv.length === 0) return { ok: true, range: null }
  const values: { base?: string; head?: string } = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (arg.startsWith('--base=') || arg.startsWith('--head=')) {
      return { ok: false, message: `write ${arg.slice(0, 6)} and its value as two arguments, not ${arg}` }
    }
    if (arg !== '--base' && arg !== '--head') {
      return { ok: false, message: `unknown argument: ${arg}` }
    }
    const key = arg === '--base' ? 'base' : 'head'
    if (values[key] !== undefined) return { ok: false, message: `${arg} is given twice` }
    const value = argv[i + 1]
    if (value === undefined || value === '') return { ok: false, message: `${arg} has no value after it` }
    values[key] = value
    i++
  }
  if (values.base === undefined) return { ok: false, message: '--head is given without --base' }
  if (values.head === undefined) return { ok: false, message: '--base is given without --head' }
  return { ok: true, range: { base: values.base, head: values.head } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringList(value: unknown, what: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${what} is not a list of strings`)
  }
  return value
}

function anyList(value: unknown, what: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${what} is not a list`)
  return value
}

/** A repository-relative folder: no `./` prefix, no trailing slash, `.` for the root. */
function normalizeFolder(folder: string): string {
  let out = folder.replace(/\\/g, '/')
  while (out.startsWith('./')) out = out.slice(2)
  out = out.replace(/\/+$/, '')
  return out === '' ? '.' : out
}

function byPath(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

/** The package folders whose `test` script turbo's dry run would start. */
export function turboTestFolders(turbo: unknown): string[] {
  if (!isRecord(turbo)) throw new Error("turbo's listing is not a JSON object")
  const tasks = anyList(turbo.tasks, "turbo's listing `tasks`")
  const folders = new Set<string>()
  for (const task of tasks) {
    if (!isRecord(task)) throw new Error("turbo's listing holds a task that is not an object")
    if (task.task !== 'test') continue
    if (task.command === NONEXISTENT) continue
    if (typeof task.directory !== 'string') throw new Error("turbo's listing holds a test task with no `directory`")
    folders.add(normalizeFolder(task.directory))
  }
  return [...folders].sort(byPath)
}

type LibraryPlan = {
  required: Map<string, number>
  ungrouped: number
  fallbacks: number
  problems: number
  leftOutTests: string[]
}

/** Reads the library's command document; refuses any schema but `test-selection-command` version 1. */
export function readLibraryPlan(plan: unknown): LibraryPlan {
  if (!isRecord(plan)) throw new Error("the library's plan is not a JSON object")
  if (plan.schema !== 'test-selection-command' || plan.schemaVersion !== 1) {
    throw new Error(
      `the library's plan has schema ${JSON.stringify(plan.schema)} version ${JSON.stringify(plan.schemaVersion)}, ` +
        'expected "test-selection-command" version 1'
    )
  }
  const perFolder = new Map<string, Set<string>>()
  for (const group of anyList(plan.groups, "the library's plan `groups`")) {
    if (!isRecord(group) || typeof group.cwd !== 'string') {
      throw new Error("the library's plan holds a group with no `cwd`")
    }
    const folder = normalizeFolder(group.cwd)
    const tests = perFolder.get(folder) ?? new Set<string>()
    for (const test of stringList(group.tests, "a group's `tests`")) tests.add(test)
    perFolder.set(folder, tests)
  }
  const required = new Map<string, number>()
  for (const [folder, tests] of perFolder) if (tests.size > 0) required.set(folder, tests.size)
  if (!isRecord(plan.leftOut)) throw new Error("the library's plan has no `leftOut` object")
  return {
    required,
    ungrouped: anyList(plan.ungrouped, "the library's plan `ungrouped`").length,
    fallbacks: anyList(plan.fallbacks, "the library's plan `fallbacks`").length,
    problems: anyList(plan.problems, "the library's plan `problems`").length,
    leftOutTests: [...new Set(stringList(plan.leftOut.tests, "the library's plan `leftOut.tests`"))].sort(byPath)
  }
}

function listLines(entries: readonly string[]): string[] {
  return entries.length === 0 ? ['None'] : entries.map((entry) => `- \`${entry}\``)
}

/**
 * The comparison: turbo's dry-run listing and the library's command document,
 * both already parsed, into the Markdown report.
 */
export function buildReport(turbo: unknown, plan: unknown): string {
  const turboFolders = turboTestFolders(turbo)
  const library = readLibraryPlan(plan)
  const turboSet = new Set(turboFolders)
  const requiredFolders = [...library.required.keys()].sort(byPath)

  const requiresLines =
    requiredFolders.length === 0
      ? ['None']
      : requiredFolders.map((folder) => `- \`${folder}\`: ${library.required.get(folder)}`)

  const lines = [
    '## Test selection report',
    '',
    '### Turbo starts',
    '',
    ...listLines(turboFolders),
    '',
    '### Library requires',
    '',
    ...requiresLines,
    '',
    `Ungrouped tests: ${library.ungrouped}`,
    `Fallback scopes: ${library.fallbacks}`,
    `Problems: ${library.problems}`,
    '',
    '### Turbo starts, library requires nothing',
    '',
    ...listLines(turboFolders.filter((folder) => !library.required.has(folder))),
    '',
    '### Library requires, turbo does not start',
    '',
    ...listLines(requiredFolders.filter((folder) => !turboSet.has(folder))),
    '',
    '### Test files no test script runs',
    '',
    ...listLines(library.leftOutTests)
  ]
  return `${lines.join('\n')}\n`
}

function run(command: string, args: readonly string[], what: string, env?: NodeJS.ProcessEnv): string {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    env: env ?? process.env,
    stdio: ['ignore', 'pipe', 'inherit']
  })
  if (result.error) throw new Error(`${what} could not be started: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`${what} exited with ${result.status ?? result.signal}`)
  return result.stdout
}

function parseJson(text: string, what: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`${what} is not JSON`)
  }
}

function defaultRange(): Range {
  const base = run('git', ['merge-base', 'origin/main', 'HEAD'], 'git merge-base origin/main HEAD').trim()
  if (base === '') throw new Error('git merge-base origin/main HEAD printed no commit')
  return { base, head: 'HEAD' }
}

function main(argv: readonly string[]): number {
  const parsed = parseArguments(argv)
  if (!parsed.ok) {
    console.error(`test-selection-report: ${parsed.message}`)
    console.error('usage: bun scripts/test-selection-report.ts [--base <commit> --head <commit>]')
    return 2
  }
  try {
    const range = parsed.range ?? defaultRange()
    const turbo = parseJson(
      run('bunx', ['turbo', 'test', '--affected', '--dry=json'], "turbo's listing", {
        ...process.env,
        TURBO_SCM_BASE: range.base,
        TURBO_SCM_HEAD: range.head
      }),
      "turbo's listing"
    )
    const plan = parseJson(
      run('bunx', ['--bun', 'test-selection', '--base', range.base, '--head', range.head], "the library's plan"),
      "the library's plan"
    )
    process.stdout.write(buildReport(turbo, plan))
    return 0
  } catch (error) {
    console.error(`test-selection-report: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)))
