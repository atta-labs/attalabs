// SSRF-safe URL fetch + HTML → text extraction for JD URL inputs.
// Validates protocol + hostname/IP, caps size + time, strips HTML.

const MAX_BYTES = 1_000_000
const TIMEOUT_MS = 8000
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

function isPrivateIPv4(host: string): boolean {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) return false
  return PRIVATE_IPV4_PATTERNS.some((re) => re.test(host))
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fe80:')) return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true
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
  if (isPrivateHostname(host) || isPrivateIPv4(host) || isPrivateIPv6(host)) {
    throw new Error('Internal or private addresses are not allowed')
  }
  return url
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

export async function fetchAndExtractText(rawUrl: string): Promise<string> {
  const url = validateJdUrl(rawUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        Accept: 'text/html, text/plain;q=0.9, */*;q=0.5',
        'User-Agent': 'HeraldBot/1.0 (+https://herald.attalabs.dev)'
      }
    })
  } catch (err) {
    clearTimeout(timer)
    const message = err instanceof Error ? err.message : 'Fetch failed'
    if (controller.signal.aborted) throw new Error('Fetch timed out')
    throw new Error(`Fetch failed: ${message}`)
  }
  clearTimeout(timer)

  if (!res.ok) {
    throw new Error(`Fetch returned HTTP ${res.status}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!/text\/html|text\/plain|application\/xhtml/.test(contentType)) {
    throw new Error(`Unsupported content-type: ${contentType.split(';')[0] || 'unknown'}`)
  }

  const reader = res.body?.getReader()
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
