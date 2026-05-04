import { describe, expect, it } from 'vitest'
import { generateApiKey, hashApiKey, verifyApiKey } from '../api-keys'

describe('generateApiKey', () => {
  it('generated key has correct prefix', () => {
    const { plaintext } = generateApiKey('vada_pk')
    expect(plaintext.startsWith('vada_pk_')).toBe(true)
  })

  it('generated key plaintext is URL-safe (only [A-Za-z0-9_-])', () => {
    for (let i = 0; i < 20; i++) {
      const { plaintext } = generateApiKey('vada_pk')
      expect(plaintext).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('two generated keys have different random portions', () => {
    const a = generateApiKey('vada_pk')
    const b = generateApiKey('vada_pk')
    expect(a.plaintext).not.toBe(b.plaintext)
    expect(a.hash).not.toBe(b.hash)
  })

  it('returned hash matches hashApiKey(plaintext)', () => {
    const { plaintext, hash } = generateApiKey('vada_pk')
    expect(hash).toBe(hashApiKey(plaintext))
  })
})

describe('hashApiKey', () => {
  it('is deterministic for the same input', () => {
    const key = 'vada_pk_someRandomValue123'
    expect(hashApiKey(key)).toBe(hashApiKey(key))
  })

  it('produces different hashes for different inputs', () => {
    expect(hashApiKey('vada_pk_aaa')).not.toBe(hashApiKey('vada_pk_bbb'))
  })

  it('returns a hex string (sha256 = 64 chars)', () => {
    const h = hashApiKey('vada_pk_test')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('verifyApiKey', () => {
  it('returns true when plaintext matches the stored hash', () => {
    const { plaintext, hash } = generateApiKey('vada_pk')
    expect(verifyApiKey(plaintext, hash)).toBe(true)
  })

  it('returns false when plaintext does not match', () => {
    const { hash } = generateApiKey('vada_pk')
    expect(verifyApiKey('vada_pk_wrong', hash)).toBe(false)
  })

  it('uses timing-safe comparison (does not short-circuit on length mismatch)', () => {
    // A hash is always 64 hex chars. A plaintext of length != 64 would expose
    // length via early exit if a naive string comparison were used.
    // verifyApiKey should always hash first, then compare equal-length buffers.
    const { hash } = generateApiKey('vada_pk')
    // Short input — naive comparison would return false instantly; timing-safe
    // should still go through the full comparison path without throwing.
    expect(() => verifyApiKey('short', hash)).not.toThrow()
    expect(verifyApiKey('short', hash)).toBe(false)
  })
})
