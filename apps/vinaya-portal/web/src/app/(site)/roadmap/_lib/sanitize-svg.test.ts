// @vitest-environment jsdom
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

function parse(markup: string): SVGSVGElement {
  const doc = new DOMParser().parseFromString(`<div>${markup}</div>`, 'text/html')
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
