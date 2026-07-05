#!/usr/bin/env bun

/**
 * check-branch-topology — thin CLI/I/O shim for the D-073 branch↔topology
 * gate wired into `.husky/pre-push` (aeg-governance-hardening task 32,
 * #399). Reads `aeg-root/iterations/<iteration>.md` (or notes its absence)
 * and hands the content to the pure evaluator `checkBranchTopology`
 * (@atta/aeg-core), which answers row membership via `parseIteration` —
 * the same authoritative parser Studio and `verify-dispatch` use — instead
 * of the hand-rolled grep the hook used to fork. No check logic lives here.
 *
 * Refusal reasons print to stderr byte-identical to the inline messages the
 * hook printed before this task, so a refused push reads exactly as before.
 *
 * Usage: bun packages/aeg-core/bin/check-branch-topology.ts <branch>
 * Exit code: 0 = allow (push proceeds), 1 = refuse.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkBranchTopology, taskBranchTopologyFields } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')

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
  const abs = join(REPO_ROOT, topoPath)
  const topoMarkdown = existsSync(abs) ? readFileSync(abs, 'utf8') : null

  const result = checkBranchTopology({ branch, ...fields, topoPath, topoMarkdown })
  if (result.verdict === 'refuse') {
    console.error(result.reason)
    process.exit(1)
  }
  process.exit(0)
}
