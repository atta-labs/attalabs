import { describe, expect, it } from 'vitest'
import { usesDocsShell } from './docs-shell-route'

describe('usesDocsShell', () => {
  it.each([
    '/docs/harness',
    '/docs/reference',
    '/docs/roles/security',
    '/docs/rings/ring-1',
    '/docs/cli',
    '/docs/config'
  ])('renders %s inside the docs shell', (pathname) => {
    expect(usesDocsShell(pathname)).toBe(true)
  })

  it('keeps State Machine under the site-wide top bar', () => {
    expect(usesDocsShell('/docs/state-machine')).toBe(false)
  })

  it.each(['/', '/roadmap', '/compare', '/the-studio', '/life-cycle', '/start/quick', '/docs'])(
    'keeps %s under the site-wide top bar',
    (pathname) => {
      expect(usesDocsShell(pathname)).toBe(false)
    }
  )
})
