// SSRF-safe URL fetch + HTML → text extraction for JD URL inputs.
//
// Defense layers (defense-in-depth — each layer alone is insufficient):
//   1. Syntactic validation: protocol allow-list + reject hostnames/IPs that
//      are literally private/loopback/link-local/cloud-metadata.
//   2. DNS resolution check: resolve the hostname and reject if ANY returned
//      A/AAAA record points at a private/loopback/link-local address. Closes
//      the "evil.com → 127.0.0.1" attack the syntactic check can't see.
//   3. IP pinning via undici Agent's connect.lookup: the actual TCP connect
//      uses the IP we already validated, not whatever DNS returns at fetch
//      time. Closes the DNS-rebinding race window between our resolve and
//      the fetch's own resolve.
//   4. Manual redirect handling: redirect: 'manual' + a hop cap. Each hop's
//      Location is re-run through the full validate→resolve→pin pipeline,
//      so a 302 → http://169.254.169.254/ is rejected at hop 2 instead of
//      followed silently.
//   5. Size + time caps: 1 MB body, 8 s wall time per hop.
//
// Tests inject `lookup` and `fetchImpl` so redirect-bypass and DNS-rebinding
// scenarios are exercised without real network.

import { lookup as dnsLookup } from 'node:dns/promises'

const MAX_BYTES = 1_000_000
const TIMEOUT_MS = 8000
const MAX_REDIRECTS = 3
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./
]

export function isPrivateIPv4(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
  return PRIVATE_IPV4_PATTERNS.some((re) => re.test(host))
}

export function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fe80:')) return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true
  // IPv4-mapped IPv6: ::ffff:127.0.0.1 etc. — strip the mapping and re-test.
  const v4mapped = h.match(/^::ffff:([0-9.]+)$/)
  if (v4mapped?.[1] && isPrivateIPv4(v4mapped[1])) return true
  return false
}

function isPrivateHostname(host: string): boolean {
  const h = host.toLowerCase()
  if (h === 'localhost') return true
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true
  return false
}

export function validateJdUrl(input: string): URL {
  let url: URL
  try {
    url = new URL(input)
  } catch {
    throw new Error('Invalid URL')
  }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error('Only http(s) URLs are allowed')
  }
  const host = url.hostname
  if (!host) throw new Error('URL is missing a hostname')
  // strip IPv6 brackets for the literal-IP check
  const bareHost = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host
  if (isPrivateHostname(bareHost) || isPrivateIPv4(bareHost) || isPrivateIPv6(bareHost)) {
    throw new Error('Internal or private addresses are not allowed')
  }
  return url
}

export interface ResolvedAddress {
  address: string
  family: 4 | 6
}

export function assertSafeResolvedAddresses(records: ResolvedAddress[]): void {
  if (records.length === 0) throw new Error('DNS resolution returned no records')
  for (const r of records) {
    if (r.family === 4 && isPrivateIPv4(r.address)) {
      throw new Error('Hostname resolves to a private or loopback address')
    }
    if (r.family === 6 && isPrivateIPv6(r.address)) {
      throw new Error('Hostname resolves to a private or loopback address')
    }
  }
}

export function extractMainText(html: string): string {
  let s = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
  s = s.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)\s*>/gi, '\n')
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, ' ')
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
  s = s.replace(/[ \t]+/g, ' ')
  s = s
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

export interface SafeFetchDeps {
  // Resolve a hostname to one or more A/AAAA records. Defaults to node:dns.
  lookup?: (hostname: string) => Promise<ResolvedAddress[]>
  // The HTTP transport. Defaults to undici fetch with a pinned-IP dispatcher.
  // Receives the URL plus the pinned address we already validated.
  fetchImpl?: (url: string, init: SafeFetchInit) => Promise<Response>
}

export interface SafeFetchInit {
  signal: AbortSignal
  headers: Record<string, string>
  pinnedAddress: string
  pinnedFamily: 4 | 6
}

async function realLookup(hostname: string): Promise<ResolvedAddress[]> {
  const records = await dnsLookup(hostname, { all: true })
  return records.map((r) => ({ address: r.address, family: r.family as 4 | 6 }))
}

async function realFetch(url: string, init: SafeFetchInit): Promise<Response> {
  // Lazy import undici only when needed — keeps the lib usable in test envs
  // that swap `fetchImpl` without touching network primitives.
  const { Agent, fetch: undiciFetch } = await import('undici')
  const dispatcher = new Agent({
    connect: {
      lookup: (_hostname, _opts, cb) => cb(null, init.pinnedAddress, init.pinnedFamily)
    }
  })
  try {
    const res = await undiciFetch(url, {
      method: 'GET',
      signal: init.signal,
      redirect: 'manual',
      headers: init.headers,
      dispatcher
    })
    // undici Response is structurally compatible with the global Response.
    return res as unknown as Response
  } finally {
    await dispatcher.close().catch(() => {})
  }
}

export async function fetchAndExtractText(rawUrl: string, deps: SafeFetchDeps = {}): Promise<string> {
  const lookup = deps.lookup ?? realLookup
  const fetchImpl = deps.fetchImpl ?? realFetch

  let currentUrl = validateJdUrl(rawUrl)
  let response: Response | null = null
  let hop = 0

  while (true) {
    const records = await lookup(currentUrl.hostname)
    assertSafeResolvedAddresses(records)
    const pinned = records[0]
    if (!pinned) throw new Error('DNS resolution returned no records')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetchImpl(currentUrl.toString(), {
        signal: controller.signal,
        pinnedAddress: pinned.address,
        pinnedFamily: pinned.family,
        headers: {
          Accept: 'text/html, text/plain;q=0.9, */*;q=0.5',
          'User-Agent': 'HeraldBot/1.0 (+https://herald.attalabs.dev)'
        }
      })
    } catch (err) {
      clearTimeout(timer)
      if (controller.signal.aborted) throw new Error('Fetch timed out')
      const message = err instanceof Error ? err.message : 'Fetch failed'
      throw new Error(`Fetch failed: ${message}`)
    }
    clearTimeout(timer)

    if (res.status >= 300 && res.status < 400) {
      if (hop >= MAX_REDIRECTS) throw new Error('Too many redirects')
      const location = res.headers.get('location')
      if (!location) throw new Error(`HTTP ${res.status} with no Location header`)
      // Resolve relative locations against the current URL, then run the
      // FULL syntactic + DNS validation again next iteration.
      try {
        currentUrl = validateJdUrl(new URL(location, currentUrl).toString())
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Invalid redirect target'
        throw new Error(`Redirect blocked: ${message}`)
      }
      hop += 1
      // Drain/close any leftover body before next hop.
      try {
        await res.body?.cancel()
      } catch {
        // ignore — body may already be consumed
      }
      continue
    }

    response = res
    break
  }

  if (!response) throw new Error('No response')
  if (!response.ok) throw new Error(`Fetch returned HTTP ${response.status}`)

  const contentType = response.headers.get('content-type') ?? ''
  if (!/text\/html|text\/plain|application\/xhtml/.test(contentType)) {
    throw new Error(`Unsupported content-type: ${contentType.split(';')[0] || 'unknown'}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  let received = 0
  const chunks: Uint8Array[] = []
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) {
      received += value.byteLength
      if (received > MAX_BYTES) {
        await reader.cancel()
        throw new Error('Response exceeded size limit')
      }
      chunks.push(value)
    }
  }

  const buf = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    buf.set(c, offset)
    offset += c.byteLength
  }
  const body = new TextDecoder('utf-8', { fatal: false }).decode(buf)
  if (contentType.includes('text/plain')) {
    return body.trim()
  }
  return extractMainText(body)
}
