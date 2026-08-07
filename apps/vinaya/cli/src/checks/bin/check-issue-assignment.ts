#!/usr/bin/env bun

/**
 * Core check: issue-assignment. Thin adapter over `@atta/aeg-core`'s
 * `decideIssueAssignment` — mirrors `packages/aeg-core/bin/assign-task-issue.ts`'s
 * fact-gathering (topology row's Issue number, current assignees, the
 * authenticated `gh` user) exactly, emitting the check contract instead of
 * human text.
 *
 * NOT a pass/fail gate, by design (same as the reference script): this is
 * visibility automation, not a merge blocker. Every failed `gh` call
 * degrades to a `null` fact (the evaluator maps that to a skip), and the
 * process ALWAYS exits 0. Distinct from every other check in this
 * directory in one more respect: on its `assign` path it performs a real
 * GitHub write (`gh issue edit --add-assignee`) as a side effect of running
 * — flagged explicitly here and in the PR body's Part 4 note, since a
 * check that mutates forge state on every invocation is a meaningfully
 * different category from the other twelve, which are pure reads.
 *
 * Uses `createForgeSource` (`@atta/vinaya-sources`) rather than
 * `deriveTrancheFromForge`/`resolveRepo` from `@atta/aeg-forge-state`
 * directly — the same dependency boundary every check in this directory
 * keeps.
 *
 * scope: full — a property of the task's Issue and the current push, not
 * the local diff.
 */

import { execFileSync } from 'node:child_process'
import { decideIssueAssignment, parseTaskBranch } from '@atta/aeg-core'
import { createForgeSource } from '@atta/vinaya-sources'
import { CHECK_SCHEMA_VERSION, emitCheckError } from '../contract'

const CHECK_NAME = 'issue-assignment'

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch {
    return ''
  }
}

function sh(args: string[]): string | null {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    return null
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

async function resolveIssue(owner: string, repo: string, tranche: string, taskId: string): Promise<number | null> {
  try {
    const source = createForgeSource({ owner, repo })
    const tranche_ = await source.getTranche(tranche)
    return tranche_.tasks.find((t) => t.id === taskId)?.issue ?? null
  } catch {
    return null
  }
}

function fetchAssignees(issue: number, repoFlag: string): string[] | null {
  const out = sh(['issue', 'view', String(issue), '-R', repoFlag, '--json', 'assignees'])
  if (out === null) return null
  try {
    const parsed = JSON.parse(out) as { assignees?: Array<{ login?: string }> }
    return (parsed.assignees ?? []).map((a) => a.login ?? '').filter(Boolean)
  } catch {
    return null
  }
}

function fetchLogin(): string | null {
  const out = sh(['api', 'user', '-q', '.login'])
  const login = out?.trim()
  return login ? login : null
}

async function main(): Promise<void> {
  const branch = process.env.BRANCH || git(['rev-parse', '--abbrev-ref', 'HEAD'])
  // `vinaya check` has no direct signal for "does the remote ref already
  // exist" (that's a pre-push-hook-local fact, not a forge fact) — derived
  // here the same way `dead-branch-push`/`first-push-dispatch` derive
  // "does a PR exist yet": a `gh pr list --head` probe. No open/merged/
  // closed PR AND no remote branch found means this still reads as a first
  // push; the evaluator itself is a no-op (`skip`) for every other branch
  // shape regardless, so a false "first push" read on a non-first push
  // costs nothing beyond a wasted `gh` lookup, never a wrong mutation.
  //
  // Gathered ONLY when `parsed` — a non-task branch must cost zero `gh`
  // calls, the same guarantee `assign-task-issue.ts`'s own doc comment
  // makes for its caller-supplied `remoteRefExists` (this adapter has no
  // such caller, so it derives the fact itself, but the "zero calls for a
  // non-task branch" invariant still applies to the derivation).
  const parsed = parseTaskBranch(branch)
  let remoteRefExists = true
  let issue: number | null = null
  let assignees: string[] | null = null
  let login: string | null = null
  let repoFlag: string | null = null

  if (parsed) {
    remoteRefExists = sh(['api', `repos/{owner}/{repo}/branches/${encodeURIComponent(branch)}`]) !== null
  }

  if (parsed && !remoteRefExists) {
    const repo = resolveRepo()
    repoFlag = repo ? `${repo.owner}/${repo.repo}` : null
    if (repo) issue = await resolveIssue(repo.owner, repo.repo, parsed.tranche, parsed.taskId)
    if (issue !== null && repoFlag !== null) {
      assignees = fetchAssignees(issue, repoFlag)
      login = fetchLogin()
    }
  }

  const decision = decideIssueAssignment({ branch, remoteRefExists, issue, assignees, login })

  if (decision.action === 'assign' && repoFlag !== null) {
    const ok = sh(['issue', 'edit', String(decision.issue), '-R', repoFlag, '--add-assignee', decision.login])
    if (ok === null) {
      emitCheckError({
        schema: CHECK_SCHEMA_VERSION,
        check: CHECK_NAME,
        severity: 'warning',
        message: `issue-assignment: could not assign Issue #${decision.issue} to @${decision.login}.`,
        agent_recovery_prompt: `Assign Issue #${decision.issue} to @${decision.login} manually, or ignore — this is a visibility nicety, not a gate.`
      })
    }
  }

  process.exit(0)
}

main()
