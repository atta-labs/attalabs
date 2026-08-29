import type { RoadmapMilestone } from '@atta/cms'
import { compareVersions } from './derive-status'

// The ladder's render order, computed here rather than taken from the CMS.
//
// `getRoadmapMilestones()` returns documents in Sanity's manual `order asc`, and
// that number is the only ordering an editor maintains by hand — so the moment a
// milestone ships and gets its real `version` written back (a version is a RECORD
// of what published, added at completion; see the schema's own description), the
// manual number is stale: the shipped rungs stop sitting at the bottom of the
// climb in the order they actually shipped. Deriving order from `version` where
// one exists makes that self-correcting — the same reason `derive-status.ts`
// derives shipped/planned from the published npm version instead of trusting the
// CMS `status` field once a version is present.
//
// The rule, in order:
//   1. Every milestone WITH a version comes before every milestone without one.
//   2. Versioned milestones sort ascending by version (0.19.0 before 0.19.3).
//   3. Unversioned milestones keep their manual `order asc` — nothing to derive
//      from, so the editor's number is still the only signal.
//   4. Ties on either side fall back to `order`, keeping the sort deterministic
//      when two documents share a version (or none).
type SortableMilestone = Pick<RoadmapMilestone, 'version' | 'order'>

// A whitespace-only `version` is treated as absent, not as a version that sorts
// to the front: the field is free text, so an editor clearing it can leave `" "`
// behind, and `compareVersions(' ', …)` would read it as `0` and pin that card
// above every real release.
function versionOf(milestone: SortableMilestone): string | null {
  const trimmed = milestone.version?.trim()
  return trimmed ? trimmed : null
}

export function sortMilestones<T extends SortableMilestone>(milestones: readonly T[]): T[] {
  return [...milestones].sort((a, b) => {
    const av = versionOf(a)
    const bv = versionOf(b)

    if (av && bv) return compareVersions(av, bv) || a.order - b.order
    if (av) return -1
    if (bv) return 1
    return a.order - b.order
  })
}
