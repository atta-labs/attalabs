import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseDocOwners } from '@atta/aeg-core'
import {
  appendDocOwnersBinding,
  applyDocOwnersBinding,
  freshDocOwners,
  planDocOwnersBinding,
  renderDocOwnersBindingDiffLine
} from '../src/lib/doc-owners-write.js'

let root: string

beforeEach(() => {
  root = join(tmpdir(), `vinaya-doc-owners-write-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(root, { recursive: true })
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('doc-owners-write', () => {
  it('freshDocOwners produces content parseDocOwners can read', () => {
    const content = freshDocOwners('apps/foo/src/**', 'apps/foo/specs/foo.md')
    const { bindings, errors } = parseDocOwners(content)
    expect(errors).toEqual([])
    expect(bindings).toEqual([{ glob: 'apps/foo/src/**', pointer: 'apps/foo/specs/foo.md', lineNum: 1 }])
  })

  it('appendDocOwnersBinding appends after existing content, keeping it intact', () => {
    const before = freshDocOwners('apps/foo/src/**', 'apps/foo/specs/foo.md')
    const after = appendDocOwnersBinding(before, 'apps/bar/src/**', 'apps/bar/specs/bar.md')
    const { bindings } = parseDocOwners(after)
    expect(bindings.map((b) => b.glob)).toEqual(['apps/foo/src/**', 'apps/bar/src/**'])
  })

  it('appendDocOwnersBinding preserves a foreign header (comments, blank lines) already present', () => {
    const foreign = '# Some header\n#\n# more commentary\n\napps/existing/**  docs/existing.md\n'
    const after = appendDocOwnersBinding(foreign, 'apps/foo/src/**', 'apps/foo/specs/foo.md')
    expect(after).toContain('# Some header')
    const { bindings } = parseDocOwners(after)
    expect(bindings.map((b) => b.glob)).toEqual(['apps/existing/**', 'apps/foo/src/**'])
  })

  it('appendDocOwnersBinding adds a trailing newline when the existing content lacks one', () => {
    const before = 'apps/existing/**  docs/existing.md'
    const after = appendDocOwnersBinding(before, 'apps/foo/src/**', 'apps/foo/specs/foo.md')
    expect(after).toBe('apps/existing/**  docs/existing.md\napps/foo/src/**  apps/foo/specs/foo.md\n')
  })

  it('planDocOwnersBinding classifies create-host / append-row / skip-present correctly', () => {
    const p1 = planDocOwnersBinding(root, 'apps/foo/src/**', 'apps/foo/specs/foo.md')
    expect(p1.action).toBe('create-host')

    mkdirSync(join(root, '.vinaya'), { recursive: true })
    writeFileSync(join(root, '.vinaya/doc-owners'), freshDocOwners('apps/foo/src/**', 'apps/foo/specs/foo.md'))

    const p2 = planDocOwnersBinding(root, 'apps/foo/src/**', 'apps/foo/specs/foo.md')
    expect(p2.action).toBe('skip-present')

    const p3 = planDocOwnersBinding(root, 'apps/bar/src/**', 'apps/bar/specs/bar.md')
    expect(p3.action).toBe('append-row')
  })

  it('planDocOwnersBinding idempotency is keyed on the glob alone, not the pointer', () => {
    mkdirSync(join(root, '.vinaya'), { recursive: true })
    writeFileSync(join(root, '.vinaya/doc-owners'), freshDocOwners('apps/foo/src/**', 'apps/foo/specs/foo.md'))

    // Same glob, different pointer — still classified as already-bound.
    const plan = planDocOwnersBinding(root, 'apps/foo/src/**', 'apps/foo/specs/other.md')
    expect(plan.action).toBe('skip-present')
  })

  it('applyDocOwnersBinding writes create-host, appends on append-row, no-ops on skip-present', () => {
    const abs = join(root, '.vinaya/doc-owners')

    const p1 = planDocOwnersBinding(root, 'apps/foo/src/**', 'apps/foo/specs/foo.md')
    applyDocOwnersBinding(root, p1, 'apps/foo/src/**', 'apps/foo/specs/foo.md')
    expect(
      parseDocOwners(require('node:fs').readFileSync(abs, 'utf-8')).bindings.map((b: { glob: string }) => b.glob)
    ).toEqual(['apps/foo/src/**'])

    const p2 = planDocOwnersBinding(root, 'apps/bar/src/**', 'apps/bar/specs/bar.md')
    applyDocOwnersBinding(root, p2, 'apps/bar/src/**', 'apps/bar/specs/bar.md')
    expect(
      parseDocOwners(require('node:fs').readFileSync(abs, 'utf-8')).bindings.map((b: { glob: string }) => b.glob)
    ).toEqual(['apps/foo/src/**', 'apps/bar/src/**'])

    const before = require('node:fs').readFileSync(abs, 'utf-8')
    const p3 = planDocOwnersBinding(root, 'apps/foo/src/**', 'apps/foo/specs/other.md')
    applyDocOwnersBinding(root, p3, 'apps/foo/src/**', 'apps/foo/specs/other.md')
    expect(require('node:fs').readFileSync(abs, 'utf-8')).toBe(before)
  })

  it('renderDocOwnersBindingDiffLine renders each of the three actions', () => {
    expect(renderDocOwnersBindingDiffLine({ action: 'create-host', line: 'a  b', path: '.vinaya/doc-owners' })).toBe(
      '  + create .vinaya/doc-owners (with binding)\n    a  b'
    )
    expect(renderDocOwnersBindingDiffLine({ action: 'append-row', line: 'a  b', path: '.vinaya/doc-owners' })).toBe(
      '  ~ append line to .vinaya/doc-owners\n    a  b'
    )
    expect(renderDocOwnersBindingDiffLine({ action: 'skip-present', line: 'a  b', path: '.vinaya/doc-owners' })).toBe(
      '  = keep   .vinaya/doc-owners (glob already bound)'
    )
  })
})
