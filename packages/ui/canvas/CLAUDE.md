# AIA Canvas System — Developer Reference

This is the canvas animation system for Atta AI products. It renders ambient particle fields, clustered agent spheres, directed message particles, matrix rain, and animated ring waves — all coordinated through a shared React context.

---

## Architecture Overview

```
AIACanvas  (context provider + canvas renderer)
├── AIARing  (SVG ring with animated waves, registers with canvas context)
│   └── orbit=[AIASphere, ...]  (DOM spheres positioned on ring circumference)
└── Any other children  (rendered above canvas, below ring z-index)
```

**Three layers, all coexisting:**

| Layer | What | z-index |
|-------|------|---------|
| `<canvas>` | Particles, matrix rain, message particles, glow | `z-0` |
| `<svg>` inside AIARing | Animated wave paths | `z-10` |
| DOM content / spheres | AIASphere elements, center text | `z-20` / `z-30` |

The canvas is always behind. The SVG ring is above the canvas. DOM content is above both.

---

## Shared Modules (`shared/`)

Four focused modules. Use them instead of rolling inline color math or hardcoded whites in any renderer.

| Module | Responsibility | Key exports |
|---|---|---|
| `colors.ts` | **CSS variable layer** — reads `var(--*)` values from the DOM | `resolveColor(colorOrVar, fallback)`, `getThemeColors()` |
| `color-math.ts` | **Canvas color math** — format conversion + theme-aware tweaks, pure | `parseColor`, `withAlpha(color, α)`, `brightenForLight(color)`, `fgAt(α)`, `rgbToHsl`, `Hsl` |
| `theme.ts` | **Theme cache** — cached once per frame from `html[data-theme]` | `refreshThemeCache()`, `isLightTheme()` |
| `paint.ts` | **Particle paint primitives** — "glowing particle" visual language | `paintParticleHead`, `paintClusterGlow`, `bloomStops` |

**colors.ts vs color-math.ts — why two files:** `colors.ts` bridges the CSS var world (var lookups, fallbacks). `color-math.ts` operates on already-resolved color strings (hex / hsl / rgb) — no DOM reads. They compose: `withAlpha(resolveColor('var(--primary)'), 0.8)`.

**theme cache lifecycle:** `refreshThemeCache()` runs exactly once per rAF frame inside `use-aia-canvas.ts → animate()`. Every downstream renderer (fabric.ts, message-system.ts, paint.ts primitives) reads `isLightTheme()` without hitting the DOM. This is what lets the color-scheme toggle take effect within one frame without per-renderer theme watchers.

### `paint.ts` — the visual language

Every "glowing particle" (Tron approach, sphere origin, directed message, sphere arrival glow) routes through one of two primitives — and both obey **the light/dark rule**.

**THE LIGHT/DARK RULE:** alpha fills ADD light on dark bg (reads as bloom) but SUBTRACT light on light bg (reads as grey mud). Dark mode uses a bright white core + full-alpha agent outer. Light mode uses stepped alpha: agent@α=1 core → SAME HUE @α=0.25 outer → transparent. Never use the same full-alpha stop for both core and outer on light bg.

The `bloomStops(agentColor, { intensity, lightOuterAlpha })` helper encodes this rule as a reusable `[coreColor, outerColor]` tuple. **New radial-glow renderers MUST route through it.**

```ts
import { bloomStops, paintParticleHead } from '@atta/ui/canvas/shared/paint'

// Ready-made particle head:
paintParticleHead(ctx, x, y, agentColor, { opacity: p.opacity })

// Custom gradient that still follows the rule:
const [core, outer] = bloomStops(color, { intensity: 0.9 })
grad.addColorStop(0, core)
grad.addColorStop(0.3, outer)
grad.addColorStop(1, 'transparent')
```

**Canonical bug (fixed `ce54784`):** paintParticleHead's outer stop was accidentally set to the same full-alpha color as the core, collapsing the stepped-alpha fade. Result: grey halos around colored particles in light mode. If you see grey mud, suspect an outer stop without the 0.25 step.

---

## Critical Constraints — read before touching ANY canvas code

### Color Visibility

The Vāda dark theme is monochrome. Most CSS variables are near-black and invisible on dark backgrounds:

| Variable | Value | Visible? |
|----------|-------|----------|
| `--primary` | `oklch(1 0 none)` | ✓ white |
| `--foreground` | `oklch(1 0 none)` | ✓ white |
| `--muted-foreground` | `oklch(0.6268 0 none)` | ✓ gray |
| `--secondary` | `oklch(0.2178 0 none)` | ✗ near-black |
| `--accent` | `oklch(0.2178 0 none)` | ✗ near-black |

**Every AIASphere MUST pass an explicit visible `color` prop.** Without it, the default resolves to `--accent` which is near-black. Particles, matrix rain, and labels become invisible.

`getThemeColors()` in aia-canvas.tsx only returns visible colors: `[primary, muted, foreground]`. Ambient particles pick randomly from these three.

### Agent Colors (always visible on dark backgrounds)

```
Strategist:       hsl(119 21% 45%)  — green
Critic:           hsl(0 49% 57%)    — red
Devil's Advocate: hsl(278 35% 63%)  — purple
Synthesizer:      hsl(43 52% 54%)   — gold
Researcher:       hsl(207 32% 52%)  — blue
Operator:         hsl(30 32% 52%)   — amber
```

All color in the system comes from these agent-specific HSL values, defined in `AGENT_THEME`.

### Unique Sphere IDs

**Every AIASphere MUST have a unique `id`.** If two spheres share an ID, the second overwrites the first in the canvas Map. Particles migrate to the last-registered position.

Use `useId()` for dynamic lists. Never derive IDs from role names alone — two Strategist cards in different expanded rounds will collide.

### Particle Budget

```
particles per sphere = particleCount × (1 - ambientRatio) ÷ sphereCount
```

Need ≥25 per sphere for visible clusters. **Never use AIASphere for decorative dots** — small AIASpheres (≤20px) register with the canvas and steal particles from visible spheres. Use plain `<div>` elements for indicators.

### Scrolling vs Fixed Contexts

| Context | `matchContentHeight` | Why |
|---------|---------------------|-----|
| Deliberation feed (scrolling) | `true` | Canvas must cover all content; spheres below viewport need to be within canvas bounds |
| Home page (fixed single screen) | `false` (default) | Viewport-sized canvas is correct |

Without `matchContentHeight`, the canvas is viewport-sized. Spheres at `y=1899` on a `1377px` canvas render particles outside the canvas — invisible.

---

## Component API

### `AIACanvas`

The root. Provides context, owns the canvas element, runs the rAF loop.

```tsx
<AIACanvas
  particleCount={300}           // Total particles. Default 200.
  ambientRatio={0.35}           // Fraction that wander forever (0.0–1.0). Default 0.
  wanderDuration={120}          // Frames before auto-forming (~2s at 60fps). Default 120.
  alwaysRenderSpheres={false}   // Show sphere glow/matrix during wander phase too.
  matchContentHeight={false}    // Canvas height = scrollHeight for scrolling pages.
  onPhaseChange={(phase) => {}} // 'wander' | 'forming' | 'settled'
  paused={false}                // Cancel the main rAF loop without losing particle state. See "Pausing" below.
  className='fixed inset-0 z-0 bg-background'
  ref={canvasRef}               // AIACanvasRef — exposes forceSettle()
>
  {children}
</AIACanvas>
```

**`ambientRatio`** is the key for background atmosphere. `0.35` = 35% of particles float freely forever, never cluster into spheres. The rest converge into the spheres on forming.

**`particleCount`** should be bumped when using `ambientRatio` — e.g. 400 particles with `ambientRatio=0.5` gives 200 ambient floaters + 200 sphere-bound.

**`matchContentHeight`** makes the canvas grow with content. The `animate()` loop checks content height every frame and calls `resize()` when it changes by >10px. Required for scrolling pages like the deliberation feed.

**`alwaysRenderSpheres`** renders matrix rain and glow during the wander phase. Without it, matrix only appears after the wander→forming→settled transition. Use this when spheres should show effects immediately.

**Imperative ref:**
```tsx
const canvasRef = useRef<AIACanvasRef>(null)
canvasRef.current?.forceSettle()  // Skip wander phase, start clustering immediately
```

**Pausing — `paused` prop.** Toggling `paused` cancels (or re-kicks) the main `animate()` rAF loop. Particle positions, sphere registrations, and phase are all preserved — resume continues from the same state. Only the main canvas loop is affected; the ring's wave rAF and the sphere position-tracking loops keep running (deliberate trade-off, ~80% CPU savings in one file). Typical use: wrap the canvas in a placeholder `<section h-dvh>` + `IntersectionObserver` so the canvas stops when scrolled out of view. See `.claude/skills/canvas-animation/SKILL.md` for the full pattern including `pointer-events-none` on the fixed wrapper so scroll passes through to the page.

> **Canvas MUST be `fixed inset-0`.** Particle/sphere/matrix drawing uses sphere viewport coords (from `getBoundingClientRect`) directly as canvas-local coords. Putting the canvas inside a scrolled parent breaks the mapping and particles end up drawn at a constant offset from their spheres — most visibly as "pulses from the top of the screen" when the scrolled parent comes back into view. Use the placeholder + `fixed` pattern instead.

### Page configurations:

```tsx
// Home page — fixed, single screen
<AIACanvas particleCount={300} ambientRatio={0.35} alwaysRenderSpheres
  className="fixed inset-0 z-0 bg-background">

// Deliberation feed — scrolling
<AIACanvas particleCount={400} ambientRatio={0.5} wanderDuration={30}
  alwaysRenderSpheres matchContentHeight
  className="fixed inset-0 z-0 bg-background">
```

---

### `AIASphere`

A DOM element that registers its position with the canvas. The canvas uses the position to cluster particles and render matrix rain. **Pure presentation — all hooks live in `useAIASphere.ts`.**

```tsx
<AIASphere
  id='agent-1'               // Stable unique ID — use useId() for dynamic lists
  state='idle'               // 'idle' | 'speaking' | 'complete'
  size='lg'                  // 'xs'|'sm'|'md'|'lg'|'xl' or number (px diameter)
  color='hsl(119 21% 45%)'   // MUST be visible — particle/matrix/label color
  showMatrix={true}          // Show matrix rain inside this sphere
  matrixColors={['hsl(119 21% 45%)', 'hsl(0 49% 57%)']}  // Multicolor matrix rain
  matrixOpacity={1}          // Matrix brightness multiplier (0–1)
  particleCount={30}         // Particles requested for this sphere
  solidBg={true}             // Canvas draws a dark bg circle behind this sphere (default false)
  bgOpacity={0.5}            // Opacity of the canvas bg fill (0–1, default 0.5)
  visible={true}             // When false: particles orbit silently but don't render (default true)
  label='Strategist'         // Optional label text
  labelPosition='bottom'     // 'top'|'bottom'|'left'|'right'|'top-right' etc.
  onClick={() => {}}         // Makes it a <button>
  className=''
>
  {/* Optional content rendered inside the sphere, clipped to circle */}
</AIASphere>
```

**State effects:**
- `idle` → muted label, no glow, no matrix
- `speaking` → colored label, matrix rain at 0.8 spawn rate (if `showMatrix=true`)
- `complete` → matrix rain at 0.4 spawn rate

**`matrixColors`** accepts a `string[]`. Each matrix drop picks a random color from the array. If not provided, defaults to `[color]`. Use this for multicolor rain — e.g. pass all agent colors for a sphere that represents collective thinking.

**`matrixOpacity`** multiplies the final alpha of all matrix drops. Default 1. Set lower for subtle background effect.

**Registration lifecycle:** Sphere registers on mount via `useAIASphere` rAF loop, unregisters on unmount. Changing `state` or `showMatrix` uses `updateSphere` (Map.set on existing key — does NOT change cluster assignments). Never unmount and remount spheres just to update state — it shifts cluster assignments and the ring appears to rotate.

**Position tracking:** `useAIASphere` runs a `requestAnimationFrame` loop that calls `getBoundingClientRect()` every frame and only updates the canvas when position changes (>0.5px threshold). This works in all scroll contexts — window scroll, nested overflow, CSS transforms. Do NOT add scroll/resize listeners.

**Particle positioning:** `updateClusterOrbit` sets `p.x = target.x + Math.cos(angle) * radius + jitter` directly every frame. No lerp, no drift animation. When a sphere moves, particles move instantly. Jitter value `0.3` controls calmness.

**Size map:**

| Size | Diameter |
|------|----------|
| xs | 32px |
| sm | 48px |
| md | 64px |
| lg | 96px |
| xl | 128px |

---

### `AIARing`

An SVG ring with animated wavy paths. Orbiting spheres sit at equally spaced positions on the circumference. Registers itself with the canvas context so the canvas knows where the ring is (used for the ring matrix rain when `thinking=true`).

```tsx
<AIARing
  size={600}               // Pixel diameter of the ring. Default 600.
  sphereRadius={50}        // Radius of each sphere in px — used for wave clip holes. Default 50.
  activeStep={activeStep}  // How many segments are "revealed" (wave draw-in). 0 = none.
  thinking={false}         // When true: matrix rain falls inside the ring circle.
  matrixOpacity={1}        // Ring matrix brightness multiplier (0–1).
  solidBg={false}          // DOM div fills ring interior with bgColor (default false)
  bgColor='var(--background)' // Color for solidBg DOM fill (default var(--background))
  bgOpacity={0.5}          // Opacity of the canvas bg fill that fades in when ring closes (default 0.5)
  orbit={[                 // Array of ReactNodes — one per sphere position
    <AIASphere key='s1' id='s1' color={SPHERE_COLORS[0]} ... />,
    <AIASphere key='s2' id='s2' color={SPHERE_COLORS[1]} ... />,
  ]}
>
  {/* Center content — rendered at z-20, centered inside the ring */}
  <div>Vāda</div>
</AIARing>
```

**`activeStep`** controls the wave reveal: segments `0..activeStep-1` are visible (opacity + stroke-dashoffset animate in). This matches a "one by one activation" pattern — increment `activeStep` as each agent is touched.

**`orbit` ordering matters** — index 0 is at the top (12 o'clock, angle = -π/2), then clockwise. Keep this stable; reordering causes cluster reassignment.

**Wave clip:** The SVG uses an even-odd clip path that punches sphere-shaped holes in the wave rendering area. Waves are clipped *out* of sphere positions — no opaque covers, no hiding canvas particles. This is deliberate. Do not add circle fill elements to cover spheres.

**Ring matrix:** When `thinking=true`, matrix characters fall inside the ring. They pick random colors from registered sphere colors for multicolor effect. Ring matrix uses circular clip — there is a ~15px gap at the very top where the circle width approaches zero. This is a geometry constraint.

**Responsive sizing:** `AIARing` has no built-in viewport awareness — it renders whatever `size` you give it. For full-viewport home pages, the consumer computes `size` from the viewport and scales orbiting spheres proportionally so they stay on the ring without overflowing. `AIARing` re-registers with the canvas context whenever `size` changes (see `aia-ring.tsx:97–123`), and `useAIASphere`'s rAF position loop picks up sphere size changes via `getBoundingClientRect()` — no extra plumbing needed.

Canonical pattern (see `apps/vada-ai/web/src/app/(main)/(home)/components/HomeCanvas.tsx`):

```tsx
const MAX_RING = 600
const SPHERE_RATIO = 128 / 600   // keep xl-to-ring proportion
const MIN_SPHERE = 48            // floor so faces stay legible

function useResponsiveRingSize() {
  const [dims, setDims] = useState({ ringSize: MAX_RING, sphereSize: 128, sphereRadius: 64 })
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ringSize = Math.min(MAX_RING, Math.floor(Math.min(vw * 0.85, vh * 0.7)))
      const sphereSize = Math.max(MIN_SPHERE, Math.round(ringSize * SPHERE_RATIO))
      setDims({ ringSize, sphereSize, sphereRadius: Math.round(sphereSize / 2) })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('orientationchange', compute)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', compute)
    }
  }, [])
  return dims
}

const { ringSize, sphereSize, sphereRadius } = useResponsiveRingSize()
<AIARing size={ringSize} sphereRadius={sphereRadius} ...>
  {orbit.map(() => <AIAgent ... size={sphereSize} />)}
</AIARing>
```

Why `0.85 × vw` and `0.7 × vh`: xl spheres protrude ~half their diameter past the ring's bbox, so the visible extent is ~1.2× the `size` prop. The clamps leave room for the overhang and margin. Tune per product if the ring has different surrounding UI.

Keep the hook local to the consumer — sizing policy (max size, ratio, floor) varies per product (Vāda 600, Atta 800). Don't push it into `AIARing`.

---

## Canvas Phases

The canvas transitions through three phases automatically:

```
wander  →  forming  →  settled
```

| Phase | Particle behavior | Trigger |
|-------|------------------|---------|
| `wander` | All free-roaming across the whole screen | Initial state |
| `forming` | Sphere-bound particles converge into spheres | After `wanderDuration` frames |
| `settled` | Particles orbit their spheres; ring envoy starts | When 50% of sphere-bound particles are within radius+30px of their sphere |

**Ambient particles** (`ambientRatio > 0`) always stay in `wander` mode regardless of canvas phase — they float forever.

**`alwaysRenderSpheres`** renders matrix rain and glow even during `wander` phase. Without it, these effects only appear after `forming` begins.

**`onPhaseChange`** fires on each transition. Use this to trigger UI changes.

**The simulation hook should wait for `settled`** before starting agent interactions — particles aren't near their spheres until then.

**Particle redistribution:** When spheres are added or removed (expand/collapse rounds), the canvas detects the sphere count change and redistributes particles evenly across all spheres. Particles snap to their new sphere position immediately — no drift animation.

---

## Context API

Use `useAIAContext()` inside any component that's a child of `AIACanvas`:

```tsx
const ctx = useAIAContext()

ctx.phase                     // 'wander' | 'forming' | 'settled'
ctx.fireDirectedMessage('s1', 's2')  // Fire a message particle from sphere s1 to s2
ctx.containerRef              // Ref to the canvas container div (for position calculations)

// Lower-level (used internally by AIASphere/AIARing):
ctx.registerSphere(reg)
ctx.updateSphere(id, partialReg)
ctx.unregisterSphere(id)
ctx.registerRing(reg)
ctx.updateRing(id, partialReg)
ctx.unregisterRing(id)
```

**`fireDirectedMessage(fromId, toId)`** shoots a straight-line particle from one sphere's center to another's. It has a fading trail and a glowing white head. Speed: `0.07` progress per frame ≈ 0.23s total. The destination sphere gets an arrival glow burst.

---

## The Standard Pattern

**Two-component split** — outer shell provides the canvas context, inner component consumes it:

```tsx
// Outer — provides AIACanvas context
export function HomeContent({ isSignedIn }: { isSignedIn: boolean }) {
  return (
    <AIACanvas particleCount={300} ambientRatio={0.35} alwaysRenderSpheres
      className='fixed inset-0 z-0 bg-background'>
      <HomeScene isSignedIn={isSignedIn} />
    </AIACanvas>
  )
}

// Inner — consumes context via useAIAContext or custom hooks
function HomeScene({ isSignedIn }: { isSignedIn: boolean }) {
  const { activeAgent, activeStep } = useHomeContent()
  // ...render AIARing + AIASphere here
}
```

The split is **required** — `useAIAContext()` only works inside the `AIACanvas` provider tree. If you try to use context in the same component that renders `AIACanvas`, it won't have access.

---

## Driving the Simulation

```tsx
// useHomeContent.ts — canonical pattern
export function useHomeContent() {
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [activeStep, setActiveStep] = useState(0)
  const simulationStarted = useRef(false)
  const ctx = useAIAContext()

  // Wait for 'settled' before starting — particles must be near spheres
  useEffect(() => {
    if (!ctx || ctx.phase !== 'settled' || simulationStarted.current) return
    simulationStarted.current = true

    const sequence = ['s1', 's2', 's3', 's4', 's5', 's6']

    const runSimulation = async () => {
      await new Promise((r) => setTimeout(r, 200))  // Initial pause

      for (let i = 0; i < sequence.length; i++) {
        const current = sequence[i] as string
        const next = sequence[(i + 1) % sequence.length] as string

        setActiveAgent(current)          // Sphere activates (speaking state)
        await new Promise((r) => setTimeout(r, 450))  // Think time

        setActiveAgent(null)
        await new Promise((r) => setTimeout(r, 30))

        setActiveStep(i + 1)            // Reveal next ring segment
        ctx.fireDirectedMessage(current, next)  // Fire message particle

        await new Promise((r) => setTimeout(r, 250))  // Wait for particle to arrive
      }
    }

    runSimulation()
  }, [ctx?.phase])

  return { activeAgent, activeStep }
}
```

**Timing reference:**
- Message particle travel: ~230ms (speed 0.07 × 14 frames)
- Safe wait after firing: 250ms
- Per-agent cycle total: ~730ms
- 6 agents: ~4.4s full animation

---

## Connecting Sphere State to Ring Reveal

```tsx
const SPHERE_COLORS = [
  AGENT_THEME['Strategist']!.color,
  AGENT_THEME['Critic']!.color,
  AGENT_THEME["Devil's Advocate"]!.color,
  AGENT_THEME['Synthesizer']!.color,
  AGENT_THEME['Researcher']!.color,
  AGENT_THEME['Operator']!.color,
]

const isTouched = (index: number) => activeStep > index

// Sphere stays in speaking mode permanently once touched (thinking together)
const getSphereState = (id: string, index: number): SphereState => {
  if (activeAgent === id || isTouched(index)) return 'speaking'
  return 'idle'
}

// Ring reveal: one segment per sphere touched
<AIARing activeStep={activeStep} thinking={animationComplete} ...>
  {spheres.map((s, i) => (
    <AIASphere
      key={s.id}
      id={s.id}
      color={SPHERE_COLORS[i]}
      state={getSphereState(s.id, i)}
      showMatrix={activeAgent === s.id || isTouched(i)}
      matrixColors={SPHERE_COLORS}
    />
  ))}
</AIARing>
```

---

## Wave Animation Internals

The ring renders three layered wave paths per segment via rAF (bypasses React for performance).

Each wave variant:
```ts
{ samples, amplitude, freq, color, width, speed, dir }
```

**`freq` math — critical gotcha:**

The wave is `Math.sin(i * freq + timeOffset)` where `i` goes `0..samples`. Adjacent samples advance the sine argument by `freq` radians. If `freq mod 2π ≈ π` (i.e., freq ≈ nπ for any integer n), the sine alternates sign each step with growing magnitude — producing a **triangle/zigzag** pattern instead of a smooth wave.

**Bad values (triangle artifacts):** `freq ≈ 3.14, 6.28, 9.42, 12.56, 15.71, 18.85, 22, 25...`

**Good values (smooth waves):** freq where `freq mod 2π` is between `0.2` and `2.5`. Examples:
- Low density (2–3 cycles/segment): `freq ≈ 0.15–0.25`
- Medium density (5–9 cycles/segment): `freq ≈ 0.4–0.7` (or aliased via `7 mod 2π ≈ 0.72`)
- The existing `freq: 7` works because `7 mod 2π ≈ 0.72` — smooth.
- The existing `freq: 13` works because `13 mod 2π ≈ 0.43` — smooth.

**Traveling wave around the ring:**
```ts
const segPhase = (seg / numSpheres) * Math.PI * 3
const timeForSeg = timesRef.current[w] + segPhase
```
Adjacent segments get a phase offset, so the wave ripples around the ring instead of all segments pulsing in sync.

**Amplitude breathing:**
```ts
const breathe = 1 + 0.35 * Math.sin(timesRef.current[w] * 0.4 + w * 1.2)
const amp = v.amplitude * breathe
```
Each variant swells and quiets independently (offset by `w * 1.2`) — like layered instruments.

**Wave variant design guide:**
- Use 3 variants: slow/subtle, medium/dominant, slow/crossing
- Different `dir` values (`1` vs `-1`) create opposing travel — layers that cross each other
- Keep `speed` between `0.02` and `0.10` at 60fps (below 0.02 is imperceptible, above 0.10 feels frantic)
- Keep `opacity` at `0.65` max — waves are texture, not focal elements

---

## Particle System Internals

### Direct Positioning

`updateClusterOrbit` uses direct assignment, not lerp:
```ts
p.x = target.x + Math.cos(p.angle) * clusterRadius + jitter
p.y = target.y + Math.sin(p.angle) * clusterRadius + jitter
```
Jitter value `0.3` keeps particles calm. Sphere moves → particles move instantly. No drift, no searching, no delay.

### Redistribution on Sphere Count Change

When spheres are added or removed (expand/collapse rounds), the canvas detects the change by comparing `maxCluster` to `spheres.length`. If they don't match:
1. Reassign every sphere-bound particle: `p.cluster = idx++ % spheres.length`
2. Snap each particle to its new sphere position immediately
3. No animation — particles teleport

### Position Tracking

`useAIASphere` runs a `requestAnimationFrame` loop:
1. Every frame: `getBoundingClientRect()` on the sphere DOM element
2. Compare to last position (0.5px threshold)
3. If changed: call `registerSphere` with new coordinates
4. Works in any scroll context — window scroll, nested overflow, CSS transforms

Do NOT add scroll or resize listeners. The rAF loop handles everything.

---

## Z-Index Reference

| Element | z-index | Notes |
|---------|---------|-------|
| `<canvas>` (particles, matrix, messages) | `z-0` | Always behind everything |
| `<svg>` wave paths (in AIARing) | `z-10` | Above canvas |
| Center content (children of AIARing) | `z-20` | Above SVG ring |
| Orbit spheres (AIASphere in orbit[]) | `z-30` | Topmost |

**Do not add opaque fills to the SVG ring to hide spheres from canvas particles.** Use the SVG clip-path approach (already in place) — it excludes sphere positions from wave rendering without blocking canvas visibility.

---

## Common Mistakes

**Invisible particles / matrix:**
`color` prop missing or resolving to near-black (`--accent`, `--secondary`). Always pass an explicit visible color — agent HSL values or `var(--primary)`.

**Particles migrate between spheres:**
Duplicate IDs. Two Strategist spheres in different expanded rounds both get `id="agent-Strategist"`. Use `useId()`.

**Particles disappear below viewport:**
Canvas is viewport-sized but spheres are in scrolling content. Add `matchContentHeight` to AIACanvas.

**Decorative dots steal particles:**
14px AIASpheres in collapsed toggle buttons register with the canvas. Each steals ~16 particles. Replace with plain `<div>` elements.

**No matrix rain appears:**
Three possible causes: (1) `state='idle'` — matrix only renders for `speaking`/`complete`. (2) No `alwaysRenderSpheres` — matrix only renders after settled phase. (3) `color` is near-black.

**Cluster assignment shifts / ring appears to rotate:**
Caused by unregistering and re-registering a sphere. This happens when `state` or `showMatrix` are in the `useEffect` dependency array of the registration effect. `useAIASphere` deliberately excludes them — use `updateSphere` for state changes.

**Context is null / useAIAContext returns null:**
Component is not inside `AIACanvas`. Split into outer (renders `AIACanvas`) and inner (consumes context) components.

**Canvas sphere backgrounds re-added by linter:**
Some lint hooks add `ctx.beginPath(); ctx.arc(); ctx.fill()` inside each sphere to "mask" particles. This is wrong — it hides the canvas particles inside spheres. Remove any block labeled "Draw dark background fill inside each sphere".

**Wave looks like triangles:**
`freq` value is near a multiple of π. Change to a small decimal like `0.22` (2–3 smooth cycles per segment).

**Simulation starts before particles are near spheres:**
Always gate simulation start on `ctx.phase === 'settled'`. The `forming` → `settled` transition happens when 50% of sphere-bound particles are within radius+30px of their sphere center.

**`fireDirectedMessage` silently does nothing:**
Sphere IDs in the context map are lowercase-matched. The lookup is `s.id.toLowerCase() === fromId.toLowerCase()`. Ensure the IDs passed to `fireDirectedMessage` match the `id` prop on the `AIASphere`.

**Particles vibrate:**
Jitter too high in `updateClusterOrbit`. Current value: `0.3`. Reduce for calmer orbits.

---

## File Map

```
packages/ui/canvas/
├── aia-canvas/            — Canvas orchestrator (split from monolith)
│   ├── index.tsx          — AIACanvas component (pure JSX shell)
│   ├── use-aia-canvas.ts  — All React hooks: state, rAF loop, context callbacks
│   ├── bg-fills.ts        — Ring + sphere background fill rendering
│   ├── matrix-rain.ts     — Matrix rain for spheres and rings
│   ├── message-system.ts  — Directed message particle rendering
│   ├── particle-system.ts — Particle creation, orbit, rendering
│   ├── phase-machine.ts   — wander → forming → settled state machine
│   ├── ring-envoy.ts      — Ring envoy animation (segment reveal progress)
│   └── types.ts           — Internal canvas types (Particle, DirectMessage, etc.)
├── aia-sphere.tsx         — Pure presentational sphere (no hooks)
├── useAIASphere.ts        — All sphere hooks (rAF position tracking, registration)
├── aia-ring.tsx           — SVG ring, animated waves (agent colors), orbit layout
├── aia-context.tsx        — Context types: SphereRegistration, RingRegistration, AIAContextValue
├── assistant-wave.tsx     — Standalone animated SVG wave (not canvas-based)
├── bg/                    — Background renderers (fabric, etc.)
├── shared/                — Shared canvas utilities (see "Shared Modules" below)
│   ├── colors.ts          — CSS variable resolution (resolveColor, getThemeColors)
│   ├── color-math.ts      — Canvas color math (parseColor, withAlpha, brightenForLight, fgAt, rgbToHsl)
│   ├── theme.ts           — Light/dark theme cache (refreshThemeCache, isLightTheme)
│   ├── paint.ts           — Particle paint primitives (paintParticleHead, paintClusterGlow, bloomStops)
│   ├── constants.ts       — MATRIX_CHARS and other tuning constants
│   └── math.ts            — Trig + small numeric helpers
└── index.ts               — Public exports
```

## Consuming Components (Vāda)

```
apps/vada-ai/web/src/app/deliberation/[id]/components/
├── DeliberationFeed.tsx   — Main feed with AIACanvas wrapper (matchContentHeight, alwaysRenderSpheres)
├── RoundStrip.tsx         — Per-round strip (sphere row + single selected-speaker card with sliding transition)
├── useRoundStrip.ts       — All state/effects/handlers for RoundStrip (selection, handoff fireDirectedMessage, copy/download)
├── deriveAgentStates.ts   — Pure function — (agentRoles, entries, streamingMessage, round) → AgentState[]
├── ConclusionPanel.tsx    — Terminal state display + rendered markdown recommendation/key_condition
├── markdown-components.tsx— Shared ReactMarkdown overrides (DRY between RoundStrip and ConclusionPanel)
├── transcript-export.ts   — Markdown serializers (whole transcript + per-round)
├── useDeliberation.ts     — Pull-loop driver (fetch /next, stream tokens, POST /turn)
├── useDeliberationScene.ts— Scene-level derivations + auto-scroll effects
└── agent-theme.ts         — Agent colors, round titles, round descriptions, terminal badges
```

Sphere ID convention in the deliberation feed: `` `round-${round}-${role}` `` (see `sphereIdFor` in `useRoundStrip.ts`). Unique per round so particles don't migrate between strips — matches the canvas requirement for unique sphere IDs.

## After Editing Package Files

Shared package changes require restart — hot reload does NOT work:
```bash
# Kill dev server, then:
bun run dev:vada
```

## Known Issues

- **Ring matrix top gap (~15px):** Circular clip makes characters invisible at the very top where circle width → 0. Geometry constraint. Would need non-circular clip approach.
- **Canvas resize lag:** Content height check in `animate()` occasionally lags one frame behind rapid expand/collapse.
