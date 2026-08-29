import * as THREE from 'three'

/**
 * The life-cycle hero's scroll-driven scene, ported from the Claude Design
 * handoff (`reference/lifecycle-graph.js`) by the mechanical factory refactor
 * that handoff specifies — geometry, cue timings, opacity floors and token
 * mapping are unchanged specification, not suggestions.
 *
 * Stays `.js`: three ships its own types and nothing here gains from `.ts`.
 * Every `document`/`window`/`getComputedStyle` read lives inside this factory —
 * one surviving module-scope DOM read builds green and throws only in
 * production, under SSR, with no local-dev signal.
 */
export function mountLifecycleScene({
  canvas,
  labelLayer,
  hero,
  heroInner,
  word,
  readout,
  track,
  labelClass,
  root = document
}) {
  /* The canvas box is the viewport: measured in resize(), refreshed per frame. */
  let vw = 1
  let vh = 1
  let vLeft = 0
  let vTop = 0
  let disposed = false

  /* Flat diagram elements in space — a milestone diamond, a table per tranche, a git
     branch per task — carried by the original three-altitude descent. Nothing is ever
     drawn on or hidden as the camera moves: every line stays present, only contrast
     shifts. All colour comes from the shadcn tokens at runtime. */
  const cssRoot = getComputedStyle(document.documentElement)
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  /* A hidden element is the fallback parser: custom properties come back as authored,
     and canvas fillStyle rejects notations it doesn't know (oklch on older engines),
     silently leaving the previous colour. Letting CSS resolve it always yields rgb. */
  const solver = document.createElement('span')
  solver.style.display = 'none'
  document.documentElement.appendChild(solver)
  function token(name, fallback) {
    const raw = cssRoot.getPropertyValue(name).trim() || fallback
    probe.fillStyle = '#ff00ff'
    probe.fillStyle = raw
    probe.fillRect(0, 0, 1, 1)
    const d = probe.getImageData(0, 0, 1, 1).data
    if (d[0] === 255 && d[1] === 0 && d[2] === 255) {
      solver.style.color = ''
      solver.style.color = raw
      const rgb = getComputedStyle(solver).color.match(/[\d.]+/g)
      if (rgb) return (Math.round(+rgb[0]) << 16) | (Math.round(+rgb[1]) << 8) | Math.round(+rgb[2])
    }
    return (d[0] << 16) | (d[1] << 8) | d[2]
  }
  const C = {
    background: token('--background', '#faf0e4'),
    foreground: token('--foreground', '#06070f'),
    muted: token('--muted-foreground', '#545461'),
    primary: token('--primary', '#1e9df1'),
    destructive: token('--destructive', '#e5484d'),
    merged: token('--success', '#22a06b')
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.setClearColor(C.background, 1)

  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(C.background, 9, 30)
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)

  let seed = 20260827
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const smooth = (t) => t * t * (3 - 2 * t)
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
  const V = (x, y, z) => new THREE.Vector3(x, y, z)

  // flat = unlit basic materials, so a diagram reads as a diagram at any angle
  const flat = (name, color, opacity, extra = {}) =>
    new THREE.MeshBasicMaterial({ name, color, transparent: true, opacity, side: THREE.DoubleSide, ...extra })
  const stroke = (name, color, opacity) => new THREE.LineBasicMaterial({ name, color, transparent: true, opacity })
  const TOKEN_OF = {
    ink: '--foreground',
    soft: '--muted-foreground',
    wire: '--muted-foreground',
    inkFill: '--foreground',
    paper: '--background',
    mutedFill: '--muted-foreground',
    primaryStroke: '--primary',
    primaryFill: '--primary',
    droppedFill: '--destructive',
    mergedStroke: '--success',
    mergedFill: '--success',
    rowHi: '--primary',
    flagPaper: '--background',
    rejectFill: '--destructive',
    pulseFill: '--primary'
  }
  /* Live colour slots: the review and security nodes change state mid-loop, so their
     materials are lerped between these every frame rather than pinned to one token. */
  const COL = {
    primary: new THREE.Color(C.primary),
    destructive: new THREE.Color(C.destructive),
    success: new THREE.Color(C.merged)
  }
  const M = {
    ink: stroke('foreground', C.foreground, 0.6),
    soft: stroke('mutedForeground', C.muted, 0.4),
    wire: stroke('connector', C.muted, 0.4),
    inkFill: flat('foregroundFill', C.foreground, 0.85),
    paper: flat('paper', C.background, 0.82),
    mutedFill: flat('mutedFill', C.muted, 0.5),
    primaryStroke: stroke('primaryStroke', C.primary, 0.85),
    primaryFill: flat('primaryFill', C.primary, 0.9),
    droppedFill: flat('destructiveFill', C.destructive, 0.75),
    mergedStroke: stroke('chart2Stroke', C.merged, 0.9),
    mergedFill: flat('chart2Fill', C.merged, 0.9),
    rowHi: flat('activeRow', C.primary, 0.12),
    flagPaper: flat('flagPaper', C.background, 0.82),
    reviewFill: flat('reviewFill', C.primary, 0.9),
    reviewStroke: stroke('reviewStroke', C.primary, 0.85),
    securityFill: flat('securityFill', C.primary, 0.9),
    securityStroke: stroke('securityStroke', C.primary, 0.85),
    rejectFill: flat('rejectFill', C.destructive, 0.9),
    pulseFill: flat('pulseFill', C.primary, 0.9)
  }

  /* Tranche tables are drawn to a canvas and mapped onto one plane each — the only
     way to carry real issue numbers and status chips at this scale, and text painted
     into the surface stays in perspective with it. Set once the tables exist. */
  let redrawTables = null

  /* A theme switch must repaint the scene, not reload the page: re-read every token
     and push it back into the materials, same trigger the portal's canvases use. */
  function applyTheme() {
    Object.entries(TOKEN_OF).forEach(([k, name]) => {
      M[k]?.color.setHex(token(name, '#000'))
    })
    const bg = token('--background', '#faf0e4')
    renderer.setClearColor(bg, 1)
    scene.fog.color.setHex(bg)
    if (typeof sphere !== 'undefined') sphere.material.color.setHex(token('--muted-foreground', '#545461'))
    COL.primary.setHex(token('--primary', '#1e9df1'))
    COL.destructive.setHex(token('--destructive', '#e5484d'))
    COL.success.setHex(token('--success', '#22a06b'))
    if (redrawTables) redrawTables()
  }
  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-scheme', 'class']
  })

  const geoFrom = (pts) => new THREE.BufferGeometry().setFromPoints(pts)
  const seg = (a, b) => [a, b]
  function circleStroke(r, n = 40) {
    const pts = []
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      pts.push(V(Math.cos(a) * r, Math.sin(a) * r, 0))
    }
    return geoFrom(pts)
  }
  function roundRectStroke(w, h, r, seg = 6) {
    const x = w / 2 - r
    const y = h / 2 - r
    const pts = []
    const corner = (cx, cy, a0) => {
      for (let i = 0; i <= seg; i++) {
        const a = a0 + (i / seg) * (Math.PI / 2)
        pts.push(V(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0))
      }
    }
    corner(x, y, 0)
    corner(-x, y, Math.PI / 2)
    corner(-x, -y, Math.PI)
    corner(x, -y, Math.PI * 1.5)
    pts.push(pts[0].clone())
    return geoFrom(pts)
  }
  const lines = (geo, m, name) => {
    const o = new THREE.LineSegments(geo, m)
    o.name = name
    return o
  }
  const path = (geo, m, name) => {
    const o = new THREE.Line(geo, m)
    o.name = name
    return o
  }
  const plane = (w, h, m, x = 0, y = 0, z = 0, name = '') => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m)
    p.position.set(x, y, z)
    p.name = name
    return p
  }
  const tube = (pts, r, m, name) => {
    const o = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 6, false), m)
    o.name = name
    return o
  }
  // same, from a curve you already hold — and dense enough to reveal by draw range
  const tubeC = (curve, segs, r, m, name) => {
    const o = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, r, 8, false), m)
    o.name = name
    return o
  }
  const dot = (r, m, name) => {
    const o = new THREE.Mesh(new THREE.CircleGeometry(r, 28), m)
    o.name = name
    return o
  }

  const graph = new THREE.Group()
  graph.name = 'lifeCycle'
  graph.position.set(1.15, -1.2, 0)
  scene.add(graph)
  const bob = []

  /* ── the forge it all lives in: one big sparse sphere of points ─────────── */
  const SPH_N = 1500
  const SPH_R = 9.2
  const sph = new Float32Array(SPH_N * 3)
  for (let i = 0; i < SPH_N; i++) {
    const u = rnd()
    const v = rnd()
    const th = 2 * Math.PI * u
    const ph = Math.acos(2 * v - 1)
    sph[i * 3] = SPH_R * Math.sin(ph) * Math.cos(th)
    sph[i * 3 + 1] = SPH_R * Math.cos(ph)
    sph[i * 3 + 2] = SPH_R * Math.sin(ph) * Math.sin(th)
  }
  const sphGeo = new THREE.BufferGeometry()
  sphGeo.setAttribute('position', new THREE.BufferAttribute(sph, 3))
  const sphere = new THREE.Points(
    sphGeo,
    new THREE.PointsMaterial({
      color: C.muted,
      size: 0.036,
      transparent: true,
      opacity: 0.26,
      sizeAttenuation: true,
      fog: false
    })
  )
  sphere.name = 'forgeSphere'
  sphere.position.set(1.4, 1.1, -2.4)
  scene.add(sphere)

  /* ── 01 · MILESTONE — the standard milestone marker: a diamond ──────────── */
  const milestoneG = new THREE.Group()
  milestoneG.name = 'milestone'
  milestoneG.position.set(0, 2.62, 0.1)
  graph.add(milestoneG)
  // a flag, at flag proportions — the pennant is only as wide as the word it carries
  const POLE_X = -0.34
  const BAN_W = 1.02
  const BAN_H = 0.29
  milestoneG.add(tube([V(POLE_X, -0.34, 0), V(POLE_X, 0.32, 0)], 0.007, M.inkFill, 'flagPole'))
  milestoneG.add(lines(geoFrom(seg(V(POLE_X - 0.055, -0.34, 0), V(POLE_X + 0.055, -0.34, 0))), M.ink, 'flagFoot'))
  // the banner IS the label — the word 'milestone' sits inside it
  const banner = new THREE.Group()
  banner.name = 'flagBanner'
  banner.position.set(POLE_X + BAN_W / 2, 0.165, 0)
  milestoneG.add(banner)
  banner.add(plane(BAN_W - 0.06, BAN_H - 0.02, M.flagPaper, -0.03, 0, -0.003, 'bannerFace'))
  {
    // pennant outline: square at the pole, notched at the fly end
    const x = BAN_W / 2
    const y = BAN_H / 2
    const n = 0.12
    const p = [V(-x, -y, 0), V(x, -y, 0), V(x - n, 0, 0), V(x, y, 0), V(-x, y, 0), V(-x, -y, 0)]
    banner.add(path(geoFrom(p), M.ink, 'bannerOutline'))
  }

  /* ── 02 · TRANCHE — a table with its tasks as rows ──────────────────────── */
  const TRANCHES = [
    { id: 'TR-01', state: 'archived', tasks: 6, a: -0.99, first: 401 },
    { id: 'TR-02', state: 'live', tasks: 7, a: -0.26, first: 418 },
    { id: 'TR-03', state: 'planned', tasks: 5, a: 0.45, first: 433 },
    { id: 'TR-04', state: 'planned', tasks: 4, a: 1.12, first: 447 }
  ]
  const ROW_H = 0.1
  const HEAD_H = 0.14
  const TAB_W = 1.12
  const PPU = 620
  const monoFont = (px) => `500 ${px}px ${cssRoot.getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace'}`
  /* The words the product itself uses. A tranche's status is what the milestone reads
     off it — planned, active, complete; a task's is the tranche timeline's lane:
     dispatched, then running, then merged, with blocked when it waits on another. */
  const TRANCHE_STATUS = { archived: 'complete', live: 'active', planned: 'planned' }
  const STATUS = {
    merged: { label: 'merged', tok: '--success', fb: '#22a06b' },
    flight: { label: 'in flight', tok: '--primary', fb: '#1e9df1' },
    blocked: { label: 'blocked', tok: '--destructive', fb: '#e5484d' },
    dispatched: { label: 'dispatched', tok: '--muted-foreground', fb: '#545461' }
  }
  const chan = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255]
  const rgba = (h, a) => `rgba(${chan(h)},${a})`

  // where each tranche starts; the live one then walks its tasks through on a timer
  function initRows(tr) {
    return Array.from({ length: tr.tasks }, (_, i) => ({
      n: tr.first + i,
      w: 0.46 + ((i * 3) % 4) * 0.16,
      st:
        tr.state === 'archived'
          ? i === tr.tasks - 1
            ? 'blocked'
            : 'merged'
          : tr.state === 'live'
            ? i < 2
              ? 'merged'
              : i === 2
                ? 'flight'
                : i === 4
                  ? 'blocked'
                  : 'dispatched'
            : 'dispatched'
    }))
  }

  function drawTable(tr) {
    const ctx = tr.ctx
    const W = tr.canvas.width
    const H = tr.canvas.height
    const fg = token('--foreground', '#06070f')
    const mu = token('--muted-foreground', '#545461')
    const planned = tr.state === 'planned'
    const dim = tr.state === 'archived' ? 0.7 : 1
    const rh = ROW_H * PPU
    const hh = HEAD_H * PPU
    const pad = 0.03 * PPU
    ctx.clearRect(0, 0, W, H)
    ctx.textBaseline = 'middle'
    ctx.beginPath()
    ctx.roundRect(2, 2, W - 4, H - 4, 0.024 * PPU)
    ctx.fillStyle = rgba(token('--card', '#fdf6ec'), 0.94)
    ctx.fill()
    ctx.lineWidth = 2.5
    ctx.strokeStyle = rgba(planned ? mu : fg, planned ? 0.4 : 0.52)
    ctx.stroke()

    // header: the tranche's own id, and the state it is read to be
    ctx.textAlign = 'left'
    ctx.font = monoFont(Math.round(rh * 0.46))
    ctx.fillStyle = rgba(fg, 0.88 * dim)
    ctx.fillText(tr.id, pad, hh / 2)
    const hs = STATUS[tr.state === 'live' ? 'flight' : tr.state === 'archived' ? 'merged' : 'dispatched']
    ctx.textAlign = 'right'
    ctx.font = monoFont(Math.round(rh * 0.36))
    ctx.fillStyle = rgba(token(hs.tok, hs.fb), 0.92 * dim)
    ctx.fillText(TRANCHE_STATUS[tr.state], W - pad, hh / 2)
    ctx.beginPath()
    ctx.moveTo(0, hh)
    ctx.lineTo(W, hh)
    ctx.lineWidth = 2
    ctx.strokeStyle = rgba(planned ? mu : fg, 0.3)
    ctx.stroke()

    // rows: issue number, the task's own line, the state it is in
    tr.rows.forEach((row, i) => {
      const yc = hh + rh * (i + 0.5)
      const st = STATUS[row.st]
      const sc = token(st.tok, st.fb)
      ctx.textAlign = 'left'
      ctx.font = monoFont(Math.round(rh * 0.42))
      ctx.fillStyle = rgba(mu, 0.92 * dim)
      ctx.fillText(`#${row.n}`, pad, yc)

      ctx.font = monoFont(Math.round(rh * 0.34))
      const pw = ctx.measureText(st.label).width + rh * 0.62
      const ph = rh * 0.6
      const px0 = W - pad - pw
      ctx.beginPath()
      ctx.roundRect(px0, yc - ph / 2, pw, ph, ph / 2)
      ctx.fillStyle = rgba(sc, 0.14 * dim)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = rgba(sc, 0.62 * dim)
      ctx.stroke()
      ctx.textAlign = 'center'
      ctx.fillStyle = rgba(sc, 0.95 * dim)
      ctx.fillText(st.label, px0 + pw / 2, yc)

      const bx = pad + rh * 1.62
      const bh = rh * 0.15
      const bw = Math.max(rh * 0.6, (px0 - rh * 0.4 - bx) * row.w)
      ctx.beginPath()
      ctx.roundRect(bx, yc - bh / 2, bw, bh, bh / 2)
      ctx.fillStyle = rgba(mu, 0.32 * dim)
      ctx.fill()

      if (i < tr.rows.length - 1) {
        const ry = hh + rh * (i + 1)
        ctx.beginPath()
        ctx.moveTo(pad * 0.5, ry)
        ctx.lineTo(W - pad * 0.5, ry)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = rgba(mu, 0.2)
        ctx.stroke()
      }
    })
  }

  function buildTable(tr) {
    const h = HEAD_H + tr.tasks * ROW_H
    const g = new THREE.Group()
    g.name = `tranche_${tr.id}`
    tr.rows = initRows(tr)
    const cv = document.createElement('canvas')
    cv.width = Math.round(TAB_W * PPU)
    cv.height = Math.round(h * PPU)
    tr.canvas = cv
    tr.ctx = cv.getContext('2d')
    const tex = new THREE.CanvasTexture(cv)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
    tr.mat = new THREE.MeshBasicMaterial({
      name: `table_${tr.id}`,
      map: tex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    })
    const face = new THREE.Mesh(new THREE.PlaneGeometry(TAB_W, h), tr.mat)
    face.name = 'tableFace'
    g.add(face)
    tr.rowY = (i) => h / 2 - HEAD_H - ROW_H * (i + 0.5)
    tr.hl = plane(TAB_W - 0.02, ROW_H * 0.94, M.rowHi, 0, tr.rowY(2), 0.003, 'activeRow')
    tr.hl.visible = false
    g.add(tr.hl)
    tr.draw = () => {
      drawTable(tr)
      tex.needsUpdate = true
    }
    tr.draw()
    g.userData.height = h
    return g
  }

  TRANCHES.forEach((tr, i) => {
    const R = 2.5 + (i % 2) * 0.32
    tr.pos = V(Math.sin(tr.a) * R, 1.5 - (i % 2) * 0.11, Math.cos(tr.a) * R * 0.55 + 0.3)
    const g = buildTable(tr)
    g.position.copy(tr.pos)
    g.rotation.y = -tr.a * 0.42
    graph.add(g)
    tr.group = g
    bob.push({ obj: g, base: tr.pos.y, amp: 0.02, phase: rnd() * 6.28 })

    // the milestone's line down to each tranche it named
    const from = milestoneG.position.clone().add(V(POLE_X, -0.34, 0))
    const to = tr.pos.clone().add(V(0, g.userData.height / 2 + 0.02, 0))
    const mid = from
      .clone()
      .lerp(to, 0.55)
      .add(V(Math.sin(tr.a) * 0.42, 0.1, 0.04))
    graph.add(tube([from, mid, to], 0.0075, M.mutedFill, `spine_${tr.id}`))
  })
  redrawTables = () => {
    TRANCHES.forEach((tr) => {
      tr.draw()
    })
  }
  if (document.fonts)
    document.fonts.ready.then(() => {
      if (!disposed) redrawTables()
    })

  /* ── 03 · TASK — a branch off main: six stages, merged green ─────────────── */
  const live = TRANCHES[1]
  const Z = live.pos.z + 0.3
  const LIVE_BOT = live.pos.y - live.group.userData.height / 2
  const BR = 0.5
  const LANE_A = 0.9
  const LANE_B = 0.1 // the task's lane, plus one above and one below
  const gitG = new THREE.Group()
  gitG.name = 'taskLifeCycle'
  gitG.scale.setScalar(0.76)
  graph.add(gitG)

  /* The lane is constructed, not interpolated through sparse control points: a dead
     straight drop out from under the table, one quarter-circle elbow, then a straight
     run through every commit to the merge. The old Catmull-Rom put a wobble and an
     uneven wall thickness into those first two turns. */
  function lanePath() {
    const x0 = live.pos.x
    const z0 = live.pos.z + 0.04
    const r = 0.26
    const yC = BR + r
    const pts = []
    for (let i = 0; i <= 26; i++) {
      const f = i / 26
      pts.push(V(x0, LIVE_BOT + (yC - LIVE_BOT) * f, z0 + (Z - z0) * smooth(f)))
    }
    for (let i = 1; i <= 16; i++) {
      const a = ((i / 16) * Math.PI) / 2
      pts.push(V(x0 + r * (1 - Math.cos(a)), BR + r * (1 - Math.sin(a)), Z))
    }
    const xs = x0 + r
    const xe = 3.22
    for (let i = 1; i <= 40; i++) pts.push(V(xs + (xe - xs) * (i / 40), BR, Z))
    return pts
  }
  const lane = new THREE.CatmullRomCurve3(lanePath(), false, 'centripetal')
  const laneMesh = tubeC(lane, 280, 0.0105, M.primaryFill, 'taskLane')
  gitG.add(laneMesh)
  const LANE_IDX = laneMesh.geometry.index.count
  // TubeGeometry walks the curve by arc length, so a draw range IS a distance along it
  const laneScan = lane.getSpacedPoints(500)
  const fracAtX = (x) => {
    for (let i = 0; i < laneScan.length; i++) if (laneScan[i].x >= x - 1e-6) return i / (laneScan.length - 1)
    return 1
  }

  // review above, security below — the two that run at the same time
  // smoothstep rise, long flat run, smoothstep return — the shape a branch draws in
  // a git graph, not a lens
  function spurPoints(y, x0, x1, rise) {
    const pts = []
    const n = 72
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * (i / n)
      const f = x < x0 + rise ? smooth((x - x0) / rise) : x > x1 - rise ? smooth((x1 - x) / rise) : 1
      pts.push(V(x, BR + (y - BR) * f, Z))
    }
    return pts
  }
  // staggered spans, so the two read as real branches rather than one symmetric shape
  const reviewSpur = tubeC(
    new THREE.CatmullRomCurve3(spurPoints(LANE_A, 0.92, 2.08, 0.18), false, 'centripetal'),
    160,
    0.009,
    M.reviewFill,
    'reviewSpur'
  )
  const securitySpur = tubeC(
    new THREE.CatmullRomCurve3(spurPoints(LANE_B, 1.28, 2.46, 0.18), false, 'centripetal'),
    160,
    0.009,
    M.securityFill,
    'securitySpur'
  )
  gitG.add(reviewSpur, securitySpur)
  const SPUR_IDX = reviewSpur.geometry.index.count
  const SEC_IDX = securitySpur.geometry.index.count

  const STAGES = [
    { id: 'brief', p: V(0.1, BR, Z), ly: 0.17 },
    { id: 'develop', p: V(0.92, BR, Z), ly: -0.2 },
    { id: 'review', p: V(1.5, LANE_A, Z), ly: 0.17 },
    { id: 'security', p: V(1.87, LANE_B, Z), ly: -0.2 },
    { id: 'verify', p: V(2.75, BR, Z), ly: 0.17 }
  ]
  const commitRing = circleStroke(0.062, 28)
  const STAGE_MAT = { review: ['reviewFill', 'reviewStroke'], security: ['securityFill', 'securityStroke'] }
  const commits = STAGES.map((s) => {
    const g = new THREE.Group()
    g.name = `commit_${s.id}`
    g.position.copy(s.p)
    const [f, st] = STAGE_MAT[s.id] || ['primaryFill', 'primaryStroke']
    g.add(dot(0.062, M[f], 'commitDot'))
    g.add(path(commitRing, M[st], 'commitRing'))
    gitG.add(g)
    return g
  })

  // the one pull request the whole branch lives on
  const prG = new THREE.Group()
  prG.name = 'pullRequest'
  gitG.add(prG)
  prG.add(
    path(
      geoFrom([
        V(0.1, LANE_B - 0.26, Z),
        V(0.1, LANE_B - 0.34, Z),
        V(2.75, LANE_B - 0.34, Z),
        V(2.75, LANE_B - 0.26, Z)
      ]),
      M.soft,
      'prBracket'
    )
  )

  const mergeCommit = new THREE.Group()
  mergeCommit.name = 'mergeCommit'
  // a touch in front of the lane, so the tube's flat end cap is covered by the disc
  // rather than poking out of it
  mergeCommit.position.set(3.22, BR, Z + 0.014)
  mergeCommit.add(dot(0.085, M.mergedFill, 'mergeDot'))
  mergeCommit.add(path(circleStroke(0.085, 32), M.mergedStroke, 'mergeRing'))
  gitG.add(mergeCommit)

  /* The merge resolves into the chip the product actually shows in its tables: a
     rounded outline, a check, and the word beside it — not a sticker. */
  const badge = new THREE.Group()
  badge.name = 'mergedChip'
  badge.position.set(3.98, BR, Z)
  gitG.add(badge)
  const CHIP_W = 1.04
  const CHIP_H = 0.38
  const CHK_X = -0.3
  badge.add(plane(CHIP_W - 0.03, CHIP_H - 0.03, M.paper, 0, 0, -0.004, 'chipFace'))
  badge.add(path(roundRectStroke(CHIP_W, CHIP_H, 0.105), M.mergedStroke, 'chipEdge'))
  badge.add(tube([V(CHK_X - 0.058, 0.004, 0), V(CHK_X - 0.014, -0.05, 0)], 0.013, M.mergedFill, 'checkShort'))
  badge.add(tube([V(CHK_X - 0.014, -0.05, 0), V(CHK_X + 0.074, 0.064, 0)], 0.013, M.mergedFill, 'checkLong'))

  const pulse = dot(0.028, M.pulseFill, 'inFlight')
  gitG.add(pulse)
  // the verdict coming back: a red dot travelling review → develop
  const reject = dot(0.03, M.rejectFill, 'changesRequested')
  reject.visible = false
  gitG.add(reject)

  /* The loop the task actually runs. Review sends it back once — nothing past the two
     spurs is drawn until it comes back green, so verify and merge cannot appear before
     the work has earned them. Windows are fractions of one cycle. */
  const CYCLE = 9
  const CUE = {
    brief: [0.05, 0.11],
    develop: [0.17, 0.23],
    spurs: [0.24, 0.36],
    spursB: [0.27, 0.4],
    review: [0.33, 0.39],
    security: [0.36, 0.42],
    cleared: [0.42, 0.49],
    reject: [0.44, 0.5],
    rejectRun: [0.47, 0.56],
    refix: [0.56, 0.62],
    approve: [0.64, 0.7],
    verify: [0.74, 0.79],
    mergeDot: [0.81, 0.845],
    chip: [0.83, 0.87]
  }
  const at = (q, w) => smooth(clamp01((q - w[0]) / (w[1] - w[0])))
  // the last stretch is a hold on the finished branch before the next task starts
  const LANE_KEYS = [
    [0, 0],
    [0.11, fracAtX(0.1)],
    [0.23, fracAtX(0.92)],
    [0.36, fracAtX(2.46)],
    [0.7, fracAtX(2.46)],
    [0.78, fracAtX(2.75)],
    [0.84, 1],
    [1, 1]
  ]
  function laneFrac(q) {
    for (let i = 1; i < LANE_KEYS.length; i++) {
      if (q <= LANE_KEYS[i][0]) {
        const a = LANE_KEYS[i - 1]
        const b = LANE_KEYS[i]
        return a[1] + (b[1] - a[1]) * smooth(clamp01((q - a[0]) / (b[0] - a[0])))
      }
    }
    return 1
  }
  const reviewCol = new THREE.Color()
  const secCol = new THREE.Color()
  const gates = {}
  let lastLaneF = 0

  /* Once the descent finishes the DOM header fades out and the page's title reappears
     anchored in the drawing itself, at the head of the branch — so it travels with
     the scene instead of sitting on top of it. */
  const titleAnchor = new THREE.Object3D()
  titleAnchor.name = 'heroTitle'
  titleAnchor.position.set(live.pos.x - 1.0, LIVE_BOT + 0.25, Z)
  gitG.add(titleAnchor)

  /* ── labels ────────────────────────────────────────────────────────────── */
  const LABELS = [
    { text: 'milestone', obj: banner, off: V(-0.06, 0, 0), tier: 0, tone: 'ink', cls: 'tiny', tilt: V(0.3, 0, 0) },
    { text: 'tranches', obj: TRANCHES[3].group, off: V(0.66, 0.24, 0), tier: 0, tone: 'muted', align: 'left' },
    { text: 'tranche', obj: live.group, off: V(0, live.group.userData.height / 2 + 0.1, 0), tier: 1, tone: 'ink' },
    {
      text: 'tasks, in order',
      obj: live.group,
      off: V(0, -(live.group.userData.height / 2 + 0.1), 0),
      tier: 1,
      tone: 'muted'
    },
    ...STAGES.map((s, i) => ({
      text: s.id,
      obj: commits[i],
      off: V(i === 0 ? 0.08 : 0, s.ly, 0),
      tier: 2,
      tone: 'ink',
      gate: s.id,
      align: i === 0 ? 'left' : undefined
    })),
    {
      text: 'one pull request',
      obj: prG,
      off: V(1.42, LANE_B - 0.5, Z),
      tier: 2,
      tone: 'muted',
      local: true,
      gate: 'develop'
    },
    { text: 'merge', obj: mergeCommit, off: V(0, 0.2, 0), tier: 2, tone: 'ink', gate: 'merge' },
    { text: 'Merged', obj: badge, off: V(0.14, 0.005, 0), tier: 2, tone: 'merged', cls: 'chip', gate: 'chip' },
    {
      text: 'Vinaya’s life cycle',
      obj: titleAnchor,
      off: V(0, 0, 0),
      tier: 2,
      tone: 'ink',
      cls: 'title',
      align: 'left'
    }
  ]
  LABELS.forEach((l) => {
    const el = document.createElement('span')
    el.className = labelClass(l.tone, l.cls)
    el.textContent = l.text
    labelLayer.appendChild(el)
    l.el = el
    l.world = new THREE.Vector3()
  })

  /* ── camera: the original three-altitude descent ────────────────────────── */
  const KEYS = [
    { pos: V(2.6, 3.4, 10.0), tgt: V(1.15, 1.5, 0.9), band: 0.44, fit: 2.15 },
    { pos: V(3.05, 1.8, 7.8), tgt: V(1.2, 0.3, 1.9), band: 0.34, fit: 1.6 },
    { pos: V(2.95, 0.6, 7.9), tgt: V(2.02, -0.75, 2.3), band: 0.46, fit: 1.2 }
  ]
  const cPos = new THREE.Vector3()
  const cTgt = new THREE.Vector3()
  // second projection slot, for a label that must sit on its surface's own angle
  const tiltW = new THREE.Vector3()
  const tiltP = new THREE.Vector3()

  const ALTITUDES = [
    { label: 'Milestone', number: '01' },
    { label: 'Tranche', number: '02' },
    { label: 'Task', number: '03' }
  ]
  const MORPH_MS = 900
  const PEAK_PX = 16
  const TRAVEL_CYCLES = 2
  const wordEl = word
  let letters = []
  let morphStart = -1
  let morphTo = 0
  let swapped = false
  let waveScale = 1
  function setWord(i) {
    wordEl.textContent = ''
    letters = [...ALTITUDES[i].label].map((ch) => {
      const s = document.createElement('span')
      s.textContent = ch
      s.style.display = 'inline-block'
      s.style.willChange = 'transform'
      wordEl.appendChild(s)
      return s
    })
  }
  function wave(t) {
    const amp = Math.sin(Math.PI * t) * PEAK_PX * waveScale
    const n = letters.length
    letters.forEach((el, i) => {
      const travel = (i / Math.max(1, n - 1)) * Math.PI * 2 - t * Math.PI * 2 * TRAVEL_CYCLES
      el.style.transform = `translateY(${amp * Math.sin(travel)}px)`
    })
  }
  setWord(0)

  const cards = [...root.querySelectorAll('[data-card]')]
  const heroEl = hero
  const ticks = [...root.querySelectorAll('[data-tick]')]

  // ?altitude=1|2|3 pins one tier — a deep link, and how the hero is inspected.
  const pinned = { 1: 0, 2: 0.5, 3: 1 }[new URLSearchParams(location.search).get('altitude')]
  let target = pinned ?? 0
  let p = target
  let px = 0
  let py = 0
  let mx = 0
  let my = 0
  const onPointerMove = (e) => {
    px = ((e.clientX - vLeft) / vw - 0.5) * 2
    py = ((e.clientY - vTop) / vh - 0.5) * 2
  }
  addEventListener('pointermove', onPointerMove, { passive: true })

  let clearBelow = 0
  let heroTop = 0
  let lastHp = -1
  let lastFade = -1
  function resize() {
    const r = canvas.getBoundingClientRect()
    vw = Math.max(1, Math.round(r.width))
    vh = Math.max(1, Math.round(r.height))
    vLeft = r.left
    vTop = r.top
    renderer.setSize(vw, vh, false)
    camera.aspect = vw / vh
    camera.updateProjectionMatrix()
    heroTop = heroEl.getBoundingClientRect().top - vTop
    lastHp = -1 // the hero's rise is measured in vh, so its footprint changes with the window
  }
  addEventListener('resize', resize)
  // The pane resizes with the app shell, not only with the window — a window
  // resize listener alone misses a TopBar reflow that changes the canvas box.
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  resize()

  /* Two things ride the same scroll value the camera does: the header's rise (--hp),
     and its exit (opacity) on the last leg, where the title would otherwise sit on
     top of the branch. Re-measuring only when it has actually moved keeps this to one
     forced layout per changed frame instead of one per frame. */
  function heroBand(p) {
    const hp = smooth(clamp01(p / 0.26))
    const fade = 1 - smooth(clamp01((p - 0.62) / 0.18))
    if (Math.abs(hp - lastHp) > 0.0015 || Math.abs(fade - lastFade) > 0.004) {
      lastHp = hp
      lastFade = fade
      heroEl.style.setProperty('--hp', hp.toFixed(4))
      heroInner.style.opacity = fade.toFixed(3)
      waveScale = 0.3 + (1 - hp) * 0.7
      const bottom = heroInner.getBoundingClientRect().bottom - vTop + 14
      clearBelow = heroTop + (bottom - heroTop) * fade
    }
  }

  /* One task at a time comes off the queue and lands — the live tranche is the only
     thing in the drawing that changes on its own. */
  let stepAt = performance.now() / 1000
  function advanceLive() {
    const rows = live.rows
    const cur = rows.findIndex((r) => r.st === 'flight')
    const next = rows.findIndex((r, i) => i > cur && r.st === 'dispatched')
    if (cur >= 0) rows[cur].st = 'merged'
    if (next >= 0) rows[next].st = 'flight'
    else live.rows = initRows(live)
    live.draw()
  }

  const band = (c, half) => smooth(clamp01(1 - Math.abs(p - c) / half))
  const proj = new THREE.Vector3()

  function frame(ms) {
    const t = ms / 1000
    /* Read both rects before anything writes: the app shell scrolls a nested
       container, never the document, so scrollY is permanently 0 here — progress
       is the track's own offset against the pinned pane. */
    const cr = canvas.getBoundingClientRect()
    vLeft = cr.left
    vTop = cr.top
    if (pinned === undefined) {
      const r = track.getBoundingClientRect()
      target = clamp01((vTop - r.top) / Math.max(1, r.height - vh))
    }
    p += (target - p) * 0.07
    heroBand(p)

    const wM = band(0, 0.5)
    const wT = band(0.5, 0.45)
    const wK = band(1, 0.5)
    const seg2 = p < 0.5 ? 0 : 1
    const f = smooth(clamp01(p * 2 - seg2))
    cPos.lerpVectors(KEYS[seg2].pos, KEYS[seg2 + 1].pos, f)
    cTgt.lerpVectors(KEYS[seg2].tgt, KEYS[seg2 + 1].tgt, f)

    const bandPx = Math.max(130, vh - clearBelow)
    const fitCap = KEYS[seg2].fit + (KEYS[seg2 + 1].fit - KEYS[seg2].fit) * f
    const off = cPos
      .clone()
      .sub(cTgt)
      .multiplyScalar(Math.min(fitCap, Math.max(1, 470 / bandPx)))
    const dist = off.length()
    const unitsPerPx = (2 * dist * Math.tan((34 * Math.PI) / 180 / 2)) / vh
    const bandF = KEYS[seg2].band + (KEYS[seg2 + 1].band - KEYS[seg2].band) * f
    cTgt.y += (clearBelow + bandPx * bandF - vh / 2) * unitsPerPx
    cPos.copy(cTgt).add(off)
    scene.fog.near = dist * 0.7
    scene.fog.far = dist * 2.6

    mx += (px - mx) * 0.05
    my += (py - my) * 0.05
    const ang = (reduced ? 0 : Math.sin(t * 0.07) * 0.09) + mx * 0.08
    camera.position.set(
      cPos.x * Math.cos(ang) - cPos.z * Math.sin(ang),
      cPos.y - my * 0.36 + (reduced ? 0 : Math.sin(t * 0.11) * 0.05),
      cPos.x * Math.sin(ang) + cPos.z * Math.cos(ang)
    )
    camera.lookAt(cTgt.x + mx * 0.14, cTgt.y, cTgt.z)

    if (!reduced) for (const b of bob) b.obj.position.y = b.base + Math.sin(t * 0.5 + b.phase) * b.amp

    // Contrast, never disappearance: every part keeps a floor so no line drops out
    // while the camera is moving. The milestone recedes on the way down the same way
    // the tranche tables do — present, just no longer the thing being read.
    M.ink.opacity = 0.14 + wM * 0.72 + wT * 0.2
    M.inkFill.opacity = 0.14 + wM * 0.7 + wT * 0.18
    M.flagPaper.opacity = 0.08 + wM * 0.8 + wT * 0.16
    M.soft.opacity = 0.24 + wM * 0.2 + wT * 0.3 + wK * 0.16
    // the milestone's lines down to its tranches: strongest where they're the point,
    // barely there once you're inside a task
    M.mutedFill.opacity = 0.05 + wM * 0.4 + wT * 0.14
    M.paper.opacity = 0.14 + wT * 0.62 + wM * 0.34 // fills recede so the copy stays legible; borders keep their floor
    M.primaryFill.opacity = 0.38 + wT * 0.24 + wK * 0.36
    M.primaryStroke.opacity = 0.34 + wT * 0.2 + wK * 0.4
    M.droppedFill.opacity = 0.3 + wT * 0.5
    M.mergedFill.opacity = 0.3 + wK * 0.65
    M.mergedStroke.opacity = 0.3 + wK * 0.65
    sphere.material.opacity = 0.2 + wM * 0.08
    milestoneG.scale.setScalar(0.94 + wM * 0.12)

    // the tables fade up with their tier; the live one keeps working while you watch
    const tOp = Math.min(1, 0.24 + wM * 0.34 + wT * 0.74)
    TRANCHES.forEach((tr) => {
      tr.mat.opacity = tOp * (tr.state === 'archived' ? 0.8 : 1)
    })
    M.rowHi.opacity = 0.04 + wT * 0.14
    if (!reduced && t - stepAt > 2.1) {
      stepAt = t
      advanceLive()
    }
    const fi = live.rows.findIndex((r) => r.st === 'flight')
    live.hl.visible = fi >= 0 && wT > 0.04
    if (fi >= 0) live.hl.position.y += (live.rowY(fi) - live.hl.position.y) * 0.09

    /* the task's own loop, played on repeat once you're at its altitude: review sends
       it back once, develop fixes it, and only then are verify and merge drawn */
    const q = reduced ? 1 : (t / CYCLE) % 1
    const laneF = laneFrac(q)
    laneMesh.geometry.setDrawRange(0, Math.max(6, Math.round(LANE_IDX * laneF)))
    reviewSpur.geometry.setDrawRange(0, Math.max(6, Math.round(SPUR_IDX * at(q, CUE.spurs))))
    securitySpur.geometry.setDrawRange(0, Math.max(6, Math.round(SEC_IDX * at(q, CUE.spursB))))

    const rejectW = at(q, CUE.reject) * (1 - at(q, CUE.refix))
    const approveW = at(q, CUE.approve)
    reviewCol.copy(COL.primary).lerp(COL.destructive, rejectW).lerp(COL.success, approveW)
    M.reviewFill.color.copy(reviewCol)
    M.reviewStroke.color.copy(reviewCol)
    secCol.copy(COL.primary).lerp(COL.success, at(q, CUE.cleared))
    M.securityFill.color.copy(secCol)
    M.securityStroke.color.copy(secCol)

    const pops = STAGES.map((s) => at(q, CUE[s.id]))
    commits.forEach((c, i) => {
      // develop swells again when the fix lands
      const s = pops[i] * (i === 1 ? 1 + at(q, CUE.refix) * (1 - approveW) * 0.4 : 1)
      c.visible = s > 0.02
      c.scale.setScalar(s)
    })
    const mg = at(q, CUE.mergeDot)
    const cg = at(q, CUE.chip)
    mergeCommit.visible = mg > 0.02
    mergeCommit.scale.setScalar(mg)
    badge.visible = cg > 0.02
    badge.scale.setScalar(cg)
    STAGES.forEach((s, i) => {
      gates[s.id] = pops[i]
    })
    gates.merge = mg
    gates.chip = cg

    const rr = at(q, CUE.rejectRun)
    reject.visible = rr > 0.04 && rr < 0.97 && !reduced
    if (reject.visible) reject.position.lerpVectors(STAGES[2].p, STAGES[1].p, rr)

    // a bright head rides the lane only while the lane is actually being drawn
    const grow = clamp01((laneF - lastLaneF) * 900)
    lastLaneF = laneF
    M.pulseFill.opacity = grow * (0.35 + wK * 0.65)
    pulse.visible = grow > 0.02
    if (pulse.visible) {
      pulse.position.copy(lane.getPointAt(Math.min(0.999, laneF)))
      pulse.scale.setScalar(0.7 + wK * 0.6)
    }
    if (!reduced) {
      sphere.rotation.y = t * 0.02
      sphere.rotation.x = Math.sin(t * 0.05) * 0.12
    }

    const tierW = [wM, wT, wK]
    scene.updateMatrixWorld(true)
    camera.updateMatrixWorld()
    LABELS.forEach((l) => {
      if (l.local) l.world.copy(l.off).applyMatrix4(l.obj.matrixWorld)
      else l.obj.getWorldPosition(l.world).add(l.off)
      proj.copy(l.world).project(camera)
      const on = clamp01(tierW[l.tier] * 2.1 - 0.8) * (l.gate ? (gates[l.gate] ?? 1) : 1) * (proj.z < 1 ? 1 : 0)
      l.el.style.opacity = String(on)
      if (on > 0.01) {
        const ax = l.align === 'left' ? '0' : '-50%'
        /* A label lying ON a surface takes that surface's screen angle: project a
           second point along the surface's own axis and read the angle between them,
           so the word stays parallel to the flag however the camera swings. */
        let rot = ''
        if (l.tilt) {
          tiltW.copy(l.tilt).applyMatrix4(l.obj.matrixWorld)
          tiltP.copy(tiltW).project(camera)
          const dx = (tiltP.x - proj.x) * vw
          const dy = (proj.y - tiltP.y) * vh
          rot = ` rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2)}deg)`
        }
        l.el.style.transform = `translate(${(proj.x * 0.5 + 0.5) * vw}px, ${(-proj.y * 0.5 + 0.5) * vh}px)${rot} translate(${ax}, -50%)`
      }
    })

    const idx = p < 0.34 ? 0 : p < 0.7 ? 1 : 2
    if (idx !== morphTo) {
      morphTo = idx
      morphStart = reduced ? -1 : ms
      swapped = false
      if (reduced) setWord(idx)
    }
    if (morphStart > 0) {
      const w = clamp01((ms - morphStart) / MORPH_MS)
      wave(w < 0.5 ? 2 * w * w : 1 - (-2 * w + 2) ** 2 / 2)
      if (!swapped && w >= 0.5) {
        swapped = true
        setWord(morphTo)
      }
      if (w >= 1) {
        morphStart = -1
        wave(0)
      }
    }
    cards.forEach((el, i) => {
      const w = tierW[i]
      el.style.opacity = String(clamp01(w * 3 - 1.55))
      el.style.transform = `translateY(${(1 - clamp01(w * 1.6)) * 12}px)`
    })
    ticks.forEach((el, i) => {
      el.setAttribute('data-on', String(i === idx))
    })
    readout.textContent = `${ALTITUDES[idx].number} / 03`

    renderer.render(scene, camera)
    schedule()
  }

  /* Paint one frame synchronously before scheduling: a document that loads while
     hidden (a background tab, an off-screen preview) gets no rAF callbacks at all,
     which would otherwise leave the hero blank until it was looked at. */
  let queued = false
  let raf = 0
  function schedule() {
    if (queued || disposed || document.hidden) return
    queued = true
    raf = requestAnimationFrame((ms) => {
      queued = false
      frame(ms)
    })
  }
  frame(performance.now())
  const onVisibility = () => {
    if (!document.hidden) schedule()
  }
  document.addEventListener('visibilitychange', onVisibility)

  return {
    /* Not defensive: App Router remounts on client navigation and React 18
       StrictMode double-invokes effects in dev — without this you get two
       renderers, two rAF loops and a duplicated label layer per visit. */
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      resizeObserver.disconnect()
      removeEventListener('resize', resize)
      removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('visibilitychange', onVisibility)
      renderer.dispose()
      scene.traverse((o) => {
        o.geometry?.dispose?.()
        if (o.material?.map) o.material.map.dispose()
      })
      Object.values(M).forEach((m) => {
        m.dispose()
      })
      TRANCHES.forEach((tr) => {
        tr.mat.dispose()
      })
      sphere.material.dispose()
      labelLayer.replaceChildren()
      solver.remove()
    }
  }
}
