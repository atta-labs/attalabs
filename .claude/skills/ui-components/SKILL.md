---
name: ui-components
description: Rules for building UI across ALL Atta AI apps — component usage, CSS variables, theming, typography, inline styles, library system
---

# UI Components — Atta AI (All Products)

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
| `bg-[#1A1610]` | RULE 2 — use CSS variable class |
| `style={{ color: '#E8D5B7' }}` | RULE 2 + RULE 3 |
| `style={{ padding: '16px' }}` | RULE 3 — use Tailwind |
| `import { FaArrow } from 'react-icons/fa'` | RULE 4 — lucide-react only |
| `fontFamily: 'Playfair Display'` | RULE 5 — use font-serif class |
| Hardcoded Google Fonts URL in layout | Theme system — use NextWebShell |
| Calling CMS directly in a component | Use typed queries from `@atta/cms` |
| Different `<style>` block per component | Theme CSS is global, injected once at root |
