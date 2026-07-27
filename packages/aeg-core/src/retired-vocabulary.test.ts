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
  //
  // NO `\b` HERE, and the omission is the whole point. `#` is a non-word
  // character, so `\bD-###\b` cannot anchor after the final `#` and silently
  // never matches — the pattern written to close this gap reported green over
  // eleven live sites. There is no real word ending in `###`/`NNN`/`xxx` for a
  // boundary to protect against, so the literal alternation is both correct
  // and sufficient. The "gate can see what it bans" suite below pins it.
  'D-(###|NNN|nnn|xxx)',
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
  // `decisions.md` does not match `decisions-legacy.md`, so the one sentence
  // this gate was built to end — "a task updates the root
  // `docs/decisions-legacy.md`" — was the one string it could not see. It
  // survived seven rounds that way.
  'decisions-legacy',
  'CONTRADICTION',
  'assumes Tier 3'
]

/**
 * Paths a single pattern may legitimately mention, on top of `EXEMPT`.
 *
 * Scoped per pattern rather than added to the global list: `file-classify.ts`
 * must name the archives to exclude them, and its tests must assert the real
 * paths (round 5 proved what happens when they assert a synthetic one). None of
 * that licenses those files to carry the rest of the retired vocabulary.
 */
const PATTERN_EXEMPT: Record<string, string[]> = {
  'decisions-legacy': [
    'packages/aeg-core/src/file-classify.ts',
    'packages/aeg-core/src/file-classify.test.ts',
    'packages/aeg-core/src/pr-tier.test.ts'
  ]
}

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

/**
 * The surfaces an adopter installs and reads.
 *
 * `packages/aeg-forge-state` is here because the CLI consumes it: its label
 * vocabulary is rendered to adopters, so it is product surface even though it
 * sits outside the three directories the ruling names. `.vinaya/` is the
 * config an adopter's own repo grows, and its comments are read by whoever
 * edits it.
 */
const PRODUCT = [
  'aeg-root',
  'packages/aeg-core',
  'packages/aeg-forge-state',
  'apps/vinaya',
  '.vinaya',
  '.claude/skills/aeg',
  '.claude/skills/aeg-roles'
]

/** Everything an agent in this repo reads. */
const SCOPE = [
  'aeg-root',
  '.claude',
  '.github',
  '.vinaya',
  'packages/aeg-core',
  'apps/vinaya',
  'packages/aeg-forge-state'
]

function grep(pattern: string, scope: string[] = SCOPE): string[] {
  try {
    const out = execFileSync(
      'grep',
      [
        '-rnE',
        pattern,
        ...scope,
        '--include=*.md',
        '--include=*.ts',
        '--include=*.tsx',
        '--include=*.yml',
        '--include=doc-owners'
      ],
      { cwd: REPO_ROOT, encoding: 'utf8' }
    )
    return out.split('\n').filter(Boolean)
  } catch {
    return [] // grep exits 1 on no matches
  }
}

/**
 * Does this pattern, run through the same `grep -E` the gate uses, actually
 * match the thing it exists to catch?
 *
 * A pattern that matches nothing passes every scope silently — which is not a
 * hypothetical: `\bD-(###|NNN)\b` shipped as green over eleven live sites
 * because `\b` cannot anchor after `#`. Every pattern is therefore proved
 * against a positive sample below, so the gate fails loud when a pattern is
 * broken rather than reporting a clean repo.
 */
function matches(pattern: string, sample: string): boolean {
  try {
    execFileSync('grep', ['-E', pattern], { input: sample, encoding: 'utf8' })
    return true
  } catch {
    return false
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
      const exempt = [...EXEMPT, ...(PATTERN_EXEMPT[pattern] ?? [])]
      const hits = grep(pattern, PRODUCT).filter((line) => {
        const path = line.slice(0, line.indexOf(':'))
        return !exempt.some((e) => path.includes(e))
      })
      expect(hits, `\n${hits.slice(0, 30).join('\n')}\n(${hits.length} total)\n`).toEqual([])
    })
  }
})

/**
 * A sample every pattern must match. Not a convenience — the gate's own
 * failure mode is a pattern that matches nothing and therefore passes.
 */
const SAMPLES: Record<string, string> = {
  '\\bD-\\d{3}\\b': 'see D-097 for the rule',
  'D-(###|NNN|nnn|xxx)': 'a Tier 3 change requiring a D-###',
  'decision log(s|ged|ging)?([^a-z]|$)': 'read the decision log first',
  'decision-log': 'a decision-log entry is required',
  'decision entr': 'add a decision entry',
  'decisions? (are |is )?logged': 'why decisions are logged',
  'log entries': 'Type 1 decisions without log entries',
  'decisions\\.md': 'log it to decisions.md',
  'decisions-legacy': 'a task updates docs/decisions-legacy.md',
  CONTRADICTION: 'open a ## CONTRADICTION — <topic> entry',
  'assumes Tier 3': 'verify-docs assumes Tier 3 when no tier is declared',
  'decision (entry|logged)': 'every Tier 3 change needs a decision entry',
  'decision-log entry': 'requires a decision-log entry',
  'decision log entry': 'requires a decision log entry',
  'Lock: ?YES': 'D-035 (`Lock: YES`)',
  'Lock: ?NO': 'a `Lock: NO` decision is just as committed',
  'lock approvals?': 'the Principal grants lock approval',
  'approves locks': 'the Principal approves locks',
  'Conforms to lock': 'Conforms to lock: yes',
  'Challenges lock': 'Challenges lock: no',
  checkDecisionNumbersFresh: 'checkDecisionNumbersFresh refuses the branch',
  'roles/team-leader\\.md': 'see roles/team-leader.md',
  'decision logic': 'NEGATIVE — all decision logic lives in the evaluator'
}

describe('the gate can see what it bans', () => {
  for (const pattern of [...RETIRED, ...RETIRED_IN_PRODUCT]) {
    it(`matches a real instance: ${pattern}`, () => {
      const sample = SAMPLES[pattern]
      expect(sample, `no sample for pattern ${pattern} — add one`).toBeDefined()
      expect(matches(pattern, sample as string), `pattern never matches its own sample: ${pattern}`).toBe(true)
    })
  }

  it('`decision log` does not match `decision logic` — ordinary English stays legal', () => {
    expect(matches('decision log(s|ged|ging)?([^a-z]|$)', 'all decision logic lives in the evaluator')).toBe(false)
  })

  it('the placeholder pattern matches every form, including the one a word boundary breaks', () => {
    for (const form of ['D-###', 'D-NNN', 'D-nnn', 'D-xxx']) {
      expect(matches('D-(###|NNN|nnn|xxx)', `cites ${form} here`), `missed ${form}`).toBe(true)
    }
    // The exact regression: a trailing `\b` cannot anchor after `#`.
    expect(matches(String.raw`\bD-(###|NNN)\b`, 'cites D-### here')).toBe(false)
  })
})
