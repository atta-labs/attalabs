/**
 * Selected-test run — starts the tests the published `@attalabs/test-selection`
 * library requires for a change, one runner start per group of its plan.
 *
 *   bun scripts/run-selected-tests.ts     # merge base of origin/main and HEAD .. HEAD
 *
 * `.vinaya/test-runner` starts it on the push that follows both reviewers'
 * approval; the pull-request CI job does not start it.
 *
 * The library's command is started as the report script starts it,
 * `bunx --bun test-selection --base <commit> --head <commit>`, and its JSON
 * document is checked by `readLibraryPlan` (schema `test-selection-command`,
 * version 1). Each group is started in its `cwd` with its `args`: `bun test`
 * for runner `bun`, `bunx vitest run` for runner `vitest`; a group's
 * `exclude` entries are passed as `--path-ignore-patterns` (bun) or
 * `--exclude` (vitest).
 *
 * Exits 0 when every group passed or the plan requires no test. Exits 1 when
 * a group failed (the remaining groups still run), when the plan lists
 * ungrouped tests or problems, when a group names another runner, when the
 * document is not the expected schema and version, or when the library's
 * command failed. `fallbacks` and `leftOut` do not affect the exit status.
 */

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { readLibraryPlan } from './test-selection-report'

const MAX_BUFFER = 512 * 1024 * 1024

export type GroupCommand = {
  id: string
  runner: 'bun' | 'vitest'
  /** The group's folder, relative to the repository root. */
  cwd: string
  command: string
  args: string[]
  /** The number of test files the group runs. */
  testFiles: number
}

export type RunPlan = { ok: true; commands: GroupCommand[] } | { ok: false; reasons: string[] }

export type GroupResult = { command: GroupCommand; passed: boolean }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function nameOf(entry: unknown): string {
  return typeof entry === 'string' ? entry : JSON.stringify(entry)
}

/**
 * The library's document, already parsed, into one command per group. Starts
 * nothing. Refuses — with every reason it found — a document of another
 * schema or version, ungrouped tests, problems, and a group whose runner is
 * not `bun` or `vitest`.
 */
export function planCommands(document: unknown): RunPlan {
  try {
    readLibraryPlan(document)
  } catch (error) {
    return { ok: false, reasons: [error instanceof Error ? error.message : String(error)] }
  }
  const plan = document as Record<string, unknown>
  const reasons: string[] = []
  for (const test of plan.ungrouped as unknown[]) reasons.push(`ungrouped test: ${nameOf(test)}`)
  for (const problem of plan.problems as unknown[]) reasons.push(`problem: ${nameOf(problem)}`)

  const commands: GroupCommand[] = []
  for (const group of plan.groups as unknown[]) {
    if (!isRecord(group) || typeof group.cwd !== 'string' || !isStringList(group.tests)) {
      reasons.push(`a group is not an object with \`cwd\` and \`tests\`: ${nameOf(group)}`)
      continue
    }
    const id = typeof group.id === 'string' ? group.id : group.cwd
    if (!isStringList(group.args)) {
      reasons.push(`group ${id} has no \`args\` list of strings`)
      continue
    }
    const exclude = group.exclude === undefined ? [] : group.exclude
    if (!isStringList(exclude)) {
      reasons.push(`group ${id} has an \`exclude\` that is not a list of strings`)
      continue
    }
    const base = { id, cwd: group.cwd, testFiles: group.tests.length }
    if (group.runner === 'bun') {
      const ignore = exclude.map((pattern) => `--path-ignore-patterns=${pattern}`)
      commands.push({ ...base, runner: 'bun', command: 'bun', args: ['test', ...ignore, ...group.args] })
    } else if (group.runner === 'vitest') {
      const ignore = exclude.flatMap((pattern) => ['--exclude', pattern])
      commands.push({ ...base, runner: 'vitest', command: 'bunx', args: ['vitest', 'run', ...ignore, ...group.args] })
    } else {
      reasons.push(`group ${id} names runner ${JSON.stringify(group.runner)}, expected "bun" or "vitest"`)
    }
  }
  return reasons.length > 0 ? { ok: false, reasons } : { ok: true, commands }
}

/** One line per group, a totals line last, and the exit status: 1 when any group failed. */
export function summarize(results: readonly GroupResult[]): { lines: string[]; exitCode: number } {
  const lines = results.map(
    ({ command, passed }) =>
      `${passed ? 'passed' : 'FAILED'}  ${command.runner}  ${command.cwd}  ${command.testFiles} test file${command.testFiles === 1 ? '' : 's'}`
  )
  const failed = results.filter((result) => !result.passed).length
  const files = results.reduce((sum, { command }) => sum + command.testFiles, 0)
  lines.push(`selected tests: ${results.length} groups and ${files} test files run, ${failed} groups failed`)
  return { lines, exitCode: failed > 0 ? 1 : 0 }
}

function git(args: readonly string[]): string {
  const result = spawnSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
  if (result.error) throw new Error(`git ${args.join(' ')} could not be started: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} exited with ${result.status ?? result.signal}`)
  const out = result.stdout.trim()
  if (out === '') throw new Error(`git ${args.join(' ')} printed nothing`)
  return out
}

function libraryDocument(base: string, head: string): unknown {
  const result = spawnSync('bunx', ['--bun', 'test-selection', '--base', base, '--head', head], {
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'inherit']
  })
  if (result.error) throw new Error(`the library's command could not be started: ${result.error.message}`)
  if (result.status !== 0) throw new Error(`the library's command exited with ${result.status ?? result.signal}`)
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error("the library's document is not JSON")
  }
}

function main(): number {
  let plan: RunPlan
  let root: string
  try {
    root = git(['rev-parse', '--show-toplevel'])
    const base = git(['merge-base', 'origin/main', 'HEAD'])
    const head = git(['rev-parse', 'HEAD'])
    console.log(`run-selected-tests: tests the library requires for ${base}..${head}`)
    plan = planCommands(libraryDocument(base, head))
  } catch (error) {
    console.error(`run-selected-tests: ${error instanceof Error ? error.message : String(error)}`)
    return 1
  }
  if (!plan.ok) {
    console.error('run-selected-tests: refused the library plan:')
    for (const reason of plan.reasons) console.error(`  - ${reason}`)
    return 1
  }
  if (plan.commands.length === 0) {
    console.log('run-selected-tests: no test is required for this change')
    for (const line of summarize([]).lines) console.log(line)
    return 0
  }
  const results: GroupResult[] = []
  for (const command of plan.commands) {
    console.log(`\nrun-selected-tests: ${command.cwd}$ ${command.command} ${command.args.join(' ')}`)
    const run = spawnSync(command.command, command.args, { cwd: join(root, command.cwd), stdio: 'inherit' })
    if (run.error) console.error(`run-selected-tests: ${command.command} could not be started: ${run.error.message}`)
    results.push({ command, passed: !run.error && run.status === 0 })
  }
  const { lines, exitCode } = summarize(results)
  console.log('')
  for (const line of lines) console.log(line)
  return exitCode
}

if (import.meta.main) process.exit(main())
