export interface ShadowScaleOpts {
  intensity: number
  area: number
}

export function scaleShadow(shadowCss: string, opts: ShadowScaleOpts): string {
  const trimmed = shadowCss.trim()
  if (!trimmed) return shadowCss

  const parts = splitTopLevel(trimmed)
  if (parts.length === 0) return shadowCss

  return parts.map((part) => scaleOneShadow(part, opts)).join(', ')
}

export function scaleShadows(shadows: Record<string, string>, opts: ShadowScaleOpts): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(shadows)) {
    if (typeof v === 'string' && v.length > 0) {
      out[k] = scaleShadow(v, opts)
    }
  }
  return out
}

function splitTopLevel(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      out.push(input.slice(start, i).trim())
      start = i + 1
    }
  }
  const tail = input.slice(start).trim()
  if (tail) out.push(tail)
  return out
}

function scaleOneShadow(shadow: string, { intensity, area }: ShadowScaleOpts): string {
  const tokens = tokenizeShadow(shadow)
  const lengthIdx: number[] = []
  let colorIdx = -1

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!
    if (isLength(t)) lengthIdx.push(i)
    else if (isColor(t)) colorIdx = i
  }

  if (lengthIdx.length >= 3) {
    const blurPos = lengthIdx[2]!
    tokens[blurPos] = scaleLength(tokens[blurPos]!, area)
  }

  if (colorIdx >= 0) {
    tokens[colorIdx] = scaleColorAlpha(tokens[colorIdx]!, intensity)
  }

  return tokens.join(' ')
}

function tokenizeShadow(input: string): string[] {
  const out: string[] = []
  let depth = 0
  let buf = ''
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (ch === '(') depth++
    else if (ch === ')') depth--
    if (/\s/.test(ch) && depth === 0) {
      if (buf) {
        out.push(buf)
        buf = ''
      }
    } else {
      buf += ch
    }
  }
  if (buf) out.push(buf)
  return out
}

function isLength(tok: string): boolean {
  return /^-?(\d+\.?\d*|\.\d+)(px|rem|em|%)?$/.test(tok)
}

function isColor(tok: string): boolean {
  return (
    tok.startsWith('#') ||
    tok.startsWith('rgb(') ||
    tok.startsWith('rgba(') ||
    tok.startsWith('hsl(') ||
    tok.startsWith('hsla(') ||
    tok.startsWith('oklch(') ||
    tok.startsWith('oklab(')
  )
}

function scaleLength(tok: string, factor: number): string {
  const m = tok.match(/^(-?\d+\.?\d*|\.\d+)(px|rem|em|%)?$/)
  if (!m) return tok
  const n = Number.parseFloat(m[1]!)
  const unit = m[2] ?? ''
  const scaled = Math.max(0, n * factor)
  const rounded = scaled.toFixed(2).replace(/\.?0+$/, '')
  return `${rounded}${unit}`
}

function scaleColorAlpha(tok: string, factor: number): string {
  const fnMatch = tok.match(/^(rgba?|hsla?|oklch|oklab)\(([^)]+)\)$/i)
  if (fnMatch) {
    const fn = fnMatch[1]!.toLowerCase()
    const body = fnMatch[2]!
    const slashIdx = body.indexOf('/')

    if (slashIdx >= 0) {
      const head = body.slice(0, slashIdx).trim()
      const a = clamp01(Number.parseFloat(body.slice(slashIdx + 1)) * factor)
      return `${fn}(${head} / ${formatAlpha(a)})`
    }

    if (body.includes(',')) {
      const parts = body.split(',').map((p) => p.trim())
      if (parts.length === 3) parts.push('1')
      if (parts.length === 4) {
        const a = clamp01(Number.parseFloat(parts[3]!) * factor)
        return `${fn}(${parts[0]!}, ${parts[1]!}, ${parts[2]!}, ${formatAlpha(a)})`
      }
      return tok
    }

    if (factor >= 1) return tok
    return `${fn}(${body.trim()} / ${formatAlpha(clamp01(factor))})`
  }

  if (tok.startsWith('#') && (tok.length === 7 || tok.length === 9)) {
    const r = tok.slice(1, 3)
    const g = tok.slice(3, 5)
    const b = tok.slice(5, 7)
    const aHex = tok.length === 9 ? tok.slice(7, 9) : 'ff'
    const aNum = clamp01((Number.parseInt(aHex, 16) / 255) * factor)
    const aOut = Math.round(aNum * 255)
      .toString(16)
      .padStart(2, '0')
    return `#${r}${g}${b}${aOut}`
  }

  return tok
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function formatAlpha(a: number): string {
  return a.toFixed(3).replace(/\.?0+$/, '')
}
