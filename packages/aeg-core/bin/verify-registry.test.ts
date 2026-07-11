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

  it('flags `gh pr create`', () => {
    expect(isGithubCrossingLine('gh pr create --title "x" --body "y"')).toBe(true)
  })

  it('flags `gh issue create`', () => {
    expect(isGithubCrossingLine('gh issue create --title "x"')).toBe(true)
  })

  it('flags `gh pr edit` with --body', () => {
    expect(isGithubCrossingLine('gh pr edit 1 --body "new body"')).toBe(true)
  })

  it('flags `gh issue edit` with --title', () => {
    expect(isGithubCrossingLine('gh issue edit 1 --title "new title"')).toBe(true)
  })

  it('does not flag `gh pr edit` with only --add-label (no body/title change)', () => {
    expect(isGithubCrossingLine('gh pr edit 1 --add-label "aeg:stale-blocker"')).toBe(false)
  })

  it('flags `gh api -X PATCH` targeting an exact /issues/<n>', () => {
    expect(isGithubCrossingLine('gh api repos/o/r/issues/42 -X PATCH -f body=x')).toBe(true)
  })

  it('flags `gh api -X PATCH` targeting an exact /pulls/<n>', () => {
    expect(isGithubCrossingLine('gh api repos/o/r/pulls/42 -X PATCH -f body=x')).toBe(true)
  })

  it('does not flag `gh api -X PATCH` on a comment sub-resource (/issues/comments/<id>)', () => {
    expect(isGithubCrossingLine('gh api repos/o/r/issues/comments/99 -X PATCH -f body=x')).toBe(false)
  })
})
