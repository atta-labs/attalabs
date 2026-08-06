# @atta/models — Shared AI Model Catalog

The canonical source of truth for AI models across all Atta AI products. Fetches a live catalog from `models.dev`, applies a small hand-curated overlay for tier/description, and exposes it via an async SSR function + React context.

---

## Architecture

```
@atta/models/
├── src/
│   ├── providers.ts        RouteProvider union, ProviderMeta, PROVIDERS record
│   ├── catalog.ts          ModelEntry interface, getCatalog() orchestrator
│   ├── overlay.ts          Hand-curated tier + description per modelId
│   ├── fallback.ts         Minimal static list for fetch failures
│   ├── transform.ts        models.dev raw → ModelEntry[]
│   ├── provider.tsx        CatalogProvider + useCatalog React context
│   ├── storage.ts          localStorage helpers (getStoredApiKey etc.)
│   ├── sources/
│   │   └── models-dev.ts   Fetches https://models.dev/api.json
│   └── index.ts            Barrel
```

### The three things that matter

1. **`getCatalog()`** — async, cached 24h via Next.js `unstable_cache`. Call at SSR, pass via `CatalogProvider` to client descendants.
2. **`OVERLAY`** — small manual map (~15 entries) that tags known flagships/notable models with `tier` and `description`. Models not in the overlay default to `tier: 'balanced'`.
3. **`RouteProvider`** — 5-wide union (`anthropic | openai | google | groq | openrouter`). Native routes for the first four; OpenRouter proxies the rest.

---

## Usage

### Server Component

```tsx
import { CatalogProvider, getCatalog } from '@atta/models'

export default async function MyPage() {
  const catalog = await getCatalog()
  return <CatalogProvider catalog={catalog}>{/* client tree */}</CatalogProvider>
}
```

### Client Component

```tsx
import { useCatalog } from '@atta/models'

function MyPicker() {
  const catalog = useCatalog()
  // ...
}
```

### API key storage (deliberate-page ephemeral fallback)

```ts
import { getStoredApiKey, storeApiKey, removeStoredApiKey } from '@atta/models'
```

---

## Adding a new model to the overlay

When a provider releases a flagship (e.g. Gemini 4 Pro) and you want it tagged as frontier:

1. Open `packages/models/src/overlay.ts`
2. Add one line keyed by the **models.dev model id** (not the OpenRouter-prefixed form):
   ```ts
   'gemini-4-pro': { tier: 'frontier', description: 'Frontier Gemini' },
   ```
3. Done. Next SSR refresh picks it up (clear Next's data cache if needed).

---

## Adding a new route provider

If you want to add native routing for a provider currently proxied through OpenRouter (e.g. direct xAI):

1. Extend `RouteProvider` in `providers.ts` to include `'xai'`
2. Add a `PROVIDERS.xai` entry with keyPrefix, envVar, etc.
3. Add `xai` to `ROUTE_PROVIDER_ORDER`
4. In `transform.ts`, move `'xai'` from `OPENROUTER_ALLOWED_PROVIDERS` to `NATIVE_ROUTE_BY_MODELS_DEV_ID`
5. Update consuming apps' engine layers (e.g. `apps/vada-ai/web/src/engine/agents.ts`):
   - Install the relevant `@ai-sdk/*` package
   - Add a case in `resolveModel` and `validateModelConfig`

---

## Why a dynamic catalog (not static)

A hand-maintained TypeScript array goes stale within weeks — new flagship models ship constantly. `models.dev` is a public aggregator covering 400+ models with pricing metadata, updated daily. Fetching at SSR with 24h revalidate means:

- New models appear automatically in every product
- Pricing data lets us derive `cost: 'free' | 'paid'`
- Fallback to a 5-model static list keeps the app working if models.dev is down

---

## Curation strategy

We tag only ~15 notable models in the overlay. Everything else appears in the picker with `tier: 'balanced'` and no description. This is intentional: the picker collapses to 4 models per provider by default (sorted: frontier → reasoning → balanced → fast), so curated entries float to the top, while the long tail is discoverable via "Show all N" expansion.

Heuristic tier classification (regex on model names) was considered and rejected — too fragile, too many false positives.

## Capability ordering (`tiers.ts`)

`tier` is more than display metadata — `resolveDispatchModel` (`dispatch.ts`) already matches on it as a namespace. `tiers.ts` adds a linear **capability floor** over the same field: `frontier > balanced > fast`, with `reasoning` deliberately unranked (fails every floor — see the doc comment in `tiers.ts` for why). This is a separate concept from the picker's own display-sort `TIER_ORDER` (`packages/ui`); see [.claude/skills/model-picker/SKILL.md](../../.claude/skills/model-picker/SKILL.md) for the full distinction. `OVERLAY` tier values are curated, not inferred — propose new rows in review, never assign silently.

---

## Related

- [.claude/skills/model-picker/SKILL.md](../../.claude/skills/model-picker/SKILL.md) — Using the ModelPicker component
- [packages/ui/libraries/basic/installed/model-picker.tsx](../ui/libraries/basic/installed/model-picker.tsx) — The picker component
- [apps/vada-ai/web/src/engine/agents.ts](../../apps/vada-ai/web/src/engine/agents.ts) — Vada engine model routing
