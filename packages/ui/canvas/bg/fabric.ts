import type { BgState } from './types'
import { brightenForLight, fgAt, withAlpha } from '../shared/color-math'
import { isLightTheme, refreshThemeCache } from '../shared/theme'
import { paintParticleHead } from '../shared/paint'

// ── Grid definition ───────────────────────────────────────────────────────────
// MARGIN extends the grid beyond each screen edge so displaced outer vertices
// never leave black gaps at the boundaries.
const MARGIN = 0.2
const COLS = 55
const ROWS = 35
const STRIDE = COLS + 1

// Fine grid — same layout at 2× density for a layered double-square effect.
const COLS2 = 110
const ROWS2 = 70
const STRIDE2 = COLS2 + 1

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

const BASE_VERTS2: GridVertex[] = []
for (let r = 0; r <= ROWS2; r++)
  for (let c = 0; c <= COLS2; c++)
    BASE_VERTS2.push({
      bx: -MARGIN + (c / COLS2) * (1 + 2 * MARGIN),
      by: -MARGIN + (r / ROWS2) * (1 + 2 * MARGIN)
    })

// ── Ripple state ──────────────────────────────────────────────────────────────
interface Ripple {
  cx: number
  cy: number
  startT: number
  life: number
  amp?: number // displacement amplitude — default 4
  mode?: 'radial' // 'radial' = expand outward from ripple source (correct for off-center origins)
  // omit  = original tangential displacement relative to fabric center
}
let ripples: Ripple[] = []

// ── Closing pulse state ───────────────────────────────────────────────────────
interface ClosingPulse {
  cx: number
  cy: number
  startT: number
  life: number
  frontColors: [string, string, string] // sphere colors sampled at spawn
  intensity?: number // multiplier on wave amplitude + glow — default 1.0 (full ring-close strength)
}
let closingPulses: ClosingPulse[] = []

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

// Pre-generate `count` energy tendrils spreading from a birth vertex.
// Tendrils are angular circuit-like paths — at most one turn each.
function generateTendrils(br: number, bc: number, count: number): Array<Array<{ r: number; c: number }>> {
  const tendrils: Array<Array<{ r: number; c: number }>> = []
  const usedStartDirs = new Set<string>()
  const allDirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ]
  for (let ti = 0; ti < count; ti++) {
    const avail = allDirs.filter(([dr, dc]) => !usedStartDirs.has(`${dr},${dc}`))
    if (avail.length === 0) break
    const [tdr, tdc] = avail[Math.floor(Math.random() * avail.length)]!
    usedStartDirs.add(`${tdr},${tdc}`)
    const path: Array<{ r: number; c: number }> = []
    let cr = br
    let cc = bc
    let dr = tdr
    let dc = tdc
    const len = 3 + Math.floor(Math.random() * 4)
    let turned = false
    for (let step = 0; step < len; step++) {
      const nr = cr + dr
      const nc = cc + dc
      if (nr < 0 || nr > ROWS || nc < 0 || nc > COLS) break
      path.push({ r: nr, c: nc })
      cr = nr
      cc = nc
      if (!turned && Math.random() < 0.4) {
        const perp: [number, number][] =
          dr === 0
            ? [
                [-1, 0],
                [1, 0]
              ]
            : [
                [0, -1],
                [0, 1]
              ]
        ;[dr, dc] = perp[Math.floor(Math.random() * 2)]!
        turned = true
      }
    }
    if (path.length > 0) tendrils.push(path)
  }
  return tendrils
}

// Pre-generate a pool of 20 matrix characters for birth cycling animation.
function generateCharPool(): Array<{ dr: number; dc: number; char: string }> {
  const charPool: Array<{ dr: number; dc: number; char: string }> = []
  for (let ci = 0; ci < 20; ci++) {
    charPool.push({
      dr: Math.floor(Math.random() * 7) - 3,
      dc: Math.floor(Math.random() * 9) - 4,
      char: BIRTH_CHARS[Math.floor(Math.random() * BIRTH_CHARS.length)]!
    })
  }
  return charPool
}

interface TronParticle {
  r: number // current vertex row
  c: number // current vertex col
  targetR: number // next vertex row
  targetC: number // next vertex col
  progress: number // 0→1 along the current edge
  dr: number // current travel direction (row delta)
  dc: number // current travel direction (col delta)
  speed: number // progress per frame
  color: string // sphere color sampled at spawn — always from agent sphere palette
  trail: Array<{ r: number; c: number }> // visible trail vertices (oldest first, capped)
  ownedEdges: Set<string> // every edge this particle has ever traversed — no self-crossing
  visitedVerts: Set<string> // every vertex visited — prevents path self-intersection
  didTurn: boolean // true if turned last step — forces straight next step (no double turns)
  targetSphereId: string // id of the sphere this particle is homing toward
  steps: number
  opacity: number // 1 → 0 during dissolve
  dying: boolean // true = stop moving, fade out
  // Final approach — once close enough, particle detaches from grid and flies
  // in a straight screen-space line directly to the sphere center at the same speed.
  finalApproach: boolean
  approachProgress: number // 0→1 along the straight-line final approach
  approachDist: number // pixel distance to sphere center at detach time — used for speed normalisation
  origin?: boolean // true = spawned by sphere-origin event; arrival counted for onOriginComplete
}

const TRAIL_LEN = 22
let tronParticles: TronParticle[] = []

// ── Particle birth state ───────────────────────────────────────────────────────
// A birth is the emergence effect that precedes a particle. A cell of the fabric
// illuminates, matrix characters flicker into existence, energy tendrils spread
// along nearby edges — then the particle grows from that point and heads to its sphere.
// Idea: thought arises from the fabric, intelligence forms, then joins its agent.

const BIRTH_CHARS = '01∑∫∂∇αβγδεζθ∞≠±アイウエカキクタチツ'

interface TronBirth {
  r: number
  c: number
  targetSphereId: string
  color: string
  startT: number
  spawned: boolean // true once the TronParticle has been created
  tendrils: Array<Array<{ r: number; c: number }>> // pre-generated lit grid paths
  charPool: Array<{ dr: number; dc: number; char: string }> // 20 chars, cycled by frame
  origin?: boolean // true = intensified rendering (1.8× glow, more tendrils) for sphere-origin event
}
let tronBirths: TronBirth[] = []
let firstParticleSpawned = false
// Tracks convergence of origin particles so onOriginComplete fires at the right moment
let originTotalCount = 0
let originArrivedCount = 0

// ── Particle effects — crash explosion or sphere-join glow ────────────────────
// Spawned when a particle dies. Drawn independently for a short window.
interface ParticleEffect {
  x: number // screen position at death (base coords)
  y: number
  color: string
  startT: number
  type: 'crash' | 'join' | 'halo'
  sphereRadius?: number // for join/halo effects — used to scale the burst to the sphere size
  origin?: boolean // halo from the origin event — toned down alpha to avoid green-dome stacking
}
let particleEffects: ParticleEffect[] = []

export function renderFabricBg(state: BgState): void {
  const { ctx, t, W, H, settleProgress, rings, recentEvents, onSphereAbsorb } = state

  // One getComputedStyle per frame — all withAlpha/isLightTheme calls below read the cached flag.
  refreshThemeCache()

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
    if (evt.type === 'sphere-origin') {
      const target = state.spheres.find((s) => s.id === evt.sphereId)
      if (!target) continue
      // Reset origin convergence tracking
      originArrivedCount = 0
      let spawned = 0
      // Births spread from SCREEN CENTER (CX, CY), not from the sphere.
      // Sphere s1 sits at the top of the ring — spreading from it would cluster all
      // births near the top edge. Spreading from screen center fills the whole visible
      // area. Particles then converge upward toward the sphere position.
      // 5 births, one per 72° sector, staggered distances for varied beam speeds.
      for (let i = 0; i < 5; i++) {
        const baseAngle = (i / 5) * Math.PI * 2
        const angle = baseAngle + (Math.random() - 0.5) * Math.PI * 0.35
        const minD = Math.min(W, H) * 0.1
        const maxD = Math.min(W, H) * 0.35
        const dist = minD + (i / 4) * (maxD - minD) + (Math.random() - 0.5) * Math.min(W, H) * 0.04
        const bx = CX + Math.cos(angle) * dist
        const by = CY + Math.sin(angle) * dist
        const br = Math.round((by / H) * ROWS)
        const bc = Math.round((bx / W) * COLS)
        if (br < 3 || br > ROWS - 3 || bc < 3 || bc > COLS - 3) continue
        const tendrils = generateTendrils(br, bc, 4)
        const charPool = generateCharPool()
        tronBirths.push({
          r: br,
          c: bc,
          targetSphereId: target.id,
          color: target.color,
          startT: t,
          spawned: false,
          tendrils,
          charPool,
          origin: true
        })
        spawned++
      }
      originTotalCount = spawned
      if (spawned > 0) firstParticleSpawned = true
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
  // Returns the approximate undisplaced screen position of a grid vertex.
  // Used for ring-avoidance checks before pos[] is computed this frame.
  const vertBasePos = (r: number, c: number) => ({
    x: (-MARGIN + (c / COLS) * (1 + 2 * MARGIN)) * W,
    y: (-MARGIN + (r / ROWS) * (1 + 2 * MARGIN)) * H
  })

  // ── Particle birth: grow a thought from the fabric ───────────────────────────
  // Instead of spawning from the screen edge, a birth effect illuminates a random
  // fabric cell, spreads energy tendrils, flickers matrix characters, then releases
  // the particle from that interior point.
  const activeBirths = tronBirths.filter((b) => !b.spawned).length
  // First particle spawns immediately when the ring finishes forming (no random gate).
  // Subsequent ones use the normal 0.8%/frame probability.
  const spawnNow = !firstParticleSpawned && tronParticles.length + activeBirths === 0
  if (
    spheres.length > 0 &&
    settleProgress >= 1 &&
    tronParticles.length + activeBirths < 5 &&
    (spawnNow || Math.random() < 0.008)
  ) {
    firstParticleSpawned = true
    const targetSphere = spheres[Math.floor(Math.random() * spheres.length)]!
    // Never birth a second particle of the same color
    const colorTaken =
      tronParticles.some((q) => !q.dying && q.color === targetSphere.color) ||
      tronBirths.some((b) => !b.spawned && b.color === targetSphere.color)
    if (!colorTaken) {
      // Pick a vertex close to the target sphere — search within ±5 grid cells of
      // the sphere's projected grid position, outside the sphere and ring exclusion.
      const approxR = Math.round((targetSphere.y / H) * ROWS)
      const approxC = Math.round((targetSphere.x / W) * COLS)
      const candidates: [number, number][] = []
      for (let dr = -5; dr <= 5; dr++) {
        for (let dc = -5; dc <= 5; dc++) {
          const r = approxR + dr
          const c = approxC + dc
          if (r < 2 || r > ROWS - 2 || c < 2 || c > COLS - 2) continue
          const vb = vertBasePos(r, c)
          const distToSphere = Math.hypot(vb.x - targetSphere.x, vb.y - targetSphere.y)
          const distToRing = Math.hypot(vb.x - CX, vb.y - CY)
          // Must be just outside the sphere, within reach, and outside the ring
          if (
            distToSphere > targetSphere.radius * 1.8 &&
            distToSphere < targetSphere.radius * 4.5 &&
            distToRing >= RING_R * 1.6
          ) {
            candidates.push([r, c])
          }
        }
      }
      if (candidates.length === 0) return // no valid spot near this sphere this frame
      const [br, bc] = candidates[Math.floor(Math.random() * candidates.length)]!

      const tendrils = generateTendrils(br, bc, 2 + Math.floor(Math.random() * 2))
      const charPool = generateCharPool()

      tronBirths.push({
        r: br,
        c: bc,
        targetSphereId: targetSphere.id,
        color: targetSphere.color,
        startT: t,
        spawned: false,
        tendrils,
        charPool
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

  tronParticles = tronParticles.filter((p) => {
    // Dissolving — trail erodes from tail to head, then the head fades out last.
    // Particles absorbed into a sphere (finalApproach) skip trail erosion and
    // fade the whole thing quickly since the join effect handles the arrival visual.
    if (p.dying) {
      if (p.finalApproach) {
        // Absorbed particles dissolve gently — the sun explosion is the primary visual
        p.opacity = Math.max(0, p.opacity - 0.05)
        return p.opacity > 0
      }
      // Eat 1 tail vertex per frame — slow retraction from tail toward head
      if (p.trail.length > 0) {
        p.trail.splice(0, 1)
        return true // head still alive, keep particle
      }
      // Trail fully gone — head lingers then fades slowly
      p.opacity = Math.max(0, p.opacity - 0.022)
      return p.opacity > 0
    }

    // Resolve sphere once — used for final approach and movement homing
    const sphere = spheres.find((s) => s.id === p.targetSphereId)

    // ── Final approach — detached from grid, flying straight to sphere center ──
    // Speed is normalised so the particle continues at the same px/frame rate
    // as it had on the grid — no acceleration, no slowdown, seamless transition.
    if (p.finalApproach) {
      // Grid step size in px ≈ W/COLS. Convert to progress units using stored distance.
      const gridStepPx = W / COLS
      // 3× grid speed — final approach should feel like a decisive lock-on, not a crawl
      const inc = p.approachDist > 0 ? (p.speed * gridStepPx * 3) / p.approachDist : 1
      p.approachProgress = Math.min(1, p.approachProgress + inc)
      if (p.approachProgress >= 1) {
        p.dying = true
        if (sphere) {
          onSphereAbsorb?.(sphere.id)
          if (p.origin) {
            originArrivedCount++
            if (originArrivedCount >= originTotalCount && originTotalCount > 0) {
              state.onOriginComplete?.()
            }
          }
          // Local ripple — radial, high amplitude so the mesh visibly distorts outward
          // from the sphere center. Stays local (Gaussian envelope ~45px wide ring).
          ripples.push({ cx: sphere.x, cy: sphere.y, startT: t, life: 1, amp: 55, mode: 'radial' })
          particleEffects.push({
            x: sphere.x,
            y: sphere.y,
            color: p.color,
            startT: t,
            type: 'join',
            sphereRadius: sphere.radius
          })
          // Origin event: 5 particles arrive on the same frame at the same point. Pushing a
          // halo per particle stacks them into a saturated agent-color dome. Emit only one
          // halo from the LAST arriving origin particle, flagged so the renderer tones it.
          const isOriginStack = p.origin === true
          const isLastOrigin = isOriginStack && originArrivedCount >= originTotalCount && originTotalCount > 0
          if (!isOriginStack || isLastOrigin) {
            particleEffects.push({
              x: sphere.x,
              y: sphere.y,
              color: p.color,
              startT: t,
              type: 'halo',
              sphereRadius: sphere.radius,
              origin: isOriginStack
            })
          }
        }
      }
      return true
    }

    p.progress += p.speed
    if (p.progress >= 1) {
      const prevR = p.r
      const prevC = p.c
      p.trail.push({ r: prevR, c: prevC })
      if (p.trail.length > TRAIL_LEN) p.trail.shift()
      p.r = p.targetR
      p.c = p.targetC
      p.ownedEdges.add(edgeKey(prevR, prevC, p.r, p.c))
      p.visitedVerts.add(`${p.r},${p.c}`)
      p.progress -= 1
      p.steps++

      // ── Switch to final approach when grid-position is within 3× sphere radius ─
      if (sphere) {
        const vb = vertBasePos(p.r, p.c)
        const distToSphere = Math.hypot(vb.x - sphere.x, vb.y - sphere.y)
        if (distToSphere < sphere.radius * 3) {
          p.finalApproach = true
          p.approachProgress = 0
          p.approachDist = distToSphere
          return true
        }
      }

      // ── Candidate filtering — progressively relaxed if blocked ───────────
      const noReversal = ([nr, nc]: [number, number]) => {
        if (nr === -p.dr && nc === -p.dc) return false
        return p.r + nr >= 0 && p.r + nr <= ROWS && p.c + nc >= 0 && p.c + nc <= COLS
      }
      // Hard constraint — never enters the ring area, no relaxation.
      // Buffer is 1.4× to account for fabric displacement: Gaussian pull moves
      // base-position-safe vertices inward by up to ~0.33×RING_R at the ring edge.
      const outsideRing = ([nr, nc]: [number, number]) => {
        const vb = vertBasePos(p.r + nr, p.c + nc)
        return Math.hypot(vb.x - CX, vb.y - CY) >= RING_R * 1.4
      }

      // Other active particles' positions — used for avoidance tiebreaker
      const otherHeads = tronParticles.filter((q) => q !== p && !q.dying).map((q) => ({ r: q.r, c: q.c }))

      const pickFrom = (pool: [number, number][]) => {
        if (pool.length === 1) return pool[0]!
        return pool.reduce((best, cand) => {
          const cr = p.r + cand[0]!
          const cc = p.c + cand[1]!
          const br = p.r + best[0]!
          const bc = p.c + best[1]!
          // Primary: prefer candidate closer to target sphere
          if (sphere) {
            const candVb = vertBasePos(cr, cc)
            const bestVb = vertBasePos(br, bc)
            const candDist = Math.hypot(candVb.x - sphere.x, candVb.y - sphere.y)
            const bestDist = Math.hypot(bestVb.x - sphere.x, bestVb.y - sphere.y)
            if (Math.abs(candDist - bestDist) > 5) return candDist < bestDist ? cand : best
          }
          // Tiebreaker: prefer candidate farther from other particles
          const candOther =
            otherHeads.length === 0 ? 999 : Math.min(...otherHeads.map((o) => Math.abs(o.r - cr) + Math.abs(o.c - cc)))
          const bestOther =
            otherHeads.length === 0 ? 999 : Math.min(...otherHeads.map((o) => Math.abs(o.r - br) + Math.abs(o.c - bc)))
          return candOther >= bestOther ? cand : best
        })
      }

      const base = dirs.filter(noReversal).filter(outsideRing)

      // Attempt 1: full Tron rules
      let pool = base
        .filter(([nr, nc]) => !claimedEdges.has(edgeKey(p.r, p.c, p.r + nr, p.c + nc)))
        .filter(([nr, nc]) => !p.visitedVerts.has(`${p.r + nr},${p.c + nc}`))
        .filter(([nr, nc]) => !p.didTurn || (nr === p.dr && nc === p.dc))

      // Attempt 2: drop double-turn restriction
      if (pool.length === 0)
        pool = base
          .filter(([nr, nc]) => !claimedEdges.has(edgeKey(p.r, p.c, p.r + nr, p.c + nc)))
          .filter(([nr, nc]) => !p.visitedVerts.has(`${p.r + nr},${p.c + nc}`))

      // Attempt 3: drop visited-vertex restriction
      if (pool.length === 0) pool = base.filter(([nr, nc]) => !claimedEdges.has(edgeKey(p.r, p.c, p.r + nr, p.c + nc)))

      // Attempt 4: any non-reversing move outside ring
      if (pool.length === 0) pool = base

      // No valid move at all — dissolve
      if (pool.length === 0) {
        p.dying = true
        return true
      }

      const chosen = pickFrom(pool as [number, number][])
      const prevDr = p.dr
      const prevDc = p.dc
      ;[p.dr, p.dc] = chosen
      p.didTurn = p.dr !== prevDr || p.dc !== prevDc
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

    // ── Ripple displacement ───────────────────────────────────────────────
    // 'radial' ripples expand outward from their own source (correct for
    // off-center origins like sphere positions). Default mode applies the
    // original tangential offset relative to the fabric center.
    let rippleX = 0
    let rippleY = 0
    for (const rp of ripples) {
      const rdx = x0 - rp.cx
      const rdy = y0 - rp.cy
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy) || 0.001
      const waveFront = (t - rp.startT) * 4
      const envelope = Math.exp(-((rdist - waveFront) ** 2) / 2000)
      const waveAmt = envelope * rp.life * (rp.amp ?? 4) * Math.sin(rdist * 0.04 - t * 0.05)
      if (rp.mode === 'radial') {
        rippleX += (rdx / rdist) * waveAmt
        rippleY += (rdy / rdist) * waveAmt
      } else {
        rippleX += -ny * waveAmt
        rippleY += nx * waveAmt
      }
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
        const osc = Math.sin(pdist * 0.025 - age * 0.12) * envelope * cp.life * f.amp * (cp.intensity ?? 1)
        // Radial push + small tangential swirl
        pulseX += pnx * osc - pny * osc * 0.15
        pulseY += pny * osc + pnx * osc * 0.15
      }
    }

    return {
      x: x0 - nx * pull + shimmerX + rippleX + pulseX,
      y: y0 - ny * pull + shimmerY + rippleY + pulseY
    }
  })

  // ── Fine grid displaced positions (same displacement formula, 2× density) ──
  const pos2 = BASE_VERTS2.map((v) => {
    const x0 = v.bx * W
    const y0 = v.by * H
    const dx = x0 - CX
    const dy = y0 - CY
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001
    const nx = dx / dist
    const ny = dy / dist

    const phase = v.bx * 0.55 + v.by * 0.35 - t * 0.006
    const shimmerX = Math.sin(phase) * 1.8
    const shimmerY = Math.sin(phase + 0.7) * 1.8

    const PULL_MAX = RING_R * 0.55
    const u = dist / RING_R
    const pull = settleProgress * PULL_MAX * u * Math.exp(-(u * u) / 2)

    let rippleX = 0
    let rippleY = 0
    for (const rp of ripples) {
      const rdx = x0 - rp.cx
      const rdy = y0 - rp.cy
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy) || 0.001
      const waveFront = (t - rp.startT) * 4
      const envelope = Math.exp(-((rdist - waveFront) ** 2) / 2000)
      const waveAmt = envelope * rp.life * (rp.amp ?? 4) * Math.sin(rdist * 0.04 - t * 0.05)
      if (rp.mode === 'radial') {
        rippleX += (rdx / rdist) * waveAmt
        rippleY += (rdy / rdist) * waveAmt
      } else {
        rippleX += -ny * waveAmt
        rippleY += nx * waveAmt
      }
    }

    let pulseX = 0
    let pulseY = 0
    for (const cp of closingPulses) {
      const pdx = x0 - cp.cx
      const pdy = y0 - cp.cy
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy) || 0.001
      const pnx = pdx / pdist
      const pny = pdy / pdist
      const age = t - cp.startT
      const fronts = [
        { speed: 5, sigma: 90, amp: 28 },
        { speed: 3, sigma: 120, amp: 18 },
        { speed: 1.6, sigma: 150, amp: 12 }
      ]
      for (const f of fronts) {
        const waveFront = age * f.speed
        const envelope = Math.exp(-((pdist - waveFront) ** 2) / (f.sigma * f.sigma))
        const osc = Math.sin(pdist * 0.025 - age * 0.12) * envelope * cp.life * f.amp * (cp.intensity ?? 1)
        pulseX += pnx * osc - pny * osc * 0.15
        pulseY += pny * osc + pnx * osc * 0.15
      }
    }

    return {
      x: x0 - nx * pull + shimmerX + rippleX + pulseX,
      y: y0 - ny * pull + shimmerY + rippleY + pulseY
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
    ctx.globalAlpha = BASE_ALPHA
    ctx.stroke()
  }

  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath()
    for (let r = 0; r <= ROWS; r++) {
      const p = pos[r * STRIDE + c]!
      r === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.globalAlpha = BASE_ALPHA
    ctx.stroke()
  }

  // Fine grid overlay — only odd-indexed lines (even indices land on coarse lines,
  // drawing them would double the opacity there and create alternating brightness).
  ctx.lineWidth = 0.5
  ctx.globalAlpha = BASE_ALPHA
  for (let r = 1; r < ROWS2; r += 2) {
    ctx.beginPath()
    for (let c = 0; c <= COLS2; c++) {
      const p = pos2[r * STRIDE2 + c]!
      c === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  for (let c = 1; c < COLS2; c += 2) {
    ctx.beginPath()
    for (let r = 0; r <= ROWS2; r++) {
      const p = pos2[r * STRIDE2 + c]!
      r === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  ctx.restore()

  // ── Draw particle births (fabric emergence → thought → particle) ──────────
  // Each birth animates in 3 phases: illuminate (0–40%), matrix chars (30–100%),
  // then the particle spawns and the glow fades out behind it.
  const BIRTH_DURATION = 40 // frames of emergence before particle spawns
  const BIRTH_FADE = 22 // frames to fade after particle spawns
  const GRID_STEP_X = W / COLS
  const GRID_STEP_Y = H / ROWS

  ctx.save()
  tronBirths = tronBirths.filter((birth) => {
    const age = t - birth.startT
    const postSpawnAge = birth.spawned ? age - BIRTH_DURATION : 0
    if (postSpawnAge >= BIRTH_FADE) return false

    const birthVert = pos[birth.r * STRIDE + birth.c]
    if (!birthVert) return false

    const emergence = Math.min(1, age / BIRTH_DURATION)
    const fadeOut = birth.spawned ? Math.max(0, 1 - postSpawnAge / BIRTH_FADE) : 1
    const pulse = Math.sin(age * 0.18) * 0.5 + 0.5 // slow oscillation
    const intensityMult = birth.origin ? 1.8 : 1.0

    // 1. Central glow dot — brightens as emergence peaks
    const glowR = (birth.origin ? 5 : 3) + pulse * (birth.origin ? 12 : 7)
    const glowAlpha = emergence * (0.5 + pulse * 0.45) * fadeOut * intensityMult
    const glowGrad = ctx.createRadialGradient(birthVert.x, birthVert.y, 0, birthVert.x, birthVert.y, glowR + 10)
    glowGrad.addColorStop(
      0,
      isLightTheme()
        ? withAlpha(brightenForLight(birth.color), glowAlpha * 0.95)
        : `rgba(255,255,255,${(glowAlpha * 0.95).toFixed(3)})`
    )
    glowGrad.addColorStop(0.3, withAlpha(birth.color, glowAlpha * 0.8))
    glowGrad.addColorStop(1, withAlpha(birth.color, 0))
    ctx.globalAlpha = 1
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(birthVert.x, birthVert.y, glowR + 10, 0, Math.PI * 2)
    ctx.fill()

    // 2. Illuminated edges — the 4 grid edges touching the birth vertex glow brightly
    const edgeAlpha = emergence * (0.35 + pulse * 0.35) * fadeOut * intensityMult
    const birthStroke = birth.color
    ctx.strokeStyle = birthStroke
    ctx.lineWidth = 1.8
    const edgeNeighbors: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]
    for (const [dr, dc] of edgeNeighbors) {
      const nv = pos[(birth.r + dr) * STRIDE + (birth.c + dc)]
      if (!nv) continue
      ctx.globalAlpha = edgeAlpha
      ctx.beginPath()
      ctx.moveTo(birthVert.x, birthVert.y)
      ctx.lineTo(nv.x, nv.y)
      ctx.stroke()
    }

    // 3. Energy tendrils — circuit-like paths spreading outward with a travelling wave
    const tendrilAge = Math.min(1, age / (BIRTH_DURATION * 0.6))
    for (const tendril of birth.tendrils) {
      let prev = birthVert
      for (let i = 0; i < tendril.length; i++) {
        const vert = pos[tendril[i]!.r * STRIDE + tendril[i]!.c]
        if (!vert) break
        // Wave front travelling along the tendril
        const segFrac = (i + 1) / tendril.length
        const wave = Math.sin(age * 0.25 - segFrac * Math.PI * 3) * 0.5 + 0.5
        const segAlpha = tendrilAge * wave * (0.45 + pulse * 0.25) * fadeOut * (1 - segFrac * 0.4) * intensityMult
        ctx.globalAlpha = segAlpha
        ctx.strokeStyle = birthStroke
        ctx.lineWidth = 1 + wave * 1.2
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(vert.x, vert.y)
        ctx.stroke()
        prev = vert
      }
    }

    // 4. Matrix characters — flicker into existence from 35% emergence onward
    const charEmergence = Math.max(0, (emergence - 0.35) / 0.65)
    if (charEmergence > 0) {
      ctx.font = '9px monospace'
      // Show 8 chars at a time, cycling through the pool every 10 frames
      const charOffset = Math.floor(age / 10) % (birth.charPool.length - 8)
      for (let ci = 0; ci < 8; ci++) {
        const ch = birth.charPool[charOffset + ci]!
        // Each char flickers independently using a sine offset
        const flicker = Math.sin(age * 0.4 + ci * 1.3) * 0.5 + 0.5
        ctx.globalAlpha = charEmergence * flicker * 0.75 * fadeOut
        ctx.fillStyle = birthStroke
        ctx.fillText(ch.char, birthVert.x + ch.dc * GRID_STEP_X * 0.55, birthVert.y + ch.dr * GRID_STEP_Y * 0.6)
      }
    }

    // 5. Spawn the particle when emergence completes
    if (!birth.spawned && age >= BIRTH_DURATION) {
      birth.spawned = true
      const targetSphere = spheres.find((s) => s.id === birth.targetSphereId)
      const colorTaken = !birth.origin && tronParticles.some((q) => !q.dying && q.color === birth.color)
      if (targetSphere && !colorTaken) {
        const bvb = vertBasePos(birth.r, birth.c)
        if (birth.origin) {
          // Origin particles fly directly to sphere center — bypasses grid traversal.
          // Speed is calibrated so all origin particles arrive after the same number of
          // frames regardless of their distance (further = faster, closer = slower).
          const ORIGIN_APPROACH_FRAMES = 90
          const approachDist = Math.hypot(targetSphere.x - bvb.x, targetSphere.y - bvb.y)
          const gridStepPx = W / COLS
          const speed = approachDist > 0 ? approachDist / (gridStepPx * 3 * ORIGIN_APPROACH_FRAMES) : 0.05
          tronParticles.push({
            r: birth.r,
            c: birth.c,
            targetR: birth.r,
            targetC: birth.c,
            progress: 0,
            dr: 0,
            dc: 0,
            speed,
            color: birth.color,
            trail: [],
            ownedEdges: new Set(),
            visitedVerts: new Set(),
            didTurn: false,
            targetSphereId: birth.targetSphereId,
            steps: 0,
            opacity: 1,
            dying: false,
            finalApproach: true,
            approachProgress: 0,
            approachDist,
            origin: true
          })
        } else {
          // Normal grid-traversal particle
          const dx = targetSphere.x - bvb.x
          const dy = targetSphere.y - bvb.y
          const dirOptions: [number, number][] = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
          ]
          const [bdr, bdc] = dirOptions.reduce((best, cur) =>
            cur[0] * dy + cur[1] * dx > best[0] * dy + best[1] * dx ? cur : best
          )
          const nr = birth.r + bdr
          const nc = birth.c + bdc
          if (nr >= 0 && nr <= ROWS && nc >= 0 && nc <= COLS) {
            tronParticles.push({
              r: birth.r,
              c: birth.c,
              targetR: nr,
              targetC: nc,
              progress: 0,
              dr: bdr,
              dc: bdc,
              speed: 0.04 + Math.random() * 0.06,
              color: birth.color,
              trail: [],
              ownedEdges: new Set([edgeKey(birth.r, birth.c, nr, nc)]),
              visitedVerts: new Set([`${birth.r},${birth.c}`]),
              didTurn: false,
              targetSphereId: birth.targetSphereId,
              steps: 0,
              opacity: 1,
              dying: false,
              finalApproach: false,
              approachProgress: 0,
              approachDist: 0
            })
          }
        }
      }
    }

    return true
  })
  ctx.restore()

  // ── Draw Tron particles ───────────────────────────────────────────────────
  // Trail vertices are mapped to current screen positions each frame so they
  // always follow the displaced fabric — gravity, shimmer, and pulse included.
  ctx.save()
  ctx.lineCap = 'butt' // 'round' caps create visible dots at each segment join
  ctx.lineJoin = 'round'

  for (const p of tronParticles) {
    const curPos = pos[p.r * STRIDE + p.c]
    if (!curPos) continue

    // Compute head position:
    //  - dying: frozen at current grid vertex (just fading out)
    //  - finalApproach: smoothstep interpolation in screen space → sphere center
    //  - normal: interpolated between current and next grid vertex
    let headX: number
    let headY: number
    if (p.dying && p.finalApproach) {
      // Died at sphere center — keep head there so the trail draws toward the sphere,
      // not back at the old grid detach point
      const targetSphere = spheres.find((s) => s.id === p.targetSphereId)
      headX = targetSphere ? targetSphere.x : curPos.x
      headY = targetSphere ? targetSphere.y : curPos.y
    } else if (p.dying) {
      headX = curPos.x
      headY = curPos.y
    } else if (p.finalApproach) {
      const targetSphere = spheres.find((s) => s.id === p.targetSphereId)
      if (!targetSphere) continue
      // Linear — same constant speed as grid movement, no easing
      headX = curPos.x + (targetSphere.x - curPos.x) * p.approachProgress
      headY = curPos.y + (targetSphere.y - curPos.y) * p.approachProgress
    } else {
      const tgtPos = pos[p.targetR * STRIDE + p.targetC]
      if (!tgtPos) continue
      headX = curPos.x + (tgtPos.x - curPos.x) * p.progress
      headY = curPos.y + (tgtPos.y - curPos.y) * p.progress
    }

    // Map trail grid vertices to current screen positions.
    const pts: Array<{ x: number; y: number }> = []
    for (const v of p.trail) {
      const vp = pos[v.r * STRIDE + v.c]
      if (vp) pts.push(vp)
    }
    if (curPos) pts.push(curPos)
    pts.push({ x: headX, y: headY })

    if (pts.length < 2) continue

    // Tron line trail — segments connecting trail vertices, very bright near the
    // head then sharp exponential fade toward the tail
    const trailColor = p.color
    for (let i = 1; i < pts.length; i++) {
      const frac = i / pts.length // 0 near tail, 1 at head
      ctx.globalAlpha = frac ** 0.25 * 0.92 * p.opacity
      ctx.strokeStyle = trailColor
      ctx.lineWidth = frac * 2.2
      ctx.beginPath()
      ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y)
      ctx.lineTo(pts[i]!.x, pts[i]!.y)
      ctx.stroke()
    }

    paintParticleHead(ctx, headX, headY, p.color, { opacity: p.opacity })
  }
  ctx.restore()

  // ── Draw particle effects (crash explosions + sphere-join glows) ──────────
  ctx.save()
  particleEffects = particleEffects.filter((fx) => {
    const duration = fx.type === 'crash' ? 22 : fx.type === 'halo' ? 70 : 40
    const progress = (t - fx.startT) / duration
    if (progress >= 1) return false
    const ease = 1 - (1 - progress) ** 2 // ease-out

    if (fx.type === 'halo') {
      // Slow-blooming glow that extends well beyond the sphere edge — the outer
      // portion is visible around the DOM sphere, creating an illumination aura.
      // Peaks at ~30% progress then fades gently.
      const sr = fx.sphereRadius ?? 48
      const peakAlpha = Math.sin(progress * Math.PI) // 0→1→0 arc, peaks at midpoint
      const outerR = sr * (1.2 + ease * 1.8) // grows from 1.2× to 3× sphere radius
      const alphaScale = fx.origin ? 0.6 : 1.0
      const grad = ctx.createRadialGradient(fx.x, fx.y, sr * 0.7, fx.x, fx.y, outerR)
      grad.addColorStop(0, withAlpha(fx.color, peakAlpha * 0.45 * alphaScale))
      grad.addColorStop(0.4, withAlpha(fx.color, peakAlpha * 0.25 * alphaScale))
      grad.addColorStop(1, withAlpha(fx.color, 0))
      ctx.globalAlpha = 1
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, outerR, 0, Math.PI * 2)
      ctx.fill()
      return true
    }

    const fxColor = fx.color
    if (fx.type === 'crash') {
      // Expanding ring burst
      const radius = ease * 22
      ctx.globalAlpha = (1 - progress) * 0.65
      ctx.strokeStyle = fxColor
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2)
      ctx.stroke()
      // Inner flash
      ctx.globalAlpha = (1 - progress) * 0.35
      ctx.fillStyle = fxColor
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, radius * 0.45, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const sr = fx.sphereRadius ?? 48
      // Sun rays — expand outward then recede, like a solar flare burst.
      // sin(progress × π) peaks at 50% then falls back to 0.
      const rayPeak = Math.sin(progress * Math.PI)
      const numRays = 10
      const innerR = sr * 0.18
      const rayLen = sr * 0.7 * rayPeak
      ctx.lineWidth = 1.2
      for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2
        const x1 = fx.x + Math.cos(angle) * innerR
        const y1 = fx.y + Math.sin(angle) * innerR
        const x2 = fx.x + Math.cos(angle) * (innerR + rayLen)
        const y2 = fx.y + Math.sin(angle) * (innerR + rayLen)
        // Tip fades first, root lingers — gradient feel via two segments
        const rayAlpha = rayPeak * (1 - progress * 0.6) * 0.75
        ctx.globalAlpha = rayAlpha
        ctx.strokeStyle = fxColor
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        // Bright tip — agent color, slightly lighter but not white
        ctx.globalAlpha = rayAlpha * 0.5
        ctx.strokeStyle = fxColor
        ctx.lineWidth = 0.7
        ctx.beginPath()
        ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.lineWidth = 1.2
      }
      // Central flash — agent color, intense at start, gone by 40%
      if (progress < 0.4) {
        const flashFrac = 1 - progress / 0.4
        const flashR = sr * 0.22 * flashFrac
        const flashGrad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, flashR)
        flashGrad.addColorStop(0, withAlpha(fx.color, flashFrac * 0.65))
        flashGrad.addColorStop(0.5, withAlpha(fx.color, flashFrac * 0.35))
        flashGrad.addColorStop(1, withAlpha(fx.color, 0))
        ctx.globalAlpha = 1
        ctx.fillStyle = flashGrad
        ctx.beginPath()
        ctx.arc(fx.x, fx.y, flashR, 0, Math.PI * 2)
        ctx.fill()
      }
      // Slow outer ring — expands gently across the sphere, fades last
      const ringR = sr * 0.1 + ease * sr * 1.1
      ctx.globalAlpha = (1 - progress) * 0.35
      ctx.strokeStyle = fxColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(fx.x, fx.y, ringR, 0, Math.PI * 2)
      ctx.stroke()
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
      const alpha = cp.life * 0.14 * (1 - fi * 0.03) * (cp.intensity ?? 1)

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
