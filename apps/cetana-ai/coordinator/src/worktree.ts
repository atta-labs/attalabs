import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { ATTA_REPO_PATH, worktreePath } from './paths.js'

const execFileAsync = promisify(execFile)

// Bun bundles may inherit a stripped PATH that lacks /usr/bin — augment it.
const systemEnv = {
  ...process.env,
  PATH: [process.env.PATH, '/usr/bin', '/usr/local/bin', '/bin'].filter(Boolean).join(':')
}

export interface WorktreeInfo {
  path: string
  branch: string
}

export async function createWorktree(issueNumber: number, baseBranch = 'main'): Promise<string> {
  const wt = worktreePath(issueNumber)
  const branch = `feat/issue-${issueNumber}`
  await execFileAsync('git', ['worktree', 'add', wt, '-b', branch, `origin/${baseBranch}`], {
    cwd: ATTA_REPO_PATH,
    env: systemEnv
  })
  return wt
}

export async function removeWorktree(issueNumber: number): Promise<void> {
  const wt = worktreePath(issueNumber)
  await execFileAsync('git', ['worktree', 'remove', wt, '--force'], {
    cwd: ATTA_REPO_PATH,
    env: systemEnv
  })
}

export async function listWorktrees(): Promise<WorktreeInfo[]> {
  const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
    cwd: ATTA_REPO_PATH,
    env: systemEnv
  })

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
