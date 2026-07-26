import { execFileSync, execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { loadIterationFiles } from './verify-coherence'

/**
 * Part 4 (aeg-forge-state-v1 3b, #437): proves the plan-PR-scoping
 * path (a PR's own diff touches an iteration topology file) is UNCHANGED by
 * either the id/issue forge cutover or the dependsOn/conflictsWith merge —
 * it must keep reading the PR's own uncommitted content via
 * `readFileAtRef(prContext.prHeadSha, ...)` + `parseIteration`, never the
 * forge, since a plan PR's own in-progress topology edit (e.g. a brand-new
 * iteration row) has no forge equivalent to derive from yet.
 *
 * Constructs a REAL commit via git plumbing (`hash-object` / `write-tree` /
 * `commit-tree`, isolated to a throwaway index via `GIT_INDEX_FILE` — never
 * touches this worktree's real index or working tree) containing a brand
 * new, synthetic iteration file with a task referencing Issue `#999999` —
 * chosen specifically because it cannot possibly exist in the real forge.
 * If `loadIterationFiles` read this task from anywhere OTHER than the
 * constructed commit's own content (e.g. fell through to a forge
 * derivation, which would find nothing for a slug with no real Milestone/
 * labeled Issues), the fixture task would never appear at all.
 */
function buildSyntheticPrHeadCommit(slug: string, taskId: string, taskTitle: string): string {
  const indexFile = execSync('mktemp', { encoding: 'utf8' }).trim()
  const env = { ...process.env, GIT_INDEX_FILE: indexFile }

  execFileSync('git', ['read-tree', 'origin/main'], { env })

  const content = [
    `# Iteration: ${slug} — synthetic`,
    '',
    'Lifecycle: active',
    '',
    'Goal: synthetic fixture for Part 4 (PR-head-SHA path test), not a real iteration.',
    '',
    '## Tasks (topology)',
    '',
    '| # | Task | Issue | Project(s) | Depends-on | Conflicts-with |',
    '|---|------|-------|-----------|------------|----------------|',
    `| ${taskId} | ${taskTitle} | #999999 | aeg | — | — |`,
    ''
  ].join('\n')

  const blobSha = execFileSync('git', ['hash-object', '-w', '--stdin'], {
    input: content,
    encoding: 'utf8',
    env
  }).trim()

  execFileSync('git', ['update-index', '--add', '--cacheinfo', `100644,${blobSha},aeg-root/iterations/${slug}.md`], {
    env
  })

  const treeSha = execFileSync('git', ['write-tree'], { env, encoding: 'utf8' }).trim()
  // A fresh CI runner has no configured git identity — `commit-tree` refuses
  // ("Author identity unknown") without one. Explicit author/committer env
  // vars avoid depending on any ambient `git config`, local or CI.
  const commitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: 'AEG test fixture',
    GIT_AUTHOR_EMAIL: 'aeg-test-fixture@localhost',
    GIT_COMMITTER_NAME: 'AEG test fixture',
    GIT_COMMITTER_EMAIL: 'aeg-test-fixture@localhost'
  }
  const commitSha = execFileSync(
    'git',
    ['commit-tree', treeSha, '-p', 'origin/main', '-m', 'test fixture: synthetic PR-head commit'],
    { encoding: 'utf8', env: commitEnv }
  ).trim()

  execFileSync('rm', ['-f', indexFile])
  return commitSha
}

describe('PR-head-SHA path (D-082 plan-PR scoping) — unchanged by the forge cutover', () => {
  it("reads a synthetic iteration file's task from the constructed commit, not the forge or origin/main", async () => {
    const slug = 'zzz-pr-head-fixture-test'
    const relPath = `aeg-root/iterations/${slug}.md`
    const commitSha = buildSyntheticPrHeadCommit(slug, '1', 'Synthetic PR-head fixture task')

    // onlySlug scopes the sweep to just this synthetic iteration — avoids
    // paying for a full forge-derive pass over every real iteration, which
    // this test has no interest in.
    const files = await loadIterationFiles(
      {
        prHeadSha: commitSha,
        touchedFiles: new Set([relPath])
      },
      slug
    )

    const file = files.find((f) => f.slug === slug)
    expect(file).toBeDefined()
    expect(file?.iteration.tasks).toHaveLength(1)
    expect(file?.iteration.tasks[0]).toMatchObject({
      id: '1',
      title: 'Synthetic PR-head fixture task',
      issue: 999999
    })
  }, 30_000)
})
