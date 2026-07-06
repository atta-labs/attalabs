#!/usr/bin/env bun

/**
 * assign-task-issue — thin CLI/I/O shim for first-push Issue self-assignment
 * (aeg-governance-hardening task 33, #401), wired into `.husky/pre-push`.
 * On a `task/<iteration>/<n>` branch's genuinely first push (the remote ref
 * does not exist yet), assigns the task's Issue to the authenticated `gh`
 * user — the actual pusher — so Studio's dispatch-visibility chip (task 26,
 * #368) always has a real signal to render instead of depending on the
 * Principal remembering to assign by hand.
 *
 * No decision logic lives here — facts are gathered (topology row → Issue
 * number, current assignees, authenticated login) and handed to the pure
 * evaluator `decideIssueAssignment` (@atta/aeg-core).
 *
 * FAIL-OPEN BY CONTRACT: this is a visibility nicety, never a gate. Every
 * failed `gh` call degrades to a `null` fact (which the evaluator maps to a
 * skip), a failed assignment prints a warning, and the process ALWAYS exits
 * 0 — a push must never be blocked by an assignment-API failure. The hook
 * additionally never gates on this bin's exit code.
 *
 * Every `gh` call carries an explicit `-R <owner>/<repo>` (task 23, #360
 * precedent) — from a linked `git worktree add` checkout an untargeted call
 * silently scopes to the wrong repo or returns nothing.
 *
 * Usage: bun packages/aeg-core/bin/assign-task-issue.ts <branch> <remote-ref-exists:0|1>
 * Exit code: always 0 (fail-open), except on missing usage args.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveRepo } from '../../../apps/aeg/web/studio/src/lib/forge/resolve-repo'
import { decideIssueAssignment, parseIteration, parseTaskBranch } from '../src/index'

const REPO_ROOT = join(import.meta.dirname, '../../..')
const PREFIX = '[assign-task-issue]'

function sh(cmd: string): string | null {
  try {
    return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 })
  } catch {
    return null
  }
}

function resolveIssue(iteration: string, taskId: string): number | null {
  const abs = join(REPO_ROOT, `aeg-root/iterations/${iteration}.md`)
  if (!existsSync(abs)) return null
  const task = parseIteration(readFileSync(abs, 'utf8')).tasks.find((t) => t.id === taskId)
  return task?.issue ?? null
}

function fetchAssignees(issue: number, repo: string): string[] | null {
  const out = sh(`gh issue view ${issue} -R ${repo} --json assignees`)
  if (out === null) return null
  try {
    const parsed = JSON.parse(out) as { assignees?: Array<{ login?: string }> }
    return (parsed.assignees ?? []).map((a) => a.login ?? '').filter(Boolean)
  } catch {
    return null
  }
}

function fetchLogin(): string | null {
  const out = sh('gh api user -q .login')
  const login = out?.trim()
  return login ? login : null
}

if (import.meta.main) {
  const branch = process.argv[2]
  const remoteRefExists = process.argv[3] === '1'

  if (!branch || process.argv[3] === undefined) {
    console.error('Usage: assign-task-issue.ts <branch> <remote-ref-exists:0|1>')
    process.exit(1)
  }

  const parsed = parseTaskBranch(branch)

  // Gather forge facts only when the evaluator could possibly act — a
  // non-task branch or a non-first push must cost zero `gh` calls.
  let issue: number | null = null
  let assignees: string[] | null = null
  let login: string | null = null
  let repo: string | null = null

  if (parsed && !remoteRefExists) {
    issue = resolveIssue(parsed.iteration, parsed.taskId)
    const repoRef = await resolveRepo()
    repo = repoRef ? `${repoRef.owner}/${repoRef.repo}` : null
    if (issue !== null && repo !== null) {
      assignees = fetchAssignees(issue, repo)
      login = fetchLogin()
    }
  }

  const decision = decideIssueAssignment({ branch, remoteRefExists, issue, assignees, login })

  if (decision.action === 'assign' && repo !== null) {
    const ok = sh(`gh issue edit ${decision.issue} -R ${repo} --add-assignee ${decision.login}`)
    if (ok === null) {
      console.warn(
        `${PREFIX} ⚠ could not assign Issue #${decision.issue} to @${decision.login} — push proceeds anyway.`
      )
    } else {
      console.log(`${PREFIX} ✓ ${decision.reason}`)
    }
  } else if (parsed && !remoteRefExists) {
    // Only narrate on the path where assignment was actually considered —
    // routine non-first pushes stay silent.
    console.log(`${PREFIX} ${decision.reason}`)
  }

  process.exit(0)
}
