# CMS Package — Claude Code Instructions

Sanity CMS schemas, configuration, and client for Herald. This package owns all content management — tenant profiles, themes, page configs, and asset references.

Pattern: Same role as `@summon/cms` in the Summon repo.

---

## Architecture

```
packages/cms/
├── src/
│   ├── schemas/             # Sanity document type definitions
│   │   ├── profile.ts           # Candidate profile schema
│   │   ├── theme.ts             # Theme configuration schema
│   │   ├── envoy-config.ts      # Envoy page configuration
│   │   └── index.ts             # Schema registry
│   ├── queries/             # GROQ queries for reading data
│   │   ├── profile.ts           # getProfile(username)
│   │   ├── theme.ts             # getTheme(themeId)
│   │   └── envoy.ts             # getEnvoyConfig(username)
│   ├── client.ts            # Sanity client factory
│   ├── config.ts            # Project ID, dataset, API version
│   └── index.ts             # Public exports
├── CLAUDE.md
├── README.md
├── package.json
└── tsconfig.json
```

---

## Critical Rules

### RULE #1: v1 does NOT use Sanity yet

v1 uses a hardcoded profile in `apps/herald/src/lib/profile.ts`. The CMS package is scaffolded and ready for Step 5 (Subdomain Routing & Sanity Integration) in the build order.

**Do NOT add Sanity dependencies or configuration until Step 5.**

### RULE #2: Schemas define the content model

When Sanity is wired (Step 5+), all tenant content lives here:

| Schema | Purpose | Summon Equivalent |
|--------|---------|-------------------|
| `profile` | Candidate name, title, summary, skills, projects, experience, GitHub handle | N/A (Herald-specific) |
| `theme` | Color tokens, typography, spacing — runtime theme switching | `@summon/cms` themes |
| `envoy-config` | Per-tenant Envoy page configuration (which sections to show, order) | Portal page config |

### RULE #3: GROQ queries are the only way to read from Sanity

Never use raw Sanity client calls in app code. All reads go through typed query functions exported from this package.

```tsx
// ✅ Good — typed query from CMS package
import { getProfile } from '@herald/cms/queries/profile'
const profile = await getProfile('dani')

// ❌ Bad — raw client call in app code
import { client } from '@herald/cms/client'
const profile = await client.fetch('*[_type == "profile"]')
```

### RULE #4: Sanity client config comes from environment

```typescript
// packages/cms/src/config.ts
export const cmsConfig = {
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET ?? 'production',
  apiVersion: '2026-03-01',
  useCdn: process.env.NODE_ENV === 'production'
}
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SANITY_PROJECT_ID` | Step 5+ | Sanity project identifier |
| `SANITY_DATASET` | Step 5+ | Dataset name (production/development) |
| `SANITY_API_TOKEN` | Step 5+ | Write token (for admin mutations) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Step 5+ | Client-side project ID |
| `NEXT_PUBLIC_SANITY_DATASET` | Step 5+ | Client-side dataset |

---

## Content Flow (Step 5+)

```
Onboarding Flow (Step 6)
    ↓ creates
Sanity Documents (profile, theme, envoy-config)
    ↓ read by
Envoy Page ([username].heyherald.com)
    ↓ managed by
Admin Dashboard (Step 7)
    ↓ updates
Sanity Documents (live preview via postMessage)
```

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
- [HERALD-BUILD-SPEC.md Section 05](../../HERALD-BUILD-SPEC.md) — Admin Dashboard (Sanity integration)
- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — "Why Sanity CMS" decision
- [Summon CMS package](file:///Users/daniboomerang/Work/Repositories/game7/summon/packages/cms/CLAUDE.md) — Reference implementation
