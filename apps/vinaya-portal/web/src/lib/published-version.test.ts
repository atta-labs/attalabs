import { afterEach, describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler
// rewrites it, a test runner does not. Stubbing it is what lets the module
// (which must keep that import) be exercised here.
vi.mock('server-only', () => ({}))

const { fetchPublishedVersion } = await import('./published-version')

describe('fetchPublishedVersion', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('parses dist-tags.latest from a successful registry response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ 'dist-tags': { latest: '0.1.3' } }), {
        status: 200
      })
    )

    const result = await fetchPublishedVersion()

    expect(result).toEqual({ version: '0.1.3' })
  })

  it('falls back when the fetch rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network unreachable'))

    const result = await fetchPublishedVersion()

    expect(result).toEqual({ fallback: true })
  })

  it('falls back on a non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('not found', { status: 404 }))

    const result = await fetchPublishedVersion()

    expect(result).toEqual({ fallback: true })
  })

  it('falls back when dist-tags.latest is missing', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ 'dist-tags': {} }), { status: 200 }))

    const result = await fetchPublishedVersion()

    expect(result).toEqual({ fallback: true })
  })

  it('falls back on malformed JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('not json', { status: 200 }))

    const result = await fetchPublishedVersion()

    expect(result).toEqual({ fallback: true })
  })
})
