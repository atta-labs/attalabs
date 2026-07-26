/**
 * Derive the floor of a task's §7 doc-update list by matching its intended
 * surface globs against `.vinaya/doc-owners` bindings (state-machine.md
 * Section 15). Pure — parses doc-owners content via `parseDocOwners` (no
 * second parser) and does segment-wise glob overlap between each intended
 * surface and each binding's code glob. A Planner/Brief-Author aid only —
 * not wired into any CI gate.
 */

import { parseDocOwners } from './doc-owners'

export type Section7Match = { surface: string; glob: string; pointer: string; lineNum: number }

export function deriveSection7(
  intendedSurfaces: string[],
  docOwnersContent: string
): { pointers: string[]; matches: Section7Match[]; errors: string[] } {
  const { bindings, errors } = parseDocOwners(docOwnersContent)
  const matches: Section7Match[] = []
  for (const surface of intendedSurfaces) {
    for (const binding of bindings) {
      if (globsOverlap(binding.glob, surface)) {
        matches.push({ surface, glob: binding.glob, pointer: binding.pointer, lineNum: binding.lineNum })
      }
    }
  }

  const pointers: string[] = []
  for (const m of matches) {
    if (!pointers.includes(m.pointer)) pointers.push(m.pointer)
  }

  return { pointers, matches, errors }
}

/**
 * True if two doc-owners-grammar globs can match at least one common path,
 * compared segment-by-segment (split on `/`). `**` absorbs zero or more
 * remaining segments on either side — checked at each step, even once one
 * side has run out of segments, so a trailing `**` still absorbs. `*`
 * matches exactly one segment regardless of the other side's literal/`*`.
 * Two literal segments must be byte-equal. If one side runs out of segments
 * before the other and the next pending segment on either side isn't `**`,
 * there is no overlap.
 */
export function globsOverlap(a: string, b: string): boolean {
  const segsA = a.split('/')
  const segsB = b.split('/')
  let i = 0
  let j = 0
  while (i < segsA.length || j < segsB.length) {
    const sa = i < segsA.length ? segsA[i] : undefined
    const sb = j < segsB.length ? segsB[j] : undefined
    if (sa === '**' || sb === '**') return true
    if (sa === undefined || sb === undefined) return false
    if (sa === '*' || sb === '*') {
      i++
      j++
      continue
    }
    if (sa !== sb) return false
    i++
    j++
  }
  return true
}
