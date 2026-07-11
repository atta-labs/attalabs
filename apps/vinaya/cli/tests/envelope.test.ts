import { describe, expect, it } from 'bun:test'
import { ENVELOPE_SCHEMA_VERSION, toEnvelope } from '../src/lib/envelope.js'

describe('envelope', () => {
  it('every enveloped payload carries the schema field', () => {
    const envelope = toEnvelope({ foo: 'bar' })
    expect(envelope.schema).toBe(ENVELOPE_SCHEMA_VERSION)
    expect(envelope.data).toEqual({ foo: 'bar' })
  })

  it('the schema field is present regardless of payload shape', () => {
    for (const payload of [null, undefined, [], {}, 'string', 42, true]) {
      const envelope = toEnvelope(payload)
      expect(envelope.schema).toBe(ENVELOPE_SCHEMA_VERSION)
      expect('schema' in envelope).toBe(true)
    }
  })

  it('JSON.stringify of an envelope always serializes the schema key', () => {
    const serialized = JSON.stringify(toEnvelope({ ok: true }))
    const parsed = JSON.parse(serialized)
    expect(parsed.schema).toBe(ENVELOPE_SCHEMA_VERSION)
  })
})
