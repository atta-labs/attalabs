import * as THREE from 'three'
import { buildHarness, token } from './harness-model'
import { buildField } from './field-3d'
import { buildBeam } from './underworld-beam'

/**
 * Mount factory for the approved Claude Design hero (`implementation/VinayaHero.tsx` in the
 * handoff). The three canvas builders live verbatim alongside this file — this file is the
 * orchestration layer `VinayaHero.tsx` inlined into its `useEffect`, moved into a `.js`
 * factory behind a dynamic `import()` so `three` stays out of the SSR module graph (the
 * `/life-cycle` precedent, `.claude/skills/vinaya-architecture/SKILL.md`).
 *
 * DO NOT retune the timeline below — it is copied verbatim from the approved handoff.
 * Every `document`/`window`/`getComputedStyle` read lives inside `mountHeroScene`.
 */

/* ── the timeline. Build beats are seconds; everything else is scroll progress 0–1 ── */
const BUILD = [
  ['screw', 0.55, 0.5],
  ['deploy', 1.3, 0.7],
  ['spark', 2.3, 0.45],
  ['clamp', 3.1, 0.8],
  ['mainPulse', 3.85, 0.62],
  ['merge', 3.98, 0.55]
]
const WAVE_T = 3.98
const TIP_FROM = 0.02
const TIP_TO = 0.72
const H1_FROM = 0.28
const H1_SPAN = 0.18 // line 1 completes…
const H1B_FROM = 0.47 // …before line 2 starts
const SUB_FROM = 0.68
const SUB_SPAN = 0.16
const DISH = 0.62

const clamp01 = (x) => Math.max(0, Math.min(1, x))
const lerp = (a, b, t) => a + (b - a) * t
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const smoothstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

/* split into per-character <i> so each letter can be driven independently. Class strings
   come from `labelClass` (authored in the .tsx, per the WebGL-surface rule: Tailwind's
   @source globs are .ts/.tsx only, so a class string literal in this .js file compiles to
   nothing). */
function splitLetters(el, labelClass) {
  const words = (el.dataset.text ?? el.textContent ?? '').trim().split(' ')
  el.innerHTML = words
    .map(
      (w) =>
        `<span class="${labelClass.word}">${[...w]
          .map((c) => `<i class="${labelClass.letter}">${c === '&' ? '&amp;' : c}</i>`)
          .join('')}</span>`
    )
    .join(' ')
  return [...el.querySelectorAll('i')]
}

export function mountHeroScene({ canvas, root, labelClass, onReady = () => {} }) {
  const scope = root ?? document
  const track = scope.querySelector('[data-hero-track]')
  const hero = scope.querySelector('[data-hero-viewport]')
  const h1a = scope.querySelector('[data-hero-h1a]')
  const h1b = scope.querySelector('[data-hero-h1b]')
  const subEl = scope.querySelector('[data-hero-sub]')
  const descendEl = scope.querySelector('[data-hero-descend]')

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  const L_H1A = splitLetters(h1a, labelClass)
  const L_H1B = splitLetters(h1b, labelClass)
  const L_SUB = splitLetters(subEl, labelClass)
  for (const l of [...L_H1A, ...L_H1B, ...L_SUB]) l.style.transition = 'none'

  /* every colour comes from the theme; token() throws if one is missing */
  let bg = token('--background')
  let ink = token('--primary')
  let sand = token('--secondary')
  let card = token('--card')

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
  renderer.localClippingEnabled = true
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(bg)
  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 400)

  let disposed = false
  let raf = 0
  let cleanupBuild = () => {}
  let readyFired = false

  const resize = () => {
    renderer.setSize(hero.clientWidth, hero.clientHeight, false)
    camera.aspect = hero.clientWidth / hero.clientHeight
    camera.updateProjectionMatrix()
  }
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(hero)

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

  /* the wordmark itself is the topbar's lockup now (see hero-lockup-context.tsx) — VinayaHeroEmblem
     drives it separately via lockup-flip.js. This scene owns only the title/sub/cta/descend
     copy. */
  function setCopy(p, buildDone) {
    const cue = buildDone ? 1 - smoothstep(0.005, 0.06, p) : 0
    descendEl.style.opacity = cue.toFixed(3)
    revealLetters(L_H1A, p, H1_FROM, H1_SPAN)
    revealLetters(L_H1B, p, H1B_FROM, H1_SPAN)
    revealLetters(L_SUB, p, SUB_FROM, SUB_SPAN)
  }
  /* letters are driven per frame, which is what lets them scrub smoothly */
  function revealLetters(letters, p, from, span) {
    const per = span / Math.max(1, letters.length)
    letters.forEach((l, i) => {
      const t = clamp01((p - (from + i * per * 0.65)) / Math.max(0.001, per * 2.2))
      l.style.opacity = t.toFixed(3)
      l.style.transform = `translateY(${((1 - t) * 4).toFixed(2)}px)`
    })
  }

  function progress() {
    const r = track.getBoundingClientRect()
    const travel = r.height - hero.clientHeight
    return travel <= 20 ? 0 : clamp01(-r.top / travel)
  }

  const scrollHost = hero.closest('.overflow-y-auto')

  /* the live trio once built — what applyTheme() repaints. null while nothing is mounted. */
  let live = null

  function build() {
    let locked = !reduced
    if (locked && scrollHost) scrollHost.classList.add('overflow-hidden')

    let cancelled = false
    // main-core options — the 1c fix for the core reading as an egg in light mode: wire net
    // at 0.07 alpha, per-fragment cel terminator, collar contact, centre lifted 0.13R → 0.22R.
    // See harness-model.js's main block for what each does. Defaults there are inert.
    buildHarness(THREE, { core: { wire: 0.07, ramp: 'deep', contact: true, lift: 0.22 } }).then((harness) => {
      if (cancelled || disposed) return
      const field = buildField(THREE, {
        ink,
        radius: 34,
        divisions: 272,
        dishDepth: DISH,
        dishR: 2.15,
        coreR: 0,
        opacity: 0.15,
        surface: bg,
        flashHex: card,
        activeRadius: 13
      })
      const seatY = -DISH - (harness.dims.coreLift - harness.dims.coreRadius)
      harness.group.position.y = seatY
      scene.add(harness.group, field.mesh)
      const beam = buildBeam(THREE, { ink, sand, card, topY: seatY + harness.dims.coreLift, depth: 34, rimRadius: 9 })
      scene.add(beam.group)
      live = { harness, field, beam }
      applyTheme() // a theme flip during the async build lands on the tokens read now, not at kickoff
      resize()
      place(88, 13.5, seatY, 0)

      const rayc = new THREE.Raycaster()
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const hit = new THREE.Vector3()
      const ndc = new THREE.Vector2()
      let pointerIn = false
      let mx = 0
      let my = 0
      let px = 0
      let py = 0
      const onMove = (e) => {
        const r = hero.getBoundingClientRect()
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
        mx = (e.clientX - r.left) / r.width - 0.5
        my = (e.clientY - r.top) / r.height - 0.5
        pointerIn = true
      }
      const onLeave = () => {
        pointerIn = false
        field.setCursor(null)
      }
      hero.addEventListener('pointermove', onMove)
      hero.addEventListener('pointerleave', onLeave)

      const t0 = performance.now()
      let last = t0
      let firedWave = false

      const frame = (now) => {
        raf = requestAnimationFrame(frame)
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const t = (now - t0) / 1000
        const p = reduced ? 1 : locked ? 0 : progress()
        const tip = easeInOut(clamp01((p - TIP_FROM) / (TIP_TO - TIP_FROM)))

        const state = {}
        for (const [key, start, dur] of BUILD) state[key] = reduced ? 1 : clamp01((t - start) / dur)
        const buildDone = state.merge >= 1
        if (buildDone && locked) {
          locked = false
          if (scrollHost) scrollHost.classList.remove('overflow-hidden')
        }
        if (buildDone && !readyFired) {
          readyFired = true
          onReady?.()
        }

        state.spin = Math.PI * 2 * easeInOut(clamp01(p / (TIP_TO * 0.95)))
        state.green = smoothstep(0.42, 0.9, p)
        state.time = t
        state.cursor = pointerIn ? hit : null
        state.waveAxis = tip
        state.tip = tip
        state.buildFlash = reduced ? 0 : clamp01(1 - (t - 4.6) / 2.2)
        if (!firedWave && (t >= WAVE_T || reduced)) {
          firedWave = true
          field.pulse()
        }

        harness.update(state)
        field.update(dt, { mass: 1, time: t })
        if (pointerIn) {
          rayc.setFromCamera(ndc, camera)
          if (rayc.ray.intersectPlane(groundPlane, hit)) field.setCursor(hit)
        }
        beam.update(t, camera)
        setCopy(p, buildDone)

        px += (mx - px) * 0.05
        py += (my - py) * 0.05
        const dist = lerp(13.5, 10.4, tip)
        place(lerp(88, 17, tip) + py * 2.5 * tip, dist, lerp(seatY, seatY + 1, tip), px * 3.5 * tip)
        field.setFade(dist * 0.8, dist * 2.7)
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(frame)

      cleanupBuild = () => {
        cancelled = true
        cancelAnimationFrame(raf)
        hero.removeEventListener('pointermove', onMove)
        hero.removeEventListener('pointerleave', onLeave)
        if (scrollHost) scrollHost.classList.remove('overflow-hidden')
        live = null
        scene.remove(harness.group, field.mesh, beam.group)
        scene.traverse((o) => {
          o.geometry?.dispose?.()
          if (o.material) {
            const mats = Array.isArray(o.material) ? o.material : [o.material]
            for (const m of mats) {
              m.map?.dispose?.()
              m.alphaMap?.dispose?.()
              m.dispose?.()
            }
          }
        })
      }
    })
    cleanupBuild = () => {
      cancelled = true
    }
  }

  /* theme change repaints IN PLACE. Materials capture token values at build time, so
     flipping data-theme alone leaves the 3D on the old palette — but rebuilding the scene
     replays the whole build animation and re-locks the scroll for a palette change, which
     is wrong. Each module owns a retheme() that re-reads the tokens and repaints its own
     colours, uniforms and label textures; geometry and animation state are untouched. */
  function applyTheme() {
    bg = token('--background')
    ink = token('--primary')
    sand = token('--secondary')
    card = token('--card')
    scene.background = new THREE.Color(bg)
    renderer.setClearColor(bg, 1)
    if (!live) return
    live.harness.retheme()
    live.field.retheme({ ink, surface: bg })
    live.beam.retheme({ ink, sand, card })
  }
  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })

  build()

  return {
    applyTheme,
    dispose() {
      disposed = true
      cleanupBuild()
      resizeObserver.disconnect()
      themeObserver.disconnect()
      renderer.dispose()
    }
  }
}
