---
name: branding
description: How the branding document system works — Sanity schema, logo/favicon asset queries, per-product geometry, and the seed script for uploading assets
---

# Branding System — Atta AI

## Context

Each product has a `branding` singleton document in Sanity that stores logo SVG files, the full favicon/icon set, and brand identity documentation (shape description, usage rules, variant guidelines). It does **not** store colors, fonts, or UI library selection — those live in `uiTheme` and `{product}Config`.

---

## Architecture

```
Sanity CMS — branding document (one per product)
├── identity         productId, productName, paliRoot, paliMeaning, tagline
├── shape            bladeDirection, interiorElement, interiorMeaning, shapeNotes
├── variants         outlineDescription, outlineMinSizePx, solidDescription, solidMinSizePx, useCases
├── usage            clearSpace, forbidden[] (list of rules)
├── logos            logoOutlineLight/Dark, logoSolidLight/Dark,
│                   logoLockupOutlineLight/Dark, logoLockupSolidLight/Dark  (SVG file assets)
├── appleTouchIcon   Shared iOS home-screen icon (single PNG, not per-scheme)
└── favicons
    ├── faviconLight  ico, png16, png32, png48, png64, png128, png256, png512
    └── faviconDark   (same fields)

@atta/cms package
├── schemas/branding.ts              # Sanity schema
├── src/queries/branding.ts          # getHeraldBranding, getAttaBranding, getVadaBranding, getVitakkaBranding
└── src/types.ts                     # CMSBranding, CMSBrandingFaviconSet, CMSBrandingFile, CMSBrandingImage
```

### Document IDs (fixed, predictable)

| Product  | Document `_id`       | Sanity Project |
|----------|----------------------|----------------|
| Herald   | `branding-herald`    | `e9gbd2d1`     |
| Attā     | `branding-atta`      | `892o2m9f`     |
| Vādā     | `branding-vada`      | `ofnj2ojb`     |
| Vitakka  | `branding-vitakka`   | `o56nzgrr`     |

The same IDs are exported from `@atta/cms` as `PROJECT_IDS`. Pair with `createProductClient(product)` to query any product's Sanity project from any app (see _Cross-product fetching_ below).

### Asset Storage

- **SVG logos** — stored as Sanity `file` assets (not `image`). This preserves the raw SVG without server-side transform processing.
- **PNG favicons** — stored as Sanity `image` assets. URLs are resolved via `asset->url` dereference in GROQ.
- **ICO files** — stored as Sanity `file` assets with `contentType: image/x-icon`.

---

## Querying Branding

```ts
import { cmsClient, getAttaBranding, getVadaBranding, getHeraldBranding, getVitakkaBranding } from '@atta/cms'

// In layout.tsx or a server component — for your own product's branding
const branding = await getVadaBranding(cmsClient).catch(() => null)
```

### Cross-product fetching

Each product's branding lives in its own Sanity project, so the app's default `cmsClient` (wired to one project via `SANITY_PROJECT_ID`) cannot reach other products' docs. For ecosystem surfaces — e.g. the Vāda home page showing Attā and Vitakka alongside Vāda — use `createProductClient(productKey)`:

```ts
import {
  cmsClient,
  createProductClient,
  getAttaBranding,
  getVadaBranding,
  getVitakkaBranding
} from '@atta/cms'

const [atta, vada, vitakka] = await Promise.all([
  getAttaBranding(createProductClient('atta')).catch(() => null),
  getVadaBranding(cmsClient).catch(() => null),
  getVitakkaBranding(createProductClient('vitakka')).catch(() => null)
])
```

`createProductClient` returns a read-only Sanity client hitting the public CDN for the chosen project — no token required. `ProductKey` is `'herald' | 'atta' | 'vada' | 'vitakka'`. The same helper works for any other typed query in `@atta/cms` (themes, configs, etc.) when you need data from a sibling product.

Returned shape — all asset fields include a resolved `url` string:

```ts
interface CMSBranding {
  _id: string
  productId: 'herald' | 'atta' | 'vada' | 'vitakka'
  productName: string
  paliRoot?: string
  paliMeaning?: string
  tagline?: string
  // Logo shape documentation
  bladeDirection?: 'apex-up' | 'apex-down'
  interiorElement?: string
  interiorMeaning?: string
  shapeNotes?: string
  // Variant documentation
  outlineDescription?: string
  outlineUseCases?: string
  outlineMinSizePx?: number   // default 48
  solidDescription?: string
  solidUseCases?: string
  solidMinSizePx?: number     // default 16
  // Usage rules
  clearSpace?: string
  forbidden?: string[]
  // SVG logo files — mark variants
  logoOutlineLight?: CMSBrandingFile    // { _type: 'file', url?: string }
  logoOutlineDark?: CMSBrandingFile
  logoSolidLight?: CMSBrandingFile
  logoSolidDark?: CMSBrandingFile
  // SVG logo files — lockup (Logo Full): mark + wordmark + tagline
  logoLockupOutlineLight?: CMSBrandingFile
  logoLockupOutlineDark?: CMSBrandingFile
  logoLockupSolidLight?: CMSBrandingFile
  logoLockupSolidDark?: CMSBrandingFile
  // iOS home screen — single asset shared across schemes
  appleTouchIcon?: CMSBrandingImage    // apple-touch-icon.png (180×180)
  // Favicon sets
  faviconLight?: CMSBrandingFaviconSet
  faviconDark?: CMSBrandingFaviconSet
}

interface CMSBrandingFaviconSet {
  ico?: CMSBrandingFile           // favicon.ico (multi-res)
  png16?: CMSBrandingImage        // favicon-16
  png32?: CMSBrandingImage        // favicon-32
  png48?: CMSBrandingImage        // favicon-48
  png64?: CMSBrandingImage        // favicon-64
  png128?: CMSBrandingImage       // favicon-128 (Chrome Web Store)
  png256?: CMSBrandingImage       // favicon-256 (Retina / PWA manifest)
  png512?: CMSBrandingImage       // favicon-512 (PWA splash / large)
}
```

### Rendering a logo in a component

```tsx
const branding = await getAttaBranding(cmsClient).catch(() => null)

// Pick the right variant based on active color scheme and render size
const logoUrl = isDark
  ? branding?.logoSolidDark?.url    // below 48px
  : branding?.logoSolidLight?.url

// Or outline for hero contexts (48px+)
const logoUrl = isDark
  ? branding?.logoOutlineDark?.url
  : branding?.logoOutlineLight?.url

// Always guard — branding may be null if CMS is unreachable
{logoUrl && <img src={logoUrl} alt={branding.productName} />}
```

---

## Per-Product Logo Geometry

| Product  | Blade Direction | Interior Element | Meaning |
|----------|----------------|-----------------|---------|
| Attā     | Λ — apex up    | Eye — almond ellipse with pupil | The self looking inward, awareness observing itself |
| Vitakka  | V — apex down  | Target — concentric rings with crosshairs | Focus, thought applied to its object |
| Vādā     | V — apex down  | Two circles connected by exchange arcs | Conversation, dialogue between two minds |
| Herald   | TBD            | TBD | TBD — logos not yet designed |

**Blade curves are organic and intentional across all products.** Never straighten them, never separate the interior element from the blades.

---

## Logo Variants — When to Use Which

| Variant | Min Size | Use For |
|---------|----------|---------|
| Outline | 48 px    | Landing pages, hero sections, marketing materials, OG images, about pages, documentation headers |
| Solid   | 16 px    | Favicons, browser tabs, app icons, nav bars, loading screens, watermarks, email, PDF, print |

These are not two different logos — they are one logo at two levels of detail. The geometry (blade curves, proportions, element positions) is identical.

---

## Seed Script

The seed script uploads all SVG/PNG assets from `~/Downloads/logos/{product}/` and creates or replaces the branding document in Sanity.

```bash
# From packages/cms/
SANITY_API_TOKEN=<token> bun run seed:branding:atta
SANITY_API_TOKEN=<token> bun run seed:branding:vada
SANITY_API_TOKEN=<token> bun run seed:branding:vitakka
SANITY_API_TOKEN=<token> bun run seed:branding:herald   # document shell only, no assets
```

Tokens live in each product's `apps/{product}-ai/web/.env.local`. Project IDs are baked into the npm scripts.

**Expected asset directory layout:**
```
~/Downloads/logos/
└── {product}/
    ├── outline/{product}-outline-{light|dark}.svg
    ├── solid/{product}-solid-{light|dark}.svg
    ├── lockup/{product}-lockup-{outline|solid}-{light|dark}.svg   (4 files — Logo Full)
    └── favicon/
        ├── {product}-light.ico
        ├── {product}-dark.ico
        ├── {product}-apple-touch-180.png       (shared across schemes)
        ├── light/{product}-{16|32|48|64|128|256|512}.png
        └── dark/{product}-{16|32|48|64|128|256|512}.png
```

The script uses `client.createOrReplace()` — safe to re-run if assets are updated.

---

## Rules

- **MUST** use `get{Product}Branding(cmsClient)` — never call the Sanity client directly in app code
- **MUST** guard against `null` branding — CMS may be unreachable during SSR
- **MUST** use `file` type (not `image`) for SVG assets — `image` applies server-side transforms that corrupt SVGs
- **MUST** choose outline vs solid based on render size — outline ≥ 48 px, solid < 48 px
- **MUST NOT** hardcode logo URLs — always fetch from CMS at render time
- **MUST NOT** straighten the blade curves or separate the interior element from the blades
- **MUST NOT** use outline in contexts where glow filters won't render cleanly (email, PDF, print)

---

## Anti-patterns

- ❌ Importing SVG files directly from the repo — logos live in Sanity, not in source code
- ❌ Hardcoding which logo variant to use — derive from render size and active color scheme
- ❌ Using `image` type for SVG uploads in scripts — use `client.assets.upload('file', ...)` instead
- ❌ Reusing the same branding document across products — each product has its own `_id`
