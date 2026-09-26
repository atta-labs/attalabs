// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { resolveArtwork } = await import('./resolve-artwork')

const SVG_URL = 'https://cdn.sanity.io/images/o56nzgrr/production/abc-400x300.svg'
const MARK =
  '<svg class="mm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300"></rect></svg>'

function stubFetch(body: string, headers: Record<string, string>, status = 200) {
  const fetchMock = vi.fn(async () => new Response(body, { status, headers }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('resolveArtwork — which URLs are ever fetched', () => {
  it.each([
    ['http, not https', 'http://cdn.sanity.io/images/p/d/a.svg'],
    ['a look-alike host', 'https://cdn.sanity.io.evil.example/images/p/d/a.svg'],
    ['userinfo pointing elsewhere', 'https://cdn.sanity.io@evil.example/images/p/d/a.svg'],
    ['a non-default port', 'https://cdn.sanity.io:8080/images/p/d/a.svg'],
    ['a path outside /images/', 'https://cdn.sanity.io/other/a.svg'],
    ['an internal address', 'http://169.254.169.254/latest/meta-data']
  ])('refuses %s without fetching', async (_label, url) => {
    const fetchMock = stubFetch(MARK, { 'content-type': 'image/svg+xml' })
    expect(await resolveArtwork({ url })).toEqual({ kind: 'none' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends a raster straight to next/image without downloading it', async () => {
    const fetchMock = stubFetch('', { 'content-type': 'image/png' })
    const url = 'https://cdn.sanity.io/images/p/d/abc-400x300.png'
    expect(await resolveArtwork({ url })).toEqual({ kind: 'image', url })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns none for a missing image or url', async () => {
    expect(await resolveArtwork(null)).toEqual({ kind: 'none' })
    expect(await resolveArtwork({ url: null })).toEqual({ kind: 'none' })
  })
})

describe('resolveArtwork — the fetched response', () => {
  it('inlines a sanitized SVG, refusing redirects and bounding the wait', async () => {
    const fetchMock = stubFetch(MARK, { 'content-type': 'image/svg+xml' })
    const artwork = await resolveArtwork({ url: SVG_URL })
    expect(artwork.kind).toBe('svg')
    expect(artwork.kind === 'svg' && artwork.markup).toContain('class="mm"')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('falls back to next/image when the content-type is not SVG, whatever the suffix', async () => {
    stubFetch('<html></html>', { 'content-type': 'text/html' })
    expect(await resolveArtwork({ url: SVG_URL })).toEqual({ kind: 'image', url: SVG_URL })
  })

  it('falls back to the placeholder on an error status, an oversized body, or a thrown fetch', async () => {
    stubFetch(MARK, { 'content-type': 'image/svg+xml' }, 404)
    expect(await resolveArtwork({ url: SVG_URL })).toEqual({ kind: 'none' })

    stubFetch(`<svg>${'x'.repeat(300 * 1024)}</svg>`, { 'content-type': 'image/svg+xml' })
    expect(await resolveArtwork({ url: SVG_URL })).toEqual({ kind: 'none' })

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      })
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await resolveArtwork({ url: SVG_URL })).toEqual({ kind: 'none' })
  })
})
