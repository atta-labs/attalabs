/**
 * Shared machinery for the validated forge-write commands (`pr create/edit`,
 * `issue create/edit`). Two concerns live here:
 *
 *  1. **Same-bytes body plumbing** (`locateBody` / `resolveShippableArgs`) —
 *     adapted from `packages/aeg-core/bin/open-pr.ts`'s #333 fix, NEVER
 *     imported (those bins `process.chdir(REPO_ROOT)` and shell out to this
 *     repo's `bin/*` gate scripts; dragging them into a distributable CLI
 *     drags this repo's layout in). A stream/heredoc body is empty on a
 *     SECOND read by the time `gh` opens the original path, so the body is
 *     buffered ONCE, validated, then materialized into a fresh temp file whose
 *     path replaces the `--body-file` slot — `gh` reads the same bytes this
 *     process validated.
 *
 *  2. **The config-defined brief-schema validation runner**
 *     (`validateForgeWrite`) — pure over its inputs, built on `@atta/aeg-core`
 *     public exports, emitting the versioned `CheckError` contract instead of
 *     human text (the same move `src/checks/bin/check-brief-shape.ts` makes for
 *     the check runner). WHICH sections a body must carry comes from
 *     `vinaya.config.json`'s `briefSchema` key, never hardcoded here — this
 *     repo's required-section set is just one config instance (D-087).
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  checkAutonomyClause,
  checkBriefClosesN,
  checkDocUpdateList,
  checkForField,
  checkForgeTitle,
  checkIssueRationale,
  checkLockAck,
  checkPremiseCoverage,
  checkPrincipalPlaceholder,
  checkProjectField,
  checkStopConditions,
  checkSurfaceMap,
  checkTestPlan,
  checkTestPlanExclusivity,
  checkTierField,
  checkWorktreeStep0,
  readTierFromPrBody
} from '@atta/aeg-core'
import { CHECK_SCHEMA_VERSION, type CheckError, emitCheckError } from '../checks/contract'
import { type BriefBuiltin, type BriefSection, loadConfigChecked } from './config'

// ---------------------------------------------------------------------------
// Arg errors — a malformed `--body-file` is a refusal in the CheckError shape,
// same as a failed brief-schema gate, so agents get one uniform contract.
// ---------------------------------------------------------------------------

/** A structural problem with the invocation itself (missing body path, etc.). */
export class ForgeArgError extends Error {}

// ---------------------------------------------------------------------------
// Same-bytes body plumbing (adapted from open-pr.ts / open-issue.ts, #333).
// ---------------------------------------------------------------------------

/** Where a validated body's bytes came from — a file/stream path, or an inline arg value. */
export type BodySource = { kind: 'file'; argIndex: number; inlineForm: boolean } | { kind: 'inline' }

export type BodyResult = {
  body: string
  source: BodySource
}

/**
 * Reads the body exactly once and records where it came from. `argIndex` +
 * `inlineForm` let `resolveShippableArgs` find and replace the same slot later
 * — the read here and the value shipped to `gh` must be the same buffered
 * string, not two independent reads of the same path (empty for a stream on
 * the second read). Returns null when no body flag is present.
 */
export function locateBody(args: string[]): BodyResult | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--body-file' || a === '-F') {
      const p = args[i + 1]
      if (!p) throw new ForgeArgError('`--body-file` was given with no path.')
      return { body: readFileSync(p, 'utf8'), source: { kind: 'file', argIndex: i + 1, inlineForm: false } }
    }
    if (a.startsWith('--body-file=')) {
      const p = a.slice('--body-file='.length)
      if (!p) throw new ForgeArgError('`--body-file=` was given with no path.')
      return { body: readFileSync(p, 'utf8'), source: { kind: 'file', argIndex: i, inlineForm: true } }
    }
    if (a === '--body' || a === '-b') {
      const v = args[i + 1]
      if (v === undefined) throw new ForgeArgError('`--body` was given with no value.')
      return { body: v, source: { kind: 'inline' } }
    }
    if (a.startsWith('--body=')) return { body: a.slice('--body='.length), source: { kind: 'inline' } }
  }
  return null
}

/**
 * Materializes an already-buffered body into a fresh temp file and rewrites
 * the `--body-file`/`-F` slot to point at it, so `gh`'s own read sees the SAME
 * bytes this process validated — never a second read of the original path.
 * Inline `--body`/`-b` args are untouched: no file, no second read, no risk.
 */
export function resolveShippableArgs(
  args: string[],
  bodyResult: BodyResult | null
): { finalArgs: string[]; cleanup: () => void } {
  if (bodyResult?.source.kind !== 'file') {
    return { finalArgs: args, cleanup: () => {} }
  }
  const dir = mkdtempSync(join(tmpdir(), 'vinaya-forge-body-'))
  const tempPath = join(dir, 'body.md')
  writeFileSync(tempPath, bodyResult.body, 'utf8')
  const finalArgs = [...args]
  const { argIndex, inlineForm } = bodyResult.source
  finalArgs[argIndex] = inlineForm ? `--body-file=${tempPath}` : tempPath
  return { finalArgs, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** Extracts `--title`/`-t` from the passthrough args, if present. */
export function extractTitle(args: string[]): string | null {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--title' || a === '-t') return args[i + 1] ?? null
    if (a.startsWith('--title=')) return a.slice('--title='.length)
  }
  return null
}

/** Collects every `--label`/`-l`/`--add-label` value (comma-split), like open-issue.ts. */
export function extractLabels(args: string[]): string[] {
  const labels: string[] = []
  const push = (v: string | undefined) => {
    if (v) for (const s of v.split(',').map((x) => x.trim())) if (s) labels.push(s)
  }
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (a === '--label' || a === '-l' || a === '--add-label') push(args[i + 1])
    else if (a.startsWith('--label=')) push(a.slice('--label='.length))
    else if (a.startsWith('--add-label=')) push(a.slice('--add-label='.length))
  }
  return labels
}

// ---------------------------------------------------------------------------
// Refusal — the CheckError contract, one JSON line per finding on stderr.
// ---------------------------------------------------------------------------

/** Builds a well-formed `CheckError` with the current schema version. */
export function makeCheckError(check: string, message: string, agentRecoveryPrompt: string): CheckError {
  return {
    schema: CHECK_SCHEMA_VERSION,
    check,
    severity: 'error',
    message,
    agent_recovery_prompt: agentRecoveryPrompt
  }
}

/** Emits every finding as a JSON line on stderr, then exits 1. Nothing reached the forge. */
export function refuse(errors: CheckError[]): never {
  for (const e of errors) emitCheckError(e)
  process.exit(1)
}

/**
 * Resolves the config-defined required-section set for a command. Uses the
 * LOUD loader (`loadConfigChecked`): a malformed `vinaya.config.json` is a hard
 * refusal, never a silent `null` that would skip validation and let a broken
 * config print green over an unvalidated forge write. No config / no
 * `briefSchema` for this kind → an empty set (adopter-generic pass-through).
 */
export function resolveSections(kind: 'pr' | 'issue', retryCommand: string): BriefSection[] {
  const result = loadConfigChecked()
  if (!result.ok) {
    refuse([
      makeCheckError(
        'config',
        `${result.path}: invalid vinaya.config.json — ${result.error}`,
        `Fix the invalid key/value named above in ${result.path}, then re-run \`${retryCommand}\`.`
      )
    ])
  }
  return result.config?.briefSchema?.[kind]?.sections ?? []
}

// ---------------------------------------------------------------------------
// The config-defined brief-schema validation runner.
// ---------------------------------------------------------------------------

export type ForgeValidationInput = {
  body: string
  /** The `--title` value, or null. When present it is grammar-checked (`checkForgeTitle`). */
  title: string | null
  /** The config-defined required-section set for this command (pr/issue). */
  sections: BriefSection[]
  /** The write's changed-file list — drives `premiseCoverage`. Empty for issues. */
  changedFiles: string[]
  /** Whether the write's diff adds a `Lock: YES` decision — drives `lockAck`. */
  touchesLock: boolean
  /** The exact command the agent should re-run after fixing (named in every recovery prompt). */
  retryCommand: string
}

const CHECK_BRIEF_SCHEMA = 'brief-schema'
const CHECK_FORGE_TITLE = 'forge-title'

/**
 * Maps each built-in section name to the `@atta/aeg-core` validator that backs
 * it. The `Record<BriefBuiltin, …>` type makes this exhaustive — adding a name
 * to `BRIEF_BUILTINS` without wiring it here is a compile error.
 */
function runBuiltin(name: BriefBuiltin, input: ForgeValidationInput): string[] {
  const { body, changedFiles, touchesLock } = input
  const table: Record<BriefBuiltin, () => { errors: string[] }> = {
    tier: () => checkTierField(body, readTierFromPrBody),
    testPlan: () => checkTestPlan(body),
    testPlanExclusivity: () => checkTestPlanExclusivity(body),
    principalPlaceholder: () => checkPrincipalPlaceholder(body),
    surfaceMap: () => checkSurfaceMap(body),
    docUpdateList: () => checkDocUpdateList(body),
    worktreeStep0: () => checkWorktreeStep0(body),
    stopConditions: () => checkStopConditions(body),
    autonomyClause: () => checkAutonomyClause(body),
    project: () => checkProjectField(body),
    for: () => checkForField(body),
    closesN: () => checkBriefClosesN(body),
    lockAck: () => checkLockAck(body, touchesLock),
    premiseCoverage: () => checkPremiseCoverage(body, changedFiles),
    issueRationale: () => checkIssueRationale(body)
  }
  return table[name]().errors
}

/** The corrective instruction per built-in — the command to run, never a restatement of the diagnosis. */
const BUILTIN_RECOVERY: Record<BriefBuiltin, string> = {
  tier: 'Add a `Tier: 0`, `Tier: 1`, or `Tier: 3` field to the body header block (before the first `##` heading), then re-run `{cmd}`.',
  testPlan:
    'Add a Test Plan section with at least one `**[agent]**` or `**[principal]**` checklist item (or the `Test Plan: unit-tests-only` sentinel), then re-run `{cmd}`.',
  testPlanExclusivity:
    'Remove either the `Test Plan: unit-tests-only` sentinel or the tagged `- [ ]` checklist items — declare one form, not both — then re-run `{cmd}`.',
  principalPlaceholder:
    'Delete the `**[principal]**` "None" placeholder checklist item entirely (an untickable box blocks the merge gate forever), then re-run `{cmd}`.',
  surfaceMap: 'Add a `## Technical surface map` section listing the files this change touches, then re-run `{cmd}`.',
  docUpdateList: 'Add a `## Documentation-update list` section, then re-run `{cmd}`.',
  worktreeStep0: 'Add the `git worktree add …` Step 0 command to the body, then re-run `{cmd}`.',
  stopConditions: 'Add a `## Stop conditions` section, then re-run `{cmd}`.',
  autonomyClause:
    'Add the standing autonomy clause ("Do not stop to ask clarifying questions…") to the body, then re-run `{cmd}`.',
  project:
    'Add a `Project: <name>` field to the body header block (before the first `##` heading), then re-run `{cmd}`.',
  for: 'Add a `For: <model + environment>` field to the body header block (before the first `##` heading), then re-run `{cmd}`.',
  closesN: 'Add a `Closes #<N>` reference naming the task Issue to the body, then re-run `{cmd}`.',
  lockAck:
    'This change touches a `Lock: YES` decision — add a `Conforms to lock: D-###` (or `Challenges lock: D-###` + `Rationale:`) block to the body, then re-run `{cmd}`.',
  premiseCoverage: 'Add a `Premise:` assertion whose path matches a file this change touches, then re-run `{cmd}`.',
  issueRationale:
    'Add the missing Planner-rationale field named above (every task Issue carries all eight fields), then re-run `{cmd}`.'
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** The declarative (non-built-in) section forms an adopter authors for their own required sections. */
type CustomSection =
  | Extract<BriefSection, { heading: string }>
  | Extract<BriefSection, { field: string }>
  | Extract<BriefSection, { phrase: string }>

/** Evaluates a declarative custom-section matcher against the body. Returns a diagnosis or null (pass). */
function runCustomSection(section: CustomSection, body: string): string | null {
  if ('heading' in section) {
    const re = new RegExp(`^#{1,6}\\s+.*${escapeRegExp(section.heading)}`, 'im')
    if (re.test(body)) return null
    const name = section.name ?? section.heading
    return `brief-schema ${name}: no "${section.heading}" heading found in the body.`
  }
  if ('field' in section) {
    const re = new RegExp(`^(?:\\*\\*)?\\s*${escapeRegExp(section.field)}\\s*(?:\\*\\*)?\\s*:`, 'im')
    if (re.test(body)) return null
    const name = section.name ?? section.field
    return `brief-schema ${name}: no "${section.field}:" field found in the body.`
  }
  // phrase
  if (body.toLowerCase().includes(section.phrase.toLowerCase())) return null
  const name = section.name ?? section.phrase
  return `brief-schema ${name}: required phrase "${section.phrase}" not found in the body.`
}

/** Recovery instruction for a custom-section failure — names how to satisfy it and the command to re-run. */
function customRecovery(section: CustomSection, retryCommand: string): string {
  const cmd = `\`${retryCommand}\``
  if ('heading' in section) {
    return `Add a \`## ${section.heading}\` heading (with its section) to the body, then re-run ${cmd}.`
  }
  if ('field' in section) {
    return `Add a \`${section.field}: <value>\` field to the body, then re-run ${cmd}.`
  }
  return `Add the required phrase "${section.phrase}" to the body, then re-run ${cmd}.`
}

/**
 * Runs the full config-defined brief-schema validation over a body (+ optional
 * title). Pure: no `fs`, no `gh`, no `process`. Returns every finding as a
 * `CheckError`; an empty array means the write may proceed.
 */
export function validateForgeWrite(input: ForgeValidationInput): CheckError[] {
  const errors: CheckError[] = []

  if (input.title !== null) {
    const t = checkForgeTitle(input.title)
    if (t.status === 'fail') {
      for (const message of t.errors) {
        errors.push(
          makeCheckError(
            CHECK_FORGE_TITLE,
            message,
            `Rewrite the \`--title\` to match the forge-title grammar (\`Type: description\` / \`Type(scope): description\`, or \`[iteration] id — description\`), then re-run \`${input.retryCommand}\`.`
          )
        )
      }
    }
  }

  for (const section of input.sections) {
    if ('builtin' in section) {
      const recovery = BUILTIN_RECOVERY[section.builtin].replace('{cmd}', input.retryCommand)
      for (const message of runBuiltin(section.builtin, input)) {
        errors.push(makeCheckError(CHECK_BRIEF_SCHEMA, message, recovery))
      }
    } else {
      const message = runCustomSection(section, input.body)
      if (message !== null) {
        errors.push(makeCheckError(CHECK_BRIEF_SCHEMA, message, customRecovery(section, input.retryCommand)))
      }
    }
  }

  return errors
}
