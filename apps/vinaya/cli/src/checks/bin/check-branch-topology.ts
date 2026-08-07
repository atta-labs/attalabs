#!/usr/bin/env bun

/**
 * Core check: branch-topology. Thin adapter over `@atta/aeg-core`'s
 * `checkBranchTopology` — mirrors `packages/aeg-core/bin/check-branch-topology.ts`'s
 * input assembly (branch-derived tranche/task id, forge-derived topology)
 * exactly, emitting the check contract instead of human text.
 *
 * Uses `createForgeSource` (`@atta/vinaya-sources`) rather than importing
 * `deriveTrancheFromForge`/`resolveRepo` from `@atta/aeg-forge-state`
 * directly — the same `@atta/aeg-core` + `@atta/vinaya-sources`-only
 * dependency boundary `check-coherence.ts`/`check-dispatch-readiness.ts`
 * already establish for this CLI's checks.
 *
 * scope: full — reads the live forge, not the local diff.
 */

import { execFileSync } from 'node:child_process'
import { checkBranchTopology, taskBranchTopologyFields } from '@atta/aeg-core'
import { createForgeSource } from '@atta/vinaya-sources'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'branch-topology'

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
  const fields = taskBranchTopologyFields(branch)
  if (!fields) {
    process.exit(0)
  }

  const topoPath = `aeg-root/tranches/${fields.tranche}.md`
  const repo = resolveRepo()
  if (!repo) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: 'branch-topology severity:infra — could not resolve owner/repo.',
      agent_recovery_prompt:
        'Set AEG_REPO=owner/repo, or confirm `git remote get-url origin` resolves to a GitHub URL, then re-run `vinaya check branch-topology`.'
    })
    process.exit(1)
  }

  let topology: Awaited<ReturnType<ReturnType<typeof createForgeSource>['getTranche']>> | null = null
  try {
    const source = createForgeSource({ owner: repo.owner, repo: repo.repo })
    topology = await source.getTranche(fields.tranche)
  } catch (err) {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: `branch-topology severity:infra — could not reach the forge for tranche "${fields.tranche}": ${(err as Error).message}`,
      agent_recovery_prompt:
        'Confirm `gh auth status` passes and the forge is reachable, then re-run `vinaya check branch-topology`.'
    })
    process.exit(1)
  }

  const result = checkBranchTopology({ branch, ...fields, topoPath, topology })

  if (result.verdict === 'refuse') {
    emitCheckError({
      schema: CHECK_SCHEMA_VERSION,
      check: CHECK_NAME,
      severity: 'error',
      message: result.reason,
      agent_recovery_prompt:
        'Confirm the branch name matches a real, forge-registered task row (tranche + task id), then re-run `vinaya check branch-topology`.'
    })
    process.exit(1)
  }

  process.exit(0)
}

main()
