import type { RoadmapMilestone } from '@atta/cms'
import type { PublishedVersion } from '@/lib/published-version'

// `x.y.z`-only — every version this compares (a milestone's own `version`
// field, npm's `dist-tags.latest`) is a plain release number, never a
// pre-release/build tag, so a numeric per-segment compare is enough and
// doesn't need a semver dependency.
export function isVersionAtLeast(candidate: string, threshold: string): boolean {
  const c = candidate.split('.').map(Number)
  const t = threshold.split('.').map(Number)
  for (let i = 0; i < Math.max(c.length, t.length); i++) {
    const diff = (c[i] ?? 0) - (t[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return true
}

// `shipping`/`planned` are derived live from the published `@attalabs/vinaya`
// npm version (`getPublishedVersion()` — the same registry lookup `/docs/cli`
// and `/start/quick` already stamp with), not hand-picked in Sanity: once a
// milestone's own `version` is at or below whatever's actually published,
// it's shipping, automatically, the moment that publish goes out — no CMS
// edit, no re-seed. `dropped` is the one state that can't be derived this
// way (it's an editorial call, not a fact about a release), so it always
// wins outright. The CMS-stored `status` is used only as the fallback when
// the registry is unreachable (`getPublishedVersion` never throws; it
// degrades to `{ fallback: true }`).
export function deriveStatus(
  milestone: Pick<RoadmapMilestone, 'status' | 'version'>,
  publishedVersion: PublishedVersion
): RoadmapMilestone['status'] {
  if (milestone.status === 'dropped') return 'dropped'
  if (!('version' in publishedVersion)) return milestone.status
  return isVersionAtLeast(publishedVersion.version, milestone.version) ? 'shipping' : 'planned'
}
