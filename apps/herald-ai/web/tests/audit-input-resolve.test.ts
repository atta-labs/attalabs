// Pure-function tests for the audit-input resolution layer (Task 5).
// Covers: JD URL SSRF validation, HTML text extraction, JD/CV text validation,
// CV markdown/pdf pass-through. Profile-lookup path is integration-tested
// elsewhere (it touches the live DB).

import { describe, expect, it } from 'bun:test'

import { resolveCvInput, resolveJdInput } from '@/lib/audit-input/resolve'
import { extractMainText, validateJdUrl } from '@/lib/audit-input/url-fetch'

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
