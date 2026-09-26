import * as THREE from 'three'
import { buildHarness, cssColor, cssNumber, readToken } from './harness-model'
import { buildField } from './field-3d'
import { buildBeam } from './underworld-beam'

/**
 * Mount factory for the approved Claude Design hero (`implementation/VinayaHero.tsx` in the
 * handoff). The three canvas builders live verbatim alongside this file — this file is the
 * orchestration layer `VinayaHero.tsx` inlined into its `useEffect`, moved into a `.js`
 * factory behind a dynamic `import()` so `three` stays out of the SSR module graph (the
 * `/life-cycle` precedent, `.claude/skills/vinaya-architecture/SKILL.md`).
 *
 * DO NOT retune the timeline below. It is the approved handoff's sequence, with main's
 * arrival prepended per the later "main's arrival" handoff: an `open` ramp at the head and
 * every original beat shifted 0.75 s later, relative rhythm untouched.
 * Every `document`/`window`/`getComputedStyle` read lives inside `mountHeroScene`.
 */

/* ── the timeline. Build beats are seconds; everything else is scroll progress 0–1 ── */
const BUILD = [
  ['open', 0.25, 0.9], // main's aperture — the sheet is empty until it opens
  ['screw', 1.3, 0.5],
  ['deploy', 2.05, 0.7],
  ['spark', 3.05, 0.45],
  ['clamp', 3.85, 0.8],
  ['mainPulse', 4.6, 0.62],
  ['merge', 4.73, 0.55]
]
const WAVE_T = 4.73 // fires with `merge`
const ARRIVAL_T = 0.2 // the small ripple that precedes main's opening
const FLASH_T = 5.35 // the build flash trails the latch, same distance as before the shift
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
const easeOut = (t) => 1 - (1 - t) ** 3
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

/* Every design token the scene and its builders read, as one all-or-nothing snapshot, or
   null while any of them can't be read. The root tokens are the ones harness-model.js's
   retheme() re-reads (TOKENS there), plus --background and --foreground (the fabric ink's
   source); the hero-scoped four are hero-core.css's derived ramp and fabric variables,
   resolved off the hero element. */
const ROOT_TOKENS = ['--background', '--foreground', '--primary', '--secondary', '--card', '--success']
function readPalette(hero) {
  const hex = {}
  for (const name of ROOT_TOKENS) {
    const v = readToken(name)
    if (v == null) return null
    hex[name] = v
  }
  try {
    cssColor(hero, '--hero-core-shade')
    cssColor(hero, '--hero-core-deep')
    return {
      bg: hex['--background'],
      ink: hex['--primary'],
      sand: hex['--secondary'],
      card: hex['--card'],
      fabricInk: cssColor(hero, '--hero-fabric-ink'),
      fabricAlpha: cssNumber(hero, '--hero-fabric-alpha')
    }
  } catch {
    return null
  }
}

/* The hero never throws on a theme it can't read yet. Inside the admin preview frame
   (/?preview=true) the theme arrives by postMessage and is painted onto <html>'s inline
   style after this mounts (@atta/ui's PreviewThemeListener), so the scene waits for a
   readable palette, re-checking whenever <html>'s style/class/data-theme or <head>'s
   stylesheets change, and only then starts. There is no literal-colour fallback: until
   the tokens read, the canvas stays unpainted over the section's own background. */
export function mountHeroScene(opts) {
  const hero = (opts.root ?? document).querySelector('[data-hero-viewport]')
  let scene = null
  let waiter = null
  const tryStart = () => {
    if (scene) return true
    const palette = readPalette(hero)
    if (!palette) return false
    waiter?.disconnect()
    waiter = null
    scene = startHeroScene(opts, palette)
    return true
  }
  if (!tryStart()) {
    waiter = new MutationObserver(tryStart)
    waiter.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] })
    waiter.observe(document.head, { childList: true, subtree: true, characterData: true })
  }
  return {
    applyTheme() {
      scene?.applyTheme()
    },
    dispose() {
      waiter?.disconnect()
      waiter = null
      scene?.dispose()
      scene = null
    }
  }
}

function startHeroScene({ canvas, root, labelClass, onReady = () => {} }, palette) {
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

  /* every colour comes from the theme, read once by mountHeroScene's readPalette(). The
     fabric's ink and strength are hero-scoped CSS variables (hero-core.css), resolved off
     the hero element so the dark-scheme values apply */
  let { bg, ink, sand, card, fabricInk, fabricAlpha } = palette

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: true })
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
  /* THE ACTUAL FLICKER FIX. A live window drag fires the ResizeObserver far faster than
     once per rendered frame — every size the browser lays out during the drag, not once
     per vsync. `renderer.setSize()` reallocates the WebGL drawing buffer (and, at this
     canvas's antialias+devicePixelRatio, its multisample renderbuffers), which is not
     free; calling it synchronously from the observer callback let a burst of resize
     notifications run several of these reallocations back to back with no `render()` call
     landing in between. A freshly resized canvas is spec-cleared to transparent until the
     next draw, so a burst like that held the canvas on that cleared frame for the whole
     burst — visibly the harness and fabric vanishing, then snapping back once the drag
     paused and a render finally landed. Deferring the actual resize into a flag consumed
     once at the top of `frame()` guarantees at most one `setSize()` per rendered frame,
     and that it is always immediately followed by a `render()` in the same tick — no
     cleared-but-unpainted frame can ever reach the screen. (A damped scroll-progress value
     was tried first, in an earlier commit on this same still-unmerged PR; it does not touch
     this — the canvas went blank at scroll position zero, where the camera never moves.) */
  let resizePending = false
  const resizeObserver = new ResizeObserver(() => {
    resizePending = true
  })
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
    const harnessOpts = { tokenRoot: hero, core: { wire: 0.07, ramp: 'deep', contact: true, lift: 0.22 } }
    const building = buildHarness(THREE, harnessOpts).then((harness) => {
      if (cancelled || disposed) return
      const field = buildField(THREE, {
        ink: fabricInk,
        radius: 34,
        divisions: 272,
        dishDepth: DISH,
        dishR: 2.15,
        coreR: 0,
        opacity: fabricAlpha,
        surface: bg,
        flashHex: card,
        activeRadius: 13
      })
      /* Seat the RING, not the core. The harness must always sit above the fabric, including
         the shock wave's crest. Seating so the core's bottom kisses the dish floor ties the
         ring's height to the core's lift — and raising that lift (the cel-shaded core sits
         0.22R above the collar, up from 0.13R) pushed the ring down into the dish until the
         wave passed over its arms. The seat is pinned to the lift the dish was tuned against;
         the core's lift above the collar is a core-vs-collar decision and never moves the ring. */
      const SEAT_LIFT = 0.13
      const seatY = -DISH - (harness.dims.coreRadius * SEAT_LIFT - harness.dims.coreRadius)
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
      let firedArrival = false
      /* progress() reads the track's live rect: `travel = trackHeight - hero.clientHeight`,
         both of which move with the viewport's height (the track is `320vh`, the hero
         `h-dvh`). Resizing the window changes `travel` on every layout pass while the
         actual scrolled distance in pixels does not rescale with it, so at any nonzero
         scroll offset `progress()` returns a different number the instant the window's
         height changes, snapping the camera a step every such layout pass. `pSmooth`
         chases the raw signal instead of tracking it exactly, so that step becomes a few
         frames of motion instead of a jump — real, but only when scrolled partway into the
         hero; at scroll position zero (`progress()` pinned at `0` either side of the
         resize) this has nothing to smooth. It is NOT the flicker reported live: that
         reproduced at scroll zero too. See `resizePending` below, which is. Bypassed
         (snapped straight to the target) during the scroll-locked build and under
         reduced-motion, where the value must already be exact. */
      let pSmooth = 0
      /* main's arrival: the sphere and its contour open from nothing; the label (and with it
         the wire net and travellers, which ride the spinner) only once the surface is whole */
      const mainSphere = harness.group.getObjectByName('main-sphere')
      const mainContour = harness.group.getObjectByName('main-contour')
      const mainSpinner = harness.group.getObjectByName('main-spinner')

      const frame = (now) => {
        raf = requestAnimationFrame(frame)
        /* Consumed here, not in the observer callback — see resizePending's declaration
           comment. This must run before render() below, and nothing between here and that
           render() call may `return`/`continue` past it, or a resized-but-unpainted frame
           can reach the screen again. */
        if (resizePending) {
          resizePending = false
          resize()
        }
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        const t = (now - t0) / 1000
        const pTarget = reduced ? 1 : locked ? 0 : progress()
        if (reduced || locked) {
          pSmooth = pTarget // no added motion under reduced-motion; exact 0 through the build lock
        } else {
          pSmooth += (pTarget - pSmooth) * 0.2
        }
        const p = pSmooth
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
        state.buildFlash = reduced ? 0 : clamp01(1 - (t - FLASH_T) / 2.2)
        if (!firedArrival && t >= ARRIVAL_T) {
          firedArrival = true
          field.pulse({ amp: 0.2, decay: 1.1 }) // small, local; the latch keeps full strength
        }
        if (!firedWave && (t >= WAVE_T || reduced)) {
          firedWave = true
          field.pulse()
        }

        harness.update(state)
        /* after harness.update(), which rewrites main's transform every frame. Sphere and
           contour only — the group carries the label spinner and the clamp's squeeze. */
        const open = easeOut(state.open ?? 1)
        const openScale = Math.max(0.0001, open) // never exactly 0: a zero matrix is non-invertible
        mainSphere.scale.setScalar(openScale)
        mainContour.scale.setScalar(openScale)
        mainSphere.visible = open > 0.02
        mainContour.visible = open > 0.02
        mainSpinner.visible = open > 0.99
        field.update(dt, {
          mass: open, // the well deepens as main opens
          time: t,
          lift: 1 - tip, // ridge height fades as the camera tips (see field-3d.js)
          // the sheet never rises above the ring's underside inside the harness footprint
          underHarness: { r: harness.dims.rOut * 1.06, y: seatY - harness.dims.k * 4.5 }
        })
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
    /* a build that throws must never surface as an unhandled rejection, nor leave the
       page scroll-locked behind a hero that will never finish building */
    building.catch(() => {
      if (scrollHost) scrollHost.classList.remove('overflow-hidden')
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
    /* a half-applied theme (a preview frame mid-swap) keeps the current palette; the
       observer fires again once the rest of the tokens land */
    const next = readPalette(hero)
    if (!next) return
    ;({ bg, ink, sand, card, fabricInk, fabricAlpha } = next)
    scene.background = new THREE.Color(bg)
    renderer.setClearColor(bg, 1)
    if (!live) return
    live.harness.retheme()
    live.field.retheme({ ink: fabricInk, surface: bg, opacity: fabricAlpha })
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
