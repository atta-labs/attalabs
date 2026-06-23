---
name: monorepo-structure
description: Turborepo monorepo structure, workspace conventions, package imports, and task commands for the Atta ecosystem
---

# Monorepo Structure — Atta Ecosystem

## Context

Turborepo + Bun monorepo. Products are apps, shared code lives in packages. Code namespace is `@atta/*` regardless of public domain branding (the public domain is `attalabs.dev`; the code namespace stays `@atta/*`).

Product names are Pāli. Shared infrastructure is named after its function.

---

## Directory Layout

```
apps/
├── herald-ai/web/          # @atta/herald-ai-web
├── herald-ai/mobile/       # @atta/herald-ai-mobile
├── herald-ai/mcp/          # @atta/herald-ai-mcp
├── atta-ai/web/            # @atta/atta-ai-web (ecosystem hub at attalabs.dev)
├── atta-ai/mcp-server/     # @atta/atta-ai-mcp-server (engine-as-MCP)
├── account/web/            # @atta/account-web (account.attalabs.dev — billing/auth/API hub)
├── vada-ai/web/            # @atta/vada-ai-web (vada.attalabs.dev)
├── vada-ai/mcp-server/     # @atta/vada-ai-mcp-server (Vāda's curated team product)
├── vitakka-ai/web/         # @atta/vitakka-ai-web (vitakka.attalabs.dev)
└── sati-ai/web/            # @atta/sati-ai-web (sati.attalabs.dev)

packages/
├── ui/                     # @atta/ui — shadcn/ui + Tailwind + lucide-react
├── cms/                    # @atta/cms — Sanity schemas + typed queries
├── db/                     # @atta/db — Drizzle ORM + Neon client (single shared users table)
├── storage/                # @atta/storage — Cloudflare R2 client
├── auth/                   # @atta/auth — Clerk wrapper (single Clerk app for whole ecosystem)
├── engine/                 # @atta/engine — Plan compiler (used by Vāda, atta-ai/mcp-server)
└── typescript-config/      # @atta/typescript-config — base + nextjs tsconfig
```

---

## Domain Mapping

| App | Production URL | Local dev URL |
|-----|----------------|---------------|
| `apps/atta-ai/web` | `attalabs.dev` | `attalabs.test` |
| `apps/account/web` | `account.attalabs.dev` | `account.attalabs.test` |
| `apps/vada-ai/web` | `vada.attalabs.dev` | `vada.attalabs.test` |
| `apps/vitakka-ai/web` | `vitakka.attalabs.dev` | `vitakka.attalabs.test` |
| `apps/sati-ai/web` | `sati.attalabs.dev` | `sati.attalabs.test` |

All subdomains share auth via a single Clerk app with cookie scoped to `.attalabs.dev` (production) / `.attalabs.test` (local). See `skill-auth.md`.

---

## Rules

### Naming
- Product apps: `apps/{product-ai}/{surface}/`
- Package names: `@atta/{name}` (no `-ai` suffix for packages)
- Workspaces: `"workspaces": ["apps/*/*", "packages/*"]`
- Code namespace stays `@atta/*` — AttaLabs is only the public domain wrapper, not a code-level rename

### TypeScript Config Inheritance
```json
// packages/*/tsconfig.json
{ "extends": "@atta/typescript-config/base.json" }

// apps/*/tsconfig.json
{ "extends": "@atta/typescript-config/nextjs.json" }
```

- **MUST NOT** override `strict`, `noUncheckedIndexedAccess`, or `moduleResolution` locally

### Cross-Package Imports
```ts
// ✅ shared packages
import { Button } from '@atta/ui/components/button'
import { db } from '@atta/db'
import { currentUser } from '@atta/auth'
import { getProfile } from '@atta/cms/queries/profile'
import { compileFlow } from '@atta/engine'

// ✅ app-internal
import { getUserById } from '@/db/queries'
import type { UserRow } from '@/db/schema'

// ❌ relative traversal
import { db } from '../../../packages/db'

// ❌ cross-app imports
import { something } from '@atta/vada-ai-web/src/lib/something'
```

### Adding a New Package
1. Create `packages/{name}/package.json` with `"name": "@atta/{name}"`
2. Create `packages/{name}/tsconfig.json` extending `@atta/typescript-config/base.json`
3. Export from `packages/{name}/src/index.ts`
4. Add to consuming app's `package.json` dependencies as `"@atta/{name}": "*"`

### Adding a New Product Surface
1. Create `apps/{product-ai}/web/` (or `mcp-server/`, `mobile/`)
2. `package.json` name: `@atta/{product}-ai-web`
3. Subdomain: `{product}.attalabs.dev` (production), `{product}.attalabs.test` (local)
4. Use `NextWebShell` from `@atta/ui` for layout — auth is included
5. Add a CLAUDE.md describing the surface's architecture

### Memory Product Naming
- The memory layer product is **Sati** (Pāli for memory/mindfulness)
- Code references: `apps/sati-ai/web`, `@atta/sati-ai-web`, subdomain `sati.attalabs.dev`
- Earlier docs may refer to "Atta-the-product" as the memory layer — that name is deprecated. Atta now refers exclusively to the ecosystem.

---

## Turbo Commands

```bash
bun run dev              # All dev servers
bun run dev:vada         # Vada only
bun run dev:vitakka      # Vitakka only
bun run dev:sati         # Sati only
bun run dev:atta         # Atta ecosystem hub (apps/atta-ai/web)
bun run dev:account      # Account hub
bun run dev:herald       # Herald only
bun run build            # Production build (all)
bun run typecheck        # TypeScript check across all packages
bun run check            # Typecheck + lint + format
bun run lint             # Biome lint only
bun run format           # Biome format only
bun run clean            # Clean build artifacts
```

---

## CLAUDE.md Hierarchy

Every surface must have a CLAUDE.md that routes Claude to relevant docs:

```
Root CLAUDE.md                         # Products + packages index, naming overview
  ├── apps/{product}/CLAUDE.md         # Product overview
  │   └── apps/{product}/web/CLAUDE.md # Surface architecture
  └── packages/{name}/CLAUDE.md        # Package API + critical rules
```

---

## Anti-patterns

- ❌ Importing between apps (`@atta/vada-ai-web` → `@atta/vitakka-ai-web`)
- ❌ Duplicating shared logic — add to packages instead
- ❌ Overriding strict TypeScript settings per-app
- ❌ Adding a surface without a CLAUDE.md
- ❌ Using `find` or relative paths to locate sibling packages
- ❌ Renaming `@atta/*` packages to `@attalabs/*` — the code namespace is Atta; AttaLabs is only the public domain
- ❌ Creating an `apps/atta-ai/` for the memory product — that's Sati now (`apps/sati-ai/`)
- ❌ Building per-product billing/settings UI — those live at `account.attalabs.dev` (`apps/account/web`)
