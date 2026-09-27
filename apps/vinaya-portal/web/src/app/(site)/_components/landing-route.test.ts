import { describe, expect, it } from 'vitest'
import { isLandingRoute } from './landing-route'

describe('isLandingRoute', () => {
  it('treats the root path as landing', () => {
    expect(isLandingRoute('/')).toBe(true)
  })

  it("treats Next's internal /index name for the root page as landing", () => {
    expect(isLandingRoute('/index')).toBe(true)
  })

  it.each(['', '/roadmap', '/compare', '/docs/harness', '/docs/state-machine', '/index/more', '/indexes'])(
    'keeps %s off the landing route',
    (pathname) => {
      expect(isLandingRoute(pathname)).toBe(false)
    }
  )
})
