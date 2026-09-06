/* The spacetime fabric as REAL geometry: one ground mesh of ink hairlines that the core's
   mass dishes, and that the shock wave ripples outward through. Same math as the portal's
   fabric.ts (radial fold + three travelling fronts + shimmer) — now displacing actual
   vertices in the same scene as the harness, so the wave passes under and around it. */
import * as THREE from 'three'

const clamp01 = (x) => Math.max(0, Math.min(1, x))

export function buildField(THREE_ = THREE, opts = {}) {
  const R = opts.radius ?? 9          // world radius of the sheet
  const N = opts.divisions ?? 56      // lines per axis
  // the ink colour is passed in from a design-system token — never defaulted to a literal
  if (opts.ink === undefined) throw new Error('buildField: opts.ink is required (from --primary)')
  if (opts.surface === undefined) throw new Error('buildField: opts.surface is required (from --background)')
  const inkHex = opts.ink
  const surfaceHex = opts.surface
  if (opts.flashHex == null) throw new Error('buildField: opts.flashHex is required (from --card)')
  const flashHex = opts.flashHex
  const dishDepth = opts.dishDepth ?? 0.7
  const dishR = opts.dishR ?? 2.4
  const coreR = opts.coreR ?? 0                 // the mass resting in the well
  const contactY = -dishDepth                   // its lowest point — the sheet meets it here

  const step = (R * 2) / N
  const base = []                     // flat (x, z) per vertex
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c <= N; c++) base.push(-R + c * step, -R + r * step)
  }
  /* A UNIFORM grid: constant spacing everywhere, extended far enough that the camera-depth
     fade hides its edge. Any stretch (radial or per-axis) makes spacing jump, which is what
     made the far field look broken. Only the vertices near the centre are ever moved, so a
     very large plane stays cheap. */
  const vertexCount = (N + 1) * (N + 1)
  const positions = new Float32Array(vertexCount * 3)
  const alphas = new Float32Array(vertexCount)
  const surfAlphas = new Float32Array(vertexCount)
  for (let i = 0; i < vertexCount; i++) {
    positions[i * 3] = base[i * 2]
    positions[i * 3 + 2] = base[i * 2 + 1]
  }
  const activeR = opts.activeRadius ?? 13
  const active = []
  for (let i = 0; i < vertexCount; i++) {
    if (Math.hypot(base[i * 2], base[i * 2 + 1]) <= activeR) active.push(i)
  }
  /* the well shape, the radial direction and the shimmer phases never change — computed
     once here instead of ~400k transcendental calls per frame in update() */
  const AC = active.length
  const acIdx = new Int32Array(active)
  const acX = new Float32Array(AC)
  const acZ = new Float32Array(AC)
  const acD = new Float32Array(AC)
  const acNx = new Float32Array(AC)
  const acNz = new Float32Array(AC)
  const acWell = new Float32Array(AC)
  const acP1 = new Float32Array(AC)
  const acP2 = new Float32Array(AC)
  const acRipple = new Float32Array(AC)
  for (let n = 0; n < AC; n++) {
    const i = acIdx[n]
    const x = base[i * 2], z = base[i * 2 + 1]
    const d = Math.hypot(x, z)
    acX[n] = x; acZ[n] = z; acD[n] = d
    acNx[n] = d > 0.0001 ? x / d : 0
    acNz[n] = d > 0.0001 ? z / d : 0
    const t = d / dishR
    acWell[n] = Math.exp(-t * t * 1.35)
    acP1[n] = x * 0.55 + z * 0.35
    acP2[n] = x * 0.4 + z * 0.6
    acRipple[n] = d * 2.6
  }

  const index = []
  const fineIndex = []
  const at = (r, c) => r * (N + 1) + c
  /* two densities from ONE vertex grid, like the portal's fabric: every second line is the
     coarse mesh, the rest is the fine mesh drawn fainter */
  for (let r = 0; r <= N; r++) {
    for (let c = 0; c < N; c++) (r % 2 === 0 ? index : fineIndex).push(at(r, c), at(r, c + 1))
  }
  for (let c = 0; c <= N; c++) {
    for (let r = 0; r < N; r++) (c % 2 === 0 ? index : fineIndex).push(at(r, c), at(r + 1, c))
  }

  const geo = new THREE_.BufferGeometry()
  const posAttr = new THREE_.BufferAttribute(positions, 3)
  geo.setAttribute('position', posAttr)
  geo.setAttribute('aAlpha', new THREE_.BufferAttribute(alphas, 1))
  geo.setIndex(index)

  /* hairlines that fade with distance — the horizon dissolves instead of ending */
  const mat = new THREE_.ShaderMaterial({
    name: 'fabric',
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE_.Color().setHex(inkHex, THREE_.LinearSRGBColorSpace) },
      uOpacity: { value: opts.opacity ?? 0.3 },
      uCursor: { value: new THREE_.Vector3(0, 0, 1e6) },
      uLitR: { value: opts.litRadius ?? 1.7 },
      uLitAmt: { value: opts.litAmount ?? 0.5 },
      uFade: { value: new THREE_.Vector2(opts.fadeStart ?? 7.5, opts.fadeEnd ?? 15) },
      uTime: { value: 0 },
      uFlicker: { value: 0 },
      uTime2: { value: 0 }
    },
    vertexShader: `
      attribute float aAlpha;
      varying float vA;
      varying float vLit;
      varying float vDepth;
      varying vec2 vXZ;
      varying float vHash;
      uniform vec3 uCursor; uniform float uLitR;
      void main() {
        vA = aAlpha;
        vXZ = position.xz;
        vHash = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
        float d = length(position.xz - uCursor.xz);
        vLit = 1.0 - smoothstep(0.0, uLitR, d);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;                 // distance from the EYE, not from the origin
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uLitAmt; uniform vec2 uFade;
      uniform float uTime; uniform float uFlicker;
      varying float vA;
      varying float vLit;
      varying float vDepth;
      varying vec2 vXZ;
      varying float vHash;
      void main() {
        /* The lines fade with DEPTH. A radial fade vanishes along a circle around the
           world's centre, which at a grazing angle projects as an arc — that arc was the
           "curved horizon". A constant-depth boundary is a straight line across the
           frame, which is what a real ground plane looks like. */
        float far = 1.0 - smoothstep(uFade.x, uFade.y, vDepth);
        /* (1) vacuum flicker: each node brightens briefly on its own random phase */
        float flick = pow(max(0.0, sin(6.2831853 * (uTime * 0.22 + vHash))), 46.0) * uFlicker;
        float a = (vA * uOpacity + vLit * vLit * uLitAmt * step(0.02, vA)
                   + flick * 0.55 * step(0.02, vA)
                 ) * far;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor, a);
      }`
  })


  const mesh = new THREE_.LineSegments(geo, mat)
  mesh.name = 'fabric'
  mesh.frustumCulled = false
  mesh.renderOrder = 1

  /* the fine mesh: same vertices, the in-between lines, fainter */
  const fineGeo = new THREE_.BufferGeometry()
  fineGeo.setAttribute('position', posAttr)
  fineGeo.setAttribute('aAlpha', geo.attributes.aAlpha)
  fineGeo.setIndex(fineIndex)
  const fineMat = mat.clone()
  fineMat.uniforms = {
    uColor: { value: mat.uniforms.uColor.value },
    uOpacity: { value: (opts.opacity ?? 0.3) * 0.55 },
    uCursor: { value: mat.uniforms.uCursor.value },      // shared vector: one write moves both
    uLitR: { value: mat.uniforms.uLitR.value },
    uLitAmt: { value: (opts.litAmount ?? 0.5) * 0.7 },
    uFade: { value: mat.uniforms.uFade.value },
    uTime: { value: 0 },
    uFlicker: { value: 0 },
    uTime2: { value: 0 }
  }
  const fine = new THREE_.LineSegments(fineGeo, fineMat)
  fine.name = 'fabric-fine'
  fine.frustumCulled = false
  fine.renderOrder = 1
  mesh.add(fine)

  /* An OPAQUE surface sharing the same vertices: the sheet is a real skin, so anything
     below it is hidden instead of showing through and sorting badly. Rendered first and
     pushed back a hair with polygonOffset so the hairlines sit cleanly on top. */
  const surfGeo = new THREE_.BufferGeometry()
  surfGeo.setAttribute('position', posAttr)
  const tri = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      tri.push(at(r, c), at(r + 1, c), at(r + 1, c + 1))
      tri.push(at(r, c), at(r + 1, c + 1), at(r, c + 1))
    }
  }
  surfGeo.setIndex(tri)
  surfGeo.setAttribute('aSurf', new THREE_.BufferAttribute(surfAlphas, 1))
  /* The surface fades out at its rim, so the sheet dissolves into the page instead of
     ending on a visible disc edge — that hard border was what showed when zoomed out. */
  const surfMat = new THREE_.ShaderMaterial({
    name: 'fabric-surface',
    transparent: true,
    depthWrite: true,
    side: THREE_.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    uniforms: {
      uColor: { value: new THREE_.Color().setHex(surfaceHex, THREE_.LinearSRGBColorSpace) }
    },
    vertexShader: `
      attribute float aSurf;
      varying float vS;
      varying vec2 vXZ;
      void main() {
        vS = aSurf;
        vXZ = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vS;
      varying vec2 vXZ;
      void main() {
        if (vS <= 0.004) discard;
        gl_FragColor = vec4(uColor, vS);
      }`
  })
  const surface = new THREE_.Mesh(surfGeo, surfMat)
  surface.name = 'fabric-surface'
  surface.frustumCulled = false
  surface.renderOrder = 0
  mesh.add(surface)


  const pulses = []
  const FRONTS = [
    { speed: 2.2, sigma: 0.62, amp: 0.34 },
    { speed: 1.35, sigma: 0.8, amp: 0.2 },
    { speed: 0.7, sigma: 1.0, amp: 0.13 }
  ]

  /* one shock wave, fired the moment the harness latches */
  function pulse() { pulses.push({ t: 0, life: 1 }) }

  function update(dt, state = {}) {
    /* The well is the MASS's dent, not the pulse's: its depth tracks how much of main has
       arrived, so the fabric is already curved the moment the core exists. */
    const mass = clamp01(state.mass ?? 1)
    const time = state.time ?? 0
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]
      p.t += dt
      p.life = Math.max(0, 1 - p.t / 5.2)
      if (p.life <= 0.01) pulses.splice(i, 1)
    }
    const pos = geo.attributes.position.array
    const floor = -dishDepth * mass
    /* spawn the random events */
    for (const arr of [commits, dents, waveFronts]) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const e = arr[i]
        e.t += dt
        if (e.t > e.life) { arr.splice(i, 1); continue }
        e.env = Math.sin(Math.min(1, e.t / e.life) * Math.PI)   // same for every vertex
      }
    }
    mat.uniforms.uTime.value = time
    fineMat.uniforms.uTime.value = time

    const ph1 = -time * 0.6, ph2 = -time * 0.5
    for (let n = 0; n < AC; n++) {
      const i = acIdx[n]
      const x = acX[n], z = acZ[n], d = acD[n]
      let y = floor * acWell[n]
      // shimmer, in-plane so it reads from any angle
      let radial = Math.sin(acP1[n] + ph1) * 0.02
      y += Math.sin(acP2[n] + ph2) * 0.01
      /* the travelling fronts move the sheet BOTH ways: outward in-plane (which a top-down
         camera can see) and in height (which reads once the camera has tipped) */
      for (const p of pulses) {
        const osc0 = Math.sin(acRipple[n] - p.t * 7) * p.life
        for (const fr of FRONTS) {
          const dd = d - p.t * fr.speed
          const osc = osc0 * Math.exp(-(dd * dd) / (fr.sigma * fr.sigma))
          y += osc * fr.amp
          radial += osc * fr.amp * 1.35
        }
      }
      for (const dn of dents) {
        const ddx = x - dn.x, ddz = z - dn.z
        const q = ddx * ddx + ddz * ddz
        y -= Math.exp(-q / 0.5) * dn.depth * dn.env
      }
      for (const w of waveFronts) {
        y += Math.sin((x * w.dx + z * w.dz) * 0.42 - w.t * 1.05) * 0.075 * w.env
      }
      pos[i * 3] = x + acNx[n] * radial
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z + acNz[n] * radial
    }
    geo.attributes.position.needsUpdate = true
    surfGeo.attributes.position.needsUpdate = true
  }

  /* the pointer, in world space on the sheet */
  /* (2) commits, (3) distant wavefronts, (4) micro-dents — all random, all physics */
  const fx = { flicker: 0, commits: false, waves: false, dents: false }
  const commits = []
  const dents = []
  const waveFronts = []
  function setEffects(o) {
    Object.assign(fx, o)
    mat.uniforms.uFlicker.value = fx.flicker ? 1 : 0
    fineMat.uniforms.uFlicker.value = fx.flicker ? 1 : 0
  }

  function setCursor(v) {
    if (v) mat.uniforms.uCursor.value.copy(v)
    else mat.uniforms.uCursor.value.set(0, 0, 1e6)
  }

  /* the depth window has to follow the camera: a fixed one is right for a tipped view and
     leaves the plan view almost empty */
  function setFade(start, end) {
    mat.uniforms.uFade.value.set(start, end)
  }

  /* the alpha mask is static now: the outward fade is handled by depth in the shader, so
     this is only the small hole at the centre where main sits */
  for (let i = 0; i < vertexCount; i++) {
    const d = Math.hypot(base[i * 2], base[i * 2 + 1])
    alphas[i] = clamp01((d - 0.35) / 0.5)
    surfAlphas[i] = 1
  }
  geo.attributes.aAlpha.needsUpdate = true
  surfGeo.attributes.aSurf.needsUpdate = true

  update(0, { mass: 1, time: 0 })
  /* theme switch: repaint the two colour uniforms in place — never rebuild (see hero-scene.js) */
  function retheme({ ink, surface }) {
    mat.uniforms.uColor.value.setHex(ink, THREE_.LinearSRGBColorSpace)
    surfMat.uniforms.uColor.value.setHex(surface, THREE_.LinearSRGBColorSpace)
  }
  return { mesh, fine, surface, update, pulse, setCursor, setFade, setEffects, retheme, material: mat, surfaceMaterial: surfMat, contactY }
}
