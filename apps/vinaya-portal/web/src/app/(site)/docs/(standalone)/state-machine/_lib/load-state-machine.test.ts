import { DERIVABLE_STATUSES, DERIVATION_RULES, DERIVED_STATUSES, FORGE_FACT_INPUTS } from '@atta/aeg-core'
import { LABELS } from '@atta/aeg-forge-state/labels'
import { describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// rewrites it, a test runner does not. Stubbing it is what lets the loader
// (which must keep that import) be exercised here.
vi.mock('server-only', () => ({}))

const { deriveDiagramGroups, loadStateMachineModel } = await import('./load-state-machine')

/**
 * What these tests pin: the loader is a faithful passthrough of the model
 * arrays — same elements, same order, same length — so what the page maps over
 * is the model itself and not a copy of it.
 *
 * What they do NOT pin: what the components render. This app has no
 * React-render infrastructure (every suite here exercises pure `_lib`
 * functions), so a hand-authored `<TableRow>` pasted into
 * `StateMachineTables.tsx` would pass this suite. The render-from-model
 * discipline in the components is held by review and by their own doc
 * comments, not by a test — do not read these assertions as a guard over the
 * JSX.
 */
describe('loadStateMachineModel', () => {
  it('returns one row per model element, in model order', () => {
    const model = loadStateMachineModel()

    expect(model.factInputs).toEqual(FORGE_FACT_INPUTS)
    expect(model.labels).toEqual(LABELS)
    expect(model.statuses.map((s) => s.status)).toEqual(DERIVED_STATUSES)
    expect(model.rules.map((r) => r.id)).toEqual(DERIVATION_RULES.map((r) => r.id))
  })

  it('drops the unserializable predicate but keeps every rendered field', () => {
    const model = loadStateMachineModel()

    for (const [i, rule] of model.rules.entries()) {
      const source = DERIVATION_RULES[i]
      expect(rule).not.toHaveProperty('matches')
      expect(rule).toEqual({
        id: source.id,
        chainStep: source.chainStep,
        when: source.when,
        status: source.status,
        why: source.why
      })
    }
  })

  it('marks a status derivable exactly when the chain can conclude it', () => {
    const model = loadStateMachineModel()

    for (const row of model.statuses) {
      expect(row.derivable).toBe(DERIVABLE_STATUSES.includes(row.status))
      expect(row.concludedBy).toEqual(DERIVATION_RULES.filter((r) => r.status === row.status).map((r) => r.id))
    }
    // `backlog` is the one status no rule concludes — the reason the table
    // carries the column at all.
    expect(model.statuses.find((s) => s.status === 'backlog')?.concludedBy).toEqual([])
  })
})

/**
 * Same passthrough property for the diagram's shape: each count returned here
 * IS an array length and each name IS an array element. A literal typed into
 * `deriveDiagramGroups` fails these assertions — a literal typed directly into
 * `StateMachineDiagram.tsx`'s JSX does not, for the reason given above, which
 * is why the derivation lives in this module rather than in the component.
 */
describe('deriveDiagramGroups', () => {
  const groups = deriveDiagramGroups(loadStateMachineModel())

  it('counts the live model arrays, never a literal', () => {
    expect(groups.facts.count).toBe(FORGE_FACT_INPUTS.length)
    expect(groups.labels.count).toBe(LABELS.length)
    expect(groups.rules.count).toBe(DERIVATION_RULES.length)
    expect(groups.statuses.count).toBe(DERIVED_STATUSES.length)
  })

  it('names statuses and samples inputs from the model itself', () => {
    expect(groups.statuses.names).toEqual(DERIVED_STATUSES)
    expect(groups.facts.samples).toEqual(FORGE_FACT_INPUTS.slice(0, 3).map((i) => i.fact))
    expect(groups.labels.samples).toEqual(LABELS.slice(0, 3).map((l) => l.id))
  })

  it('never samples more than the group holds', () => {
    expect(groups.facts.samples.length).toBeLessThanOrEqual(groups.facts.count)
    expect(groups.labels.samples.length).toBeLessThanOrEqual(groups.labels.count)
  })
})
