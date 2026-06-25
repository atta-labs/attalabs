---
name: ui-library-system
description: How the @atta/ui multi-library system works — build-time generation (Vada pattern) vs runtime switching (Herald pattern), how to add a new app or library, and how to debug library resolution
---

# UI Library System — Atta AI

## Overview

`@atta/ui` ships four component libraries (`basic`, `animate`, `retro`, `brutal`). Each product uses exactly one at a time per surface, controlled by its Sanity CMS config (and, post-D-060, by the central `attalabs` library registry the per-product configs reference). There are two ways an app resolves which library it uses:

| Pattern | Used By | How |
|---------|---------|-----|
| **Build-time generation** | Vada, Atta, Vitakka | `generate-ui.ts` runs at build, writes a generated index; tsconfig points `@atta/ui` at that file |
| **Runtime switching** | Herald (public profile only) | `LibraryProvider` + `useLibraryLoader` dynamically import the active library in the browser |
| **Hybrid** | **Herald** (whole app) | Both of the above, on different route subtrees — see "Pattern 3" below |

Both base patterns are valid. Choose based on whether the library selection is static (per-app) or dynamic (per-user). Herald is the hybrid case because it mixes the two: the **app chrome** is the product's fixed CMS-driven design system (build-time-style), while each user's **public profile** carries the user's saved library choice (runtime).

---

## Pattern 1 — Build-Time Generation (Vada)

### How It Works

1. `packages/ui/scripts/generate-ui.ts` is called during the Next.js build via `next.config.ts`
2. It fetches the active library from Sanity CMS for the given app
3. It writes `packages/ui/generated/{app}/components.ts` — a simple re-export of the active library
4. The app's `tsconfig.json` maps `@atta/ui` → `generated/{app}/components`
5. All imports resolve at build time — no dynamic import overhead at runtime

### Generated File Format

`packages/ui/generated/vada/components.ts`:
```ts
// AUTO-GENERATED — DO NOT EDIT
// App: vada | Library: animate
export * from '../../libraries/animate/components'
```

`packages/ui/generated/vada/canvas.ts`:
```ts
// AUTO-GENERATED — DO NOT EDIT
// App: vada | Library: animate
export * from '../../canvas'
```

The file is gitignored — it is created on every build from the CMS config.

### next.config.ts Integration

```ts
// apps/vada-ai/web/next.config.ts
import { generateUIIndex } from '@atta/ui/scripts/generate-ui'

const nextConfig = async () => {
  await generateUIIndex('vada')   // writes generated/vada/components.ts
  return { /* ...next config... */ }
}
export default nextConfig
```

### tsconfig.json Mapping

```json
// apps/vada-ai/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@atta/ui": ["../../../packages/ui/generated/vada/components"],
      "@atta/ui/canvas": ["../../../packages/ui/generated/vada/canvas"]
    }
  }
}
```

**Why this matters:** When you add a new component to the `animate` library (e.g. `DropdownMenu`), it only becomes available in Vada if it's exported from `packages/ui/libraries/animate/components/index.ts`. The generated file is just a `export *` passthrough — it has no content of its own.

### When to Use This Pattern

- App has a **single library choice** for all users (set in CMS)
- You want **static bundling** — no dynamic import, smaller JS chunks
- The library choice changes infrequently (rebuild required to switch)

---

## Pattern 2 — Runtime Switching (Herald)

### How It Works

1. Herald has no tsconfig path alias for `@atta/ui` — it falls back to `package.json` exports
2. At render time, the page reads the user's active library from DB
3. The component tree is wrapped in `<LibraryProvider library={userLibrary}>`
4. Components that need to vary by library call `useComponents()` to get the active component map
5. `useLibraryLoader` dynamically imports the selected library via `import()` in the browser

### LibraryProvider

```tsx
// packages/ui/lib/library-provider.tsx
'use client'

import { LibraryProvider } from '@atta/ui/lib/library-provider'

// In a page or layout:
export default function EnvoyPage({ user }) {
  const userLibrary = (user.library ?? 'basic') as UILibrary
  return (
    <LibraryProvider library={userLibrary}>
      <PageContent />
    </LibraryProvider>
  )
}
```

### useComponents Hook

```tsx
'use client'

import { useComponents } from '@atta/ui/lib/library-provider'

function MyComponent() {
  const { Button, Card, Badge } = useComponents()
  // Button/Card/Badge are from whichever library the LibraryProvider loaded
  return <Button variant="default">Click</Button>
}
```

**Important:** `useComponents()` returns an empty map `{}` until the dynamic import resolves. Components will be `undefined` on first render. Guard against this or use fallback components.

### useLibraryLoader — Race Condition Guard

`packages/ui/lib/library-loader.ts` handles the case where a user switches libraries quickly. It tracks the last-requested library via a ref — if a slower import from a previous selection resolves after a newer one, it is discarded:

```ts
const loadLibrary = useCallback((library: UILibrary) => {
  if (loadedLibraryRef.current === library) return   // already loaded
  loadedLibraryRef.current = library
  LIBRARY_IMPORTERS[library]().then((mod) => {
    if (loadedLibraryRef.current !== library) return  // stale — discard
    setComponents(mod as ComponentMap)
  })
}, [])
```

### When to Use This Pattern

- App needs **per-user library selection** (different users see different UI styles)
- Library selection must change **without a rebuild**
- Acceptable tradeoff: small dynamic import delay on first render

---

## Pattern 3 — Hybrid: build-time chrome + runtime per-user surface (Herald)

Herald is **not** a pure runtime-switching app. It uses **both** patterns on **disjoint route subtrees** — and crossing them silently is a recurring regression class (`apps/aeg/project-management/decisions.md` D-035, Lock: YES).

### Two surfaces, two providers

| Surface | Route subtree | LibraryProvider fed with | Source |
|---------|---------------|--------------------------|--------|
| **App chrome (build-time)** | `app/(app)/*` (`/bulk-audit`, `/onboarding`) **and** `app/[username]/(owner)/*` (`/{username}/ui`, `/{username}/settings`) | `getHeraldConfig(cmsClient).userInterface.library.id` — the product's CMS-managed library | `app/(app)/layout.tsx` and `app/[username]/(owner)/layout.tsx` each wrap children in `<CandidateShell initialLibrary={chromeLibrary}>` |
| **Public profile (runtime per-user)** | `app/[username]/(profile)/*` (`/{username}` only) | `user.library` from Herald's DB | `app/[username]/(profile)/layout.tsx` wraps children in `<EnvoyLibraryShell initialLibrary={userLibrary}>` |

`app/[username]/layout.tsx` is intentionally a **no-op passthrough** (`return children` + the icon `generateMetadata`). It deliberately does **not** wrap children in any `LibraryProvider` — putting one there would inherit a provider into both the `(profile)` and `(owner)` subtrees, crossing the build-time and per-user paths. The route-group split (`(profile)` vs `(owner)`) exists precisely so the two sibling layouts can feed their own providers without the parent leaking one. Touching `[username]/layout.tsx` to "save a hop" is the canonical D-035 regression — don't.

### Where the build-time library id actually comes from (post-D-060)

Theme and library metadata live centrally in the `attalabs` Sanity dataset. The `@atta/cms` resolver (`getProductUiConfig` / `getHeraldConfig`) intercepts the string `library` id stored in `heraldConfig.userInterface.library`, fetches the full `library` document from `attalabs`, and reconstructs `config.userInterface.library` so consumers (the build-time generator AND `(app)/layout.tsx` / `(owner)/layout.tsx` at runtime) see the same `library.id` string. That string is what both layouts feed `CandidateShell`, and what `scripts/generate-ui.ts` reads to write the `packages/ui/generated/herald/components.ts` alias target. Hybrid Herald therefore looks like Pattern 1 to the build-time generator and looks like Pattern 2 to its public-profile subtree, with both pulling the same source-of-truth library id through the central resolver.

### Verification recipe (D-035, expanded for D-061)

Set `user.library = retro` in Herald's DB (or via the appearance editor). Reload `/bulk-audit`, `/onboarding`, `/{username}/ui`, `/{username}/settings`, and `/{username}` (the public profile). The first four must stay on the **build-time** library; only the last switches to `retro`. The three surfaces (`(app)`, `(owner)`, `(profile)`) are independent — and they all resolve their library id through the same D-060 central-CMS path.

### When to Use This Pattern

- App is both an authenticated tool (chrome stays on the brand's design system) **and** a public per-user surface (visitors style it for themselves).
- You need the chrome to be uneditable by the user even on routes that share the user's URL namespace (e.g. `/{username}/settings`).
- You can afford to keep two layout files in sync — both must feed `LibraryProvider`, but with different sources.

---

## Library Contents

Each library lives at `packages/ui/libraries/{name}/` and exports its component map from `components/index.ts`.

```
libraries/
├── basic/
│   ├── components/index.ts     # The canonical export list
│   └── installed/              # Raw shadcn/ui component files
├── animate/
│   ├── components/index.ts     # Extends/overrides basic with motion versions
│   └── installed/              # Motion-enhanced components (button, collapsible...)
├── retro/
│   └── components/index.ts
└── brutal/
    └── components/index.ts
```

Non-basic libraries override specific components and **fall back to basic** for everything else:

```ts
// packages/ui/libraries/animate/components/index.ts
export { Badge } from '../../basic/installed/badge'         // falls back to basic
export { Button } from '../installed/button'                // animate override
export { Collapsible, ... } from '../installed/collapsible' // animate override
export { DropdownMenu, ... } from '../../basic/installed/dropdown-menu' // falls back
```

### Adding a Component to a Library

1. Create the component in `libraries/{name}/installed/{component}.tsx`
2. Export it from `libraries/{name}/components/index.ts`
3. Add the component name to `REQUIRED_COMPONENTS` in `packages/ui/component-contract.mjs`
4. Add its Props type to `REQUIRED_TYPES` in `component-contract.mjs`
5. Implement or add a `basic` fallback in **all other libraries** — the contract validator blocks builds until every library exports it
6. For Vada (build-time pattern): the generated file is a passthrough, so no extra step needed — rebuild picks it up

**The contract validator enforces step 5.** You cannot forget — the build fails if any library is missing the export.

---

## Adding a New App

### Build-Time Pattern (recommended for new apps)

1. **Call generateUIIndex in next.config.ts:**
   ```ts
   import { generateUIIndex } from '@atta/ui/scripts/generate-ui'
   const nextConfig = async () => {
     await generateUIIndex('your-app')
     return { /* ... */ }
   }
   ```

2. **Add tsconfig path aliases:**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@atta/ui": ["../../../packages/ui/generated/your-app/components"],
         "@atta/ui/canvas": ["../../../packages/ui/generated/your-app/canvas"]
       }
     }
   }
   ```

3. **Set the library in Sanity CMS:** The `{app}Config` document's `userInterface.library` field controls which library gets written to the generated index.

4. **Gitignore the generated file:** `packages/ui/generated/` is already gitignored.

### Runtime Pattern (per-user library selection)

1. Do not add tsconfig aliases — let it fall back to `package.json` exports
2. Read the active library for each user/session from DB or CMS
3. Wrap the relevant part of the component tree in `<LibraryProvider library={...}>`
4. Use `useComponents()` in components that need library-specific implementations

---

## Debugging Library Resolution

### "Component not found" or wrong component rendering

**First step for any missing component:** run `bun run validate:ui-contract`. If the library doesn't export it, the contract will tell you exactly what's missing across all libraries.

**Build-time apps (Vada):**
1. Run `bun run validate:ui-contract` — check if the active library is missing the component
2. Check `packages/ui/generated/vada/components.ts` — what library does it point to?
3. Check that the component is exported from `libraries/{library}/components/index.ts`
4. If the generated file is stale, delete it and rebuild — `generateUIIndex` will recreate it

**Runtime apps (Herald):**
1. Check that `LibraryProvider` wraps the component tree
2. Check that `useComponents()` is called inside the provider
3. Remember components are `undefined` until the dynamic import resolves

### TypeScript says `@atta/ui` has no exported member X

For build-time apps: the component must be exported from the **active library's** `components/index.ts`. Adding it to `basic` only won't help if the app uses `animate`.

For runtime apps: the component must be exported from `package.json`'s default export path, which points to `basic/components`.

### Changing the active library for an app

**Build-time (Vada):** Change `userInterface.library` in the `vadaConfig` Sanity document, then rebuild. The generated index will update.

**Runtime (Herald):** Update the user's `library` field in the DB. `LibraryProvider` will re-import the new library on next render.

---

## Component Contract

Every library must export the same set of components and types. This is enforced at build time — `node scripts/validate-ui-contract.mjs` runs before every `build` and `dev` command and exits 1 if any library is missing an export.

### Files

| File | Purpose |
|------|---------|
| `packages/ui/component-contract.mjs` | Source of truth: `REQUIRED_COMPONENTS`, `REQUIRED_TYPES`, `TEMPLATES` |
| `scripts/validate-ui-contract.mjs` | Validator script — parses all library indexes recursively and diffs against contract |

### Running manually

```bash
bun run validate:ui-contract
```

### Contract output

```
🔍 Validating UI Component Contract

   Contract : 37 components, 43 types
   Libraries: basic, retro, animate, brutal

📦 Checking retro...
   ❌ Missing components (2):
        - Toast
        - ToastProvider

❌ Some libraries are missing required exports. Fix them or update the contract.
```

### How the validator works

The validator recursively parses `libraries/{name}/components/index.ts`, following:
- `export { A, B } from '...'` — named value exports
- `export type { A, B } from '...'` — named type exports
- `export * from '...'` — star re-exports (recurse, collect components + types)
- `export type * from '...'` — star type re-exports (recurse, collect types only)

All four patterns are needed. Our libraries use `export type * from '../../../types'` to re-export the shared type contracts — the validator follows this chain.

---

## File Reference

| File | Purpose |
|------|---------|
| `packages/ui/component-contract.mjs` | Contract: required components + types for all libraries |
| `scripts/validate-ui-contract.mjs` | Validator — runs before every build and dev, exits 1 on failure |
| `packages/ui/scripts/generate-ui.ts` | Generates `generated/{app}/components.ts` from CMS config |
| `packages/ui/generated/{app}/components.ts` | Auto-generated re-export of the active library (gitignored) |
| `packages/ui/lib/library-provider.tsx` | `LibraryProvider` + `useComponents()` for runtime switching |
| `packages/ui/lib/library-loader.ts` | `useLibraryLoader` — dynamic import with race condition guard |
| `packages/ui/libraries/{name}/components/index.ts` | The canonical export list for each library |
| `apps/{app}/web/tsconfig.json` | Path aliases that point `@atta/ui` at the generated index |
| `apps/{app}/web/next.config.ts` | Calls `generateUIIndex` at build time |
