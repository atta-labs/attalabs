#!/usr/bin/env bun

/**
 * verify-task — the Developer's exit composite (aeg-governance-hardening
 * task 11, #324). One command, one summary, wrapping the exact checks the
 * Developer's own pre-PR verification list already requires (`roles/
 * developer.md` § Verification before reporting done): typecheck, lint,
 * tests, build, `verify-docs --pr`, and a premise re-check + coverage check
 * against the real diff. No second implementation of any of these — each
 * step shells out to the SAME command CI runs (`turbo typecheck`, `biome
 * check .`, `turbo test`, `bun packages/aeg-core/bin/verify-docs.ts --pr`)
 * or calls the pure `@atta/aeg-core` evaluators directly
 * (`checkPremiseCoverage`, `checkPremises`).
 *
 * Usage:
 *   bun packages/aeg-core/bin/verify-task.ts
 *   PR_BODY="$(cat body.md)" bun packages/aeg-core/bin/verify-task.ts
 *   PR_BODY_FILE=body.md bun packages/aeg-core/bin/verify-task.ts
 *
 * PR_BODY / PR_BODY_FILE resolution mirrors `verify-docs.ts`'s own
 * `resolvePrBody` — PR_BODY wins when set; PR_BODY_FILE (a local path) is
 * the pre-PR fallback. Both are optional: with neither set, the
 * verify-docs/premise steps run against an empty body (as they would for a
 * non-task branch).
 *
 * Scoped to `@atta/aeg-core`: `turbo typecheck`/`turbo test`/`turbo build`
 * run with `--filter=@atta/aeg-core` — a full monorepo application build is
 * the deployment pipeline's job, not this gate's (`aeg-root/enforcement.md`
 * Ring 1: "application builds are verified by the deployment pipeline").
 * `aeg-core` itself has no bundler build step (source-only package), so the
 * `build` step is a real, if usually no-op, invocation — not a rubber stamp.
 * Repo-wide lint (`biome check .`) still runs unscoped, matching the
 * existing `bun run check` script (Biome has no per-package filter here).
 *
 * CWD-independent by design: chdir's to the repo root immediately below.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkPremiseCoverage, checkPremises, parsePremiseBlock } from '../src/index'

const REPO_ROOT = join(import.meta.dir, '../../..')
process.chdir(REPO_ROOT)

type StepResult = { name: string; pass: boolean; output: string }

function runStep(name: string, cmd: string, env?: Record<string, string>): StepResult {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: env ? { ...process.env, ...env } : process.env
    })
    return { name, pass: true, output }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const output = [err.stdout, err.stderr].filter(Boolean).join('\n') || err.message || 'failed'
    return { name, pass: false, output }
  }
}

/** Mirrors `verify-docs.ts`'s `resolvePrBody` — PR_BODY wins; PR_BODY_FILE is the pre-PR fallback. */
function resolvePrBody(): string {
  if (process.env.PR_BODY) return process.env.PR_BODY
  if (process.env.PR_BODY_FILE) {
    try {
      return readFileSync(process.env.PR_BODY_FILE, 'utf8')
    } catch {
      return ''
    }
  }
  return ''
}

function changedFiles(): string[] {
  try {
    const base = process.env.BASE_SHA || 'origin/main'
    return execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function runPremiseSteps(prBody: string): StepResult[] {
  const changed = changedFiles()

  const coverage = checkPremiseCoverage(prBody, changed)
  const coverageResult: StepResult = {
    name: 'premise-coverage',
    pass: coverage.status === 'pass',
    output: coverage.errors.join('\n') || `${changed.length} changed file(s) covered (or no code surface).`
  }

  const assertions = parsePremiseBlock(prBody)
  let recheckResult: StepResult
  if (assertions.length === 0) {
    recheckResult = {
      name: 'premise-recheck',
      pass: true,
      output: 'no Premise: assertions found — nothing to re-assert.'
    }
  } else {
    const result = checkPremises(assertions, (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null))
    recheckResult = {
      name: 'premise-recheck',
      pass: result.pass,
      output: result.pass ? `all ${assertions.length} premise(s) re-asserted successfully.` : result.failures.join('\n')
    }
  }

  return [coverageResult, recheckResult]
}

function printStep(step: StepResult): void {
  console.log(`\n${step.pass ? '✓' : '✗'} ${step.name}`)
  if (!step.pass) console.log(step.output.split('\n').slice(0, 40).join('\n'))
}

if (import.meta.main) {
  const prBody = resolvePrBody()

  const steps: StepResult[] = []
  steps.push(runStep('typecheck', 'turbo typecheck --filter=@atta/aeg-core'))
  steps.push(runStep('lint (biome check .)', 'biome check .'))
  steps.push(runStep('test', 'turbo test --filter=@atta/aeg-core'))
  steps.push(runStep('build', 'turbo build --filter=@atta/aeg-core'))
  steps.push(runStep('verify-docs --pr', 'bun packages/aeg-core/bin/verify-docs.ts --pr', { PR_BODY: prBody }))
  steps.push(...runPremiseSteps(prBody))

  for (const step of steps) printStep(step)

  const failed = steps.filter((s) => !s.pass)
  console.log(`\nverify-task: ${steps.length - failed.length}/${steps.length} steps passed.`)
  if (failed.length > 0) {
    console.error(`verify-task FAILED — ${failed.map((s) => s.name).join(', ')}.`)
    process.exit(1)
  }
  console.log('verify-task: PASS.')
  process.exit(0)
}
