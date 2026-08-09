import { describe, expect, it } from 'bun:test'
import { CONFIG_REFERENCE } from '@atta/vinaya-sources'
import { VinayaConfigSchema } from '../../src/lib/config'

/**
 * Key-presence coupling test: every `VinayaConfigSchema` top-level key, and
 * every `CheckEntrySchema` key (`checks`'s record value type), must have a
 * `CONFIG_REFERENCE` row naming it. This proves the registry never drifts
 * silently behind the schema — it does NOT check prose accuracy, which stays
 * a review concern.
 *
 * `CheckEntrySchema` itself is not exported (config.ts's real schema surface
 * is out of this task's scope) — its keys are recovered by pure Zod
 * introspection off the public `VinayaConfigSchema.shape.checks` field
 * (`ZodOptional<ZodRecord<ZodString, ZodEffects<ZodObject<...>>>>`), never by
 * restructuring the schema for this test.
 */

function checkEntryKeys(): string[] {
  const checksField = VinayaConfigSchema.shape.checks
  const record = checksField.unwrap()
  const valueSchema = record.valueSchema
  const object = 'innerType' in valueSchema ? valueSchema.innerType() : valueSchema
  return Object.keys(object.shape)
}

describe('config-reference coverage', () => {
  it('every VinayaConfigSchema top-level key has a CONFIG_REFERENCE row', () => {
    const topLevelKeys = Object.keys(VinayaConfigSchema.shape)
    expect(topLevelKeys.length).toBeGreaterThan(0)
    for (const key of topLevelKeys) {
      const found = CONFIG_REFERENCE.some((field) => field.key === key)
      expect(found, `VinayaConfigSchema key "${key}" has no CONFIG_REFERENCE row`).toBe(true)
    }
  })

  it('every CheckEntrySchema key has a `checks.<key>` CONFIG_REFERENCE row', () => {
    const entryKeys = checkEntryKeys()
    expect(entryKeys.length).toBeGreaterThan(0)
    for (const key of entryKeys) {
      const dottedKey = `checks.${key}`
      const found = CONFIG_REFERENCE.some((field) => field.key === dottedKey)
      expect(found, `CheckEntrySchema key "${key}" has no CONFIG_REFERENCE row ("${dottedKey}")`).toBe(true)
    }
  })
})
