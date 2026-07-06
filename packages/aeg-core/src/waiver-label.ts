/**
 * D-097 waiver-label actor verification. A doc-coverage waiver is honored
 * ONLY when the `waiver:docs` PR label is present AND the actor of that
 * label's most recent labeling timeline event is a configured principal.
 * Label presence alone is never sufficient — that is exactly the
 * agent-emittable-string hole D-097 closes (supersedes D-080's
 * `Doc-waiver:` grammar). Pure — no env reads here; I/O stays in the CLI
 * shim, same discipline as `pr-tier.ts`.
 */

export const WAIVER_LABEL = 'waiver:docs'
export const PRINCIPAL_ALLOWLIST = ['daniboomerang']

export function isWaiverLabelActorVerified(opts: {
  labels: string[]
  labelActor: string | null
  principalAllowlist: string[]
}): boolean {
  if (!opts.labels.includes(WAIVER_LABEL)) return false
  if (opts.labelActor === null) return false
  return opts.principalAllowlist.includes(opts.labelActor)
}
