import { describe, expect, it, vi } from 'vitest'
import type { ApiKeyRow } from '../api-key-auth'
import { verifyApiKeyBearer } from '../api-key-auth'
import { createHash } from 'node:crypto'

function makeRow(overrides: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return {
    id: 'key-uuid-123',
    clerkId: 'user_clerk123',
    product: 'vada',
    revokedAt: null,
    ...overrides
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const VALID_TOKEN = 'vada_pk_someRandomBase64urlValue'

describe('verifyApiKeyBearer', () => {
  it('returns ok: true with clerkId and apiKeyId on valid key', async () => {
    const row = makeRow()
    const lookup = vi.fn().mockResolvedValue(row)
    const touch = vi.fn().mockResolvedValue(undefined)

    const result = await verifyApiKeyBearer(`Bearer ${VALID_TOKEN}`, 'vada', lookup, touch)

    expect(result).toEqual({ ok: true, clerkId: 'user_clerk123', apiKeyId: 'key-uuid-123' })
    expect(lookup).toHaveBeenCalledWith(hashToken(VALID_TOKEN))
  })

  it('calls touch with the key id on success', async () => {
    const row = makeRow()
    const lookup = vi.fn().mockResolvedValue(row)
    const touch = vi.fn().mockResolvedValue(undefined)

    await verifyApiKeyBearer(`Bearer ${VALID_TOKEN}`, 'vada', lookup, touch)

    // touch is fire-and-forget so allow the microtask to flush
    await Promise.resolve()
    expect(touch).toHaveBeenCalledWith('key-uuid-123')
  })

  it('returns 401 when Authorization header is missing', async () => {
    const lookup = vi.fn()
    const touch = vi.fn()

    const result = await verifyApiKeyBearer(null, 'vada', lookup, touch)

    expect(result).toMatchObject({ ok: false, status: 401 })
    expect(lookup).not.toHaveBeenCalled()
  })

  it('returns 401 when Authorization header lacks Bearer prefix', async () => {
    const result = await verifyApiKeyBearer('Basic abc123', 'vada', vi.fn(), vi.fn())
    expect(result).toMatchObject({ ok: false, status: 401 })
  })

  it('returns 401 when token is not found in DB', async () => {
    const lookup = vi.fn().mockResolvedValue(null)
    const touch = vi.fn()

    const result = await verifyApiKeyBearer(`Bearer ${VALID_TOKEN}`, 'vada', lookup, touch)

    expect(result).toMatchObject({ ok: false, status: 401 })
    expect(touch).not.toHaveBeenCalled()
  })

  it('returns 401 when key is revoked', async () => {
    const row = makeRow({ revokedAt: new Date('2025-01-01') })
    const lookup = vi.fn().mockResolvedValue(row)
    const touch = vi.fn()

    const result = await verifyApiKeyBearer(`Bearer ${VALID_TOKEN}`, 'vada', lookup, touch)

    expect(result).toMatchObject({ ok: false, status: 401 })
    expect(touch).not.toHaveBeenCalled()
  })

  it('returns 401 when product does not match', async () => {
    const row = makeRow({ product: 'herald' })
    const lookup = vi.fn().mockResolvedValue(row)
    const touch = vi.fn()

    const result = await verifyApiKeyBearer(`Bearer ${VALID_TOKEN}`, 'vada', lookup, touch)

    expect(result).toMatchObject({ ok: false, status: 401 })
    expect(touch).not.toHaveBeenCalled()
  })

  it('passes the SHA-256 hash of the token to lookup, not the plaintext', async () => {
    const lookup = vi.fn().mockResolvedValue(null)

    await verifyApiKeyBearer(`Bearer ${VALID_TOKEN}`, 'vada', lookup, vi.fn())

    const [calledHash] = lookup.mock.calls[0]!
    expect(calledHash).toBe(hashToken(VALID_TOKEN))
    expect(calledHash).not.toBe(VALID_TOKEN)
    expect(calledHash).toMatch(/^[0-9a-f]{64}$/)
  })
})
