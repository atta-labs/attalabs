// Pure-function tests for the audit-input resolution layer (Task 5).
// Covers: JD URL SSRF validation (syntactic, DNS-resolution, redirect-bypass,
// DNS-rebinding via injected deps), HTML text extraction, JD/CV text
// validation, CV markdown/pdf pass-through. Profile-lookup path is integration-
// tested elsewhere (it touches the live DB).

import { describe, expect, it } from 'bun:test'

import { resolveCvInput, resolveJdInput } from '@/lib/audit-input/resolve'
import {
  assertSafeResolvedAddresses,
  decodeBody,
  detectCharsetInHtmlPrefix,
  extractMainText,
  fetchAndExtractText,
  isPrivateIPv6,
  parseCharsetFromContentType,
  pinnedLookup,
  type ResolvedAddress,
  type SafeFetchDeps,
  validateJdUrl
} from '@/lib/audit-input/url-fetch'

describe('validateJdUrl', () => {
  it('accepts public http(s) URLs', () => {
    expect(validateJdUrl('https://example.com/jobs/1').hostname).toBe('example.com')
    expect(validateJdUrl('http://jobs.acme.com/post').hostname).toBe('jobs.acme.com')
  })

  it('rejects non-http schemes', () => {
    expect(() => validateJdUrl('file:///etc/passwd')).toThrow()
    expect(() => validateJdUrl('ftp://example.com/x')).toThrow()
    expect(() => validateJdUrl('javascript:alert(1)')).toThrow()
  })

  it('rejects loopback and private IPv4', () => {
    expect(() => validateJdUrl('http://127.0.0.1/x')).toThrow()
    expect(() => validateJdUrl('http://10.0.0.1/x')).toThrow()
    expect(() => validateJdUrl('http://192.168.1.5/x')).toThrow()
    expect(() => validateJdUrl('http://172.16.0.1/x')).toThrow()
    expect(() => validateJdUrl('http://172.31.255.1/x')).toThrow()
  })

  it('rejects cloud metadata and link-local', () => {
    expect(() => validateJdUrl('http://169.254.169.254/latest/meta-data')).toThrow()
  })

  it('rejects IPv6 loopback and unique-local', () => {
    expect(() => validateJdUrl('http://[::1]/x')).toThrow()
    expect(() => validateJdUrl('http://[fc00::1]/x')).toThrow()
    expect(() => validateJdUrl('http://[fd12::1]/x')).toThrow()
    expect(() => validateJdUrl('http://[fe80::1]/x')).toThrow()
  })

  it('rejects internal hostnames', () => {
    expect(() => validateJdUrl('http://localhost/x')).toThrow()
    expect(() => validateJdUrl('http://foo.localhost/x')).toThrow()
    expect(() => validateJdUrl('http://server.local/x')).toThrow()
    expect(() => validateJdUrl('http://api.internal/x')).toThrow()
  })

  it('rejects malformed input', () => {
    expect(() => validateJdUrl('not a url')).toThrow()
    expect(() => validateJdUrl('')).toThrow()
  })
})

describe('extractMainText', () => {
  it('strips script and style blocks', () => {
    const html =
      '<html><head><style>body{}</style><script>alert(1)</script></head><body><p>Hello world</p></body></html>'
    const text = extractMainText(html)
    expect(text).toContain('Hello world')
    expect(text).not.toContain('alert')
    expect(text).not.toContain('body{')
  })

  it('preserves paragraph breaks', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>'
    const text = extractMainText(html)
    expect(text).toContain('First paragraph')
    expect(text).toContain('Second paragraph')
    expect(text.split('\n').length).toBeGreaterThanOrEqual(2)
  })

  it('decodes common HTML entities', () => {
    const html = '<p>Cost &amp; benefit &lt;= 100% &nbsp;&quot;ok&quot;</p>'
    const text = extractMainText(html)
    expect(text).toContain('Cost & benefit')
    expect(text).toContain('<=')
    expect(text).toContain('"ok"')
  })
})

describe('parseCharsetFromContentType', () => {
  it('extracts charset from a Content-Type header', () => {
    expect(parseCharsetFromContentType('text/html; charset=utf-8')).toBe('utf-8')
    expect(parseCharsetFromContentType('text/html;charset=ISO-8859-1')).toBe('iso-8859-1')
    expect(parseCharsetFromContentType('text/html; charset="windows-1252"')).toBe('windows-1252')
  })
  it('returns null when no charset is declared', () => {
    expect(parseCharsetFromContentType('text/html')).toBeNull()
    expect(parseCharsetFromContentType('')).toBeNull()
  })
})

describe('detectCharsetInHtmlPrefix', () => {
  const enc = new TextEncoder()
  it('detects <meta charset="..."> in the head', () => {
    const html = '<!doctype html><html><head><meta charset="windows-1252"><title>X</title></head><body></body></html>'
    expect(detectCharsetInHtmlPrefix(enc.encode(html))).toBe('windows-1252')
  })
  it('detects <meta http-equiv="Content-Type" ...>', () => {
    const html =
      '<!doctype html><html><head><meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1"><title>X</title></head><body></body></html>'
    expect(detectCharsetInHtmlPrefix(enc.encode(html))).toBe('iso-8859-1')
  })
  it('returns null when no meta charset is present in the first 1024 bytes', () => {
    const html = '<!doctype html><html><head><title>X</title></head><body><p>Hi</p></body></html>'
    expect(detectCharsetInHtmlPrefix(enc.encode(html))).toBeNull()
  })
})

describe('decodeBody — charset-aware decoding', () => {
  // The bug we're regression-testing: when a remote JD page is served as
  // windows-1252 (or any non-UTF-8 charset), decoding it as UTF-8 produces
  // mojibake — e.g. the Binance careers page came through as "worldâs",
  // "Binanceâs", "â¢" before this fix. After the fix, the decoder honors
  // the header (or the meta tag) so the LLM sees clean prose.

  // The bytes 0x91, 0x92 (curly quotes) and 0x95 (bullet) are valid in
  // windows-1252 but are UTF-8-invalid lead bytes — easy mojibake repro.
  const win1252 = new Uint8Array([
    0x42,
    0x69,
    0x6e,
    0x61,
    0x6e,
    0x63,
    0x65,
    0x92,
    0x73,
    0x20, // Binance’s
    0x77,
    0x6f,
    0x72,
    0x6c,
    0x64,
    0x91,
    0x73,
    0x0a, // world‘s
    0x95,
    0x20,
    0x62,
    0x75,
    0x6c,
    0x6c,
    0x65,
    0x74 // • bullet
  ])

  it('decodes windows-1252 bytes correctly when the header declares charset=windows-1252', () => {
    const out = decodeBody(win1252, 'text/html; charset=windows-1252')
    expect(out).toContain('Binance’s')
    expect(out).toContain('world‘s')
    expect(out).toContain('• bullet')
    expect(out).not.toContain('â')
  })

  it('falls back to the HTML meta charset when the header omits it', () => {
    const enc = new TextEncoder()
    const head = enc.encode('<html><head><meta charset="windows-1252"></head><body>')
    const tail = enc.encode('</body></html>')
    const buf = new Uint8Array(head.byteLength + win1252.byteLength + tail.byteLength)
    buf.set(head, 0)
    buf.set(win1252, head.byteLength)
    buf.set(tail, head.byteLength + win1252.byteLength)
    const out = decodeBody(buf, 'text/html')
    expect(out).toContain('Binance’s')
    expect(out).not.toContain('â')
  })

  it('defaults to UTF-8 when neither header nor meta declares a charset', () => {
    const utf8Bytes = new TextEncoder().encode('Senior Engineer — remote ✓')
    const out = decodeBody(utf8Bytes, 'text/html')
    expect(out).toBe('Senior Engineer — remote ✓')
  })

  it('survives an unknown charset label by falling back to UTF-8', () => {
    const utf8Bytes = new TextEncoder().encode('hello world')
    const out = decodeBody(utf8Bytes, 'text/html; charset=not-a-real-encoding-XYZ')
    expect(out).toBe('hello world')
  })
})

describe('resolveJdInput — text kind', () => {
  it('accepts pasted JD text', async () => {
    const longJd = 'Senior Engineer with deep TypeScript expertise. Remote OK.'
    const resolved = await resolveJdInput({ kind: 'text', value: longJd })
    expect(resolved.kind).toBe('text')
    expect(resolved.text).toBe(longJd)
    expect(resolved.sourceLabel.length).toBeGreaterThan(0)
  })

  it('rejects JD text shorter than 20 chars', async () => {
    await expect(resolveJdInput({ kind: 'text', value: 'too short' })).rejects.toThrow()
  })
})

describe('assertSafeResolvedAddresses', () => {
  it('accepts public IPv4', () => {
    expect(() => assertSafeResolvedAddresses([{ address: '93.184.216.34', family: 4 }])).not.toThrow()
  })
  it('rejects loopback IPv4', () => {
    expect(() => assertSafeResolvedAddresses([{ address: '127.0.0.1', family: 4 }])).toThrow()
  })
  it('rejects RFC1918 IPv4', () => {
    expect(() => assertSafeResolvedAddresses([{ address: '10.0.0.1', family: 4 }])).toThrow()
    expect(() => assertSafeResolvedAddresses([{ address: '192.168.5.5', family: 4 }])).toThrow()
    expect(() => assertSafeResolvedAddresses([{ address: '172.20.1.1', family: 4 }])).toThrow()
  })
  it('rejects cloud metadata IPv4', () => {
    expect(() => assertSafeResolvedAddresses([{ address: '169.254.169.254', family: 4 }])).toThrow()
  })
  it('rejects ANY private IP in a multi-record response (round-robin)', () => {
    // A real DNS rebinding setup can return [public, private] — we must
    // reject the WHOLE record set, not just check the first entry.
    expect(() =>
      assertSafeResolvedAddresses([
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 }
      ])
    ).toThrow()
  })
  it('rejects IPv6 loopback and ULA', () => {
    expect(() => assertSafeResolvedAddresses([{ address: '::1', family: 6 }])).toThrow()
    expect(() => assertSafeResolvedAddresses([{ address: 'fc00::1', family: 6 }])).toThrow()
    expect(() => assertSafeResolvedAddresses([{ address: 'fd12::abcd', family: 6 }])).toThrow()
  })
  it('rejects IPv4-mapped-IPv6 pointing at private IPv4', () => {
    // ::ffff:127.0.0.1 is a common SSRF bypass — the syntactic URL check
    // sees an "IPv6 address" but the actual destination is 127.0.0.1.
    expect(isPrivateIPv6('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateIPv6('::ffff:10.0.0.1')).toBe(true)
    expect(isPrivateIPv6('::ffff:169.254.169.254')).toBe(true)
    expect(() => assertSafeResolvedAddresses([{ address: '::ffff:127.0.0.1', family: 6 }])).toThrow()
  })
  it('rejects an empty record set', () => {
    expect(() => assertSafeResolvedAddresses([])).toThrow()
  })
})

describe('fetchAndExtractText — SSRF defense-in-depth', () => {
  // Helpers to build mock deps the production fetch never reaches.
  function mockLookup(map: Record<string, ResolvedAddress[]>) {
    const calls: string[] = []
    const lookup: NonNullable<SafeFetchDeps['lookup']> = async (hostname: string) => {
      calls.push(hostname)
      const records = map[hostname]
      if (!records) throw new Error(`ENOTFOUND ${hostname}`)
      return records
    }
    return { lookup, calls }
  }

  function htmlResponse(body: string): Response {
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
  }

  function redirectResponse(location: string, status = 302): Response {
    return new Response(null, { status, headers: { location } })
  }

  it('rejects a 302 → http://169.254.169.254 (cloud metadata) at hop 2', async () => {
    const { lookup } = mockLookup({
      'attacker.example.com': [{ address: '93.184.216.34', family: 4 }]
    })
    let calls = 0
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async () => {
      calls += 1
      if (calls === 1) {
        return redirectResponse('http://169.254.169.254/latest/meta-data')
      }
      throw new Error('fetchImpl should not be called for the metadata hop — validation must block it')
    }
    await expect(fetchAndExtractText('https://attacker.example.com/start', { lookup, fetchImpl })).rejects.toThrow(
      /private|Internal/i
    )
    expect(calls).toBe(1) // only the initial fetch happened — the redirect target was blocked syntactically
  })

  it('rejects a 302 → http://10.0.0.1 (RFC1918)', async () => {
    const { lookup } = mockLookup({
      'attacker.example.com': [{ address: '93.184.216.34', family: 4 }]
    })
    let calls = 0
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async () => {
      calls += 1
      if (calls === 1) return redirectResponse('http://10.0.0.1/admin')
      throw new Error('Should not reach private IP')
    }
    await expect(fetchAndExtractText('https://attacker.example.com/x', { lookup, fetchImpl })).rejects.toThrow()
    expect(calls).toBe(1)
  })

  it('rejects a redirect to a hostname that DNS-resolves to a private IP (rebinding)', async () => {
    // Hop 1: public hostname, public IP, returns 302 → second hostname.
    // Hop 2: second hostname looks innocuous but resolves to 127.0.0.1.
    // The pre-fetch DNS check at hop 2 must reject before the connect.
    const { lookup, calls } = mockLookup({
      'attacker.example.com': [{ address: '93.184.216.34', family: 4 }],
      'evil.example.com': [{ address: '127.0.0.1', family: 4 }]
    })
    let fetchCalls = 0
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async () => {
      fetchCalls += 1
      if (fetchCalls === 1) return redirectResponse('https://evil.example.com/intranet')
      throw new Error('fetchImpl must not connect when DNS resolves to private')
    }
    await expect(fetchAndExtractText('https://attacker.example.com/', { lookup, fetchImpl })).rejects.toThrow(
      /private|loopback/i
    )
    expect(calls).toEqual(['attacker.example.com', 'evil.example.com'])
    expect(fetchCalls).toBe(1)
  })

  it('caps redirect chain length', async () => {
    const { lookup } = mockLookup({
      'a.example.com': [{ address: '93.184.216.34', family: 4 }],
      'b.example.com': [{ address: '93.184.216.34', family: 4 }],
      'c.example.com': [{ address: '93.184.216.34', family: 4 }],
      'd.example.com': [{ address: '93.184.216.34', family: 4 }],
      'e.example.com': [{ address: '93.184.216.34', family: 4 }]
    })
    let fetchCalls = 0
    const chain = ['b', 'c', 'd', 'e']
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async () => {
      const idx = fetchCalls
      fetchCalls += 1
      const next = chain[idx]
      if (next) return redirectResponse(`https://${next}.example.com/`)
      return htmlResponse('<p>final</p>')
    }
    await expect(fetchAndExtractText('https://a.example.com/', { lookup, fetchImpl })).rejects.toThrow(
      /Too many redirects/
    )
  })

  it('follows a small redirect chain to a public host and returns extracted text', async () => {
    const { lookup } = mockLookup({
      'a.example.com': [{ address: '93.184.216.34', family: 4 }],
      'b.example.com': [{ address: '93.184.216.34', family: 4 }]
    })
    let fetchCalls = 0
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async () => {
      fetchCalls += 1
      if (fetchCalls === 1) return redirectResponse('https://b.example.com/jd')
      return htmlResponse('<html><body><p>Senior Engineer needed</p></body></html>')
    }
    const text = await fetchAndExtractText('https://a.example.com/start', { lookup, fetchImpl })
    expect(text).toContain('Senior Engineer needed')
    expect(fetchCalls).toBe(2)
  })

  it('passes the pinned address from DNS resolution into fetchImpl', async () => {
    const { lookup } = mockLookup({
      'public.example.com': [{ address: '93.184.216.34', family: 4 }]
    })
    let seenPinned: { address: string; family: 4 | 6 } | null = null
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async (_url, init) => {
      seenPinned = { address: init.pinnedAddress, family: init.pinnedFamily }
      return htmlResponse('<p>ok ok ok</p>')
    }
    await fetchAndExtractText('https://public.example.com/', { lookup, fetchImpl })
    expect(seenPinned).toEqual({ address: '93.184.216.34', family: 4 })
  })

  it('rejects a syntactically-private redirect target with a clear message', async () => {
    const { lookup } = mockLookup({
      'public.example.com': [{ address: '93.184.216.34', family: 4 }]
    })
    const fetchImpl: NonNullable<SafeFetchDeps['fetchImpl']> = async () =>
      redirectResponse('http://localhost:6379/INFO')
    await expect(fetchAndExtractText('https://public.example.com/', { lookup, fetchImpl })).rejects.toThrow(
      /Redirect blocked/
    )
  })
})

describe('pinnedLookup — undici Agent connect.lookup, both Node callback shapes', () => {
  // Regression coverage for the bug that made every real-world URL fetch
  // fail with a generic "Fetch failed: fetch failed" regardless of target
  // site (reproduced against a live, unprotected Greenhouse job posting
  // before this fix — not Binance-specific, not a WAF issue). Node 20+'s
  // Happy Eyeballs dual-stack connect (`lookupAndConnectMultiple`, the
  // default since Node 20) invokes a custom `lookup` with `{ all: true }`
  // and expects the array-of-addresses callback shape; the older code
  // always answered in the single-address shape, so Node's internals
  // received `undefined` where they expected an array —
  // `TypeError [ERR_INVALID_IP_ADDRESS]: Invalid IP address: undefined`,
  // several layers below anything `fetchAndExtractText`'s own
  // `fetchImpl`/`lookup` injection points reach (those replace `realFetch`
  // entirely; `pinnedLookup` is what `realFetch` builds internally). Its
  // own callback signature is exactly what this test exercises directly.

  it('without `{ all: true }` (legacy single-connect path): answers (err, address, family)', () => {
    const lookup = pinnedLookup('93.184.216.34', 4)
    let seen: unknown[] = []
    lookup('example.com', undefined, (...args: unknown[]) => {
      seen = args
    })
    expect(seen).toEqual([null, '93.184.216.34', 4])
  })

  it('with `{ all: true }` (Node 20+ Happy Eyeballs path): answers (err, [{address, family}]) — the exact fix', () => {
    const lookup = pinnedLookup('93.184.216.34', 4)
    let seen: unknown[] = []
    lookup('example.com', { all: true }, (...args: unknown[]) => {
      seen = args
    })
    expect(seen).toEqual([null, [{ address: '93.184.216.34', family: 4 }]])
  })

  it('with `{ all: false }`: still answers the single-address shape, not the array shape', () => {
    const lookup = pinnedLookup('93.184.216.34', 4)
    let seen: unknown[] = []
    lookup('example.com', { all: false }, (...args: unknown[]) => {
      seen = args
    })
    expect(seen).toEqual([null, '93.184.216.34', 4])
  })

  it('pins the exact address/family it was built with, regardless of the hostname argument', () => {
    const lookup = pinnedLookup('2001:db8::1', 6)
    let seen: unknown[] = []
    lookup('this-hostname-is-ignored.example.com', { all: true }, (...args: unknown[]) => {
      seen = args
    })
    expect(seen).toEqual([null, [{ address: '2001:db8::1', family: 6 }]])
  })
})

describe('resolveCvInput — text/markdown/pdf kinds', () => {
  const filler = 'A'.repeat(60)

  it('accepts pasted CV text', async () => {
    const resolved = await resolveCvInput({ kind: 'text', value: filler })
    expect(resolved.kind).toBe('text')
    expect(resolved.text).toBe(filler)
    expect(resolved.username).toBeNull()
    expect(resolved.candidateLabel).toBe('Pasted CV')
  })

  it('accepts markdown CV text', async () => {
    const md = `# John Doe\n\nSenior Engineer with experience in ${filler}`
    const resolved = await resolveCvInput({ kind: 'markdown', value: md })
    expect(resolved.kind).toBe('markdown')
    expect(resolved.text).toBe(md)
    expect(resolved.candidateLabel).toBe('CV (markdown)')
  })

  it('accepts pre-extracted PDF text', async () => {
    const resolved = await resolveCvInput({ kind: 'pdf', value: filler })
    expect(resolved.kind).toBe('pdf')
    expect(resolved.candidateLabel).toBe('CV (PDF)')
  })

  it('rejects CV text shorter than 50 chars', async () => {
    await expect(resolveCvInput({ kind: 'text', value: 'short' })).rejects.toThrow()
  })
})
