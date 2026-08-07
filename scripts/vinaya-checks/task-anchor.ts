#!/usr/bin/env bun
/**
 * task-anchor — this repo's own configured instance of the generic
 * `checkLocalAnchorCoverage` primitive (`@atta/aeg-core`, task 5 / Issue
 * #730), generalizing `reader-resolvable-prose.ts`'s Class 1 one step
 * further: a bare ordinal task reference ("Task 2") is fine as long as a
 * `(task N, #issue)`-shaped citation resolves it nearby; it is only a
 * finding when that citation is missing from its scope (same line, or same
 * markdown paragraph/bullet — see `local-anchor-coverage.ts`'s `splitIntoBlocks`).
 *
 * This is the historical bug the check primes against: commit `0b53d460`
 * ("Docs(vinaya): Fix dangling Task 2 reference in vinaya-spec.md") fixed a
 * bullet in `apps/vinaya/specs/vinaya-spec.md` whose header parenthetical
 * cited a bare forge number `(#722)` — not the `(task N, #issue)` shape this
 * check requires — leaving the body's "Task 2" reference dangling once the
 * tranche-slug strip elsewhere in that doc removed the anchor that used to
 * make it resolvable. See `packages/aeg-core/src/local-anchor-coverage.test.ts`
 * for that exact commit's pre-fix/post-fix content as a golden fixture pair.
 *
 * I/O shim only: this file reads matching `.md` files into memory and hands
 * them to `checkLocalAnchorCoverage` (`@atta/aeg-core`) — the evaluator
 * decides what counts as a finding and knows nothing about `Task N` or this
 * repo's citation convention. Mirrors `check-reader-resolvable-prose.ts`'s
 * in-memory-content shim shape, not `vocabulary-citation.ts`'s `grepFn`
 * shape — see `local-anchor-coverage.ts`'s own doc comment for why.
 *
 * Scope: every surface this repo's own doctrine convention
 * `(task N, #issue)` is actually used in today — `aeg-root`, every product's
 * `specs/` and every `CLAUDE.md` under `apps/`, `.claude/skills`, and root
 * `CLAUDE.md`. NOT `coreCheckRegistry()` — this convention is this repo's
 * own, not a shipped adopter surface; registered only in this repo's own
 * `vinaya.config.json` under `checks`, per the Issue's own Traps-to-avoid.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type AnchorSourceFile, checkLocalAnchorCoverage } from '@atta/aeg-core'

const CHECK_NAME = 'task-anchor'
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
process.chdir(REPO_ROOT)

type CheckError = {
  schema: 1
  check: string
  severity: 'error' | 'warning'
  message: string
  agent_recovery_prompt: string
  file?: string
  line?: number
}

function emitCheckError(error: CheckError): void {
  process.stderr.write(`${JSON.stringify(error)}\n`)
}

/** Recursively collects repo-relative paths under `dir` whose basename passes `match`. */
function collect(dir: string, match: (name: string) => boolean, out: string[] = []): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const full = join(dir, name)
    let isDir: boolean
    try {
      isDir = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (isDir) {
      if (name === 'node_modules' || name === '.next' || name === '.turbo' || name === '.git') continue
      collect(full, match, out)
    } else if (match(name)) {
      out.push(full)
    }
  }
  return out
}

const GLOBAL_EXEMPT = [
  '/fixtures/',
  'aeg-root/tranches/completed/',
  // Same frozen-archive class `vocabulary-citation.ts` already exempts for
  // the identical reason: `apps/vada-ai/specs/legacy/README.md` states its
  // own purpose as "Historical specs — superseded." Citation hygiene is not
  // a meaningful obligation for content the product itself has already
  // marked retired.
  'apps/vada-ai/specs/legacy/'
]

function isExempt(path: string): boolean {
  return GLOBAL_EXEMPT.some((e) => path.includes(e))
}

// `docs/` is deliberately NOT scoped: its only prose content is one closed,
// superseded historical record (same exempt class as above) and
// `docs/superpowers/**`, which has its own unrelated "Task N"
// step-numbering convention (an external planning-tool format, numbering
// implementation-plan steps) that was never meant to carry this repo's
// `(task N, #issue)` citation shape at all — scoping it in produced nothing
// but false positives against a different tool's grammar.
function collectScopeFiles(): string[] {
  const isMd = (name: string) => name.endsWith('.md')
  const paths = [
    ...collect('aeg-root', isMd),
    ...collect('.claude/skills', isMd),
    ...collect('apps/vada-ai/specs', isMd),
    ...collect('apps/herald-ai/specs', isMd),
    ...collect('apps/attalabs/specs', isMd),
    ...collect('apps/vinaya/specs', isMd),
    ...collect('apps', (name) => name === 'CLAUDE.md')
  ]
  if (statSyncSafe('CLAUDE.md')) paths.push('CLAUDE.md')
  return [...new Set(paths)].filter((p) => !isExempt(p))
}

function statSyncSafe(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

function readAll(paths: string[]): AnchorSourceFile[] {
  return paths.map((p) => ({ path: p, content: readFileSync(p, 'utf8') }))
}

/** `Task 2`-shaped — attalabs' own bare ordinal task reference. */
const PATTERN = /\bTask [0-9]+\b/g

/** `(task 2, #722)`-shaped — attalabs' own citation convention that resolves a bare "Task N" mention. */
const MUST_CO_OCCUR_WITH = /\(task [0-9]+, #[0-9]+\)/

/**
 * Report-only rollout, following this repo's own documented precedent for a
 * check that lands on a real pre-existing backlog
 * (`vocabulary-citation.ts`, `reader-resolvable-prose`'s own check —
 * `aeg-root/enforcement.md` records the same for G1/G2). A live sweep at
 * authoring time found real pre-existing dangling references across
 * `.claude/skills/**`, `apps/herald-ai/specs/**`, and `apps/vinaya/specs/**`
 * — genuine debt this task's introduction of the check surfaces, not
 * something it should silently suppress or block CI over on day one.
 * Flip to `false` once that backlog is triaged and cleaned up.
 */
const REPORT_ONLY = true

function main(): void {
  const files = readAll(collectScopeFiles())

  const result = checkLocalAnchorCoverage(files, {
    pattern: PATTERN,
    mustCoOccurWith: MUST_CO_OCCUR_WITH,
    scope: 'block',
    sample: 'Task 9 shipped this',
    coOccurSample: '(task 9, #123)'
  })

  if (result.vacuous.length > 0) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: 'error',
      message: `this check's own config is broken — ${result.vacuous.join(' and ')} does not match its own non-vacuity sample, so every finding it reports is untrustworthy until fixed.`,
      agent_recovery_prompt:
        'Fix the PATTERN/MUST_CO_OCCUR_WITH regex in scripts/vinaya-checks/task-anchor.ts so it matches its own sample/coOccurSample string, then re-run this check.'
    })
    process.exit(1)
  }

  for (const finding of result.findings) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: REPORT_ONLY ? 'warning' : 'error',
      message: `"${finding.match}" is a bare ordinal task reference with no (task N, #issue)-shaped citation nearby to resolve it`,
      agent_recovery_prompt:
        'Either add a citation shaped `(task N, #issue)` in the same paragraph/bullet as this reference, or rephrase ' +
        'the sentence to describe the fix/change directly instead of pointing at a tranche-task number (the exact ' +
        'fix commit 0b53d460 applied).',
      file: finding.file,
      line: finding.line
    })
  }

  // A vacuous pattern always fails, report-only or not — it means this
  // check is lying about its own coverage. Ordinary findings respect the
  // rollout flag.
  process.exit(!REPORT_ONLY && result.findings.length > 0 ? 1 : 0)
}

main()
