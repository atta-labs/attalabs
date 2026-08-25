# CMS Package — Claude Code Instructions

Sanity CMS client, schemas, typed queries, and theme utilities for all Atta AI products. This package is the **single source of truth** for visual identity — colors, typography, UI library selection, logos, and brand assets — across Herald, Vada, Atta, and Vinaya.

---

## Architecture

```
packages/cms/
├── src/
│   ├── client.ts            # PROJECT_IDS, ProductKey, createProductClient, cmsConfig
│   ├── types.ts             # CMSTheme, CMSBranding, PortalUiConfig, ThemeTypography, FIELD_TO_CSS_VAR
│   ├── index.ts             # Public exports
│   ├── queries/
│   │   ├── product-cms.ts        # getProductCms — config + branding for one product key
│   │   ├── product-ui-config.ts  # getProductConfig, getProductUiConfig
│   │   ├── branding.ts           # getProductBranding
│   │   ├── theme.ts              # getThemeById, getThemeByName, getThemeList, getThemes
│   │   └── library.ts            # getLibraries, getLibraryById
│   └── utils/
│       ├── theme.ts              # generateThemeCSSForScheme, generateThemeCSS, transformColorGroup
│       ├── font-loader.ts        # getGoogleFontsUrl (SSR), loadThemeFonts (client)
│       └── oklch.ts              # cssColorToOklch — converts any color format to oklch
├── schemas/
│   ├── branding.ts          # Branding document schema (logos, favicons, identity, usage rules)
│   ├── ui-theme.ts          # Color + typography + spacing tokens
│   ├── library.ts           # UI library variants
│   └── {product}-config.ts  # Per-product config singletons
├── scripts/
│   ├── seed-branding.ts     # Uploads SVG/PNG brand assets from ~/Downloads/logos/ to Sanity
│   └── seed-ui.ts           # Seeds UI libraries and product config documents
├── CLAUDE.md
├── README.md
└── package.json
```

---

## Critical Rules

### RULE #1: Never use the Sanity client directly in app code

All reads go through typed query functions exported from this package.

```tsx
// ✅ Typed query from CMS package, keyed by product
import { getProductConfig } from '@atta/cms'
const config = await getProductConfig('vada')

// ❌ Raw client call in app code
import { createClient } from '@sanity/client'
const config = await client.fetch('*[_type == "vadaConfig"]')
```

### RULE #2: Theme loading is SSR — fetch at root layout, not in components

Theme config is fetched once in the root `layout.tsx` (async Server Component) and passed to `NextWebShell`. Components never fetch theme data directly.

```tsx
// ✅ Root layout — server-side, once per request
const { config, branding } = await getProductCms('vada')
return <NextWebShell config={config} branding={branding} styleId="vada-theme">{children}</NextWebShell>

// ❌ Never fetch theme inside a component
const config = await getProductConfig('vada')  // inside a page or component
```

### RULE #3: The Sanity project comes from the product key, never the environment

```ts
// ✅ The key resolves project + document ids
const { config, branding } = await getProductCms('vinaya')

// ❌ No ambient read client, no env-resolved project id
const config = await getVinayaConfig(cmsClient)          // deleted — cmsClient is gone
projectId: process.env.SANITY_PROJECT_ID ?? 'unconfigured'  // deleted — silent failure
```

Project IDs are public and identical in every environment, so they live in `PROJECT_IDS`.
Only `SANITY_DATASET` (varies per environment) and `SANITY_API_TOKEN` (a secret, writes
only) are environment variables. `getProductCms` degrades to `null` when the CMS is
unreachable and logs why outside production — never re-swallow it with `.catch(() => null)`.

### RULE #4: All colors go through generateThemeCSSForScheme — never transform manually

```ts
// ✅
import { generateThemeCSSForScheme } from '@atta/cms'
const css = generateThemeCSSForScheme(theme, 'dark')

// ❌ Don't manually build CSS variable strings from theme tokens
const css = Object.entries(theme.dark).map(([k, v]) => `--${k}: ${v};`).join('\n')
```

---

## Sanity Studios

Each product has its own studio. All managed from `packages/cms`.

### Run Locally

```bash
bun run studio              # Herald — port 3333
bun run studio:vada         # Vada — port 3335
bun run studio:vinaya       # Vinaya — port 3336
bun run studio:attalabs     # AttalLabs — port 3337
```

### Deploy

```bash
bun run studio:deploy           # Herald
bun run studio:deploy:vada      # Vada
bun run studio:deploy:vinaya    # Vinaya
bun run studio:deploy:attalabs  # AttalLabs
bun run studio:deploy:all       # All four
```

---

## Branding — One Singleton Per Product

Each product has a `branding` document in Sanity storing logo SVG files, the full favicon/icon set, and brand identity documentation. Does **not** include colors, fonts, or UI library — those live in `uiTheme`.

| Field group | Contents |
|-------------|---------|
| `identity`  | `productId`, `productName`, `paliRoot`, `paliMeaning`, `tagline` |
| `shape`     | `bladeDirection`, `interiorElement`, `interiorMeaning`, `shapeNotes` |
| `variants`  | Outline/solid descriptions, use cases, minimum sizes |
| `usage`     | `clearSpace`, `forbidden[]` |
| `logos`     | `logoOutlineLight/Dark`, `logoSolidLight/Dark`, `logoLockupOutlineLight/Dark`, `logoLockupSolidLight/Dark` (SVG `file` assets) |
| `favicons`  | Shared `appleTouchIcon` + `faviconLight` + `faviconDark` objects, each set with `ico` + 7 PNG sizes (16/32/48/64/128/256/512) |

Document IDs: `branding-herald`, `branding-atta`, `branding-vada`, `branding-vinaya`, `branding-vinayaPortal`, `branding-vinayaStudio`

Query functions:
```ts
import { getProductBranding } from '@atta/cms'

const branding = await getProductBranding('atta').catch(() => null)
// branding.logoSolidDark?.url  — resolved CDN URL, ready to use in <img src>
// branding.faviconDark?.png32?.url
```

**Seed script** — uploads all assets from `~/Downloads/logos/{product}/`:
```bash
# From packages/cms/
SANITY_API_TOKEN=<token> bun run seed:branding:atta
SANITY_API_TOKEN=<token> bun run seed:branding:vada
SANITY_API_TOKEN=<token> bun run seed:branding:vinaya
SANITY_API_TOKEN=<token> bun run seed:branding:herald   # document shell only, no assets yet
```

Tokens are in `apps/{product}-ai/web/.env.local`.

See `.claude/skills/ui-branding/SKILL.md` for the full guide including variant selection rules and per-product geometry.

---

## Product UI Config — One Singleton Per Product

Each product has a singleton document in Sanity that stores:

| Field | Type | Purpose |
|-------|------|---------|
| `userInterface.theme` | ref → `uiTheme` | Active color theme |
| `userInterface.colorScheme` | `'dark' \| 'light'` | Which color scheme to apply |
| `userInterface.library` | ref → `uiLibrary` | Active component library |

Document types: `heraldConfig`, `vadaConfig`, `vinayaConfig`, `vinayaPortalConfig`, `vinayaStudioConfig`, `attalabsConfig`

Query functions:
```ts
import { getProductConfig } from '@atta/cms'

const config = await getProductConfig('herald')   // 'herald' | 'atta' | 'vada' | 'vinaya' | 'vinayaPortal' | 'vinayaStudio' | 'attalabs'
```

`vinayaPortal` and `vinayaStudio` are additional product documents inside `vinaya`'s
own Sanity project (same `PROJECT_IDS` entry), registered ahead of any app reading
them — see `.claude/skills/ui-cms-theme/SKILL.md`.

### What You Configure in Each Studio

| Document Type | Purpose |
|--------------|---------|
| `{product}Config` | Per-product UI config singleton — sets active theme + library + color scheme |
| `branding` | Per-product branding singleton — logos (SVG), favicons, identity text, usage rules |
| `uiTheme` | Theme documents — color tokens (light/dark), typography, spacing, shadows |
| `library` | Library documents — maps `id` to `basic` / `retro` / `animate` / `brutal` |
| `roadmapMilestone` | Roadmap items for `/roadmap` on vinaya-portal — title, description, `truth` line, status, image, order |

---

## CMSTheme Structure

```ts
interface CMSTheme {
  _id: string
  name: string
  light?: Record<string, string | { value: string }>   // Light scheme color tokens
  dark?:  Record<string, string | { value: string }>   // Dark scheme color tokens
  typography?: {
    fontSans?: string    // e.g. "'DM Sans', sans-serif"
    fontSerif?: string   // e.g. "'Playfair Display', serif"
    fontMono?: string    // e.g. "'DM Mono', monospace"
  }
  spacing?: { radius?: string; spacing?: string }
  shadows?: Record<string, string>   // RAMP only — colour comes from the per-scheme shadowColor
  neobrutalist?: boolean             // tuned for retro/brutal: solid border + shadowColor
}
```

Colors are stored as plain hex or any CSS color format. `generateThemeCSSForScheme` converts them all to oklch.

Three colour-group fields are not surfaces or inks — they exist because the vendored
neobrutalist components reference them: `shadowColor` (`--shadow-color`, deliberately
separate from `border` so a black border can still cast a visible shadow), and
`primaryHover` / `secondaryHover` (retro's `installed/button.tsx` uses
`hover:bg-primary-hover`, which emits no CSS at all without both the field and a
`--color-*` mapping in `globals.css`).

`neobrutalist` is not a colour — it records that a theme has been tuned for the
`retro`/`brutal` libraries. Both theme pickers partition on it via `themesForLibrary()`
/ `isThemeCompatible()` (`utils/theme-compatibility.ts`), in both directions. See
`.claude/skills/ui-cms-theme/SKILL.md`.

---

## Environment Variables

| Variable | Client | Purpose |
|----------|--------|---------|
| `SANITY_DATASET` | Server | Dataset (`production`) — genuinely varies per environment |
| `NEXT_PUBLIC_SANITY_DATASET` | Client+Server | Same, exposed to browser |
| `SANITY_API_TOKEN` | Server only | Write access — seed/migrate scripts, `tools/admin` write clients |

There is **no** `SANITY_PROJECT_ID`. The project is resolved from the product key via
`PROJECT_IDS`; the env var existed, duplicated a committed public value, and its
absence failed silently. Any lingering entry in a `.env.local` or Vercel project is inert.

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
- [packages/ui/CLAUDE.md](../ui/CLAUDE.md) — UI component library
- [.claude/skills/ui-cms-theme/SKILL.md](../../.claude/skills/ui-cms-theme/SKILL.md) — Full SSR theme loading guide
- [.claude/skills/ui-branding/SKILL.md](../../.claude/skills/ui-branding/SKILL.md) — Branding schema, queries, seed script, logo variant rules
