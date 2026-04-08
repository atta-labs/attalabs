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

## Component API

### `AIACanvas`

The root. Provides context, owns the canvas element, runs the rAF loop.

```tsx
<AIACanvas
  particleCount={300}       // Total particles. Default 200.
  ambientRatio={0.35}       // Fraction that wander forever (0.0–1.0). Default 0.
  wanderDuration={120}      // Frames before auto-forming (~2s at 60fps). Default 120.
  alwaysRenderSpheres={false} // Show sphere glow/matrix during wander phase too.
  onPhaseChange={(phase) => {}} // 'wander' | 'forming' | 'settled'
  className='fixed inset-0 w-full h-full bg-background z-0'
  ref={canvasRef}           // AIACanvasRef — exposes forceSettle()
>
  {children}
</AIACanvas>
```

**`ambientRatio`** is the key for background atmosphere. `0.35` = 35% of particles float freely forever, never cluster into spheres. The rest converge into the spheres on forming.

**`particleCount`** should be bumped when using `ambientRatio` — e.g. 300 particles with `ambientRatio=0.35` gives 105 ambient floaters + 195 sphere-bound.

**Imperative ref:**
```tsx
const canvasRef = useRef<AIACanvasRef>(null)
canvasRef.current?.forceSettle()  // Skip wander phase, start clustering immediately
```

---

### `AIASphere`

A DOM element that registers its position with the canvas. The canvas uses the position to cluster particles and render matrix rain.

```tsx
<AIASphere
  id='agent-1'             // Stable string ID — used by fireDirectedMessage
  state='idle'             // 'idle' | 'speaking' | 'complete'
  size='lg'                // 'xs'|'sm'|'md'|'lg'|'xl' or number (px diameter)
  showMatrix={true}        // Show matrix rain inside this sphere
  color='var(--accent)'    // Particle/label color — CSS variable or hex
  label='Analyst'          // Optional label text
  labelPosition='bottom'   // 'top'|'bottom'|'left'|'right'|'top-right' etc.
  onClick={() => {}}       // Makes it a <button>, clears background fill
  className=''
>
  {/* Optional content rendered inside the sphere */}
</AIASphere>
```

**State effects:**
- `idle` → muted label, no glow, no matrix
- `speaking` → colored label, matrix rain active (if `showMatrix=true`)
- `complete` → no matrix

**`showMatrix`** is independent of `state`. You can have `state='idle'` with `showMatrix=true`. The canvas only renders matrix for spheres where both `showMatrix=true` AND `state` is `'speaking'` or `'complete'` ... actually `'speaking'` gets 0.5 spawn rate, `'complete'` gets 0.4. `'idle'` gets nothing.

**Registration lifecycle:** Sphere registers on mount, unregisters on unmount. Changing `state` or `showMatrix` uses `updateSphere` (Map.set on existing key — does NOT change cluster assignments). Never unmount and remount spheres just to update state — it shifts cluster assignments and the ring appears to rotate.

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
  orbit={[                 // Array of ReactNodes — one per sphere position
    <AIASphere key='s1' id='s1' ... />,
    <AIASphere key='s2' id='s2' ... />,
  ]}
>
  {/* Center content — rendered at z-20, centered inside the ring */}
  <div>Vāda</div>
</AIARing>
```

**`activeStep`** controls the wave reveal: segments `0..activeStep-1` are visible (opacity + stroke-dashoffset animate in). This matches a "one by one activation" pattern — increment `activeStep` as each agent is touched.

**`orbit` ordering matters** — index 0 is at the top (12 o'clock, angle = -π/2), then clockwise. Keep this stable; reordering causes cluster reassignment.

**Wave clip:** The SVG uses an even-odd clip path that punches sphere-shaped holes in the wave rendering area. Waves are clipped *out* of sphere positions — no opaque covers, no hiding canvas particles. This is deliberate. Do not add circle fill elements to cover spheres.

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
| `settled` | Particles orbit their spheres; ring envoy starts | When 40% of sphere-bound particles are within 25px of their sphere |

**Ambient particles** (`ambientRatio > 0`) always stay in `wander` mode regardless of canvas phase — they float forever.

**`onPhaseChange`** fires on each transition. Use this to trigger UI changes.

**The simulation hook should wait for `settled`** before starting agent interactions — particles aren't near their spheres until then.

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
    <AIACanvas particleCount={300} ambientRatio={0.35} className='fixed inset-0 w-full h-full bg-background z-0'>
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
      state={getSphereState(s.id, i)}
      showMatrix={activeAgent === s.id || isTouched(i)}
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

**Cluster assignment shifts / ring appears to rotate:**
Caused by unregistering and re-registering a sphere. This happens when `state` or `showMatrix` are in the `useEffect` dependency array of the registration effect. AIASphere deliberately excludes them — use `updateSphere` for state changes.

**Context is null / useAIAContext returns null:**
Component is not inside `AIACanvas`. Split into outer (renders `AIACanvas`) and inner (consumes context) components.

**Canvas sphere backgrounds re-added by linter:**
Some lint hooks add `ctx.beginPath(); ctx.arc(); ctx.fill()` inside each sphere to "mask" particles. This is wrong — it hides the canvas particles inside spheres. Remove any block labeled "Draw dark background fill inside each sphere". Use `className='bg-background rounded-full'` on the sphere DOM element instead.

**Wave looks like triangles:**
`freq` value is near a multiple of π. Change to a small decimal like `0.22` (2–3 smooth cycles per segment).

**Simulation starts before particles are near spheres:**
Always gate simulation start on `ctx.phase === 'settled'`. The `forming` → `settled` transition happens when 40% of sphere-bound particles are within 25px of their sphere center.

**`fireDirectedMessage` silently does nothing:**
Sphere IDs in the context map are lowercase-matched. The lookup is `s.id.toLowerCase() === fromId.toLowerCase()`. Ensure the IDs passed to `fireDirectedMessage` match the `id` prop on the `AIASphere`.

---

## File Map

```
packages/ui/canvas/
├── aia-canvas.tsx     # Root provider, rAF loop, particle system, messages, matrix
├── aia-sphere.tsx     # DOM sphere element, registers position with canvas
├── aia-ring.tsx       # SVG ring, animated waves, orbit layout
├── aia-context.tsx    # Context types: SphereRegistration, RingRegistration, AIAContextValue
├── index.ts           # Public exports
└── ring-styles/       # Legacy canvas ring renderers (wave, particles, line) — unused in current impl
    ├── types.ts
    ├── wave.ts
    ├── particles.ts
    └── line.ts
```

The `ring-styles/` renderers are registered in `RING_RENDERERS` but not wired to any active ring (`AIARing` uses SVG, not canvas, for its wave paths). They exist as alternative ring rendering approaches.
