// Environment detection for `vinaya init` / `eject`: git repo, gh auth, and
// the git-hook host directory. Plus the gh-backed LabelGateway. All external
// calls go through array-form execFile (no shell) so nothing is interpolated
// into a command line.

import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { HookDir } from './artifacts.js'
import type { ManagedManifest } from './config.js'
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

export type GhAuthStatus = { authenticated: boolean; detail: string }

/**
 * Richer than `checkGhAuth`: captures `gh auth status`'s own text (host,
 * account, token scopes) for doctor's environment report. `gh` writes this to
 * stderr, not stdout. Read-only — never mutates auth state.
 */
export async function ghAuthStatus(): Promise<GhAuthStatus> {
  try {
    const { stderr, stdout } = await execFileAsync('gh', ['auth', 'status'])
    return { authenticated: true, detail: (stderr || stdout).trim() }
  } catch (err) {
    const stderr = (err as { stderr?: string }).stderr
    return { authenticated: false, detail: stderr?.trim() || 'gh is not authenticated' }
  }
}

/**
 * Report-only read of the main branch's protection state — never applied,
 * never mutated. `null` means the state could not be determined (no auth, no
 * remote, a private-repo permission gap) — doctor reports that honestly
 * rather than guessing.
 */
export async function branchProtectionConfigured(owner: string, repo: string): Promise<boolean | null> {
  if (!owner || !repo) return null
  try {
    await execFileAsync('gh', ['api', `repos/${owner}/${repo}/branches/main/protection`])
    return true
  } catch (err) {
    // gh exits non-zero both for "not found" (unprotected — a real, known
    // answer) and for auth/network failures (an unknown answer). `gh api`
    // reports a 404 in its stderr message ("HTTP 404"); only that specific
    // case is the known "unprotected" answer — anything else is unknown.
    const stderr = (err as { stderr?: string }).stderr ?? ''
    if (/\b404\b/.test(stderr)) return false
    return null
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

/**
 * Which hook directory a prior install actually used — read from the
 * recorded manifest rather than re-detecting. A `.git/hooks`-based install's
 * stubs are never tracked by git, so on a fresh clone `.husky` may be absent
 * too (never created there in the first place) while the manifest still
 * names `.git/hooks/*`; a fresh `resolveHookDir` guess would silently check
 * the wrong path. Falls back to `fallback` only when the manifest carries no
 * hook block at all (e.g. this repo predates hooks being recorded).
 */
export function hookDirFromManifest(manifest: ManagedManifest, fallback: HookDir): HookDir {
  const block = manifest.blocks.find((b) => b.path.startsWith('.husky/') || b.path.startsWith('.git/hooks/'))
  if (block?.path.startsWith('.husky/')) return '.husky'
  if (block?.path.startsWith('.git/hooks/')) return '.git/hooks'
  return fallback
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
