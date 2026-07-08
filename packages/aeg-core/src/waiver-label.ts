/**
 * D-097 waiver-label actor verification. A doc-coverage waiver is honored
 * ONLY when the `waiver:docs` PR label is present AND the actor of that
 * label's most recent labeling timeline event is a configured principal.
 * Label presence alone is never sufficient — that is exactly the
 * agent-emittable-string hole D-097 closes (supersedes D-080's
 * `Doc-waiver:` grammar). Pure — no env reads here; I/O stays in the CLI
 * shim, same discipline as `pr-tier.ts`.
 *
 * `isWaiverLabelActorVerified` is parameterized by `label` (aeg-review-gate-v1
 * task 1, #474) so a second waiver label (`waiver:review`) can reuse the exact
 * same actor-verification predicate rather than a copy-pasted duplicate that
 * could drift out of sync.
 */

export const WAIVER_LABEL = 'waiver:docs'
export const WAIVER_LABEL_REVIEW = 'waiver:review'
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
