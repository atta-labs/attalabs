import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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

// Find all .env.local files in the repo (up to 4 levels deep, skipping node_modules/.worktrees).
// Returns paths relative to the repo root.
async function findEnvFiles(repoRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'find',
      [
        repoRoot,
        '-name',
        '.env.local',
        '-not',
        '-path',
        '*/node_modules/*',
        '-not',
        '-path',
        '*/.worktrees/*',
        '-maxdepth',
        '4'
      ],
      { env: systemEnv }
    )
    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((abs) => abs.slice(repoRoot.length + 1)) // make relative
  } catch {
    return []
  }
}

export async function createWorktree(issueNumber: number, baseBranch = 'main'): Promise<string> {
  const wt = worktreePath(issueNumber)
  const branch = `feat/issue-${issueNumber}`

  // 1. Create the git worktree.
  await execFileAsync('git', ['worktree', 'add', wt, '-b', branch, `origin/${baseBranch}`], {
    cwd: ATTA_REPO_PATH,
    env: systemEnv
  })

  // 2. Install workspace symlinks so @atta/* packages resolve to the worktree's own
  //    copies, not the root repo's. Without this, the canvas React context splits across
  //    two module instances and animations break in the dev server.
  await execFileAsync('bun', ['install'], {
    cwd: wt,
    env: systemEnv
  })

  // 3. Symlink every .env.local from the repo root into the worktree so the dev server
  //    has all required env vars without duplicating secrets.
  const envFiles = await findEnvFiles(ATTA_REPO_PATH)
  for (const relPath of envFiles) {
    const src = join(ATTA_REPO_PATH, relPath)
    const dst = join(wt, relPath)
    if (!existsSync(dst)) {
      await mkdir(dirname(dst), { recursive: true })
      await symlink(src, dst)
    }
  }

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
