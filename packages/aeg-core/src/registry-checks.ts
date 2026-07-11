/**
 * registry-checks.ts — G1–G5, the deterministic coherence checks that make
 * `aeg-root/enforcement.md`'s three ring tables (parsed by
 * `registry-parse.ts`) load-bearing instead of decorative.
 *
 * Pure — no `fs`, no `git`/`gh` I/O, no `fetch`. All forge/filesystem facts
 * are injected by the caller (`bin/verify-registry.ts`, the I/O shim),
 * mirroring `coherence-checks.ts`'s shape exactly (D-092: plain executables,
 * deterministic pass/fail, no config conditionals).
 *
 * Rollout policy (D-116): G1/G2 ship report-only this iteration — they can
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
 * Report-only this iteration (D-116): a missing path is always `'info'`,
 * never `'fail'`.
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
 * Report-only this iteration (D-116) — same as G1, never `'fail'`.
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
  const ring0Implementations = new Set(ring0Rows.filter((r) => r.ring === 'ring0').map((r) => r.implementation))
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
