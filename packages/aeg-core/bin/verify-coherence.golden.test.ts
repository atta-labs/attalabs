import { execSync } from 'node:child_process'
import { describe, it } from 'vitest'
import { deriveTrancheFromForge, resolveRepo } from '@atta/aeg-forge-state'
import { parseTranche } from '../src/index'

/**
 * Golden comparison (aeg-forge-state-v1 3b, #437, Part 3): proves the
 * forge-derived `id`/`issue` `loadTrancheFiles` now uses for every
 * non-touched tranche matches the pre-3b file-parsed topology table, for
 * every currently active tranche — not a fixture, the live repo.
 *
 * Scoped to `id`/`issue` only (NOT `dependsOn`/`conflictsWith`) — a
 * deliberate narrowing per the Planner's triage on Issue #437. The original,
 * unscoped version of this test (comparing `dependsOn` too) found real
 * divergence across all 5 active tranches: legacy Issues predating the
 * "Dependency rationale" grammar carry no forge-parseable dependency
 * data, stale Issue bodies drift from topology-table edits, and
 * `parse-rationale-deps.ts` has its own cross-tranche-qualified-ref gaps.
 * `loadTrancheFiles` (`verify-coherence.ts`) responded by keeping
 * `dependsOn`/`conflictsWith` sourced from the topology table itself,
 * merged onto the forge-derived task list — this test's job is to prove the
 * two fields that DID get cut over (`id`, `issue`) are safe to, not to
 * re-litigate the fields that didn't.
 *
 * Comparing the full `Tranche`/`Task` object beyond that would be both
 * unnecessary and actively wrong: a forge-derived `Task.rationaleMarkdown` is
 * the Issue's full body, while the file-parsed version is only the topology
 * file's own `### Task <id> — …` block — different by design (see
 * `derive-from-forge.ts`'s own docstring), and neither field is read by any
 * coherence check (confirmed by inspection of `coherence-checks.ts`).
 *
 * Lives here in aeg-core, not in aeg-forge-state, per this task's own
 * constraint (a prior cross-package version of this test was deleted in
 * task 3a — see that task's PR #440 — specifically because it belonged with
 * the consumer, not the standalone adapter).
 *
 * Requires live `gh`/forge access (a real `resolveRepo()` + working `gh`
 * auth) to be a meaningful proof — skips (not fails) when neither is
 * available, since that means every derivation call falls back to the file
 * read anyway and the comparison degrades to file-vs-file (vacuously true,
 * not informative). CI (`ci.yml`'s `typecheck-and-tests` job) now carries
 * `GH_TOKEN` specifically so this runs as a real proof there, not a skip.
 */
function activeTrancheSlugs(): string[] {
  // --full-tree: `<rev>:<path>` resolves relative to CWD by default for
  // `ls-tree` (unlike `git show`, which already resolves from repo root) —
  // this test runs from `packages/aeg-core`, not the repo root.
  return execSync('git ls-tree --full-tree --name-only origin/main:aeg-root/iterations', { encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter((name) => name.endsWith('.md') && name !== 'README.md' && !name.endsWith('.tokens.md'))
    .map((name) => name.replace(/\.md$/, ''))
}

type ComparableTask = { id: string; issue: number | null }

/**
 * `#TBD` rows (`issue: null`) are excluded before comparing: they have no
 * Issue to derive from, so `deriveTrancheFromForge` structurally cannot
 * ever list them (confirmed live: `vada-production-v1`'s 6a/6b/6c) — that's
 * an expected, by-design gap in forge derivation itself, not a data-quality
 * divergence this test exists to catch. `loadTrancheFiles` handles it
 * separately (appends file-only tasks as-is — see `deriveOrFallback`'s
 * docstring); this test only proves equivalence for tasks forge CAN see.
 */
function normalizeTasks(tasks: readonly { id: string; issue: number | null }[]): ComparableTask[] {
  return tasks
    .filter((t) => t.issue !== null)
    .map((t) => ({ id: t.id, issue: t.issue }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

describe('golden comparison: forge-derived vs file-derived id/issue (aeg-forge-state-v1 3b, #437)', () => {
  it('produces identical id/issue for every active tranche', async () => {
    const repo = await resolveRepo()
    if (!repo) {
      console.warn(
        '[golden-comparison] no repo resolved (no `git remote`/AEG_REPO) — skipping, nothing to compare against.'
      )
      return
    }

    const slugs = activeTrancheSlugs()
    if (slugs.length === 0) {
      // Expected, permanent steady state post-#515/#517: every active
      // tranche is forge-native, so there is no file left for this test
      // to compare against — the comparison this test exists to prove
      // (file-derived vs forge-derived `id`/`issue`) is now vacuously true,
      // not a gap. Do not reintroduce a `> 0` assertion; that would require
      // a live topology file to exist just to keep this test meaningful,
      // which is exactly the state this repo's cutover eliminated.
      console.warn('[golden-comparison] no active tranche carries a topology file — nothing to compare, passing.')
      return
    }

    const mismatches: string[] = []
    let comparedCount = 0

    for (const slug of slugs) {
      const raw = execSync(`git show origin/main:aeg-root/iterations/${slug}.md`, { encoding: 'utf8' })
      const fileTasks = normalizeTasks(parseTranche(raw).tasks)

      let forgeTasks: ComparableTask[]
      try {
        forgeTasks = normalizeTasks((await deriveTrancheFromForge(repo.owner, repo.repo, slug)).tasks)
      } catch (err) {
        console.warn(
          `[golden-comparison] forge derivation failed for "${slug}" — skipping this slug: ${(err as Error).message}`
        )
        continue
      }

      comparedCount++
      const fileJson = JSON.stringify(fileTasks)
      const forgeJson = JSON.stringify(forgeTasks)
      if (fileJson !== forgeJson) {
        mismatches.push(`${slug}:\n  file:  ${fileJson}\n  forge: ${forgeJson}`)
      }
    }

    if (comparedCount === 0) {
      console.warn(
        '[golden-comparison] forge derivation failed for every active tranche — skipping, nothing was actually compared.'
      )
      return
    }

    if (mismatches.length > 0) {
      throw new Error(
        `Golden comparison mismatch(es) — forge-derived id/issue diverges from file-derived:\n\n${mismatches.join('\n\n')}`
      )
    }
  }, 120_000)
})
