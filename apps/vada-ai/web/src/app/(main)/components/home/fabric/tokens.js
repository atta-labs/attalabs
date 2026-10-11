/* Theme-token readers, copied verbatim from Vinaya Portal's hero-canvas/harness-model.js. */
function oklchToHex(str) {
  /* `none` is a legal component (CSS Color 4: it reads as 0). The CMS writes every
     achromatic colour — white, black, any grey — with a `none` hue (@atta/cms's
     cssColorToOklch), so a theme applied at runtime (/?preview=true) hands us e.g.
     `oklch(1 0 none)` for --background. */
  const m = str.trim().match(/^oklch\(\s*([\d.]+%?|none)\s+([\d.]+%?|none)\s+([\d.]+|none)/i)
  if (!m) return null
  const num = (v) => (v.toLowerCase() === 'none' ? 0 : Number.parseFloat(v))
  const L = m[1].endsWith('%') ? num(m[1]) / 100 : num(m[1])
  const C = m[2].endsWith('%') ? (num(m[2]) / 100) * 0.4 : num(m[2])
  const h = (num(m[3]) * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const mm = m_ ** 3
  const s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s
  ]
  const enc = (u) => {
    const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.max(u, 0) ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(v * 255)))
  }
  const [r, g, bl] = lin.map(enc)
  return (r << 16) | (g << 8) | bl
}
/* Resolve a CSS custom property to a hex colour THROUGH the cascade: a probe element under
   `root` gets `color: var(name)`, and its computed `color` comes back as a concrete colour
   even when the variable is a color-mix() — which getPropertyValue() would hand back as
   unresolved text. Used for the hero-scoped ramp targets in hero-core.css. */
function probeColor(root, name) {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  root.appendChild(probe)
  const raw = getComputedStyle(probe).color.trim()
  probe.remove()
  let hex = oklchToHex(raw)
  if (hex == null) {
    const rgb = raw.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
    const srgb = raw.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i)
    const c = rgb
      ? rgb.slice(1, 4).map((v) => Math.round(Number.parseFloat(v)))
      : srgb
        ? srgb.slice(1, 4).map((v) => Math.round(Number.parseFloat(v) * 255))
        : null
    if (c) hex = (c[0] << 16) | (c[1] << 8) | c[2]
  }
  return { hex, raw }
}
export function cssColor(root, name) {
  const { hex, raw } = probeColor(root, name)
  if (hex == null) throw new Error(`design token ${name} did not resolve to a colour (${raw})`)
  return hex
}
/* a plain numeric custom property (a strength, not a colour), read off `root`'s cascade */
export function cssNumber(root, name) {
  const raw = getComputedStyle(root).getPropertyValue(name).trim()
  const v = Number.parseFloat(raw)
  if (!Number.isFinite(v)) throw new Error(`design token ${name} did not resolve to a number (${raw})`)
  return v
}
/* A root design token as a hex colour, or null while it can't be read — an admin preview
   frame (/?preview=true) paints the theme onto <html> at runtime, after first mount.
   An authored oklch() is parsed directly; any other authored form (hex, rgb(), a var()
   chain) goes through the cascade probe. An unset token stays null: a probe of an
   undefined var() would silently inherit the surrounding text colour. */
export function readToken(name) {
  const root = document.documentElement
  const raw = getComputedStyle(root).getPropertyValue(name).trim()
  if (!raw) return null
  const hex = oklchToHex(raw)
  if (hex != null) return hex
  return probeColor(document.body ?? root, name).hex
}
