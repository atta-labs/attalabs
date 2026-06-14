/**
 * Unit tests for the audit-key helper (task 3b).
 *
 * Covers the auto-fallback contract:
 *   - Saved selection with a present key → returns the selection.
 *   - Saved selection whose vendor key is missing → falls back to Anthropic
 *     default IF an Anthropic key is present; otherwise returns null.
 *   - No saved selection but Anthropic key present → returns the default.
 *   - No saved selection and no Anthropic key → returns null.
 *
 * We exercise `resolveAuditSelection` directly with an injected keys map so
 * the test doesn't need a DB or encryption infrastructure.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

// Stub the server-only modules audit-key transitively imports. We're testing
// the resolution logic in isolation; the DB/crypto pieces are exercised by
// the live audit smoke test, not here.
mock.module('server-only', () => ({}))
mock.module('@atta/crypto', () => ({
  decryptVendorKeys: () => ({})
}))
mock.module('@atta/db/queries', () => ({
  getProviderKeys: async () => null
}))
mock.module('@/db', () => ({
  db: {}
}))

// Mock the queries module so getUserByClerkId returns whatever the test sets.
let mockProfile: { auditModelVendor: string | null; auditModelId: string | null } | null = null

mock.module('@/db/queries', () => ({
  getUserByClerkId: async () => mockProfile
}))

const { resolveAuditSelection, DEFAULT_AUDIT_MODEL, DEFAULT_AUDIT_VENDOR } = await import('../src/lib/audit-key')

beforeEach(() => {
  mockProfile = null
})

afterEach(() => {
  mockProfile = null
})

describe('resolveAuditSelection', () => {
  test('returns the saved selection when its vendor key is present', async () => {
    mockProfile = { auditModelVendor: 'openai', auditModelId: 'gpt-5' }
    const keys = { openai: 'sk-openai-xxx', anthropic: 'sk-ant-yyy' }
    const result = await resolveAuditSelection('user_abc', keys)
    expect(result).toEqual({ vendor: 'openai', modelId: 'gpt-5' })
  })

  test('falls back to the YAML default when the saved vendor key is missing (revoked)', async () => {
    // Saved: openai/gpt-5. Keys: only anthropic (openai key was revoked).
    mockProfile = { auditModelVendor: 'openai', auditModelId: 'gpt-5' }
    const keys = { anthropic: 'sk-ant-yyy' }
    const result = await resolveAuditSelection('user_abc', keys)
    expect(result).toEqual({ vendor: DEFAULT_AUDIT_VENDOR, modelId: DEFAULT_AUDIT_MODEL })
  })

  test('returns the default when there is no saved selection and an Anthropic key', async () => {
    mockProfile = { auditModelVendor: null, auditModelId: null }
    const keys = { anthropic: 'sk-ant-yyy' }
    const result = await resolveAuditSelection('user_abc', keys)
    expect(result).toEqual({ vendor: DEFAULT_AUDIT_VENDOR, modelId: DEFAULT_AUDIT_MODEL })
  })

  test('returns null when there is no saved selection and no Anthropic key', async () => {
    mockProfile = { auditModelVendor: null, auditModelId: null }
    const keys = { openai: 'sk-openai-xxx' }
    const result = await resolveAuditSelection('user_abc', keys)
    expect(result).toBeNull()
  })

  test('returns null when the saved selection vendor is missing AND no Anthropic key', async () => {
    mockProfile = { auditModelVendor: 'openai', auditModelId: 'gpt-5' }
    const keys = { groq: 'gsk_xxx' }
    const result = await resolveAuditSelection('user_abc', keys)
    expect(result).toBeNull()
  })

  test('ignores a saved selection whose vendor id is not in the registry', async () => {
    mockProfile = { auditModelVendor: 'unknownvendor', auditModelId: 'whatever' }
    const keys = { anthropic: 'sk-ant-yyy' }
    const result = await resolveAuditSelection('user_abc', keys)
    expect(result).toEqual({ vendor: DEFAULT_AUDIT_VENDOR, modelId: DEFAULT_AUDIT_MODEL })
  })
})
