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
 *
 * A second, related class joined this suite later: `RETIRED_IN_PRODUCT` also
 * bans a forge number (`#294`) and an internal tranche slug
 * (`aeg-forge-state-v1`) cited bare in the doctrine `aeg-root/**` publishes.
 * Neither is retired — both are the product's live vocabulary — but citing
 * one as an unexplained doctrine reference is exactly the residue the ruling
 * that ended the decision log already named: "a decision id, a retired
 * mechanism's vocabulary, an internal tranche slug — none of it means
 * anything to someone who was not here, and a tool meant to be adopted
 * cannot ship the residue of the monorepo it grew in." That ruling's
 * enforcement covered `D-###` and stopped; forge numbers and slugs survived
 * unwatched until this pair of patterns closed the gap. Both are scoped to
 * `aeg-root` only via `PATTERN_SCOPE`, not the full `PRODUCT` surface — see
 * the comment on `PATTERN_SCOPE` for why a repo-wide ban would be wrong for
 * this specific class, unlike the ones above it.
 */

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/** Claims that a removed mechanism is current. */
const RETIRED_IN_PRODUCT = [
  // `[0-9]`, never `\d`. Every pattern in this file is POSIX ERE, which has no
  // `\d`/`\w`/`\s` and no lookaheads — GNU grep reads `\d` as a literal `d`, so
  // `\bD-\d{3}\b` matches nothing on Linux. It shipped that way: the citation
  // ban was vacuous on CI while passing locally, because a dev machine's `grep`
  // may resolve to something more permissive. Local green is not evidence for
  // this file; only CI is. The self-test below is what caught it.
  String.raw`\bD-[0-9]{3}\b`,
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
  'assumes Tier 3',
  // A pull-request or Issue number cited as an unexplained parenthetical —
  // `#294`, `(#365)` — inside the doctrine `aeg-root/**` publishes. It
  // resolves only inside this repo's own tracker; an adopter reading the
  // installed doc has no forge to look it up in. Scoped to `aeg-root` only
  // via `PATTERN_SCOPE` below, not the full `PRODUCT` surface: the same
  // digit shape is the live PR/Issue-number grammar the product's own code
  // parses everywhere else (`Closes #N`, golden fixtures, coherence
  // checks) — banning it repo-wide would flag the mechanism itself, not
  // the citation habit this class exists to stop.
  '#[0-9]{2,4}',
  // An internal tranche slug — `aeg-forge-state-v1`, `vinaya-studio-v1` —
  // cited in doctrine prose as a bare pointer to "the tranche that did
  // this," with no reason restated. Same `aeg-root`-only scoping as the
  // pattern above, for the identical reason: tranche slugs are the
  // product's live naming scheme (Milestone titles, fixture filenames,
  // test data across `aeg-core` and `aeg-forge-state`), not a retired
  // vocabulary — only their use as an unexplained doctrine citation is
  // banned.
  '[a-z][a-z-]+-v[0-9]'
]

/**
 * Scopes a `RETIRED_IN_PRODUCT` pattern narrower than the full `PRODUCT`
 * surface. Unlike `D-###`/`decision log` — genuinely retired concepts that
 * appear nowhere live — a forge number or tranche slug is the product's own
 * working vocabulary: it appears legitimately in fixtures, tests, and
 * source across every `PRODUCT` path. What's banned is narrower than the
 * string: citing one as an unexplained doctrine reference. Scoping to the
 * doctrine surface says that precisely, in one static declaration per
 * pattern — not a list that grows every time a new tranche ships.
 */
const PATTERN_SCOPE: Record<string, string[]> = {
  '#[0-9]{2,4}': ['aeg-root'],
  '[a-z][a-z-]+-v[0-9]': ['aeg-root']
}

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
  String.raw`roles/team-leader\.md`,
  // The wreckage a citation strip leaves when it deletes the contents of a
  // parenthetical and not the punctuation around it. Three rounds produced
  // three different signatures — `(, ` then ` (.)` then `,)` — because each
  // scan looked for the shapes the previous round taught it. A pattern ends
  // that: the shape is banned, not the instance.
  //
  // `()` is deliberately NOT here. It is a function call in every TypeScript
  // file in the repo, and banning it would make this suite unrunnable — the
  // empty-parenthesis case is caught by the guards in the strip itself.
  String.raw`\(,`,
  String.raw`,\)`,
  String.raw`\(\.\)`
]

/**
 * Where a mention is legitimate:
 *  - the frozen archive and per-product logs are records of what was decided
 *  - `tranches/completed/**` and retrospectives are history, never rewritten
 *  - the published-prose check must contain the tokens it exists to catch
 *  - this file names them in order to ban them
 */
const EXEMPT = [
  'docs/decisions-legacy.md',
  'apps/herald-ai/docs/',
  'apps/vada-ai/docs/',
  'aeg-root/tranches/completed/',
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

/**
 * Everything an agent in this repo reads.
 *
 * `.aeg` is here because `.aeg/packages` is live config — `checkBlastRadiusScope`
 * reads it — and it was the one governance artifact in neither list, which is
 * how it came to cite a doc that had been renamed out from under it.
 */
const SCOPE = [
  '.aeg',
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
        // Both extensionless governance files: the doc-ownership manifest and
        // the collision-domain list. A glob-only include cannot see either.
        '--include=doc-owners',
        '--include=packages'
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
      const hits = grep(pattern, PATTERN_SCOPE[pattern] ?? PRODUCT).filter((line) => {
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
  '\\bD-[0-9]{3}\\b': 'see D-097 for the rule',
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
  'decision logic': 'NEGATIVE — all decision logic lives in the evaluator',
  '#[0-9]{2,4}': 'fixed the gap (task 3, #365)',
  '[a-z][a-z-]+-v[0-9]': 'landed in aeg-coherence-v1 task 3',
  // The strip-wreckage shapes, each written as the artifact itself.
  '\\(,': 'a rationale block (, point-of-power principle) shipped once',
  ',\\)': 'the seam contract (planner-brief contract,) named here',
  '\\(\\.\\)': 'forces every agent back for the rules. (.)'
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
