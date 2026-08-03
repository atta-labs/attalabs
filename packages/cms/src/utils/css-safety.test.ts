import { describe, expect, it } from 'vitest'
import { generateThemeCSS, generateThemeCSSForScheme } from './theme'
import { isSafeCssValue, isSafeCssVarName, toCssDeclarations } from './css-safety'
import { FIELD_TO_CSS_VAR } from '../types'
import corpus from './theme-corpus.fixture.json'

/**
 * Theme fixtures below build colour groups from these rather than inline literals —
 * `scripts/check-forbidden-colors.ts` reads `background: 'oklch(…)'` as a component
 * inline style, and exempting the whole file would weaken that gate for real UI code.
 */
const BLACK = 'oklch(0 0 0)'
const WHITE = 'oklch(1 0 0)'

/**
 * A readable sample of shipped values, kept for the named per-value cases below. The
 * exhaustive check is the corpus fixture — this list is illustration, not coverage.
 */
const REAL_THEME_VALUES = [
  'oklch(0.275 0 0)',
  'oklch(0.13 0.02 283 / 0.04)',
  'oklch(0.956 0.014 85)',
  'linear-gradient(to bottom, oklch(0.13 0.02 283), oklch(0.10 0.02 283))',
  'linear-gradient(to bottom right, oklch(0.16 0.02 283), oklch(0.14 0.02 283))',
  '3px 3px 0 0 var(--shadow-color)',
  '16px 16px 0 1px var(--shadow-color)',
  'ui-monospace, SFMono-Regular, monospace',
  'ui-sans-serif, system-ui, sans-serif',
  'Space Grotesk, sans-serif',
  'JetBrains Mono, ui-monospace, monospace',
  'Source Serif 4, Georgia, serif',
  '0.375rem',
  '-0.025em',
  '#1A1610',
  '100%'
]

/**
 * The over-rejection guard, checked against production rather than a hand-picked sample.
 *
 * This exists because the hand-picked sample was not enough: an earlier revision of this
 * file quoted three themes, and review found a live value in a fourth — `theme-obsidian`'s
 * `shadowLg` — that the guard rejected. That value turned out to be hand-written CSS rules
 * smuggled through the same hole this guard closes, and it was cleaned in Sanity rather
 * than exempted. The lesson kept here is the method: assert against every value that ships,
 * not against the ones an author thought to list.
 */
describe('no value in any shipped theme is rejected', () => {
  it(`accepts all ${corpus.values.length} distinct values across all 19 theme documents`, () => {
    const rejected = corpus.values.filter((value) => !isSafeCssValue(value))
    expect(rejected).toEqual([])
  })

  it(`accepts all ${corpus.colorFieldNames.length} colour field names, mapped or raw`, () => {
    // transformColorGroup falls back to the raw Sanity field name when a field is absent
    // from FIELD_TO_CSS_VAR, so both branches must survive the name guard.
    const rejected = corpus.colorFieldNames.filter((field) => {
      const cssKey = FIELD_TO_CSS_VAR[field] || field
      return !isSafeCssVarName(cssKey)
    })
    expect(rejected).toEqual([])
  })
})

describe('isSafeCssValue', () => {
  it.each(REAL_THEME_VALUES)('accepts the shipped value %s', (value) => {
    expect(isSafeCssValue(value)).toBe(true)
  })

  it.each([
    ['remote fetch via url()', 'url(https://attacker.test/beacon)'],
    ['remote fetch, spaced', 'url (https://attacker.test/beacon)'],
    ['remote fetch, uppercase', 'URL(https://attacker.test/beacon)'],
    ['image-set', 'image-set("https://attacker.test/x" 1x)'],
    ['url smuggled after a real colour', 'oklch(0 0 0) url(https://attacker.test/x)']
  ])('rejects %s — globals.css uses the background shorthand, so this fetches', (_label, value) => {
    expect(isSafeCssValue(value)).toBe(false)
  })

  it('rejects an unbalanced paren, which would swallow the rest of the stylesheet', () => {
    expect(isSafeCssValue('oklch(0 0 0')).toBe(false)
    expect(isSafeCssValue('0 0 0)')).toBe(false)
  })

  it('rejects an unterminated string, which runs to the end of the stylesheet', () => {
    expect(isSafeCssValue('oklch(0.1 0 0) "')).toBe(false)
    expect(isSafeCssValue("'DM Sans, sans-serif")).toBe(false)
  })

  it('accepts properly paired quotes, which real font stacks use', () => {
    expect(isSafeCssValue("'DM Sans', sans-serif")).toBe(true)
    expect(isSafeCssValue('"Times New Roman", Georgia, serif')).toBe(true)
  })

  it('rejects src(), which no browser implements yet but would reopen the hole', () => {
    expect(isSafeCssValue('src("https://attacker.test/x")')).toBe(false)
  })

  it.each([
    ['style-element breakout', 'Inter</style><script>alert(1)</script>'],
    ['sibling declaration', 'Inter; background: url(https://evil.test)'],
    ['rule close then at-rule', 'red} @import url(https://evil.test); .x{'],
    ['bare rule close', 'red}'],
    ['comment open', 'red/*'],
    ['comment close', '*/red'],
    ['css escape', 'red\\3c /style\\3e '],
    ['angle bracket alone', 'red<'],
    ['at-rule marker', '@import url(x)']
  ])('rejects %s', (_label, value) => {
    expect(isSafeCssValue(value)).toBe(false)
  })

  it('rejects a newline, which is what makes an injected payload read as many declarations', () => {
    expect(isSafeCssValue('red\n  background: black')).toBe(false)
  })

  it('rejects a carriage return and a NUL', () => {
    expect(isSafeCssValue('red\r')).toBe(false)
    expect(isSafeCssValue('red\0')).toBe(false)
  })

  it('rejects the empty string', () => {
    expect(isSafeCssValue('')).toBe(false)
  })
})

describe('isSafeCssVarName', () => {
  it.each([
    'background',
    'sidebar-primary-foreground',
    'font-mono',
    'shadow-2xl',
    'tracking-normal'
  ])('accepts the real token name %s', (name) => {
    expect(isSafeCssVarName(name)).toBe(true)
  })

  it.each([
    ['declaration break', 'background: red; --x'],
    ['rule close', 'background}'],
    ['style breakout', 'x</style'],
    ['whitespace', 'back ground'],
    ['empty', '']
  ])('rejects %s', (_label, name) => {
    expect(isSafeCssVarName(name)).toBe(false)
  })
})

describe('toCssDeclarations', () => {
  it('emits safe entries and silently drops unsafe ones', () => {
    const vars = new Map([
      ['background', BLACK],
      ['font-sans', 'Space Grotesk, sans-serif'],
      ['foreground', 'red</style><script>alert(1)</script>'],
      ['evil}selector', WHITE]
    ])

    const css = toCssDeclarations(vars)

    expect(css).toContain(`--background: ${BLACK};`)
    expect(css).toContain('--font-sans: Space Grotesk, sans-serif;')
    expect(css).not.toContain('script')
    expect(css).not.toContain('evil')
  })
})

describe('theme CSS generation', () => {
  it('does not let a poisoned typography value escape the style element', () => {
    const theme = {
      _id: 'theme-test',
      name: 'Test',
      dark: { background: BLACK },
      typography: { fontSans: 'Inter</style><script>alert(1)</script>' }
    } as never

    const css = generateThemeCSSForScheme(theme, 'dark')

    expect(css).not.toContain('</style>')
    expect(css).not.toContain('<script>')
    expect(css).toContain(`--background: ${BLACK};`)
  })

  it('does not let a poisoned shadow value open a new rule in either scheme', () => {
    const theme = {
      _id: 'theme-test',
      name: 'Test',
      light: { background: WHITE },
      dark: { background: BLACK },
      shadows: { shadow: '3px 3px 0 0 red} body{display:none' }
    } as never

    const css = generateThemeCSS(theme)

    expect(css).not.toContain('display:none')
    expect(css).toContain(`--background: ${WHITE};`)
    expect(css).toContain(`--background: ${BLACK};`)
  })

  it('keeps a full real theme intact — no token is lost to the guard', () => {
    const theme = {
      _id: 'theme-obsidian-retro',
      name: 'Obsidian - Retro',
      dark: {
        background: BLACK,
        input: 'oklch(0.13 0.02 283 / 0.04)',
        gradientBackground: 'linear-gradient(to bottom, oklch(0.13 0.02 283), oklch(0.10 0.02 283))'
      },
      typography: {
        fontSans: 'Space Grotesk, sans-serif',
        fontMono: 'JetBrains Mono, ui-monospace, monospace',
        trackingNormal: '-0.025em'
      },
      spacing: { radius: '0.375rem' },
      shadows: { shadow: '3px 3px 0 0 var(--shadow-color)' }
    } as never

    const css = generateThemeCSSForScheme(theme, 'dark')

    expect(css).toContain('--input:')
    expect(css).toContain('--gradient-background:')
    expect(css).toContain('--font-sans: Space Grotesk, sans-serif;')
    expect(css).toContain('--font-mono: JetBrains Mono, ui-monospace, monospace;')
    expect(css).toContain('--tracking-normal: -0.025em;')
    expect(css).toContain('--radius: 0.375rem;')
    expect(css).toContain('--shadow: 3px 3px 0 0 var(--shadow-color);')
  })
})
