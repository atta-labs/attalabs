#!/usr/bin/env bun
/**
 * vocabulary-citation — this repo's own configured instance of the
 * pluggable citation check (`@attalabs/aeg-core`'s `evaluateVocabularyCitation`,
 * task 6 / Issue #736).
 *
 * `retired-vocabulary.test.ts` proved this sweep shape works but ships it as
 * a `vitest` file no adopter can install, and it has no product-name pattern
 * and no harness/host-artifact pattern at all — 15 consumer-product
 * references sat live in `packages/aeg-core`/`packages/aeg-forge-state`
 * while that suite passed green (PR #739 cleaned them by hand; nothing
 * stopped them regenerating). This file is the I/O shim + the repo-specific
 * configuration: real `grep`-backed `grepFn`/`matchFn`, and the pattern list
 * itself. The evaluator in `@attalabs/aeg-core` carries none of this — every
 * pattern, scope, exemption and sample below is an input to it, not
 * knowledge it has.
 *
 * Two pattern classes, per Issue #736's 2026-08-05 amendment:
 *   - Class 1 (consumer product names) — scoped to the four surfaces named
 *     in the amendment: `packages/aeg-core`, `packages/aeg-forge-state`,
 *     `aeg-root`, `apps/vinaya`.
 *   - Class 2 (harness/host artifacts in portable doctrine) — `.claude/`,
 *     `.husky/`, and a citation of a specific `scripts/*.ts|js|sh|mjs` file,
 *     scoped to `aeg-root` only. `exemptTableRow: true` on every Class-2
 *     path pattern: `aeg-root/enforcement.md`'s ring tables legitimately
 *     name `.claude/hooks/*.sh` and `.husky/*` in their `implementation`
 *     column — G1/G2 (`verify-registry.ts`) depend on those exact citations
 *     resolving. Banning the shape those tables use would flag the registry
 *     this check exists to help protect, not the leakage it targets. The
 *     rule this check encodes is narrower: a harness path may appear in a
 *     registry/implementation column (a table row); it must not appear
 *     as normative prose stating what the model requires. See
 *     `@attalabs/aeg-core`'s `vocabulary-citation.test.ts` for the two
 *     pinned cases (table row vs. prose) this distinction rests on.
 *
 * A third scope, per the 2026-08-06 amendment: shared multi-product
 * packages are a portable surface by the same argument as `aeg-core` — a
 * reader of `packages/models/src` has neither product's context and no
 * forge. `packages/models/src` is added to the harness-vocabulary pattern
 * (the AEG role-vocabulary sub-pattern below — `Principal-ratifiable`,
 * the exact string PR #742 removed from this package before merge, the
 * near-miss that surfaced this scope gap) and to the forge-number pattern.
 * Triaged to `packages/models` only, per the amendment's "do not
 * blind-widen" instruction — other shared packages' own `src/` directories
 * are not yet covered.
 *
 * Deliberately NOT covered (out of surface for task 6): sweeping every
 * doctrine file under `aeg-root/**` for the Class-2 patterns above — the
 * table-row exemption is proved correct at the unit level, but this repo's
 * doctrine has ~17 pre-existing prose citations of `.claude/`/`.husky/`
 * elsewhere in `aeg-root` (e.g. `roles/planner.md`, `state-machine.md`,
 * skill docs under `aeg-root/skills/`) that legitimately explain the harness
 * rather than leak an unexplained reference — distinguishing "explains" from
 * "leaks" is a meaning judgment this regex-based check cannot make, and
 * triaging those 17 files is exactly the doctrine-tree sweep task 8 owns,
 * not this task.
 *
 * Task 8 (2026-08-06 amendment) — scope widened to the three product trees
 * every pattern was previously blind to: `apps/vada-ai/specs`,
 * `apps/vada-ai/CLAUDE.md`, `apps/herald-ai/specs`, `apps/herald-ai/CLAUDE.md`,
 * `apps/attalabs/specs`, `apps/attalabs/CLAUDE.md`, plus the root `CLAUDE.md`
 * (unreachable by any prior scope entry).
 *
 * Resolved judgment call (task 8's own to make, per Issue #746's Boundary):
 * `consumer-product-name` is NOT widened to these three trees.
 * `evaluateVocabularyCitation`'s own "real leak" test for this pattern is
 * explicitly qualified — Class 1, per task 6's amendment — to "a surface
 * that ships or claims portability." `apps/vada-ai`, `apps/herald-ai`,
 * `apps/attalabs`, and root `CLAUDE.md` are internal-only monorepo
 * engineering doctrine: none of them ship to an adopter or claim
 * portability the way `apps/vinaya` (its CLI ships), `aeg-root` (copied out
 * by `vinaya init`), or `aeg-core`/`aeg-forge-state` (code the ship depends
 * on) do. Sampling the widened run before settling this (616 findings, 423
 * from `consumer-product-name` alone) confirmed the theory: the overwhelming
 * majority were internal file-path citations (`apps/vada-ai/web/...`),
 * cross-references between sibling products in the same monorepo ("Herald
 * byte-identity", "Herald's `JDInput`..."), or a product naming its own
 * domain/package (`vada.ai`, `@vada/agents`) — none of which read as an
 * unexplained citation to a reader who, by construction, is always inside
 * this same repo for these three trees. Widening it anyway would have
 * produced a true-positive rate far under half, the exact condition Issue
 * #746 names as a task-6 scoping defect rather than something to
 * hand-triage around.
 *
 * The other five patterns (`harness-claude-path`, `harness-husky-path`,
 * `harness-scripts-file`, `harness-role-vocabulary`, `forge-number`) ARE
 * widened to all four surfaces below. None of their doc comments carry the
 * same portability qualifier — a bare `.claude/`/`.husky/`/`scripts/*.ts`
 * citation or forge number is unexplained-citation debt regardless of
 * whether the surface ships, the same standard already enforced against
 * `aeg-root` (itself not directly shipped either, only copied out by
 * `vinaya init`) since task 6. `apps/vinaya` is unchanged in these five
 * patterns' scope: task 6 deliberately scoped Class 2 to `aeg-root` only,
 * and this task does not reopen that choice. `apps/vinaya` is likewise
 * unchanged in `consumer-product-name`'s scope — its own doctrine is
 * already reachable via the existing `apps/vinaya` scope entry on
 * `consumer-product-name`, and the harness patterns' pre-existing exclusion
 * of `apps/vinaya` was task 6's own deliberate choice, not reopened here.
 */

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateVocabularyCitation, type VocabularyHit, type VocabularyPattern } from '@attalabs/aeg-core'

const CHECK_NAME = 'attalabs/vocabulary-citation'
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..')

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

// Mirrors `retired-vocabulary.test.ts`'s own `grep()`: exit 1 means
// "no matches" (return []); anything else (bad pattern, missing scope path,
// ENOBUFS from an unbounded scope) is a real failure and must not be
// swallowed into a false-clean result.
function grepFn(pattern: string, scope: string[]): VocabularyHit[] {
  let out: string
  try {
    out = execFileSync(
      'grep',
      [
        '-rnE',
        pattern,
        ...scope,
        '--include=*.md',
        '--include=*.ts',
        '--include=*.tsx',
        '--include=*.yml',
        '--exclude-dir=node_modules',
        '--exclude-dir=.git',
        '--exclude-dir=.next',
        '--exclude-dir=.turbo',
        '--exclude-dir=dist',
        '--exclude-dir=build'
      ],
      { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    )
  } catch (error) {
    if ((error as { status?: number }).status === 1) return []
    throw error
  }

  const hits: VocabularyHit[] = []
  for (const line of out.split('\n').filter(Boolean)) {
    const match = /^([^:]+):(\d+):(.*)$/.exec(line)
    if (!match) continue
    hits.push({ file: match[1], line: Number(match[2]), content: match[3] })
  }
  return hits
}

// Mirrors `retired-vocabulary.test.ts`'s own `matches()` — proves a pattern
// actually matches the sample it claims to, through the identical `grep -E`
// engine the sweep above uses.
function matchFn(pattern: string, sample: string): boolean {
  try {
    execFileSync('grep', ['-E', pattern], { input: sample, encoding: 'utf8' })
    return true
  } catch {
    return false
  }
}

const GLOBAL_EXEMPT = [
  '/fixtures/',
  'aeg-root/tranches/completed/',
  'apps/vada-ai/docs/',
  'apps/herald-ai/docs/',
  'apps/vinaya/docs/',
  '/node_modules/',
  '/.next/',
  '/.turbo/',
  // Task 8 — same frozen-archive class as `aeg-root/tranches/completed/`
  // and the `docs/` entries above, extended to a tree that happens to live
  // under `specs/` instead: `specs/legacy/README.md` states its own purpose
  // as "Historical specs — superseded," the identical characterization the
  // other frozen-archive entries in this list share. Citation hygiene is
  // not a meaningful obligation for content the product itself has already
  // marked retired.
  'apps/vada-ai/specs/legacy/'
]

const PATTERNS: VocabularyPattern[] = [
  {
    id: 'consumer-product-name',
    pattern: String.raw`\b(vada|herald|attalabs|vitakka|sati)\b`,
    scope: ['aeg-root', 'apps/vinaya'],
    sample: 'built directly on vada internals',
    // `.test.ts` files under this scope can legitimately use real product
    // paths as fixture data — the identical false-positive class
    // `retired-vocabulary.test.ts`'s own TRANCHE_SLUG_VN_PATTERN comment
    // documents. `packages/aeg-core`/`packages/aeg-forge-state` used to be
    // in `scope` for the same reason (their `.test.ts` files produced
    // ~170 such hits) until the attalabs-adoption tranche deleted both
    // local copies; this exempt stays as a general rule for whatever else
    // lands under the current scope.
    exempt: ['.test.ts'],
    // Vinaya's own published identifiers. `attalabs` inside the npm scope
    // `@attalabs/vinaya` or the domain `vinaya.attalabs.dev` is the product
    // naming itself — an adopter reads those as a package name and a URL, not
    // as an unexplained reference to someone else's product. Content-scoped
    // rather than path-scoped on purpose: `apps/vinaya/specs/vinaya-spec.md`
    // carries 18 of these AND is a surface where real leakage could appear, so
    // exempting the file would blind the pattern to the thing it exists for.
    //
    // Task 8 — `attalabs' own` added as the same false-positive class,
    // found recurring during the doctrine sweep: `vinaya-spec.md`'s "Vinaya's
    // own vs. attalabs' own" section uses this idiom six times to describe
    // the parent monorepo's own unshipped tooling/CI, as distinct from what
    // Vinaya ships — the section's entire purpose is explaining that
    // boundary, not leaking an unexplained reference to it.
    exemptContent: ['@attalabs/', 'attalabs.dev', "attalabs' own"]
  },
  {
    id: 'harness-claude-path',
    pattern: String.raw`\.claude/`,
    scope: [
      'aeg-root',
      'apps/vada-ai/specs',
      'apps/vada-ai/CLAUDE.md',
      'apps/herald-ai/specs',
      'apps/herald-ai/CLAUDE.md',
      'apps/attalabs/specs',
      'apps/attalabs/CLAUDE.md',
      'CLAUDE.md'
    ],
    sample: 'wired via .claude/hooks/check-skill.sh',
    exemptTableRow: true
  },
  {
    id: 'harness-husky-path',
    pattern: String.raw`\.husky/`,
    scope: [
      'aeg-root',
      'apps/vada-ai/specs',
      'apps/vada-ai/CLAUDE.md',
      'apps/herald-ai/specs',
      'apps/herald-ai/CLAUDE.md',
      'apps/attalabs/specs',
      'apps/attalabs/CLAUDE.md',
      'CLAUDE.md'
    ],
    sample: 'runs from .husky/pre-push',
    exemptTableRow: true
  },
  {
    id: 'harness-scripts-file',
    pattern: String.raw`scripts/[a-zA-Z0-9_/-]+\.(ts|js|sh|mjs)`,
    scope: [
      'aeg-root',
      'apps/vada-ai/specs',
      'apps/vada-ai/CLAUDE.md',
      'apps/herald-ai/specs',
      'apps/herald-ai/CLAUDE.md',
      'apps/attalabs/specs',
      'apps/attalabs/CLAUDE.md',
      'CLAUDE.md'
    ],
    sample: 'run scripts/vinaya-checks/vocabulary-citation.ts to check',
    exemptTableRow: true
  },
  {
    id: 'harness-role-vocabulary',
    pattern: String.raw`\bPrincipal-ratifiable\b`,
    // packages/models/src: the 2026-08-06 amendment's shared-package scope
    // (the exact string PR #742 removed from this package's source).
    scope: [
      'aeg-root',
      'packages/models/src',
      'apps/vada-ai/specs',
      'apps/vada-ai/CLAUDE.md',
      'apps/herald-ai/specs',
      'apps/herald-ai/CLAUDE.md',
      'apps/attalabs/specs',
      'apps/attalabs/CLAUDE.md',
      'CLAUDE.md'
    ],
    sample: 'a Principal-ratifiable mapping'
  },
  {
    id: 'forge-number',
    pattern: '#[0-9]{2,4}',
    // Same scoping rationale as `retired-vocabulary.test.ts`'s
    // FORGE_NUMBER_PATTERN (not modified — this is an independent instance
    // of the identical pattern, since that file's own scope is out of this
    // task's surface): a forge number resolves only inside this repo's own
    // tracker, meaningless to an adopter reading the installed doc or
    // shared-package source.
    //
    // Task 8 — NOT widened to the three new product trees, same resolved
    // judgment call as `consumer-product-name` above and for the identical
    // reason: this pattern's own rationale ("meaningless to an adopter
    // reading the installed doc") is a portability test, and
    // `apps/vada-ai`/`apps/herald-ai`/`apps/attalabs`/root `CLAUDE.md` are
    // never installed by an adopter. Empirically confirmed before deciding:
    // widening it produced 126 findings concentrated in citation-dense,
    // ratified engineering design records (`generic-flow-refactor.md`,
    // `vada-state.md`) where the PR/task number IS the document's actual
    // content — a shipped-feature changelog's entire value is precise
    // provenance. Stripping those citations to satisfy the check would
    // degrade a correct document to fix a mis-scoped surface, the same
    // anti-pattern `roles/developer.md` names for implementation bugs
    // ("the doc is correct, fix the implementation") applied here to scope.
    scope: ['aeg-root', 'packages/models/src'],
    sample: 'documented in #294'
  }
]

/**
 * Report-only rollout, following this repo's own documented precedent for a
 * check that lands on a real pre-existing backlog: `aeg-root/enforcement.md`
 * records G1/G2 shipping report-only, and `reader-resolvable-prose` shipping
 * report-only against 161 findings — deliberately, so the backlog is "visible
 * debt rather than a wave of newly-red pull requests", with the check's own
 * exit code staying 0.
 *
 * The same applies here. The remaining findings are genuine harness citations
 * in `aeg-root/**` doctrine and Vinaya's own specs — real debt, owned by task
 * 8's doctrine sweep, not defects this task introduced. Registering the check
 * red on arrival would get it disabled rather than cleaned; registering it
 * report-only makes the debt visible and enforceable the day task 8 clears it.
 *
 * Flip to `false` when that sweep lands. Findings are still emitted and still
 * machine-readable; only their severity and the exit code change.
 */
const REPORT_ONLY = true

function main(): void {
  const result = evaluateVocabularyCitation(PATTERNS, grepFn, matchFn, GLOBAL_EXEMPT)

  for (const patternId of result.vacuousPatterns) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: 'error',
      message: `pattern "${patternId}" does not match its own non-vacuity sample — this check's own config is broken and every finding it reports is untrustworthy until fixed.`,
      agent_recovery_prompt: `Fix the "${patternId}" pattern in scripts/vinaya-checks/vocabulary-citation.ts so it matches its own \`sample\` string, then re-run this check.`
    })
  }

  for (const finding of result.findings) {
    emitCheckError({
      schema: 1,
      check: CHECK_NAME,
      severity: REPORT_ONLY ? 'warning' : 'error',
      message: `"${finding.patternId}" cites vocabulary that does not survive leaving this repo: ${finding.content.trim()}`,
      agent_recovery_prompt:
        'Rewrite this line without the flagged citation — state the underlying fact or rule directly, without naming a product, ' +
        'forge number, or host-tool path an adopter reading this file would have no context for.',
      file: finding.file,
      line: finding.line
    })
  }

  // A vacuous pattern always fails, report-only or not: it means this check is
  // lying about its own coverage, which is worse than any finding it could
  // report. Ordinary findings respect the rollout flag.
  process.exit(result.vacuousPatterns.length > 0 || (!REPORT_ONLY && result.findings.length > 0) ? 1 : 0)
}

main()
