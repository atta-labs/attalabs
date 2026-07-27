import { DERIVABLE_STATUSES, DERIVATION_RULES, DERIVED_STATUSES, FORGE_FACT_INPUTS } from '@atta/aeg-core'
import { LABELS } from '@atta/aeg-forge-state/labels'
import { describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// rewrites it, a test runner does not. Stubbing it is what lets the loader
// (which must keep that import) be exercised here.
vi.mock('server-only', () => ({}))

const { loadStateMachineModel } = await import('./load-state-machine')

/**
 * The invariant this whole route exists for: the page renders FROM the model,
 * so every table's row count is the model array's length and nothing is
 * hand-authored. A literal row added to the page later breaks these counts.
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
