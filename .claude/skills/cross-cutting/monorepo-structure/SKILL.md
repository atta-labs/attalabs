---
name: monorepo-structure
description: Turborepo monorepo structure, workspace conventions, package imports, and task commands for Atta AI
---

# Monorepo Structure — Atta AI

## Context

Turborepo + Bun monorepo. Products are apps, shared code lives in packages. All product names come from Pali.

---

## Directory Layout

```
apps/
├── herald-ai/web/          # @atta/herald-ai-web
├── herald-ai/mobile/       # @atta/herald-ai-mobile
├── herald-ai/mcp/          # @atta/herald-ai-mcp
├── atta-ai/web/
├── vada-ai/web/
└── vitakka-ai/web/

packages/
├── ui/                     # @atta/ui — shadcn/ui + Tailwind + lucide-react
├── cms/                    # @atta/cms — Sanity schemas + typed queries
├── db/                     # @atta/db — Drizzle ORM + Neon client
├── storage/                # @atta/storage — Cloudflare R2 client
├── auth/                   # @atta/auth — Clerk wrapper
└── typescript-config/      # @atta/typescript-config — base + nextjs tsconfig
```

---

## Rules

### Naming
- Product apps: `apps/{product-ai}/{surface}/`
- Package names: `@atta/{name}` (no `-ai` suffix for packages)
- Workspaces: `"workspaces": ["apps/*/*", "packages/*"]`

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

// ✅ app-internal
import { getUserById } from '@/db/queries'
import type { UserRow } from '@/db/schema'

// ❌ relative traversal
import { db } from '../../../packages/db'

// ❌ cross-app imports
import { something } from '@atta/herald-ai-web/src/lib/something'
```

### Adding a New Package
1. Create `packages/{name}/package.json` with `"name": "@atta/{name}"`
2. Create `packages/{name}/tsconfig.json` extending `@atta/typescript-config/base.json`
3. Export from `packages/{name}/src/index.ts`
4. Add to consuming app's `package.json` dependencies as `"@atta/{name}": "*"`

---

## Turbo Commands

```bash
bun run dev              # All dev servers
bun run dev:herald       # Herald only
bun run dev:vada         # Vada only
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
Root CLAUDE.md                         # Products + packages index
  ├── apps/{product}/CLAUDE.md         # Product overview
  │   └── apps/{product}/web/CLAUDE.md # Surface architecture
  └── packages/{name}/CLAUDE.md        # Package API + critical rules
```

---

## Anti-patterns

- ❌ Importing between apps (`@atta/herald-ai-web` → `@atta/vada-ai-web`)
- ❌ Duplicating shared logic — add to packages instead
- ❌ Overriding strict TypeScript settings per-app
- ❌ Adding a surface without a CLAUDE.md
- ❌ Using `find` or relative paths to locate sibling packages
