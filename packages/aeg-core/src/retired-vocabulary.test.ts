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
const RETIRED = [
  // the decision log as a live, writable, required artifact
  String.raw`decision (entry|logged)`,
  String.raw`decision-log entry`,
  String.raw`decision log entry`,
  // the lock
  String.raw`Lock: ?YES`,
  String.raw`Lock: ?NO`,
  String.raw`lock approvals?`,
  String.raw`approves locks`,
  String.raw`Conforms to lock`,
  String.raw`Challenges lock`,
  // checks deleted with the machinery
  String.raw`checkDecisionNumbersFresh`,
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
  '-decisions.md',
  'aeg-root/iterations/completed/',
  'packages/aeg-core/src/docs/published-prose',
  'packages/aeg-core/src/retired-vocabulary.test.ts',
  '/fixtures/',
  '/node_modules/',
  '/.next/',
  '/.turbo/'
]

/** Surfaces an agent or an adopter actually reads. */
const SCOPE = ['aeg-root', '.claude/skills', '.github', 'packages/aeg-core/src', 'packages/aeg-core/bin', 'apps/vinaya']

function grep(pattern: string): string[] {
  try {
    const out = execFileSync(
      'grep',
      ['-rnE', pattern, ...SCOPE, '--include=*.md', '--include=*.ts', '--include=*.tsx', '--include=*.yml'],
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
      const hits = grep(pattern).filter((line) => !EXEMPT.some((e) => line.includes(e)))
      expect(hits, `\n${hits.join('\n')}\n`).toEqual([])
    })
  }
})
