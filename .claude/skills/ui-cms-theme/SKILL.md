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
    └── shadows: { shadow, shadowMd, ... }   # RAMP only — colour comes from --shadow-color

@atta/cms package
├── queries/product-cms.ts         # getProductCms — config + branding, keyed by product
├── queries/product-ui-config.ts   # getProductConfig, getProductUiConfig
├── queries/theme.ts               # getThemeById, getThemes
├── utils/theme.ts                 # generateThemeCSSForScheme, generateThemeCSS
├── utils/font-loader.ts           # getGoogleFontsUrl, loadThemeFonts
└── types.ts                       # CMSTheme, PortalUiConfig, ThemeTypography

@atta/ui package
├── lib/next-web-shell.tsx         # Root provider: reads cookie + config → injects CSS + fonts
├── lib/theme-context.tsx          # ThemeContext — exposes { theme, styleId } to client components
├── lib/color-scheme.ts            # Shared cookie/attribute/default contract, resolveColorScheme()
└── lib/color-scheme-toggle.tsx    # Client toggle — swaps style tag content + flips <html data-theme>
```

---

### Colour-group fields that are not surfaces

Three fields in the `light`/`dark` colour groups do not name a surface or an ink. They
exist because the vendored neobrutalist components reference them and the theme system
previously could not express them:

| Field | CSS var | Why it exists |
|---|---|---|
| `shadowColor` | `--shadow-color` | The **colour** of the shadow ramp, deliberately separate from `border`. A theme wanting a black border *and* a visible offset shadow (retroui's own does exactly this) cannot express it if shadow strings reference `var(--border)` — the shadow goes black and disappears. Shadow strings in the `shadows` group MUST use `var(--shadow-color)`. |
| `primaryHover` | `--primary-hover` | retro's `installed/button.tsx` uses `hover:bg-primary-hover`. Without the field **and** the `--color-primary-hover` mapping in `globals.css`, that class emits no CSS and the hover silently never fires. |
| `secondaryHover` | `--secondary-hover` | Same, for `hover:bg-secondary-hover`. |

### Theme ↔ library compatibility (`neobrutalist`)

`retro` and `brutal` draw a hard border AND a hard offset shadow on every surface.
A theme tuned for the soft libraries typically ships a border at 0.14–0.20 alpha —
fine under `basic`/`animate`, effectively **frameless** under a neobrutalist one,
where the border IS the design. This used to be masked: `globals.css` forced
`--border: var(--foreground)` for those two libraries, overriding whatever border a
theme defined.

`uiTheme.neobrutalist` (boolean) records that a theme has a solid border plus a
`shadowColor`, i.e. that it survives that pairing. Both theme pickers — Herald's
`/[username]/ui` editor and `tools/admin`'s themes page — filter on it via
`themesForLibrary()` / `isThemeCompatible()` from `@atta/cms`
(`utils/theme-compatibility.ts`), so selecting a neobrutalist library offers only
tuned themes, and switching library re-selects a compatible theme rather than
leaving a broken pairing in place.

The two flagged themes are seeded by `packages/cms/scripts/seed-neobrutalist-themes.ts` (`bun run seed:neobrutalist-themes`), so their values are reproducible into a fresh dataset rather than living only in published documents.

In the `uiTheme` schema, `neobrutalist` lives in the Studio form's `info` group — the same group as the other descriptive/metadata fields — not a `colors` group, which the schema's `groups` array never defines. Any field added to this schema must use one of the six declared groups (`light`/`dark`/`typography`/`spacing`/`shadows`/`info`); Sanity's schema extractor throws a hard error on an undefined group reference, which breaks every product's `sanity deploy`, not just the one whose Studio you're editing.

**The flag is explicit, never derived.** Deriving it from "has a `shadowColor`"
would let a theme drift into the neobrutalist list because someone set an unrelated
field, and the real requirement — a border solid enough to contrast with that
theme's own surfaces — is a judgement call that a boolean records honestly.
The filter is a strict **partition**, both directions: neobrutalist libraries offer
only flagged themes, and `basic`/`animate` offer only the unflagged ones. A
neobrutalist theme is legible under a soft library but is tuned for a hard border
and offset shadow that those libraries never draw, so it reads as a washed-out
version of itself. The two are distinct visual families, not a superset and a
subset.

**The shadow ramp is scheme-agnostic; its colour is not.** `addShadowVars`
(`utils/theme.ts`) applies one `shadows` map to both schemes by design — offsets and blur
don't change between light and dark. Per-scheme shadow *colour* is achieved through
`shadowColor` living in the per-scheme colour group, so `var(--shadow-color)` resolves
differently in each. Do not "fix" `addShadowVars` to duplicate the ramp.

## Product Config Queries

Each product has a dedicated config document in Sanity. One generic query family reads
them all, keyed by `ProductKey` — there are no per-product query functions:

```ts
import { getProductCms, getProductConfig, getProductBranding } from '@atta/cms'

// In layout.tsx (server component) — config + branding in one call
const { config, branding } = await getProductCms('vinaya')

// Or either one alone
const config = await getProductConfig('herald')
const branding = await getProductBranding('vada')
```

The product key resolves everything: the Sanity project (from `PROJECT_IDS`), the config
document (`${key}Config`), and the branding document (`branding-${key}`). Nothing comes
from the environment — a project ID is public and identical in every environment, so it
lives in code. Pass the key of the product whose *content* you want: a consumer
that deliberately borrows another product's identity passes that product's key, and the
call site says so out loud.

`ProductKey` is `'herald' | 'atta' | 'vada' | 'vinaya' | 'vinayaPortal' | 'vinayaStudio' | 'attalabs'`.
`vinayaPortal` (`vinayaPortalConfig` / `branding-vinayaPortal`) and `vinayaStudio`
(`vinayaStudioConfig` / `branding-vinayaStudio`) are two additional product documents
inside `vinaya`'s own Sanity project — not new projects, so `PROJECT_IDS` maps all three
keys to the same project id. Portal passes `vinayaPortal` for every runtime config and
branding read; Studio passes `vinayaStudio` for the same reads. Their independently
addressed documents are seeded with the legacy `vinaya` appearance, and the ordinary
`getProductCms` null/fallback behavior remains unchanged if either document is
temporarily unavailable. This is the same pattern "Adding a New Product Theme" below
describes, minus step 1 (no new project id to add).

`getProductCms` is the root-layout entry point. It fetches both documents in parallel and
owns the graceful-degradation policy — on failure it returns `null` for that document, and
logs the reason outside production. Do not wrap it in `.catch(() => null)`; that is what
made a broken config indistinguishable from an unconfigured one.

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

**`userInterface.library` is currently decisive, but only until the library resolution
that reads it moves off a live build-time Sanity fetch.** Today `packages/ui/scripts/generate-ui.ts`
reads this field at build time and that value *is* the active library. A planned change
replaces that live read with a repo-committed pin; once it lands, this field becomes a
proposal a maintainer can act on rather than the thing that decides the build. Don't
treat it as load-bearing when deciding whether a new product document is safely additive
— its authority is already scheduled to move.

---

## Theme CSS Generation

Colors from Sanity are stored as plain hex or oklch strings. `NextWebShell` emits **only the active scheme** as plain `:root {}` via `generateThemeCSSForScheme`. The `ColorSchemeToggle` swaps the style tag content on flip — no CSS attribute selectors needed, no specificity battles.

### Theme values are guarded at the sink, not at each write path

Both generators build declarations by string interpolation, and `NextWebShell` renders the
result through `dangerouslySetInnerHTML`, which React does not escape. A theme value that
contains `</style>`, a `;`, or a `}` would therefore escape its declaration and inject
arbitrary CSS into **every product bound to that theme**.

`utils/css-safety.ts` closes that at the point every feeder converges: `toCssDeclarations`
drops any variable whose name or value could break out, and both generators route through
it. The property *name* is guarded as well as the value, because `transformColorGroup`
falls back to the raw Sanity field name for fields absent from `FIELD_TO_CSS_VAR`, and
Sanity's HTTP API accepts fields the Studio schema never declared.

**The sink is the right place for this and a write path is not.** Theme documents are
authored through the central studio by hand — a documented route with no application code
in front of it — so per-writer validation can never cover them all. One feeder is
genuinely user-supplied: Herald's public profile page splices a visitor-settable
`user.fontSans` into theme typography and renders it on an unauthenticated page. Setting
fonts per user is a product requirement, so that feeder stays; the guard is what makes it
safe. Anything added to `theme.ts` that emits a declaration must go through
`toCssDeclarations` rather than interpolating values itself.

The guard also rejects the remote-fetch functions (`url()`, `image-set()`, `src()`). A
custom property is inert until referenced, but `globals.css` sets
`html { background: var(--background) }` — the shorthand, which accepts an image — so a
theme colour of `url(https://…)` becomes an outbound request on every SSR page bound to
that theme, leaking visitor IP and referer with no script involved. Unbalanced parentheses
and quotes are rejected for a different reason: either one runs to the end of the
stylesheet and voids every declaration after it.

**A theme document holds token values, never rules.** The `shadows` group is a ramp of
offsets and blur; the colour groups are colours. A field that closes its declaration and
writes selectors of its own is using the injection vector as a feature, and this guard
drops it. If a hover state or any other rule needs to change per theme, it belongs in
`globals.css` or the component library, expressed against a token the theme *does* define.

A dropped variable falls back to the compiled default in `globals.css`. Every value in
every shipped theme passes the guard, and `theme-corpus.fixture.json` pins that: all 853
distinct values that reach a CSS declaration across all 19 theme documents, with the test
suite asserting none is rejected. Assert against the whole corpus rather than a hand-picked
sample — the sample is what misses the one value that matters.

```ts
import { generateThemeCSSForScheme } from '@atta/cms'

// Emit only the active scheme (the default use case)
const css = generateThemeCSSForScheme(theme, 'dark')
// :root { --background: oklch(12% 0.02 60); --foreground: oklch(88% 0.05 70); ... }
```

Use `generateThemeCSS` (dual scheme) only when both schemes must coexist in the same CSS string — specifically, Herald's per-user envoy theme overlay where the candidate's custom theme is injected as an attribute-scoped override so the recruiter's scheme toggle still works:

```ts
import { generateThemeCSS } from '@atta/cms'

// Both schemes in one string — needed ONLY for attribute-scoped overrides
const css = generateThemeCSS(theme)
// :root { /* light tokens */ }
// :root[data-theme="dark"], .dark { /* dark tokens */ }
```

**Default rule: always use `generateThemeCSSForScheme`.** Only reach for `generateThemeCSS` when you have a documented reason to keep both schemes in the same CSS block.

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

### Authoring the three font roles

All three `typography` font roles — sans, serif, mono — can also be authored from the
admin's theme browse surface, against a live preview, alongside the theme document's other
hand-edit paths (the central studio, and the admin's own theme editor). Because `typography`
lives on the shared `uiTheme` document, a font chosen there is a property of that
**theme**, not of the product used to preview it — every product bound to that theme picks
up the change. This is the same shared-document trade the rest of this file's "What You
Configure Where" section describes for colors and spacing; fonts are not a special case.

---

## SSR Theme Loading — How It Works

Theme application is **fully server-side rendered**. There is no flash of unstyled content (FOUC), no `useEffect`, no client-side flicker. Here is the exact sequence:

```
1. Browser requests page
2. Next.js App Router invokes RootLayout (async Server Component)
3. RootLayout calls getProductCms('vada')
   → Sanity fetch happens on the SERVER (CDN-cached in production)
   → getProductCms degrades to null if the CMS is unreachable (and logs why in dev)
4. config is passed to NextWebShell (also a Server Component)
5. NextWebShell runs server-side:
   a. await cookies() → reads atta-color-scheme cookie (if present)
   b. resolveColorScheme(cookie, cmsScheme) → cookie wins, then CMS, then 'dark'
   c. generateThemeCSSForScheme(theme, colorScheme)
      → produces single-scheme CSS string:
        ":root { --background: …; --foreground: …; … }"
   d. getGoogleFontsUrl(theme.typography)
      → produces Google Fonts URL string
6. NextWebShell returns the full <html data-theme="..."> tree including:
   - <link> tags for fonts (in <head>, so browser fetches fonts immediately)
   - <style id="vada-theme"> with active scheme only (inline in initial HTML)
   - Children wrapped in ThemeProvider + AuthProvider + LibraryProvider + ToastProvider
7. Browser receives complete HTML — correct scheme is applied on first paint.
   → No FOUC. On scheme toggle, ColorSchemeToggle replaces the style tag content
     with the other scheme's CSS, then flips <html data-theme>.
```

**Key:** product clients use `useCdn: true` in production, so Sanity serves from edge CDN — fast, no cold starts at the theme fetch level.

## Root Layout Pattern

Every product's root `layout.tsx` **MUST** use `NextWebShell`. Never manually replicate what it does.

```tsx
// apps/{product}-ai/web/src/app/layout.tsx
import { NextWebShell } from '@atta/ui/lib/next-web-shell'
import { getProductCms } from '@atta/cms'
import '@atta/ui/globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // getProductCms degrades to null config if the CMS is unreachable;
  // NextWebShell handles null by skipping theme/font injection
  const { config, branding } = await getProductCms('vada')

  return (
    <NextWebShell config={config} branding={branding} styleId="vada-theme">
      {children}
    </NextWebShell>
  )
}
```

**`styleId` must be unique per product** — it identifies the injected `<style>` tag. Use `herald-theme`, `vada-theme`, `atta-theme`, `vinaya-theme`.

`NextWebShell` handles in order:
1. Reads `cmsScheme` and `libraryId` from config
2. Resolves and injects theme CSS + fonts (see "SSR Theme Loading" above for the exact cookie → CMS → `'dark'` sequence)
3. Stamps `<html data-theme={resolvedScheme}>` (used by Tailwind `dark:` variant and neobrutalist border override)
4. Builds Clerk appearance object from the *resolved* scheme's color tokens
5. Wraps children: `ThemeProvider` → `AuthProvider` → `LibraryProvider` → `ToastProvider`

**When `config` is `null`** (CMS unreachable or not yet configured): no theme CSS is injected, no fonts are loaded, the base `globals.css` defaults apply. The app still renders.

---

## Color Scheme Toggle (Light / Dark)

Visitors can flip between the theme's light and dark color schemes at runtime. The mechanism is cookie-driven so the next SSR render agrees with the user's choice — no FOUC. (File map: see the `@atta/ui package` tree under Architecture above.)

### How it works

- **SSR (`NextWebShell`):** see "SSR Theme Loading" above for the full sequence. Wraps children with `ThemeProvider` so the toggle can find the theme client-side.
- **Client (`ColorSchemeToggle`):** reads `theme` and `styleId` from `ThemeContext`. On click: (1) finds `<style id={styleId}>` and replaces `textContent` with `generateThemeCSSForScheme(theme, next)`, (2) flips `<html data-theme>`, (3) writes the cookie. Pure client side — no router refresh, instant repaint with zero FOUC.
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
- **MUST** use `getProductCms`/`getProductConfig`/`getProductBranding` from `@atta/cms` — never call the Sanity client directly in app code
- **MUST NOT** resolve a Sanity project from an env var, or reintroduce an ambient read client — the project comes from the product key via `PROJECT_IDS`
- **MUST NOT** wrap `getProductCms` in `.catch(() => null)` — it already degrades gracefully and logs the reason in dev; re-swallowing restores the silent failure this design already closed
- **MUST** call `getThemeById`/`getThemeByName`/`getThemes`/`getLibraries` (or any other by-ID/by-name `uiTheme`/`library` lookup) with `createProductClient('attalabs')`, never a product's own client (see "Any by-ID/by-name theme lookup must target the central project" below)
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
bun run studio:vada         # Vada studio — port 3335
bun run studio:vinaya       # Vinaya studio — port 3336
bun run studio:attalabs     # AttalLabs studio — port 3337
```

The `SANITY_STUDIO_PRODUCT` env var controls which product's schema/config is loaded. The `studio:*` scripts set this automatically.

### Deploying Studios

```bash
bun run studio:deploy           # Deploy Herald studio
bun run studio:deploy:vada      # Deploy Vada studio
bun run studio:deploy:vinaya    # Deploy Vinaya studio
bun run studio:deploy:attalabs  # Deploy AttalLabs studio
bun run studio:deploy:all       # Deploy all four (sequential, prompts y/n)
```

### What You Configure Where

Per Cross-Product Theme Centralization under Attalabs (2026-06-25), theme and library *documents* are no longer per-product. They are stored and managed exclusively in the central Attalabs Sanity project, and the Themes/Libraries sections are hidden from the other product studios' sidebars (Vāda, Vinaya, Herald, Attā).

| Document Type | Where it's edited | Purpose |
|--------------|--------------------|---------|
| `{product}Config` | Per-product studio (Vāda, Vinaya, Herald, Attā) | Config singleton — the *selection*: which theme/library ID the product points to, plus color scheme. Still per-product. |
| `uiTheme` | Central Attalabs studio only (`attalabs.sanity.studio`, project `l5n0n8nn`) | Theme documents — color tokens (light/dark), typography, spacing, shadows |
| `library` | Central Attalabs studio only (`attalabs.sanity.studio`, project `l5n0n8nn`) | Library documents — maps `id` to `basic` / `retro` / `animate` / `brutal` |

At read time, `getProductUiConfig` (`packages/cms/src/queries/product-ui-config.ts`) resolves this across the two projects: it fetches the `{product}Config` singleton from the product's own project, then resolves the referenced `uiTheme`/`library` IDs against the central `attalabs` project client (`createProductClient('attalabs', ...)`).

**To change a product's theme or library document (colors, typography, etc.):** Open the **central Attalabs studio** (`attalabs.sanity.studio`, project `l5n0n8nn`) → find the `uiTheme` or `library` document → edit it → publish. These sections are hidden in the per-product studios — they are not edited there.

**To point a product at a different (existing) theme or library:** Open the **relevant product studio** → find the `{product}Config` singleton → change the linked theme or library reference → publish. The change takes effect on the next server render (or after revalidation).

### Any by-ID/by-name theme lookup must target the central project

`getProductUiConfig` is not the only place that fetches a `uiTheme`/`library` document — anything that looks one up **by ID or by name**, such as a per-user custom-theme feature (e.g. Herald's public-profile theme picker, `packages/cms/src/queries/theme.ts`'s `getThemeById`/`getThemeByName`/`getThemes`), must do the same central-project redirection. These lower-level query functions take a generic `SanityClient` parameter and perform **no redirection themselves** — passing them a product's own client (`createProductClient('herald')`) will silently find nothing and return `null`, since `uiTheme`/`library` documents no longer exist in any per-product project.

```ts
import { createProductClient, getThemeById } from '@atta/cms'

// ✅ Correct — central project, matches where uiTheme documents actually live
const theme = await getThemeById(createProductClient('attalabs'), themeId)

// ❌ Wrong — silently returns null for any themeId created after theme centralization
const theme = await getThemeById(createProductClient('herald'), themeId)
```

This exact mistake shipped in Herald: a per-user profile theme was saved correctly but the public-page render resolved it against Herald's own project and always got `null`, so the saved theme silently never appeared. The write path, the DB column, and cache revalidation were all correct — only this one client was wrong. If you add per-user or per-entity theme customization to any other product, use `createProductClient('attalabs')` for every `uiTheme`/`library` lookup, not just the product-config resolver.

---

## Adding a New Product Theme

1. Add the product's Sanity project ID to `PROJECT_IDS` in `packages/cms/src/client.ts` — this
   extends `ProductKey`, and is the only edit `@atta/cms` needs
2. Create a `{product}Config` singleton document type in the Sanity schema, with `_id`
   `{product}Config`; name its branding document `branding-{product}`. The query layer derives
   both IDs from the key, so these names are a contract, not a convention
3. Call `getProductCms('{product}')` in the product's `layout.tsx` and pass the result to
   `NextWebShell` with a unique `styleId`

No new query function is needed — that was the old per-product pattern, since deleted.

**Two products can share one Sanity project.** When a new product is a variant of an
existing one rather than a genuinely separate identity — e.g. `vinayaPortal` and
`vinayaStudio` inside `vinaya`'s project — skip step 1 and map the new key to the
existing project id in `PROJECT_IDS` instead of adding one. Everything else is the same:
its own `{key}Config` schema type and its own `branding-{key}` document, resolved
through the same `getProductCms(key)` call once a layout is written to pass that key.

---

## Non-theme content document types

`packages/cms` also ships ordinary content document types that have nothing to do with
theme/colors/fonts — they follow the same "one schema file + one typed query function,
exported from `@atta/cms`, RULE #1 applies" pattern this file otherwise describes for
theme/config/branding. `roadmapMilestone` (`schemas/roadmap-milestone.ts` +
`getRoadmapMilestones()` in `src/queries/roadmap-milestones.ts`) is one — the content
backing vinaya-portal's `/roadmap` page (title, `version`, description, `truth` line,
three-state `status`, optional `image`, manual `order`). Its documents live in each
product's own Sanity project, same as branding, resolved via `createProductClient(product)`.

**`version` is a record, never a target.** It's optional (`string | null`) and stays
empty for the life of an unshipped milestone — a predicted/target version number is
never stored, because the eventual number isn't knowable in advance (a feature release
can consume any minor first; this happened live to a milestone whose editorial copy
had already committed to a specific number). An editor sets it exactly once, at
completion, to the real version `@attalabs/vinaya` published. `derive-status.ts`'s
`deriveStatus` (`apps/vinaya-portal/web/src/app/(site)/roadmap/_lib/derive-status.ts`)
only runs its published-vs-`version` comparison when `version` is non-null; while empty,
the CMS `status` field is trusted directly (never auto-derived, never auto-flips to
"shipping"). `DeploymentTrack.tsx` renders no version stamp at all for a null `version`.

**`image` is a fallback, not the primary visual, for the seven known release
marks.** Those seven ship as CSS-var-themed SVGs inlined at build time via SVGR
(`apps/vinaya-portal/web/src/app/(site)/roadmap/_marks/*.svg`, one per `version`) —
inlining is load-bearing: the marks theme entirely off `--primary`/`--card`/
`--border`/`--foreground`, and those custom properties do not cross the
separate-document boundary an `<img src>`/CMS-asset load creates, so a mark
loaded that way renders in fixed fallback colors regardless of theme. The page
prefers the inlined mark for a matching `version`; `image` only renders (via
`next/image`, unthemed) for a future item whose `version` has no matching file
in `_marks/`. The CMS asset itself is still kept in sync as an editorial
preview — the baked `light`-mode SVG variant, since Sanity Studio's own thumbnail
has no access to the site's runtime theme vars either.

---

## Anti-patterns

- ❌ Hex colors in component CSS or JSX — all colors via CSS variables
- ❌ `next/font/google` with hardcoded font names — fonts come from CMS theme
- ❌ Calling `generateThemeCSS`/`generateThemeCSSForScheme` per-component, or otherwise varying theme CSS per-component — theme is global, injected once at root by `NextWebShell`
- ❌ Duplicating `AuthProvider` or `LibraryProvider` inside `NextWebShell` children
- ❌ Hand-rolling a color-scheme toggle — use `<ColorSchemeToggle />` from `@atta/ui/lib/color-scheme-toggle`
- ❌ Passing a product's own client to `getThemeById`/`getThemeByName`/`getThemes`/`getLibraries` — these take a generic `SanityClient` and do no central-project redirection themselves; always pass `createProductClient('attalabs')`
- ❌ Reading `SANITY_PROJECT_ID` (or `NEXT_PUBLIC_SANITY_PROJECT_ID`) anywhere in app or package code — the project is resolved from the product key
- ❌ Reading the `atta-color-scheme` cookie directly anywhere except `NextWebShell` — keep the SSR resolution single-source
