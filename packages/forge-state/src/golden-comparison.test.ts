import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { type Iteration, parseIteration } from '@atta/aeg-core'
import { describe, expect, it } from 'vitest'
import { deriveIterationFromForge } from './derive-from-forge'

/**
 * Golden comparison (brief §9, Part 4): the forge-derived `Iteration` must
 * match `parseIteration(topology-file)` field-for-field, against every
 * currently-active iteration's REAL data — not a fixture.
 *
 * Three documented, expected divergence categories (never silently
 * reconciled — see PR body for full evidence):
 *
 *   1. `goal`/`lifecycle` when no Milestone exists yet for the slug — a real
 *      transitional state (no active iteration has one today).
 *   2. `rationaleMarkdown` — every currently-active iteration file is
 *      "topology only" (no inline `### Task N —` blocks), so the file side is
 *      always `''`. The forge side correctly captures the real Issue body.
 *      This is the adapter doing its job, not a bug — the file lost this
 *      content on purpose; the forge object never did.
 *   3. `dependsOn`/`conflictsWith` on `vinaya-cli-v1` task 2 (#382) only —
 *      the topology table cell was hand-edited after the Issue was authored
 *      (D-112 resequencing amendment), and the amendment's new edge was
 *      never rewritten into the Issue's structured `Dependency rationale`
 *      backtick spans — only added as free prose below it. The adapter
 *      correctly parses the Issue's original structured field; the drift is
 *      between the table and the Issue, not a parser defect.
 *   4. `title` on `vinaya-cli-v1` task 4 (#384) only — the table's Task cell
 *      reads "...installer, ruleset"; the Issue's actual title reads
 *      "...installer, starter ruleset". One-word wording drift between the
 *      table and the Issue at authoring time, unrelated to any parsing.
 */
const OWNER = 'daniboomerang'
const REPO = 'attalabs'
const REPO_ROOT = join(import.meta.dirname, '../../..')

function readTopologyIteration(fileName: string): Iteration {
  return parseIteration(readFileSync(join(REPO_ROOT, 'aeg-root/iterations', fileName), 'utf8'))
}

function expectTaskFieldsMatch(
  fileIteration: Iteration,
  forgeIteration: Iteration,
  opts: { skipEdgeCheckForIds?: Set<string>; skipTitleCheckForIds?: Set<string> } = {}
) {
  expect(forgeIteration.tasks.length).toBe(fileIteration.tasks.length)
  for (const fileTask of fileIteration.tasks) {
    const forgeTask = forgeIteration.tasks.find((t) => t.id === fileTask.id)
    expect(forgeTask, `task ${fileTask.id} should be present in the forge derivation`).toBeDefined()
    if (!opts.skipTitleCheckForIds?.has(fileTask.id)) {
      expect(forgeTask?.title).toBe(fileTask.title)
    }
    expect(forgeTask?.issue).toBe(fileTask.issue)
    expect(forgeTask?.projects).toEqual(fileTask.projects)
    if (!opts.skipEdgeCheckForIds?.has(fileTask.id)) {
      expect(forgeTask?.dependsOn).toEqual(fileTask.dependsOn)
      expect(forgeTask?.conflictsWith).toEqual(fileTask.conflictsWith)
    }
    // Divergence category 2 — see file-level doc comment above.
    expect(fileTask.rationaleMarkdown).toBe('')
    expect(forgeTask?.rationaleMarkdown.length).toBeGreaterThan(0)
  }
}

describe('golden comparison: aeg-forge-state-v1', () => {
  it('matches parseIteration(file) field-for-field, modulo the documented gaps', async () => {
    const fileIteration = readTopologyIteration('aeg-forge-state-v1.md')
    const forgeIteration = await deriveIterationFromForge(OWNER, REPO, 'aeg-forge-state-v1')

    expect(forgeIteration.name).toBe(fileIteration.name)
    expect(forgeIteration.lifecycle).toBe(fileIteration.lifecycle)
    // Divergence category 1 — no Milestone exists yet for this slug.
    expect(forgeIteration.goal).toBe('')
    expect(forgeIteration.backlog).toEqual(fileIteration.backlog)

    expectTaskFieldsMatch(fileIteration, forgeIteration)
  })
})

describe('golden comparison: vinaya-cli-v1', () => {
  it('matches parseIteration(file) field-for-field, modulo the documented gaps', async () => {
    const fileIteration = readTopologyIteration('vinaya-cli-v1.md')
    const forgeIteration = await deriveIterationFromForge(OWNER, REPO, 'vinaya-cli-v1')

    expect(forgeIteration.name).toBe(fileIteration.name)
    expect(forgeIteration.lifecycle).toBe(fileIteration.lifecycle)
    // Divergence category 1 — no Milestone exists yet for this slug.
    expect(forgeIteration.goal).toBe('')
    expect(forgeIteration.backlog).toEqual(fileIteration.backlog)

    expectTaskFieldsMatch(fileIteration, forgeIteration, {
      skipEdgeCheckForIds: new Set(['2']),
      skipTitleCheckForIds: new Set(['4'])
    })

    // Divergence category 3 — task 2 (#382): the adapter correctly parses the
    // Issue's ORIGINAL structured `Dependency rationale` field. The topology
    // table's cell has since drifted ahead via an unstructured prose
    // amendment appended below that field (never rewritten into it).
    const task2 = forgeIteration.tasks.find((t) => t.id === '2')
    expect(task2?.dependsOn).toEqual(['aeg-governance-hardening #372'])
    expect(task2?.conflictsWith).toEqual(['aeg-governance-hardening 25'])

    // Divergence category 4 — task 4 (#384): the Issue's actual title carries
    // one extra word ("starter ruleset") the table's Task cell dropped.
    const task4 = forgeIteration.tasks.find((t) => t.id === '4')
    expect(task4?.title).toBe('vinaya init + init product: diff-and-confirm installer, starter ruleset')
  })
})
