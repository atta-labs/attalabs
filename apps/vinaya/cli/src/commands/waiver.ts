// `vinaya waiver` — the forge-authenticated escape hatch (vinaya-cli-v1
// task 7). A waiver is never an agent-emittable string: not a PR body field,
// not a commit trailer, not a comment the config could parse. The ONLY
// mechanism ring 1 honors is the actor-verified `vinaya/waiver:docs` /
// `vinaya/waiver:review` label — `isWaiverLabelActorVerified`
// (`packages/aeg-core/src/waiver-label.ts`, proved live in
// `aeg-governance-hardening` #380) checks the labeling timeline event's own
// actor against a principal allowlist. This command WRAPS that already-proven
// mechanism; it does not reimplement or relax it.
//
// This command never fabricates that actor. It shells out to `gh`, which
// authenticates as whoever is logged in — the label's recorded actor is
// therefore always the real `gh` identity running this command, not
// something this code can assert on its own behalf. In a repo where an agent
// session and the human share one `gh` credential (documented in
// `apps/vinaya/specs/vinaya-spec.md`'s shared-credential caveat), this
// command structurally cannot prove which of them ran it — `--print-only`
// exists for exactly that gap: print the commands, let the human run them.
import { execFileSync } from 'node:child_process'
import { WAIVER_LABEL, WAIVER_LABEL_REVIEW } from '@atta/aeg-core'
import { closeStdin, prompt } from '../lib/prompt.js'

type WaiverKind = 'docs' | 'review'

function labelFor(kind: WaiverKind): string {
  return kind === 'docs' ? WAIVER_LABEL : WAIVER_LABEL_REVIEW
}

// `env: process.env` is passed explicitly (not left to default inheritance)
// so a test's runtime PATH override is honored on every `gh` resolution —
// spawn's default inheritance path resolves the executable from a snapshot
// taken at process start, not the live `process.env` at call time.
function gh(args: string[]): string {
  return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: process.env }).trim()
}

/** The open PR for the current branch, if `gh` can resolve one. Never a hard requirement — the caller falls back to prompting. */
function detectPrNumber(): string | null {
  try {
    const out = gh(['pr', 'view', '--json', 'number', '-q', '.number'])
    return /^\d+$/.test(out) ? out : null
  } catch {
    return null
  }
}

// Flags this command accepts, and whether each consumes a following value
// token. A positional scan (kind/PR-number) must skip both the flag AND its
// value — otherwise `--reason docs`/`--reason 42` (reason text that happens
// to look like a kind or PR number) gets silently bound to the wrong field
// instead of the reason, with no prompt and no error (review finding F2).
const VALUE_FLAGS = ['--reason']
const BOOLEAN_FLAGS = ['--print-only']

/** `args` with every recognized flag — and, for a value flag, its consumed value token — removed, leaving only genuine positional candidates. Exported for direct unit testing of the F2 fix (`tests/waiver.test.ts`). */
export function positionalArgs(args: string[]): string[] {
  const result: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string
    if (VALUE_FLAGS.some((f) => a.startsWith(`${f}=`))) continue
    if (VALUE_FLAGS.includes(a)) {
      i += 1 // also skip this flag's value token, whatever it looks like
      continue
    }
    if (BOOLEAN_FLAGS.includes(a)) continue
    result.push(a)
  }
  return result
}

async function resolveKind(args: string[]): Promise<WaiverKind | null> {
  const positional = positionalArgs(args).find((a) => a === 'docs' || a === 'review')
  if (positional === 'docs' || positional === 'review') return positional
  const answer = (await prompt('Which waiver — `docs` or `review`? ')).trim().toLowerCase()
  return answer === 'docs' || answer === 'review' ? answer : null
}

async function resolvePrNumber(args: string[]): Promise<string | null> {
  const positional = positionalArgs(args).find((a) => /^\d+$/.test(a))
  if (positional) return positional
  const detected = detectPrNumber()
  if (detected) return detected
  const answer = (await prompt('PR number (could not auto-detect one for the current branch): ')).trim()
  return /^\d+$/.test(answer) ? answer : null
}

function flagValue(args: string[], flag: string): string | null {
  const eq = args.find((a) => a.startsWith(`${flag}=`))
  if (eq) return eq.slice(flag.length + 1)
  const idx = args.indexOf(flag)
  if (idx !== -1 && args[idx + 1] !== undefined) return args[idx + 1] as string
  return null
}

async function resolveReason(args: string[]): Promise<string> {
  const flagged = flagValue(args, '--reason')
  if (flagged && flagged.trim().length > 0) return flagged.trim()
  const answer = await prompt('Reason for this waiver (one line — posted as a PR comment): ')
  return answer.trim()
}

export async function waiverCommand(args: string[]): Promise<void> {
  const printOnly = args.includes('--print-only')

  const kind = await resolveKind(args)
  if (!kind) {
    console.error('Usage: vinaya waiver <docs|review> [<pr-number>] [--reason <text>] [--print-only]')
    closeStdin()
    process.exit(2)
    return
  }

  const prNumber = await resolvePrNumber(args)
  if (!prNumber) {
    console.error('A PR number is required — none was given and none could be auto-detected.')
    closeStdin()
    process.exit(2)
    return
  }

  const reason = await resolveReason(args)
  closeStdin()
  if (!reason) {
    console.error('A reason is required — the waiver label alone carries no rationale for the reviewer.')
    process.exit(2)
    return
  }

  const label = labelFor(kind)
  const editArgs = ['pr', 'edit', prNumber, '--add-label', label]
  const commentArgs = ['pr', 'comment', prNumber, '--body', `Waiver applied: \`${label}\`\nReason: ${reason}`]

  if (printOnly) {
    process.stdout.write(
      '--print-only: nothing below was executed. Run these yourself, as a human, to apply the waiver:\n\n'
    )
    process.stdout.write(`  gh ${editArgs.join(' ')}\n`)
    process.stdout.write(`  gh ${commentArgs.join(' ')}\n`)
    return
  }

  process.stdout.write(
    `Applying \`${label}\` to PR #${prNumber} under your authenticated \`gh\` identity — vinaya never fabricates an actor.\n`
  )
  execFileSync('gh', editArgs, { stdio: 'inherit', env: process.env })
  execFileSync('gh', commentArgs, { stdio: 'inherit', env: process.env })
  process.stdout.write('\n✓ Label applied and reason posted as a PR comment.\n')
}
