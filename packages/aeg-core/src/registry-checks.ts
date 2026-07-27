/**
 * registry-checks.ts — G1–G5, the deterministic coherence checks that make
 * `aeg-root/enforcement.md`'s three ring tables (parsed by
 * `registry-parse.ts`) load-bearing instead of decorative.
 *
 * Pure — no `fs`, no `git`/`gh` I/O, no `fetch`. All forge/filesystem facts
 * are injected by the caller (`bin/verify-registry.ts`, the I/O shim),
 * mirroring `coherence-checks.ts`'s shape exactly (plain executables,
 * deterministic pass/fail, no config conditionals).
 *
 * Rollout policy: G1/G2 ship report-only this tranche — they can
 * only ever report `'info'`, never `'fail'`, so they never affect CI's exit
 * code. G3–G5 are blocking (`'fail'` on any violation). G1 flips to blocking
 * in a later, separately-dispatched task; this task does not do that.
 */

import type { GateRow } from './registry-parse'

export type RegistryCheckStatus = 'pass' | 'fail' | 'info'

export type RegistryFinding = {
  row?: string
  path?: string
  reason: string
}

export type RegistryCheckResult = {
  check: 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
  status: RegistryCheckStatus
  findings: RegistryFinding[]
}

/**
 * G1 — every row's non-empty `implementation` resolves on disk.
 * Report-only this tranche: a missing path is always `'info'`,
 * Never `'fail'`.
 */
export function checkG1(rows: GateRow[], existsFn: (path: string) => boolean): RegistryCheckResult {
  const findings: RegistryFinding[] = []
  for (const row of rows) {
    if (row.implementation === '') continue
    if (!existsFn(row.implementation)) {
      findings.push({
        row: row.action,
        path: row.implementation,
        reason: `${row.ring} row "${row.action}" names implementation "${row.implementation}", which does not exist on disk`
      })
    }
  }
  return { check: 'G1', status: findings.length > 0 ? 'info' : 'pass', findings }
}

/**
 * G2 — every candidate hook/CLI file is named by SOME row's `implementation`.
 * `candidateFiles` is already-globbed by the caller (`.husky/*`,
 * `.claude/hooks/*.sh`, `packages/aeg-core/bin/*.ts`, excluding `.husky/_`).
 * Report-only this tranche — same as G1, never `'fail'`.
 */
export function checkG2(rows: GateRow[], candidateFiles: string[]): RegistryCheckResult {
  const implementations = new Set(rows.map((r) => r.implementation).filter((p) => p !== ''))
  const findings: RegistryFinding[] = []
  for (const path of candidateFiles) {
    if (!implementations.has(path)) {
      findings.push({
        path,
        reason: `"${path}" is not named as the implementation of any row in enforcement.md's ring tables`
      })
    }
  }
  return { check: 'G2', status: findings.length > 0 ? 'info' : 'pass', findings }
}

/**
 * G3 — every file that makes a GitHub-crossing call is named by SOME Ring-0
 * row's `implementation` — "no seventh way into GitHub". `crossingFiles` is
 * already-detected by the caller via a source-grep. Blocking.
 */
export function checkG3(ring0Rows: GateRow[], crossingFiles: string[]): RegistryCheckResult {
  const ring0Implementations = new Set(ring0Rows.map((r) => r.implementation))
  const findings: RegistryFinding[] = []
  for (const path of crossingFiles) {
    if (!ring0Implementations.has(path)) {
      findings.push({
        path,
        reason: `"${path}" makes a GitHub-crossing call but is not named by any Ring-0 row's implementation — a seventh, unlisted way into GitHub`
      })
    }
  }
  return { check: 'G3', status: findings.length > 0 ? 'fail' : 'pass', findings }
}

/**
 * G4 — every `#NNN` cited in enforcement.md's body resolves in the forge.
 * `resolveFn` wraps `gh issue view`/`gh pr view` (caller injects). Blocking.
 * Broad reading (brief): every `#`-prefixed 3-or-more-digit number
 * occurring anywhere in the body is checked, not just ones near keywords
 * like "incident" — an incomplete keyword net would create a
 * false-negative gap. The current repo's real citations are all 3-4
 * digits; the lower bound of 3 exists only to exclude unrelated short
 * numerals (ring/tier numbers) that are never written with a `#` prefix
 * anyway — there is deliberately no upper bound, so a longer fabricated
 * number is still caught.
 */
export function checkG4(content: string, resolveFn: (n: number) => boolean): RegistryCheckResult {
  const cited = new Set<number>()
  for (const hit of content.matchAll(/#(\d{3,})\b/g)) {
    cited.add(Number(hit[1]))
  }
  const findings: RegistryFinding[] = []
  for (const n of cited) {
    if (!resolveFn(n)) {
      findings.push({
        reason: `#${n} is cited in enforcement.md but does not resolve to a real Issue or PR in the forge`
      })
    }
  }
  return { check: 'G4', status: findings.length > 0 ? 'fail' : 'pass', findings }
}

/**
 * G5 — every contract's producer/consumer is a real role_id; every role's
 * `performs`/`refuses_when` is present and non-empty. Blocking.
 *
 * "The action exists" is satisfied by presence/well-formedness of the
 * role's own frontmatter — there is no second, independent registry of
 * valid actions to cross-reference `performs` entries against.
 */
export function checkG5(
  roles: Array<{ file: string; role_id: string; performs: string[]; refuses_when: string }>,
  contracts: Array<{ file: string; producer: string; consumer: string }>
): RegistryCheckResult {
  const roleIds = new Set(roles.map((r) => r.role_id))
  const findings: RegistryFinding[] = []

  for (const contract of contracts) {
    if (!roleIds.has(contract.producer)) {
      findings.push({
        path: contract.file,
        reason: `contract "${contract.file}" names producer "${contract.producer}", which is not a real role_id`
      })
    }
    if (!roleIds.has(contract.consumer)) {
      findings.push({
        path: contract.file,
        reason: `contract "${contract.file}" names consumer "${contract.consumer}", which is not a real role_id`
      })
    }
  }

  for (const role of roles) {
    if (role.performs.length === 0) {
      findings.push({ path: role.file, reason: `role "${role.role_id}" has an empty performs array` })
    }
    if (role.refuses_when.trim() === '') {
      findings.push({ path: role.file, reason: `role "${role.role_id}" has an empty refuses_when` })
    }
  }

  return { check: 'G5', status: findings.length > 0 ? 'fail' : 'pass', findings }
}
