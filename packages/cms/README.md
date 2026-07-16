# @atta/cms

Sanity CMS schemas, configuration, and typed queries for the Atta AI platform.

## Status

**v1:** Not active — profile data is hardcoded. This package is scaffolded and ready for Step 5 (Subdomain Routing & Sanity Integration).

## What Lives Here

| Directory | Purpose |
|-----------|---------|
| `src/schemas/` | Sanity document type definitions (profile, theme, envoy-config) |
| `src/queries/` | Typed GROQ queries for reading Sanity data |
| `src/client.ts` | `PROJECT_IDS`, `ProductKey`, `createProductClient`, dataset/API-version config |

## Usage (Step 5+)

```tsx
import { getProfile } from '@atta/cms/queries/profile'
import { getTheme } from '@atta/cms/queries/theme'

const profile = await getProfile('dani')
const theme = await getTheme(profile.themeId)
```

## Environment Variables

```env
SANITY_DATASET=production
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=          # writes only — seed/migrate scripts, admin mutations
```

Reads need none of these to pick a project: it is resolved from the product key via
`PROJECT_IDS` (D-125). Project IDs are public and identical in every environment.
