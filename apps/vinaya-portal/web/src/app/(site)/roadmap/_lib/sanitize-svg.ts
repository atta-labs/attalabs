import 'server-only'
import DOMPurify, { type UponSanitizeAttributeHook } from 'isomorphic-dompurify'

// A roadmap card's artwork is an SVG an editor uploaded to Sanity, inlined
// into the page's own DOM (an `<img>` is a separate document, so the mark could
// never read `--primary`/`--foreground` or run `marks-motion.css`'s keyframes).
// Inlining CMS markup is an injection surface, so it is sanitized here, on the
// server, before it ever reaches the client component that renders it.
//
// DOMPurify's SVG profile is the element/attribute allowlist: it keeps `class`
// (the root's `mm`, which the reduced-motion rule targets), `style`, `viewBox`,
// `pathLength`, `stroke-dasharray` and the presentation attributes, and drops
// `<script>`, every `on*` handler, `<use>` and `<foreignObject>`. It does not
// look inside CSS, so three things are closed here:
//
// - `<style>`: an SVG `<style>` inlined into the page applies to the WHOLE page,
//   not just the mark — forbidden outright.
// - Inline `style`: reduced to an allowlist of the declarations the marks
//   actually use (their motion), with plain values only — no function call, no
//   quote, no backslash escape, no `!important`. That rules out every external
//   load (`url()`, `image-set()`, and escaped spellings of either) and any
//   layout escape (`position:fixed`, `z-index`) that could cover the page.
// - `class`: reduced to the marks' own `mm`/`mm-*` tokens. Any other class would
//   pick up the site's utility CSS — `fixed inset-0 z-50` on the root turns a mark
//   into a page-covering overlay without a single style declaration. `id` is
//   dropped outright: the marks never use one, and a surviving id could collide
//   with, or be targeted by, the page's own.
// - Presentation attributes and `href`/`xlink:href`: may only reference a
//   same-document fragment (`#id`); anything escaped, or naming any other
//   resource, drops the attribute.
const STYLE_PROPERTY = /^(?:animation(?:-[a-z]+)*|transform-box|transform-origin|opacity|--mm-[a-z0-9-]+)$/
const STYLE_VALUE = /^[a-z0-9 .,%-]+$/i
const MARK_CLASS = /^mm(?:-[a-z0-9-]+)?$/
const FRAGMENT_ONLY_ATTRS = new Set(['href', 'xlink:href'])
const URL_OPEN = /url\s*\(\s*['"]?\s*/gi
const FORBIDDEN_IN_ATTR = /\\|image-set|@import|expression\s*\(/i

function sanitizeStyle(style: string): string {
  return style
    .split(';')
    .map((declaration) => {
      const colon = declaration.indexOf(':')
      if (colon === -1) return null
      const property = declaration.slice(0, colon).trim().toLowerCase()
      const value = declaration.slice(colon + 1).trim()
      return STYLE_PROPERTY.test(property) && STYLE_VALUE.test(value) ? `${property}:${value}` : null
    })
    .filter((declaration): declaration is string => declaration !== null)
    .join(';')
}

function referencesOnlyFragments(value: string): boolean {
  if (FORBIDDEN_IN_ATTR.test(value)) return false
  for (const match of value.matchAll(URL_OPEN)) {
    if (value[match.index + match[0].length] !== '#') return false
  }
  return true
}

const sanitizeAttribute: UponSanitizeAttributeHook = (_node, data) => {
  const name = data.attrName.toLowerCase()
  const value = data.attrValue
  if (name === 'id') {
    data.keepAttr = false
    return
  }
  if (name === 'class') {
    const tokens = value.split(/\s+/).filter((token) => MARK_CLASS.test(token))
    if (tokens.length > 0) data.attrValue = tokens.join(' ')
    else data.keepAttr = false
    return
  }
  if (name === 'style') {
    const safe = sanitizeStyle(value)
    if (safe) data.attrValue = safe
    else data.keepAttr = false
    return
  }
  if (FRAGMENT_ONLY_ATTRS.has(name) && !value.trim().startsWith('#')) {
    data.keepAttr = false
    return
  }
  if (!referencesOnlyFragments(value)) data.keepAttr = false
}

export function sanitizeSvg(markup: string): string {
  DOMPurify.addHook('uponSanitizeAttribute', sanitizeAttribute)
  try {
    return DOMPurify.sanitize(markup, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['style', 'foreignObject', 'script']
    })
  } finally {
    // The instance is module-global; the hook is scoped to this one synchronous call,
    // and removed by reference so no other caller's hook is touched.
    DOMPurify.removeHook('uponSanitizeAttribute', sanitizeAttribute)
  }
}
