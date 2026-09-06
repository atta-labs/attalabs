/* The Vinaya harness as REAL geometry — extruded solids, not projected drawings.
   Every dimension is lifted from HarnessStructure.tsx / harness-geometry.ts, which are
   authored at size = 380 (c = 190). Here c = 1.90 m, so k = 0.01 m and every source
   literal keeps its exact ratio:

     rOut 0.93c · rIn 0.82c · band ±33° about the diagonals · gaps on the axes
     screw hex r 20k at rMid · inner pad 9.6k · slot 2 wide
     shaft footW 14k, shaftW 9k, footLen 15k, from rIn−1k to coreRadius+8k
     gripper band gripR−7k … gripR+5k over ±30° · claws at ±(30−7)° · bolt r 3.6k
     rivets 1.8k · feet 2k · main = coreRadius = (0.3·size)/2 − 3 = 0.284c
*/
import * as THREE from 'three'

/* ── tokens ──────────────────────────────────────────────────────────────── */
function oklchToHex(str) {
  const m = str.trim().match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+)/i)
  if (!m) return null
  const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1])
  const C = m[2].endsWith('%') ? (parseFloat(m[2]) / 100) * 0.4 : parseFloat(m[2])
  const h = (parseFloat(m[3]) * Math.PI) / 180
  const a = C * Math.cos(h), b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * s
  ]
  const enc = (u) => {
    const v = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.max(u, 0) ** (1 / 2.4) - 0.055
    return Math.max(0, Math.min(255, Math.round(v * 255)))
  }
  const [r, g, bl] = lin.map(enc)
  return (r << 16) | (g << 8) | bl
}
function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255
  return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t))
}
/* Resolve a CSS custom property to a hex colour THROUGH the cascade: a probe element under
   `root` gets `color: var(name)`, and its computed `color` comes back as a concrete colour
   even when the variable is a color-mix() — which getPropertyValue() would hand back as
   unresolved text. Used for the hero-scoped ramp targets in hero-core.css. */
function cssColor(root, name) {
  const probe = document.createElement('span')
  probe.style.color = `var(${name})`
  root.appendChild(probe)
  const raw = getComputedStyle(probe).color.trim()
  probe.remove()
  let hex = oklchToHex(raw)
  if (hex == null) {
    const rgb = raw.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
    const srgb = raw.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/i)
    const c = rgb ? rgb.slice(1, 4).map((v) => Math.round(parseFloat(v))) : srgb ? srgb.slice(1, 4).map((v) => Math.round(parseFloat(v) * 255)) : null
    if (c) hex = (c[0] << 16) | (c[1] << 8) | c[2]
  }
  if (hex == null) throw new Error(`design token ${name} did not resolve to a colour (${raw})`)
  return hex
}
/* Colour comes from the design system's variables or not at all — there are no literal
   colour fallbacks anywhere in this file. A missing token is a bug, so it throws. */
export function token(name) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const hex = raw && oklchToHex(raw)
  if (hex === null || hex === undefined) throw new Error(`design token ${name} is not defined`)
  return hex
}

/* ── source proportions ──────────────────────────────────────────────────── */
const c = 1.9
const k = c / 190
const rOut = c * 0.93
const rIn = c * 0.82
const rMid = (rIn + rOut) / 2
const coreRadius = c * 0.284
const RING_AXIS_DEG = [45, 135, 225, 315]
const ARC_HALF = 33
const GRIP = 30
const gripR = coreRadius + 8 * k

const T_RING = 8 * k         // plate stock (3D only — the source is flat)
const T_SHAFT = 7 * k
const T_GRIP = 9 * k
const rad = (deg) => (deg * Math.PI) / 180

/* animation constants, lifted from the source alongside the geometry */
const EASE = (t) => 1 - (1 - t) ** 3
const cl = (x) => Math.max(0, Math.min(1, x))
const CONDUIT_ANGLES_DEG = [0, 90, 180, 270]
/* The gaps are exactly ±12° wide (bands span ±33° about the diagonals). The current must
   START at the sockets and stop there — at 13° it overshot into the metal and ran straight
   over the pins, which is why they read as decoration. */
const CONDUIT_HALF_DEG = 11
const SOCKET_INSET_DEG = 0
const WAVE_VARIANTS = [
  { samples: 22, amplitude: 0.6, width: 1.6, speed: 0.09, dir: 1, opacity: 0.9, seed: 0, band: -1 },
  { samples: 20, amplitude: 0.55, width: 1.2, speed: 0.12, dir: -1, opacity: 0.68, seed: 40, band: 1 }
]
const PULL_RANGE_PX = 265, MAX_PULL_PX = 30
const PULL_RANGE = PULL_RANGE_PX * k         // the source's cursor pull, in world units
const MAX_PULL = MAX_PULL_PX * k
const hash01 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export async function buildHarness(THREE_ = THREE, opts = {}) {
  /* main-core options. Defaults reproduce the flat, wireless core exactly, so the factory is
     inert until a caller opts in (hero-scene.js does: wire 0.07, ramp 'deep', contact, lift 0.22). */
  const CORE = { ramp: 'flat', wire: 0, contact: false, lift: 0.13, ...(opts.core || {}) }
  // where the hero-scoped ramp-target variables (hero-core.css) are resolved from
  const tokenRoot = opts.tokenRoot ?? document.documentElement
  const group = new THREE.Group()
  group.name = 'vinaya-harness'

  const inkHex = token('--primary')
  const metalHex = token('--secondary')
  const cardHex = token('--card')
  const greenHex = token('--success')          // merged — the only place colour enters

  /* Vinaya's language is flat: sand fills, hairline ink outlines, no specular and no soft
     shadow. MeshBasicMaterial needs no lighting, so the render is a technical drawing that
     happens to be built from real solids — the geometry is 3D, the shading is not. */
  const shade = (t) => mixHex(metalHex, inkHex, t)
  const metal = new THREE_.MeshBasicMaterial({ name: 'harness-metal', color: metalHex })
  const metalSide = new THREE_.MeshBasicMaterial({ name: 'harness-metal-side', color: shade(0.34) })
  const ink = new THREE_.MeshBasicMaterial({ name: 'ink', color: inkHex })
  const core = new THREE_.MeshBasicMaterial({ name: 'main-core', color: cardHex })
  const edgeMat = new THREE_.LineBasicMaterial({ name: 'outline', color: inkHex })
  const wireMat = new THREE_.LineBasicMaterial({ name: 'core-wire', color: inkHex, transparent: true, opacity: CORE.wire || 0.3 })
  const outline = (mesh, angle) => {
    const e = new THREE_.LineSegments(new THREE_.EdgesGeometry(mesh.geometry, angle ?? 24), edgeMat)
    e.name = mesh.name + '-outline'
    mesh.add(e)
    return mesh
  }

  /* extrude a flat shape (built in XY) into a solid plate of `t`, lying in the XZ plane */
  const BEVEL = 0.7 * k              // ExtrudeGeometry adds this ON TOP of depth, both faces
  const EX = { curveSegments: 96, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 2, bevelOffset: 0 }
  const plate = (shape, t, mat, name) => {
    const geo = new THREE_.ExtrudeGeometry(shape, { ...EX, depth: t })
    geo.translate(0, 0, -t / 2)
    geo.rotateX(-Math.PI / 2)          // shape plane → ground plane, thickness along y
    // ExtrudeGeometry groups: 0 = the two faces, 1 = the side wall
    const mesh = new THREE_.Mesh(geo, [mat, metalSide])
    mesh.name = name
    return outline(mesh)
  }
  /* Two solids that interpenetrate share no edge: EdgesGeometry only ever sees one mesh, so
     a part planted inside a plate has no line where the two meet. Draw that contour: the
     guest's outline clipped to the host's footprint, laid on the host's top face. */
  const polyOf = (shape) => shape.extractPoints(2).shape.map((p) => [p.x, p.y])
  const bboxOf = (poly) => poly.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)],
    [Infinity, Infinity, -Infinity, -Infinity])
  const insidePoly = (poly, bb, x, y) => {
    if (x < bb[0] || x > bb[2] || y < bb[1] || y > bb[3]) return false
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  /* a hair lighter than the hard outlines — the contour has to be there, but it is one line
     among many at that junction and shouldn't compete with the silhouette */
  const jointMat = new THREE_.LineBasicMaterial({ name: 'junction', color: inkHex, transparent: true, opacity: 0.45 })
  /* shape XY → world: plate() rotates the extrusion, so (X, Y) lands at (X, ·, −Y).
     Corner polygons and a fixed subdivision — the cost must not scale with unit size. */
  const plateJunction = (guestShape, hostShape, yPlane, name) => {
    const g = polyOf(guestShape), h = polyOf(hostShape), bb = bboxOf(h)
    const pts = []
    for (let e = 0; e < g.length; e++) {
      const a0 = g[e], a1 = g[(e + 1) % g.length]
      let prev = a0, prevIn = insidePoly(h, bb, a0[0], a0[1])
      for (let t = 1; t <= 24; t++) {
        const p = [a0[0] + (a1[0] - a0[0]) * (t / 24), a0[1] + (a1[1] - a0[1]) * (t / 24)]
        const isIn = insidePoly(h, bb, p[0], p[1])
        if (isIn && prevIn) {
          pts.push(new THREE_.Vector3(prev[0], yPlane, -prev[1]))
          pts.push(new THREE_.Vector3(p[0], yPlane, -p[1]))
        }
        prev = p; prevIn = isIn
      }
    }
    const l = new THREE_.LineSegments(new THREE_.BufferGeometry().setFromPoints(pts), jointMat)
    l.name = name
    l.renderOrder = 2
    return l
  }



  // (r, perpendicular) along the ray `deg` → shape-space XY, exactly like offsetPoint()
  const ray = (r, deg, s = 0) => {
    const a = rad(deg)
    return new THREE_.Vector2(Math.cos(a) * r - Math.sin(a) * s, Math.sin(a) * r + Math.cos(a) * s)
  }
  const polar3 = (r, deg, y = 0) => new THREE_.Vector3(Math.cos(rad(deg)) * r, y, Math.sin(rad(deg)) * r)

  const hexShape = (deg, R) => {
    const th0 = -rad(deg)
    const cs = Math.cos(th0), sn = Math.sin(th0)
    const Px = Math.cos(rad(deg)) * rMid, Pz = Math.sin(rad(deg)) * rMid
    const pts = []
    for (let i = 0; i < 6; i++) {
      const th = (i / 6) * Math.PI * 2
      const lx = Math.sin(th) * R, lz = Math.cos(th) * R
      pts.push(new THREE_.Vector2(lx * cs + lz * sn + Px, -lx * sn + lz * cs + Pz))
    }
    return new THREE_.Shape(pts)
  }

  const parts = { bands: [], screws: [], rungs: [], rivets: [], columns: [], sparks: [], pins: [] }

  /* ── ring segments: outer arc + caps + inner arc, ±33° about each diagonal ── */
  for (const a of RING_AXIS_DEG) {
    const shape = new THREE_.Shape()
    shape.absarc(0, 0, rOut, rad(a - ARC_HALF), rad(a + ARC_HALF), false)
    shape.absarc(0, 0, rIn, rad(a + ARC_HALF), rad(a - ARC_HALF), true)
    shape.closePath()
    const band = plate(shape, T_RING, metal, `ring-segment-${a}`)
    parts.bands.push({ a, mesh: band, span: ARC_HALF })
    group.add(band)

    // interior rungs — engraved ink inlays across the band
    for (const d of [-22, -11, 11, 22]) {
      const p0 = polar3(rIn + 2 * k, a + d, T_RING / 2)
      const p1 = polar3(rOut - 2 * k, a + d, T_RING / 2)
      const len = p0.distanceTo(p1)
      const geo = new THREE_.BoxGeometry(len, 1.4 * k, 1.2 * k)
      const m = new THREE_.Mesh(geo, ink)
      m.name = `band-rung-${a}-${d}`
      m.position.copy(p0).add(p1).multiplyScalar(0.5)
      m.position.y = T_RING / 2 + 0.2 * k
      m.rotation.y = -rad(a + d)
      parts.rungs.push({ a, d, mesh: m })
      group.add(m)
    }
    /* no end rivet: it floated on the band's end face above the three socket pins and read
       as a stray dot — the sockets are the fastening story at that end */

    /* hex screw at rMid — a real bolt head: hex body, raised hex pad, cut slot */
    const head = new THREE_.Mesh(new THREE_.CylinderGeometry(20 * k, 20 * k, 12 * k, 6), metal)
    head.name = `screw-head-${a}`
    head.position.copy(polar3(rMid, a, T_RING / 2 + 2 * k))
    head.rotation.y = -rad(a)
    group.add(outline(head, 20))

    /* the head is planted 4k INTO the ring: its own bottom rim is buried, so the hex/ring
       intersection needs drawing — the footprint where the hex crosses the band's top face,
       plus a vertical down the band's side wall where the hex overhangs it. */
    const joint = new THREE_.Object3D()
    joint.position.copy(polar3(rMid, a, T_RING / 2 + BEVEL))
    joint.rotation.y = -rad(a)
    joint.updateMatrix()
    const yRim = -4 * k
    const inBand = (p) => {
      const w = p.clone().applyMatrix4(joint.matrix)
      const r = Math.hypot(w.x, w.z)
      return r >= rIn && r <= rOut
    }
    const jsegs = []
    for (let e = 0; e < 6; e++) {
      const corner = (th) => new THREE_.Vector3(Math.sin(th) * 20.4 * k, 0.3 * k, Math.cos(th) * 20.4 * k)
      const p0 = corner((e / 6) * Math.PI * 2), p1 = corner(((e + 1) / 6) * Math.PI * 2)
      let prev = p0.clone(), prevIn = inBand(prev)
      for (let t = 1; t <= 48; t++) {
        const p = p0.clone().lerp(p1, t / 48)
        const isIn = inBand(p)
        if (isIn && prevIn) jsegs.push(prev.clone(), p.clone())
        if (isIn !== prevIn) {
          const c = prev.clone().lerp(p, 0.5)
          jsegs.push(c.clone(), new THREE_.Vector3(c.x, yRim, c.z))
        }
        prev = p; prevIn = isIn
      }
    }
    const jointLines = new THREE_.LineSegments(new THREE_.BufferGeometry().setFromPoints(jsegs), edgeMat)
    jointLines.name = `screw-joint-${a}`
    jointLines.renderOrder = 2
    joint.add(jointLines)
    group.add(joint)

    /* the inner pad is FLAT — it just sits on the hex's top face, no stock of its own */
    const pad = new THREE_.Mesh(new THREE_.CylinderGeometry(10.6 * k, 10.6 * k, 0, 6), metal)
    pad.name = `screw-pad-${a}`
    pad.position.copy(polar3(rMid, a, T_RING / 2 + 8.12 * k))
    pad.rotation.y = -rad(a)
    group.add(outline(pad, 20))


    const slot = new THREE_.Mesh(new THREE_.BoxGeometry(19.2 * k, 1.6 * k, 2.6 * k), ink)
    slot.name = `screw-slot-${a}`
    slot.position.copy(polar3(rMid, a, T_RING / 2 + 8.4 * k))
    slot.rotation.y = -rad(a)
    group.add(slot)

    parts.screws.push({
      a, meshes: [head, pad, slot, joint],
      base: [head.position.clone(), pad.position.clone(), slot.position.clone(), joint.position.clone()]
    })
  }

  /* ── columns: shaft from the ring foot to a curved gripper clamping main ── */
  for (const d of RING_AXIS_DEG) {
    const rO = rIn - 1 * k
    const rO2 = rO - 15 * k
    const footW = 14 * k
    const shaftW = 9 * k
    const shape = new THREE_.Shape([
      ray(rO, d, footW), ray(rO2, d, footW), ray(rO2, d, shaftW),
      ray(gripR, d, shaftW), ray(gripR, d, -shaftW), ray(rO2, d, -shaftW),
      ray(rO2, d, -footW), ray(rO, d, -footW)
    ])
    const shaftMesh = plate(shape, T_SHAFT, metal, `column-shaft-${d}`)
    group.add(shaftMesh)

    const band = new THREE_.Shape()
    band.absarc(0, 0, gripR + 5 * k, rad(d - GRIP), rad(d + GRIP), false)
    band.absarc(0, 0, gripR - 7 * k, rad(d + GRIP), rad(d - GRIP), true)
    band.closePath()
    const gripMesh = plate(band, T_GRIP, metal, `gripper-${d}`)
    group.add(gripMesh)
    const col = { d, shaft: shaftMesh, grip: gripMesh, rungs: [], claws: [], feet: [], bolt: null, bslot: null, gripR }
    parts.columns.push(col)

    /* the head overhangs the band's inner edge and lands on the shaft foot underneath, so
       the same hex footprint crosses the SHAFT's top face too — drawn softer than the rest */
    col.headJoint = plateJunction(hexShape(d, 20.4 * k), shape, T_SHAFT / 2 + BEVEL + 0.25 * k, `screw-shaft-joint-${d}`)
    group.add(col.headJoint)

    /* the shaft is 7k stock planted into the ring's 8k and the gripper's 9k, so on both of
       those top faces its outline is a real contour that was missing */

    // shaft rungs at 0.4 / 0.72 of the run
    for (const f of [0.4, 0.72]) {
      const r = rO2 - (rO2 - gripR) * f
      const m = new THREE_.Mesh(new THREE_.BoxGeometry(1.9 * k, 1.4 * k, shaftW * 2), ink)
      m.name = `shaft-rung-${d}-${f}`
      m.position.copy(polar3(r, d, T_SHAFT / 2 + 0.35 * k))
      m.rotation.y = -rad(d)
      col.rungs.push({ f, mesh: m })
      group.add(m)
    }
    /* no foot rivets: they read as an unexplained dot at the ring's inner corner beside
       each hex, and the foot needs no fastener of its own — the hex is the fastener */
    /* two claw hooks biting from the gripper ends toward main, r 2.5k */
    for (const off of [GRIP - 7, -(GRIP - 7)]) {
      const p0 = polar3(gripR + 3 * k, d + off, 0)
      const p1 = polar3(Math.max(coreRadius * 0.94, gripR - 9 * k), d + off * 0.55, coreRadius * 0.16)
      const len = p0.distanceTo(p1)
      const geo = new THREE_.CapsuleGeometry(1.7 * k, len, 6, 12)
      const m = new THREE_.Mesh(geo, ink)
      m.name = `claw-${d}-${off}`
      m.position.copy(p0.clone().add(p1).multiplyScalar(0.5))
      m.quaternion.setFromUnitVectors(new THREE_.Vector3(0, 1, 0), p1.clone().sub(p0).normalize())
      col.claws.push({ off, mesh: m })
      group.add(m)
    }
    /* the fastener at the clamp centre: bolt r 3.6k with a 2.6k slot */
    const bolt = new THREE_.Mesh(new THREE_.CylinderGeometry(2.6 * k, 2.6 * k, 5 * k, 24), ink)
    bolt.name = `clamp-bolt-${d}`
    bolt.position.copy(polar3(gripR - 1 * k, d, T_GRIP / 2 + 1.5 * k))
    group.add(outline(bolt, 30))
    const bslot = new THREE_.Mesh(new THREE_.BoxGeometry(3.8 * k, 1.2 * k, 1.1 * k), metal)
    bslot.name = `clamp-bolt-slot-${d}`
    bslot.position.copy(polar3(gripR - 1 * k, d, T_GRIP / 2 + 5 * k))
    bslot.rotation.y = -rad(d)
    group.add(bslot)
    col.bolt = bolt
    col.bslot = bslot
  }

  /* ── main: the protected branch, a real sphere at coreRadius ─────────────
     It rides PROUD of the collar plane (centre lifted CORE.lift·R — 0.22 in the hero, so
     the collar crosses below the widest point, where sphere and egg stop being ambiguous)
     so it reads as a whole sphere from a low camera instead of being cut in half. */
  const CORE_LIFT = coreRadius * CORE.lift
  const mainGroup = new THREE_.Group()
  mainGroup.name = 'main'
  mainGroup.position.y = CORE_LIFT
  group.add(mainGroup)

  /* main: a solid sphere with cel shading — enough tonal separation to read as a body,
     nothing like a photographic highlight. Two paths:
       'flat' — the original: neutral multipliers over --card written into a colour attribute.
                In light mode --card and --background sit within a few percent of each other,
                so a ~15% spread of white on white wraps nothing: the core reads as an oval
                outline in a cup. Dark mode was never affected.
       'deep' — a per-fragment terminator: four bands ramping --card → --secondary → --primary,
                a narrow rim crescent at the shadow-side silhouette, and contact occlusion
                rising from the collar plane. Cut in the FRAGMENT shader — hard thresholds on
                vertex colours follow the mesh facets and the terminator comes out a sawtooth.
     No new colour either way: every tone mixes --card, --secondary and --primary. Unlit, so it
     stays a technical drawing. */
  const sphereGeo = new THREE_.SphereGeometry(coreRadius, 160, 112)
  const VDIR = new THREE_.Vector3(0, 0.42, 1).normalize() // ~the hero camera; places the crescent
  const LDEEP = new THREE_.Vector3(-0.66, 0.56, 0.26).normalize()
  const DEEP = CORE.ramp === 'deep'
  let sphereMat = core
  /* Uniform colours must be LINEAR and the fragment must run three's own output transform:
     a ShaderMaterial gets neither automatically, and missing either lifts the whole ramp back
     toward white — which looks exactly like the bug this path exists to fix. */
  const lin = (hex) => new THREE_.Color().setHex(hex, THREE_.SRGBColorSpace)

  if (DEEP) {
    /* One ramp, every scheme: --card → --hero-core-shade → --hero-core-deep. The two targets
       are CSS variables scoped to the hero (hero-core.css) and derived from the theme's own
       tokens — --secondary/--primary in light, the same two mixed back toward --card in
       dark, where they would otherwise be far lighter than the card and brighten the shadow
       side. The shader never asks which scheme it is in; only the colours change. */
    sphereMat = new THREE_.ShaderMaterial({
      name: 'main-core-cel',
      uniforms: {
        uCard: { value: lin(cardHex) },
        uShade: { value: lin(cssColor(tokenRoot, '--hero-core-shade')) },
        uDeep: { value: lin(cssColor(tokenRoot, '--hero-core-deep')) },
        uL: { value: LDEEP },
        uV: { value: VDIR },
        uAo: { value: CORE.contact ? 1 : 0 },
        uLift: { value: CORE_LIFT },
        uR: { value: coreRadius }
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vP;
        void main() {
          vN = normal; vP = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vN; varying vec3 vP;
        uniform vec3 uCard, uShade, uDeep, uL, uV;
        uniform float uAo, uLift, uR;
        void main() {
          vec3 n = normalize(vN);
          float d = dot(n, uL);
          float t = d > 0.55 ? 0.0 : d > 0.34 ? 0.10 : d > 0.14 ? 0.22 : 0.36;
          float facing = dot(n, uV);
          if (d < 0.0 && facing > 0.0 && facing < 0.17) t = 0.16;   // rim crescent
          // card and shade are close (light: card vs secondary), so the second mix toward
          // deep is what makes the ramp register at all
          vec3 col = mix(mix(uCard, uShade, min(1.0, t * 1.1)), uDeep, t * 0.22);
          float reach = uR * 0.8;
          float ao = pow(clamp((reach - uLift - vP.y) / reach, 0.0, 1.0), 1.6);
          col = mix(col, uDeep, ao * 0.13 * uAo);
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`
    })
  } else {
    const nrmAttr = sphereGeo.attributes.normal
    const cols = new Float32Array(nrmAttr.count * 3)
    const LDIR = new THREE_.Vector3(-0.45, 0.78, 0.44).normalize()
    for (let i = 0; i < nrmAttr.count; i++) {
      const d = nrmAttr.getX(i) * LDIR.x + nrmAttr.getY(i) * LDIR.y + nrmAttr.getZ(i) * LDIR.z
      const tone = d > 0.55 ? 1 : d > 0.12 ? 0.96 : d > -0.3 ? 0.905 : 0.85
      cols[i * 3] = tone
      cols[i * 3 + 1] = tone
      cols[i * 3 + 2] = tone
    }
    sphereGeo.setAttribute('color', new THREE_.BufferAttribute(cols, 3))
    core.vertexColors = true
  }
  const sphere = new THREE_.Mesh(sphereGeo, sphereMat)
  sphere.name = 'main-sphere'
  mainGroup.add(sphere)

  /* silhouette: a slightly larger back-faced shell in ink. Only the sliver that extends
     past the front sphere is visible, so it reads as one crisp contour from every angle —
     the 3D equivalent of the source circle's stroke. */
  const contour = new THREE_.Mesh(
    new THREE_.SphereGeometry(coreRadius * 1.018, 96, 64),
    new THREE_.MeshBasicMaterial({ name: 'main-contour', color: inkHex, side: THREE_.BackSide })
  )
  contour.name = 'main-contour'
  mainGroup.add(contour)

  /* wire net: lines that wrap the form are the strongest sphere cue and cost nothing tonally.
     Latitudes crowd toward the top and the terminator rather than an even ladder. Off (no
     lines at all) unless the caller sets CORE.wire, which is also the line alpha. */
  const wire = new THREE_.Group()
  wire.name = 'main-wire'
  const R = coreRadius * 1.001
  const WIRE = !!CORE.wire
  for (const lat of WIRE ? [-0.98, -0.66, -0.34, -0.06, 0.24, 0.55, 0.86] : []) {
    const rr = Math.cos(lat) * R
    const pts = []
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2
      pts.push(new THREE_.Vector3(Math.cos(a) * rr, Math.sin(lat) * R, Math.sin(a) * rr))
    }
    wire.add(new THREE_.Line(new THREE_.BufferGeometry().setFromPoints(pts), wireMat))
  }
  for (let j = 0; j < (WIRE ? 8 : 0); j++) {
    const lon = (j / 8) * Math.PI
    const pts = []
    for (let i = 0; i <= 64; i++) {
      const t = -Math.PI / 2 + (i / 64) * Math.PI
      pts.push(new THREE_.Vector3(Math.cos(lon) * Math.cos(t) * R, Math.sin(t) * R, Math.sin(lon) * Math.cos(t) * R))
    }
    wire.add(new THREE_.Line(new THREE_.BufferGeometry().setFromPoints(pts), wireMat))
  }
  // added to the label's spinner below, not to mainGroup — the net is SURFACE and must turn
  // with the label; the cel shading on the sphere mesh is LIGHT and must not.

  /* the label, on a spherical patch so it curves with the surface */
  function labelCanvas(hex) {
    const cv = document.createElement('canvas')
    cv.width = 1024; cv.height = 1024
    const g = cv.getContext('2d')
    const css = `#${hex.toString(16).padStart(6, '0')}`
    g.clearRect(0, 0, 1024, 1024)
    g.fillStyle = css
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    const mono = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace'
    g.font = `700 300px ${mono}`
    g.fillText('main', 512, 372)
    // the git-branch glyph from its real primitives: trunk, two nodes, branch arc
    g.strokeStyle = css
    g.lineWidth = 2.1
    g.lineJoin = 'round'
    g.lineCap = 'round'
    g.save()
    g.translate(512 - 12 * 13, 500)
    g.scale(13, 13)
    g.beginPath(); g.moveTo(6, 3); g.lineTo(6, 15); g.stroke()
    g.beginPath(); g.arc(18, 6, 3, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.arc(6, 18, 3, 0, Math.PI * 2); g.stroke()
    g.beginPath(); g.arc(9, 9, 9, 0, Math.PI / 2); g.stroke()
    g.restore()
    return cv
  }
  const mkTex = (hex) => {
    const t = new THREE_.CanvasTexture(labelCanvas(hex))
    t.colorSpace = THREE_.SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  const labelMat = new THREE_.MeshBasicMaterial({ name: 'main-label', map: mkTex(inkHex), transparent: true, depthWrite: false })
  const labelGreenMat = new THREE_.MeshBasicMaterial({ name: 'main-label-merged', map: mkTex(greenHex), transparent: true, opacity: 0, depthWrite: false })
  const PATCH = 1.45
  const patchGeo = new THREE_.SphereGeometry(coreRadius * 1.002, 96, 64, Math.PI / 2 - PATCH / 2, PATCH, Math.PI / 2 - 0.5 - PATCH / 2, PATCH)
  /* both labels ride a spinner, so the core reads as turning; the green one cross-fades
     in as the spin settles — main, merged */
  const spinner = new THREE_.Group()
  spinner.name = 'main-spinner'
  const patch = new THREE_.Mesh(patchGeo, labelMat)
  patch.name = 'main-label'
  spinner.add(patch)
  const patchGreen = new THREE_.Mesh(patchGeo.clone(), labelGreenMat)
  patchGreen.name = 'main-label-merged'
  spinner.add(patchGreen)
  /* Motion smear: a short angular trail of the label, fading back from the leading face.
     One frame of a fast spin still renders crisp type, so the blur has to be geometric —
     at speed these read as a continuous band, and at rest they vanish. */
  const TRAIL = 8
  const trailMats = []
  for (let i = 1; i <= TRAIL; i++) {
    const tm = new THREE_.MeshBasicMaterial({ name: `main-label-trail-${i}`, map: labelMat.map, transparent: true, opacity: 0, depthWrite: false })
    const tp = new THREE_.Mesh(patchGeo.clone(), tm)
    tp.name = `main-label-trail-${i}`
    tp.userData.trailIndex = i
    spinner.add(tp)
    trailMats.push({ mat: tm, mesh: tp, i })
  }
  /* The wire net rides the spinner too. Once the surface is visible (wire + ramp), a label
     turning over a static net reads as text sliding across a ball, not a ball turning. The
     shaded sphere mesh stays on mainGroup: its terminator, crescent and collar occlusion are
     lighting, fixed to the light and camera, and would be wrong to rotate with the body. */
  spinner.add(wire)
  mainGroup.add(spinner)

  /* Micro-arcs: very soft, very transparent green flickers that jump from a random point
     on the inner ring to a random height on main — sometimes barely off the ring, other
     times most of the way up. Each lives about a second. Just enough to feel electrical
     activity, never enough to read as a feature. */
  const MICRO = 7
  const micros = []
  for (let i = 0; i < MICRO; i++) {
    const mat = new THREE_.MeshBasicMaterial({ name: `micro-arc-${i}`, color: greenHex, transparent: true, opacity: 0, depthWrite: false })
    const mesh = new THREE_.Mesh(new THREE_.BufferGeometry(), mat)
    mesh.name = `micro-arc-${i}`
    mesh.visible = false
    group.add(mesh)
    micros.push({ mesh, mat, t: 0, life: 0 })
  }
  function spawnMicro(slot, gRnow, spinNow) {
    /* never climb across the face carrying the label — it reads as a mess over the type */
    const faceAz = Math.PI / 2 + (spinNow || 0)
    let th = 0
    for (let tries = 0; tries < 12; tries++) {
      th = Math.random() * Math.PI * 2
      const delta = Math.atan2(Math.sin(th - faceAz), Math.cos(th - faceAz))
      if (Math.abs(delta) > 1.0) break
    }
    const climb = 0.1 + Math.random() ** 1.6 * 0.8          // 10% to 90% up the sphere
    const phi = climb * (Math.PI / 2)
    const from = new THREE_.Vector3(Math.cos(th) * gRnow, T_GRIP / 2, Math.sin(th) * gRnow)
    const to = new THREE_.Vector3(
      Math.cos(phi) * Math.cos(th) * coreRadius * 1.01,
      CORE_LIFT + Math.sin(phi) * coreRadius * 1.01,
      Math.cos(phi) * Math.sin(th) * coreRadius * 1.01
    )
    const pts = []
    const N = 9
    for (let j = 0; j <= N; j++) {
      const u = j / N
      const p = from.clone().lerp(to, u)
      const env = Math.sin(u * Math.PI)
      p.y += env * (2 + Math.random() * 4) * k
      p.x += (Math.random() - 0.5) * env * 5 * k
      p.z += (Math.random() - 0.5) * env * 5 * k
      pts.push(p)
    }
    slot.mesh.geometry.dispose()
    slot.mesh.geometry = new THREE_.TubeGeometry(new THREE_.CatmullRomCurve3(pts), 26, 0.75 * k, 4, false)
    slot.t = 0
    slot.life = 0.55 + Math.random() * 0.7
    slot.peak = 0.22 + Math.random() * 0.2                  // soft, but present
    slot.mesh.visible = true
  }

  /* Green current across the INNER collar's gaps — the SAME animated component as the
     outer conduits (same wave maths, rebuilt per frame), three strands at different
     weights and opacities. It is welded to the gripper band ends, so it only exists once
     the arms have closed on main. */
  const INNER_HALF = 13
  const INNER_STRANDS = [
    { amp: 0.62, width: 1.5, opacity: 0.95, band: -1, samples: 20, seed: 0, speed: 0.1, dir: 1 },
    { amp: 0.5, width: 1.1, opacity: 0.66, band: 0.35, samples: 18, seed: 31, speed: 0.14, dir: -1 },
    { amp: 0.4, width: 0.8, opacity: 0.42, band: 1.2, samples: 16, seed: 67, speed: 0.08, dir: 1 }
  ]
  const innerMats = INNER_STRANDS.map((s, i) => new THREE_.MeshBasicMaterial({
    name: `merge-current-${i}`, color: greenHex, transparent: true, opacity: 0
  }))
  const innerTimes = INNER_STRANDS.map(() => 0)
  parts.inner = []
  for (const deg of CONDUIT_ANGLES_DEG) {
    INNER_STRANDS.forEach((s, i) => {
      const mesh = new THREE_.Mesh(new THREE_.BufferGeometry(), innerMats[i])
      mesh.name = `merge-current-${deg}-${i}`
      mesh.visible = false
      group.add(mesh)
      parts.inner.push({ deg, i, mesh })
    })
  }

  /* ── screws grow IN PLACE: re-parent each bolt's meshes under a group pinned to the
     ring's top surface, so a single scale reproduces the source's `scale(screwScale)` ── */
  for (const s of parts.screws) {
    const pivot = new THREE_.Group()
    pivot.name = `screw-${s.a}`
    pivot.position.copy(polar3(rMid, s.a, T_RING / 2))
    group.add(pivot)
    s.meshes.forEach((mesh, i) => {
      mesh.position.copy(s.base[i]).sub(pivot.position)
      pivot.add(mesh)
    })
    s.pivot = pivot
  }

  /* ── electricity: real tubes along the source's wave curve, across each gap ──── */
  const sparkMat = new THREE_.MeshBasicMaterial({ name: 'spark', color: inkHex })
  const halfBand = (rOut - rIn) / 2
  const times = WAVE_VARIANTS.map(() => 0)
  for (const deg of CONDUIT_ANGLES_DEG) {
    for (let w = 0; w < WAVE_VARIANTS.length; w++) {
      const mesh = new THREE_.Mesh(new THREE_.BufferGeometry(), sparkMat)
      mesh.name = `spark-${deg}-${w}`
      mesh.visible = false
      group.add(mesh)
      parts.sparks.push({ deg, w, mesh })
    }
    /* connector pins — three sockets set INTO each band's end face, at the height the
       current runs, so the electricity visibly springs from them */
    for (const side of [-1, 1]) {
      const theta = deg + side * (CONDUIT_HALF_DEG - SOCKET_INSET_DEG)
      for (const j of [-1, 0, 1]) {
        const pin = new THREE_.Mesh(new THREE_.SphereGeometry(1.5 * k, 16, 12), ink)
        pin.name = `socket-pin-${deg}-${side}-${j}`
        pin.position.copy(polar3(rMid + j * (rOut - rIn) * 0.28, theta, 0))
        pin.visible = false
        group.add(pin)
        parts.pins.push({ mesh: pin, phase: (j + 1) * 0.44 })
      }
    }
  }

  /* ── live rebuilds ─────────────────────────────────────────────────────────── */
  const FAST = { curveSegments: 14, bevelEnabled: false }
  const q = (v, step) => Math.round(v / step) * step
  /* Rebuilding an ExtrudeGeometry plus its EdgesGeometry is expensive, so a part that is
     still moving is rebuilt COARSE with its outline hidden, and quantised so it
     re-extrudes a couple of dozen times across the ramp instead of once per frame. When
     the ramp completes, one high-quality rebuild restores the bevel and the ink outline. */
  const reshape = (mesh, shape, t, final) => {
    const geo = new THREE_.ExtrudeGeometry(shape, { ...(final ? EX : FAST), depth: t })
    geo.translate(0, 0, -t / 2)
    geo.rotateX(-Math.PI / 2)
    mesh.geometry.dispose()
    mesh.geometry = geo
    const line = mesh.children.find((ch) => ch.isLineSegments)
    if (!line) return
    /* The ink outline is rebuilt on EVERY step, not just the last one: it is the lines
       themselves that deploy. Hiding them mid-growth made a bare surface unfurl and then
       snap into line art. The quantised span keeps the rebuild count sane. */
    line.visible = true
    line.geometry.dispose()
    line.geometry = new THREE_.EdgesGeometry(geo, 24)
  }
  const segShape = (a, span) => {
    const s = new THREE_.Shape()
    s.absarc(0, 0, rOut, rad(a - span), rad(a + span), false)
    s.absarc(0, 0, rIn, rad(a + span), rad(a - span), true)
    s.closePath()
    return s
  }
  const shaftShape = (d, gR) => {
    const rO = rIn - 1 * k, rO2 = rO - 15 * k, footW = 14 * k, shaftW = 9 * k
    return new THREE_.Shape([
      ray(rO, d, footW), ray(rO2, d, footW), ray(rO2, d, shaftW),
      ray(gR, d, shaftW), ray(gR, d, -shaftW), ray(rO2, d, -shaftW),
      ray(rO2, d, -footW), ray(rO, d, -footW)
    ])
  }
  const gripShape = (d, gR) => {
    const s = new THREE_.Shape()
    s.absarc(0, 0, gR + 5 * k, rad(d - GRIP), rad(d + GRIP), false)
    s.absarc(0, 0, gR - 7 * k, rad(d + GRIP), rad(d - GRIP), true)
    s.closePath()
    return s
  }
  const pulseScale = (x) => {
    if (x <= 0 || x >= 1) return 1
    if (x < 0.22) return 1 - 0.17 * (x / 0.22)
    if (x < 0.5) return 0.83 + 0.28 * ((x - 0.22) / 0.28)
    return 1.11 - 0.11 * ((x - 0.5) / 0.5)
  }

  /* state: { core, screw, deploy, clamp, spark, mainPulse } — the source's own beats,
     plus main's arrival: the core descends into the fabric it is already curving. */
  /* main is simply THERE from the first frame — the fabric is already curved by its mass */
  let sparkFrame = 0
  let lastMicroTime = 0
  function update(state) {
    const screw = cl(state.screw ?? 1)
    const deploy = cl(state.deploy ?? 1)
    const clampP = cl(state.clamp ?? 1)
    const spark = cl(state.spark ?? 1)

    // stage 1 — the four bolts rise together, in place
    for (const s of parts.screws) {
      const sc = EASE(screw)
      s.pivot.visible = sc > 0.001
      s.pivot.scale.setScalar(Math.max(0.001, sc))
    }

    // stage 2 — each band deploys out of its bolt, rungs and rivets riding the ends
    parts.bands.forEach((b, i) => {
      const raw = ARC_HALF * cl((deploy - i * 0.14) / 0.5)
      const done = raw >= ARC_HALF - 0.001
      /* rebuilt continuously, outline included, so the ink deploys WITH the metal — but
         QUANTISED: an unsnapped span re-extrudes four beveled solids plus their edge
         geometry on every single frame, which pegs the main thread flat */
      const span = done ? ARC_HALF : q(raw, ARC_HALF / 22)
      b.mesh.visible = span > 0.5
      if (b.mesh.visible && (span !== b.span || (done && !b.final))) {
        reshape(b.mesh, segShape(b.a, span), T_RING, done)
        b.span = span
        b.final = done
      }
      for (const r of parts.rungs) if (r.a === b.a) r.mesh.visible = b.mesh.visible && Math.abs(r.d) <= span
      for (const r of parts.rivets) {
        if (r.a !== b.a) continue
        r.mesh.visible = b.mesh.visible
        r.mesh.position.copy(polar3(rMid, b.a + r.sign * span, T_RING / 2))
      }
    })

    // stage 4 — the columns ride inward until the grippers clamp main
    const p = EASE(clampP)
    const strutOuter = rIn - 1 * k
    const clampDone = clampP >= 0.999
    const gRraw = strutOuter - (strutOuter - gripR) * p
    /* the step has to be in HARNESS units (radii are ~170 here) — 0.004 quantised to
       nothing and re-extruded twelve solids per frame */
    const gR = clampDone ? gripR : q(gRraw, 0.6 * k)
    const hookSnap = cl((clampP - 0.82) / 0.18)
    for (const col of parts.columns) {
      const on = p > 0.001
      col.shaft.visible = on
      col.grip.visible = on
      for (const f of col.feet) f.visible = on     // the foot rivets arrive WITH their column
      col.headJoint.visible = on
      if (on && (gR !== col.gripR || (clampDone && !col.final))) {
        reshape(col.shaft, shaftShape(col.d, gR), T_SHAFT, clampDone)
        reshape(col.grip, gripShape(col.d, gR), T_GRIP, clampDone)
        col.gripR = gR
        col.final = clampDone
      }
      const rO2 = strutOuter - 15 * k
      for (const r of col.rungs) {
        r.mesh.visible = on
        r.mesh.position.copy(polar3(rO2 - (rO2 - gR) * r.f, col.d, T_SHAFT / 2 + 0.35 * k))
      }
      for (const cw of col.claws) {
        cw.mesh.visible = false
        const p0 = polar3(gR + 3 * k, col.d + cw.off, 0)
        const p1 = polar3(Math.max(coreRadius * 0.94, gR - 9 * k), col.d + cw.off * 0.55, coreRadius * 0.16)
        cw.mesh.position.copy(p0.clone().add(p1).multiplyScalar(0.5))
        cw.mesh.quaternion.setFromUnitVectors(new THREE_.Vector3(0, 1, 0), p1.clone().sub(p0).normalize())
      }
      col.bolt.visible = hookSnap > 0.02
      col.bslot.visible = hookSnap > 0.02
      col.bolt.position.copy(polar3(gR - 1 * k, col.d, T_GRIP / 2 + 1.5 * k))
      col.bslot.position.copy(polar3(gR - 1 * k, col.d, T_GRIP / 2 + 5 * k))
    }

    // stage 3 — the currents strike across the gaps (full length in the first ⅙)
    const cur = state.cursor || null
    const ax = cl(state.waveAxis ?? 0)     // 0 = radial swing, 1 = vertical swing
    const draw = cl(spark * 6)
    for (let w = 0; w < WAVE_VARIANTS.length; w++) times[w] += WAVE_VARIANTS[w].speed * WAVE_VARIANTS[w].dir
    sparkFrame++
    const rebuildSparks = sparkFrame % 2 === 0     // the crackle reads fine at 30fps
    for (const s of parts.sparks) {
      s.mesh.visible = draw > 0.02
      if (!s.mesh.visible || !rebuildSparks) continue
      const v = WAVE_VARIANTS[s.w]
      const mid = rad(s.deg)
      const half = rad(CONDUIT_HALF_DEG)
      const waveR = rMid + v.band * halfBand * 0.42
      const amp = halfBand * v.amplitude
      const n = Math.max(3, Math.round(v.samples * draw))
      /* Cursor attraction, ported from HarnessStructure: each conduit within PULL_RANGE
         bulges toward the pointer, strength by proximity, and the pull switches off while
         the pointer is inside the harness metal. Source values are px at c = 190. */
      let pullX = 0, pullZ = 0
      if (cur) {
        const ax = Math.cos(mid) * rMid, az = Math.sin(mid) * rMid
        const dx = cur.x - ax, dz = cur.z - az
        const dist = Math.hypot(dx, dz) || 1
        if (dist < PULL_RANGE) {
          const distC = Math.hypot(cur.x, cur.z)
          const innerFade = cl((distC - rOut) / (34 * k))
          const strength = (1 - dist / PULL_RANGE) * innerFade
          pullX = (dx / dist) * strength * MAX_PULL
          pullZ = (dz / dist) * strength * MAX_PULL
        }
      }
      const pts = []
      for (let i = 0; i <= n; i++) {
        const t = i / v.samples
        const env = Math.sin(Math.min(1, t) * Math.PI)
        const seed = v.seed + s.deg * 0.13
        const h1 = hash01(i + seed), h2 = hash01(i + seed + 97)
        const off = Math.sin(i * 1.5 - times[s.w] + h1 * 6.283) * 0.62 + Math.sin(i * 5.3 - times[s.w] * 1.9 + h2 * 6.283) * 0.38
        /* the out-of-plane motion needs its OWN, higher frequency: reusing the radial
           waveform only bent the strand into a smooth ribbon */
        const zig = (Math.sin(i * 1.35 - times[s.w] * 0.55 + h1 * 6.283) * 0.75 +
                     Math.sin(i * 3.1 - times[s.w] * 0.35 + h2 * 6.283) * 0.25) * amp * env
        const swing = off * amp * env
        const r = Math.max(rIn, Math.min(rOut, waveR + swing * (1 - 0.55 * ax)))
        const jit = (hash01(i + seed + 50) - 0.5) * (2 * half) * 0.07
        const ang = mid - half + 2 * half * t + jit
        pts.push(new THREE_.Vector3(
          Math.cos(ang) * r + pullX * env,
          swing * 0.5 + zig * 0.62 * ax,
          Math.sin(ang) * r + pullZ * env
        ))
      }
      const curve = new THREE_.CatmullRomCurve3(pts)
      s.mesh.geometry.dispose()
      s.mesh.geometry = new THREE_.TubeGeometry(curve, Math.max(8, n), v.width * 0.55 * k, 4, false)
    }
    /* the inner merge current: same rebuild path as the sparks, keyed to the arms' own
       radius so it stays welded to the gripper ends as they close */
    const mergeAmt = cl(state.merge ?? 0)
    for (let i = 0; i < INNER_STRANDS.length; i++) {
      innerMats[i].opacity = mergeAmt * INNER_STRANDS[i].opacity
      innerTimes[i] += INNER_STRANDS[i].speed * INNER_STRANDS[i].dir
    }
    for (const s of parts.inner) {
      const on = mergeAmt > 0.02 && hookSnap > 0.5
      s.mesh.visible = on
      if (!on || !rebuildSparks) continue
      const v = INNER_STRANDS[s.i]
      const mid = rad(s.deg)
      const half = rad(INNER_HALF)
      const rBase = gR + v.band * 2.6 * k
      const amp = 3.6 * k * v.amp
      const pts = []
      for (let j = 0; j <= v.samples; j++) {
        const tt = j / v.samples
        const env = Math.sin(tt * Math.PI)
        const h1 = hash01(j + v.seed + s.deg), h2 = hash01(j + v.seed + s.deg + 97)
        const off = Math.sin(j * 1.5 - innerTimes[s.i] + h1 * 6.283) * 0.62 +
                    Math.sin(j * 5.3 - innerTimes[s.i] * 1.9 + h2 * 6.283) * 0.38
        const swing = off * amp * env
        const zig = (Math.sin(j * 1.35 - innerTimes[s.i] * 0.55 + h1 * 6.283) * 0.75 +
                     Math.sin(j * 3.1 - innerTimes[s.i] * 0.35 + h2 * 6.283) * 0.25) * amp * env
        const r = rBase + swing * (1 - 0.55 * ax)
        const jit = (hash01(j + v.seed + 50) - 0.5) * (2 * half) * 0.07
        const ang = mid - half + 2 * half * tt + jit
        pts.push(new THREE_.Vector3(Math.cos(ang) * r, swing * 0.5 + zig * 0.55 * ax, Math.sin(ang) * r))
      }
      s.mesh.geometry.dispose()
      s.mesh.geometry = new THREE_.TubeGeometry(new THREE_.CatmullRomCurve3(pts), Math.max(10, v.samples), v.width * 0.5 * k, 4, false)
    }

    /* the soft micro-arcs, spawned at random while the merge current runs */
    const now = state.time ?? 0
    const dtm = Math.min(0.06, Math.max(0, now - lastMicroTime))
    lastMicroTime = now
    for (const s of micros) {
      if (s.life > 0) {
        s.t += dtm
        if (s.t >= s.life) { s.life = 0; s.mesh.visible = false; s.mat.opacity = 0 }
        else s.mat.opacity = Math.sin((s.t / s.life) * Math.PI) * s.peak * mergeAmt
      } else if (mergeAmt > 0.5 && hookSnap > 0.5 && Math.random() < dtm * 2.2) {
        spawnMicro(s, gR, state.spin ?? 0)
      }
    }

    for (const pin of parts.pins) {
      pin.mesh.visible = spark > 0
      const beat = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(times[0] * 2 + pin.phase * Math.PI))
      pin.mesh.scale.setScalar(0.7 + 0.5 * beat)
    }

    /* the merge: main spins up like a particle accelerator, then decelerates into place
       facing the camera, turning green as it settles */
    const spin = state.spin ?? 0
    const green = cl(state.green ?? 0)
    /* main starts with its face pointing UP — readable in the plan view — and rights
       itself as the camera tips, so the single turn reads as a diagonal tumble and lands
       exactly facing the viewer at the end. */
    spinner.rotation.order = 'YXZ'
    spinner.rotation.y = spin
    spinner.rotation.x = -(Math.PI / 2 - 0.5) * (1 - cl(state.tip ?? 1))
    /* blur: 0 at rest, 1 when spinning fast enough that no glyph should be readable */
    const blur = 0                     // no motion smear: main turns once, slowly
    const arc = 0.34 * blur
    for (const t of trailMats) {
      t.mesh.rotation.y = -arc * (t.i / TRAIL)
      t.mat.opacity = blur * 0.42 * (1 - t.i / (TRAIL + 2))
    }
    labelMat.opacity = (1 - green) * (1 - blur * 0.72)
    labelGreenMat.opacity = green * (1 - blur * 0.72)

    // the squeeze on main as the harness latches
    mainGroup.scale.setScalar(pulseScale(cl(state.mainPulse ?? 1)))
    mainGroup.visible = true
    mainGroup.position.y = CORE_LIFT
  }

  update({ core: 1, screw: 1, deploy: 1, clamp: 1, spark: 1, mainPulse: 1 })

  /* ── retheme: repaint in place ─────────────────────────────────────────────
     A theme switch must NOT rebuild the harness — a rebuild replays the build animation and
     re-locks the scroll, when all that changed is the palette. Every colour in this group is
     one of four tokens or one known mix of two, so each material is tagged once here with
     the token it carries (by colour equality against the values this build read), and
     retheme() re-reads the tokens and repaints by tag: material colours, the two label
     textures (the trails share the main label's map), the one mixed colour, and the cel
     shader's uniforms including its light/dark switch. Geometry is untouched. */
  const TOKENS = { ink: '--primary', sand: '--secondary', card: '--card', green: '--success' }
  const eachMat = (fn) =>
    group.traverse((o) => {
      if (!o.material) return
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) fn(m)
    })
  {
    const ref = { ink: new THREE_.Color(inkHex), sand: new THREE_.Color(metalHex), card: new THREE_.Color(cardHex), green: new THREE_.Color(greenHex) }
    eachMat((m) => {
      if (m.isShaderMaterial || !m.color) return
      for (const k in ref) {
        if (m.color.equals(ref[k])) {
          m.userData.tint = k
          break
        }
      }
    })
  }
  function retheme() {
    const next = {}
    for (const k in TOKENS) next[k] = token(TOKENS[k])
    eachMat((m) => {
      if (m.userData.tint) m.color.setHex(next[m.userData.tint])
    })
    metalSide.color.setHex(mixHex(next.sand, next.ink, 0.34))
    labelMat.map?.dispose()
    labelMat.map = mkTex(next.ink)
    for (const t of trailMats) t.mat.map = labelMat.map
    labelGreenMat.map?.dispose()
    labelGreenMat.map = mkTex(next.green)
    if (DEEP) {
      const u = sphereMat.uniforms
      u.uCard.value = lin(next.card)
      u.uShade.value = lin(cssColor(tokenRoot, '--hero-core-shade'))
      u.uDeep.value = lin(cssColor(tokenRoot, '--hero-core-deep'))
    }
  }

  return {
    group,
    update,
    retheme,
    materials: { metal, metalSide, ink, core, edgeMat, wireMat, labelMat, sparkMat },
    dims: { c, k, rOut, rIn, rMid, coreRadius, gripR, coreLift: CORE_LIFT }
  }
}
