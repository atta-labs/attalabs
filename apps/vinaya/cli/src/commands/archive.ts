// `vinaya archive` — the post-merge Archivist, callable directly instead of
// only from the `post-merge` job in the generated `vinaya-archivist.yml`
// (see lib/artifacts.ts's `archivistWorkflow()`). Thin I/O shim mirroring
// this monorepo's own `packages/aeg-core/bin/archive-task.ts`: resolves the
// merged PR from a merge SHA via `gh`, gathers `MergedPrFacts`, and calls
// the pure `buildProvenanceBlock` / `taskRefFromBranch` / `hasProvenance` /
// `isEligibleForProvenance` homed in `@atta/aeg-core` — already a CLI
// dependency (see artifacts.ts's own `@atta/aeg-core` import).
//
// Repo/owner resolution goes through this CLI's own `detectGitRepo()`
// (lib/detect.ts) — the same path every other command uses — never a
// second auth/repo-resolution mechanism.

import { execFileSync } from 'node:child_process'
import {
  buildProvenanceBlock,
  extractIssue,
  hasProvenance,
  isEligibleForProvenance,
  taskRefFromBranch,
  type MergedPrFacts
} from '@atta/aeg-core'
import { detectGitRepo, type RepoInfo } from '../lib/detect.js'

export type ArchiveDeps = {
  detectRepo: () => Promise<RepoInfo | null>
}

function realDeps(): ArchiveDeps {
  return { detectRepo: detectGitRepo }
}

function sh(args: string[], input?: string): string {
  return execFileSync(args[0] as string, args.slice(1), { encoding: 'utf8', input }).trim()
}

function shJson<T>(args: string[]): T {
  return JSON.parse(sh(args)) as T
}

type AssociatedPr = { number: number }
type PrView = {
  number: number
  headRefName: string
  body: string
  mergedAt: string
  comments: { body: string }[]
}

function parseMergeSha(args: string[]): string | null {
  for (const a of args) {
    const m = a.match(/^--merge-sha=(.+)$/)
    if (m) return m[1] as string
  }
  return null
}

export async function runArchive(args: string[], deps: ArchiveDeps): Promise<number> {
  const repo = await deps.detectRepo()
  if (!repo) {
    console.error('Error: not a git repository. Run `vinaya archive` from inside your repo.')
    return 1
  }
  if (!repo.owner || !repo.repo) {
    console.error('Error: could not resolve a GitHub owner/repo from the `origin` remote.')
    return 1
  }
  const repoFlag = `${repo.owner}/${repo.repo}`

  const mergeSha = parseMergeSha(args) ?? sh(['git', 'rev-parse', 'HEAD'])

  const associated = shJson<AssociatedPr[]>(['gh', 'api', `repos/${repoFlag}/commits/${mergeSha}/pulls`])
  if (associated.length === 0) {
    console.log(`[vinaya archive] no associated PR for merge ${mergeSha} — skip.`)
    return 0
  }

  const prNumber = (associated[0] as AssociatedPr).number
  const pr = shJson<PrView>([
    'gh',
    'pr',
    'view',
    String(prNumber),
    '-R',
    repoFlag,
    '--json',
    'number,headRefName,body,mergedAt,comments'
  ])

  // Same OR-of-two-signals eligibility as archive-task.ts: a
  // `task/<tranche>/<id>` branch, or the closed Issue itself carrying a
  // `vinaya/tranche:*` label — branch-name-only detection silently skips a
  // real task closure otherwise.
  const ref = taskRefFromBranch(pr.headRefName)
  let issueLabels: string[] = []
  if (ref === null) {
    const { issue: candidateIssue } = extractIssue(pr.body)
    if (candidateIssue !== null) {
      issueLabels = shJson<{ labels: { name: string }[] }>([
        'gh',
        'issue',
        'view',
        String(candidateIssue),
        '-R',
        repoFlag,
        '--json',
        'labels'
      ]).labels.map((l) => l.name)
    }
  }

  if (!isEligibleForProvenance(ref, issueLabels)) {
    console.log(
      `[vinaya archive] non-task branch (${pr.headRefName}) and closing Issue carries no vinaya/tranche:* label — skip.`
    )
    return 0
  }

  const comments = pr.comments.map((c) => c.body)
  if (hasProvenance(comments)) {
    console.log(`[vinaya archive] provenance already present on PR #${pr.number} — skip (idempotent).`)
    return 0
  }

  const facts: MergedPrFacts = {
    number: pr.number,
    headRefName: pr.headRefName,
    body: pr.body,
    mergedAt: pr.mergedAt,
    mergeSha,
    comments
  }

  const { block, issue, dangling } = buildProvenanceBlock(facts)

  console.log(`[vinaya archive] posting provenance block to PR #${pr.number}...`)
  sh(['gh', 'pr', 'comment', String(pr.number), '-R', repoFlag, '--body-file', '-'], block)
  console.log(`[vinaya archive] provenance block posted to PR #${pr.number}.`)

  if (dangling.length > 0) {
    console.log(`[vinaya archive] DANGLING (${dangling.length}): ${dangling.join('; ')}`)
  }

  if (issue !== null) {
    console.log(`[vinaya archive] closing Issue #${issue}...`)
    sh(['gh', 'issue', 'close', String(issue), '-R', repoFlag])
    const state = shJson<{ state: string }>([
      'gh',
      'issue',
      'view',
      String(issue),
      '-R',
      repoFlag,
      '--json',
      'state'
    ]).state
    if (state !== 'CLOSED') {
      console.error(`[vinaya archive] FAILED — Issue #${issue} did not confirm CLOSED (state: ${state}).`)
      return 1
    }
    console.log(`[vinaya archive] Issue #${issue} confirmed CLOSED.`)
  } else {
    console.log('[vinaya archive] no Issue to close — Closes #N absent from PR body.')
  }

  console.log('[vinaya archive] PASS.')
  return 0
}

export async function archiveCommand(args: string[]): Promise<void> {
  process.exit(await runArchive(args, realDeps()))
}
