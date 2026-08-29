import type { RoadmapMilestone } from '@atta/cms'
import type { PublishedVersion } from '@/lib/published-version'

// `x.y.z`-only — every version this compares (a milestone's own `version`
// field, npm's `dist-tags.latest`) is a plain release number, never a
// pre-release/build tag, so a numeric per-segment compare is enough and
// doesn't need a semver dependency. `Number.parseInt`, not `Number` — the
// milestone side is a free-text CMS field, so a stray suffix (an editor
// typing "0.20.0-rc1") must still parse its LEADING digits instead of
// producing `NaN`: `Number("0-rc1")` is `NaN`, and `NaN !== 0` is always
// true while `NaN > 0` is always false, so a single bad segment silently
// pinned that comparison (and everything after it) to "not shipped" forever,
// with no error anywhere.
function toNumericSegment(seg: string, raw: string): number {
  const n = Number.parseInt(seg, 10)
  if (Number.isNaN(n)) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[roadmap] isVersionAtLeast: non-numeric version segment "${seg}" in "${raw}" — treating as 0`)
    }
    return 0
  }
  return n
}

// Segment-wise numeric compare returning the `Array#sort` contract (negative /
// zero / positive) rather than a boolean: `sort-milestones.ts` orders the whole
// ladder with it, and `isVersionAtLeast` below is now a thin reading of the same
// result. One comparator, so the page's ORDER and each card's shipped/planned
// STATE can never disagree about which of two versions is higher.
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map((seg) => toNumericSegment(seg, a))
  const right = b.split('.').map((seg) => toNumericSegment(seg, b))
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function isVersionAtLeast(candidate: string, threshold: string): boolean {
  return compareVersions(candidate, threshold) >= 0
}

// `shipping`/`planned` are derived live from the published `@attalabs/vinaya`
// npm version (`getPublishedVersion()` — the same registry lookup `/docs/cli`
// and `/start/quick` already stamp with), not hand-picked in Sanity: once a
// milestone's own `version` is at or below whatever's actually published,
// it's shipping, automatically, the moment that publish goes out — no CMS
// edit, no re-seed. `dropped` is the one state that can't be derived this
// way (it's an editorial call, not a fact about a release), so it always
// wins outright. The CMS-stored `status` is used as the fallback when the
// registry is unreachable (`getPublishedVersion` never throws; it degrades
// to `{ fallback: true }`) AND while `version` is still empty — an
// unshipped milestone carries no version to compare against (a target
// version is never stored; see the schema's own description), so there is
// nothing to derive from until an editor adds the real one at completion.
export function deriveStatus(
  milestone: Pick<RoadmapMilestone, 'status' | 'version'>,
  publishedVersion: PublishedVersion
): RoadmapMilestone['status'] {
  if (milestone.status === 'dropped') return 'dropped'
  if (!milestone.version) return milestone.status
  if (!('version' in publishedVersion)) return milestone.status
  return isVersionAtLeast(publishedVersion.version, milestone.version) ? 'shipping' : 'planned'
}
