import * as THREE from 'three'
import { readToken } from '../../hero-canvas/harness-model'

// "Your GitHub, perfectly structured" — in the life-cycle scene's vocabulary:
// flat unlit lines, thin tubes, commit dots with rings, small mono labels, fog.
// Act 1: the feature lane draws, each branch forks off it, comes back and merges green.
// Act 2: the camera swings out in perspective — the feature lane itself forks off MAIN
// and merges back into it.
//
// Ported from the design handoff's main-merge-3d.js onto the repo's `three`. Every
// document/window read lives inside mountMerge (never at module scope), and mountMerge
// returns a dispose() that undoes everything it created. No colour is written here: all of
// it resolves from the theme's CSS custom properties, and a theme change re-reads them.
const clamp = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smooth = (t) => t * t * (3 - 2 * t)
const lerp = (a, b, t) => a + (b - a) * t
const win = (q, a, b) => smooth(clamp((q - a) / (b - a)))

const TOKENS = { bg: '--background', fg: '--foreground', mu: '--muted-foreground', ok: '--success', bd: '--border' }

// A token that can't be read yet (the admin preview paints the theme after mount) is a state
// to wait out, never a literal fallback.
const readColors = () => {
  const out = {}
  for (const [key, name] of Object.entries(TOKENS)) {
    const hex = readToken(name)
    if (hex == null) return null
    out[key] = hex
  }
  return out
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {() => boolean} [isStill]
 * @param {(log: { fits: boolean, lines: { time: string, mark: '›' | '✓' | '✕' | '☞', text: string }[] }) => void} [onLog]
 */
export function mountMerge(canvas, isStill = () => false, onLog = () => {}) {
  let live = null
  let waiter = null
  let disposed = false
  const tryStart = () => {
    if (disposed || live) return true
    const colors = readColors()
    if (!colors) return false
    live = build(canvas, colors, isStill, onLog)
    return true
  }
  if (!tryStart()) {
    waiter = new MutationObserver(() => {
      if (tryStart()) {
        waiter.disconnect()
        waiter = null
      }
    })
    waiter.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] })
  }
  return () => {
    disposed = true
    waiter?.disconnect()
    live?.()
    live = null
  }
}

function build(canvas, C, isStill, onLog) {
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  } catch {
    return () => {}
  }
  const host = canvas.parentElement
  const runway = canvas.closest('section') || host
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.setClearColor(C.bg, 1)
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(C.bg, 9, 30)
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200)
  const V = (x, y, z = 0) => new THREE.Vector3(x, y, z)
  const flat = (color, opacity) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide })
  const line = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity })

  // backdrop: the same sparse point sphere the life-cycle scene lives in
  let seed = 20261004
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const SN = 1100
  const sp = new Float32Array(SN * 3)
  for (let i = 0; i < SN; i++) {
    const th = 2 * Math.PI * rnd()
    const ph = Math.acos(2 * rnd() - 1)
    const R = 11
    sp[i * 3] = R * Math.sin(ph) * Math.cos(th)
    sp[i * 3 + 1] = R * Math.cos(ph)
    sp[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th)
  }
  const sg = new THREE.BufferGeometry()
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  const sphere = new THREE.Points(
    sg,
    new THREE.PointsMaterial({
      color: C.mu,
      size: 0.036,
      transparent: true,
      opacity: 0.22,
      sizeAttenuation: true,
      fog: false
    })
  )
  sphere.position.set(1, 0, -3)
  scene.add(sphere)

  // The fabric: the same family as the landing hero's — one even layer of hairlines that rolls
  // like soft water. The plane is XY, displaced along z entirely BEHIND the branch lines (z < 0),
  // so a swell never rises through them. Displacement and the crest light run in the vertex
  // shader on a time uniform; nothing is rebuilt per frame. The lines fade with depth rather
  // than ending, and the fog range is fed in each frame (a ShaderMaterial has no fog of its own).
  // Hairlines, not rules: the hero draws its fabric in --foreground at 0.08 (light) / 0.12 (dark), so
  // this does too, and the swell's crest only lifts them a little.
  const fabricAlpha = () => (document.documentElement.dataset.theme === 'dark' ? 0.12 : 0.08)
  const FABRIC_HALF = 40
  const FABRIC_STEP = 0.5
  const FABRIC_N = Math.round(FABRIC_HALF / FABRIC_STEP)
  const fabricPos = []
  for (let a = -FABRIC_N; a <= FABRIC_N; a++) {
    for (let b = -FABRIC_N; b < FABRIC_N; b++) {
      const i = a * FABRIC_STEP
      const j = b * FABRIC_STEP
      fabricPos.push(i, j, 0, i, j + FABRIC_STEP, 0, j, i, 0, j + FABRIC_STEP, i, 0)
    }
  }
  const fabricGeo = new THREE.BufferGeometry()
  fabricGeo.setAttribute('position', new THREE.Float32BufferAttribute(fabricPos, 3))
  const fabricMat = new THREE.ShaderMaterial({
    name: 'merge-fabric',
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color().setHex(C.fg, THREE.LinearSRGBColorSpace) },
      uOpacity: { value: fabricAlpha() },
      uTime: { value: 0 },
      uAmp: { value: 0.45 },
      uCrest: { value: 1.2 },
      uFade: { value: new THREE.Vector2(9, 30) }
    },
    vertexShader: `
      uniform float uTime; uniform float uAmp;
      varying float vCrest; varying float vDepth;
      void main() {
        vec3 p = position;
        float a = sin(p.x * 0.33 + uTime * 0.55);
        float b = sin(p.y * 0.27 - uTime * 0.42 + p.x * 0.11);
        float c = sin((p.x + p.y) * 0.17 + uTime * 0.23);
        float h = (a * 0.42 + b * 0.36 + c * 0.22);
        p.z = -0.55 + h * uAmp;
        vCrest = pow(max(h, 0.0), 2.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uOpacity; uniform float uCrest; uniform vec2 uFade;
      varying float vCrest; varying float vDepth;
      void main() {
        float far = 1.0 - smoothstep(uFade.x, uFade.y, vDepth);
        float a = uOpacity * (0.7 + vCrest * uCrest) * far;
        if (a <= 0.002) discard;
        gl_FragColor = vec4(uColor, min(a, 1.0));
      }`
  })
  const grid = new THREE.LineSegments(fabricGeo, fabricMat)
  grid.frustumCulled = false
  grid.renderOrder = -1
  scene.add(grid)

  const tube = (pts, r, mat, segs = 200) => {
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal')
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 8, false), mat)
    m.userData.n = m.geometry.index.count
    m.userData.curve = curve
    m.reveal = (f) => m.geometry.setDrawRange(0, Math.max(0, Math.round((m.userData.n * clamp(f)) / 48) * 48))
    scene.add(m)
    return m
  }
  const ring = (r) => {
    const p = []
    for (let i = 0; i <= 32; i++) {
      const a = (i / 32) * Math.PI * 2
      p.push(V(Math.cos(a) * r, Math.sin(a) * r))
    }
    return new THREE.BufferGeometry().setFromPoints(p)
  }
  const commit = (pos, r, fill, stroke) => {
    const g = new THREE.Group()
    g.position.copy(pos)
    g.add(new THREE.Mesh(new THREE.CircleGeometry(r, 28), fill))
    g.add(new THREE.Line(ring(r), stroke))
    scene.add(g)
    return g
  }
  // git-graph spur: smoothstep rise, flat run, smoothstep return
  const spur = (y0, y1, x0, x1, rise, n = 72) => {
    const p = []
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * (i / n)
      const f = x < x0 + rise ? smooth((x - x0) / rise) : x > x1 - rise ? smooth((x1 - x) / rise) : 1
      p.push(V(x, y0 + (y1 - y0) * f))
    }
    return p
  }
  const ramp = (xa, ya, xb, yb, n = 40) => {
    const p = []
    for (let i = 0; i <= n; i++) {
      const f = i / n
      p.push(V(lerp(xa, xb, f), lerp(ya, yb, smooth(f))))
    }
    return p
  }

  const M = {
    lane: flat(C.fg, 0.7),
    base: flat(C.mu, 0.35),
    main: flat(C.fg, 0.75),
    ok: flat(C.ok, 0.95),
    dot: flat(C.fg, 0.85),
    dotLine: line(C.fg, 0.85),
    okDot: flat(C.ok, 0.95),
    okLine: line(C.ok, 0.95),
    paper: flat(C.bg, 1)
  }

  // ---- act 1: the feature lane and its branches
  const LX0 = -3.2
  const LX1 = 3.2
  const MY = -1.7
  const LEG = 1.25
  const lane = tube([V(LX0, 0), V(0, 0), V(LX1, 0)], 0.016, M.lane, 160)
  const BR = 5
  const spurs = []
  for (let i = 0; i < BR; i++) {
    const dir = i % 2 === 0 ? 1 : -1
    const x0 = -2.6 + i * 0.95
    const x1 = x0 + 1.5
    const mat = flat(C.fg, 0.7)
    const m = tube(spur(0, 0.62 * dir, x0, x1, 0.32), 0.011, mat, 120)
    const c1 = commit(V(lerp(x0, x1, 0.42), 0.62 * dir), 0.045, M.dot, M.dotLine)
    const c2 = commit(V(lerp(x0, x1, 0.6), 0.62 * dir), 0.045, M.dot, M.dotLine)
    const md = commit(V(x1, 0, 0.01), 0.07, flat(C.ok, 0.95), line(C.ok, 0.95))
    spurs.push({ m, mat, dir, x0, x1, c1, c2, md })
  }
  const start = commit(V(LX0, 0, 0.01), 0.06, M.dot, M.dotLine)
  const end = commit(V(LX1, 0, 0.01), 0.07, M.okDot, M.okLine)

  // ---- act 2: MAIN, and the feature lane's own fork + merge legs
  const main = tube([V(-60, MY), V(0, MY), V(60, MY)], 0.03, M.main, 8)
  M.main.depthWrite = false
  const mainOk = tube([V(LX1 + LEG, MY, 0.002), V(30, MY, 0.002), V(60, MY, 0.002)], 0.034, M.ok, 200)
  const legL = tube(ramp(LX0 - LEG, MY, LX0, 0), 0.016, M.lane, 80)
  const legR = tube(ramp(LX1, 0, LX1 + LEG, MY), 0.016, M.ok, 80)
  const fork = commit(V(LX0 - LEG, MY, 0.01), 0.09, M.dot, M.dotLine)
  const landed = commit(V(LX1 + LEG, MY, 0.01), 0.11, M.okDot, M.okLine)
  // other features along main, already merged — quiet
  for (const [x, s] of [
    [-13, 0.9],
    [9, 1.2],
    [15.5, -1]
  ]) {
    tube(ramp(x - 1.2, MY, x, MY + 1.6 * s), 0.012, M.base, 50)
    tube([V(x, MY + 1.6 * s), V(x + 3, MY + 1.6 * s)], 0.012, M.base, 10)
    tube(ramp(x + 3, MY + 1.6 * s, x + 4.2, MY), 0.012, M.base, 50)
  }

  const hexCss = (hex) => `#${hex.toString(16).padStart(6, '0')}`
  const mainTx = document.createElement('canvas')
  mainTx.width = 512
  mainTx.height = 128
  const mainTex = new THREE.CanvasTexture(mainTx)
  mainTex.colorSpace = THREE.SRGBColorSpace
  const mainMat = new THREE.MeshBasicMaterial({ map: mainTex, transparent: true, opacity: 0, depthWrite: false })
  const drawMain = () => {
    const g = mainTx.getContext('2d')
    g.clearRect(0, 0, 512, 128)
    g.fillStyle = hexCss(C.fg)
    g.font = `500 84px ${getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'monospace'}`
    g.textBaseline = 'middle'
    if ('letterSpacing' in g) g.letterSpacing = '6px'
    g.fillText('main', 8, 66)
    mainTex.needsUpdate = true
  }
  drawMain()
  if (document.fonts) document.fonts.ready.then(drawMain)
  const mainLabel = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), mainMat)
  mainLabel.position.set(LX1 + LEG + 1.35, MY + 0.36, 0.01)
  scene.add(mainLabel)

  // ---- labels (life-cycle style: small mono, no boxes)
  const layer = document.createElement('div')
  layer.setAttribute('aria-hidden', 'true')
  Object.assign(layer.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' })
  host.appendChild(layer)
  // the prod badges: outline pill, Lucide icon, mono uppercase
  const ICON = {
    milestone:
      '<path d="M12 13v8"/><path d="M12 3v3"/><path d="M4 6a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h13a2 2 0 0 0 1.152-.365l3.424-2.317a1 1 0 0 0 0-1.635l-3.424-2.318A2 2 0 0 0 17 6z"/>',
    tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
    branch:
      '<path d="M6 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
    pr: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M6 9v12"/>',
    review: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    ci: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
    merged: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'
  }
  const mk = (text, icon) => {
    const el = document.createElement('span')
    el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" style="flex:none">${ICON[icon] || ''}</svg><span>${text}</span>`
    Object.assign(el.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.22rem 0.5rem',
      border: '1px solid currentColor',
      borderRadius: 'var(--radius, 0.5rem)',
      background: 'var(--background)',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--font-mono)',
      fontSize: '0.625rem',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      color: 'var(--muted-foreground)',
      opacity: '0',
      transition: 'color 200ms',
      willChange: 'transform, opacity'
    })
    layer.appendChild(el)
    return el
  }
  const NAMES = ['issues', 'branch', 'pull request', 'review', 'ci']
  const ICONS = ['tag', 'branch', 'pr', 'review', 'ci']
  const L = [
    { el: mk('milestone', 'milestone'), at: () => V(LX0, 0.3), gate: 0, ok: 0 },
    ...spurs.map((s, i) => ({
      el: mk(NAMES[i], ICONS[i]),
      at: () => V((s.x0 + s.x1) / 2, s.dir * (0.62 + 0.34)),
      gate: 0,
      ok: 0
    })),
    { el: mk('merged', 'merged'), at: () => V(LX1, 0.3), gate: 0, ok: 0 }
  ]

  // ---- title letter reveal, on the same scroll value
  const h2 = runway.querySelector('[data-letter-reveal]')
  const h2Text = h2 ? h2.textContent : ''
  const letters = []
  if (h2) {
    h2.textContent = ''
    h2.setAttribute('aria-label', h2Text)
    h2Text.split(' ').forEach((word, wi, arr) => {
      const w = document.createElement('span')
      w.style.display = 'inline-block'
      w.style.whiteSpace = 'nowrap'
      w.setAttribute('aria-hidden', 'true')
      for (const ch of word) {
        const s = document.createElement('span')
        s.textContent = ch
        s.style.display = 'inline-block'
        s.style.willChange = 'transform, opacity'
        w.appendChild(s)
        letters.push(s)
      }
      h2.appendChild(w)
      if (wi < arr.length - 1) h2.appendChild(document.createTextNode(' '))
    })
  }
  const sub = runway.querySelector('[data-sub-reveal]')
  const caret = sub ? sub.lastElementChild : null
  let caretOn = true
  const blink =
    !reduced && caret
      ? setInterval(() => {
          caretOn = !caretOn
          caret.style.opacity = caretOn ? '0.7' : '0'
        }, 530)
      : 0
  let still = reduced
  const revealTitle = (v) => {
    if (sub) {
      const k = still ? 1 : win(v, 0.12, 0.22)
      sub.style.clipPath = `inset(-0.2em ${((1 - k) * 100).toFixed(1)}% -0.2em 0)`
    }
    const n = letters.length
    letters.forEach((s, i) => {
      const a = (i / n) * 0.1
      const r = still ? 1 : win(v, a, a + 0.04)
      s.style.opacity = String(r)
      s.style.transform = `translateY(${((1 - r) * 0.35).toFixed(3)}em)`
    })
  }

  // ---- the event log: what the agents did, as it happens. The scene only decides WHICH events are
  // on and whether there is room for the box under the diagram; the box itself is the page's
  // `Terminal` component, fed through `onLog`.
  const SP = (i) => 0.16 + i * 0.12
  const EV = [
    [() => qv >= 0.1, '›', 'milestone checkout-v2 opened'],
    [() => qv >= SP(0), '›', 'issues #418–#422 labelled'],
    [() => qv >= SP(0) + 0.24, '✓', 'issues synced to the milestone'],
    [() => qv >= SP(1), '›', 'developer agent coding · feat/418'],
    [() => qv >= SP(1) + 0.24, '✓', 'branch pushed'],
    [() => qv >= SP(2), '›', 'PR #893 opened'],
    [() => qv >= SP(3), '›', 'code review + security dispatched'],
    [() => qv >= SP(3) + 0.24, '✓', 'review approved · security pass'],
    [() => qv >= SP(4), '›', 'vinaya check running'],
    [() => qv >= SP(4) + 0.24, '✓', 'vi passed · every rule green'],
    [() => qv >= 0.9, '✓', 'PR #893 merged'],
    [() => pv >= 0.86, '✓', 'checkout-v2 landed on main']
  ]
  let qv = 0
  let pv = 0
  let shown = ''
  const updateLog = () => {
    const on = EV.filter((e) => e[0]())
    // fit under the diagram: only as many lines as the free space below the lower labels allows
    v.set(0, -1.5, 0).project(camera)
    const free = vh - (-v.y * 0.5 + 0.5) * vh - 20
    const rowH = 18.6
    const headH = 44
    const fits = free - headH - 16 >= rowH * 2
    const key = `${on.length}:${fits ? 1 : 0}`
    if (key === shown) return
    shown = key
    onLog({
      fits: on.length > 0 && fits,
      lines: on
        .slice(-4)
        .map((e) => ({ time: `11:${String(2 + EV.indexOf(e)).padStart(2, '0')}`, mark: e[1], text: e[2] }))
    })
  }

  // ---- frame
  const TAN = Math.tan((34 * Math.PI) / 360)
  const cPos = V(0, 0, 0)
  const cTgt = V(0, 0, 0)
  const v = V(0, 0, 0)
  const pos1 = V(0, 0, 0)
  const tgt1 = V(0, 0, 0)
  const pos2 = V(0, 0, 0)
  const tgt2 = V(0, 0, 0)
  let raf = 0
  let visible = true
  let p = reduced ? 1 : 0
  let vw = 1
  let vh = 1
  let mx = 0
  let px = 0
  let disposed = false
  const onMove = (e) => {
    px = (e.clientX / innerWidth - 0.5) * 2
  }
  addEventListener('pointermove', onMove, { passive: true })
  const resize = () => {
    const r = canvas.getBoundingClientRect()
    vw = Math.max(1, Math.round(r.width))
    vh = Math.max(1, Math.round(r.height))
    renderer.setSize(vw, vh, false)
    camera.aspect = vw / vh
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  const okColor = new THREE.Color()
  const frame = (ms) => {
    if (disposed) return
    raf = visible ? requestAnimationFrame(frame) : 0
    const t = ms / 1000
    // The scroll parent is not the window here, so progress comes from the runway's own rect.
    const rr = runway.getBoundingClientRect()
    // pinned: nothing moves until the section reaches the top of the screen
    still = reduced || isStill()
    const target = still ? 1 : clamp(-rr.top / Math.max(1, rr.height - (innerHeight || 800)))
    p = still ? 1 : p + (target - p) * 0.12
    revealTitle(p)

    // act 1 cues
    const q = clamp((p - 0.16) / 0.5)
    legL.reveal(win(q, 0, 0.12))
    lane.reveal(win(q, 0.1, 0.78))
    start.scale.setScalar(Math.max(0.001, win(q, 0.1, 0.16)))
    okColor.setHex(C.ok)
    spurs.forEach((s, i) => {
      const a = 0.16 + i * 0.12
      const b = a + 0.24
      const f = win(q, a, b)
      s.m.reveal(f)
      const merged = win(q, b - 0.02, b + 0.06)
      s.mat.color.setHex(C.fg).lerp(okColor, merged)
      ;[s.c1, s.c2].forEach((c, k) => {
        const on = f > (k ? 0.6 : 0.42) ? 1 : 0
        c.scale.setScalar(Math.max(0.001, on))
        c.children[0].material = merged > 0.5 ? M.okDot : M.dot
        c.children[1].material = merged > 0.5 ? M.okLine : M.dotLine
      })
      s.md.scale.setScalar(Math.max(0.001, merged * (1 + 0.25 * Math.sin(Math.PI * merged))))
      L[i + 1].gate = win(q, a, a + 0.06)
      L[i + 1].ok = merged
    })
    const endOn = win(q, 0.82, 0.9)
    end.scale.setScalar(Math.max(0.001, endOn))
    L[0].gate = win(q, 0.1, 0.16)
    L[0].ok = 0
    L[BR + 1].gate = endOn
    L[BR + 1].ok = endOn

    qv = q
    pv = p
    // act 2 cues
    const z = win(p, 0.72, 0.92)
    legR.reveal(win(p, 0.75, 0.85))
    fork.scale.setScalar(Math.max(0.001, win(p, 0.7, 0.76)))
    const land = win(p, 0.84, 0.88)
    landed.scale.setScalar(Math.max(0.001, land * (1 + 0.25 * Math.sin(Math.PI * land))))
    mainOk.reveal(win(p, 0.87, 0.97))
    M.main.opacity = 0.75 * win(p, 0.72, 0.84)
    main.visible = M.main.opacity > 0.01
    mainMat.opacity = win(p, 0.8, 0.88)
    M.base.opacity = 0.3 * win(p, 0.8, 0.92)
    sphere.rotation.y = reduced ? 0 : t * 0.02

    // camera: frontal on the lane, then out and round so MAIN recedes in perspective
    const fitW = (LX1 - LX0 + 2.8) / 2 / (TAN * camera.aspect)
    const fitH = 1.9 / TAN
    const d1 = Math.max(fitW, fitH)
    tgt1.set(0.05, -0.75, 0)
    pos1.set(0.05, -0.5, d1)
    tgt2.set(1.6, MY * 0.35, 0)
    const d2 = Math.max((LX1 - LX0 + 2 * LEG + 3) / 2 / (TAN * camera.aspect), 3.2 / TAN) * 0.92
    pos2.copy(V(0.16, -0.75, 1).normalize().multiplyScalar(d2)).add(tgt2)
    cPos.lerpVectors(pos1, pos2, z)
    cTgt.lerpVectors(tgt1, tgt2, z)
    mx += (px - mx) * 0.05
    const ang = reduced ? 0 : Math.sin(t * 0.07) * 0.04 * z + mx * 0.03
    const ox = cPos.x - cTgt.x
    const oz = cPos.z - cTgt.z
    camera.position.set(
      cTgt.x + ox * Math.cos(ang) - oz * Math.sin(ang),
      cPos.y,
      cTgt.z + ox * Math.sin(ang) + oz * Math.cos(ang)
    )
    camera.up.set(0, 1 - z, z).normalize()
    camera.lookAt(cTgt)
    const dist = camera.position.distanceTo(cTgt)
    scene.fog.near = dist * 0.8
    scene.fog.far = dist * 3.2
    fabricMat.uniforms.uFade.value.set(dist * 0.8, dist * 3.2)
    fabricMat.uniforms.uTime.value = reduced ? 0 : t

    renderer.render(scene, camera)
    updateLog()

    const fade1 = 1 - win(p, 0.72, 0.8)
    L.forEach((l) => {
      v.copy(l.at()).project(camera)
      const on = l.gate * (v.z < 1 ? 1 : 0) * fade1
      l.el.style.opacity = String(on)
      l.el.style.color = l.ok > 0.5 ? 'var(--success)' : 'var(--muted-foreground)'
      l.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * vw}px, ${(-v.y * 0.5 + 0.5) * vh}px) translate(-50%, -50%)`
    })
  }

  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting
    if (visible && !raf) raf = requestAnimationFrame(frame)
  })
  io.observe(runway)

  // theme change: re-read the tokens and repaint every material that holds one
  const applyTheme = () => {
    const next = readColors()
    if (!next || Object.keys(next).every((k) => next[k] === C[k])) return
    Object.assign(C, next)
    renderer.setClearColor(C.bg, 1)
    scene.fog.color.setHex(C.bg)
    sphere.material.color.setHex(C.mu)
    M.lane.color.setHex(C.fg)
    M.base.color.setHex(C.mu)
    M.main.color.setHex(C.fg)
    M.ok.color.setHex(C.ok)
    M.dot.color.setHex(C.fg)
    M.dotLine.color.setHex(C.fg)
    M.okDot.color.setHex(C.ok)
    M.okLine.color.setHex(C.ok)
    fabricMat.uniforms.uColor.value.setHex(C.fg, THREE.LinearSRGBColorSpace)
    fabricMat.uniforms.uOpacity.value = fabricAlpha()
    drawMain()
    spurs.forEach((s) => {
      s.md.children[0].material.color.setHex(C.ok)
      s.md.children[1].material.color.setHex(C.ok)
    })
  }
  const mo = new MutationObserver(applyTheme)
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] })
  raf = requestAnimationFrame(frame)

  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    io.disconnect()
    mo.disconnect()
    ro.disconnect()
    removeEventListener('pointermove', onMove)
    clearInterval(blink)
    layer.remove()
    onLog({ fits: false, lines: [] })
    scene.traverse((o) => {
      o.geometry?.dispose()
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
      for (const m of mats) m.dispose()
    })
    mainTex.dispose()
    renderer.dispose()
    renderer.forceContextLoss()
    if (h2) {
      h2.textContent = h2Text
      h2.removeAttribute('aria-label')
    }
    if (sub) sub.style.clipPath = ''
  }
}
