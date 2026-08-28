import { describe, expect, it } from 'vitest'
import { footerPlacement } from './FooterGate'

describe('footerPlacement', () => {
  it.each([
    '/docs/reference',
    '/docs/config',
    '/docs/roles/security',
    '/docs/actions',
    '/docs/rings/ring-1',
    '/docs/cli'
  ])('places the footer in the docs content pane for %s', (pathname) => {
    expect(footerPlacement(pathname)).toBe('content')
  })

  it('keeps the standalone state-machine footer at site level', () => {
    expect(footerPlacement('/docs/state-machine')).toBe('site')
  })

  it('keeps the full-viewport harness footerless', () => {
    expect(footerPlacement('/docs/harness')).toBe('hidden')
  })

  it('keeps ordinary site routes on the site-level footer', () => {
    expect(footerPlacement('/roadmap')).toBe('site')
  })
})
