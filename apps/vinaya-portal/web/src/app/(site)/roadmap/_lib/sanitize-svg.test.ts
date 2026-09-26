// @vitest-environment node
// Node, not jsdom: production runs the sanitizer in Next's Node server runtime,
// where isomorphic-dompurify builds its own jsdom window. A jsdom test
// environment would hand it the test's window instead.
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'

// `server-only` throws unconditionally on plain import — Next's bundler aliases
// it away in real server builds; under vitest it must be stubbed.
vi.mock('server-only', () => ({}))

const { sanitizeSvg } = await import('./sanitize-svg')

// Two real marks as uploaded to Sanity: one exercising `pathLength` /
// `stroke-dasharray` / `mm-run`, one exercising the `--mm-d` travel distance.
const REVIEW_MARK = `<svg class="mm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" fill="none" color="inherit" role="img" aria-label="Vinaya 0.22.0 — review that answers itself">
  <rect x="0" y="0" width="400" height="300" fill="var(--primary, currentColor)" opacity="0.07"></rect>
  <path d="M198 120 V60 H37 V132" fill="none" stroke="var(--primary, currentColor)" stroke-width="9" pathLength="100" stroke-dasharray="26 74" style="animation:mm-run 3.4s linear infinite"></path>
  <rect x="0" y="132" width="74" height="48" fill="var(--foreground, currentColor)" opacity="0.32" style="animation:mm-lock 3.4s ease-in-out 0.2s infinite"></rect>
</svg>`

const TASK_MARK = `<svg class="mm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300" fill="none">
  <rect x="0" y="120" width="88" height="40" fill="var(--foreground, currentColor)" style="--mm-d:300px;animation:mm-flow 3.6s linear 0s infinite"></rect>
  <rect x="0" y="230" width="400" height="24" fill="var(--primary, currentColor)" style="transform-box:fill-box;transform-origin:left;animation:mm-unfurl 3.6s ease-out infinite"></rect>
</svg>`

function parse(markup: string): Element {
  const doc = new JSDOM(`<div>${markup}</div>`).window.document
  const svg = doc.querySelector('svg')
  if (!svg) throw new Error('sanitized output carries no <svg>')
  return svg
}

describe('sanitizeSvg — a real mark survives intact', () => {
  it('keeps the root class, viewBox and the path-run attributes', () => {
    const svg = parse(sanitizeSvg(REVIEW_MARK))
    expect(svg.getAttribute('class')).toBe('mm')
    expect(svg.getAttribute('viewBox')).toBe('0 0 400 300')
    const run = svg.querySelector('path')
    expect(run?.getAttribute('pathLength')).toBe('100')
    expect(run?.getAttribute('stroke-dasharray')).toBe('26 74')
    expect(run?.getAttribute('stroke')).toBe('var(--primary, currentColor)')
    expect(run?.getAttribute('style')).toContain('animation:mm-run 3.4s linear infinite')
  })

  it('keeps the --mm-d travel distance with its unit, and transform-box/origin', () => {
    const [flow, unfurl] = Array.from(parse(sanitizeSvg(TASK_MARK)).querySelectorAll('rect'))
    expect(flow?.getAttribute('style')).toContain('--mm-d:300px')
    expect(flow?.getAttribute('style')).toContain('animation:mm-flow')
    expect(unfurl?.getAttribute('style')).toContain('transform-box:fill-box')
  })
})

describe('sanitizeSvg — a hostile SVG is neutralized', () => {
  const HOSTILE = `<svg class="mm" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 400 300" onload="alert(1)">
    <script>alert(2)</script>
    <style>body { display: none }</style>
    <foreignObject width="10" height="10"><div>x</div></foreignObject>
    <rect id="ok" width="10" height="10" onclick="alert(3)" onmouseover="alert(4)"></rect>
    <a href="javascript:alert(5)"><rect width="1" height="1"></rect></a>
    <use href="https://evil.example/sprite.svg#x"></use>
    <use xlink:href="data:image/svg+xml;base64,AAAA"></use>
    <a href="#ok"><rect width="1" height="1"></rect></a>
    <image href="https://evil.example/pixel.png" width="1" height="1"></image>
    <rect width="1" height="1" fill="url(https://evil.example/p.svg#g)"></rect>
    <rect width="1" height="1" style="background:url(https://evil.example/t.png)"></rect>
    <rect width="1" height="1" fill="url(#local)"></rect>
  </svg>`

  const out = sanitizeSvg(HOSTILE)

  it('removes script, style and foreignObject elements', () => {
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toMatch(/<style/i)
    expect(out).not.toMatch(/foreignObject/i)
    expect(out).not.toContain('display: none')
  })

  it('removes every on* event-handler attribute', () => {
    expect(out).not.toMatch(/\son[a-z]+=/i)
    expect(out).not.toContain('alert(')
  })

  it('removes javascript:, data: and external href/xlink:href references', () => {
    expect(out).not.toMatch(/javascript:/i)
    expect(out).not.toContain('data:image')
    expect(out).not.toContain('evil.example')
  })

  it('keeps same-document fragment references', () => {
    expect(out).toContain('href="#ok"')
    expect(out).toContain('fill="url(#local)"')
  })

  it('drops <use> outright — the SVG profile never allows it, local or remote', () => {
    expect(out).not.toMatch(/<use/i)
  })

  it('keeps the root class so the reduced-motion rule still matches', () => {
    expect(parse(out).getAttribute('class')).toBe('mm')
  })
})

// Payloads that DOMPurify alone lets through, because it does not look inside CSS:
// each one resolves to a remote fetch (or a page-covering overlay) in a browser.
describe('sanitizeSvg — CSS-level bypasses are closed', () => {
  const styleOf = (markup: string) => parse(sanitizeSvg(markup)).querySelector('rect')?.getAttribute('style') ?? null
  const wrap = (style: string) =>
    `<svg class="mm" xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1" style="${style}"></rect></svg>`

  it.each([
    ['CSS-escaped url()', 'background:\\75 rl(https://evil.example/a)'],
    ['backslash inside url', 'background:u\\rl(https://evil.example/a)'],
    ['line-continued url string', 'background:url(&quot;https://ev\\\nil.example/a&quot;)'],
    ['image-set()', 'background-image:image-set(&quot;https://evil.example/a.png&quot; 1x)'],
    ['-webkit-image-set()', 'background-image:-webkit-image-set(&quot;https://evil.example/a.png&quot; 1x)'],
    ['plain url()', 'background:url(https://evil.example/t.png)'],
    ['url() inside a custom property', '--mm-d:url(https://evil.example/a)']
  ])('drops %s from inline style', (_label, style) => {
    const out = styleOf(wrap(style))
    expect(out ?? '').not.toMatch(/evil|url|image-set|\\/i)
  })

  it('drops a page-covering overlay but keeps the motion declarations beside it', () => {
    const out = styleOf(
      wrap(
        'position:fixed;inset:0;z-index:2147483647;width:100vw!important;animation:mm-lock 3.4s ease-in-out 0.2s infinite'
      )
    )
    expect(out).toBe('animation:mm-lock 3.4s ease-in-out 0.2s infinite')
  })

  it('drops escaped or image-set references in presentation attributes', () => {
    const out = sanitizeSvg(
      `<svg xmlns="http://www.w3.org/2000/svg"><rect fill="\\75 rl(https://evil.example/a)"></rect><rect fill="url(  'https://evil.example/b')"></rect><rect fill="url(#ok)"></rect></svg>`
    )
    expect(out).not.toContain('evil.example')
    expect(out).toContain('fill="url(#ok)"')
  })
})

describe('sanitizeSvg — the mark cannot borrow the page CSS', () => {
  it('keeps only mm / mm-* class tokens, so utility classes cannot pull the root out of its card', () => {
    const svg = parse(
      sanitizeSvg(`<svg class="mm fixed inset-0 z-50 mm-hero" xmlns="http://www.w3.org/2000/svg"></svg>`)
    )
    expect(svg.getAttribute('class')).toBe('mm mm-hero')
  })

  it('drops a class made only of foreign tokens, and every id', () => {
    const out = sanitizeSvg(
      `<svg class="fixed inset-0" id="root" xmlns="http://www.w3.org/2000/svg"><rect id="a" class="h-screen" width="1" height="1"></rect></svg>`
    )
    expect(out).not.toMatch(/class=|id=/)
  })
})
