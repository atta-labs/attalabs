# CMS Package — Claude Code Instructions

Sanity CMS client, schemas, typed queries, and theme utilities for all Atta AI products. This package is the **single source of truth** for visual identity — colors, typography, UI library selection, logos, and brand assets — across Herald, Vada, Atta, and Vitakka.

---

## Architecture

```
packages/cms/
├── src/
│   ├── client.ts            # cmsClient (read), cmsWriteClient (write), createCmsClient
│   ├── config.ts            # Project ID, dataset, API version, CDN flag
│   ├── types.ts             # CMSTheme, CMSBranding, PortalUiConfig, ThemeTypography, FIELD_TO_CSS_VAR
│   ├── index.ts             # Public exports
│   ├── queries/
│   │   ├── product-ui-config.ts  # getHeraldConfig, getVadaConfig, getAttaConfig, getVitakkaConfig
│   │   ├── branding.ts           # getHeraldBranding, getAttaBranding, getVadaBranding, getVitakkaBranding
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
// ✅ Typed query from CMS package
import { getVadaConfig, cmsClient } from '@atta/cms'
const config = await getVadaConfig(cmsClient)

// ❌ Raw client call in app code
import { createClient } from '@sanity/client'
const config = await client.fetch('*[_type == "vadaConfig"]')
```

### RULE #2: Theme loading is SSR — fetch at root layout, not in components

Theme config is fetched once in the root `layout.tsx` (async Server Component) and passed to `NextWebShell`. Components never fetch theme data directly.

```tsx
// ✅ Root layout — server-side, once per request
const config = await getVadaConfig(cmsClient).catch(() => null)
return <NextWebShell config={config} styleId="vada-theme">{children}</NextWebShell>

// ❌ Never fetch theme inside a component
const config = await getVadaConfig(cmsClient)  // inside a page or component
```

### RULE #3: cmsClient vs cmsWriteClient

```ts
cmsClient       // Read-only, CDN-cached in production — use for all reads
cmsWriteClient  // Requires SANITY_API_TOKEN — use only for admin mutations (server-side only)
```

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
bun run studio:atta         # Atta — port 3334
bun run studio:vada         # Vada — port 3335
bun run studio:vitakka      # Vitakka — port 3336
```

### Deploy

```bash
bun run studio:deploy           # Herald
bun run studio:deploy:atta      # Atta
bun run studio:deploy:vada      # Vada
bun run studio:deploy:vitakka   # Vitakka
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
| `logos`     | `logoOutlineLight/Dark`, `logoSolidLight/Dark` (SVG `file` assets) |
| `favicons`  | `faviconLight` + `faviconDark` objects, each with 13 size fields |

Document IDs: `branding-herald`, `branding-atta`, `branding-vada`, `branding-vitakka`

Query functions:
```ts
import { getHeraldBranding, getAttaBranding, getVadaBranding, getVitakkaBranding, cmsClient } from '@atta/cms'

const branding = await getAttaBranding(cmsClient).catch(() => null)
// branding.logoSolidDark?.url  — resolved CDN URL, ready to use in <img src>
// branding.faviconDark?.png32?.url
```

**Seed script** — uploads all assets from `~/Downloads/logos/{product}/`:
```bash
# From packages/cms/
SANITY_API_TOKEN=<token> bun run seed:branding:atta
SANITY_API_TOKEN=<token> bun run seed:branding:vada
SANITY_API_TOKEN=<token> bun run seed:branding:vitakka
SANITY_API_TOKEN=<token> bun run seed:branding:herald   # document shell only, no assets yet
```

Tokens are in `apps/{product}-ai/web/.env.local`.

See `.claude/skills/branding/SKILL.md` for the full guide including variant selection rules and per-product geometry.

---

## Product UI Config — One Singleton Per Product

Each product has a singleton document in Sanity that stores:

| Field | Type | Purpose |
|-------|------|---------|
| `userInterface.theme` | ref → `uiTheme` | Active color theme |
| `userInterface.colorScheme` | `'dark' \| 'light'` | Which color scheme to apply |
| `userInterface.library` | ref → `uiLibrary` | Active component library |

Document types: `heraldConfig`, `attaConfig`, `vadaConfig`, `vitakkaConfig`

Query functions:
```ts
import { getHeraldConfig, getAttaConfig, getVadaConfig, getVitakkaConfig, cmsClient } from '@atta/cms'
```

### What You Configure in Each Studio

| Document Type | Purpose |
|--------------|---------|
| `{product}Config` | Per-product UI config singleton — sets active theme + library + color scheme |
| `branding` | Per-product branding singleton — logos (SVG), favicons, identity text, usage rules |
| `uiTheme` | Theme documents — color tokens (light/dark), typography, spacing, shadows |
| `library` | Library documents — maps `id` to `basic` / `retro` / `animate` / `brutal` |

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
  shadows?: Record<string, string>
}
```

Colors are stored as plain hex or any CSS color format. `generateThemeCSSForScheme` converts them all to oklch.

---

## Environment Variables

| Variable | Client | Purpose |
|----------|--------|---------|
| `SANITY_PROJECT_ID` | Server | Sanity project identifier |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Client+Server | Same, exposed to browser |
| `SANITY_DATASET` | Server | Dataset (`production`) |
| `NEXT_PUBLIC_SANITY_DATASET` | Client+Server | Same, exposed to browser |
| `SANITY_API_TOKEN` | Server only | Write access (cmsWriteClient) |

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
- [packages/ui/CLAUDE.md](../ui/CLAUDE.md) — UI component library
- [.claude/skills/cms-theme/SKILL.md](../../.claude/skills/cms-theme/SKILL.md) — Full SSR theme loading guide
- [.claude/skills/branding/SKILL.md](../../.claude/skills/branding/SKILL.md) — Branding schema, queries, seed script, logo variant rules
