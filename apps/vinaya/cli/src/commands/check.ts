import { execFileSync } from 'node:child_process'
import { emitCheckError, type CheckError, type CheckOutcome, type CheckSpec } from '../checks/contract'
import { coreCheckRegistry } from '../checks/registry'
import {
  bareKeyNextMinorWarning,
  overriddenNextMinorWarning,
  resolveChecks,
  type ResolveResult
} from '../checks/resolver'
import { defaultParallelism, runChecks } from '../checks/runner'
import { type CheckEntry, type ConfigLoadResult, loadConfigChecked } from '../lib/config'
import { printJson } from '../lib/envelope'

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
type CustomSpecsResult = {
  specs: CheckSpec[]
  errorOutcome: CheckOutcome | null
  checks: Record<string, CheckEntry> | undefined
}

function customSpecsFromConfig(): CustomSpecsResult {
  const result = loadConfigChecked()
  if (!result.ok) return { specs: [], errorOutcome: configErrorOutcome(result.path, result.error), checks: undefined }
  const checks = result.config?.checks
  if (!checks) return { specs: [], errorOutcome: null, checks: undefined }
  const specs: CheckSpec[] = Object.entries(checks).map(([name, entry]) => ({ name, ...entry }))
  return { specs, errorOutcome: null, checks }
}

type EnvLabel = 'passthrough' | 'optional' | 'literal' | 'anyOf'

type PlanJsonOutput = {
  schema: 1
  checks: Record<
    string,
    {
      state: ResolveResult['resolved'][number]['state']
      source: ResolveResult['resolved'][number]['source']
      env: Record<string, EnvLabel>
      envAnyOf?: Record<string, string[]>
      scope: CheckSpec['scope']
    }
  >
  roles: { available: false; reason: string }
  errors: ResolveResult['failures']
}

function classifyEnvValue(value: true | { optional: true } | { anyOf: string[] } | string): EnvLabel {
  if (value === true) return 'passthrough'
  if (typeof value === 'string') return 'literal'
  if ('anyOf' in value) return 'anyOf'
  return 'optional'
}

/**
 * `--plan --json`'s resolver-failure surface — a top-level `errors` array so
 * a FAIL_CLOSED entry is never dropped from the JSON the way it isn't
 * dropped from the human table. `roles` stays an explicit degraded
 * placeholder: role resolution/registration is task 6's job, not this one.
 */
function renderPlanJson(result: ResolveResult): PlanJsonOutput {
  const checks: PlanJsonOutput['checks'] = {}
  for (const entry of result.resolved) {
    const env: Record<string, EnvLabel> = {}
    let envAnyOf: Record<string, string[]> | undefined
    for (const [key, value] of Object.entries(entry.spec.env ?? {})) {
      env[key] = classifyEnvValue(value)
      if (typeof value === 'object' && value !== null && 'anyOf' in value) {
        envAnyOf ??= {}
        envAnyOf[key] = value.anyOf
      }
    }
    checks[entry.name] = { state: entry.state, source: entry.source, env, envAnyOf, scope: entry.spec.scope }
  }
  return {
    schema: 1,
    checks,
    roles: { available: false, reason: 'role resolution not implemented yet — see task 6' },
    errors: result.failures
  }
}

/**
 * `ENV` cell: bare `NAME` for passthrough, `NAME?` for optional, `NAME|ALT`
 * for an `anyOf` group, `NAME=<redacted>` for a literal — the literal's
 * actual value is never printed, only that it resolves to a fixed string.
 */
function envCellFor(spec: CheckSpec): string {
  const entries = Object.entries(spec.env ?? {})
  if (entries.length === 0) return '—'
  return entries
    .map(([key, value]) => {
      if (value === true) return key
      if (typeof value === 'string') return `${key}=<redacted>`
      if ('anyOf' in value) return value.anyOf.join('|')
      return `${key}?`
    })
    .join(', ')
}

function renderPlanTable(result: ResolveResult): string {
  const header = ['NAME', 'STATE', 'SOURCE', 'ENV']
  const rows = result.resolved.map((entry) => [entry.name, entry.state, entry.source, envCellFor(entry.spec)])
  const failureRows = result.failures.map((f) => [f.key, 'FAILED', '—', f.reason])
  const table = [header, ...rows, ...failureRows]
  const widths = header.map((_, col) => Math.max(...table.map((row) => row[col]?.length ?? 0)))
  return table.map((row) => row.map((cell, col) => (cell ?? '').padEnd(widths[col] ?? 0)).join('  ')).join('\n')
}

/**
 * Core-only resolution plus a synthesized failure naming the config file
 * when `loadConfigChecked()` itself failed (invalid JSON / schema) — `--plan`
 * still renders whatever it can rather than crashing uncaught or silently
 * proceeding as if the config didn't exist.
 */
function resolveForPlan(configResult: ConfigLoadResult): ResolveResult {
  if (configResult.ok) {
    return resolveChecks(coreCheckRegistry(), configResult.config?.checks)
  }
  const core = resolveChecks(coreCheckRegistry(), undefined)
  return {
    resolved: core.resolved,
    failures: [{ key: configResult.path, reason: `invalid \`checks\` registration — ${configResult.error}` }]
  }
}

/**
 * Classification warnings for the non-`--plan` path (Part 2): computed from
 * the same predicates the resolver uses, describing what next minor —
 * once execution wires onto the resolver — will do. Print-only; must never
 * affect `specsToRun`/`allOutcomes`/the exit code of the non-plan path.
 *
 * Takes the already-loaded `checks` record from `customSpecsFromConfig()`
 * rather than calling `loadConfigChecked()` again — a second load re-runs
 * `stripGlobalChecks`'s stderr side effect, double-printing the
 * global-config-ignored warning for every invocation of this path.
 */
function printClassificationWarnings(configChecks: Record<string, CheckEntry> | undefined): void {
  const classification = resolveChecks(coreCheckRegistry(), configChecks)
  for (const entry of classification.resolved) {
    if (entry.state === 'overridden') process.stdout.write(`${overriddenNextMinorWarning(entry.name)}\n`)
  }
  for (const failure of classification.failures) {
    process.stdout.write(`${bareKeyNextMinorWarning(failure.key)}\n`)
  }
}

export async function checkCommand(args: string[]): Promise<void> {
  const jsonOutput = args.includes('--json')
  const diffOnly = args.includes('--diff-only')
  const requestedParallel = parseParallel(args)
  const allRequested = args.includes('--all')
  const planRequested = args.includes('--plan')
  const positional = args.filter((a) => !a.startsWith('--'))
  const requestedName = positional[0]

  if (planRequested) {
    const result = resolveForPlan(loadConfigChecked())
    if (jsonOutput) {
      process.stdout.write(`${JSON.stringify(renderPlanJson(result), null, 2)}\n`)
    } else {
      process.stdout.write(`${renderPlanTable(result)}\n`)
    }
    process.exit(result.failures.length > 0 ? 1 : 0)
  }

  if (!allRequested && !requestedName) {
    console.error('Usage: vinaya check <name> | --all | --plan [--json] [--diff-only] [--parallel[=n]]')
    process.exit(2)
  }

  const { specs: customSpecs, errorOutcome, checks: configChecks } = customSpecsFromConfig()
  const allSpecs = [...coreCheckRegistry(), ...customSpecs]

  const specsToRun = allRequested ? allSpecs : allSpecs.filter((s) => s.name === requestedName)
  if (!allRequested && specsToRun.length === 0) {
    console.error(`Unknown check: ${requestedName}`)
    process.exit(2)
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
    printClassificationWarnings(configChecks)
  }

  const failed = allOutcomes.some((o) => o.status === 'fail' || o.status === 'error' || o.status === 'timeout')
  process.exit(failed ? 1 : 0)
}
