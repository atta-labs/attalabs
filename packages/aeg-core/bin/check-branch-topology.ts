#!/usr/bin/env bun

/**
 * check-branch-topology — thin CLI/I/O shim for the D-073 branch↔topology
 * gate wired into `.husky/pre-push` (aeg-governance-hardening task 32,
 * #399). Derives the iteration from the forge (`@atta/aeg-forge-state`,
 * task aeg-forge-state-v1 3a — a Milestone + `vinaya/iteration:<slug>`-labeled
 * Issues) and hands the result to the pure evaluator `checkBranchTopology`
 * (@atta/aeg-core), which answers row membership from `topology.tasks`. No
 * check logic lives here.
 *
 * Refusal reasons print to stderr byte-identical to the inline messages the
 * hook printed before task 32, so a refused push reads exactly as before.
 * A NEW failure mode exists post-cutover that didn't exist when this read a
 * local file: forge/network unreachability. Treated fail-closed (refuse),
 * matching `verify-dispatch.ts`'s precedent for hard dispatch/push gates —
 * this is a real gate, not a fail-open nicety like `assign-task-issue.ts`.
 *
 * Usage: bun packages/aeg-core/bin/check-branch-topology.ts <branch>
 * Exit code: 0 = allow (push proceeds), 1 = refuse.
 */

import { deriveIterationFromForge, resolveRepo } from '@atta/aeg-forge-state'
import { checkBranchTopology, taskBranchTopologyFields } from '../src/index'

if (import.meta.main) {
  const branch = process.argv[2]
  if (!branch) {
    console.error('Usage: check-branch-topology.ts <branch>')
    process.exit(1)
  }

  const fields = taskBranchTopologyFields(branch)
  if (!fields) {
    // Not a task/*/* branch — the hook's own `case` wrapper filters these
    // before calling us; mirror its skip if invoked directly.
    process.exit(0)
  }

  const topoPath = `aeg-root/iterations/${fields.iteration}.md`

  const repo = await resolveRepo()
  if (!repo) {
    console.error(
      '✖ pre-push: check-branch-topology could not resolve a GitHub repo (set AEG_REPO or check `git remote`) — cannot evaluate the branch↔topology gate.'
    )
    process.exit(1)
  }

  let topology: Awaited<ReturnType<typeof deriveIterationFromForge>> | null
  try {
    topology = await deriveIterationFromForge(repo.owner, repo.repo, fields.iteration)
  } catch (err) {
    console.error(
      `✖ pre-push: check-branch-topology could not reach the forge for iteration \`${fields.iteration}\`: ${(err as Error).message}`
    )
    process.exit(1)
  }

  const result = checkBranchTopology({ branch, ...fields, topoPath, topology })
  if (result.verdict === 'refuse') {
    console.error(result.reason)
    process.exit(1)
  }
  process.exit(0)
}
