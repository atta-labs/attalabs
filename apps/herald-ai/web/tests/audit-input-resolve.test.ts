// Pure-function tests for the audit-input resolution layer (Task 5).
// Covers: JD URL SSRF validation (syntactic, DNS-resolution, redirect-bypass,
// DNS-rebinding via injected deps), HTML text extraction, JD/CV text
// validation, CV markdown/pdf pass-through. Profile-lookup path is integration-
// tested elsewhere (it touches the live DB).

import { describe, expect, it } from 'bun:test'

import { resolveCvInput, resolveJdInput } from '@/lib/audit-input/resolve'
import {
  assertSafeResolvedAddresses,
  extractMainText,
  fetchAndExtractText,
  isPrivateIPv6,
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
