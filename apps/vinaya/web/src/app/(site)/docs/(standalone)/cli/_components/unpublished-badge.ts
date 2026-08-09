import type { Command } from '@atta/vinaya-sources'
import type { PublishedVersion } from '@/lib/published-version'

/**
 * `status` is the only per-command signal `COMMANDS` carries — a 'planned'
 * row is unbuilt in source, which trivially means it cannot be in the
 * published npm package either. There is no finer-grained "built but not yet
 * published" signal without a version-map field, which is out of scope
 * (see PR body).
 *
 * Returns `null` when the row needs no badge (published rows).
 */
export function unpublishedBadgeLabel(
  command: Pick<Command, 'status'>,
  publishedVersion: PublishedVersion
): string | null {
  if (command.status !== 'planned') return null
  return 'version' in publishedVersion ? `Not in v${publishedVersion.version} — coming soon` : 'Not yet published'
}
