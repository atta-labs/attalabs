import { describe, it, expect } from 'bun:test'
import type { WorktreeInfo } from '../src/worktree.js'

function parsePorcelain(stdout: string): WorktreeInfo[] {
  const results: WorktreeInfo[] = []
  const blocks = stdout.trim().split(/\n\n+/)

  for (const block of blocks) {
    try {
      const lines = block.split('\n')
      let path: string | undefined
      let branch: string | undefined

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          path = line.slice('worktree '.length)
        } else if (line.startsWith('branch ')) {
          const ref = line.slice('branch '.length)
          const prefix = 'refs/heads/'
          if (ref.startsWith(prefix)) {
            branch = ref.slice(prefix.length)
          }
        }
      }

      if (path && branch) {
        results.push({ path, branch })
      }
    } catch {
      // skip malformed entries
    }
  }

  return results
}

const SINGLE_WORKTREE = `worktree /home/user/code/atta
HEAD abc1234def5678
branch refs/heads/main
`

const MULTI_WORKTREE = `worktree /home/user/code/atta
HEAD abc1234def5678
branch refs/heads/main

worktree /home/user/code/atta/.worktrees/issue-42
HEAD deadbeefcafe
branch refs/heads/feat/issue-42
`

const DETACHED_HEAD = `worktree /home/user/code/atta
HEAD abc1234
branch refs/heads/main

worktree /home/user/code/atta/.worktrees/issue-99
HEAD deadbeef
detached
`

const EMPTY_OUTPUT = ''

describe('worktree --porcelain parser', () => {
  it('returns empty array for empty output', () => {
    expect(parsePorcelain(EMPTY_OUTPUT)).toEqual([])
  })

  it('parses a single worktree block', () => {
    const result = parsePorcelain(SINGLE_WORKTREE)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ path: '/home/user/code/atta', branch: 'main' })
  })

  it('parses multiple worktree blocks in order', () => {
    const result = parsePorcelain(MULTI_WORKTREE)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ path: '/home/user/code/atta', branch: 'main' })
    expect(result[1]).toEqual({
      path: '/home/user/code/atta/.worktrees/issue-42',
      branch: 'feat/issue-42'
    })
  })

  it('strips refs/heads/ prefix from branch names', () => {
    const result = parsePorcelain(MULTI_WORKTREE)
    for (const entry of result) {
      expect(entry.branch.startsWith('refs/')).toBe(false)
    }
  })

  it('skips detached HEAD entries (no branch field)', () => {
    const result = parsePorcelain(DETACHED_HEAD)
    expect(result).toHaveLength(1)
    expect(result[0]?.branch).toBe('main')
  })

  it('handles branch names with slashes (feat/issue-N)', () => {
    const result = parsePorcelain(MULTI_WORKTREE)
    expect(result[1]?.branch).toBe('feat/issue-42')
  })

  it('produces objects matching the WorktreeInfo shape', () => {
    const result: WorktreeInfo[] = parsePorcelain(SINGLE_WORKTREE)
    for (const entry of result) {
      expect(typeof entry.path).toBe('string')
      expect(typeof entry.branch).toBe('string')
    }
  })
})
