---
name: ui-library-system
description: How the @atta/ui multi-library system works — build-time generation vs runtime switching, how to add a new app or library, and how to debug library resolution
---

# UI Library System — Atta AI

> # ⛔ URGENT — DO NOT EDIT `packages/ui/libraries/*/installed/*`
>
> **Each library's `installed/` holds the vendored canonical from THAT library's design-system
> source — installed via shadcn CLI, pasted verbatim, NEVER hand-edited.** The four libraries
> each have a different upstream:
>
> | Library | Upstream source |
> |---|---|
> | `basic` | shadcn (`ui.shadcn.com`) |
> | `animate` | animate-ui (`animate-ui.com`) |
> | `retro` | retroui (`retroui.dev`, **Radix flavor**) |
> | `brutal` | neobrutalism (`neobrutalism.dev`) |
>
> So `installed/<comp>.tsx` in each library is a verbatim CLI paste from that library's
> upstream. Even a one-character change is a hard rule violation. This applies to ALL files
> in `installed/` across ALL four libraries — `button.tsx`, `dialog.tsx`, `dropdown-menu.tsx`,
> `tabs.tsx`, everything. Color tokens, hover classes, padding, sizes, font weights — all of
> it. NEVER hand-roll your own implementation in `installed/`; ALWAYS pull from upstream.
>
> ### The workflow when you need a change
>
> 1. **Install via CLI** (or paste the canonical from the upstream's docs) into the right
>    library's `installed/<comp>.tsx`. Adjust ONLY the import paths (e.g. `@/lib/utils` →
>    `../../../lib/utils`).
> 2. **Match the contract** — `packages/ui/component-contract.mjs` requires each library to
>    export the same set of components + Props types. If the upstream's API is flat named
>    exports (most are) and matches the contract, just re-export from `components/index.ts`.
> 3. **If the upstream's API doesn't match the contract**, **add a wrapper** in
>    `components/<comp>.tsx` or `components/interactive/` that adapts the API to the contract.
>    The wrapper IS editable. `installed/` stays verbatim. (retro used to need this for its
>    old Base UI heritage — dotted `Object.assign` Tabs and `render`-instead-of-`asChild`
>    Button — but as of the Radix-flavor switch, retro's upstream exports flat named
>    components and native `asChild`, so those adapters are gone.)
> 4. **If you want a library-specific variant** — add it to the wrapper layer (e.g.
>    `components/interactive/<comp>.tsx`), NOT in `installed/`. The `Button.ghost-pill` variant
>    is the canonical example.
> 5. **If a consumer in `components/` imports from `installed/` and that's blocking you,**
>    switch the import to the editable `components/interactive/<component>` (e.g.
>    `model-picker.tsx` should import `Button` from `../interactive/button`, NOT
>    `../../installed/button`).
>
> See "Canonical extension patterns — variants vs wrappers" below for worked examples
> (`ghost-pill`, `'bare'`, `Heading.weight`, `SmartPromptInput.surface`,
> `DropdownMenuItemTextHighlight`, `NextLink 'link'`).
>
> ### Why this rule is non-negotiable
>
> The `installed/` files MUST stay verbatim against their upstream source so future upstream
> updates can be **pasted in** instead of **reconciled by hand**. Every deviation in
> `installed/` becomes drift that has to be reconciled forever after.
>
> **One legitimate edit case:** restoring `installed/<comp>.tsx` to canonical when it has
> drifted from upstream. Pasting the upstream verbatim back into `installed/` IS the rule's
> spirit ("stay verbatim against upstream") — that's reconciling drift, not adding it. Do
> this whenever you notice drift; document the upstream URL in the commit message.

---

## Per-library `installed/*` — CLI sources, doctrine, and contract rule (D-065)

The banner above states the rule; this section is the operational reference. Codified by
D-065 (2026-06-28) after PR #207's Tabs + Button reconciliation.

### Upstream-source mapping (CLI install commands)

| Library | Upstream | CLI command | Notes |
|---|---|---|---|
| `basic` | shadcn/ui | `bunx shadcn@latest add <component>` | Default registry. Slot/asChild idioms. |
| `animate` | animate-ui | `bunx shadcn@latest add @animate-ui/<component>` | Motion-driven Radix wrappers. Installs a helper tree under `installed/animate-ui/primitives/...` — preserve as-is, never flatten. |
| `retro` | retroui (Radix flavor) | `bunx shadcn@latest add https://retroui.dev/r/radix/<component>.json` | retroui relaunched (2026-07-12) shipping each component in two flavors under `https://retroui.dev/r/<flavor>/<component>.json` (a shadcn-CLI registry item; source is the JSON's `files[0].content`). retro standardizes on the **Radix** flavor — flat named exports, native `asChild`, consolidated `radix-ui` package imports (not per-component `@radix-ui/react-*`). The old `@retroui/<component>` namespace and Base UI heritage are gone. |
| `brutal` | neobrutalism | `bunx shadcn@latest add @neobrutalism/<component>` | Radix-based; `noShadow` / `neutral` / `reverse` variant set instead of `outline`/`destructive`. |

### Doctrine (the rule, restated for skim-readers)

- `installed/<component>.tsx` is a **verbatim CLI paste** from that library's upstream.
- Adjust only the import paths from the temp install location (e.g. `@/lib/utils` →
  `../../../lib/utils`) when moving the file under the library. Nothing else.
- Helper trees the upstream emits (e.g. animate-ui's `installed/animate-ui/primitives/...`)
  are preserved verbatim alongside the component files. Don't dedupe, don't flatten.
- **Biome ignores `packages/ui/libraries/*/installed`** (configured in `biome.json` —
  matches the precedent for `packages/cms/*-ai` auto-generated studio dirs) so
  formatter rules never fight a fresh CLI paste. Re-installing later just works.

### Base UI vs Radix flavor — the `asChild` contract idiom

The cross-library composition idiom is **Radix `asChild`** (`<Trigger asChild><Link/></Trigger>`).
App code writes it uniformly and every library must accept it — that is the contract. But
the four libraries are NOT all the same primitive stack: some `installed/*` files are **Base
UI** (`@base-ui/react`), which composes via `render={<El/>}`, not `asChild`. A Base UI
component with an app passing `asChild` fails to typecheck (the prop doesn't exist on its
Props) and, if `...props`-spread, leaks `asChild` onto the DOM at runtime.

**Rule:** any Base UI `installed/*` component that apps use with `asChild` carries an
`asChild`→`render` adapter in its **wrapper layer** (`libraries/<lib>/components/…`), never in
`installed/*` (D-065). The adapter resolves the single element child and forwards it as
`render` (`resolveSingleChild` — factor one shared helper when 3+ wrappers need it; basic's
lives at `libraries/basic/components/as-child.ts`). This is the same pattern task 1 (#536)
built for retro's Base UI Button before retro was re-based onto Radix.

**Flavor matrix — TODAY** (per `installed/*` import; `radix` = native `asChild`, `base-ui` =
needs the adapter; `→basic` = no own installed file, re-exports basic's). The earlier claim
that basic is Radix was wrong — basic is the current Base UI holdout:

| Component | basic | animate | brutal | retro |
|---|---|---|---|---|
| Button | radix | own | radix | radix |
| Popover | radix | radix | radix | radix |
| DropdownMenu | radix | radix | radix | radix |
| Collapsible | **base-ui** (adapter) | radix | radix | radix |
| Sheet | **base-ui** (adapter) | →basic (wrapper) | →basic (wrapper) | radix |
| Dialog | base-ui | →basic | →basic | radix |
| Tooltip | base-ui | →basic | →basic | radix |

Adapters exist where an app actually passes `asChild` AND the resolved primitive is Base UI:
`SheetTrigger`/`SheetClose`/`CollapsibleTrigger` in basic (`ui-retro-contract-v1` f/u 4, #539).
`Dialog`/`Tooltip` are Base UI in basic too but no app uses them with `asChild` yet — add the
same adapter if that changes. animate/brutal fall back to basic's Sheet, so they re-export the
basic **wrapper** (`../../basic/components/overlay/sheet`), not `installed/sheet`.

### CLI workflow when adding or restoring a component

1. **Install:** run the matching CLI from the table above. If the upstream registry is down
   or partial, paste the canonical from the upstream's docs into a scratch file first, then
   move it.
2. **Adjust import paths only:** `@/lib/utils` → relative `../../../lib/utils`. Don't touch
   class strings, variants, types, or formatting. Don't run Biome `--write` against the
   file — the ignore glob exists for that.
3. **Wrap only if the upstream shape differs from the cross-library contract:**
   - As of the Radix-flavor switch (ui-retro-contract-v1 task 2, #539, 2026-07-12) retro's
     upstream matches the contract natively — Tabs exports flat (`Tabs`, `TabsList`,
     `TabsTrigger`, `TabsContent`) and Button supports `asChild` via Radix `Slot`. Both the
     old dotted-Tabs adapter and the `asChild`→`render` Button adapter (task 1, #536) were
     **deleted** by that switch. retro's Button wrapper now only bakes in the universal
     `leading-none` default; `installed/button.tsx` already bundles `cursor-pointer`.
   - The only surviving retro wrappers adapt OUR own extensions, not an upstream mismatch:
     `form/input.tsx` (adds our `InputBlock` + the shared `InputProps` mapping — no upstream
     equivalent) and `form/checkbox.tsx` (a thin re-export of the native retro checkbox).
4. **Validate:** `bun run validate:ui-contract` — every library must still export all
   contracted component names + type names.

### Per-library cva rule

- Each library derives its **own** Props from its **own** cva via
  `VariantProps<typeof buttonVariants>` (or equivalent). Variant names diverge across
  libraries by design (e.g. brutal's Button has `noShadow`/`neutral`/`reverse`; basic +
  animate share `outline`/`destructive`/`ghost`/`link`; the Radix-flavor retroui Button
  ships `destructive` too).
- **`component-contract.mjs` validates COMPONENT + TYPE NAMES, NOT variant enums.**
  We previously kept cross-library `ButtonVariant` / `ButtonSize` / `ButtonVariantsFn` types
  forcing every library to extend with a shared name set. That gave consumers no real
  cross-library guarantee (a `variant='ai'` rendered in `basic` would render as the default
  in `brutal`) and forced bespoke implementations. Removed by D-065 / PR #207. Consumer
  code that wants cross-library certainty for a specific call site should pick a variant
  every library exports (default / outline / ghost, depending on coverage) or hard-import
  from a single library.

---

## Overview

`@atta/ui` ships four component libraries (`basic`, `animate`, `retro`, `brutal`). Each consumer uses exactly one at a time per surface, controlled by its Sanity CMS config (and, post-D-060, by the central `attalabs` library registry the per-consumer configs reference). There are two ways an app resolves which library it uses:

| Pattern | Resolution | How |
|---------|-----------|-----|
| **Build-time generation** | Static, per-app | `generate-ui.ts` runs at build, writes a generated index; tsconfig points `@atta/ui` at that file |
| **Runtime switching** | Dynamic, per-user | `LibraryProvider` + `useLibraryLoader` dynamically import the active library in the browser |

Both are valid. Choose based on whether the library selection is static (per-app) or dynamic (per-user). The two can also be **composed** on disjoint route subtrees — a fixed CMS-driven chrome plus a per-user public surface. That composition is an app-level architecture decision and is documented by the app that makes it, not here.

> **This skill names no consumer.** `@atta/ui` imports no app, so the library system does not know which apps exist or which pattern each one picked. That mapping goes stale on every app added, renamed, or retired — it is a coupling, not a convenience. An app's own resolution choice is documented in that app's `CLAUDE.md`.

---

## Pattern 1 — Build-Time Generation

### How It Works

1. `packages/ui/scripts/generate-ui.ts` is called during the Next.js build via `next.config.ts`
2. It fetches the active library from Sanity CMS for the given app
3. It writes `packages/ui/generated/{app}/components.ts` — a simple re-export of the active library
4. The app's `tsconfig.json` maps `@atta/ui` → `generated/{app}/components`
5. All imports resolve at build time — no dynamic import overhead at runtime

### Generated File Format

`packages/ui/generated/{app}/components.ts`:
```ts
// AUTO-GENERATED — DO NOT EDIT
// App: {app} | Library: {library}
export * from '../../libraries/{library}/components'
```

`packages/ui/generated/{app}/canvas.ts`:
```ts
// AUTO-GENERATED — DO NOT EDIT
// App: {app} | Library: {library}
export * from '../../canvas'
```

The file is gitignored — it is created on every build from the CMS config.

### next.config.ts Integration

```ts
// apps/{app}/web/next.config.ts
import { generateUIIndex } from '@atta/ui/scripts/generate-ui'

const nextConfig = async () => {
  await generateUIIndex('{app}')   // writes generated/{app}/components.ts
  return { /* ...next config... */ }
}
export default nextConfig
```

### tsconfig.json Mapping

```json
// apps/{app}/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@atta/ui/components": ["../../../packages/ui/generated/{app}/components"],
      "@atta/ui/canvas": ["../../../packages/ui/generated/{app}/canvas"]
    }
  }
}
```

**Alias `@atta/ui/components`, never bare `@atta/ui`** — this is what all four live apps do, and app code must import that exact string. Aliasing the bare name instead would make `from '@atta/ui'` "work" in one app while silently resolving to `basic` in every app that didn't, which is precisely the bug ("Import Bypass Bug" under Debugging). One string, aliased everywhere, imported everywhere.

**Why this matters:** When you add a new component to the `animate` library (e.g. `DropdownMenu`), it only becomes available to a consumer if it's exported from `packages/ui/libraries/animate/components/index.ts`. The generated file is just a `export *` passthrough — it has no content of its own.

### When to Use This Pattern

- App has a **single library choice** for all users (set in CMS)
- You want **static bundling** — no dynamic import, smaller JS chunks
- The library choice changes infrequently (rebuild required to switch)

---

## Pattern 2 — Runtime Switching

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

## Composing the two patterns — build-time chrome + runtime per-user surface

The two base patterns are not exclusive. An app can run **both** on **disjoint route subtrees**: a fixed, CMS-driven library for its authenticated chrome, and a per-user runtime choice on a public surface. The build-time generator sees Pattern 1; the public subtree behaves as Pattern 2. Both read their library id through the same central `attalabs` resolver (D-060), so a composing app's build-time alias and its runtime provider agree by construction.

The invariant that makes this work: **each subtree feeds its own `LibraryProvider`, and no shared parent layout wraps one.** A provider mounted in a common ancestor inherits into both subtrees and silently crosses the build-time and per-user paths — the regression this composition keeps re-introducing when someone "saves a hop."

**Which apps compose the patterns, on which routes, and with which providers is an app-level architecture decision — owned by that app's spec, not here.** The worked example, including its locked route-subtree contract and verification recipe, is Herald's: see [`apps/herald-ai/specs/herald-app-architecture.md`](../../../apps/herald-ai/specs/herald-app-architecture.md) §4 "Library resolution — the critical invariant (D-035)", which `packages/governance/doc-owners` binds as the owner of those routes, and [`packages/governance/decisions.md`](../../../packages/governance/decisions.md) D-035 (`Lock: YES`).

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
6. For build-time consumers: the generated file is a passthrough, so no extra step needed — rebuild picks it up

**The contract validator enforces step 5.** You cannot forget — the build fails if any library is missing the export.

### Canonical extension patterns — variants vs. wrappers

When a consumer needs visual behavior the canonical component does not ship by default, choose the lowest-impact extension that satisfies the request without `!important` or descendant selectors at the call site. The library is the single source of truth for component appearance; the call site contributes layout only.

**Add a variant (preferred for additive style options).** The change is a single entry in a `variantClasses` record plus a Union expansion in `packages/ui/types/{group}/{name}.ts`. Examples already in the tree:

- `Button.variant = 'ghost-pill'` (basic) — bordered text-style pill with accent hover. Animate inherits via the shared `buttonVariants` import; retro/brutal use their own `cva` maps and fall back to default styling for unknown variants, which is acceptable since the contract is structural.
- `Textarea.variant = 'bare'` (basic) — strips border/rounded/bg/focus-ring/resize/min-h-16 for nesting inside a styled container.

Animate's `Textarea` re-exports basic's, so adding to basic automatically reaches animate. Retro and brutal each have their own `components/form/textarea.tsx` wrapper (ui-retro-contract-v1 follow-up, #540) implementing the full `TextareaVariant` union against their own `installed/textarea.tsx` idiom (retro: `outline`-based focus; brutal: `ring`-based focus) — previously these were bare passthroughs that silently ignored every variant, which broke Herald's `JDInput` (`textareaVariant='bare'` had no effect, rendering an opaque boxed textarea instead of blending into the popover surface). If you add an EIGHTH variant to the shared `TextareaVariant` union, propagate it to all four wrappers, not just basic's.

**Add a prop (preferred for behavior controls).** Same playbook for typed presets like `Heading.weight`, `SmartPromptInput.surface`, `SmartPromptInput.textareaVariant`. Defaults must preserve byte-identical render for omitting callers. Default to `undefined` and conditionally spread (`{...(prop !== undefined && { variant: prop })}`) when the prop forwards into a vendor primitive that might not understand it — that keeps existing consumers' renders unchanged.

**Add a wrapper (preferred when the change requires reaching into TWO conflicting Tailwind modifier families at once, or when the install file is intentionally locked).** Wrappers live next to the component they extend (`libraries/{name}/components/interactive/{wrapper}.tsx`) and are exported from each library's `components/index.ts`. Libraries that don't customize the underlying primitive can re-export the basic wrapper as a fallback — animate and brutal still do this. Add the wrapper + its `Props` type to `component-contract.mjs`. Canonical example: `DropdownMenuItemTextHighlight`. Both `basic` and `retro` (ui-retro-contract-v1 task 3, #540) ship their OWN twin, each wrapping its own library's `DropdownMenuItem` so a retro dropdown renders retro's item styling rather than basic's. The wrapper accepts `selected?: boolean`, applying `cn('group', selected && 'bg-accent text-accent-foreground', className)` on top of the canonical `focus:bg-accent`/`data-[highlighted]:bg-accent` hover — so a selected item keeps the accent fill as a PERSISTENT commitment even when not focused or hovered.

**Add a universal default (preferred when EVERY consumer needs the same fix, and the install file is intentionally locked).** Not every wrapper adapts a mismatched upstream API or adds an opt-in variant/prop — some exist purely to bake in a default so no call site has to remember a class. Canonical example: `Button`'s `leading-none` default, one wrapper per library (`basic`, `retro`, `brutal`, `animate`), each merging `cn(className, 'leading-none')` before forwarding to its own `installed/button.tsx`. Buttons are single-line UI; the label's default line-height box is taller than a typical `h-4 w-4` icon, so an icon+label button looks vertically off even though `items-center` centers it correctly. Adding `leading-none` at each call site (three Herald topbar buttons did, briefly) is the anti-pattern this section warns against — it works for that one instance and leaves every other button (including ones not yet written) with the same latent bug. A universal-default wrapper takes unconditional `className` (not a variant flag) precisely because there's no case where a button should keep the un-collapsed line-height.

**Second universal-default example: `cursor-pointer`/`disabled:cursor-not-allowed`.** `basic`/`animate`/`brutal`'s `installed/button.tsx` (shadcn/animate-ui/neobrutalism canonicals) omit `cursor-pointer` — native `<button>` defaults to `cursor: default` in Chrome/Safari, unlike `<a>`, which gets `pointer` from the UA stylesheet automatically. That made every `ghost`/`link`/icon-only Button in the app read as non-interactive on hover, while `asChild` buttons wrapping a `<Link>` (rendering as an `<a>`) looked fine by accident. Fixed the same way as `leading-none`: each library's `components/interactive/button.tsx` wrapper merges `cursor-pointer disabled:cursor-not-allowed` into `className` before forwarding to `installed/`. `retro`'s own canonical already bundles `cursor-pointer` in its base `cva` string, so its wrapper needed no change — check the installed base classes before assuming every library needs the same wrapper fix.

**Argument order matters for a `cn()`-merged default — put it LAST.** `cn(className, 'leading-none')`, never `cn('leading-none', className)`. Tailwind v4's `text-{size}` utilities bundle their own default line-height, and tailwind-merge treats that bundled line-height as conflicting with an explicit `leading-*`; the LAST conflicting class in the argument list wins. Since virtually every real button className sets a text-size (`text-xs`, `text-sm`, …), `cn('leading-none', className)` gets silently overridden by that class the moment a real caller passes one — verified: `twMerge('leading-none', 'text-xs')` → `'text-xs'` (dropped), `twMerge('text-xs', 'leading-none')` → both survive. A wrapper default that can be silently clobbered by the exact classes real callers pass is worse than no default — it looks fixed in an isolated test with no `text-*` class and stays broken in production. Verify any override-intended `cn()` default by rendering with `renderToStaticMarkup` (or hitting a real dev server) with a realistic caller className, not just an empty one.

**Wrapping the installed component to fix a container behavior — the `Table` responsive-scroll wrapper.** When the fix isn't a class merged onto the installed element but a *container* the installed element renders itself, wrap the whole installed component. `Table` is the canonical example (`vinaya-pages-v2` task 6): every library's `installed/table.tsx` renders its own `w-full` horizontal-scroll container (`overflow-x-auto` in basic/retro, `overflow-auto` in animate/brutal — both clip on x), but `w-full` has no width floor, so it fails to clip when an ancestor is itself a scroll container (a page shell with `overflow-y-auto`, which CSS promotes to `overflow-x: auto`) — the container's width resolves to the table's `min-w`, nothing clips, and the table overflows the page. Fix: a shared factory `makeScrollableTable(InstalledTable, stickyHeaderClass)` in `lib/scrollable-table.tsx` wraps the installed Table in a transparent `@container/tbl w-full min-w-0 max-w-full` outer div (plus an inner div that carries the sticky/overflow classes) — `max-w-full` caps the width at the parent, `min-w-0` lets it shrink below the table's intrinsic width, which is exactly the constraint the installed container needs before its OWN `overflow-x-auto` will clip and scroll; `@container/tbl` establishes the container-query context the sticky switch below keys off. Each library gets a short `components/table.tsx` wrapper (`export const Table = makeScrollableTable(InstalledTable, STICKY_HEADER)`) and its `index.ts` exports `Table` from there while the other Table parts still come from `../installed/table`. Crucially the wrapper adds NO overflow of its own and does NOT neutralize the installed container — the library's own container is still the scroller, so its per-library styling is preserved (retro's `rounded border-2 shadow-md` frame stays put while its content scrolls inside it). The wrapper exposes a `containerClassName` prop (merged last) so a consumer can extend/override the scroll box (a `max-h-*` body, block margin, etc.). `TableProps` (= `ScrollableTableProps`) is exported alongside. Verified across all four libraries in a real browser at 390px: each scrolls inside its own box, `document.scrollWidth === innerWidth` (no page overflow).

`Table` also carries one behavior prop, **`stickyHeader`** (**opt-in — default OFF**), so a consumer never restyles the header at the call site. It pins the header row while you scroll PAST the table — the header sticks to the nearest scrolling ancestor (a page shell's `overflow-y-auto` region, or the page itself) and leaves when the table scrolls out. There is NO fixed height: the wrapper does NOT trap the sticky inside a horizontal-scroll box (that would pin the header to the box, not the page), it leaves the installed container `overflow-visible` so the ancestor is the scroll context. **Default-off is deliberate for a shared primitive** — pinning is only correct where the table sits inside a scrolling ancestor, and every product (Vāda, Herald, Atta, Vinaya) shares this Table. A consumer that has browser-verified the behavior opts in (`<Table stickyHeader>`); everyone else gets the responsive horizontal-scroll wrapper with no behavior change. (Vinaya passes `stickyHeader` at every call site.)

**The responsive switch is a container query, not a viewport breakpoint (`vinaya-pages-v2` task 6 follow-up).** The `overflow-visible`/sticky classes are gated on `@min-[780px]/tbl:` — the wrapper's outer div is `@container/tbl`, so the switch keys off the table's OWN container width, not the viewport. This is the whole point: a `min-w-[760px]` table only fits once its container is ≥ ~780px, and a viewport breakpoint (`md:` = 768px viewport) can be past its threshold while the container — viewport minus sidebars/padding — is still narrower than the table, so page-sticky mode engages and the table bleeds past the card at that intermediate width. Keying on the container closes that gap: below the fit width the installed container keeps its OWN horizontal scroll (contained box, header not pinned, never overflows the card); at/above it the header pins. A consumer whose table sits under a fixed bar shifts the pinned offset with `containerClassName='@min-[780px]/tbl:[&_thead_th]:top-10'` (same container-query prefix, so the offset only applies in the same mode the pin does).

`stickyHeader` is also why `makeScrollableTable` takes a **second arg** — a per-library, literal (Tailwind-scannable) sticky-header class each library's wrapper passes. Sticky `<th>` cells detach from the row's border (a `border-collapse` quirk), so the pinned header carries its own bottom rule as a **box-shadow** (`shadow-[inset_0_-Npx_0_0_<color>]`) rather than a `border-*` class — a real border on a sticky `th` renders inconsistently under `border-collapse`, the inset shadow does not. Both the shadow's **width and color must replicate each library's REAL row border**, which differ on both axes: width is `-1px` (basic/animate `border-b`) or `-2px` (retro/brutal `border-b-2`); color is **`--border`** for retro, animate and brutal, and **`--border` at 60%** for basic (`border-border/60`).

> **Corrected (`refactor/ui-theme-token-roles`).** This section previously said retro and animate must use **`currentColor`**, on the premise that their rows carry `border-b`/`border-b-2` with no colour class and therefore render at currentColor. **That premise is wrong.** `globals.css` declares `@layer base { * { @apply border-border } }`, so *every* element — including `<tr>` — resolves to `border-color: var(--border)`. A Tailwind `border-b-2` utility sets width only; the colour still comes from that base rule. Meanwhile `currentColor` on a sticky `<th>` is the header's **text** colour (`text-foreground`), so the pinned header underlined at the foreground colour while the rows beneath it underlined at `--border`. On any theme where `--border` ≠ `--foreground` that produced a bright, mismatched rule — precisely the failure the original wording was written to prevent. Verified visually on Vinaya × obsidian-retro (white pinned-header rule over dark rows). Use `var(--border)`. The pinned header's fill is per-library (`bg-card` basic/animate/brutal, `bg-muted` retro) so it opaquely covers rows scrolling under it. This is the canonical "same prop + same contract across libraries, per-library-correct rendering baked into the wrapper" — a consumer writes `<Table stickyHeader>` (or omits it to opt out) and gets a header rule that matches its own rows in every library, with zero sticky/border/background classes at the call site.

**Never reach for `!important` at the call site, or descendant selectors (`[&>form>div]:...`) on a component you own.** Both are signals that the component is missing a variant, prop, or wrapper. Back out and add one of the three.

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

2. **Add tsconfig path aliases** — the alias key is `@atta/ui/components`, not bare `@atta/ui` (see the note under "Generated File Format" above, and "Import Bypass Bug" under Debugging). Every live app aliases this exact string; app code must import it verbatim:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@atta/ui/components": ["../../../packages/ui/generated/your-app/components"],
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

**Import Bypass Bug — two wrong forms, not one:**
If a component (e.g. `Tabs` or `Badge`) renders using the `basic` library styles (or is broken) even though the app's active library is configured as `animate`, check how it is imported.
* **Incorrect — subpath:** `import { Tabs } from '@atta/ui/components/tabs'`
* **Incorrect — bare package name:** `import { Tabs } from '@atta/ui'`
* **Correct — the exact aliased string:** `import { Tabs } from '@atta/ui/components'`
* **Why:** A build-time app's `tsconfig.json` aliases only **exact strings** — `@atta/ui/components` and `@atta/ui/canvas` (plus whatever else that app declares). There is no wildcard and **no bare `@atta/ui` entry**. Anything else falls back to `packages/ui/package.json`'s `exports`, and both fallbacks land on `basic`:
  * `"./components/*"` → `./libraries/basic/installed/*.tsx` — catches the subpath form.
  * `"."` → `./libraries/basic/components/index.ts` — **catches the bare form, hardcoding `basic`.**

  So `@atta/ui` is not "the flat import" — it is the second way to pin yourself to `basic`. Only the exact aliased string reaches `packages/ui/generated/{app}/components.ts`, which is what re-exports the CMS-configured library. **"Flat" here means "no subpath *after* `/components`", never "drop the `/components`".**
* **Why this is easy to get wrong:** both wrong forms typecheck, and both render correctly on any app whose active library *is* `basic` — the bug is invisible until a product switches to `retro`/`animate`/`brutal`, at which point bare-imported surfaces keep rendering `basic` while their correctly-imported siblings switch. A half-themed app, with no error. (`vinaya-pages-v1` task 8, #568: this section previously named only the subpath form, and a brief citing a bare-import call site as "correct precedent" propagated it to 12 files across two products.)
* **Not this bug:** `@atta/ui/shared`, `@atta/ui/topbar`, `@atta/ui/footer`, `@atta/ui/canvas`, `@atta/ui/lib/*`, `@atta/ui/smart-prompt-input`, `@atta/ui/doc-collector`. These resolve to library-independent code (shared primitives, composites, utilities) — they are not library-swapped, so there is no per-app index for them to miss.

**Build-time apps:**
1. Run `bun run validate:ui-contract` — check if the active library is missing the component
2. Check `packages/ui/generated/{app}/components.ts` — what library does it point to?
3. Check that the component is exported from `libraries/{library}/components/index.ts`
4. If the generated file is stale, delete it and rebuild — `generateUIIndex` will recreate it

**Runtime apps:**
1. Check that `LibraryProvider` wraps the component tree
2. Check that `useComponents()` is called inside the provider
3. Remember components are `undefined` until the dynamic import resolves

### TypeScript says `@atta/ui` has no exported member X

For build-time apps: the component must be exported from the **active library's** `components/index.ts`. Adding it to `basic` only won't help if the app uses `animate`.

For runtime apps: the component must be exported from `package.json`'s default export path, which points to `basic/components`.

### Changing the active library for an app

**Build-time:** Change `userInterface.library` in that app's `{app}Config` Sanity document, then rebuild. The generated index will update. `tools/admin`'s per-app `/themes` page also exposes a Library picker + "Set Active Library" action that performs this same write, as the supported alternative to hand-editing Sanity Studio.

**Runtime:** Update the user's `library` field in the app's DB. `LibraryProvider` will re-import the new library on next render.

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

## Cross-product composite components

Some components in `@atta/ui` live OUTSIDE the four-library system because they are
composite primitives shared across consumers and the library
swap doesn't apply to them. `SmartPromptInput` and `DocCollector` are the current
examples. `SmartPromptInput` lives at `packages/ui/smart-prompt-input/` and is
imported as `@atta/ui/smart-prompt-input`; `DocCollector` lives at
`packages/ui/doc-collector/` and is imported as `@atta/ui/doc-collector`. Their
contracts are documented here — the library contract validator does NOT cover
composite components, so any prop addition must update this section instead.

**Library-resolved primitives that newly joined the contract.** `TextReveal`
(typography animation primitive) was added to the contract and all four
libraries — `REQUIRED_COMPONENTS` carries `TextReveal`, `REQUIRED_TYPES`
carries `TextRevealProps`. Unlike `SmartPromptInput`, `TextReveal` IS a
library-swapped primitive: each library provides its own implementation,
and the contract validator covers it (so non-basic libraries can fall back
to the basic implementation via `export { TextReveal } from '../../basic/...'`).
Use `import { TextReveal } from '@atta/ui'` from consumer code; no
injection contract — it resolves like any other library primitive.

**`Breadcrumb`** (`vinaya-pages-v1` task 4, #553) joined the same way, and is the
plainest worked example of "Adding a Component to a Library" above: seven
components (`Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`,
`BreadcrumbPage`, `BreadcrumbSeparator`, `BreadcrumbEllipsis`) plus their seven
Props types in `component-contract.mjs`. `basic/installed/breadcrumb.tsx` is the
shadcn canonical — Radix `Slot`, so `BreadcrumbLink asChild` works natively and
needs no adapter. `animate`, `retro` and `brutal` re-export it from
`'../../basic/installed/breadcrumb'`. Its shared Props types live in
`packages/ui/types/navigation/breadcrumb.ts`, under a `navigation/` type group
that task added alongside the existing groups.

No library ships its own flavor yet: the three basic fallbacks are the honest
state, not a TODO. Give one its own `installed/breadcrumb.tsx` when that
upstream actually has a breadcrumb worth swapping in — the contract already
holds the export, so nothing else moves.

**`Code` / `CodeBlock`** (`vinaya-pages-v1` task 9, #569) joined the contract the
same way — and is the first contracted component with **no upstream canonical in
any library**. That makes it the precedent for a question `Breadcrumb` doesn't
answer: *where does a contracted component live when there is nothing to paste
into `installed/`?*

Verified against the official shadcn registry (`ui.shadcn.com/docs/components`,
2026-07-17): **shadcn ships no `code`, `code-block`, or `snippet` component.** It
ships `Kbd` — keyboard keys, not code display. So `basic/installed/code.tsx`
**does not exist and must not be created**: `installed/` holds a verbatim CLI
paste from that library's own upstream (D-065), and hand-rolling a file there is
exactly the drift the banner calls non-negotiable. Pasting *another* registry's
code-block (shadcn-studio, shadcn.io, retroui) into `basic/installed/` is the
same violation wearing a disguise — basic ← shadcn only, and a third-party item
there is permanent drift no future `bunx shadcn@latest add` can reconcile.

The component is therefore hand-written in the **editable wrapper layer**:
`libraries/basic/components/display/code.tsx`, alongside `display/badge.tsx`
(our own component, same layer, same reason). `retro`/`animate`/`brutal`
re-export it from `'../../basic/components/display/code'` — note that path
points at the **wrapper**, not `installed/`, unlike `Breadcrumb`'s fallback.
Shared Props types live in `packages/ui/types/display/code.ts`, keeping the type
group aligned with the component's own directory the way `display/badge.tsx` ↔
`types/display/badge.ts` already does.

**The rule this establishes:** no upstream canonical ⇒ the wrapper layer, never
`installed/`. `installed/` is for pastes; if there is nothing to paste, the file
should not exist. A contracted component with no upstream is a normal, finished
state — not a placeholder waiting for an install.

`Code` is an inline `<code>` chip; `CodeBlock` is a `<pre>` block that holds
**only** code, with explanatory prose kept outside it. Both merge `className`
LAST (`cn(base, className)`) — they are a base component's own styling, which a
caller may legitimately override, which is the opposite case from `Button`'s
`leading-none` universal default (see "Argument order matters" above: that one
merges last *because* it must always win). Both are hook-free and carry no
`'use client'`, so they render in a server component; adding a copy-to-clipboard
button would force a client boundary on every consumer and is deliberately not
part of the contract.

### Governance — shared composites resolve NO library; consumers inject

> **Rule:** A shared composite component MUST NOT import from any concrete
> library directory (`packages/ui/libraries/{basic|animate|retro|brutal}/...`).
> Instead it MUST declare a `components` prop and resolve primitives via that
> prop. The consuming app injects its active library's primitives from
> `@atta/ui` (build-time pattern) or `useComponents()` (runtime pattern).

This is the `#213` lesson: when a shared input hard-imports `libraries/basic/installed/*`,
products on `animate` / `retro` / `brutal` silently render the basic
versions inside it, breaking visual coherence and theme-token discipline.
It also forecloses a runtime per-user library — a user who has chosen
`brutal` sees a `basic` input.

**Contract every shared composite MUST follow:**

1. **No library imports in the composite tree.** `grep` for
   `'../../libraries/'` inside the package — it should match nothing.
2. **`components?: { Foo?, Bar? }` prop on the public API.** Include only the
   primitives the composite actually renders. Each entry is optional so the
   composite degrades gracefully during a runtime library's first-render
   window. Mirror Herald `JDInput`'s `Button ? <Button…> : <button>` pattern
   for fallbacks — never crash on `undefined`.
3. **Threaded via a private context** (e.g. `SmartPromptComponentsProvider`)
   so internal subtrees can resolve injected primitives without prop drilling.
4. **Both consumer call sites updated in the same PR** as the contract is
   added. The composite isn't done shipping until every existing consumer
   passes `components`.

`SmartPromptInput` is the canonical example — see
`packages/ui/smart-prompt-input/vendor/components-context.tsx` and the
`components` entries in `apps/vada-ai/web/.../DeliberateSection.tsx` and
`apps/herald-ai/web/src/components/envoy/JDInput.tsx`.

**Stop conditions when applying this rule to a NEW composite:**

- A vendored primitive turns out to be used and has no `@atta/ui` library
  equivalent → STOP and report. Do NOT reintroduce a hardcoded
  `libraries/basic/...` import. Add the primitive to all four libraries (and
  the component contract) first.
- The runtime consumer can't supply a primitive through `useComponents()`
  without a provider change → STOP. Wiring a fresh provider is in scope; a
  silent hardcoded-basic fallback is not.

### `SmartPromptInput` — Gemini-style prompt entry

Located at `packages/ui/smart-prompt-input/smart-prompt-input.tsx`. Wraps the
vendored `PromptInput*` primitives (`vendor/prompt-input.tsx`) and adds:

- Attachment tile header (tile-with-meta layout)
- Single-line ↔ multi-line responsive switching driven by textarea
  `scrollHeight` measurement
- Optional caller-provided **actions slot** (left or right) and **submit slot**
- Caller-tunable **textarea className** for one-off layout overrides

#### Layout modes

The component runs in one of two layout modes, chosen automatically:

| Mode | When | Where actions / submit live |
|------|------|----------------------------|
| Inline | textarea is single-line AND no attachments | On the same row as the textarea |
| Footer | otherwise | In `PromptInputFooter` under the textarea |

Inline mode no longer requires consumer-provided `actions` — a no-`actions`
single-line consumer (Herald `JDInput`) still gets the submit rendered inline
beside the textarea. Footer's no-`actions` submit is gated on `!inlineMode`
to avoid a duplicate. Attachment-count tracking is unconditional: the count
is observed even when no `actions` are provided, so attachment presence
flips inline → footer mode for every consumer (not just Vāda).

The submit element (default `PromptInputSubmit`, or `submitSlot` when provided)
is always rendered exactly once — in whichever mode is active.

#### Props

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `onSubmit` | `(text, files) => void` | — | Required. Receives the final text + converted file parts. |
| `placeholder` | `string` | — | Textarea placeholder. |
| `submitOn` | `'enter' \| 'cmdenter' \| 'button'` | `'enter'` | Keyboard submission policy. |
| `ctaLabel` | `string` | — | If set, replaces the icon submit with a full-width CTA bar. Disables `submitSlot`. |
| `hint` | `string` | — | Small mono hint in the footer. |
| `accept` | `string` | — | File-input accept string. Shows the action menu (paperclip). |
| `maxFiles` | `number` | — | Caps the number of attachments accepted (drop, paste, or file dialog). Omit for no cap. Forwarded straight to the vendored `PromptInput`'s own `maxFiles`. Exceeding it (or `accept`) now both surface a rejection message via `handleError` — previously only `accept` rejections were shown, `max_files`/`max_file_size` were silently swallowed. |
| `status` | `SmartPromptStatus` | `'idle'` | Drives the submit icon / spinner. |
| `onStop` | `() => void` | — | Called when user clicks Stop during streaming. |
| `className` | `string` | — | On the outer wrapper. |
| `pasteToFileChars` | `number` | — | Paste of ≥ N chars becomes a file attachment instead of textarea fill. |
| `actions` | `React.ReactNode` | — | Action chips slot (e.g. Vāda's TeamPicker). Responsive placement per layout mode. |
| `actionsPosition` | `'left' \| 'right'` | `'right'` | Side of the textarea (inline) / footer (multi-line) the `actions` occupy. |
| `submitSlot` | `React.ReactNode` | — | Caller-provided submit element replacing the default `PromptInputSubmit`. Caller owns submit logic, Cmd+Enter behavior, and accessibility for the node. Honored in both inline and footer modes. **Ignored when `ctaLabel` is set (full-width CTA path).** Used by Vāda's hero to render a morphing Configure ↔ Submit button. |
| `textareaClassName` | `string` | — | Extra className merged onto the inner `<textarea>` AFTER vendor defaults (`field-sizing-content max-h-40 min-h-16 overflow-y-auto`). Use to defeat a specific utility — e.g. `min-h-0` to allow the textarea to collapse to a true single line. Tailwind-merge resolves conflicts in favor of the caller's class for the same property family. |
| `textareaVariant` | `TextareaVariant` | — | Forwarded to the injected `Textarea` (`undefined` keeps the library default). Pair with `surface='popover'` to use `'bare'` — strips the textarea's own border / rounding / focus ring / resize handle / `min-h-16` baseline so it blends into the surrounding `InputGroup`. |
| `surface` | `'card' \| 'popover' \| 'bare'` | `'card'` | Container chrome preset. `'card'` is the byte-identical original (`bg-card`, `focus-within:ring-1`). `'popover'` elevates the InputGroup to `bg-popover` + `rounded-xl shadow-lg` and moves the focus halo to the OUTER wrapper (sidesteps `overflow-hidden` clipping). `'bare'` strips border / background / rounding / resting ring for hosts that supply their own chrome. |
| `onTextChange` | `(text: string) => void` | — | Observe-only callback fired on every input. Lets consumers mirror the textarea text into their own state in real time WITHOUT making the input controlled. Vāda uses it to drive `hasQuestion` for the morphing submit button. Herald passes nothing — byte-identical. |
| `onAttachmentsChange` | `(count: number) => void` | — | Observe-only callback fired whenever the internal attachment count changes (paste-to-file conversion, X-click removal). Lets consumers gate a `submitSlot` button on attachment presence — e.g. Vāda's `MorphingSubmitButton` stays visible when only an attachment is present (textarea empty). |
| `components` | `SmartPromptComponents` | `{}` | **INJECTION CONTRACT** — see Governance section above. Consumer-injected library primitives: `Textarea`, `Button`, `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`. Each is optional; the composite degrades to a native HTML element with sane styling when undefined (graceful first-paint window for runtime libraries). Vāda injects from `@atta/ui` build-time; Herald injects from `useComponents()`. The shared composite resolves NO library itself. |

#### Herald default note

Post-injection contract, Herald's tree is the active library's `Textarea` /
`Button` (whatever the user's runtime library resolved to), NOT a vendored
basic primitive. That was always the intent — the previous hardcoded
`libraries/basic/...` import was a bug.

The earlier "byte-identical default" promise on the Herald `JDInput` render
path no longer holds: post-PR #207, Herald's `JDInput` opts in to
`textareaVariant='bare'` and `surface='popover'` to align visually with
Vāda's hero. This was an explicit Principal call, not a regression. Any
future addition to the composite must still preserve the Herald-equivalent
defaults — i.e. omitting `actions`, `submitSlot`, `textareaClassName`,
`textareaVariant`, and `surface` must reproduce the original card-surface
render — so a hypothetical third consumer can adopt the composite without
inheriting Vāda or Herald-specific chrome.

#### Adding a new caller-controllable slot

If a new product needs to customize SmartPromptInput, add a new optional prop
the same way `submitSlot` was added:

1. **Additive only.** Default behavior with the prop unset must match the
   previous behavior bit-for-bit. Herald's JDInput is the canary.
2. **Honor it in every code path the default would render in.** `submitSlot`
   replaces the default submit in BOTH inline and footer modes — partial
   replacement is a confusing footgun.
3. **Update this section** in the same PR (D-058 doc-coherence). The props
   table is the contract; if it's not here, future agents won't know the slot exists.
4. **No library swap.** SmartPromptInput is a single implementation. Do not
   create per-library variants.

### `DocCollector` — drop-zone document tile collector

Located at `packages/ui/doc-collector/doc-collector.tsx`, imported as
`@atta/ui/doc-collector`. A flat-list document collector — a drop-zone for
`.md`/`.pdf` files plus a plain textarea + explicit Add button — distinct
from `SmartPromptInput`'s one-message-plus-attachments contract. The
Principal explicitly ruled out extending `SmartPromptInput` for this
(2026-07-06/07 design-iteration session): a flat list of standalone
documents doesn't fit a single-message-with-attachments shape. It is a new,
separate, standalone primitive.

`DocCollector` shares `AttachmentChip` with `SmartPromptInput` — the tile
visual lives at `packages/ui/lib/attachment-chip.tsx` (`AttachmentChip` +
`AttachmentChipProps`) as a common export, rather than being duplicated.
`SmartPromptInput` imports it from there too.

#### Behavior

- **Instant tile on drop, eager resolution.** Dropping a `.md`/`.pdf` file
  inserts a tile with `status: 'resolving'` immediately — before resolution
  completes — then patches it to `status: 'ready'` (with resolved `text`) or
  `status: 'error'`. `.md`/text files resolve via `file.text()`; `.pdf`
  files resolve via a dynamic `import('unpdf')` inside the drop handler
  (never a static top-level import, so non-`DocCollector` consumers of
  `packages/ui` never pay for PDF.js in their bundle), mirroring the exact
  `extractText` call shape used server-side in
  `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts`.
- **Commit gating.** Typed/pasted text is NEVER auto-converted into a tile
  on any length threshold — unlike `SmartPromptInput`'s `pasteToFileChars`,
  there is no such path here. A tile is created only on explicit click of
  the Add button.
- **Newest-first ordering.** The tile row (conditionally rendered only when
  `items.length > 0`, `flex items-center gap-2 overflow-x-auto`) always shows
  the most recently committed item first, sorted by `addedAt`.
- **Custom sources (resolve-then-insert).** Each entry in `customSources`
  renders its own labeled row (`Input` + `Add` button) below the drop zone.
  Unlike file drops, a custom source resolves *before* any tile is created —
  `source.resolve(value)` is awaited first; only on success is a
  `status: 'ready'` tile inserted. On rejection, nothing is added to the
  list — the row reports the error itself (via `source.onError` if the
  consumer provided one, else an inline message that self-clears after 4s).
  This intentionally differs from the drop-zone's instant-tile-then-patch
  pattern: a dropped file is a real artifact worth showing even if
  unreadable, but a mistyped username/URL shouldn't leave a permanent error
  tile in the collected-documents list.

#### Props

| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `onItemsChange` | `(items: DocCollectorItem[]) => void` | — | Fired on every items-array change — drop, resolution completing, removal, Add commit, custom-source resolution. Consumers read resolved `text` from here; `DocCollector` does not compute word/token counts itself. |
| `accept` | `string` | `'.md,.pdf'` | File-drop accept string. |
| `className` | `string` | — | Outer wrapper className. Consumers needing stable multi-column layouts (e.g. Herald's Bulk Audit, two `DocCollector`s side by side) pin an explicit height here so the drop zone — not the whole card — absorbs the height delta between empty and populated states. |
| `components` | `DocCollectorComponents` | `{}` | **INJECTION CONTRACT** — see Governance section above. Consumer-injected library primitives: `Textarea`, `Button`, `Input`, `Card`, `CardContent`. Each is optional; the collector degrades to a native `<textarea>`/`<input>`/`<button>` (or, for the outer container, a hand-rolled `div` when `Card`/`CardContent` are absent) during the first-paint window for runtime libraries. When injected, the outer container renders the consumer library's `Card` (its own border/shadow/radius) with `Card`'s padding/gap neutralised and re-applied on `CardContent` to keep the p-3/gap-3 spacing. `DocCollector` resolves NO library itself. |
| `customSources` | `DocCollectorCustomSource[]` | — | Extra named ways to add an item beyond file-drop/paste — e.g. Herald's "Add by Herald Username" and "Add by URL" rows. See below. |

`DocCollectorItem` shape: `{ id, filename, kind: 'md' | 'pdf' | 'text', status: 'resolving' | 'ready' | 'error', text?, error?, addedAt, meta?: unknown }`.
`meta` is an opaque per-item payload — `DocCollector` never reads or interprets it, only stores and returns it. It exists so a `customSources.resolve()` can round-trip extra structured data to the consumer alongside `text`/`filename` (e.g. Herald's CV-by-username source stashes `{ username }` in `meta` so `BulkAudit.tsx` can tell the `/api/audit` batch endpoint to re-fetch the *live* profile at audit time instead of trusting the resolved-at-add-time text snapshot).

`DocCollectorCustomSource` shape: `{ label: string, placeholder: string, type?: string, resolve: (value: string) => Promise<{ text: string; filename: string; meta?: unknown }>, onError?: (message: string) => void }`. `resolve` throwing rejects the add (no tile created); `onError` is optional so `DocCollector` stays toast-library-agnostic — omit it and the row falls back to an inline error message instead.

#### Injection contract implementation

`packages/ui/doc-collector/components-context.tsx` mirrors
`smart-prompt-input/vendor/components-context.tsx`'s shape exactly — a React
context + `DocCollectorComponentsProvider` + `useDocCollectorComponents()`
hook. `DocCollector` chose the same context pattern as `SmartPromptInput`
(rather than direct prop-threading) for consistency across the two
composites, even though `DocCollector`'s own tree is shallow enough that
prop-threading alone would have worked — matching precedent keeps the
injection mechanism predictable for future composites.

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
| `packages/ui/smart-prompt-input/smart-prompt-input.tsx` | Composite prompt entry — see "Cross-product composite components" above |
| `packages/ui/doc-collector/doc-collector.tsx` | Composite document collector — see "Cross-product composite components" above |
| `apps/{app}/web/tsconfig.json` | Path aliases that point `@atta/ui` at the generated index |
| `apps/{app}/web/next.config.ts` | Calls `generateUIIndex` at build time |
