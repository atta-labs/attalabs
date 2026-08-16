import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
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
 * unwatched until this pair of patterns closed the gap. `FORGE_NUMBER_PATTERN`
 * and `LEGACY_SLUG_PATTERN` are scoped to `aeg-root` only via `PATTERN_SCOPE`
 * — that directory is pure doctrine prose, no test fixtures, so a blind grep
 * there cannot mistake a legitimate occurrence for a citation.
 * `TRANCHE_SLUG_VN_PATTERN` needed a wider net (a real citation surfaced in
 * shipped `apps/vinaya/cli/src` comments, not doctrine), but not the full
 * `PRODUCT` surface: widening it to every path once flooded with hundreds of
 * false positives — `aeg-core`/`aeg-forge-state`'s own test fixtures
 * legitimately using real tranche names as data, and other products' entirely
 * unrelated `-vN` naming (Vāda's `crucible-v1.yaml`). See the comment on
 * `PATTERN_SCOPE` for the resulting hand-picked surface.
 *
 * A third failure mode, found by post-merge review, joined coverage to
 * vacuity: `[a-z][a-z-]+-v[0-9]` only sees a tranche slug that ends `-vN`.
 * Four of this repo's own archived tranches — `aeg-governance-hardening`,
 * `aeg-consolidation`, `aeg-studio-cleanup`, `herald-onto-engine` — predate
 * that suffix convention, and the shape-based pattern is structurally blind
 * to them; its self-guard sample (`aeg-coherence-v1`) happened to be drawn
 * from the class the pattern already covers, so it proved non-vacuity
 * without ever proving coverage. `LEGACY_SLUG_PATTERN` below closes that:
 * derived from `aeg-root/tranches/completed/*.md` filenames — the
 * authoritative list of what a real slug looks like — instead of a
 * hand-shaped regex guess, so it cannot drift from reality the way the
 * `-vN` guess did.
 */

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..')

/**
 * Real archived tranche slugs that predate the `-vN` naming convention,
 * read live from the one place they're authoritative: the completed-tranche
 * archive itself. Slugs `TRANCHE_SLUG_VN_PATTERN` already sees are excluded
 * — no point banning the same string with two patterns.
 */
function legacySlugs(): string[] {
  const dir = join(REPO_ROOT, 'aeg-root/tranches/completed')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.endsWith('.tokens.md'))
    .map((f) => f.slice(0, -3))
    .filter((slug) => !/-v[0-9]+$/.test(slug))
}

const FORGE_NUMBER_PATTERN = '#[0-9]{2,4}'
const TRANCHE_SLUG_VN_PATTERN = '[a-z][a-z-]+-v[0-9]'
const LEGACY_SLUGS = legacySlugs()
// Empty only if every archived tranche ever adopts the `-vN` suffix — in
// which case there is nothing left for this pattern to catch, and it is
// dropped rather than shipped as a pattern with no positive sample.
const LEGACY_SLUG_PATTERN = LEGACY_SLUGS.length > 0 ? `(${LEGACY_SLUGS.join('|')})` : null

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
  FORGE_NUMBER_PATTERN,
  // An internal tranche slug — `aeg-forge-state-v1`, `vinaya-studio-v1` —
  // cited in doctrine prose as a bare pointer to "the tranche that did
  // this," with no reason restated. Same `aeg-root`-only scoping as the
  // pattern above, for the identical reason: tranche slugs are the
  // product's live naming scheme (Milestone titles, fixture filenames,
  // test data across `aeg-core` and `aeg-forge-state`), not a retired
  // vocabulary — only their use as an unexplained doctrine citation is
  // banned.
  TRANCHE_SLUG_VN_PATTERN,
  // The same citation class, for the slugs that predate `-vN`. See the file
  // header for why this is a second pattern rather than a broader regex.
  ...(LEGACY_SLUG_PATTERN ? [LEGACY_SLUG_PATTERN] : [])
]

/**
 * Scopes a `RETIRED_IN_PRODUCT` pattern narrower than the full `PRODUCT`
 * surface. Unlike `D-###`/`decision log` — genuinely retired concepts that
 * appear nowhere live — a forge number or tranche slug is the product's own
 * working vocabulary: it appears legitimately in fixtures, tests, and
 * source across every `PRODUCT` path. What's banned is narrower than the
 * string: citing one as an unexplained doctrine reference.
 *
 * `FORGE_NUMBER_PATTERN` and `LEGACY_SLUG_PATTERN` scope to `aeg-root` only
 * — pure doctrine prose, no test fixtures live there, so a blind grep can't
 * mistake a legitimate occurrence for a citation.
 *
 * `TRANCHE_SLUG_VN_PATTERN` needs a second surface: the real incident this
 * pattern exists to catch was a citation in shipped `apps/vinaya/cli/src`
 * comments, not doctrine. It stays narrow, not `PRODUCT`-wide — first tried
 * at `['.']`, which produced ~600 false positives (aeg-core/aeg-forge-state's
 * own test fixtures using real tranche names as data, plus other products'
 * unrelated `-vN` naming like Vāda's `crucible-v1.yaml`) once the grep
 * buffer bug that had been silently swallowing that flood as "no hits" got
 * fixed. `apps/vinaya/cli/src` only, not `cli/tests` — the fixtures there
 * are the same legitimate-data case aeg-core's own tests are.
 *
 * This does not contradict `PRODUCT`'s own "an enumerated list is a
 * blind spot" argument above — it is a different scoping problem, not
 * the same one solved differently. `D-###`/`decision log` are dead
 * vocabulary with no legitimate positive occurrence anywhere, so
 * `PRODUCT = ['.']` costs nothing to keep repo-wide. A tranche slug is
 * the product's own live naming, colliding with real fixtures and other
 * products' unrelated conventions everywhere outside doctrine — going
 * repo-wide there isn't "a list that might miss a future path," it's
 * "a list that is mostly wrong right now." Known, deliberately
 * out-of-surface consequence: this scope does not yet reach Herald's
 * or `packages/agents/`'s own source comments (e.g.
 * `packages/agents/forensic-hiring-auditor/src/tools/github-signals.ts`,
 * `apps/herald-ai/web/src/components/HeraldAccountMenu.tsx`,
 * `apps/herald-ai/web/src/components/envoy/ReportView.tsx`), which
 * still carry live tranche-slug citations today — tracked as its own
 * follow-up, #736 (widen to Herald/Vāda/attalabs the same way this
 * task widened to Vinaya) rather than silently left unowned.
 */
const PATTERN_SCOPE: Record<string, string[]> = {
  [FORGE_NUMBER_PATTERN]: ['aeg-root'],
  [TRANCHE_SLUG_VN_PATTERN]: [
    'aeg-root',
    // `apps/vinaya/cli/src` and `apps/vinaya/cli/README.md` were in this
    // scope until the vendored CLI workspace was deleted (attalabs now
    // installs the published `@attalabs/vinaya` from npm; the canonical
    // source lives in the standalone atta-labs/vinaya repo). A path that
    // does not exist makes the whole grep exit 2 and fail every pattern,
    // so they must not linger here after the deletion.
    '.claude/skills',
    '.github/workflows',
    '.vinaya',
    'CLAUDE.md',
    // Vinaya's own prose doctrine — CLAUDE.md/README/specs, never src or
    // test/fixture dirs (those hold functional tranche-slug handling and
    // legitimate test data, the same false-positive class ['.'] produced).
    'apps/vinaya/CLAUDE.md',
    'apps/vinaya/README.md',
    'apps/vinaya/sources/README.md',
    'apps/vinaya/specs',
    'apps/vinaya/web/CLAUDE.md',
    'apps/vinaya/web/README.md',
    'apps/vinaya/web/design'
  ],
  // LEGACY_SLUG_PATTERN stays aeg-root-only, deliberately not widened with the
  // VN pattern above: every slug it can ever match is, by construction,
  // already archived (derived from aeg-root/tranches/completed/*.md) — citing
  // a closed tranche is the safe case (same durability class as a closed PR),
  // not the live-citation problem this widening exists to catch.
  ...(LEGACY_SLUG_PATTERN ? { [LEGACY_SLUG_PATTERN]: ['aeg-root'] } : {})
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
  '\\bD-[0-9]{3}\\b': [
    // The one confirmed load-bearing exception (task-729 sweep, widening PRODUCT
    // to `['.']`): a foundational architectural fact (Cetana's retirement) whose
    // D-numbers resolve to the permanent archive — not a routine build-log
    // citation like the ~300 others the same sweep stripped.
    './CLAUDE.md'
  ],
  'decisions\\.md': [
    // `engine/design-decisions.md` is Vāda's own live, current design-decisions
    // doc — not the retired global `decisions.md`. The bare-substring pattern
    // can't distinguish the two; these are the citing files (task-729 sweep).
    'docs-index.md',
    'apps/vada-ai/specs/legacy/README.md',
    'apps/vada-ai/specs/vada-product-spec.md',
    'apps/vada-ai/web/CLAUDE.md',
    'apps/vada-ai/CLAUDE.md'
  ],
  'decisions-legacy': [
    'packages/aeg-core/src/file-classify.ts',
    'packages/aeg-core/src/file-classify.test.ts',
    'packages/aeg-core/src/pr-tier.test.ts',
    // Legitimate archive-index pointers ("see X for history"), not claims that
    // the frozen archive is a live/writable artifact (task-729 sweep).
    'docs-index.md',
    '.claude/skills/database/SKILL.md',
    '.claude/skills/vada-architecture/SKILL.md',
    'apps/vada-ai/specs/vada-byok-principles.md',
    'apps/vada-ai/web/CLAUDE.md',
    'apps/vada-ai/CLAUDE.md'
  ],
  CONTRADICTION: [
    // Vāda Reviewers' live "CONTRADICTIONS" output section — a real product
    // feature, coincidentally matching the retired decision-log's
    // "## CONTRADICTION — <topic>" entry-shape ban. Not a citation
    // (task-729 sweep).
    'apps/vada-ai/specs/vada-reviewers-spec.md'
  ],
  '[a-z][a-z-]+-v[0-9]': [
    // Team-catalog spec `id:` fields (`sparring-v1`, `brokered-trio-v1`) — the
    // product's own live YAML naming, structurally identical in shape to an
    // AEG tranche slug but not one. Not a citation.
    '.claude/skills/atta-teams/SKILL.md'
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
 * The scope `RETIRED_IN_PRODUCT` checks against.
 *
 * Repo-wide (`['.']`), not an enumerated adopter-surface list. It used to be
 * a 7-path array (`aeg-root`, `packages/aeg-core`, `packages/aeg-forge-state`,
 * `apps/vinaya`, `.vinaya`, and 2 of 22 `.claude/skills`) — but an enumerated
 * list has the exact blind-spot shape that let a `D-###` citation sit
 * unwatched in root `CLAUDE.md` and a dangling reference survive PR #725's
 * manual citation-strip: a new package/app lands and nobody remembers to add
 * it here. `['.']` is self-maintaining — every current and future surface is
 * covered by construction. `SCOPE` below (for the separate `RETIRED`
 * pattern list) is unaffected by this change.
 */
const PRODUCT = ['.']

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
        '--include=packages',
        // PRODUCT went from a 7-path enumeration to ['.'] — every one of
        // those paths was hand-picked to stay outside node_modules; '.' is
        // not. Without these, a common-shape pattern (e.g. the tranche-slug
        // regex matching version strings like `--tls-max-v1.2` in vendored
        // .d.ts files) produces megabytes of matches and blows execFileSync's
        // default 1MB buffer — see the catch block below for what that does
        // if left uncaught.
        '--exclude-dir=node_modules',
        '--exclude-dir=.git',
        '--exclude-dir=.next',
        '--exclude-dir=.turbo',
        '--exclude-dir=dist',
        '--exclude-dir=build'
      ],
      // maxBuffer is defense in depth, not the fix — --exclude-dir above is
      // what keeps output bounded. 20MB is generous headroom past the
      // largest observed full-repo sweep (~250KB) without masking a genuine
      // future blowup by just raising the ceiling indefinitely.
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    )
    return out.split('\n').filter(Boolean)
  } catch (error) {
    // grep's contract: exit 1 means "no matches" — every other outcome
    // (a bad pattern, a missing scope path, ENOBUFS from an unbounded
    // scope) is a real failure. A bare `catch { return [] }` could not
    // tell those apart: it turned the exact ENOBUFS case above into a
    // silent, incorrect "clean repo" instead of a loud test failure. That
    // is not hypothetical — it is what widening PRODUCT to ['.'] did to
    // this suite before --exclude-dir existed.
    if ((error as { status?: number }).status === 1) return []
    throw error
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

describe('grep() distinguishes "no matches" from a real failure', () => {
  // The exact regression this task exists to prevent: a bare `catch { return
  // [] }` cannot tell grep's real "nothing found" (exit 1) apart from a
  // genuine failure (bad scope, ENOBUFS) — it silently reported both as a
  // clean repo. Pinned directly against `grep()`, not just observed as a
  // side effect of the pattern suites above passing.
  it('returns [] for a pattern with zero matches (exit 1) — the legitimate case', () => {
    expect(grep('ZZZ_NO_SUCH_STRING_EVER_MATCHES_ANYTHING_ZZZ', ['aeg-root'])).toEqual([])
  })

  it('rethrows for a malformed pattern (grep exits 2) — a real failure, not "no matches"', () => {
    // Unbalanced bracket expression: grep exits 2 with a stderr message, never
    // 1. A missing scope path is NOT usable for this on this platform — BSD
    // grep silently returns exit 1 for a nonexistent directory too, identical
    // to "no matches" — so a malformed pattern is the reliable non-1 case.
    expect(() => grep('[', ['aeg-root'])).toThrow()
  })
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
  [FORGE_NUMBER_PATTERN]: 'fixed the gap (task 3, #365)',
  [TRANCHE_SLUG_VN_PATTERN]: 'landed in aeg-coherence-v1 task 3',
  // Drawn from the exact class the `-vN` pattern is blind to (the class
  // this pattern exists to cover) — not a slug the pattern above already
  // catches, so this proves coverage, not just non-vacuity.
  ...(LEGACY_SLUG_PATTERN ? { [LEGACY_SLUG_PATTERN]: `shipped during ${LEGACY_SLUGS[0]}` } : {}),
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
