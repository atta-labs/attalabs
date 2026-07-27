import { execFileSync } from 'node:child_process'
import { parseTranche } from '@atta/aeg-core'
import { deriveTrancheFromForge, resolveGithubToken } from '@atta/aeg-forge-state'
import type { Task } from '@atta/aeg-types'
import { describe, expect, it } from 'bun:test'

/**
 * Golden comparison (brief §1 Context point 3, §9 Part C1): proves the
 * forge-backed and file-backed StateSource designs produce equivalent
 * `Tranche` shapes for the same real tranche, `aeg-forge-state-v1`.
 *
 * `aeg-root/tranches/completed/aeg-forge-state-v1.md` was deleted today by
 * PR #521 (part of the archived-tranche-reads-migrate-to-forge work) — the
 * live working-tree path has nothing to parse. The file's last content
 * before deletion is recoverable from git history and is still a genuine
 * real-data comparison: deleting the `.md` file didn't touch the Milestone
 * or Issues it was derived from, which still exist on GitHub.
 */

const OWNER = 'daniboomerang'
const REPO = 'attalabs'
const SLUG = 'aeg-forge-state-v1'
const PINNED_COMMIT = '8112a295'
const PINNED_PATH = 'aeg-root/tranches/completed/aeg-forge-state-v1.md'

/** Fields that matter to the pure evaluators (`deriveTranche`, `sumLedger`
 * consumers): id, title, issue, projects, and the dependency graph.
 * `rationaleMarkdown` is excluded — the two sources capture it from
 * genuinely different raw text (topology-file `### Task N` block vs. the
 * live Issue body, including its Planner amendments) and no pure evaluator
 * reads it, only display surfaces do. */
function comparableTask(task: Task) {
  const { rationaleMarkdown: _rationaleMarkdown, ...rest } = task
  return rest
}

function sortById(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.id.localeCompare(b.id))
}

// Soft-skip when no GitHub auth is available in the environment (matches
// `resolveGithubToken`'s own resolution order — explicit / env / `gh auth
// token`) — no existing test in this repo hits the live forge, so there is
// no established gating pattern to follow; `describe.skipIf` is bun:test's
// native mechanism for this.
const token = await resolveGithubToken()

describe.skipIf(!token)('golden forge-vs-file comparison — aeg-forge-state-v1', () => {
  it('produces equivalent Tranche shapes from the pinned file snapshot and the live forge', async () => {
    const fileContent = execFileSync('git', ['show', `${PINNED_COMMIT}:${PINNED_PATH}`], {
      encoding: 'utf-8'
    })
    const fileTranche = parseTranche(fileContent)
    const forgeTranche = await deriveTrancheFromForge(OWNER, REPO, SLUG)

    expect(forgeTranche.name).toBe(fileTranche.name)
    expect(forgeTranche.lifecycle).toBe(fileTranche.lifecycle)
    expect(forgeTranche.goal).toBe(fileTranche.goal)
    expect(sortById(forgeTranche.tasks).map(comparableTask)).toEqual(sortById(fileTranche.tasks).map(comparableTask))
  })
})
