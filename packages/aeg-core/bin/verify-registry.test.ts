import { describe, expect, it } from 'vitest'
import { isGithubCrossingLine } from './verify-registry'

/**
 * `isGithubCrossingLine` claims to mirror `.claude/hooks/check-forge-gates.sh`
 * exactly. These cases pin two idioms the hook's `gh api`/`curl` blocks treat
 * as sufficient write-signal that an earlier revision of this detector missed:
 * bare `-f`/`-F` flags on `gh api` (no explicit `-X POST`), and `--json` on
 * curl/wget. Both are drawn directly from the hook's own grep patterns.
 */
describe('isGithubCrossingLine', () => {
  it('flags `gh api -f` targeting /issues even without -X POST', () => {
    expect(isGithubCrossingLine('gh api repos/o/r/issues -f title=x')).toBe(true)
  })

  it('flags `gh api -F` targeting /pulls even without -X POST', () => {
    expect(isGithubCrossingLine('gh api repos/o/r/pulls -F title=x')).toBe(true)
  })

  it('does not flag `gh api` reads with no POST signal at all', () => {
    expect(isGithubCrossingLine('gh api repos/o/r/issues/1')).toBe(false)
  })

  it('flags curl --json writes to the issues endpoint', () => {
    expect(isGithubCrossingLine('curl --json \'{"title":"x"}\' https://api.github.com/repos/o/r/issues')).toBe(true)
  })

  it('flags wget --json writes to the pulls endpoint', () => {
    expect(isGithubCrossingLine('wget --json \'{"title":"x"}\' https://api.github.com/repos/o/r/pulls')).toBe(true)
  })

  it('does not flag a bare curl GET with no write signal', () => {
    expect(isGithubCrossingLine('curl https://api.github.com/repos/o/r/issues/1')).toBe(false)
  })

  it('still flags the pre-existing -X POST idiom for gh api', () => {
    expect(isGithubCrossingLine('gh api -X POST repos/o/r/issues')).toBe(true)
  })

  it('still flags the pre-existing --data idiom for curl', () => {
    expect(isGithubCrossingLine('curl --data \'{"title":"x"}\' https://api.github.com/repos/o/r/pulls')).toBe(true)
  })
})
