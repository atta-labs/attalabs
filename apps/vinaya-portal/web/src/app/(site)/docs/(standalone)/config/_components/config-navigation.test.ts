import { CONFIG_REFERENCE } from '@attalabs/vinaya-sources'
import { describe, expect, it } from 'vitest'
import {
  configFieldSlug,
  configSections,
  owningSectionSlug,
  PLAN_JSON_SECTION,
  topLevelConfigFields
} from './config-navigation'

describe('config navigation', () => {
  it('uses stable hashes for both top-level and nested config fields', () => {
    expect(configFieldSlug('checks')).toBe('config-checks')
    expect(configFieldSlug('checks.env.literal')).toBe('config-checks-env-literal')
  })

  it('lists only top-level config sections in the sidebar', () => {
    const fields = topLevelConfigFields(CONFIG_REFERENCE)

    expect(fields).not.toHaveLength(0)
    expect(fields.every((field) => !field.key.includes('.'))).toBe(true)
    expect(fields).toEqual(CONFIG_REFERENCE.filter((field) => !field.key.includes('.')))
  })

  it('closes the rail with the plan-envelope section the page also renders', () => {
    const sections = configSections(CONFIG_REFERENCE)

    expect(sections.at(-1)).toEqual(PLAN_JSON_SECTION)
    expect(sections.slice(0, -1).map((section) => section.label)).toEqual(
      topLevelConfigFields(CONFIG_REFERENCE).map((field) => field.key)
    )
  })

  it('resolves a nested field hash to the top-level section that owns it', () => {
    expect(owningSectionSlug('config-checks-env-literal', CONFIG_REFERENCE)).toBe('config-checks')
    expect(owningSectionSlug('config-checks', CONFIG_REFERENCE)).toBe('config-checks')
    expect(owningSectionSlug(PLAN_JSON_SECTION.slug, CONFIG_REFERENCE)).toBe(PLAN_JSON_SECTION.slug)
  })

  it('owns no section for a hash this page does not render', () => {
    expect(owningSectionSlug('config-not-a-key', CONFIG_REFERENCE)).toBeNull()
  })
})
