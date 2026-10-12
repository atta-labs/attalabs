import * as THREE from 'three'
import {
  A_FROM,
  A_TO,
  ANSWER_SPAN,
  answerProgress,
  arcAngle,
  buildAgentRing,
  CONCLUDE_AT,
  Q_FROM,
  Q_TO
} from './agent-ring-3d'
import { buildField } from './field-3d'
import { buildLinks } from './links-3d'
import { buildFloaters } from './floaters'
import { cssColor, cssNumber, readToken } from './tokens'

/**
 * Vāda's hero scene, ported from Vinaya Portal's `hero-canvas/hero-scene.js` without the
 * harness and beam: the same fabric (`field-3d.js`) and drifting squares (`floaters.js`),
 * both copied verbatim next to this file, the same scroll-driven camera tip (top-down at
 * scroll 0, toward the horizon by TIP_TO), and the same per-letter headline scrub.
 * `field-3d.js` dishes at the world origin — under the driver. Scroll also scrubs the
 * deliberation in `agent-ring-3d.js`, and the camera leans in as it concludes. Loaded by dynamic `import()` so `three` stays
 * out of the SSR graph.
 *
 * Timeline constants are Vinaya's, unchanged.
 */

const TIP_FROM = 0.02
const TIP_TO = 0.72
const H1_FROM = 0.28
const H1_SPAN = 0.18
const H1B_FROM = 0.47
const SUB_FROM = 0.68
const SUB_SPAN = 0.16
const DISH = 0.62
const ARRIVAL_T = 0.2
const MASS_RAMP_S = 1.2 // the well deepens as the scene opens
const FLOATER_ALPHA = 1
const RING_RADIUS = 2.3
// messages are light touches, not solid balls: translucent, in the sender's colour
const MESSAGE_OPACITY = 0.4
const FIT_ASPECT = 0.72 // narrowest aspect at which the reviewers' arc still fits edge to edge

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/* per-character <i>, so each letter can be driven independently — class strings come from
   the .tsx (Tailwind only scans .ts/.tsx) */
function splitLetters(el, labelClass) {
  if (!el) return []
  const words = (el.dataset.text ?? el.textContent ?? '').trim().split(' ')
  // built as nodes with textContent, never innerHTML, so the copy is always text
  el.replaceChildren(
    ...words.flatMap((w, i) => {
      const word = document.createElement('span')
      word.className = labelClass.word
      for (const c of w) {
        const letter = document.createElement('i')
        letter.className = labelClass.letter
        letter.textContent = c
        word.append(letter)
      }
      return i === 0 ? [word] : [' ', word]
    })
  )
  return [...el.querySelectorAll('i')]
}

function revealLetters(letters, p, from, span) {
  const per = span / Math.max(1, letters.length)
  letters.forEach((l, i) => {
    const t = clamp01((p - (from + i * per * 0.65)) / Math.max(0.001, per * 2.2))
    l.style.opacity = t.toFixed(3)
    l.style.transform = `translateY(${((1 - t) * 4).toFixed(2)}px)`
  })
}

/* Vinaya's two floater populations: one over the fabric around the centre, one from in front of
   the tipped camera out to the horizon. */
function heroFloaterPlace(rnd) {
  const spread = (half) => {
    const u = rnd() * 2 - 1
    return (Math.abs(u) < 0.3 && rnd() < 0.8 ? Math.sign(u || 1) * (0.3 + rnd() * 0.7) : u) * half
  }
  if (rnd() < 0.45) return [spread(9), 0.2 + rnd() * 7, (rnd() * 2 - 1) * 6]
  const z = 8 - 38 * rnd() ** 1.4
  const distance = Math.max(2.5, 10 - z)
  return [spread(distance * 0.55), -0.3 + rnd() * 5, z]
}

function readPalette(root, agentTokens, hubToken) {
  for (const name of ['--background', '--foreground', '--primary', '--card']) if (readToken(name) == null) return null
  try {
    return {
      bg: readToken('--background'),
      ink: readToken('--primary'),
      card: cssColor(root, '--hero-core-card'),
      shade: cssColor(root, '--hero-core-shade'),
      deep: cssColor(root, '--hero-core-deep'),
      fabricInk: cssColor(root, '--hero-fabric-ink'),
      fabricAlpha: cssNumber(root, '--hero-fabric-alpha'),
      muted: cssColor(root, '--muted-foreground'),
      cardFg: cssColor(root, '--card-foreground'),
      hubColor: (() => {
        try {
          return cssColor(root, hubToken)
        } catch {
          return readToken('--primary')
        }
      })(),
      agentColors: agentTokens.map((name) => {
        try {
          return cssColor(root, name)
        } catch {
          return readToken('--primary')
        }
      })
    }
  } catch {
    return null
  }
}

const toCss = (c) => (typeof c === 'number' ? `#${c.toString(16).padStart(6, '0')}` : c)

/* The hub tells the run in three beats: the QUESTION, then LIVE DELIBERATION (each reviewer
   picks a tool, works, and lands its answer — one row each), then the VERDICT, with the dissent
   kept on record. Rows have a stable `id` so each types in once, when it first appears. */
/* The hub is ONE fixed layout whose text evolves — a label slot (QUESTION → LIVE DELIBERATION →
   VERDICT), a headline slot (the question, which stays up while it is deliberated, then becomes
   the decision), and a detail slot below (the live rows, then the tally). When a slot changes,
   its old text retracts letter by letter and the new text decodes in through scrambling glyphs —
   the same thought, turning into the next one. Every morph is scrubbed by scroll. */
const RESOLVE_FROM = CONCLUDE_AT - 0.04
const RESOLVE_TO = CONCLUDE_AT + 0.1
const LIVE_OUT = 0.25 // share of the resolve the live rows take to fade
const LABEL_TO_LIVE = [Q_FROM - 0.03, Q_FROM + 0.02]
const LABEL_TO_VERDICT = [RESOLVE_FROM, RESOLVE_FROM + 0.04]
const HEADLINE_TO_DECISION = [RESOLVE_FROM + 0.015, RESOLVE_FROM + 0.065]
const SCRAMBLE = '01<>/\\|=+*#%?ABCDEFGHJKLMNPRSTUVWXYZ'

const span = (p, [a, b]) => clamp01((p - a) / (b - a))

/* Text partway from `from` to `to` (m 0–1): the old text deletes from its end, then the new one
   decodes in, its leading edge two scrambling glyphs that change with time. */
function morph(from, to, m, now) {
  if (m <= 0) return from
  if (m >= 1) return to
  const glyph = (k) => SCRAMBLE[Math.floor(now * 24 + k * 7) % SCRAMBLE.length]
  if (m < 0.5) {
    const keep = Math.round(from.length * (1 - m * 2))
    return from.slice(0, keep) + glyph(keep)
  }
  const shown = Math.floor(to.length * (m * 2 - 1))
  const tail = Math.min(2, to.length - shown)
  let out = to.slice(0, shown)
  for (let k = 0; k < tail; k++) out += glyph(shown + k)
  return out
}

function hubBeat(p) {
  const resolve = clamp01((p - RESOLVE_FROM) / (RESOLVE_TO - RESOLVE_FROM))
  if (resolve >= LIVE_OUT) return { beat: 'verdict', resolve }
  if (p >= Q_FROM) return { beat: 'live', resolve }
  return { beat: 'question', resolve }
}

function liveRows(p, script, colors, dissent) {
  const n = script.reviewers.length
  const t = script.hubText
  const back = clamp01((p - A_FROM) / (A_TO - A_FROM))
  const rows = []
  script.reviewers.forEach((rv, i) => {
    // a reviewer picks its tool as the question reaches it, and is done when its answer lands
    const starts = Q_FROM + (Q_TO - Q_FROM) * ((0.7 * i) / n)
    if (p < starts) return
    const landed = p >= A_FROM && back >= (i / n) * (1 - ANSWER_SPAN) + ANSWER_SPAN
    const state = !landed ? 'work' : i === dissent ? 'dissent' : 'done'
    rows.push({
      id: `rv${i}`,
      who: rv.name,
      text: landed && i === dissent ? t.dissents : rv.tool,
      color: colors[i],
      state
    })
  })
  if (p >= A_TO) rows.push({ id: 'synth', who: script.hub.name, text: t.reconciling, state: 'work' })
  return rows
}

const LIVE_ROWS = 4
/* One type scale for the whole run, as shares of the hub: the label (QUESTION / LIVE DELIBERATION /
   VERDICT), the headline (the question, then the decision, at the same size — it never grows), and
   one detail size for everything under it (the live rows, the tally, the dissent line). The
   headline may run to two lines (`\n` in the script); the space between the slots is what lets
   the hub breathe. */
const LABEL_PX = 0.05
const HEADLINE_PX = 0.08
const HEADLINE_LH = 1.12
const DETAIL_PX = 0.04
const LABEL_Y = -0.215
const HEADLINE_Y = -0.12
const DETAIL_Y = 0.02
const TYPE_CPS = 45 // characters per second as a new row types in

/* Paints the hub onto its patch canvas — the fixed layout, its slots at their current text. */
function drawHub(ctx, size, p, beat, resolve, rows, appeared, now, script, colors, dissent, ink, font) {
  ctx.clearRect(0, 0, size, size)
  const c = size / 2
  const t = script.hubText
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  // label slot
  const label =
    p >= LABEL_TO_VERDICT[0]
      ? morph(t.liveLabel, t.verdictLabel, span(p, LABEL_TO_VERDICT), now)
      : morph(t.questionLabel, t.liveLabel, span(p, LABEL_TO_LIVE), now)
  ctx.font = `500 ${Math.round(size * LABEL_PX)}px ${font}`
  ctx.letterSpacing = `${Math.round(size * 0.008)}px`
  ctx.fillStyle = toCss(ink)
  ctx.globalAlpha = 0.5
  ctx.fillText(label, c, c + size * LABEL_Y)
  ctx.letterSpacing = '0px'
  ctx.globalAlpha = 1

  // headline slot: the question stays up while it is deliberated, then becomes the decision
  const decided = span(p, HEADLINE_TO_DECISION)
  const headPx = Math.round(size * HEADLINE_PX)
  ctx.font = `500 ${headPx}px ${font}`
  const lines = morph(t.question, t.decision, decided, now).split('\n')
  lines.forEach((line, k) => {
    ctx.fillText(line, c, c + size * HEADLINE_Y + k * headPx * HEADLINE_LH)
  })

  // detail slot
  if (beat === 'live') {
    const fontPx = Math.round(size * DETAIL_PX)
    const lineH = fontPx * 1.85
    ctx.font = `400 ${fontPx}px ${font}`
    ctx.textAlign = 'left'
    const charW = ctx.measureText('m').width
    const shown = rows.slice(-LIVE_ROWS)
    const widest = Math.max(...rows.map((r) => ctx.measureText(`${r.who}  ${r.text}`).width), 0)
    const left = c - (widest + charW * 2) / 2
    const fade = 1 - clamp01(resolve / LIVE_OUT)
    shown.forEach((row, k) => {
      const y = c + size * DETAIL_Y + k * lineH
      const since = appeared.get(row.id)
      const full = `${row.who}  ${row.text}`
      const typed = since == null ? full.length : Math.floor((now - since) * TYPE_CPS)
      let x = left
      ctx.globalAlpha = fade
      // status glyph: a spinner in the reviewer's colour while it works, a tick or a cross after
      if (row.state === 'work') {
        const a = now * 6
        ctx.beginPath()
        ctx.arc(x + charW * 0.5, y, fontPx * 0.3, a, a + Math.PI * 1.4)
        ctx.lineWidth = fontPx * 0.09
        ctx.strokeStyle = toCss(row.color ?? ink)
        ctx.stroke()
      } else {
        ctx.fillStyle = toCss(row.state === 'dissent' ? (row.color ?? ink) : ink)
        ctx.fillText(row.state === 'dissent' ? '×' : '✓', x, y)
      }
      x += charW * 2
      ctx.fillStyle = toCss(row.color ?? ink)
      ctx.fillText(row.who.slice(0, Math.max(0, typed)), x, y)
      x += ctx.measureText(`${row.who}  `).width
      ctx.fillStyle = toCss(ink)
      ctx.globalAlpha = fade * 0.85
      ctx.fillText(row.text.slice(0, Math.max(0, typed - row.who.length - 2)), x, y)
    })
    ctx.globalAlpha = 1
    return
  }

  if (beat === 'verdict') {
    // the tally, the agreeing dots one by one, then the dissent stepping out and being named
    const v = (resolve - LIVE_OUT) / (1 - LIVE_OUT)
    const step = (a, b) => clamp01((v - a) / (b - a))
    ctx.textAlign = 'center'
    ctx.fillStyle = toCss(ink)
    ctx.font = `400 ${Math.round(size * DETAIL_PX)}px ${font}`
    ctx.globalAlpha = 0.75 * step(0.3, 0.45)
    ctx.fillText(t.tally, c, c + size * DETAIL_Y)
    const n = colors.length
    const gap = size * 0.04
    const pip = size * 0.012
    const y = c + size * (DETAIL_Y + 0.07)
    const agree = colors.map((_, i) => i).filter((i) => i !== dissent)
    const rowW = (n - 1) * gap
    agree.forEach((i, k) => {
      ctx.globalAlpha = step(0.45 + k * 0.06, 0.53 + k * 0.06)
      ctx.beginPath()
      ctx.arc(c - rowW / 2 + k * gap, y, pip, 0, Math.PI * 2)
      ctx.fillStyle = toCss(colors[i])
      ctx.fill()
    })
    if (dissent >= 0) {
      const out = step(0.8, 1)
      ctx.globalAlpha = step(0.72, 0.8)
      ctx.beginPath()
      ctx.arc(c + rowW / 2 + out * gap * 0.9, y, pip, 0, Math.PI * 2)
      ctx.lineWidth = pip * 0.5
      ctx.strokeStyle = toCss(colors[dissent])
      ctx.stroke()
      ctx.globalAlpha = out
      ctx.font = `400 ${Math.round(size * DETAIL_PX)}px ${font}`
      ctx.fillStyle = toCss(colors[dissent])
      ctx.fillText(t.dissentLabel, c, y + size * 0.07)
    }
    ctx.globalAlpha = 1
  }
}

export function mountHeroScene({
  canvas,
  root,
  track,
  labels,
  script,
  labelClass,
  frameShiftRem = 0,
  onProgress = () => {}
}) {
  const agentTokens = script.reviewers.map((rv) => rv.token)
  const palette = readPalette(root, agentTokens, script.hub.token)
  if (!palette) return { setFaces() {}, setRing() {}, dispose() {} }
  let { bg, ink, card, shade, deep, fabricInk, fabricAlpha, agentColors, hubColor, muted, cardFg } = palette
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const L_H1A = splitLetters(root.querySelector('[data-hero-h1a]'), labelClass)
  const L_H1B = splitLetters(root.querySelector('[data-hero-h1b]'), labelClass)
  const L_SUB = splitLetters(root.querySelector('[data-hero-sub]'), labelClass)
  for (const l of [...L_H1A, ...L_H1B, ...L_SUB]) l.style.transition = 'none'

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  // cleared by hand each frame: the links' scene draws over the main one (see the frame loop)
  renderer.autoClear = false
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 400)

  const field = buildField(THREE, {
    ink: fabricInk,
    radius: 34,
    divisions: 272,
    dishDepth: DISH,
    dishR: 2.15,
    coreR: 0,
    opacity: fabricAlpha,
    surface: bg,
    flashHex: readToken('--card'),
    // no hole: the hub floats above the centre rather than sitting in it, so the lines run on
    holeR: 0,
    // each reviewer weighs on the sheet too — a shallower dent than the hub's well
    wells: script.reviewers.map((_, i) => {
      const a = arcAngle(i, script.reviewers.length)
      return { x: Math.sin(a) * RING_RADIUS, z: -Math.cos(a) * RING_RADIUS, r: 0.9, depth: 0.22 }
    }),
    activeRadius: 13
  })
  scene.add(field.mesh)

  const floaters = buildFloaters(THREE, {
    count: 208,
    color: fabricInk,
    opacity: fabricAlpha * FLOATER_ALPHA,
    size: 0.2,
    maxSize: 9,
    place: heroFloaterPlace,
    depthTest: false,
    center: [0, 0, 0],
    extent: [0, 0, 0],
    seed: 20261006
  })
  floaters.points.renderOrder = 10
  scene.add(floaters.points)

  /* the driver over the dish and the agents on a ring around it, clockwise from the top */
  const ring = buildAgentRing(THREE, {
    count: script.reviewers.length,
    ringRadius: RING_RADIUS,
    sphereRadius: 0.42,
    driverRadius: 0.95,
    // clear of the sheet's rim bulge (the dish pushes the sheet up around it), so the spheres
    // don't sink into it as the camera tips
    y: 0.7,
    agentColors,
    hubColor,
    card,
    shade,
    deep,
    ink
  })
  scene.add(ring.group)

  /* The names, pinned under every sphere while the view is top-down, are HTML; the hub's status
     is painted on its surface (`paintHub`). Class strings come from the .tsx (Tailwind scans
     .ts/.tsx only). */
  const nameEl = (name, token) => {
    const el = document.createElement('span')
    el.className = labelClass.name
    el.textContent = name
    el.style.color = `var(${token})`
    labels.appendChild(el)
    return el
  }
  const nameEls = script.reviewers.map((rv) => nameEl(rv.name, rv.token))

  /* The links (`links-3d.js`): one per reviewer, real geometry in the scene, each carrying its
     own messages. In the reviewer's colour until its answer has landed, then muted — it stays
     for good, so the final view still shows everyone connected to the hub. */
  const links = buildLinks(THREE, script.reviewers.length, { agentColors, hubColor, muted }, MESSAGE_OPACITY)
  const hubNameEl = nameEl(script.hub.name, script.hub.token)
  const HUB_TEX = 768
  const hubCanvas = document.createElement('canvas')
  hubCanvas.width = hubCanvas.height = HUB_TEX
  const hubCtx = hubCanvas.getContext('2d')
  const monoFont = getComputedStyle(root).getPropertyValue('--font-mono').trim() || 'monospace'
  const dissent = script.reviewers.findIndex((rv) => rv.name === script.hubText.dissenter)
  // when each row first appeared, so it types in once; rows scrolled away are forgotten
  const appeared = new Map()
  let lastPaint = -1
  let lastP = -1
  let hubDirty = true
  const paintHub = (p, now) => {
    if (!hubCtx) return
    const { beat, resolve } = hubBeat(p)
    const rows = beat === 'live' ? liveRows(p, script, agentColors, dissent) : []
    const ids = new Set(rows.map((r) => r.id))
    for (const id of appeared.keys()) if (!ids.has(id)) appeared.delete(id)
    for (const r of rows) if (!appeared.has(r.id)) appeared.set(r.id, reduced || lastPaint < 0 ? null : now)
    // repaint (and re-upload the texture) only when something on the hub moves: scroll changed
    // its text, or it is alive (a spinner, a row typing in, a label or headline mid-scramble).
    // Alive, it repaints at ~20fps rather than every frame.
    const alive =
      rows.some((r) => r.state === 'work' || (appeared.get(r.id) ?? -1e9) > now - 2) ||
      [LABEL_TO_LIVE, LABEL_TO_VERDICT, HEADLINE_TO_DECISION].some((w) => {
        const m = span(p, w)
        return m > 0 && m < 1
      })
    if (!hubDirty && p === lastP && !alive) return
    if (!hubDirty && lastPaint >= 0 && now - lastPaint < 0.05) return
    hubDirty = false
    lastP = p
    lastPaint = now
    drawHub(hubCtx, HUB_TEX, p, beat, resolve, rows, appeared, now, script, agentColors, dissent, cardFg, monoFont)
    ring.setHubFace(hubCanvas)
  }

  const proj = new THREE.Vector3()
  const edge = new THREE.Vector3()
  const camRight = new THREE.Vector3()
  // a core's centre and radius on screen, in px, or null while it is hidden
  const onScreen = (pos, radius, w, h) => {
    if (radius < 0.01) return null
    proj.copy(pos).project(camera)
    camRight.setFromMatrixColumn(camera.matrixWorld, 0)
    edge.copy(pos).addScaledVector(camRight, radius).project(camera)
    const x = ((proj.x + 1) / 2) * w
    return { x, y: ((1 - proj.y) / 2) * h, r: Math.abs(((edge.x + 1) / 2) * w - x) }
  }
  const show = (el, alpha) => {
    el.style.opacity = alpha.toFixed(2)
    return alpha > 0
  }
  const pinUnder = (el, at, alpha) => {
    if (!show(el, at ? alpha : 0)) return
    el.style.transform = `translate(${at.x.toFixed(1)}px, ${(at.y + at.r + 6).toFixed(1)}px) translateX(-50%)`
  }
  const placeLabels = (p, tip, now) => {
    const w = root.clientWidth
    const h = root.clientHeight
    const a = ring.anchors()
    // names belong to the top-down view; they fade out as the camera starts to tip
    const names = 1 - clamp01(tip / 0.25)
    a.agents.forEach((ag, i) => {
      pinUnder(nameEls[i], onScreen(ag.pos, ag.radius, w, h), names)
    })
    const hub = onScreen(a.driver.pos, a.driver.radius, w, h)
    pinUnder(hubNameEl, hub, names)
    paintHub(p, now)
  }

  /* `frameShiftRem` moves the image down inside the canvas (a view offset), so the dish sits
     under the ring rather than at the canvas's exact centre — Vinaya's FRAME_SHIFT_REM idiom */
  let resizePending = true
  const resizeObserver = new ResizeObserver(() => {
    resizePending = true
  })
  resizeObserver.observe(root)
  const viewSize = { width: 1, height: 1 }
  const resize = () => {
    const w = root.clientWidth
    const h = root.clientHeight
    viewSize.width = w
    viewSize.height = h
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    const shift = frameShiftRem * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    if (shift > 0 && h > 0) camera.setViewOffset(w, h, 0, -shift, w, h)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }

  const target = new THREE.Vector3()
  const place = (elevDeg, dist, targetY, azDeg) => {
    const e = (elevDeg * Math.PI) / 180
    const a = (azDeg * Math.PI) / 180
    target.set(0, targetY, 0)
    camera.position.set(
      Math.cos(e) * Math.sin(a) * dist,
      targetY + Math.sin(e) * dist,
      Math.cos(e) * Math.cos(a) * dist
    )
    camera.lookAt(target)
  }
  const seatY = -DISH

  const progress = () => {
    const r = track.getBoundingClientRect()
    const travel = r.height - root.clientHeight
    return travel <= 20 ? 0 : clamp01(-r.top / travel)
  }

  const rayc = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  let pointerIn = false
  let mx = 0
  let my = 0
  let px = 0
  let py = 0
  const onMove = (e) => {
    const r = root.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    mx = (e.clientX - r.left) / r.width - 0.5
    my = (e.clientY - r.top) / r.height - 0.5
    pointerIn = true
  }
  const onLeave = () => {
    pointerIn = false
    field.setCursor(null)
  }
  root.addEventListener('pointermove', onMove)
  root.addEventListener('pointerleave', onLeave)

  let firedArrival = false
  let pSmooth = 0
  let raf = 0
  const t0 = performance.now()
  let last = t0
  const frame = (now) => {
    raf = requestAnimationFrame(frame)
    if (resizePending) {
      resizePending = false
      resize()
    }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = (now - t0) / 1000
    const pTarget = reduced ? 1 : progress()
    pSmooth = reduced ? pTarget : pSmooth + (pTarget - pSmooth) * 0.2
    const p = pSmooth
    const tip = easeInOut(clamp01((p - TIP_FROM) / (TIP_TO - TIP_FROM)))
    onProgress(p, tip)

    if (!firedArrival && t >= ARRIVAL_T) {
      firedArrival = true
      field.pulse({ amp: 0.2, decay: 1.1 })
    }
    field.update(dt, { mass: reduced ? 1 : Math.min(1, t / MASS_RAMP_S), time: t, lift: 1 - tip })
    if (pointerIn) {
      rayc.setFromCamera(ndc, camera)
      if (rayc.ray.intersectPlane(groundPlane, hit)) field.setCursor(hit)
    }
    floaters.update(reduced ? 0 : t)
    ring.setScroll(p)
    ring.update(dt, t, camera, reduced)
    revealLetters(L_H1A, p, H1_FROM, H1_SPAN)
    revealLetters(L_H1B, p, H1B_FROM, H1_SPAN)
    revealLetters(L_SUB, p, SUB_FROM, SUB_SPAN)

    px += (mx - px) * 0.05
    py += (my - py) * 0.05
    // once the decision is in, the camera leans in a little — the hub itself never grows
    // on a portrait screen the camera backs off until the whole arc fits the width
    const fit = Math.max(1, FIT_ASPECT / camera.aspect)
    const dist = lerp(13.5, 10.4, tip) * fit * (1 - 0.1 * easeInOut(clamp01((p - CONCLUDE_AT) / 0.12)))
    place(lerp(88, 17, tip) + py * 2.5 * tip, dist, lerp(seatY, seatY + 1, tip), px * 3.5 * tip)
    field.setFade(dist * 0.8, dist * 2.7)
    const back = clamp01((p - A_FROM) / (A_TO - A_FROM))
    const anchors = ring.anchors()
    links.update(
      anchors.driver,
      anchors.agents,
      anchors.agents.map((_, i) => p >= A_FROM && answerProgress(back, i, anchors.agents.length) >= 1),
      dt,
      reduced,
      viewSize
    )
    renderer.clear()
    renderer.render(scene, camera)
    // the links over the scene, hidden only by the spheres (see `links-3d.js`)
    renderer.clearDepth()
    renderer.render(links.scene, camera)
    placeLabels(p, tip, t)
  }
  raf = requestAnimationFrame(frame)

  const applyTheme = () => {
    const next = readPalette(root, agentTokens, script.hub.token)
    if (!next) return
    ;({ bg, ink, card, shade, deep, fabricInk, fabricAlpha, agentColors, hubColor, muted, cardFg } = next)
    scene.background = new THREE.Color(bg)
    renderer.setClearColor(bg, 1)
    field.retheme({ ink: fabricInk, surface: bg, opacity: fabricAlpha })
    floaters.retheme(fabricInk, fabricAlpha * FLOATER_ALPHA)
    ring.retheme({ card, shade, deep, ink, agentColors, hubColor })
    links.retheme({ agentColors, hubColor, muted })
    hubDirty = true
  }
  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })

  return {
    // face canvases come in AGENT_LIST order; the arc wears the reviewers' faces only
    setFaces: (canvases) => ring.setFaces(script.reviewers.map((rv) => canvases[rv.faceIndex])),
    setRing: ring.setProgress,
    dispose() {
      cancelAnimationFrame(raf)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      labels.replaceChildren()
      scene.traverse((o) => {
        o.geometry?.dispose?.()
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []
        for (const m of mats) {
          for (const value of Object.values(m)) if (value?.isTexture) value.dispose()
          m.dispose?.()
        }
      })
      links.dispose()
      renderer.dispose()
    }
  }
}
