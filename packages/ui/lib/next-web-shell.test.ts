import { describe, expect, it } from 'vitest'
import { buildColorSchemeCorrectionScript } from './next-web-shell'

/**
 * `<html>`'s `data-theme` attribute is an ancestor of any Suspense boundary
 * NextWebShell could render, so under the `staticColorScheme` path it is
 * baked into the static shell with a CMS/DEFAULT_SCHEME fallback rather than
 * the request's cookie. This script is what corrects it client-side, before
 * first paint — these tests run it against a fake `document` the same way a
 * browser would, rather than just asserting on its source text.
 */
function run(script: string, cookie: string) {
  let attribute: string | undefined
  let value: string | undefined
  const fakeDocument = {
    cookie,
    documentElement: {
      setAttribute(name: string, v: string) {
        attribute = name
        value = v
      }
    }
  }
  new Function('document', script)(fakeDocument)
  return { attribute, value }
}

describe('buildColorSchemeCorrectionScript', () => {
  it('is syntactically valid standalone JS', () => {
    expect(() => new Function(buildColorSchemeCorrectionScript('vinaya-color-scheme', 'data-theme'))).not.toThrow()
  })

  it('corrects the attribute when the cookie overrides to light', () => {
    const script = buildColorSchemeCorrectionScript('vinaya-color-scheme', 'data-theme')
    expect(run(script, 'vinaya-color-scheme=light')).toEqual({ attribute: 'data-theme', value: 'light' })
  })

  it('corrects the attribute when the cookie overrides to dark', () => {
    const script = buildColorSchemeCorrectionScript('vinaya-color-scheme', 'data-theme')
    expect(run(script, 'foo=1; vinaya-color-scheme=dark; bar=2')).toEqual({ attribute: 'data-theme', value: 'dark' })
  })

  it('does nothing when the cookie is absent', () => {
    const script = buildColorSchemeCorrectionScript('vinaya-color-scheme', 'data-theme')
    expect(run(script, 'other=1')).toEqual({ attribute: undefined, value: undefined })
  })

  it('does nothing when the cookie value is neither light nor dark', () => {
    const script = buildColorSchemeCorrectionScript('vinaya-color-scheme', 'data-theme')
    expect(run(script, 'vinaya-color-scheme=purple')).toEqual({ attribute: undefined, value: undefined })
  })

  it('escapes a cookie name containing regex-special characters', () => {
    const script = buildColorSchemeCorrectionScript('a.b+c', 'data-theme')
    expect(run(script, 'a.b+c=light')).toEqual({ attribute: 'data-theme', value: 'light' })
    // A cookie named e.g. "aXbc" must NOT match the escaped "a.b+c" pattern —
    // proves the name is escaped, not interpolated as a live regex.
    expect(run(script, 'aXbc=dark')).toEqual({ attribute: undefined, value: undefined })
  })
})
