/**
 * Waiver-label actor verification. A doc-coverage waiver is honored
 * ONLY when the `vinaya/waiver:docs` PR label is present AND the actor of that
 * label's most recent labeling timeline event is a configured principal.
 * Label presence alone is never sufficient — that is exactly the
 * agent-emittable-string hole closes (supersedes's
 * `Doc-waiver:` grammar). Pure — no env reads here; I/O stays in the CLI
 * shim, same discipline as `pr-tier.ts`.
 *
 * `isWaiverLabelActorVerified` is parameterized by `label` (aeg-review-gate-v1
 * task 1, #474) so a second waiver label (`vinaya/waiver:review`) can reuse the exact
 * same actor-verification predicate rather than a copy-pasted duplicate that
 * could drift out of sync.
 *
 * The label strings themselves are read from the code-owned vocabulary in
 * `@atta/aeg-forge-state`'s `labels.ts`, never written as literals here — a
 * namespace change lands in one file (discipline).
 */

import { label as labelFor } from '@atta/aeg-forge-state'

export const WAIVER_LABEL = labelFor('waiver-docs')
export const WAIVER_LABEL_REVIEW = labelFor('waiver-review')
export const PRINCIPAL_ALLOWLIST = ['daniboomerang']

export function isWaiverLabelActorVerified(opts: {
  label: string
  labels: string[]
  labelActor: string | null
  principalAllowlist: string[]
}): boolean {
  if (!opts.labels.includes(opts.label)) return false
  if (opts.labelActor === null) return false
  return opts.principalAllowlist.includes(opts.labelActor)
}
