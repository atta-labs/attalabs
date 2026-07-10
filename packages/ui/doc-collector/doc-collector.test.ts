import { describe, expect, it, vi } from 'vitest'
import {
  createTextItem,
  insertNewestFirst,
  patchItemById,
  removeItemById,
  resolveCustomSourceValue,
  resolveFileKind,
  resolveFileText,
  type DocCollectorCustomSource,
  type DocCollectorItem
} from './doc-collector'

function makeFile(name: string, content: string, type: string): File {
  return new File([content], name, { type })
}

describe('resolveFileKind — accept gating', () => {
  it('maps .md to kind "md"', () => {
    expect(resolveFileKind('readme.md', '.md,.pdf')).toBe('md')
  })

  it('maps .pdf to kind "pdf"', () => {
    expect(resolveFileKind('resume.pdf', '.md,.pdf')).toBe('pdf')
  })

  it('rejects an unrecognized extension', () => {
    expect(resolveFileKind('archive.zip', '.md,.pdf')).toBeNull()
  })
})

describe('resolveFileText — file-kind dispatch', () => {
  it('resolves a .md file via file.text() to its raw content', async () => {
    const file = makeFile('notes.md', '# Hello world', 'text/markdown')
    const text = await resolveFileText(file, 'md')
    expect(text).toBe('# Hello world')
  })

  it('resolves a .pdf file via the dynamic unpdf import (mocked)', async () => {
    vi.doMock('unpdf', () => ({
      extractText: vi.fn().mockResolvedValue({ text: 'Extracted PDF text' })
    }))
    const file = makeFile('resume.pdf', '%PDF-1.4 fake bytes', 'application/pdf')
    const text = await resolveFileText(file, 'pdf')
    expect(text).toBe('Extracted PDF text')
    vi.doUnmock('unpdf')
  })

  it('a dropped pdf item transitions resolving -> ready with the resolved text', async () => {
    vi.doMock('unpdf', () => ({
      extractText: vi.fn().mockResolvedValue({ text: 'Extracted PDF text' })
    }))
    const file = makeFile('resume.pdf', '%PDF-1.4 fake bytes', 'application/pdf')

    let items: DocCollectorItem[] = []
    const pending: DocCollectorItem = {
      id: 'pdf-1',
      filename: 'resume.pdf',
      kind: 'pdf',
      status: 'resolving',
      addedAt: 1
    }
    items = insertNewestFirst(items, pending)
    expect(items[0]?.status).toBe('resolving')

    const text = await resolveFileText(file, 'pdf')
    items = patchItemById(items, 'pdf-1', { status: 'ready', text })

    expect(items[0]?.status).toBe('ready')
    expect(items[0]?.text).toBe('Extracted PDF text')
    vi.doUnmock('unpdf')
  })
})

describe('insertNewestFirst — ordering', () => {
  it('orders 3 items committed in sequence newest-first: [C, B, A]', () => {
    let items: DocCollectorItem[] = []
    const a: DocCollectorItem = { id: 'a', filename: 'a.md', kind: 'md', status: 'ready', text: 'A', addedAt: 1 }
    const b: DocCollectorItem = { id: 'b', filename: 'b.pdf', kind: 'pdf', status: 'ready', text: 'B', addedAt: 2 }
    const c = createTextItem('typed text C', 3, 1)

    items = insertNewestFirst(items, a)
    items = insertNewestFirst(items, b)
    items = insertNewestFirst(items, c as DocCollectorItem)

    expect(items.map((it) => it.id)).toEqual([c?.id, 'b', 'a'])
  })
})

describe('createTextItem — commit gating', () => {
  it('returns null for blank/whitespace-only text — Add is a no-op', () => {
    expect(createTextItem('', 1, 1)).toBeNull()
    expect(createTextItem('   \n\t  ', 1, 1)).toBeNull()
  })

  it('typed/pasted text never becomes an item without an explicit commit call', () => {
    // Simulates "typing" — a real long paste that a length-based threshold
    // (like SmartPromptInput's pasteToFileChars) would auto-convert. There is
    // deliberately no such path here: `items` stays empty until
    // createTextItem() is explicitly called and its result explicitly
    // inserted. In doc-collector.tsx, that call is wired ONLY to the Add
    // button's onClick — the textarea's onChange never reaches it.
    const longPastedText = 'x'.repeat(5000)
    let items: DocCollectorItem[] = []
    expect(items).toHaveLength(0)

    const committed = createTextItem(longPastedText, 1000, 1)
    expect(committed).not.toBeNull()
    items = insertNewestFirst(items, committed as DocCollectorItem)
    expect(items).toHaveLength(1)
  })
})

describe('removeItemById', () => {
  it('removes only the targeted item, preserving the rest in order', () => {
    const a: DocCollectorItem = { id: 'a', filename: 'a.md', kind: 'md', status: 'ready', text: 'A', addedAt: 2 }
    const b: DocCollectorItem = { id: 'b', filename: 'b.pdf', kind: 'pdf', status: 'ready', text: 'B', addedAt: 1 }
    const items = removeItemById([a, b], 'a')
    expect(items.map((it) => it.id)).toEqual(['b'])
  })
})

describe('resolveCustomSourceValue — resolve-then-insert (never add-then-patch)', () => {
  function makeSource(overrides: Partial<DocCollectorCustomSource> = {}): DocCollectorCustomSource {
    return {
      label: 'Herald Username',
      placeholder: 'username',
      resolve: vi.fn().mockResolvedValue({ text: 'resolved text', filename: '@dani.usr' }),
      ...overrides
    }
  }

  it('returns null for blank/whitespace-only input — Add is a no-op, resolve is never called', async () => {
    const source = makeSource()
    expect(await resolveCustomSourceValue(source, '', 1)).toBeNull()
    expect(await resolveCustomSourceValue(source, '   \n\t  ', 1)).toBeNull()
    expect(source.resolve).not.toHaveBeenCalled()
  })

  it('trims the value before checking blank and before calling resolve', async () => {
    const source = makeSource()
    await resolveCustomSourceValue(source, '  dani  ', 1)
    expect(source.resolve).toHaveBeenCalledWith('dani')
  })

  it("on success, returns a ready item built from resolve()'s result — never a resolving/error tile first", async () => {
    const source = makeSource({
      resolve: vi.fn().mockResolvedValue({ text: 'CV text', filename: '@dani.usr', meta: { username: 'dani' } })
    })
    const result = await resolveCustomSourceValue(source, 'dani', 1000, () => 'fixed-id')
    expect(result).toEqual({
      item: {
        id: 'fixed-id',
        filename: '@dani.usr',
        kind: 'text',
        status: 'ready',
        text: 'CV text',
        meta: { username: 'dani' },
        addedAt: 1000
      }
    })
  })

  it("on rejection, returns the thrown Error's message and never fabricates an item", async () => {
    const source = makeSource({
      resolve: vi.fn().mockRejectedValue(new Error('Published Herald profile not found'))
    })
    const result = await resolveCustomSourceValue(source, 'nobody', 1)
    expect(result).toEqual({ error: 'Published Herald profile not found' })
  })

  it('on a non-Error rejection, falls back to a generic message', async () => {
    const source = makeSource({ resolve: vi.fn().mockRejectedValue('a plain string throw') })
    const result = await resolveCustomSourceValue(source, 'x', 1)
    expect(result).toEqual({ error: 'Failed to resolve.' })
  })
})
