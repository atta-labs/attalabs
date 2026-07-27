import 'server-only'
import {
  DERIVABLE_STATUSES,
  DERIVATION_RULES,
  DERIVED_STATUSES,
  type DerivationRule,
  type DerivedStatus,
  FORGE_FACT_INPUTS,
  type ForgeFactInput
} from '@atta/aeg-core'
import { type Label, LABELS } from '@atta/aeg-forge-state/labels'

/**
 * Build-time data spine for `/state-machine`: the four datasets the page
 * renders, read straight off the code-owned model. Unlike `/the-harness`'s
 * loader there is no doctrine source and no derivation — these are static
 * exports, so this is a passthrough whose only real job is the SERVER
 * BOUNDARY: `@atta/aeg-core`'s barrel reaches `@atta/aeg-forge-state`'s
 * `gh.ts` and therefore `node:child_process`, which Turbopack refuses to
 * bundle for the browser. `import 'server-only'` makes that a build error at
 * the first client import rather than a mystery chunk failure, which is why it
 * is here and not merely a convention. Anything client-side that needs the
 * label vocabulary imports `@atta/aeg-forge-state/labels` (the pure subpath)
 * directly — never this module, and never the barrel.
 *
 * `DerivationRule.matches` is deliberately dropped on the way out: it is a
 * predicate function (unserializable, and never rendered — `when` is the prose
 * the model carries for exactly this purpose), so stripping it here means no
 * caller can accidentally push a function across a client boundary.
 */

/** A derivation rule as the page renders it — every field but the predicate. */
export type RenderedDerivationRule = Omit<DerivationRule, 'matches'>

/**
 * One row of the statuses table. `derivable` and `concludedBy` are both read
 * off the model (`DERIVABLE_STATUSES` membership, and the rules that conclude
 * this status) rather than stated by hand — `backlog` is the one status the
 * chain never concludes, and the table shows that instead of hiding it.
 */
export type StatusRow = {
  status: DerivedStatus
  derivable: boolean
  concludedBy: string[]
}

export type StateMachineModel = {
  factInputs: ForgeFactInput[]
  labels: Label[]
  statuses: StatusRow[]
  rules: RenderedDerivationRule[]
}

export function loadStateMachineModel(): StateMachineModel {
  return {
    factInputs: FORGE_FACT_INPUTS,
    labels: LABELS,
    statuses: DERIVED_STATUSES.map((status) => ({
      status,
      derivable: DERIVABLE_STATUSES.includes(status),
      concludedBy: DERIVATION_RULES.filter((rule) => rule.status === status).map((rule) => rule.id)
    })),
    rules: DERIVATION_RULES.map((rule) => ({
      id: rule.id,
      chainStep: rule.chainStep,
      when: rule.when,
      status: rule.status,
      why: rule.why
    }))
  }
}
