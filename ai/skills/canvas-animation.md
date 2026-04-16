---
name: canvas-animation
description: Rules and patterns for the AIACanvas particle system — AIACanvas, AIASphere, AIARing components in @atta/ui/canvas
triggers:
  - Using AIACanvas, AIASphere, AIARing, or useAIAContext
  - Building animated particle or ring UI
  - Editing canvas or particle system code
  - Debugging missing particles, invisible matrix, or sphere positioning
  - Adding spheres to a page or component
  - Working with deliberation feed or home page visuals
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

### 7. No hardcoded colors anywhere

Use CSS variables or HSL strings from `AGENT_THEME`. Never hex codes.

### 8. Hooks in `useAIASphere.ts`, never in `aia-sphere.tsx`

`AIASphere` is pure presentation. All position tracking, scroll handling, state sync lives in the hook.

### 9. Position tracking is rAF-based

`useAIASphere` runs `requestAnimationFrame` with `getBoundingClientRect()` every frame. Only updates when position changes >0.5px. Works in all scroll contexts. Do NOT add scroll/resize listeners.

### 10. Particles use direct positioning

`updateClusterOrbit` sets `p.x = target.x + offset` every frame. No lerp. Sphere moves → particles move instantly. Jitter value `0.3` controls calmness.

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
ctx.startGravity()  // Trigger gravity pull after animation completes — spheres drift inward
```

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
├── shared/                — Shared utilities (colors, math, constants)
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
