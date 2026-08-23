import 'server-only'
import { gunzipSync } from 'node:zlib'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'

const REGISTRY_URL = 'https://registry.npmjs.org/@attalabs%2fvinaya/latest'
const SOURCE_ARCHIVE_ROOT = 'https://codeload.github.com/atta-labs/vinaya/tar.gz'
const FETCH_TIMEOUT_MS = 10_000
const RELEASE_REVALIDATE_SECONDS = 60 * 60

const FALLBACK_METRICS = {
  version: '0.16.0',
  executableLines: 25_487,
  doctrineLines: 5_195
} as const

const PORTABLE_DOCTRINE_FILES = new Set([
  'coordination.md',
  'enforcement.md',
  'glossary.md',
  'process.md',
  'state-machine.md',
  'tranche-model.md'
])
const PORTABLE_DOCTRINE_DIRECTORIES = ['contracts/', 'roles/', 'skills/', 'templates/'] as const

export interface PublishedReleaseMetrics {
  version: string
  executableLines: number
  doctrineLines: number
}

interface RegistryRelease {
  version?: string
  gitHead?: string
}

interface TarEntry {
  path: string
  content: Buffer
}

function readString(buffer: Buffer, start: number, length: number): string {
  const end = buffer.indexOf(0, start)
  return buffer.toString('utf8', start, end === -1 || end > start + length ? start + length : end)
}

function readOctal(buffer: Buffer, start: number, length: number): number {
  const value = readString(buffer, start, length).trim()
  return value ? Number.parseInt(value, 8) : 0
}

function readPaxPath(content: Buffer): string | undefined {
  const text = content.toString('utf8')
  let offset = 0

  while (offset < text.length) {
    const divider = text.indexOf(' ', offset)
    if (divider === -1) return undefined
    const recordLength = Number.parseInt(text.slice(offset, divider), 10)
    if (!Number.isFinite(recordLength) || recordLength <= 0) return undefined
    const record = text.slice(divider + 1, offset + recordLength - 1)
    const equals = record.indexOf('=')
    if (equals !== -1 && record.slice(0, equals) === 'path') return record.slice(equals + 1)
    offset += recordLength
  }

  return undefined
}

/** Reads the regular files needed from the standard tar stream GitHub returns. */
export function readTarEntries(archive: Buffer): TarEntry[] {
  const entries: TarEntry[] = []
  let offset = 0
  let nextPath: string | undefined

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break

    const name = readString(header, 0, 100)
    const prefix = readString(header, 345, 155)
    const headerPath = prefix ? `${prefix}/${name}` : name
    const size = readOctal(header, 124, 12)
    const type = String.fromCharCode(header[156] ?? 0)
    const contentStart = offset + 512
    const contentEnd = contentStart + size
    if (contentEnd > archive.length) throw new Error('Truncated release archive')
    const content = archive.subarray(contentStart, contentEnd)

    if (type === 'x') {
      nextPath = readPaxPath(content) ?? nextPath
    } else if (type === 'L') {
      nextPath = content.toString('utf8').replace(/[\0\n]+$/, '')
    } else {
      if (type === '0' || type === '\0') entries.push({ path: nextPath ?? headerPath, content })
      nextPath = undefined
    }

    offset = contentStart + Math.ceil(size / 512) * 512
  }

  return entries
}

function withoutArchiveRoot(path: string): string {
  const divider = path.indexOf('/')
  return divider === -1 ? path : path.slice(divider + 1)
}

function isExecutableSource(path: string): boolean {
  const inProductSource = path.startsWith('apps/cli/src/') || /^packages\/[^/]+\/src\//.test(path)

  return inProductSource && /\.tsx?$/.test(path) && !/\.(?:test|spec)\.tsx?$/.test(path) && !path.includes('/fixtures/')
}

function isPortableDoctrine(path: string): boolean {
  if (!path.startsWith('aeg-root/') || !path.endsWith('.md')) return false
  const relativePath = path.slice('aeg-root/'.length)
  return (
    PORTABLE_DOCTRINE_FILES.has(relativePath) ||
    PORTABLE_DOCTRINE_DIRECTORIES.some((directory) => relativePath.startsWith(directory))
  )
}

function countLines(content: Buffer): number {
  if (content.length === 0) return 0
  let lines = content[content.length - 1] === 10 ? 0 : 1
  for (const byte of content) if (byte === 10) lines += 1
  return lines
}

/**
 * Counts first-party, non-test TypeScript and the exact portable doctrine
 * categories copied by the package's `bundle-doctrine` release step.
 */
export function measureReleaseEntries(entries: Iterable<TarEntry>): Omit<PublishedReleaseMetrics, 'version'> {
  let executableLines = 0
  let doctrineLines = 0

  for (const entry of entries) {
    const path = withoutArchiveRoot(entry.path)
    if (isExecutableSource(path)) executableLines += countLines(entry.content)
    if (isPortableDoctrine(path)) doctrineLines += countLines(entry.content)
  }

  return { executableLines, doctrineLines }
}

function resolveGithubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN
}

async function fetchWithTimeout(url: string, headers?: HeadersInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers,
      next: { revalidate: RELEASE_REVALIDATE_SECONDS }
    })
  } finally {
    clearTimeout(timeout)
  }
}

/** Reads npm's latest public version, then measures that release's exact source commit. Never throws. */
export async function fetchPublishedReleaseMetrics(): Promise<PublishedReleaseMetrics> {
  try {
    const registryResponse = await fetchWithTimeout(REGISTRY_URL)
    if (!registryResponse.ok) return FALLBACK_METRICS
    const release = (await registryResponse.json()) as RegistryRelease
    if (!release.version || !release.gitHead || !/^[a-f0-9]{40}$/.test(release.gitHead)) return FALLBACK_METRICS

    const token = resolveGithubToken()
    if (!token) return FALLBACK_METRICS
    const archiveResponse = await fetchWithTimeout(`${SOURCE_ARCHIVE_ROOT}/${release.gitHead}`, {
      Authorization: `Bearer ${token}`
    })
    if (!archiveResponse.ok) return FALLBACK_METRICS
    const archive = gunzipSync(Buffer.from(await archiveResponse.arrayBuffer()))
    const measured = measureReleaseEntries(readTarEntries(archive))
    if (measured.executableLines === 0 || measured.doctrineLines === 0) return FALLBACK_METRICS

    return { version: release.version, ...measured }
  } catch {
    return FALLBACK_METRICS
  }
}

const getCachedPublishedReleaseMetrics = unstable_cache(
  fetchPublishedReleaseMetrics,
  ['vinaya-published-release-metrics-v1'],
  { revalidate: RELEASE_REVALIDATE_SECONDS }
)

export const getPublishedReleaseMetrics = cache(getCachedPublishedReleaseMetrics)
