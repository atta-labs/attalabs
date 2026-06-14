#!/usr/bin/env bun

/**
 * smoke-forge — bun-runnable verification harness for the local read adapter.
 *
 * Reads `aeg-root/iterations/<iteration>.md`, parses it with @atta/aeg-core,
 * runs `fetchForgeFacts` against this repo for the parsed tasks, prints the
 * snapshot, and additionally runs the snapshot through `deriveIteration` so
 * we can spot-check derived status for known-merged tasks (1 and 2 should be
 * `merged`, etc.).
 *
 * Read-only. No writes of any kind.
 *
 * Usage:
 *   bun run scripts/smoke-forge.ts                    # iteration = aeg-ui-v1
 *   bun run scripts/smoke-forge.ts <iteration-slug>
 *   GITHUB_TOKEN='' bun run scripts/smoke-forge.ts    # force no-token path
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveIteration, parseIteration } from '@atta/aeg-core'
import { fetchForgeFacts } from '../src/lib/forge'

const REPO_ROOT = join(import.meta.dir, '../../../../..')
const DEFAULT_ITERATION = 'aeg-ui-v1'
const OWNER = 'daniboomerang'
const REPO = 'attalabs'

async function main() {
  const iteration = process.argv[2] ?? DEFAULT_ITERATION
  const iterationPath = join(REPO_ROOT, 'aeg-root', 'iterations', `${iteration}.md`)
  const fileText = readFileSync(iterationPath, 'utf8')
  const parsed = parseIteration(fileText)

  console.info(`Iteration: ${parsed.name} (${parsed.lifecycle})`)
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
