import type { ConfigField } from '@attalabs/vinaya-sources'

/**
 * How far below the content pane's top edge a section still counts as the one
 * being read. `StickyDocHeader` and `ConfigSidebar` both resolve the active
 * section with this same rule and this same number, so the rail and the sticky
 * context line can never name different sections.
 *
 * It must stay at or above the sections' own `scroll-mt-16` anchor margin
 * (4rem = 72px at this app's 18px root), or a deep-linked heading parks just
 * below the sticky bar while both surfaces still name the section above it.
 */
export const CONFIG_ACTIVE_OFFSET = 76

/** One entry on `/docs/config`'s rail — a page section, never a nested field. */
export type ConfigNavItem = { slug: string; label: string }

/**
 * The `vinaya check --plan --json` section. Authored here rather than read out
 * of `CONFIG_REFERENCE` because it documents the resolved plan envelope, not a
 * `vinaya.config.json` key — but it is a page section like any other, so it
 * carries an anchor and a rail entry so the rail and the sticky header agree on
 * what the sections of this page are.
 */
export const PLAN_JSON_SECTION: ConfigNavItem = { slug: 'config-plan-json', label: 'check --plan --json' }

/** The stable hash used by both a config section and its on-page navigation. */
export function configFieldSlug(key: string): string {
  return `config-${key.replace(/\./g, '-')}`
}

/** Config navigation intentionally lists sections only, never nested fields. */
export function topLevelConfigFields(fields: readonly ConfigField[]): readonly ConfigField[] {
  return fields.filter((field) => !field.key.includes('.'))
}

/** Every rail section, in the order the page renders them. */
export function configSections(fields: readonly ConfigField[]): readonly ConfigNavItem[] {
  const keys = topLevelConfigFields(fields).map((field) => ({ slug: configFieldSlug(field.key), label: field.key }))
  return [...keys, PLAN_JSON_SECTION]
}

/**
 * Which rail section owns a given anchor. A deep link may name a nested field
 * (`/docs/config#config-checks-env-literal`); the rail lists sections only, so
 * a nested hash resolves to its top-level parent instead of highlighting
 * nothing. Returns `null` for a hash this page does not own.
 */
export function owningSectionSlug(slug: string, fields: readonly ConfigField[]): string | null {
  if (slug === PLAN_JSON_SECTION.slug) return PLAN_JSON_SECTION.slug
  const field = fields.find((candidate) => configFieldSlug(candidate.key) === slug)
  if (!field) return null
  const [topLevelKey] = field.key.split('.')
  return topLevelKey ? configFieldSlug(topLevelKey) : null
}
