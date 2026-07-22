// Environment detection for `vinaya init` / `eject`: git repo, gh auth, and
// the git-hook host directory. Plus the gh-backed LabelGateway. All external
// calls go through array-form execFile (no shell) so nothing is interpolated
// into a command line.

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { HookDir } from './artifacts.js'
import type { LabelGateway } from './ops.js'

const execFileAsync = promisify(execFile)

export type RepoInfo = { repoRoot: string; owner: string; repo: string }

export async function detectGitRepo(): Promise<RepoInfo | null> {
  try {
    const { stdout: root } = await execFileAsync('git', ['rev-parse', '--show-toplevel'])
    const repoRoot = root.trim()
    let owner = ''
    let repo = ''
    try {
      const { stdout: url } = await execFileAsync('git', ['remote', 'get-url', 'origin'])
      const m = url.trim().match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/)
      if (m) {
        owner = m[1] ?? ''
        repo = m[2] ?? ''
      }
    } catch {
      // no origin remote — owner/repo stay blank; init still works locally.
    }
    return { repoRoot, owner, repo }
  } catch {
    return null
  }
}

export async function checkGhAuth(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['auth', 'status'])
    return true
  } catch {
    return false
  }
}

/**
 * Locked default (full-spec decision A): prefer `.husky/` if the repo already
 * uses it, else raw `.git/hooks`. Never add husky as a dependency. A custom
 * `core.hooksPath` is the escalation case the command handles separately.
 */
export function resolveHookDir(repoRoot: string): HookDir {
  return existsSync(join(repoRoot, '.husky')) ? '.husky' : '.git/hooks'
}

/** True when the repo routes hooks somewhere non-standard we must not guess at. */
export async function customHooksPath(repoRoot: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['-C', repoRoot, 'config', '--get', 'core.hooksPath'])
    const v = stdout.trim()
    if (!v) return null
    // `.husky/_` is husky's own managed dir — not a custom path we must refuse.
    if (v === '.husky' || v === '.husky/_') return null
    return v
  } catch {
    return null
  }
}

/** gh-backed labels. Offline/test callers inject their own LabelGateway. */
export function ghLabelGateway(repoRoot: string): LabelGateway {
  return {
    async exists(name: string): Promise<boolean> {
      try {
        const { stdout } = await execFileAsync('gh', ['label', 'list', '--json', 'name'], { cwd: repoRoot })
        const names: Array<{ name: string }> = JSON.parse(stdout)
        return names.some((l) => l.name === name)
      } catch {
        // If we cannot enumerate, treat as absent and let create fail loudly
        // rather than silently skipping.
        return false
      }
    },
    async create(name: string, color: string, description: string): Promise<void> {
      await execFileAsync('gh', ['label', 'create', name, '--color', color, '--description', description], {
        cwd: repoRoot
      })
    }
  }
}
