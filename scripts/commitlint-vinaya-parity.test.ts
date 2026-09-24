import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { COMMIT_TYPE_STYLE } from '@attalabs/aeg-core'
import { describe, expect, it } from 'bun:test'

/**
 * This repo runs two independent commit-message gates on every commit:
 * commitlint (.husky/commit-msg's first line, this repo's `commitlint.config.js`)
 * and vinaya's own `commit-msg` command (the `>>> vinaya:managed:commit-msg >>>`
 * block the same hook file runs second). A commit only lands once BOTH pass.
 *
 * The dangerous direction is a header commitlint accepts that vinaya's own
 * `COMMIT_TYPE_STYLE` regex (imported here from the real, pinned
 * `@attalabs/aeg-core` dependency — never a hand-copied duplicate that could
 * drift) rejects: nothing stops that commit from being authored, so a
 * developer (or a PR body) can honestly believe "passes both" and be wrong.
 * The reverse direction — commitlint rejecting something vinaya would accept
 * — is safe: commitlint's own additional, repo-specific style rules
 * (header-max-length, subject-case, subject-full-stop) simply block the
 * commit before vinaya's gate is ever reached, so no false claim is
 * possible. This test asserts the dangerous direction never happens, and
 * documents the safe one.
 */

const REPO_ROOT = join(import.meta.dir, '..')
const COMMITLINT_BIN = join(REPO_ROOT, 'node_modules/.bin/commitlint')
const CONFIG_PATH = join(REPO_ROOT, 'commitlint.config.js')

function vinayaAccepts(header: string): boolean {
  return COMMIT_TYPE_STYLE.test(header)
}

function commitlintAccepts(header: string): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'commitlint-parity-'))
  try {
    const file = join(dir, 'msg.txt')
    writeFileSync(file, `${header}\n`)
    const result = Bun.spawnSync(['node', COMMITLINT_BIN, '--edit', file, '--config', CONFIG_PATH], {
      cwd: REPO_ROOT,
      stdout: 'ignore',
      stderr: 'ignore'
    })
    return result.exitCode === 0
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// Every dimension COMMIT_TYPE_STYLE checks, both sides of each:
// type vocabulary, type case, scope charset (incl. the empty-parens edge
// case), the absence of a conventional-commits `!` marker, and the bare
// `\S`-after-colon subject requirement.
const bothShouldAgree: Array<[string, boolean]> = [
  ['Chore(vinaya): Add reviewPolicy and guard task_start', true],
  ['Fix(cli): Refuse a malformed commit message', true],
  ['Plan(vinaya): Draft the next tranche', true],
  ['Feat: Add a top-level feature with no scope', true],
  ['Fix(vinaya-core-2): Valid hyphenated/numeric scope', true],
  ['chore(vinaya): Lowercase type is rejected', false],
  ['CHORE(vinaya): All-caps type is rejected', false],
  ['Bogus(vinaya): Unknown type is rejected', false],
  ['Fix(vinaya_core): Underscore in scope is rejected', false],
  ['Fix(apps/web): Slash in scope is rejected', false],
  ['Fix(Vinaya): Uppercase in scope is rejected', false],
  ['Fix(): Empty parens are rejected', false],
  ['Fix(cli)!: Breaking-change bang is rejected', false],
  ['Fix!: Breaking-change bang with no scope is rejected', false],
  ['Fix(cli):No space after colon', false],
  ['Fix(cli):  ', false] // colon then whitespace only — no \S
]

// commitlint's own additional, repo-specific style rules (never vinaya's
// concern) — the safe direction: these reject a header vinaya would accept,
// which only ever blocks a commit earlier, never falsely claims "passes both".
const commitlintOnlyStricter: string[] = [
  `Fix(cli): ${'A'.repeat(70)}`, // header-max-length
  'Fix(cli): lowercase-only subject is a commitlint-only rule', // subject-case
  'Fix(cli): Subject ends with a period.' // subject-full-stop
]

describe('commitlint / vinaya commit-msg gate parity', () => {
  for (const [header, expected] of bothShouldAgree) {
    it(`${expected ? 'accepts' : 'rejects'} on both gates: ${header}`, () => {
      const vinaya = vinayaAccepts(header)
      const commitlint = commitlintAccepts(header)
      expect(vinaya).toBe(expected)
      expect(commitlint).toBe(expected)
    })
  }

  it('never has commitlint accept a header vinaya rejects (the dangerous direction)', () => {
    for (const [header] of bothShouldAgree) {
      if (commitlintAccepts(header)) {
        expect(vinayaAccepts(header)).toBe(true)
      }
    }
  })

  it('commitlint-only stricter rules reject without vinaya ever seeing the commit', () => {
    for (const header of commitlintOnlyStricter) {
      expect(vinayaAccepts(header)).toBe(true)
      expect(commitlintAccepts(header)).toBe(false)
    }
  })
})
