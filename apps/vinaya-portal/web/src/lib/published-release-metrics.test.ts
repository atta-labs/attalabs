import { gzipSync } from 'node:zlib'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { fetchPublishedReleaseMetrics, measureReleaseEntries, readTarEntries } = await import(
  './published-release-metrics'
)

function entry(path: string, lines: number) {
  return { path: `vinaya-release/${path}`, content: Buffer.from('line\n'.repeat(lines)) }
}

function tarEntry(path: string, content: string): Buffer {
  const header = Buffer.alloc(512)
  header.write(path, 0, 100, 'utf8')
  header.write('0000644\0', 100, 8, 'ascii')
  header.write('0000000\0', 108, 8, 'ascii')
  header.write('0000000\0', 116, 8, 'ascii')
  header.write(`${content.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
  header.write('00000000000\0', 136, 12, 'ascii')
  header.fill(32, 148, 156)
  header.write('0', 156, 1, 'ascii')
  header.write('ustar\0', 257, 6, 'ascii')
  const checksum = [...header].reduce((total, byte) => total + byte, 0)
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')
  const body = Buffer.from(content)
  return Buffer.concat([header, body, Buffer.alloc(Math.ceil(body.length / 512) * 512 - body.length)])
}

describe('measureReleaseEntries', () => {
  it('counts first-party product source and the portable published doctrine', () => {
    const measured = measureReleaseEntries([
      entry('apps/cli/src/index.ts', 3),
      entry('packages/aeg-core/src/check.ts', 4),
      entry('aeg-root/enforcement.md', 5),
      entry('aeg-root/contracts/brief-developer.md', 6)
    ])

    expect(measured).toEqual({ executableLines: 7, doctrineLines: 11 })
  })

  it('excludes tests, fixtures, legacy bins, and repository-only prose', () => {
    const measured = measureReleaseEntries([
      entry('apps/cli/src/index.test.ts', 10),
      entry('packages/aeg-core/src/fixtures/example.ts', 10),
      entry('packages/aeg-core/bin/check.ts', 10),
      entry('aeg-root/reviewer-prompt.md', 10),
      entry('aeg-root/aeg-manual-flow.md', 10)
    ])

    expect(measured).toEqual({ executableLines: 0, doctrineLines: 0 })
  })

  it('counts a final source line even when it has no trailing newline', () => {
    const measured = measureReleaseEntries([
      { path: 'vinaya-release/apps/cli/src/index.ts', content: Buffer.from('one\ntwo') }
    ])

    expect(measured.executableLines).toBe(2)
  })

  it('reads regular files from a release tar stream', () => {
    const archive = Buffer.concat([tarEntry('vinaya-release/apps/cli/src/index.ts', 'one\ntwo\n'), Buffer.alloc(1024)])

    expect(readTarEntries(archive)).toEqual([
      { path: 'vinaya-release/apps/cli/src/index.ts', content: Buffer.from('one\ntwo\n') }
    ])
  })
})

describe('fetchPublishedReleaseMetrics', () => {
  it('measures the source commit named by npm latest', async () => {
    const originalFetch = global.fetch
    const originalToken = process.env.GITHUB_TOKEN
    const archive = Buffer.concat([
      tarEntry('vinaya-release/apps/cli/src/index.ts', 'one\ntwo\n'),
      tarEntry('vinaya-release/aeg-root/enforcement.md', 'rule\n'),
      Buffer.alloc(1024)
    ])
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.2.3', gitHead: 'a'.repeat(40) }), { status: 200 })
      )
      .mockResolvedValueOnce(new Response(gzipSync(archive), { status: 200 }))
    process.env.GITHUB_TOKEN = 'test-token'

    try {
      await expect(fetchPublishedReleaseMetrics()).resolves.toEqual({
        version: '1.2.3',
        executableLines: 2,
        doctrineLines: 1
      })
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        `https://codeload.github.com/atta-labs/vinaya/tar.gz/${'a'.repeat(40)}`,
        expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } })
      )
    } finally {
      global.fetch = originalFetch
      if (originalToken === undefined) delete process.env.GITHUB_TOKEN
      else process.env.GITHUB_TOKEN = originalToken
    }
  })

  it('falls back without a GitHub token, without ever fetching the archive', async () => {
    const originalFetch = global.fetch
    const originalToken = process.env.GITHUB_TOKEN
    const originalGhToken = process.env.GH_TOKEN
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ version: '1.2.3', gitHead: 'a'.repeat(40) }), { status: 200 })
      )
    delete process.env.GITHUB_TOKEN
    delete process.env.GH_TOKEN

    try {
      await expect(fetchPublishedReleaseMetrics()).resolves.toEqual({
        version: '0.16.0',
        executableLines: 25_487,
        doctrineLines: 5_195
      })
      expect(global.fetch).toHaveBeenCalledTimes(1)
    } finally {
      global.fetch = originalFetch
      if (originalToken === undefined) delete process.env.GITHUB_TOKEN
      else process.env.GITHUB_TOKEN = originalToken
      if (originalGhToken === undefined) delete process.env.GH_TOKEN
      else process.env.GH_TOKEN = originalGhToken
    }
  })
})
