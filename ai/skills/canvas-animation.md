---
name: canvas-animation
description: Rules and patterns for the AIACanvas particle system — AIACanvas, AIASphere, AIARing components in @atta/ui/canvas
triggers:
  - Using AIACanvas, AIASphere, AIARing, or useAIAContext
  - Building animated particle or ring UI
  - Editing canvas or particle system code
---

# Canvas Animation — Atta AI

## Context

The `@atta/ui/canvas` package provides a reusable canvas particle system used across all Atta AI products. Components: `AIACanvas`, `AIASphere`, `AIARing`. Context: `useAIAContext`.

---

## Component Hierarchy

```tsx
// AIACanvas provides the particle context and background
<AIACanvas particleCount={300} ambientRatio={0.35}>
  {/* Everything inside can consume useAIAContext */}
  <PageContent />
</AIACanvas>

// AIARing wraps content with animated orbital ring
<AIARing activeStep={2} orbit={[sphere1, sphere2]}>
  {children}
</AIARing>

// AIASphere is a named sphere node — assigned a particle cluster
<AIASphere id="agent-1" label="Analyst" />
```

---

## Rules

### Initialization
- **MUST** wait for `ctx.phase === 'settled'` before starting simulations or animations
- **MUST NOT** start sphere interactions before the particle system is ready

```tsx
const ctx = useAIAContext()

useEffect(() => {
  if (ctx.phase !== 'settled') return
  // Safe to start simulation
}, [ctx.phase])
```

### Spheres
- **MUST NOT** unmount/remount `AIASphere` to update its state — use `updateSphere` from context
- **MUST NOT** reorder the `orbit` array passed to `AIARing` — breaks particle cluster assignments
- Cluster assignments are positional — index 0 stays index 0 across re-renders

```tsx
// ✅ Update sphere state without remounting
const ctx = useAIAContext()
ctx.updateSphere('agent-1', { active: true })

// ❌ Triggers full remount, breaks cluster
setSpheresVisible(false)
setTimeout(() => setSpheresVisible(true), 100)
```

### Rings (SVG Wave)
- **MUST NOT** use `freq` values near multiples of π — causes triangle/sawtooth artifacts
- Safe range: `0.5` to `2.5`
- Test visually after any freq changes

### Background Particles
- Ambient (background) particles and sphere-bound particles are separate systems
- `ambientRatio` controls what fraction of total particles float freely
- **MUST NOT** mix ambient and sphere particle logic

### SVG Rings
- **MUST NOT** add opaque fills to SVG ring elements — blocks particle visibility underneath
- Ring fills should be `none` or very low opacity

---

## Props Reference

### AIACanvas
| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `particleCount` | number | 200 | Total particles (ambient + sphere-bound) |
| `ambientRatio` | number | 0.3 | Fraction of particles that float freely |

### AIARing
| Prop | Type | Notes |
|------|------|-------|
| `activeStep` | number | Controls which ring segment is active |
| `orbit` | SphereConfig[] | Ordered list of sphere configs — never reorder |

### AIASphere
| Prop | Type | Notes |
|------|------|-------|
| `id` | string | Unique identifier — used by updateSphere |
| `label` | string | Displayed below sphere |
| `active` | boolean | Whether this sphere is currently active |

---

## Anti-patterns

- ❌ Unmounting AIASphere to update state — use `ctx.updateSphere(id, patch)`
- ❌ Reordering orbit array — clusters are positional
- ❌ `freq` values at `π`, `2π`, etc. — causes visual artifacts
- ❌ Opaque fills on SVG ring paths
- ❌ Starting simulation before `phase === 'settled'`
- ❌ Mixing ambient and sphere particle budgets
