import { execFileSync } from 'node:child_process'
import { isTaskIssueLabelSet } from '@atta/aeg-core'
import { printJson } from '../lib/envelope'
import {
  type BodyResult,
  ForgeArgError,
  extractLabels,
  extractTitle,
  locateBody,
  makeCheckError,
  refuse,
  resolveSections,
  resolveShippableArgs,
  validateForgeWrite
} from '../lib/forge-write'

const RETRY_CREATE = 'vinaya issue create --validate-only …'
const RETRY_EDIT = 'vinaya issue edit <n> --validate-only …'

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

/**
 * Fetches the target Issue's actual current labels from the forge. `edit`
 * invocations don't re-pass `--label`, so argv says nothing about whether the
 * target is a task Issue — the forge is the only truthful source (#417). A
 * failed fetch is a HARD refusal, never treated as "no iteration label".
 */
function fetchForgeLabels(issueRef: string): string[] {
  let out: string
  try {
    out = execFileSync('gh', ['issue', 'view', issueRef, '--json', 'labels'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
  } catch {
    refuse([
      makeCheckError(
        'forge-fetch',
        `Could not fetch Issue ${issueRef}'s labels from the forge (\`gh issue view\`) — the rationale gate cannot decide whether it applies.`,
        `Check \`gh auth status\` and network, then re-run \`${RETRY_EDIT}\`. The edit is refused rather than passed through unvalidated.`
      )
    ])
  }
  try {
    return (JSON.parse(out) as { labels: Array<{ name: string }> }).labels.map((l) => l.name)
  } catch {
    refuse([
      makeCheckError(
        'forge-fetch',
        `Could not parse \`gh issue view ${issueRef} --json labels\` output.`,
        `Re-run \`${RETRY_EDIT}\`; the edit is refused rather than passed through unvalidated.`
      )
    ])
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

/**
 * Runs the task-Issue brief-schema gate for a body whose applicability was
 * already decided from the labels. Non-task Issues never reach here — they
 * pass through unvalidated, exactly like `open-issue.ts`.
 */
function validateTaskIssue(body: string | null, title: string | null, retryCommand: string): void {
  if (body === null) {
    refuse([
      makeCheckError(
        'forge-args',
        'A task Issue (a `vinaya/iteration:*` label) requires a `--body-file <path>` so the rationale gate can validate it.',
        `Add \`--body-file <path>\`, then re-run \`${retryCommand}\`.`
      )
    ])
  }
  const sections = resolveSections('issue', retryCommand)
  const errors = validateForgeWrite({
    body,
    title,
    sections,
    changedFiles: [],
    touchesLock: false,
    retryCommand
  })
  if (errors.length > 0) refuse(errors)
}

// --- commands ----------------------------------------------------------------

export function issueCreateCommand(args: string[]): void {
  const json = args.includes('--json')
  const validateOnly = args.includes('--validate-only')
  const ghArgs = args.filter((a) => a !== '--json' && a !== '--validate-only')

  const bodyResult = locateBodyOrRefuse(ghArgs, RETRY_CREATE)
  const body = bodyResult?.body ?? null
  const title = extractTitle(ghArgs)
  const labels = extractLabels(ghArgs)

  if (isTaskIssueLabelSet(labels)) {
    validateTaskIssue(body, title, RETRY_CREATE)
  }

  if (validateOnly) {
    reportPass(json, 'issue create')
    return
  }
  runGhWrite(['issue', 'create'], ghArgs, bodyResult, json)
}

export function issueEditCommand(args: string[]): void {
  const json = args.includes('--json')
  const validateOnly = args.includes('--validate-only')
  const rest = args.filter((a) => a !== '--json' && a !== '--validate-only')

  const issueRef = rest[0]
  if (!issueRef || issueRef.startsWith('-')) {
    refuse([
      makeCheckError(
        'forge-args',
        '`issue edit` requires the target Issue number/URL as the first argument.',
        'Pass the Issue number, e.g. `vinaya issue edit 123 --body-file <path>`.'
      )
    ])
  }
  const ghArgs = rest.slice(1)

  const bodyResult = locateBodyOrRefuse(ghArgs, RETRY_EDIT)
  const body = bodyResult?.body ?? null
  const title = extractTitle(ghArgs)

  // Union the forge's real labels with any passed on argv — argv is normally
  // silent on edit, so the forge is what decides task-Issue applicability.
  const labels = [...new Set([...fetchForgeLabels(issueRef), ...extractLabels(ghArgs)])]

  if (isTaskIssueLabelSet(labels)) {
    validateTaskIssue(body, title, RETRY_EDIT)
  }

  if (validateOnly) {
    reportPass(json, 'issue edit')
    return
  }
  runGhWrite(['issue', 'edit', issueRef], ghArgs, bodyResult, json)
}
