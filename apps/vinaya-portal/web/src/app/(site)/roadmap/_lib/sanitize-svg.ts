import 'server-only'
import DOMPurify from 'isomorphic-dompurify'

// A roadmap card's artwork is an SVG an editor uploaded to Sanity, inlined
// into the page's own DOM (an `<img>` is a separate document, so the mark could
// never read `--primary`/`--foreground` or run `marks-motion.css`'s keyframes).
// Inlining CMS markup is an injection surface, so it is sanitized here, on the
// server, before it ever reaches the client component that renders it.
//
// DOMPurify's SVG profile is the allowlist: it keeps `class` (the root's `mm`,
// which the reduced-motion rule targets), inline `style` (the `animation:` and
// `--mm-d` declarations), `viewBox`, `pathLength`, `stroke-dasharray` and the
// presentation attributes, and it drops `<script>`, every `on*` handler and
// `<foreignObject>`. Two things it would still let through are closed here:
//
// - `<style>`: an SVG `<style>` inlined into the page applies to the WHOLE page,
//   not just the mark — forbidden outright.
// - External references: `href`/`xlink:href`, and any `url(...)` inside an
//   attribute or inline style, may only point at a same-document fragment
//   (`#id`). Anything else would let the artwork load a remote resource.
const FRAGMENT_ONLY_ATTRS = new Set(['href', 'xlink:href'])
const URL_REF = /url\(\s*(['"]?)(.*?)\1\s*\)/gi

function referencesOnlyFragments(value: string): boolean {
  for (const match of value.matchAll(URL_REF)) {
    if (!match[2]?.startsWith('#')) return false
  }
  return !/@import|expression\s*\(/i.test(value)
}

export function sanitizeSvg(markup: string): string {
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    const value = data.attrValue
    if (FRAGMENT_ONLY_ATTRS.has(data.attrName.toLowerCase()) && !value.trim().startsWith('#')) {
      data.keepAttr = false
      return
    }
    if (!referencesOnlyFragments(value)) data.keepAttr = false
  })
  try {
    return DOMPurify.sanitize(markup, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ['style', 'foreignObject', 'script']
    })
  } finally {
    // The instance is module-global; the hook is scoped to this one synchronous call.
    DOMPurify.removeHook('uponSanitizeAttribute')
  }
}
