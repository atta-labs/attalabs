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

/** How many ids each input group shows as a sample of what it holds. */
const SAMPLE_SIZE = 3

/** One input group of the diagram — its live size, and a sample of what it holds. */
export type DiagramInputGroup = {
  label: string
  count: number
  samples: string[]
}

/**
 * The diagram's own shape, derived from the same loaded model the tables
 * render — every count is an array length and every name is an array element,
 * so the diagram cannot drift from the tables beneath it or from the model
 * beneath them both. A literal `9` typed into the diagram is the failure this
 * page exists to remove, which is why the derivation lives here as a pure
 * function rather than inline in the component: here it is unit tested
 * (`load-state-machine.test.ts`), so a hardcoded number in THIS function fails
 * a test. A number typed straight into the component's JSX would not — this
 * app has no render tests — so the component's own rule against literals is
 * held by review, not by the suite.
 */
export type DiagramGroups = {
  facts: DiagramInputGroup
  labels: DiagramInputGroup
  rules: { label: string; count: number }
  statuses: { label: string; count: number; names: DerivedStatus[] }
}

export function deriveDiagramGroups(model: StateMachineModel): DiagramGroups {
  return {
    facts: {
      label: 'Forge facts',
      count: model.factInputs.length,
      samples: model.factInputs.slice(0, SAMPLE_SIZE).map((input) => input.fact)
    },
    labels: {
      label: 'Labels',
      count: model.labels.length,
      samples: model.labels.slice(0, SAMPLE_SIZE).map((label) => label.id)
    },
    rules: { label: 'Ordered rules', count: model.rules.length },
    statuses: {
      label: 'Derived statuses',
      count: model.statuses.length,
      names: model.statuses.map((row) => row.status)
    }
  }
}
