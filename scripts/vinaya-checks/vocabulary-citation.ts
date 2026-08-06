#!/usr/bin/env bun
/**
 * vocabulary-citation — this repo's own configured instance of the
 * pluggable citation check (`@atta/aeg-core`'s `evaluateVocabularyCitation`,
 * task 6 / Issue #736).
 *
 * `retired-vocabulary.test.ts` proved this sweep shape works but ships it as
 * a `vitest` file no adopter can install, and it has no product-name pattern
 * and no harness/host-artifact pattern at all — 15 consumer-product
 * references sat live in `packages/aeg-core`/`packages/aeg-forge-state`
 * while that suite passed green (PR #739 cleaned them by hand; nothing
 * stopped them regenerating). This file is the I/O shim + the repo-specific
 * configuration: real `grep`-backed `grepFn`/`matchFn`, and the pattern list
 * itself. The evaluator in `@atta/aeg-core` carries none of this — every
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
 *     `packages/aeg-core/src/vocabulary-citation.test.ts` for the two
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
 */

import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateVocabularyCitation, type VocabularyHit, type VocabularyPattern } from '@atta/aeg-core'

const CHECK_NAME = 'vocabulary-citation'
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
  // Self-exemption, same reason `retired-vocabulary.test.ts` exempts
  // itself: this file's own unit tests cite product names and harness
  // paths as fixture data to prove the evaluator's decision logic, not as
  // real citations.
  'packages/aeg-core/src/vocabulary-citation.test.ts'
]

const PATTERNS: VocabularyPattern[] = [
  {
    id: 'consumer-product-name',
    pattern: String.raw`\b(vada|herald|attalabs|vitakka|sati)\b`,
    scope: ['packages/aeg-core', 'packages/aeg-forge-state', 'aeg-root', 'apps/vinaya'],
    sample: 'built directly on vada internals',
    // `.test.ts` files across `aeg-core`/`aeg-forge-state` legitimately use
    // real product paths as fixture data (proving e.g. that `premise-check`
    // correctly detects an absent `apps/herald-ai/...` path) — the identical
    // false-positive class `retired-vocabulary.test.ts`'s own
    // TRANCHE_SLUG_VN_PATTERN comment documents as the reason that pattern's
    // scope excludes these two packages. Confirmed empirically: every one of
    // ~170 hits this pattern produced before this exemption, across both
    // packages, was inside a `.test.ts` file.
    exempt: ['.test.ts']
  },
  {
    id: 'harness-claude-path',
    pattern: String.raw`\.claude/`,
    scope: ['aeg-root'],
    sample: 'wired via .claude/hooks/check-skill.sh',
    exemptTableRow: true
  },
  {
    id: 'harness-husky-path',
    pattern: String.raw`\.husky/`,
    scope: ['aeg-root'],
    sample: 'runs from .husky/pre-push',
    exemptTableRow: true
  },
  {
    id: 'harness-scripts-file',
    pattern: String.raw`scripts/[a-zA-Z0-9_/-]+\.(ts|js|sh|mjs)`,
    scope: ['aeg-root'],
    sample: 'run scripts/vinaya-checks/vocabulary-citation.ts to check',
    exemptTableRow: true
  },
  {
    id: 'harness-role-vocabulary',
    pattern: String.raw`\bPrincipal-ratifiable\b`,
    // packages/models/src: the 2026-08-06 amendment's shared-package scope
    // (the exact string PR #742 removed from this package's source).
    scope: ['aeg-root', 'packages/models/src'],
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
    scope: ['aeg-root', 'packages/models/src'],
    sample: 'documented in #294'
  }
]

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
      severity: 'error',
      message: `"${finding.patternId}" cites vocabulary that does not survive leaving this repo: ${finding.content.trim()}`,
      agent_recovery_prompt:
        'Rewrite this line without the flagged citation — state the underlying fact or rule directly, without naming a product, ' +
        'forge number, or host-tool path an adopter reading this file would have no context for.',
      file: finding.file,
      line: finding.line
    })
  }

  process.exit(result.vacuousPatterns.length > 0 || result.findings.length > 0 ? 1 : 0)
}

main()
