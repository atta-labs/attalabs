import type { BgState } from './types'

// ── Grid definition ───────────────────────────────────────────────────────────
// MARGIN extends the grid beyond each screen edge so displaced outer vertices
// never leave black gaps at the boundaries.
const MARGIN = 0.2
const COLS = 55
const ROWS = 35
const STRIDE = COLS + 1

interface GridVertex {
  bx: number
  by: number
}
const BASE_VERTS: GridVertex[] = []
for (let r = 0; r <= ROWS; r++)
  for (let c = 0; c <= COLS; c++)
    BASE_VERTS.push({
      bx: -MARGIN + (c / COLS) * (1 + 2 * MARGIN),
      by: -MARGIN + (r / ROWS) * (1 + 2 * MARGIN)
    })

// ── Ripple state ──────────────────────────────────────────────────────────────
interface Ripple {
  cx: number
  cy: number
  startT: number
  life: number
}
let ripples: Ripple[] = []

// ── Closing pulse state ───────────────────────────────────────────────────────
interface ClosingPulse {
  cx: number
  cy: number
  startT: number
  life: number
  frontColors: [string, string, string] // sphere colors sampled at spawn
}
let closingPulses: ClosingPulse[] = []

// Converts 'hsl(h s% l%)' → 'hsla(h, s%, l%, alpha)' for canvas gradient stops.
// Falls back to rgba white if the format doesn't match.
function withAlpha(color: string, alpha: number): string {
  const m = color.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*\)/)
  if (m) return `hsla(${m[1]}, ${m[2]}%, ${m[3]}%, ${alpha.toFixed(3)})`
  return `rgba(255,255,255,${alpha.toFixed(3)})`
}

// Reads --foreground CSS variable and returns an oklch color string with alpha.
// Handles two formats:
//   "0.145 0 0"           → channel values only  → oklch(0.145 0 0 / alpha)
//   "oklch(0.145 0 0)"    → full function string → oklch(0.145 0 0 / alpha)
function fgAt(alpha: number): string {
  if (typeof document === 'undefined') return `rgba(0,0,0,${alpha})`
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim()
  const inner = raw.match(/^oklch\(\s*(.+?)\s*\)$/)?.[1] ?? raw
  const channels = inner.replace(/none/gi, '0')
  return channels ? `oklch(${channels} / ${alpha.toFixed(3)})` : `rgba(0,0,0,${alpha})`
}

// ── Tron particle state ───────────────────────────────────────────────────────
// Particles enter from the grid border, travel along displaced grid edges,
// and leave a fading trail. Trail vertices store grid indices — screen positions
// are recomputed from pos[] each frame so the trail always tracks the fabric.
// Colors are sampled from sphere colors at spawn time — never hardcoded.

// Canonical edge key — normalizes vertex order so A→B and B→A share the same key.
// Module-level so it can be used at spawn time and during the advance loop.
function edgeKey(r1: number, c1: number, r2: number, c2: number): string {
  return r1 < r2 || (r1 === r2 && c1 < c2) ? `${r1},${c1},${r2},${c2}` : `${r2},${c2},${r1},${c1}`
}

interface TronParticle {
  r: number // current vertex row
  c: number // current vertex col
  targetR: number // next vertex row
  targetC: number // next vertex col
  progress: number // 0→1 along the current edge
  dr: number // current travel direction (row delta)
  dc: number // current travel direction (col delta)
  speed: number // progress per frame (0.05–0.09)
  color: string // sphere color sampled at spawn — always from agent sphere palette
  trail: Array<{ r: number; c: number }> // visible trail vertices (oldest first, capped)
  ownedEdges: Set<string> // every edge this particle has ever traversed (no cap)
  steps: number // edges traversed
}

const TRAIL_LEN = 22
let tronParticles: TronParticle[] = []

// ── Particle effects — crash explosion or sphere-join glow ────────────────────
// Spawned when a particle dies. Drawn independently for a short window.
interface ParticleEffect {
  x: number // screen position at death (base coords)
  y: number
  color: string
  startT: number
  type: 'crash' | 'join'
}
let particleEffects: ParticleEffect[] = []

export function renderFabricBg(state: BgState): void {
  const { ctx, t, W, H, settleProgress, rings, recentEvents } = state

  const CX = W / 2
  const CY = H / 2
  const RING_R = rings.length > 0 ? rings[0]!.radius : Math.min(W, H) * 0.24

  // ── Accumulate events ─────────────────────────────────────────────────────
  for (const evt of recentEvents) {
    if (evt.type === 'message-fired' && rings.length > 0) {
      const ring = rings[0]!
      ripples.push({ cx: ring.centerX, cy: ring.centerY, startT: t, life: 1 })
    }
    if (evt.type === 'ring-closed') {
      const cx = rings.length > 0 ? rings[0]!.centerX : CX
      const cy = rings.length > 0 ? rings[0]!.centerY : CY
      // Pick 3 sphere colors spread across the palette for the 3 wave fronts
      const sc = state.spheres
      const white = fgAt(1)
      const frontColors: [string, string, string] = [
        sc[0]?.color ?? white,
        sc[Math.floor(sc.length / 2)]?.color ?? white,
        sc[sc.length - 1]?.color ?? white
      ]
      closingPulses.push({ cx, cy, startT: t, life: 1, frontColors })
    }
  }

  ripples = ripples.filter((rp) => {
    rp.life = Math.max(0, 1 - (t - rp.startT) * 0.012)
    return rp.life > 0.01
  })
  closingPulses = closingPulses.filter((cp) => {
    cp.life = Math.max(0, 1 - (t - cp.startT) / 240)
    return cp.life > 0.01
  })

  // ── Tron particle spawn + advance ─────────────────────────────────────────
  // Color palette: sphere colors if spheres are registered, otherwise foreground.
  const { spheres } = state
  const palette = spheres.length > 0 ? spheres.map((s) => s.color) : [fgAt(1)]
  const pickColor = () => palette[Math.floor(Math.random() * palette.length)]!

  // Returns the approximate undisplaced screen position of a grid vertex.
  // Used for ring-avoidance checks before pos[] is computed this frame.
  const vertBasePos = (r: number, c: number) => ({
    x: (-MARGIN + (c / COLS) * (1 + 2 * MARGIN)) * W,
    y: (-MARGIN + (r / ROWS) * (1 + 2 * MARGIN)) * H
  })

  // Exclusion zone: slightly larger than the ring so particles never skim the edge
  const RING_EXCL = RING_R * 1.2
  const outsideRing = (r: number, c: number) => {
    const vb = vertBasePos(r, c)
    return Math.sqrt((vb.x - CX) ** 2 + (vb.y - CY) ** 2) > RING_EXCL
  }

  // Spawn from a random border vertex heading inward.
  // Very low rate — should be unusual to see 3 particles at once.
  // Discard if the first step already lands inside the ring exclusion zone.
  if (tronParticles.length < 3 && Math.random() < 0.007) {
    const edge = Math.floor(Math.random() * 4)
    let r: number
    let c: number
    let dr: number
    let dc: number
    if (edge === 0) {
      r = 0
      c = Math.floor(Math.random() * (COLS + 1))
      dr = 1
      dc = 0
    } else if (edge === 1) {
      r = ROWS
      c = Math.floor(Math.random() * (COLS + 1))
      dr = -1
      dc = 0
    } else if (edge === 2) {
      r = Math.floor(Math.random() * (ROWS + 1))
      c = 0
      dr = 0
      dc = 1
    } else {
      r = Math.floor(Math.random() * (ROWS + 1))
      c = COLS
      dr = 0
      dc = -1
    }
    if (outsideRing(r + dr, c + dc)) {
      tronParticles.push({
        r,
        c,
        targetR: r + dr,
        targetC: c + dc,
        progress: 0,
        dr,
        dc,
        speed: 0.05 + Math.random() * 0.04,
        color: pickColor(),
        trail: [],
        ownedEdges: new Set([edgeKey(r, c, r + dr, c + dc)]),
        steps: 0
      })
    }
  }

  // Union every particle's full edge history into one lookup set.
  // ownedEdges is unbounded (no TRAIL_LEN cap) so particles never re-enter
  // any edge they have ever traveled — including segments that have faded
  // off the visible trail.
  const claimedEdges = new Set<string>()
  for (const p of tronParticles) {
    for (const key of p.ownedEdges) claimedEdges.add(key)
  }

  // Advance particles along grid edges each frame
  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ]
  // Distance from a vertex's base position to a sphere's screen position.
  // Used for join detection and attraction steering.
  const vertDistToSphere = (r: number, c: number, sx: number, sy: number) => {
    const vb = vertBasePos(r, c)
    return Math.hypot(vb.x - sx, vb.y - sy)
  }

  // Radius within which a particle "joins" its matching sphere.
  // Sphere is at RING_R from center; RING_EXCL = 1.2×RING_R, so this
  // catches the closest exterior vertex (~0.3×RING_R away from the sphere).
  const JOIN_DIST = RING_R * 0.45

  tronParticles = tronParticles.filter((p) => {
    p.progress += p.speed
    if (p.progress >= 1) {
      // Arrived at target — record in trail (visual, capped) and ownedEdges (full history).
      const prevR = p.r
      const prevC = p.c
      p.trail.push({ r: prevR, c: prevC })
      if (p.trail.length > TRAIL_LEN) p.trail.shift()
      p.r = p.targetR
      p.c = p.targetC
      p.ownedEdges.add(edgeKey(prevR, prevC, p.r, p.c))
      p.progress -= 1
      p.steps++

      // ── Join: particle reached its matching sphere ───────────────────────
      const matchingSphere = spheres.find((s) => s.color === p.color)
      if (matchingSphere && vertDistToSphere(p.r, p.c, matchingSphere.x, matchingSphere.y) < JOIN_DIST) {
        particleEffects.push({ x: matchingSphere.x, y: matchingSphere.y, color: p.color, startT: t, type: 'join' })
        return false
      }

      // ── Candidates: three layers of filtering ────────────────────────────
      // rawCandidates  — all non-reversing, in-bounds directions (no ring/claim checks)
      // openCandidates — rawCandidates that land outside the ring exclusion zone
      // candidates     — openCandidates that aren't on a claimed edge (Tron rule)
      //
      // Separating them lets us correctly classify the death reason:
      //   rawCandidates  = 0 → truly at grid boundary → silent exit
      //   rawCandidates  > 0 → something blocked us (ring or claims) → crash
      const rawCandidates = dirs.filter(([nr, nc]) => {
        if (nr === -p.dr && nc === -p.dc) return false
        const nr2 = p.r + nr
        const nc2 = p.c + nc
        return nr2 >= 0 && nr2 <= ROWS && nc2 >= 0 && nc2 <= COLS
      })

      const openCandidates = rawCandidates.filter(([nr, nc]) => outsideRing(p.r + nr, p.c + nc))

      const candidates = openCandidates.filter(([nr, nc]) => !claimedEdges.has(edgeKey(p.r, p.c, p.r + nr, p.c + nc)))

      if (candidates.length === 0) {
        if (rawCandidates.length === 0) {
          // Truly at grid boundary corner — silent exit (particle left the screen)
          return false
        }
        // Blocked by ring exclusion zone or claimed edges → crash explosion
        const vb = vertBasePos(p.r, p.c)
        particleEffects.push({ x: vb.x, y: vb.y, color: p.color, startT: t, type: 'crash' })
        return false
      }

      // ── Direction: steer toward matching sphere when within influence ────
      let chosen: [number, number]
      if (matchingSphere) {
        const dToSphere = vertDistToSphere(p.r, p.c, matchingSphere.x, matchingSphere.y)
        if (dToSphere < RING_R * 1.8 && Math.random() < 0.72) {
          // Pick the candidate that moves closest to the sphere
          chosen = candidates.reduce((best, cand) => {
            const bd = vertDistToSphere(p.r + best[0]!, p.c + best[1]!, matchingSphere.x, matchingSphere.y)
            const cd = vertDistToSphere(p.r + cand[0]!, p.c + cand[1]!, matchingSphere.x, matchingSphere.y)
            return cd < bd ? cand : best
          })
        } else {
          const straight = candidates.find(([nr, nc]) => nr === p.dr && nc === p.dc)
          chosen =
            straight && Math.random() < 0.6 ? straight : candidates[Math.floor(Math.random() * candidates.length)]!
        }
      } else {
        const straight = candidates.find(([nr, nc]) => nr === p.dr && nc === p.dc)
        chosen = straight && Math.random() < 0.6 ? straight : candidates[Math.floor(Math.random() * candidates.length)]!
      }

      ;[p.dr, p.dc] = chosen
      p.targetR = p.r + p.dr
      p.targetC = p.c + p.dc
    }
    return true
  })

  // ── Displaced vertex positions ────────────────────────────────────────────
  const pos = BASE_VERTS.map((v) => {
    const x0 = v.bx * W
    const y0 = v.by * H
    const dx = x0 - CX
    const dy = y0 - CY
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
    const nx = dx / dist
    const ny = dy / dist

    // ── Unified wave — whole fabric moves as one piece ────────────────────
    // Low spatial frequency → all vertices nearly in phase → single-sheet undulation
    const phase = v.bx * 0.55 + v.by * 0.35 - t * 0.006
    const shimmerX = Math.sin(phase) * 1.8
    const shimmerY = Math.sin(phase + 0.7) * 1.8

    // ── Gravitational funnel — Gaussian profile peaked at RING_R ─────────
    //
    // Formula: pull(r) = PULL_MAX * u * exp(-u²/2)  where u = dist/RING_R
    //
    // Why Gaussian and not 1/(r+k):
    //   The Gaussian profile peaks at exactly r=RING_R, creating maximum
    //   fabric compression AT the ring edge — this is what the "planet on
    //   fabric" diagram looks like. Vertices both near center AND far away
    //   are nearly undisturbed; the steep curve is concentrated at the ring.
    //
    // Pull values (PULL_MAX = 0.55 * RING_R):
    //   r=0          (center):         pull = 0          — fabric flat inside
    //   r=0.5*RING_R (inner half):     pull ≈ 0.20*RING_R — mild inward compression
    //   r=RING_R     (ring edge):      pull ≈ 0.33*RING_R — maximum compression here
    //   r=2*RING_R   (outer region):   pull ≈ 0.10*RING_R — falling back to flat
    //   r=3*RING_R   (far edge):       pull ≈ 0.013*RING_R — nearly flat
    //
    // No-crossing: d(pull)/dr at r=0 = PULL_MAX/RING_R = 0.55 < 1 ✓
    const PULL_MAX = RING_R * 0.55
    const u = dist / RING_R
    const pull = settleProgress * PULL_MAX * u * Math.exp(-(u * u) / 2)

    // ── Message ripple displacement ───────────────────────────────────────
    let rippleDisp = 0
    for (const rp of ripples) {
      const rdx = x0 - rp.cx
      const rdy = y0 - rp.cy
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy)
      const waveFront = (t - rp.startT) * 4
      const envelope = Math.exp(-((rdist - waveFront) ** 2) / 2000)
      rippleDisp += envelope * rp.life * 4 * Math.sin(rdist * 0.04 - t * 0.05)
    }

    // ── Closing pulse — expanding energy wave from ring center ───────────
    // Fires once when the ring closes. A large circular wave expands outward
    // with multiple oscillation bands, decaying over ~4 seconds.
    let pulseX = 0
    let pulseY = 0
    for (const cp of closingPulses) {
      const pdx = x0 - cp.cx
      const pdy = y0 - cp.cy
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 0.001
      const pnx = pdx / pdist
      const pny = pdy / pdist

      const age = t - cp.startT
      // Three concentric wave fronts with different speeds — like rings on water
      const fronts = [
        { speed: 5, sigma: 90, amp: 28 },
        { speed: 3, sigma: 120, amp: 18 },
        { speed: 1.6, sigma: 150, amp: 12 }
      ]
      for (const f of fronts) {
        const waveFront = age * f.speed
        const envelope = Math.exp(-((pdist - waveFront) ** 2) / (f.sigma * f.sigma))
        // Oscillation: radial ripple in the wake of the wave front
        const osc = Math.sin(pdist * 0.025 - age * 0.12) * envelope * cp.life * f.amp
        // Radial push + small tangential swirl
        pulseX += pnx * osc - pny * osc * 0.15
        pulseY += pny * osc + pnx * osc * 0.15
      }
    }

    return {
      x: x0 - nx * pull + shimmerX - ny * rippleDisp + pulseX,
      y: y0 - ny * pull + shimmerY + nx * rippleDisp + pulseY
    }
  })

  // ── Draw grid lines ───────────────────────────────────────────────────────
  // Use --foreground via globalAlpha so it works on both dark and light themes.
  const BASE_ALPHA = 0.08
  ctx.save()
  ctx.strokeStyle = fgAt(1) // solid foreground — alpha controlled via globalAlpha below
  ctx.lineWidth = 0.7

  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath()
    for (let c = 0; c <= COLS; c++) {
      const p = pos[r * STRIDE + c]!
      c === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    const mid = 1 - Math.abs(r / ROWS - 0.5) * 1.4
    ctx.globalAlpha = BASE_ALPHA + Math.max(0, mid) * 0.03
    ctx.stroke()
  }

  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath()
    for (let r = 0; r <= ROWS; r++) {
      const p = pos[r * STRIDE + c]!
      r === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    const mid = 1 - Math.abs(c / COLS - 0.5) * 1.4
    ctx.globalAlpha = BASE_ALPHA + Math.max(0, mid) * 0.03
    ctx.stroke()
  }
  ctx.restore()

  // ── Draw Tron particles ───────────────────────────────────────────────────
  // Trail vertices are mapped to current screen positions each frame so they
  // always follow the displaced fabric — gravity, shimmer, and pulse included.
  ctx.save()
  ctx.lineCap = 'butt' // 'round' caps create visible dots at each segment join
  ctx.lineJoin = 'round'

  for (const p of tronParticles) {
    // Compute head screen position by interpolating on the current edge
    const curPos = pos[p.r * STRIDE + p.c]
    const tgtPos = pos[p.targetR * STRIDE + p.targetC]
    if (!curPos || !tgtPos) continue

    const headX = curPos.x + (tgtPos.x - curPos.x) * p.progress
    const headY = curPos.y + (tgtPos.y - curPos.y) * p.progress

    // Map trail grid vertices to current screen positions (tracks fabric live).
    // Also insert the current vertex (p.r/p.c) before the head so turns are
    // two clean perpendicular segments, not a diagonal that skips the corner.
    const pts: Array<{ x: number; y: number }> = []
    for (const v of p.trail) {
      const vp = pos[v.r * STRIDE + v.c]
      if (vp) pts.push(vp)
    }
    if (curPos) pts.push(curPos) // corner vertex — anchors the turn to the grid
    pts.push({ x: headX, y: headY }) // interpolated head on the current edge

    if (pts.length < 2) continue

    // Draw trail — segment by segment from tail to head with increasing alpha/width
    for (let i = 1; i < pts.length; i++) {
      const frac = i / pts.length // 0 near tail, 1 at head
      ctx.globalAlpha = frac * 0.28
      ctx.strokeStyle = p.color
      ctx.lineWidth = frac * 1.6
      ctx.beginPath()
      ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y)
      ctx.lineTo(pts[i]!.x, pts[i]!.y)
      ctx.stroke()
    }

    // Glowing sphere head — outer halo + bright core (mimics AIASphere ambient glow)
    const HEAD_R = 4
    const halo = ctx.createRadialGradient(headX, headY, 0, headX, headY, HEAD_R * 3)
    halo.addColorStop(0, withAlpha(p.color, 0.35))
    halo.addColorStop(0.45, withAlpha(p.color, 0.1))
    halo.addColorStop(1, withAlpha(p.color, 0))
    ctx.globalAlpha = 1
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(headX, headY, HEAD_R * 3, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 0.62
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(headX, headY, HEAD_R, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  // ── Draw particle effects (crash explosions + sphere-join glows) ──────────
  ctx.save()
  particleEffects = particleEffects.filter((fx) => {
    const duration = fx.type === 'crash' ? 22 : 32
    const progress = (t - fx.startT) / duration
    if (progress >= 1) return false
    const ease = 1 - (1 - progress) ** 2 // ease-out

    if (fx.type === 'crash') {
      // Expanding ring burst
      const radius = ease * 22
      ctx.globalAlpha = (1 - progress) * 0.65
      ctx.strokeStyle = fx.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      // Inner flash
      ctx.globalAlpha = (1 - progress) * 0.35
      ctx.fillStyle = fx.color
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, radius * 0.45, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // Join: radial glow absorbed into sphere
      const radius = ease * 14
      const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius)
      grad.addColorStop(0, withAlpha(fx.color, (1 - progress) * 0.85))
      grad.addColorStop(1, withAlpha(fx.color, 0))
      ctx.globalAlpha = 1
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    return true
  })
  ctx.restore()

  // ── Closing pulse glow rings ──────────────────────────────────────────────
  // Three wave fronts expanding from center — colors from sphere palette.
  const PULSE_FRONTS = [
    { speed: 5, sigma: 65 },
    { speed: 3, sigma: 80 },
    { speed: 1.6, sigma: 100 }
  ]
  const maxScreen = Math.sqrt(W * W + H * H)

  for (const cp of closingPulses) {
    const age = t - cp.startT
    ctx.save()
    for (let fi = 0; fi < PULSE_FRONTS.length; fi++) {
      const f = PULSE_FRONTS[fi]!
      const wf = age * f.speed
      if (wf < 0 || wf - f.sigma > maxScreen) continue

      const innerR = Math.max(0, wf - f.sigma)
      const outerR = wf + f.sigma
      const color = cp.frontColors[fi]!
      const alpha = cp.life * 0.14 * (1 - fi * 0.03)

      const grad = ctx.createRadialGradient(cp.cx, cp.cy, innerR, cp.cx, cp.cy, outerR)
      grad.addColorStop(0, withAlpha(color, 0))
      grad.addColorStop(0.5, withAlpha(color, alpha))
      grad.addColorStop(1, withAlpha(color, 0))

      ctx.globalAlpha = 1
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cp.cx, cp.cy, outerR, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  // Halo brightens near ring edge as fabric curves inward
  if (settleProgress > 0.05) {
    const g = ctx.createRadialGradient(CX, CY, RING_R * 0.7, CX, CY, RING_R * 1.4)
    g.addColorStop(0, fgAt(0))
    g.addColorStop(0.5, fgAt(0.04 * settleProgress))
    g.addColorStop(1, fgAt(0))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
}
