import { execFileSync } from 'node:child_process'
import { isDecisionLog } from '@atta/aeg-core'
import { printJson } from '../lib/envelope'
import {
  type BodyResult,
  ForgeArgError,
  extractTitle,
  locateBody,
  makeCheckError,
  refuse,
  resolveSections,
  resolveShippableArgs,
  validateForgeWrite
} from '../lib/forge-write'

const RETRY_CREATE = 'vinaya pr create --validate-only …'
const RETRY_EDIT = 'vinaya pr edit <n> --validate-only …'

// Array-form execFileSync — no shell, so a ref/filename carrying shell
// metacharacters is passed to git/gh as an inert literal argv element, never
// interpreted (same command-injection guard as check-brief-shape.ts).
function git(args: string[]): string {
  try {
    // stdin ignored, stdout captured, stderr discarded — execFileSync inherits
    // the child's stderr by default, which would leak git's "not a git
    // repository" warning into the CheckError stream when run outside a repo.
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function localChangedFiles(): string[] {
  const base = process.env.BASE_SHA || 'origin/main'
  let out = git(['diff', '--name-only', `${base}...HEAD`])
  if (!out) out = git(['diff', '--name-only', 'main...HEAD'])
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function locateBodyOrRefuse(ghArgs: string[], retryCommand: string): BodyResult | null {
  try {
    return locateBody(ghArgs)
  } catch (e) {
    if (e instanceof ForgeArgError) {
      refuse([makeCheckError('forge-args', e.message, `Fix the invocation, then re-run \`${retryCommand}\`.`)])
    }
    throw e
  }
}

function reportPass(json: boolean, command: string): void {
  if (json) {
    printJson({ validated: true, written: false, command })
  } else {
    process.stdout.write('✓ all brief-schema gates PASS — nothing written (--validate-only).\n')
  }
}

function runGhWrite(ghCmd: string[], ghArgs: string[], bodyResult: BodyResult | null, json: boolean): void {
  const { finalArgs, cleanup } = resolveShippableArgs(ghArgs, bodyResult)
  try {
    const out = execFileSync('gh', [...ghCmd, ...finalArgs], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
    const url = out.trim()
    if (json) printJson({ validated: true, written: true, url })
    else if (url) process.stdout.write(`${url}\n`)
  } finally {
    cleanup()
  }
}

// --- edit-mode forge context (hard-refuse on any fetch/parse failure) --------

/**
 * Fetches the target PR's real state from the forge — its head branch (which
 * gate set applies is a property of the TARGET PR, never the local checkout —
 * #417) and its changed files (premise coverage). A failed fetch is a HARD
 * refusal, never a fall-back to the local checkout's diff.
 */
function fetchPrForgeContext(prRef: string): { changedFiles: string[] } {
  let viewOut: string
  try {
    viewOut = execFileSync('gh', ['pr', 'view', prRef, '--json', 'headRefName,files'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch {
    refuse([
      makeCheckError(
        'forge-fetch',
        `Could not fetch PR ${prRef} from the forge (\`gh pr view\`) — the brief-schema gate cannot resolve the target PR's state.`,
        `Check \`gh auth status\` and network, then re-run \`${RETRY_EDIT}\`. The edit is refused rather than validated against the local checkout.`
      )
    ])
  }
  let parsed: { headRefName?: string; files?: Array<{ path: string }> }
  try {
    parsed = JSON.parse(viewOut)
  } catch {
    refuse([
      makeCheckError(
        'forge-fetch',
        `Could not parse \`gh pr view ${prRef}\` output.`,
        `Re-run \`${RETRY_EDIT}\`; the edit is refused rather than validated against the local checkout.`
      )
    ])
  }
  if (!parsed.headRefName) {
    refuse([
      makeCheckError(
        'forge-fetch',
        `\`gh pr view ${prRef}\` returned no head branch — the target PR could not be resolved.`,
        `Confirm PR ${prRef} exists, then re-run \`${RETRY_EDIT}\`.`
      )
    ])
  }
  const changedFiles = (parsed.files ?? []).map((f) => f.path)

  return { changedFiles }
}

// --- commands ----------------------------------------------------------------

export function prCreateCommand(args: string[]): void {
  const json = args.includes('--json')
  const validateOnly = args.includes('--validate-only')
  const ghArgs = args.filter((a) => a !== '--json' && a !== '--validate-only')

  const bodyResult = locateBodyOrRefuse(ghArgs, RETRY_CREATE)
  const body = bodyResult?.body ?? null
  const title = extractTitle(ghArgs)

  if (body === null) {
    refuse([
      makeCheckError(
        'forge-args',
        'No `--body-file <path>` (or `--body`) argument found — the brief-schema gate needs the PR body to validate it.',
        `Add \`--body-file <path>\` (or \`--body\`), then re-run \`${RETRY_CREATE}\`.`
      )
    ])
  }

  const sections = resolveSections('pr', RETRY_CREATE)
  const changedFiles = localChangedFiles()

  const errors = validateForgeWrite({
    body,
    title,
    sections,
    changedFiles,
    retryCommand: RETRY_CREATE
  })
  if (errors.length > 0) refuse(errors)

  if (validateOnly) {
    reportPass(json, 'pr create')
    return
  }
  runGhWrite(['pr', 'create'], ghArgs, bodyResult, json)
}

export function prEditCommand(args: string[]): void {
  const json = args.includes('--json')
  const validateOnly = args.includes('--validate-only')
  const rest = args.filter((a) => a !== '--json' && a !== '--validate-only')

  const prRef = rest[0]
  if (!prRef || prRef.startsWith('-')) {
    refuse([
      makeCheckError(
        'forge-args',
        '`pr edit` requires the target PR number/URL as the first argument.',
        'Pass the PR number, e.g. `vinaya pr edit 123 --body-file <path>`.'
      )
    ])
  }
  const ghArgs = rest.slice(1)

  const bodyResult = locateBodyOrRefuse(ghArgs, RETRY_EDIT)
  const body = bodyResult?.body ?? null
  const title = extractTitle(ghArgs)

  if (body === null && title === null) {
    refuse([
      makeCheckError(
        'forge-args',
        '`pr edit` with neither `--body-file`/`--body` nor `--title` — nothing to validate or change.',
        `Pass a \`--body-file\`/\`--body\` or a \`--title\`, then re-run \`${RETRY_EDIT}\`.`
      )
    ])
  }

  const sections = resolveSections('pr', RETRY_EDIT)
  let changedFiles: string[] = []
  if (body !== null) {
    const ctx = fetchPrForgeContext(prRef)
    changedFiles = ctx.changedFiles
  }

  const errors = validateForgeWrite({
    body: body ?? '',
    title,
    sections: body === null ? [] : sections,
    changedFiles,
    retryCommand: RETRY_EDIT
  })
  if (errors.length > 0) refuse(errors)

  if (validateOnly) {
    reportPass(json, 'pr edit')
    return
  }
  runGhWrite(['pr', 'edit', prRef], ghArgs, bodyResult, json)
}
