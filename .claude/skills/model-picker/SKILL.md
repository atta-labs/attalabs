---
name: model-picker
description: Shared searchable AI-model picker for all Atta AI products — ModelPicker component, dynamic catalog from models.dev, overlay curation, CatalogProvider SSR pattern
paths:
  - "packages/models/**"
---

# Model Picker — Atta AI

## Context

A single `ModelPicker` component (cmdk-based command palette with brand icons from `@lobehub/icons`) serves as the model selection UI across every Atta AI product. Backed by `@atta/models` which fetches the catalog live from `models.dev` at SSR. Products share the UI shell and the catalog; each product decides when to render the picker and what keys are configured.

---

## Package Imports

```tsx
// UI
import { ModelPicker } from '@atta/ui'
import { ModelIcon } from '@atta/ui'   // for anywhere a modelId is mentioned

// Data
import {
  getCatalog,                       // async fetch, call at SSR
  CatalogProvider, useCatalog,      // context pair
  type ModelEntry, type RouteProvider,
  PROVIDERS, ROUTE_PROVIDER_ORDER,
  getStoredApiKey, storeApiKey      // localStorage helpers
} from '@atta/models'
```

---

## The SSR Pattern (required)

`ModelPicker` reads its catalog from React context, so every page that renders it must wrap with `CatalogProvider`:

```tsx
// app/(main)/my-page/page.tsx  (Server Component)
import { CatalogProvider, getCatalog } from '@atta/models'

export default async function MyPage() {
  const [/* ...other SSR fetches, */ catalog] = await Promise.all([
    // ...existing fetches,
    getCatalog()
  ])
  return (
    <CatalogProvider catalog={catalog}>
      <MyClientTree />
    </CatalogProvider>
  )
}
```

```tsx
// MyPickerUser.tsx  ('use client')
import { ModelPicker } from '@atta/ui'
import { useCatalog, type RouteProvider } from '@atta/models'

export function MyPickerUser({ value, onChange, configuredRoutes }: Props) {
  const catalog = useCatalog()
  return (
    <ModelPicker
      options={catalog}
      value={value}
      onChange={onChange}
      configuredRoutes={configuredRoutes}
      side='bottom'
    />
  )
}
```

---

## Component API (`ModelPicker`)

```ts
interface ModelPickerProps {
  options: ModelEntry[]                                   // from useCatalog()
  value: { route: RouteProvider; modelId: string } | null
  onChange: (value: { route: RouteProvider; modelId: string }) => void

  configuredRoutes: Set<RouteProvider>                    // which routes have keys
  onProvideKey?: (route: RouteProvider, key: string) => void

  trigger?: React.ReactNode                               // custom trigger; defaults to minimal text button
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'bottom' | 'left' | 'right'

  settingsHref?: string                                   // optional footer link
  settingsLabel?: string                                  // default: 'Configure defaults →'
  className?: string
}
```

### The `onProvideKey` contract

- **Provided** → locked rows (routes not in `configuredRoutes`) become a two-step flow: click → palette swaps to key-entry pane → Enter saves → `onProvideKey(route, key)` fires + `onChange(selection)` fires + popover closes. Use this on surfaces where users can paste a key inline (e.g. the deliberate page with localStorage fallback).

- **Omitted** → locked rows stay visually disabled with a Lock icon. Clicking does nothing. Use this on surfaces where key management lives elsewhere (e.g. a Settings page with a dedicated API Keys section).

### Internal UI behavior (you get these for free)

- Groups by route provider, sorted per `ROUTE_PROVIDER_ORDER`
- Within each group, sorted by tier (`frontier → reasoning → balanced → fast`), alphabetical within tier
- Collapses to **4 models per provider** by default; "Show all N" expander
- Typing in the search auto-expands all groups so hidden models are findable
- Two filter chips: **Flagship** (tier === 'frontier') and **Free** (cost === 'free'), AND-combined with search
- Uses `ProviderIcon` for group headings (reliable), `ModelIcon` for rows (matches known model families like claude, gpt, gemini, llama, grok, etc.)
- Popover with collision avoidance + `collisionPadding: 8` — won't clip on small viewports
- Semantic tokens only (`bg-popover`, `text-accent-foreground`, `bg-accent`, etc.) — respects theme

---

## Adding the picker to a new Atta product

1. In the product's page (Server Component): `await getCatalog()` and wrap children in `CatalogProvider`
2. In the client component that renders the trigger: `const catalog = useCatalog()` → pass to `<ModelPicker options={catalog} .../>`
3. Decide whether this surface needs `onProvideKey` (inline key capture) or not — see contract above
4. The product's engine layer must accept the 5-route shape (see [packages/models/CLAUDE.md](../../../packages/models/CLAUDE.md))

---

## Sprinkling model icons elsewhere

`ModelIcon` (thin `@lobehub/icons` wrapper) works anywhere you have a model string:

```tsx
import { ModelIcon } from '@atta/ui'

<ModelIcon model='claude-opus-4-7' size={14} type='avatar' />   // colorful round avatar
<ModelIcon model='gpt-5' size={10} type='mono' />              // small monochrome for dense UIs
```

Vada uses this pattern in: `RoomRoster`, `MessageCard`, `SessionCard` (stacked), `ConclusionPanel`, and the `GlobalModelSelector` trigger itself.

---

## Rules

### RULE #1: Do NOT hand-maintain the catalog

The catalog is fetched live from models.dev. Don't commit a static list of models. If you need curation (tier/description), add to `OVERLAY` — one line per entry.

### RULE #2: CatalogProvider must wrap at the page level

Not at the component level, not at the layout level — at the page. Different pages may want different catalog filters in the future, and the provider pattern keeps that option open. Don't hoist it higher without a reason.

### RULE #3: `onProvideKey` only when keys live in localStorage

Settings-persisted keys (server-side) belong in a separate API Keys surface. The picker just shows a lock state for unkeyed routes.

### RULE #4: Never hardcode provider brand colors

Provider branding comes from `ModelIcon`/`ProviderIcon` (`@lobehub/icons`). Don't wrap them in colored backgrounds, don't replace with custom SVG.

---

## When a flagship releases (e.g. GPT-6)

1. Add one line to `packages/models/src/overlay.ts`:
   ```ts
   'gpt-6': { tier: 'frontier', description: 'Most capable OpenAI' },
   ```
2. No other code changes needed. Next SSR pulls the new model from models.dev, overlay tags it, picker renders it at the top of the OpenAI group.

---

## Troubleshooting

**Picker is empty or stuck on fallback models:** `models.dev/api.json` fetch probably failing. Check logs. The fallback catalog (5 entries in `fallback.ts`) kicks in on any error.

**Group heading shows no icon:** lobehub's `ProviderIcon` couldn't match the route. Verify the route key matches one of lobehub's known providers (anthropic, openai, google, groq, openrouter should all work).

**Model row shows no icon:** `ModelIcon` couldn't match the `modelId` string. Common for obscure/niche models. Acceptable — the DefaultAvatar renders in its place.

**"Failed to set fetch cache" warning in logs:** Past issue — fixed by caching the transformed (small) output via `unstable_cache` instead of the raw 2.3MB `fetch` response. If you see it, check `catalog.ts` still uses `unstable_cache`.

---

## Related

- [packages/models/CLAUDE.md](../../../packages/models/CLAUDE.md) — Data layer architecture
- [packages/ui/CLAUDE.md](../../../packages/ui/CLAUDE.md) — UI library + component contract
- [.claude/skills/ui-components/SKILL.md](../ui-components/SKILL.md) — General UI rules
- [docs/superpowers/specs/2026-04-17-model-picker-lobehub-design.md](../../../docs/superpowers/specs/2026-04-17-model-picker-lobehub-design.md) — Original design spec
- [docs/superpowers/plans/2026-04-17-dynamic-model-catalog.md](../../../docs/superpowers/plans/2026-04-17-dynamic-model-catalog.md) — Dynamic catalog implementation plan
