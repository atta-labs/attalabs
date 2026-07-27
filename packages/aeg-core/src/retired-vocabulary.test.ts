import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The doctrine sweep, as a check instead of a habit.
 *
 * Five review rounds each declared the decision-log claim swept, and each time
 * it resurfaced a few lines from where the previous pass fixed it — usually in
 * a more authoritative document than the last. That is the signature of a rule
 * enforced by attention rather than by a gate, which is the exact failure this
 * whole change exists to end. So: the rule gets a gate.
 *
 * A retired mechanism must not be described as live anywhere an agent reads.
 * `EXEMPT` is the honest, enumerated list of places a mention is legitimate —
 * frozen archives, historical records, and this file. Anything else is a
 * failure with the file and line printed.
 */

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Claims that a removed mechanism is current. */
const RETIRED_IN_PRODUCT = [
  String.raw`\bD-\d{3}\b`,
  // The placeholder forms too. A doc that says `D-###` or `## D-NNN` is
  // teaching the grammar of a record that no longer exists, which is the same
  // failure as citing a real one — and it is the form four sweeps missed,
  // because a census for digits never sees a hash.
  String.raw`\bD-(###|NNN|nnn|xxx)\b`,
  // `decision log`, in every inflection, but never `decision logic` — the
  // latter is ordinary English about where branching lives, and has nothing to
  // do with the retired record. Written without a lookahead: `grep -E` is POSIX
  // ERE, where `(?!…)` is not a negation but a literal.
  'decision log(s|ged|ging)?([^a-z]|$)',
  'decision-log',
  'decision entr',
  // The verb forms a noun-phrase census steps over: "decisions are logged",
  // "logged as a", "without log entries".
  'decisions? (are |is )?logged',
  'log entries',
  String.raw`decisions\.md`,
  'CONTRADICTION',
  'assumes Tier 3'
]

const RETIRED = [
  // the retired record as a live, writable, required artifact
  'decision (entry|logged)',
  'decision-log entry',
  'decision log entry',
  // the lock
  'Lock: ?YES',
  'Lock: ?NO',
  'lock approvals?',
  'approves locks',
  'Conforms to lock',
  'Challenges lock',
  // checks deleted with the machinery
  'checkDecisionNumbersFresh',
  // the role that no longer exists
  String.raw`roles/team-leader\.md`
]

/**
 * Where a mention is legitimate:
 *  - the frozen archive and per-product logs are records of what was decided
 *  - `iterations/completed/**` and retrospectives are history, never rewritten
 *  - the published-prose check must contain the tokens it exists to catch
 *  - this file names them in order to ban them
 */
const EXEMPT = [
  'docs/decisions-legacy.md',
  'apps/herald-ai/docs/',
  'apps/vada-ai/docs/',
  'aeg-root/iterations/completed/',
  'packages/aeg-core/src/docs/published-prose',
  'packages/aeg-core/src/retired-vocabulary.test.ts',
  '/fixtures/',
  '/node_modules/',
  '/.next/',
  '/.turbo/'
]

/** The surfaces an adopter installs and reads. */
const PRODUCT = ['aeg-root', 'packages/aeg-core', 'apps/vinaya', '.claude/skills/aeg', '.claude/skills/aeg-roles']

/** Everything an agent in this repo reads. */
const SCOPE = ['aeg-root', '.claude', '.github', 'packages/aeg-core', 'apps/vinaya', 'packages/aeg-forge-state']

function grep(pattern: string, scope: string[] = SCOPE): string[] {
  try {
    const out = execFileSync(
      'grep',
      ['-rnE', pattern, ...scope, '--include=*.md', '--include=*.ts', '--include=*.tsx', '--include=*.yml'],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    )
    return out.split('\n').filter(Boolean)
  } catch {
    return [] // grep exits 1 on no matches
  }
}

describe('retired vocabulary stays retired', () => {
  for (const pattern of RETIRED) {
    it(`no live surface claims: ${pattern}`, () => {
      const hits = grep(pattern).filter((line) => {
        const path = line.slice(0, line.indexOf(':')) // PATH ONLY — never the content
        return !EXEMPT.some((e) => path.includes(e))
      })
      expect(hits, `\n${hits.join('\n')}\n`).toEqual([])
    })
  }
})

describe('the product carries no trace of a history the adopter lacks', () => {
  for (const pattern of RETIRED_IN_PRODUCT) {
    it(`absent from the installed surfaces: ${pattern}`, () => {
      const hits = grep(pattern, PRODUCT).filter((line) => {
        const path = line.slice(0, line.indexOf(':'))
        return !EXEMPT.some((e) => path.includes(e))
      })
      expect(hits, `\n${hits.slice(0, 30).join('\n')}\n(${hits.length} total)\n`).toEqual([])
    })
  }
})
