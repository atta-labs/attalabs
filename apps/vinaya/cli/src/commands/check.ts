import { execFileSync } from 'node:child_process'
import { emitCheckError, type CheckError, type CheckOutcome, type CheckSpec } from '../checks/contract'
import { coreCheckRegistry } from '../checks/registry'
import { defaultParallelism, runChecks } from '../checks/runner'
import { loadConfigChecked } from '../lib/config'
import { printJson } from '../lib/envelope'
import { checksMissingEnvDeclaration, envDeclarationWarning } from '../lib/env-lint'

// Array-form execFileSync — no shell, so `base` (env-controlled) is passed
// to git as an inert literal argv element, never shell-interpreted.
function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function changedFiles(): string[] {
  const base = process.env.BASE_SHA || 'origin/main'
  let out = git(['diff', '--name-only', `${base}...HEAD`])
  if (!out) out = git(['diff', '--name-only', 'main...HEAD'])
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseParallel(args: string[]): number | undefined {
  for (const a of args) {
    const m = a.match(/^--parallel(?:=(\d+))?$/)
    if (m) return m[1] ? Number(m[1]) : defaultParallelism()
  }
  return undefined
}

function configErrorOutcome(path: string, error: string): CheckOutcome {
  const finding: CheckError = {
    schema: 1,
    check: 'config',
    severity: 'error',
    message: `${path}: invalid \`checks\` registration — ${error}`,
    agent_recovery_prompt: `Fix the invalid key/value named above in ${path}, then re-run \`vinaya check\`.`
  }
  return { name: 'config', status: 'error', exitCode: null, errors: [finding], durationMs: 0 }
}

/**
 * Loud config validation (Part 3): a typo'd `checks` key surfaces as a
 * `status: 'error'` outcome naming the invalid path/key — never a silent
 * `null` that makes `vinaya check --all` print green over a broken
 * registration.
 */
function customSpecsFromConfig(): { specs: CheckSpec[]; errorOutcome: CheckOutcome | null } {
  const result = loadConfigChecked()
  if (!result.ok) return { specs: [], errorOutcome: configErrorOutcome(result.path, result.error) }
  const checks = result.config?.checks
  if (!checks) return { specs: [], errorOutcome: null }
  const specs: CheckSpec[] = Object.entries(checks).map(([name, entry]) => ({ name, ...entry }))
  return { specs, errorOutcome: null }
}

export async function checkCommand(args: string[]): Promise<void> {
  const jsonOutput = args.includes('--json')
  const diffOnly = args.includes('--diff-only')
  const requestedParallel = parseParallel(args)
  const allRequested = args.includes('--all')
  const positional = args.filter((a) => !a.startsWith('--'))
  const requestedName = positional[0]

  if (!allRequested && !requestedName) {
    console.error('Usage: vinaya check <name> | --all [--json] [--diff-only] [--parallel[=n]]')
    process.exit(2)
  }

  const { specs: customSpecs, errorOutcome } = customSpecsFromConfig()
  const allSpecs = [...coreCheckRegistry(), ...customSpecs]

  const specsToRun = allRequested ? allSpecs : allSpecs.filter((s) => s.name === requestedName)
  if (!allRequested && specsToRun.length === 0) {
    console.error(`Unknown check: ${requestedName}`)
    process.exit(2)
  }

  // Warn-phase-only (task 2/#775 Part 1: spawn still inherits the caller's
  // full environment — this print is advisory, ahead of the later minor
  // that wires `buildCheckEnv` as the spawn default). Printed to stderr, on
  // every output mode, and never folded into the exit code below — the run
  // still exits by check results, not by this warning. Remove this call
  // (not `checksMissingEnvDeclaration` itself, which `vinaya doctor` keeps
  // using permanently) once construction is wired as the default.
  for (const name of checksMissingEnvDeclaration(specsToRun)) {
    console.error(`⚠ ${envDeclarationWarning(name)}`)
  }

  const changed = diffOnly ? changedFiles() : null

  const outcomes =
    specsToRun.length > 0
      ? await runChecks(specsToRun, {
          parallel: requestedParallel ?? defaultParallelism(),
          diffOnly,
          changedFiles: changed,
          defaultTimeoutMs: 30_000
        })
      : []

  const allOutcomes = errorOutcome ? [...outcomes, errorOutcome] : outcomes

  // Findings go to stderr as the contract's JSON lines regardless of which
  // stdout mode (--json envelope or human summary) is chosen below.
  for (const o of allOutcomes) {
    for (const e of o.errors) emitCheckError(e)
  }

  if (jsonOutput) {
    printJson({ checks: allOutcomes })
  } else {
    for (const o of allOutcomes) {
      const symbol = o.status === 'pass' ? '✓' : o.status === 'skipped' ? '·' : '✗'
      process.stdout.write(`${symbol} ${o.name}: ${o.status} (${Math.round(o.durationMs)}ms)\n`)
      for (const e of o.errors) process.stdout.write(`    ${e.severity}: ${e.message}\n`)
    }
  }

  const failed = allOutcomes.some((o) => o.status === 'fail' || o.status === 'error' || o.status === 'timeout')
  process.exit(failed ? 1 : 0)
}
