#!/usr/bin/env bun

/**
 * smoke-forge — bun-runnable verification harness for the local read adapter.
 *
 * Resolves one iteration's tasks — via a forge Milestone, active or closed
 * (`@atta/aeg-forge-state`'s `deriveIterationFromForge`, `aeg-forge-state-v1`
 * task 5, #429), falling back to `aeg-root/iterations/<slug>.md` or
 * `aeg-root/iterations/completed/<slug>.md` only for the small legacy set
 * of pre-Milestone-era iterations with no Milestone at all — then
 * runs `fetchForgeFacts` against this repo for the resolved tasks, prints the
 * snapshot, and additionally runs the snapshot through `deriveIteration` so
 * we can spot-check derived status for known-merged tasks (1 and 2 should be
 * `merged`, etc.).
 *
 * Imports `fetchForgeFacts` directly from its own module, not the `lib/forge`
 * barrel — the barrel re-exports `load-snapshot.ts`, which is guarded by the
 * `server-only` marker package (throws when imported outside a Next.js
 * Server Component bundle). This script runs as a plain `bun` process, so it
 * must stay off anything carrying that guard — same reason it calls
 * `@atta/aeg-forge-state` directly instead of importing `@/lib/aeg-fs`
 * (which carries the same guard for the same reason).
 *
 * Read-only. No writes of any kind.
 *
 * Usage:
 *   bun run scripts/smoke-forge.ts                    # iteration = aeg-forge-state-v1
 *   bun run scripts/smoke-forge.ts <iteration-slug>
 *   GITHUB_TOKEN='' bun run scripts/smoke-forge.ts    # force no-token path
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveIteration, parseIteration, type Iteration } from '@atta/aeg-core'
import { deriveIterationFromForge, findMilestoneForSlug } from '@atta/aeg-forge-state'
import { fetchForgeFacts } from '../src/lib/forge/fetch-forge-facts'

const REPO_ROOT = join(import.meta.dir, '../../../../..')
const DEFAULT_ITERATION = 'aeg-forge-state-v1'
const OWNER = 'daniboomerang'
const REPO = 'attalabs'

function readFileIfExists(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

async function resolveIteration(slug: string): Promise<{ iteration: Iteration; source: string }> {
  try {
    const milestone = findMilestoneForSlug(OWNER, REPO, slug)
    if (milestone) {
      return {
        iteration: await deriveIterationFromForge(OWNER, REPO, slug),
        source: `forge (${milestone.lifecycle === 'active' ? 'active' : 'closed'} Milestone)`
      }
    }
  } catch (err) {
    console.info(`[forge derivation failed, falling back to file] ${(err as Error).message}`)
  }

  const activeRaw = readFileIfExists(join(REPO_ROOT, 'aeg-root', 'iterations', `${slug}.md`))
  if (activeRaw !== null) return { iteration: parseIteration(activeRaw), source: 'file (active, forge fallback)' }

  const archivedRaw = readFileIfExists(join(REPO_ROOT, 'aeg-root', 'iterations', 'completed', `${slug}.md`))
  if (archivedRaw !== null) return { iteration: parseIteration(archivedRaw), source: 'file (legacy archived)' }

  throw new Error(`No Milestone, active file, or archived file found for iteration "${slug}"`)
}

async function main() {
  const slug = process.argv[2] ?? DEFAULT_ITERATION
  const { iteration: parsed, source } = await resolveIteration(slug)

  console.info(`Iteration: ${parsed.name} (${parsed.lifecycle})`)
  console.info(`Source:    ${source}`)
  console.info(`Repo:      ${OWNER}/${REPO}`)
  console.info(`Tasks:     ${parsed.tasks.length}\n`)

  const snapshot = await fetchForgeFacts({
    owner: OWNER,
    repo: REPO,
    iteration: parsed.name,
    tasks: parsed.tasks.map((t) => ({ id: t.id, issue: t.issue }))
  })

  if (snapshot.unavailable) {
    console.info(`[live status unavailable] ${snapshot.reason ?? ''}\n`)
  }

  const derived = deriveIteration(parsed, snapshot.facts)

  const header = ['id', 'issue', 'derived', 'dispatch', 'prState', 'review', 'branch', 'blocked']
  console.info(header.join('\t'))
  for (const dt of derived.tasks) {
    const f = snapshot.facts.get(dt.task.id)
    console.info(
      [
        dt.task.id,
        dt.task.issue ?? '—',
        dt.status,
        dt.dispatchable ? 'yes' : 'no',
        f?.prState ?? '—',
        f?.reviewDecision ?? '—',
        f?.branchExists === undefined ? '—' : f.branchExists ? 'yes' : 'no',
        f?.blockedLabel === undefined ? '—' : f.blockedLabel ? 'yes' : 'no'
      ].join('\t')
    )
  }

  console.info(
    `\nfetched facts for ${snapshot.facts.size}/${parsed.tasks.length} task(s). unavailable=${snapshot.unavailable}`
  )
}

main().catch((err) => {
  console.error('smoke-forge failed:', err)
  process.exit(1)
})
