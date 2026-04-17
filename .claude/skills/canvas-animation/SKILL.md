---
name: canvas-animation
description: Rules and patterns for the AIACanvas particle system — AIACanvas, AIASphere, AIARing components in @atta/ui/canvas
---

# Canvas Animation — Atta AI

## Architecture

```
AIACanvas (context provider + rAF renderer + single <canvas>)
├── AIASphere (DOM position registration via useAIASphere hook)
├── AIAAgent (convenience wrapper around AIASphere — resolves color + face from agent name)
├── AIARing (SVG wave segments + canvas ring styles)
└── Canvas renders: particles, matrix drops, glow, directed messages

bg/fabric.ts — standalone Tron particle background (grid mesh + particles)
```

- **AIACanvas** wraps children, provides context, owns the animation loop
- **AIASphere** registers its DOM position with the canvas. Particles orbit it. Matrix rain falls inside it. Pure presentation — all hooks in `useAIASphere.ts`
- **AIAAgent** wraps `AIASphere` and resolves agent `color` and face illustration from the agent name. **Always prefer `AIAAgent` over `AIASphere` for named agents.**
- **AIARing** positions spheres in a circle, renders animated SVG wave segments
- **fabric.ts** renders a displaced grid mesh background with Tron-style particles that travel along grid edges toward agent spheres, with birth animations and collision effects

## Critical Rules — MUST follow every time

### 1. Every AIASphere MUST pass an explicit visible `color`

Theme `--accent` and `--secondary` resolve to near-black `oklch(0.2178 0 none)`. Without explicit color, particles and matrix are invisible.

```tsx
// ✗ BAD — invisible on dark background
<AIASphere id="s1" size="lg" state="speaking" showMatrix />

// ✓ GOOD — explicit agent color
<AIASphere id="s1" size="lg" color="hsl(119 21% 45%)" state="speaking" showMatrix />

// ✓ GOOD — visible CSS variable
<AIASphere id="s1" size="lg" color="var(--primary)" state="speaking" showMatrix />
```

Visible variables: `--primary` (white), `--foreground` (white), `--muted-foreground` (gray).
Invisible variables: `--accent`, `--secondary` (both near-black).

### 2. Every AIASphere MUST have a unique `id`

Duplicate IDs cause particles to migrate to the last-registered position.

```tsx
// ✗ BAD — same ID in different rounds
<AIASphere id={`agent-${role}`} />

// ✓ GOOD — unique per instance
const sphereId = useId()
<AIASphere id={sphereId} />
```

### 3. Never use AIASphere for decorative dots

Small AIASpheres register with canvas and steal particles from visible spheres.

```tsx
// ✗ BAD — steals particle budget
<AIASphere size={14} color={c} state="idle" particleCount={0} />

// ✓ GOOD — plain CSS dot
<div className="size-3 rounded-full" style={{ background: c }} />
```

### 4. Particle budget math

```
particles per sphere = particleCount × (1 - ambientRatio) ÷ sphereCount
```

Need ≥25 per sphere for visible clusters. Example: `particleCount={400}`, `ambientRatio={0.5}`, 8 spheres = 25 each ✓.

### 5. Scrolling pages MUST use `matchContentHeight`

Without it, canvas is viewport-sized. Spheres below the fold render at positions outside the canvas.

```tsx
// Scrolling feed — canvas covers all content
<AIACanvas matchContentHeight ... />

// Fixed single screen — omit (viewport-sized)
<AIACanvas ... />
```

### 6. Use `alwaysRenderSpheres` for immediate matrix

Without it, matrix only renders after wander→forming→settled transition.

### 7. No hardcoded colors anywhere — route through `shared/color-math.ts`

Use CSS variables or HSL strings from `AGENT_THEME`. Never hex codes, never inline `rgba(255,255,255,…)`, never inline `getComputedStyle(...)` inside a renderer.

Every color operation in a renderer routes through the shared helpers:
- `withAlpha(color, α)` — attach alpha to any hex/hsl/rgb input (handles format conversion)
- `brightenForLight(color)` — theme-aware saturation boost for agent palettes in light mode
- `fgAt(α)` — theme-ink color from `--foreground` with alpha
- `bloomStops(color, opts)` — `[core, outer]` tuple for radial glow gradients (see Rule #11)

```ts
// ✗ BAD
grad.addColorStop(0, isLight ? 'rgba(255,255,255,0.9)' : '#fff')

// ✓ GOOD
const [core] = bloomStops(agentColor, { intensity: 0.9 })
grad.addColorStop(0, core)
```

### 8. Alpha fills on light bg collapse into grey mud — use `bloomStops`

**THE GOTCHA that drove the paint-primitives refactor.** Alpha fills ADD light on a dark bg (reads as a bloom) but SUBTRACT light on a light bg (reads as grey mud). The same gradient that glows on dark looks like a dirty disc on light.

**The rule:** on light bg, never use the same full-alpha color for both the core and outer stop of a radial glow. Stepped alpha — core @α=1 → outer @α=0.25 → transparent — fades fast enough to dodge mud.

`shared/paint.ts` provides `bloomStops(agentColor, { intensity?, lightOuterAlpha? })` that returns a `[core, outer]` tuple implementing the rule. Every radial glow in the canvas (particle head, cluster glow, birth glow) routes through it. **New radial renderers MUST use it.**

```ts
// ✗ BAD (produces grey mud in light mode)
grad.addColorStop(0, agentColor)
grad.addColorStop(0.3, agentColor)    // same full-alpha = solid disc
grad.addColorStop(1, 'transparent')

// ✓ GOOD
const [core, outer] = bloomStops(agentColor)
grad.addColorStop(0, core)
grad.addColorStop(0.3, outer)         // stepped α=0.25 on light, full on dark
grad.addColorStop(1, 'transparent')
```

Diagnostic: if a colored particle reads as a grey disc on light bg, check the outer gradient stop — it's almost always a missing stepped-alpha.

### 9. Hooks in `useAIASphere.ts`, never in `aia-sphere.tsx`

`AIASphere` is pure presentation. All position tracking, scroll handling, state sync lives in the hook.

### 10. Position tracking is rAF-based

`useAIASphere` runs `requestAnimationFrame` with `getBoundingClientRect()` every frame. Only updates when position changes >0.5px. Works in all scroll contexts. Do NOT add scroll/resize listeners.

### 11. Particles use direct positioning

`updateClusterOrbit` sets `p.x = target.x + offset` every frame. No lerp. Sphere moves → particles move instantly. Jitter value `0.3` controls calmness.

### 12. Visually verify canvas refactors before declaring done

Canvas rendering has no unit tests — typechecks pass on grey mud. When extracting or consolidating visual code into shared primitives:

1. **Diff line-by-line** against the working source. "Same color" is not the same as "same alpha" — a primitive that collapses the distinction will silently regress all call sites at once (single source of truth ⇒ single source of regression).
2. **Restart the Vada dev server** (shared package, no hot reload) and load the home page in BOTH light and dark modes before committing. Toggle between them.
3. **Check each particle type**: initial origin converge, approach particles, directed messages, sphere-arrival glow. One primitive powering all of them means one missed alpha can break every scenario.

This rule exists because exactly this happened during the paint-primitives refactor (commits `5ba108d..4872649`): the extraction silently flattened a stepped-alpha gradient, typecheck was green, subagent reports all said "DONE", and every particle in light mode rendered as grey mud. Fix was `ce54784`.

## Theme Colors (Vāda Dark)

| Variable | Value | Visible? |
|----------|-------|----------|
| `--primary` | `oklch(1 0 none)` | ✓ white |
| `--foreground` | `oklch(1 0 none)` | ✓ white |
| `--muted-foreground` | `oklch(0.6268 0 none)` | ✓ gray |
| `--secondary` | `oklch(0.2178 0 none)` | ✗ near-black |
| `--accent` | `oklch(0.2178 0 none)` | ✗ near-black |

## Agent Colors (always visible on dark)

| Agent | Color |
|-------|-------|
| Strategist | `hsl(119 21% 45%)` green |
| Critic | `hsl(0 49% 57%)` red |
| Devil's Advocate | `hsl(278 35% 63%)` purple |
| Synthesizer | `hsl(43 52% 54%)` gold |
| Researcher | `hsl(207 32% 52%)` blue |
| Operator | `hsl(30 32% 52%)` amber |

## AIAAgent

Convenience wrapper around `AIASphere` — resolves agent `color` and face illustration from the canonical agent name. Use this instead of `AIASphere` when working with named agents.

```tsx
import { AIAAgent } from '@atta/ui/canvas'

<AIAAgent
  name="Strategist"          // AgentName — determines color + face
  faceStyle="emblematic"     // 'reductive' (gestural) | 'emblematic' (portrait + sigil). Default: emblematic
  size="lg"
  state="speaking"
  showMatrix
  id={sphereId}              // Still needs unique id for particle tracking
/>
```

**`faceStyle` options:**
- `'emblematic'` — symbolic portrait with forehead sigil (default)
- `'reductive'` — gestural floating features (minimal)

All other props pass through to `AIASphere`.

---

## Sphere Absorb — rAF → DOM without re-renders

`onSphereAbsorb` is called from the canvas rAF loop (60fps). **Never wire it to React state** — state updates from rAF cause React re-renders every frame which visibly glitches sphere DOM elements.

The correct pattern: **ref-based direct DOM classList toggle**.

```ts
// useSphereAbsorb.ts — lives in the app, NOT in the package
export function useSphereAbsorb() {
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map())

  const registerSphere = useCallback((id: string, el: HTMLElement | null) => {
    if (el) elementsRef.current.set(id, el)
    else elementsRef.current.delete(id)
  }, [])

  const onSphereAbsorb = useCallback((sphereId: string) => {
    const el = elementsRef.current.get(sphereId)
    if (!el) return
    el.classList.add('sphere-absorbing')
    setTimeout(() => el.classList.remove('sphere-absorbing'), 1100) // matches CSS keyframe
  }, [])

  return { registerSphere, onSphereAbsorb }
}
```

```tsx
// HomeCanvas.tsx — outer component
const { onSphereAbsorb, registerSphere } = useSphereAbsorb()

<AIACanvas onSphereAbsorb={onSphereAbsorb} ...>
  <HomeCanvasInner registerSphere={registerSphere} />
</AIACanvas>

// In the sphere wrapper div — ref callback, no className toggle
<div ref={(el) => registerSphere(id, el)} style={...}>
```

CSS keyframe lives in `packages/ui/styles/canvas.css` (import `@atta/ui/canvas.css` — products that don't use canvas don't import it):

```css
@keyframes sphere-absorb {
  0%   { filter: brightness(1)   scale(1); }
  15%  { filter: brightness(2.2) scale(1.1); }
  50%  { filter: brightness(1.4) scale(1.04); }
  100% { filter: brightness(1)   scale(1); }
}
.sphere-absorbing { animation: sphere-absorb 1.1s ease-out forwards; }
```

---

## Fabric ripple on particle join

When a particle joins a sphere, push a high-amplitude radial ripple for a **local** mesh distortion:

```ts
ripples.push({ cx: sphere.x, cy: sphere.y, startT: t, life: 1, amp: 55, mode: 'radial' })
```

- `amp: 55` = clearly visible mesh shift (~55px at wave front)
- `mode: 'radial'` = expands outward from the sphere position (not tangentially from ring center)
- Gaussian envelope keeps distortion local (~90px wide ring); life decays to ~0.1 by the time it reaches the ring center
- **Do NOT use `ClosingPulse` for particle joins** — it renders full-screen expanding glow rings identical to the ring-close event, confusing users. `ClosingPulse` is ring-close only.

---

## `withAlpha` and friends — color helpers in `shared/color-math.ts`

All color format conversion lives in `packages/ui/canvas/shared/color-math.ts`. Import from there, never roll your own.

- `withAlpha(color, α)` → attaches alpha. Handles `hsl(h s% l%)` / `hsla(...)`, `#rgb` / `#rrggbb`, and `rgb(r,g,b)` / `rgba(...)`. Falls back to white if unparseable.
- `parseColor(color)` → `{h, s, l}` in any of the above formats. Use when you need the HSL channels.
- `brightenForLight(color)` → theme-aware saturation boost (applies only in light mode; dark-mode passthrough). Low-chroma agent colors like Strategist green `hsl(119 21% 45%)` become punchy enough to pop on a light bg; high-chroma colors already pop and round up within the clamped range.
- `fgAt(α)` → reads `--foreground` and returns an oklch string with alpha. For theme-aware "ink" strokes (grid lines, halo overlays).

Agent colors arrive as either hex `#rrggbb` (Chrome normalizes custom properties) or `hsl(...)` (direct from `--agent-*` tokens). All helpers above accept both transparently.

---

## Fabric Background (Tron Particles)

`bg/fabric.ts` is a standalone background renderer — it does NOT use `AIACanvas`. It renders directly onto a canvas element via `drawFabric(state)`.

```tsx
import { drawFabric } from '@atta/ui/canvas/bg'
// Used in HomeCanvas and settings pages as a background layer
```

**What it renders:**
1. A displaced grid mesh (two-density layers: coarse + fine) with ripple effects on sphere joins
2. **Tron particles** — spawn from the grid border, travel along displaced grid edges toward a target agent sphere, then detach for a straight-line final approach and join with a collision glow
3. **Birth animations** — before a particle spawns, the origin cell illuminates with matrix characters and energy tendrils
4. **Closing pulses** — radial ripple effect when a particle joins a sphere

**Key behaviors:**
- Colors always sampled from active sphere colors — never hardcoded
- Particles home toward a specific sphere (`targetSphereId`)
- `didTurn` flag enforces alternating turn/straight movement (no double turns)
- `finalApproach` phase: particle detaches from grid and flies straight to sphere center
- `dying` state: particle stops moving and fades out (trail erosion)
- Ring exclusion zone: particles avoid the AIARing area (accounts for fabric displacement)
- Settle gate: particles don't spawn until the canvas has settled

**State shape passed to `drawFabric`:**
```ts
{
  spheres: Array<{ id: string; x: number; y: number; color: string; radius: number }>
  ringCenter?: { x: number; y: number; radius: number }
  settled: boolean
  t: number  // frame counter
}
```

---

## Canvas Context — Additional Methods

Beyond the standard `registerSphere` / `fireDirectedMessage`, the context also exposes:

```tsx
ctx.startGravity()        // Trigger gravity pull after animation completes — spheres drift inward
ctx.fireSphereOrigin(id)  // Trigger origin birth animation — 5 Tron births converge on sphere
```

---

## Sphere Origin Birth Animation

Before a sphere is revealed, `ctx.fireSphereOrigin(sphereId)` spawns 5 intense Tron births spread across the **screen center** (not the sphere position). After their emergence animation, each particle flies directly to the sphere center. All 5 arrive simultaneously — the sphere only appears via the `onOriginComplete` callback.

**Why screen center, not sphere position:** Sphere `s1` sits at the top of the ring (~300px above screen center). Spreading from the sphere position would cluster all births near the top edge and many would fall off-screen. Spreading from screen center fills the visible area.

**Synchronized arrival:** Each particle skips grid traversal and enters `finalApproach` immediately. Speed is calibrated as `dist / (gridStep × 3 × 90_frames)` — further births move faster, closer births slower — so all arrive after exactly 90 frames regardless of distance.

**Wiring pattern** — three layers to bridge canvas → React state:

```tsx
// HomeCanvas.tsx (outer — where AIACanvas lives)
export function HomeCanvas({ render }: HomeCanvasProps) {
  const { onSphereAbsorb, registerSphere } = useSphereAbsorb()
  const onOriginCompleteRef = useRef<(() => void) | null>(null)

  return (
    <AIACanvas
      onSphereAbsorb={onSphereAbsorb}
      onOriginComplete={() => onOriginCompleteRef.current?.()}
      ...
    >
      <HomeCanvasInner registerSphere={registerSphere} onOriginCompleteRef={onOriginCompleteRef} />
    </AIACanvas>
  )
}

// useHomeCanvas.ts (inner — where revealedCount state lives)
export function useHomeCanvas(onOriginCompleteRef: React.MutableRefObject<(() => void) | null>) {
  const runSimulation = async () => {
    ctx.fireSphereOrigin('s1')

    // Await arrival of all 5 particles — no fixed timeout
    await new Promise<void>((resolve) => {
      onOriginCompleteRef.current = resolve
      setTimeout(resolve, 4000) // safety fallback
    })
    onOriginCompleteRef.current = null

    setRevealedCount(1) // sphere appears exactly when last particle arrives
  }
}
```

**Why the ref bridge:** `onOriginComplete` fires from the canvas (lives in outer `HomeCanvas`), but `setRevealedCount` lives in inner `useHomeCanvas`. A `MutableRefObject` bridges them without prop drilling or context re-renders.

**Key constraint — do NOT call `setRevealedCount` before `onOriginComplete`** — the sphere will appear before particles arrive.

---

## AIACanvas Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `particleCount` | `number` | `200` | Total particles |
| `ambientRatio` | `number` | `0` | 0–1, fraction that wander freely |
| `wanderDuration` | `number` | `120` | Frames before clustering starts |
| `alwaysRenderSpheres` | `boolean` | `false` | Matrix during wander phase |
| `matchContentHeight` | `boolean` | `false` | Canvas = scrollHeight for scrolling pages |
| `onPhaseChange` | `fn` | — | wander → forming → settled |
| `onSphereAbsorb` | `fn` | — | Fires when a Tron particle joins a sphere. Receives `sphereId`. |
| `onOriginComplete` | `fn` | — | Fires once when **all** origin particles have arrived. Use to gate sphere reveal. |
| `autoTriggerGravity` | `boolean` | `true` | Set false to manually call `ctx.startGravity()` |
| `paused` | `boolean` | `false` | Cancel the main rAF loop without losing particle state. Flip to `true` to halt; flip back to `false` to resume from the same positions. See *Pause on scroll away* below. |

## AIASphere Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `id` | `string` | `useId()` | MUST be unique |
| `size` | `preset\|number` | `'md'` | xs=32 sm=48 md=64 lg=96 xl=128 |
| `color` | `string` | — | MUST be visible. No default is safe |
| `state` | `idle\|speaking\|complete` | `'idle'` | Controls matrix intensity |
| `showMatrix` | `boolean` | `true` | Enable matrix rain |
| `particleCount` | `number` | size-based | Particles requested |
| `matrixColors` | `string[]` | `[color]` | Multicolor matrix rain |
| `matrixOpacity` | `number` | `1` | Brightness 0–1 |
| `solidBg` | `boolean` | `false` | Canvas draws dark bg circle behind sphere |
| `bgOpacity` | `number` | `0.5` | Opacity of canvas bg fill |
| `visible` | `boolean` | `true` | When false: particles orbit silently, don't render |
| `label` | `string` | — | Text near sphere |
| `labelPosition` | `string` | `'bottom'` | top/right/bottom/left + corners |

**`solidBg` + `visible` pattern** — use together for progressive reveal: `visible={revealed}` hides particles, `solidBg={revealed}` gates the canvas bg fill. Particles orbit at all times (stable cluster positions) but only render when `visible=true`, fading in smoothly on reveal.

## AIARing Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `size` | `number` | `600` | Ring diameter px |
| `orbit` | `ReactNode[]` | — | Sphere elements |
| `activeStep` | `number` | `0` | Revealed wave segments |
| `thinking` | `boolean` | `false` | Ring matrix rain |
| `sphereRadius` | `number` | `50` | SVG wave clip radius |
| `matrixOpacity` | `number` | `1` | Ring matrix brightness |
| `solidBg` | `boolean` | `false` | DOM div fills ring interior with bgColor |
| `bgColor` | `string` | `var(--background)` | Color for solidBg DOM fill |
| `bgOpacity` | `number` | `0.5` | Opacity of canvas bg fill (fades in when ring closes) |

## Canvas positioning: MUST be `fixed inset-0`

Particle, sphere-glow, matrix, and message drawing all use `sphere.x, sphere.y` directly as canvas coordinates — but those values come from `getBoundingClientRect()` on the sphere DOM element, which returns **viewport-relative** coordinates. The canvas does not translate them into canvas-local space.

**Consequence:** the canvas element's own top-left MUST coincide with viewport (0, 0) for the math to line up. That's why the canonical pattern is `className='fixed inset-0 z-0 bg-background'` on every consumer.

Putting the canvas inside a scrolled parent (`absolute inset-0` inside a `relative h-dvh` section, for example) breaks the mapping: as the user scrolls, the canvas's own viewport-top moves, but sphere registrations still report viewport coords — so particles end up drawn at a constant offset. The visible artifact is particles appearing to originate from the top of the screen instead of centered on the ring.

If you need the canvas to occupy "one viewport" in document flow (e.g. a home hero followed by other sections), use the placeholder + fixed-canvas pattern in the next section.

## Pause on scroll away

To pause the canvas when the hero leaves the viewport while keeping the canvas itself `fixed`, use a bare placeholder section for scroll space and drive `paused` from `IntersectionObserver`.

```tsx
function useIsInView(ref: React.RefObject<HTMLElement | null>) {
  const [isInView, setIsInView] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { for (const entry of entries) setIsInView(entry.isIntersecting) },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return isInView
}

export function HeroCanvas({ children }) {
  const heroRef = useRef<HTMLElement>(null)
  const isInView = useIsInView(heroRef)
  return (
    <>
      <section ref={heroRef} id='hero' className='relative h-dvh w-full' />
      <div className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-out ${isInView ? 'opacity-100' : 'opacity-0'}`}>
        <AIACanvas paused={!isInView} className='h-full w-full' ...>
          {children}
        </AIACanvas>
      </div>
    </>
  )
}
```

Two things to keep in mind with this pattern:

- **`pointer-events-none` on the fixed wrapper is mandatory.** Otherwise the canvas div captures wheel/touch events over the viewport and scroll below the hero stops working. Opt buttons back in with `pointer-events-auto` on the container that holds them.
- **Subsequent sections need `relative z-10`** so they render above the fixed canvas when scrolled to. A single wrapper around all sections is enough.

Partial-pause scope: only the main `animate()` loop is cancelled. The ring's own wave rAF in `aia-ring.tsx` and `useAIASphere`'s position-tracking loops keep running. This is a deliberate trade-off for a one-file pause implementation — ~80% of the CPU savings; ring phase may drift by a tiny amount across a long pause, not visually perceptible.

## Page Configurations

### Home Page (fixed, single screen)
```tsx
<AIACanvas particleCount={300} ambientRatio={0.35} alwaysRenderSpheres
  className="fixed inset-0 z-0 bg-background">
  <AIARing orbit={spheres.map((id, i) => (
    <AIASphere key={id} id={id} size="lg" color={SPHERE_COLORS[i]}
      state={getState(id, i)} showMatrix matrixColors={ALL_COLORS} />
  ))} />
</AIACanvas>
```

### Deliberation Feed (scrolling)
```tsx
<AIACanvas particleCount={400} ambientRatio={0.5} wanderDuration={30}
  alwaysRenderSpheres matchContentHeight
  className="fixed inset-0 z-0 bg-background">
  {/* AgentCard uses useId() for sphere ID */}
</AIACanvas>
```

## Debugging

| Symptom | Cause | Fix |
|---------|-------|-----|
| No particles | `color` is near-black | Pass visible color |
| Particles on wrong sphere | Duplicate `id` | Use `useId()` |
| Particles below viewport | No `matchContentHeight` | Add prop to AIACanvas |
| No matrix rain | `state='idle'` or no `alwaysRenderSpheres` | Set state + prop |
| Matrix invisible | `color` near-black | Pass visible color |
| Particles visible before sphere reveals | `visible` not set to `false` | Pass `visible={revealed}` |
| Too few particles per sphere | Decorative AIASpheres stealing budget | Replace with plain divs |
| Particles vibrate | Jitter too high | Reduce `0.3` in `updateClusterOrbit` |
| Sudden sphere shrink | Different orbit radius in wander vs settled | Use same radius |

## File Map

```
packages/ui/canvas/
├── aia-canvas/            — Canvas orchestrator (modular)
│   ├── index.tsx          — AIACanvas component (pure JSX shell)
│   ├── use-aia-canvas.ts  — All React hooks: state, rAF loop, context callbacks
│   ├── bg-fills.ts        — Ring + sphere background fill rendering
│   ├── matrix-rain.ts     — Matrix rain for spheres and rings
│   ├── message-system.ts  — Directed message particle rendering
│   ├── particle-system.ts — Particle creation, orbit, rendering
│   ├── phase-machine.ts   — wander → forming → settled state machine
│   ├── ring-envoy.ts      — Ring envoy animation (segment reveal progress)
│   └── types.ts           — Internal canvas types
├── aia-context.tsx        — React context, SphereRegistration, RingRegistration types
├── aia-sphere.tsx         — Presentational sphere (no hooks)
├── aia-agent.tsx          — AIAAgent: AIASphere wrapper with agent color + face resolution
├── agent-faces-minimal.tsx — 'reductive' face SVG illustrations
├── agent-faces-full.tsx   — 'emblematic' face SVG illustrations
├── useAIASphere.ts        — Sphere hooks (rAF position tracking, registration)
├── aia-ring.tsx           — Ring layout + SVG wave segments (agent colors)
├── bg/
│   ├── fabric.ts          — Tron particle background: grid mesh + particles + birth animations
│   ├── types.ts           — BgState type
│   └── index.ts           — Public exports
├── shared/                — Shared canvas utilities
│   ├── colors.ts          — CSS variable resolution (resolveColor, getThemeColors)
│   ├── color-math.ts      — Format conversion (parseColor, withAlpha, brightenForLight, fgAt, rgbToHsl)
│   ├── theme.ts           — Cached light/dark detection (refreshThemeCache, isLightTheme)
│   ├── paint.ts           — Particle paint primitives (paintParticleHead, paintClusterGlow, bloomStops)
│   ├── constants.ts       — MATRIX_CHARS and tuning constants
│   └── math.ts            — Trig / numeric helpers
└── assistant-wave.tsx     — Standalone SVG wave
```

## After Editing Package Files

Shared package changes require restart:
```bash
# Kill dev server, then:
bun run dev:vada
```
Hot reload does NOT work for `packages/ui/canvas/` changes.

## Known Issues

- **Ring matrix top gap (~15px):** Circular clip makes characters invisible at the very top where circle width → 0. Geometry constraint. Would need non-circular approach.
- **Canvas resize lag:** Content height check in `animate()` occasionally lags one frame behind rapid expand/collapse.
