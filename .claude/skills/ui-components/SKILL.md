---
name: ui-components
description: Rules for building UI across ALL Atta AI apps — component usage, CSS variables, theming, typography, inline styles, library system
---

# UI Components — Atta AI (All Products)

> # ⛔ URGENT — DO NOT EDIT `packages/ui/libraries/*/installed/*`
>
> **Each library's `installed/` holds the vendored canonical from THAT library's design-system
> source — installed via shadcn CLI, pasted verbatim, NEVER hand-edited.** Each of the four
> libraries comes from a different upstream:
>
> | Library | Upstream source | CLI install command |
> |---|---|---|
> | `basic` | shadcn (`ui.shadcn.com`) | `npx shadcn@latest add <component>` |
> | `animate` | animate-ui (`animate-ui.com`) | `npx shadcn@latest add @animate-ui/...` |
> | `retro` | retroui | shadcn-compatible registry |
> | `brutal` | neobrutalism (`neobrutalism.dev`) | shadcn-compatible registry |
>
> **The rule:** `installed/<comp>.tsx` is a verbatim CLI paste from its library's upstream.
> Even a one-character change is a hard rule violation. NEVER hand-roll your own
> implementation in `installed/`; ALWAYS pull from upstream.
>
> ### How to add or change a primitive — the right workflow
>
> 1. **Install via CLI** (or paste the canonical from the upstream's docs) into the right
>    library's `installed/<comp>.tsx`. Adjust ONLY the import paths to match our directory
>    layout (e.g. `@/lib/utils` → `../../../lib/utils`) — nothing else.
> 2. **Check if the upstream's exported API matches our contract** (`packages/ui/component-contract.mjs`).
>    Most upstreams export flat named components (`Tabs`, `TabsList`, `TabsTrigger`,
>    `TabsContent`) — those match our contract directly, just re-export from `components/index.ts`
>    and you're done.
> 3. **If the upstream's API differs from our contract** (e.g. retroui exports
>    `Object.assign(Tabs.Root, { List, Trigger, Content })` — dotted API instead of flat),
>    **add a wrapper** in `components/<comp>.tsx` (or `components/interactive/`) that adapts
>    the dotted API to our contract's flat named exports. The wrapper IS editable. `installed/`
>    stays verbatim.
> 4. **If you want to vary appearance for one library (e.g. add a variant prop)** — that goes
>    in the wrapper layer (`components/interactive/<comp>.tsx`), NOT in `installed/`. The
>    `Button.ghost-pill` variant is the canonical example: basic's `installed/button.tsx` is
>    shadcn canonical, and the additional variant lives in
>    `packages/ui/libraries/basic/components/interactive/button.tsx`.
>
> ### When a consumer in `components/` imports from `installed/` and that's blocking you
>
> Switch the import to the editable `components/interactive/<component>` so the consumer
> benefits from the wrapper / variants without touching `installed/`. Worked example:
> `model-picker.tsx` should import `Button` from `../interactive/button`, NOT
> `../../installed/button` — see PR #207.
>
> Existing variant additions like `ghost-pill`, `'bare'` (Textarea), and `'link'` (NextLink)
> are the canonical examples — see "Canonical extension patterns" in
> `.claude/skills/ui-library-system/SKILL.md`.
>
> ### Why this rule is non-negotiable
>
> The `installed/` files MUST stay verbatim against their upstream source so future upstream
> updates can be **pasted in** instead of **reconciled by hand**. Every deviation in
> `installed/` becomes drift that has to be reconciled forever after.
>
> **Red flags that mean STOP — you are about to violate this rule:**
> - "I'll just change `text-sm` to `text-base` in `installed/`, it's one line."
> - "I'll add `font-mono` to the trigger here, it's a small tweak."
> - "I'll fix the hover colour in `installed/`, easier than adding a wrapper."
> - "Our `installed/<comp>.tsx` was already drifted from upstream when I got here, so a bit
>   more drift is fine."
>
> No to all of them. Either pull the upstream canonical (paste verbatim) or add a wrapper.
> If you find yourself wanting to edit `installed/`, STOP and pick one of the workflow steps above.
>
> **One legitimate edit case:** restoring `installed/<comp>.tsx` to canonical when it has
> drifted. Pasting the upstream verbatim back into `installed/` IS the rule's spirit ("stay
> verbatim against upstream") — that's reconciling drift, not adding it. Do this whenever
> you notice drift; document the upstream URL in the commit message.

---

## Context

All Atta AI products (Herald, Vada, Atta, Vitakka) share a single UI system via `@atta/ui`. The active component library and theme are set per-product in Sanity CMS and injected at the root layout via `NextWebShell`. These rules apply to every product, every surface.

---

## RULE 1: Use UI Components — NEVER Raw HTML Markup

Every element that has a component equivalent **MUST** use the component. Raw HTML primitives (`<button>`, `<input>`, `<div>` as interactive, `<p>`, `<h1>` etc.) are **FORBIDDEN** when a component exists.

```tsx
// ✅ Always
import { Button } from '@atta/ui/components/button'
import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components/card'
import { Input } from '@atta/ui/components/input'
import { Badge } from '@atta/ui/components/badge'
import { Textarea } from '@atta/ui/components/textarea'
import { Heading, Text } from '@atta/ui/shared'

<Button variant="ghost">Click me</Button>
<Input placeholder="Type here..." />
<Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>

// ❌ Never
<button className="...">Click me</button>
<input type="text" className="..." />
<div className="card ...">...</div>
```

**Never build custom primitives.** Do not create custom Button, Card, Input, Dialog, Badge, etc. from scratch. Extend shadcn/ui components when customization is needed.

---

## RULE 1b: Missing Component? ADD IT to `@atta/ui` — NEVER Roll Custom

If a primitive you need (Tabs, Accordion, Dialog, Select, Popover, etc.) does not exist in `@atta/ui`, you **MUST** add it to the library. **Do not** hand-roll a substitute in the app using `<Button>` + conditional rendering, `<div>` + state, or any other workaround.

This includes "simple" cases like tab bars, toggle groups, segmented controls, or accordion-style disclosures. If it has a shadcn/Radix primitive, it belongs in `@atta/ui`.

**Required workflow when a component is missing:**

1. Create the component in `packages/ui/libraries/basic/installed/{component}.tsx` (shadcn base)
2. If the active library is `animate` / `retro` / `brutal`, create the styled variant in `packages/ui/libraries/{library}/installed/{component}.tsx`
3. Export it from **every** library's `components/index.ts` (animate/retro/brutal can fall back to basic with `export { Tabs } from '../../basic/installed/tabs'`)
4. Add the component + Props type to `REQUIRED_COMPONENTS` and `REQUIRED_TYPES` in `packages/ui/component-contract.mjs`
5. Run `bun run validate:ui-contract` — build fails if any library is missing the export
6. Then use `import { Tabs } from '@atta/ui'` in the app

**Red flags that mean STOP — you are about to violate this rule:**
- "I'll just make a quick tab bar with Buttons"
- "A simple `<div>` with onClick is enough here"
- "I'll wrap it in motion.div myself since the library doesn't have it"
- "It's just this one page, I'll inline it"

Every one of these is a custom primitive in disguise. Stop, add the component to `@atta/ui`, then use it.

---

## RULE 2: CSS Variables — NEVER Hardcoded Colors

All colors **MUST** come from CSS variables via Tailwind semantic classes. Hardcoded hex values, oklch literals, or `bg-[#hex]` arbitrary Tailwind values are **FORBIDDEN**.

```tsx
// ✅ Always — semantic CSS variable classes
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground border border-border" />
<span className="text-muted-foreground" />
<Badge className="bg-accent text-accent-foreground" />
<div className="bg-destructive text-destructive-foreground" />
<div className="bg-primary text-primary-foreground" />

// ❌ Never — hardcoded colors
<div className="bg-[#1A1610] text-[#E8D5B7]" />
<div style={{ background: '#0D0B08' }} />
<div className="bg-zinc-900 text-amber-200" />   // Tailwind palette colors, not theme
```

### Full CSS Variable Token Reference

| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| `bg-background` | `--background` | Page background |
| `text-foreground` | `--foreground` | Primary body text |
| `bg-card` | `--card` | Card, surface backgrounds |
| `text-card-foreground` | `--card-foreground` | Text on cards |
| `bg-primary` | `--primary` | Primary action color |
| `text-primary-foreground` | `--primary-foreground` | Text on primary |
| `bg-secondary` | `--secondary` | Secondary surfaces |
| `text-muted-foreground` | `--muted-foreground` | Labels, metadata, captions |
| `bg-muted` | `--muted` | Muted backgrounds |
| `bg-accent` | `--accent` | Badges, CTAs, highlights |
| `text-accent-foreground` | `--accent-foreground` | Text on accent |
| `bg-destructive` | `--destructive` | Error states |
| `text-destructive-foreground` | `--destructive-foreground` | Text on error |
| `border-border` | `--border` | Dividers, outlines |
| `outline-ring` | `--ring` | Focus rings |
| `bg-input` | `--input` | Input backgrounds |
| `bg-success` | `--success` | Success states |
| `bg-warning` | `--warning` | Warning states |

---

## RULE 3: Inline Styles Are FORBIDDEN

`style={{}}` is **FORBIDDEN** unless a value is provably impossible with Tailwind classes. This applies to all files in all products.

**The only legitimate exceptions:**
- Dynamically computed numeric values (e.g., `style={{ height: `${pixels}px` }}` when the value is runtime-computed and no Tailwind class exists)
- CSS custom property injection that Tailwind cannot do: `style={{ '--agent-color': color } as React.CSSProperties}`

```tsx
// ✅ Always use Tailwind
<div className="p-4 rounded-lg border border-border bg-card" />

// ✅ Legitimate exception — runtime computed value
<div style={{ width: `${progressPercent}%` }} />

// ✅ Legitimate exception — CSS custom property injection
<div data-agent="strategist" style={{ '--agent-color': customColor } as React.CSSProperties} />

// ❌ Forbidden — use Tailwind instead
<div style={{ padding: '16px', borderRadius: '8px' }} />
<div style={{ color: 'var(--foreground)' }} />   // Use className="text-foreground"
```

---

## RULE 4: Icons — lucide-react ONLY

All icons **MUST** use `lucide-react`. No other icon library. No inline SVG for standard icons.

```tsx
// ✅
import { ArrowRight, Check, AlertTriangle, ChevronDown } from 'lucide-react'
<ArrowRight className="h-4 w-4" />

// ❌
import { FaArrowRight } from 'react-icons/fa'
<svg viewBox="..."><path d="..." /></svg>   // custom inline SVG for standard icons
```

---

## RULE 5: Typography — Use Font Classes

Three semantic font families. Always use the class, never hardcode font names.

| Role | Tailwind Class | CSS Variable | Usage |
|------|---------------|-------------|-------|
| Headings, display | `font-serif` | `--font-serif` | H1–H3, grade badges, emphasis |
| Technical, code-like | `font-mono` | `--font-mono` | Signal titles, data, code |
| Body, UI | `font-sans` | `--font-body` | Labels, buttons, navigation, paragraphs |

```tsx
// ✅
<h1 className="font-serif text-3xl font-bold text-foreground">Report Title</h1>
<span className="font-mono text-sm text-muted-foreground">S-TIER</span>
<p className="font-sans text-base text-foreground">Body copy</p>

// ❌
<h1 style={{ fontFamily: 'Playfair Display' }}>...</h1>
<span className="font-['DM_Mono']">...</span>
```

Font values (which Google Font is used for each role) are set by the active theme in CMS and injected at the root layout — never hardcode font names.

---

## The UI Library System

`@atta/ui` ships four component libraries (`basic`, `animate`, `retro`, `brutal`). Each product uses exactly one, resolved either at build time (Vada pattern) or runtime (Herald pattern).

```tsx
// ✅ Always import from the default alias — resolves to the active library
import { Button, Card, Badge, Input } from '@atta/ui'

// ❌ Don't hard-switch libraries in component code
import { Button } from '@atta/ui/brutal/components'   // unless specifically required
```

Shared cross-library primitives (`Heading`, `Text`, `Flex`, `AgentThinkingText`) live in `@atta/ui/shared` and are always available regardless of active library.

**For the full architecture** — build-time generation, runtime switching, adding apps, debugging resolution — see [`.claude/skills/ui-library-system/SKILL.md`](../ui-library-system/SKILL.md).

---

## Theme Loading from CMS

### How It Works

Each product has a CMS singleton (`heraldConfig`, `vadaConfig`, `attaConfig`, `vitakkaConfig`) that stores:
- **Active theme** — color tokens for light/dark schemes
- **Active library** — which UI library to use (`basic` | `retro` | `animate` | `brutal`)
- **Color scheme** — `dark` | `light`

The root `layout.tsx` of each product fetches this config and passes it to `NextWebShell`, which:
1. Generates CSS custom properties from theme color tokens
2. Injects a `<style>` block with all `--variable: value;` declarations
3. Loads Google Fonts dynamically via `<link>` tags based on `theme.typography`
4. Wraps everything in `LibraryProvider` (active library) + `AuthProvider` + `ToastProvider`

```tsx
// apps/{product}/web/src/app/layout.tsx
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { getVadaConfig } from '@atta/cms'   // or getHeraldConfig, getAttaConfig, etc.
import { cmsClient } from '@atta/cms'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getVadaConfig(cmsClient)
  return (
    <NextWebShell config={config} styleId="vada-theme">
      {children}
    </NextWebShell>
  )
}
```

### What NextWebShell Injects

```html
<!-- Fonts — loaded from Google Fonts based on theme.typography -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" />

<!-- Theme — all CSS variables set from CMS theme tokens -->
<style id="vada-theme">
  :root {
    --background: oklch(12% 0.02 60);
    --foreground: oklch(88% 0.05 70);
    --accent: oklch(70% 0.15 75);
    --font-sans: 'DM Sans', sans-serif;
    --font-serif: 'Playfair Display', serif;
    --font-mono: 'DM Mono', monospace;
    /* ... all tokens */
  }
</style>
```

### Reading Theme Config in a Route

```tsx
import { getHeraldConfig, cmsClient } from '@atta/cms'

const config = await getHeraldConfig(cmsClient)
const theme = config?.userInterface?.theme
const colorScheme = config?.userInterface?.colorScheme ?? 'dark'
const library = config?.userInterface?.library?.id ?? 'basic'
```

### Adding a New Product Theme

1. Create a `{product}Config` document in Sanity with a linked theme and library
2. Add a `get{Product}Config` query function in `packages/cms/src/queries/product-ui-config.ts`
3. Use `NextWebShell` in the product's root `layout.tsx` with `style="` a unique `styleId`

---

## `@atta/ui/topbar` `TopBar` — responsive contract

`TopBar` from `@atta/ui/topbar` is the shared topbar used by every product's signed-in app chrome (Vāda, Herald, Atta, Vitakka; AEG Studio uses it via `withAuth={false}`). It exposes four mountable slots:

| Slot | Where it renders ≥ md | Where it renders < md |
|------|----------------------|-----------------------|
| `signedInLinks` (centered nav links) | Absolutely centered between logo and the right cluster | Inside the hamburger sheet, stacked vertically with `h-14` rows |
| `extraActions` (right-cluster buttons) | In the right cluster, **immediately before** `accountMenu` | Inside the hamburger sheet, **below** the nav links and **above** `accountMenu` |
| `accountMenu` (Sign out / `<UserButton/>`) | At the end of the right cluster | Inside the hamburger sheet, **below** `extraActions` |
| `SignInButton` (signed-out only) | In the right cluster, alone | Inside the hamburger sheet |

**Below `md` the topbar collapses to: logo · `ColorSchemeToggle` · hamburger.** Nothing else renders inline. The hamburger renders unconditionally below `md` because there is always at least Sign-in or account UI to surface.

When wiring an action that belongs in the right cluster (Settings gear, theme switcher, owner-only buttons): use `extraActions` and trust the responsive contract — your button will appear in the desktop cluster and inside the mobile sheet automatically. Do NOT manually duplicate it in a custom mobile row; that creates two-place-to-fix drift.

When a button has both icon and label (Sign out, Settings, Theme — Herald's pattern post-D-061): always render the label text. Do **not** wrap it in `<span className='hidden md:inline'>` — the label is hidden in the desktop cluster only by the topbar's own breakpoint, not by per-button visibility classes. Inside the mobile sheet the label needs to be visible.

The contract lives at `packages/ui/topbar/index.tsx` (single source of truth). Adding a new slot (or changing where `extraActions` renders) requires updating every consumer's mental model — touch with care.

---

## Layout Philosophy

These rules apply to all products:

- **Single column, editorial layout** — not a dashboard
- **Generous whitespace** — premium product feel
- **Information density increases as user scrolls** — heaviest content at bottom
- **Decision anchors** (grade, primary CTA, key result) are always the most visually dominant element
- Must pass the **Print Test** — content should read well printed on paper, not just on screen

---

## Anti-patterns

| Anti-pattern | Rule |
|-------------|------|
| `<button>` instead of `<Button>` | RULE 1 — use UI components |
| Custom hand-rolled Card/Badge/Input | RULE 1 — extend shadcn/ui |
| Custom tab bar built from `<Button>` + state | RULE 1b — add `Tabs` to `@atta/ui` |
| Custom accordion built from `useState` + `<div>` | RULE 1b — add `Accordion` to `@atta/ui` |
| "I'll inline it just this once" | RULE 1b — no one-offs, add it to the library |
| `bg-[#1A1610]` | RULE 2 — use CSS variable class |
| `style={{ color: '#E8D5B7' }}` | RULE 2 + RULE 3 |
| `style={{ padding: '16px' }}` | RULE 3 — use Tailwind |
| `import { FaArrow } from 'react-icons/fa'` | RULE 4 — lucide-react only |
| `fontFamily: 'Playfair Display'` | RULE 5 — use font-serif class |
| Hardcoded Google Fonts URL in layout | Theme system — use NextWebShell |
| Calling CMS directly in a component | Use typed queries from `@atta/cms` |
| Different `<style>` block per component | Theme CSS is global, injected once at root |
