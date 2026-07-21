/**
 * labels.ts — the canonical, code-owned enumeration of every AEG label that
 * carries meaning to the mechanism. Pure data, zero I/O, zero imports beyond
 * its own types — the same discipline as `actions.ts` and `waiver-label.ts`
 * (D-119: one pure-data list, read by both the logic and the rendered docs,
 * so the two can never drift).
 *
 * It lives in `@atta/aeg-forge-state`, not `@atta/aeg-core`, because the
 * dependency direction is `aeg-core → aeg-forge-state → aeg-types`: the
 * vocabulary's first consumer is `map-forge-facts.ts` (the mapper that turns
 * a raw GitHub label list into the `blockedLabel` fact), which sits in this
 * package and cannot import backward from `aeg-core`. This is the lowest
 * package every consumer already depends on.
 *
 * Each entry records the *orthogonal fact* the label carries — the one thing
 * the mechanism learns from its presence. Labels are orthogonal by design:
 * a task's tier, its iteration, what it is waiting on, and what has been
 * waived are independent axes, and no code should infer one from another.
 *
 * **Status is not in here, and must never be.** Execution status is derived
 * from forge objects (`state-machine-model.ts`, D-059/D-069), never written
 * as a label — a `status:*` label would recreate the racing status store the
 * derivation model exists to eliminate.
 *
 * Consumers: `map-forge-facts.ts` (the `aeg:blocked` fact). The remaining
 * label-string call sites across `aeg-core` are *not* migrated here yet —
 * that is the rename task's job, and migrating them early would collide
 * with it.
 */

/**
 * Which axis a label varies on. One category per orthogonal fact — see the
 * module header on why these must stay independent.
 */
export type LabelCategory =
  /** Execution is halted pending an external unblock. */
  | 'state'
  /** Governance weight of the change — drives the doc/decision gates. */
  | 'tier'
  /** Which iteration a task Issue belongs to. */
  | 'iteration'
  /** What the task is waiting on, and from whom. */
  | 'needs'
  /** A gate deliberately excused for this one PR, by a principal. */
  | 'waiver'

/**
 * Whether `id` is the complete label string or the stable prefix of a family
 * whose suffix is open-ended. `iteration:` is a prefix family — its suffix is
 * whatever slug the Planner cut — so no fixed list can enumerate it, and code
 * must match it by prefix rather than by equality.
 */
export type LabelForm = 'literal' | 'prefix'

export type Label = {
  /** The exact label string, or the prefix for a `form: 'prefix'` family. */
  id: string
  category: LabelCategory
  form: LabelForm
  /** The single orthogonal fact this label's presence tells the mechanism. */
  carries: string
}

export const LABELS: Label[] = [
  {
    id: 'aeg:blocked',
    category: 'state',
    form: 'literal',
    carries: 'Execution is halted pending an external unblock; wins over every other derived status.'
  },
  {
    id: 'tier:0',
    category: 'tier',
    form: 'literal',
    carries: 'Lowest governance weight — typecheck, lint, tests, and a conforming PR body.'
  },
  {
    id: 'tier:1',
    category: 'tier',
    form: 'literal',
    carries: 'Tier 0 plus spec/skill coverage and a passing verify-docs run.'
  },
  {
    id: 'tier:3',
    category: 'tier',
    form: 'literal',
    carries: 'Tier 1 plus a decision-log anchor — a new decision, or Conforms-to on an existing one.'
  },
  {
    id: 'iteration:',
    category: 'iteration',
    form: 'prefix',
    carries: "The iteration slug this task Issue belongs to — the forge's grouping key, matched by prefix."
  },
  {
    id: 'needs:execution-input',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on a missing execution detail — a flag, a dependency, a value the brief did not carry.'
  },
  {
    id: 'needs:strategy-input',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on a strategy call — the brief assumes an approach the codebase has moved away from.'
  },
  {
    id: 'needs:principal-input',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on the Principal — a product-level call no agent may make.'
  },
  {
    id: 'needs:brief-correction',
    category: 'needs',
    form: 'literal',
    carries: 'Waiting on the Brief Author — the brief contradicts the surface it describes.'
  },
  {
    id: 'waiver:docs',
    category: 'waiver',
    form: 'literal',
    carries: 'Doc-coverage gate excused for this PR — honored only when a principal applied it (D-097).'
  },
  {
    id: 'waiver:review',
    category: 'waiver',
    form: 'literal',
    carries: 'Review gate excused for this PR — honored only when a principal applied it (D-097).'
  }
]

/**
 * The blocked-label string. Kept as a literal (not a `LABELS` lookup) so it
 * stays a compile-time constant with no possibly-undefined narrowing at every
 * call site; `labels.test.ts` asserts it equals its `LABELS` entry, so the two
 * cannot drift. Re-exported by `map-forge-facts.ts` (its original home) and by
 * this package's index, so every existing import path keeps resolving.
 */
export const AEG_BLOCKED_LABEL = 'aeg:blocked'
