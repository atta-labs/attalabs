---
name: ui-cms-theme
description: How the CMS theme and UI config system works across all Atta AI products — Sanity schemas, theme generation, font loading, product configs
---

# CMS Theme System — Atta AI

## Context

All Atta AI products get their visual identity (colors, fonts, UI library) from Sanity CMS. The theme is fetched server-side at the root layout, injected as CSS variables, and never hardcoded in application code. This enables runtime theme switching without rebuilding.

---

## Architecture

```
Sanity CMS
├── {product}Config singleton     # Per-product UI configuration
│   └── userInterface
│       ├── theme → CMSTheme     # Colors + typography + spacing + shadows
│       ├── colorScheme          # 'dark' | 'light'
│       └── library → CMSLibrary # 'basic' | 'retro' | 'animate' | 'brutal'
│
└── Theme document (CMSTheme)
    ├── light: Record<string, color>   # Light scheme color tokens
    ├── dark: Record<string, color>    # Dark scheme color tokens
    ├── typography: { fontSans, fontSerif, fontMono }
    ├── spacing: { radius, spacing }
    └── shadows: { shadow, shadowMd, ... }

@atta/cms package
├── queries/product-ui-config.ts   # getHeraldConfig, getVadaConfig, etc.
├── queries/theme.ts               # getThemeById, getThemes
├── utils/theme.ts                 # generateThemeCSSForScheme, generateThemeCSS
├── utils/font-loader.ts           # getGoogleFontsUrl, loadThemeFonts
└── types.ts                       # CMSTheme, PortalUiConfig, ThemeTypography

@atta/ui package
├── lib/next-web-shell.tsx         # Root provider: reads cookie + config → injects CSS + fonts
├── lib/color-scheme.ts            # Shared cookie/attribute/default contract
└── lib/color-scheme-toggle.tsx    # Client toggle — flips <html data-theme> + writes cookie
```

---

## Product Config Queries

Each product has a dedicated config document in Sanity and a query function:

```ts
import { cmsClient, getHeraldConfig, getVadaConfig, getAttaConfig, getVitakkaConfig } from '@atta/cms'

// In layout.tsx (server component)
const config = await getHeraldConfig(cmsClient)    // Herald
const config = await getVadaConfig(cmsClient)      // Vada
const config = await getAttaConfig(cmsClient)      // Atta
const config = await getVitakkaConfig(cmsClient)   // Vitakka
```

The `PortalUiConfig` shape (same for all products):

```ts
interface PortalUiConfig {
  _id: string
  userInterface: {
    theme: CMSTheme | null          // null until theme is set in Sanity
    colorScheme: 'dark' | 'light'   // default scheme; the atta-color-scheme cookie can override per-visitor
    library: CMSLibrary | null      // null falls back to 'basic'
  }
}
```

---

## Theme CSS Generation

Colors from Sanity are stored as plain hex or oklch strings. `NextWebShell` emits **both** schemes via `generateThemeCSS` — `<html data-theme>` selects which one is active, and the runtime toggle can flip between them with no FOUC:

```ts
import { generateThemeCSS } from '@atta/cms'

const css = generateThemeCSS(theme)
// :root { /* light tokens */ }
// :root[data-theme="dark"], .dark { /* dark tokens */ }
```

Use `generateThemeCSSForScheme` only when you need a single scheme (e.g. an admin live-preview iframe that always renders one):

```ts
import { generateThemeCSSForScheme } from '@atta/cms'

const css = generateThemeCSSForScheme(theme, 'dark')
// :root { --background: oklch(12% 0.02 60); --foreground: oklch(88% 0.05 70); ... }
```

---

## Font Loading

Fonts are determined by `theme.typography` — never hardcoded. Two methods:

### Server-side (preferred) — inject `<link>` in `<head>`

```ts
import { getGoogleFontsUrl } from '@atta/cms'

const fontsUrl = getGoogleFontsUrl(theme.typography)
// Returns: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap"
// Returns null if only system fonts are specified
```

```tsx
{fontsUrl && (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link rel="stylesheet" href={fontsUrl} />
  </>
)}
```

### Client-side — for dynamic theme switching

```ts
import { loadThemeFonts } from '@atta/cms'

// Injects <link> tag into document.head, replaces any previous theme fonts
loadThemeFonts(newTheme.typography)
```

---

## SSR Theme Loading — How It Works

Theme application is **fully server-side rendered**. There is no flash of unstyled content (FOUC), no `useEffect`, no client-side flicker. Here is the exact sequence:

```
1. Browser requests page
2. Next.js App Router invokes RootLayout (async Server Component)
3. RootLayout calls getVadaConfig(cmsClient)
   → Sanity fetch happens on the SERVER (CDN-cached in production)
   → .catch(() => null) ensures graceful degradation if CMS is unreachable
4. config is passed to NextWebShell (also a Server Component)
5. NextWebShell runs server-side:
   a. await cookies() → reads atta-color-scheme cookie (if present)
   b. resolveColorScheme(cookie, cmsScheme) → cookie wins, then CMS, then 'dark'
   c. generateThemeCSS(theme)
      → produces dual CSS string:
        ":root { /* light */ } :root[data-theme=\"dark\"], .dark { /* dark */ }"
   d. getGoogleFontsUrl(theme.typography)
      → produces Google Fonts URL string
6. NextWebShell returns the full <html data-theme="..."> tree including:
   - <link> tags for fonts (in <head>, so browser fetches fonts immediately)
   - <style id="vada-theme"> with both light + dark variable blocks (inline in initial HTML)
   - Children wrapped in AuthProvider + LibraryProvider + ToastProvider
7. Browser receives complete HTML — both schemes' variables are present before any JS runs;
   <html data-theme> selects which one is active.
   → No FOUC. Correct scheme is applied on first paint.
```

**Key:** `cmsClient` uses `useCdn: true` in production, so Sanity serves from edge CDN — fast, no cold starts at the theme fetch level.

## Root Layout Pattern

Every product's root `layout.tsx` **MUST** use `NextWebShell`. Never manually replicate what it does.

```tsx
// apps/{product}-ai/web/src/app/layout.tsx
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { cmsClient, getVadaConfig } from '@atta/cms'
import '@atta/ui/globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // .catch(() => null) = graceful degradation if CMS is unreachable
  // NextWebShell handles null config by skipping theme/font injection
  const config = await getVadaConfig(cmsClient).catch(() => null)

  return (
    <NextWebShell config={config} styleId="vada-theme">
      {children}
    </NextWebShell>
  )
}
```

**`styleId` must be unique per product** — it identifies the injected `<style>` tag. Use `herald-theme`, `vada-theme`, `atta-theme`, `vitakka-theme`.

`NextWebShell` handles in order:
1. Reads `cmsScheme` and `libraryId` from config
2. Reads `atta-color-scheme` cookie via `next/headers`; resolves final scheme as `cookie → CMS → 'dark'`
3. Calls `generateThemeCSS` → injects `<style id={styleId}>` with **both** light + dark variable blocks
4. Stamps `<html data-theme={resolvedScheme}>` so the browser knows which block is active
5. Calls `getGoogleFontsUrl` → injects `<link rel="preconnect">` + `<link rel="stylesheet">` for fonts
6. Builds Clerk appearance object from the *resolved* scheme's color tokens
7. Wraps children: `AuthProvider` → `LibraryProvider` → `ToastProvider`

**When `config` is `null`** (CMS unreachable or not yet configured): no theme CSS is injected, no fonts are loaded, the base `globals.css` defaults apply. The app still renders.

---

## Color Scheme Toggle (Light / Dark)

Visitors can flip between the theme's light and dark color schemes at runtime. The mechanism is cookie-driven so the next SSR render agrees with the user's choice — no FOUC.

### Architecture

```
packages/ui/lib/
├── color-scheme.ts            # Shared contract: cookie name, type, default, resolveColorScheme()
├── color-scheme-toggle.tsx    # 'use client' — sun/moon Button; flips <html data-theme> + writes cookie
└── next-web-shell.tsx         # Server — reads cookie, resolves scheme, sets <html data-theme>
```

### How it works

- **SSR (`NextWebShell`):** reads `atta-color-scheme` cookie via `next/headers`, resolves `cookie → CMS default → 'dark'`, emits both light + dark CSS blocks via `generateThemeCSS`, stamps `<html data-theme="...">`.
- **Client (`ColorSchemeToggle`):** on click, sets `document.documentElement.dataset.theme` and writes the cookie. Pure client side — no router refresh, instant repaint.
- **Tailwind `dark:` variant:** `globals.css` declares `@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *))` so `dark:` utilities follow the attribute (not `prefers-color-scheme`).

### Adding the toggle to a topbar

```tsx
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'

<div className='flex items-center gap-3'>
  <ColorSchemeToggle />
  {/* rest of right-side cluster */}
</div>
```

### Trade-offs to know

- **Clerk modals don't update on a client-side flip** — Clerk's `appearance` is built once server-side from the resolved scheme. Modals adopt the new scheme after the next full server render (e.g. navigation). Acceptable; modals are infrequent.
- **CMS `colorScheme` is the *default*** — the cookie wins per-visitor. Changing CMS still affects new visitors with no cookie set.

---

## Agent Identity Colors

The `packages/ui/styles/globals.css` defines default agent role colors as CSS variables. A Sanity theme can override any of them:

```css
:root {
  --agent-strategist:      oklch(65% 0.15 220);
  --agent-critic:          var(--destructive);
  --agent-devils-advocate: oklch(60% 0.14 290);
  --agent-synthesizer:     var(--accent);
  --agent-researcher:      oklch(65% 0.17 145);
  --agent-operator:        oklch(65% 0.14 55);
}

/* Use data-agent attribute to cascade --agent-color */
[data-agent="strategist"] { --agent-color: var(--agent-strategist); }
```

In components, use `--agent-color` via the `data-agent` attribute — never hardcode individual agent colors.

---

## Rules

- **MUST** use `NextWebShell` at every product's root layout — never replicate it manually
- **MUST** use `get{Product}Config` from `@atta/cms` — never call the Sanity client directly in app code
- **MUST** inject font URLs from `getGoogleFontsUrl` — never hardcode Google Fonts URLs
- **MUST NOT** add product-specific CSS variable definitions outside `globals.css` or the CMS theme system
- **MUST NOT** override `--font-sans`, `--font-serif`, `--font-mono` in component CSS — let the theme own fonts
- **MUST NOT** hardcode the cookie name or `data-theme` attribute — import constants from `@atta/ui/lib/color-scheme`
- **MUST NOT** read or write the color scheme from a Server Component manually — `NextWebShell` owns the SSR resolution

---

## Sanity Studios

Each product has its own Sanity Studio deployment, managed from `packages/cms`. Studios run locally on separate ports and deploy to separate hosted URLs.

### Running Studios Locally

```bash
# From packages/cms/ or via turbo from root

bun run studio              # Herald studio — port 3333 (default)
bun run studio:atta         # Atta studio — port 3334
bun run studio:vada         # Vada studio — port 3335
bun run studio:vitakka      # Vitakka studio — port 3336
```

The `SANITY_STUDIO_PRODUCT` env var controls which product's schema/config is loaded. The `studio:*` scripts set this automatically.

### Deploying Studios

```bash
bun run studio:deploy           # Deploy Herald studio
bun run studio:deploy:atta      # Deploy Atta studio
bun run studio:deploy:vada      # Deploy Vada studio
bun run studio:deploy:vitakka   # Deploy Vitakka studio
bun run studio:deploy:all       # Deploy all four (sequential, prompts y/n)
```

### What You Configure in Each Studio

| Document Type | Purpose |
|--------------|---------|
| `{product}Config` | Per-product UI config singleton — sets active theme + library + color scheme |
| `uiTheme` | Theme documents — color tokens (light/dark), typography, spacing, shadows |
| `uiLibrary` | Library documents — maps `id` to `basic` / `retro` / `animate` / `brutal` |

**To change a product's theme:** Open the relevant studio → find the `{product}Config` singleton → change the linked theme or library → publish. The change takes effect on the next server render (or after revalidation).

---

## Adding a New Product Theme

1. Create a `{product}Config` singleton document type in the Sanity schema
2. Add `get{Product}Config` in `packages/cms/src/queries/product-ui-config.ts`
3. Export the new function from `packages/cms/src/index.ts`
4. Use `NextWebShell` in the product's `layout.tsx` with a unique `styleId`

---

## Anti-patterns

- ❌ Hardcoded Google Fonts `<link>` in layout — use `getGoogleFontsUrl(theme.typography)`
- ❌ Raw Sanity client calls in app code — use typed query functions from `@atta/cms`
- ❌ Hex colors in component CSS or JSX — all colors via CSS variables
- ❌ `next/font/google` with hardcoded font names — fonts come from CMS theme
- ❌ Different theme CSS per-component — theme is global, injected once at root by `NextWebShell`
- ❌ Calling `generateThemeCSS` (or `generateThemeCSSForScheme`) inside a component — theme CSS is injected once at root layout by `NextWebShell`
- ❌ Duplicating `AuthProvider` or `LibraryProvider` inside `NextWebShell` children
- ❌ Hand-rolling a color-scheme toggle — use `<ColorSchemeToggle />` from `@atta/ui/lib/color-scheme-toggle`
- ❌ Reading the `atta-color-scheme` cookie directly anywhere except `NextWebShell` — keep the SSR resolution single-source
