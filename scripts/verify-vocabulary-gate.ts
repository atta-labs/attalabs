#!/usr/bin/env bun

/**
 * Vocabulary gate — repo-wide scan for retired AEG vocabulary (the deleted
 * decision log, the retired `team-leader` role, the `D-###` decision id, …)
 * still being described as live anywhere an agent reads.
 *
 * Calls `@attalabs/aeg-core`'s shipped `scanRetiredVocabulary` directly —
 * the same pure evaluator behind the installed `retired-vocabulary` check
 * (`vinaya check retired-vocabulary`, diff-scoped). This script runs it
 * repo-wide instead, since a stale claim can sit outside any single PR's
 * diff indefinitely.
 *
 * Previously this ran the package's own `retired-vocabulary.test.ts` — an
 * independent `grep -E` proof of the same pattern list, scraped out of
 * `node_modules` at CI time. `@attalabs/aeg-core`'s `files` field now
 * excludes `*.test.ts` from the published package (ordinary packaging
 * hygiene), which permanently removed that file from every install. This
 * repo has no way to keep re-deriving an independent proof of an upstream
 * package's own test suite, so it depends on the evaluator directly instead
 * — the same shipped, documented API surface the CLI's own check bin uses.
 *
 * `RETIRED_IN_PRODUCT`'s citation patterns (forge number / tranche slug /
 * legacy slug) are deliberately not run here: their real scope is `aeg-root/`
 * and `apps/cli/src` — paths that don't exist in this repo since the
 * attalabs-adoption tranche deleted the local doctrine copy — and the
 * live-citation concern they cover is already `reader-resolvable-prose`'s
 * `checkUnresolvableReferences`, shipped and diff-scoped via
 * `vinaya check --all`.
 *
 * File scope mirrors the original suite's own `grep --include` list exactly
 * (`.md`/`.ts`/`.tsx`/`.yml`, plus the extensionless `doc-owners` file) —
 * not a blind whole-repo read. That scope is deliberate, not incidental: a
 * `.sh`/`.json`/`.mjs`/minified-`.js` file was never in the original
 * suite's net either, and scanning those adds nothing but false positives
 * (a shell script legitimately citing a decision id in a comment, a
 * vendored bundle's incidental `,)` byte sequence) that the pattern list's
 * own hand-curated `EXEMPT`/`PATTERN_EXEMPT` lists were never written to
 * cover, because upstream never had to.
 *
 * Paths are `./`-prefixed to match `PATTERN_EXEMPT`'s own `'./CLAUDE.md'`
 * entry — a bare `git ls-files` path (`CLAUDE.md`) is not a substring of
 * that exemption, so without the prefix the one deliberate, permanent
 * exemption this repo depends on (root `CLAUDE.md`'s own retired-decision
 * history note) silently stops applying.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { scanRetiredVocabulary } from '@attalabs/aeg-core'

const SCAN_EXTENSIONS = ['.md', '.ts', '.tsx', '.yml']

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter((path) => SCAN_EXTENSIONS.some((ext) => path.endsWith(ext)) || path.endsWith('/doc-owners'))

const files = trackedFiles.flatMap((path) => {
  try {
    return [{ path: `./${path}`, content: readFileSync(path, 'utf8') }]
  } catch {
    return [] // unreadable — not prose an agent reads as doctrine
  }
})

const findings = scanRetiredVocabulary(files)

if (findings.length === 0) {
  console.log(`verify-vocabulary-gate: 0 findings across ${files.length} tracked file(s)`)
  process.exit(0)
}

for (const f of findings) {
  console.error(`${f.file}:${f.line}: ${f.message}`)
}
console.error(`\nverify-vocabulary-gate: ${findings.length} finding(s)`)
process.exit(1)
