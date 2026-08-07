#!/usr/bin/env bun

/**
 * Core check: closes-n. Thin adapter over `@atta/aeg-core`'s `checkClosesN`
 * — mirrors `packages/aeg-core/bin/verify-coherence.ts --closes-n`'s input
 * assembly (BRANCH/PR_BODY env, the branch's own tranche, the reverse
 * `Closes #N` lookup via `fetchTaskIssueRefs`), emitting the check contract
 * instead of human text.
 *
 * Narrower than `--closes-n`'s own tranche load: that CLI's
 * `loadTrancheFiles(null, slug)` merges an on-disk topology FILE with the
 * forge and falls back to disk when the forge is unavailable. This
 * adapter's dependency boundary is `@atta/aeg-core` + `@atta/vinaya-sources`
 * only (no `@atta/aeg-forge-state` file-loader import) — it derives the
 * branch's own tranche from the forge alone (`createForgeSource`), the same
 * forge-only scoping `check-coherence.ts`/`check-dispatch-readiness.ts`
 * already use. A documented, honest narrowing versus `verify-coherence.ts
 * --closes-n`, not a silent equivalence: a task whose forge Issue isn't
 * labeled correctly (so forge derivation can't see it) is invisible to this
 * check even if a stale local topology file still names it.
 *
 * scope: diff — the whole point of closes-n is "does this branch/PR body
 * match its own task identity."
 */

import { execFileSync } from 'node:child_process'
import { checkClosesN, extractClosesReferences, fetchTaskIssueRefs, type TrancheFile } from '@atta/aeg-core'
import { createForgeSource } from '@atta/vinaya-sources'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

// No chdir — see check-doc-coverage.ts's rationale; the runner's spawn
// already inherits the caller's cwd, which IS the repo being evaluated.
const CHECK_NAME = 'closes-n'

// Array-form execFileSync — no shell, so no injection surface.
function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function resolveRepo(): { owner: string; repo: string } | null {
  const fromEnv = process.env.AEG_REPO
  if (fromEnv) {
    const m = fromEnv.match(/^([^/]+)\/(.+)$/)
    if (m?.[1] && m[2]) return { owner: m[1], repo: m[2] }
  }
  const url = git(['remote', 'get-url', 'origin'])
  const ssh = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/)
  if (ssh?.[1] && ssh[2]) return { owner: ssh[1], repo: ssh[2] }
  const https = url.match(/^https?:\/\/(?:[^@]+@)?github\.com\/([^/]+)\/(.+?)(?:\.git)?\/?$/)
  if (https?.[1] && https[2]) return { owner: https[1], repo: https[2] }
  return null
}

async function main(): Promise<void> {
  const branch = process.env.BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])
  const prBody = process.env.PR_BODY ?? ''

  const repo = resolveRepo()
  const files: TrancheFile[] = []

  const taskMatch = branch.match(/^task\/([^/]+)\/[^/]+$/)
  if (taskMatch && repo) {
    const slug = taskMatch[1] as string
    try {
      const source = createForgeSource({ owner: repo.owner, repo: repo.repo })
      const tranche = await source.getTranche(slug)
      files.push({ slug, archived: false, tranche })
    } catch {
      // Forge unavailable — checkClosesN reports "no topology file found"
      // for this branch's own tranche below, the correct, honest failure
      // when the forge can't be reached at all.
    }
  }

  const referenced = [...extractClosesReferences(prBody)]
  const taskIssueRefs =
    repo && referenced.length > 0 ? await fetchTaskIssueRefs(repo.owner, repo.repo, referenced) : undefined

  const result = checkClosesN(branch, prBody, files, taskIssueRefs)

  if (!result.ok) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: result.message ?? 'closes-n check failed',
      agent_recovery_prompt:
        'Fix the branch name or the `Closes #N` reference in the PR body so they name the same task, then re-run `vinaya check closes-n`.'
    })
    process.exit(1)
  }

  process.exit(0)
}

main()
