# Atta AI Monorepo Migration — Design Spec

**Date:** 2026-04-05
**Type:** In-place migration (Approach A — rename + restructure, preserve git history)
**Scope:** Restructure the Herald monorepo into the Atta AI ecosystem monorepo

---

## Context

Herald AI is the first product in the Atta AI ecosystem. The monorepo must be restructured so Herald is one app among many. Future products (Vitakka AI, Vada AI) and the organization's own site (Atta AI) will live in the same monorepo. Shared infrastructure (UI, CMS, MCP, TypeScript config) stays as shared packages under the `@atta` scope.

The migration follows the Summon repo pattern: hierarchical docs with a routing-index CLAUDE.md, per-app scripts at root, each app and package has its own README + CLAUDE.md.

**Critical constraint:** This is a migration, not a rewrite. Herald's business logic does not change.

---

## 1. Target Directory Structure

```
atta-ai/
├── apps/
│   ├── herald-ai-web/              # Migrated from apps/herald
│   │   ├── src/                    # All current Herald source (unchanged)
│   │   ├── docs/
│   │   │   ├── BUILD-SPEC.md       # Moved from root HERALD-BUILD-SPEC.md
│   │   │   └── ARCHITECTURE.md     # Moved from docs/ARCHITECTURE.md
│   │   ├── CLAUDE.md               # Herald-specific instructions (updated)
│   │   ├── README.md               # Herald app readme (updated)
│   │   ├── package.json            # @atta/herald-ai-web
│   │   ├── drizzle.config.ts
│   │   ├── next.config.ts
│   │   ├── postcss.config.js
│   │   └── tsconfig.json
│   ├── atta-ai-web/                # Empty scaffold — org page
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── CLAUDE.md
│   │   ├── README.md
│   │   ├── package.json            # @atta/atta-ai-web
│   │   └── tsconfig.json
│   ├── vitakka-ai-web/             # Empty scaffold — focus product
│   │   ├── src/app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── CLAUDE.md
│   │   ├── README.md
│   │   ├── package.json            # @atta/vitakka-ai-web
│   │   └── tsconfig.json
│   └── vada-ai-web/                # Empty scaffold — deliberation engine
│       ├── src/app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── CLAUDE.md
│       ├── README.md
│       ├── package.json            # @atta/vada-ai-web
│       └── tsconfig.json
├── packages/
│   ├── ui/                         # @atta/ui (shared UI + libraries)
│   ├── cms/                        # @atta/cms (shared Sanity CMS)
│   ├── mcp/                        # @atta/mcp (shared MCP tooling)
│   └── typescript-config/          # @atta/typescript-config
├── tests/                          # Root-level tests (if any remain)
├── .claude/
│   └── rules/                      # Shared rules (generic, not Herald-specific)
│       ├── git-conventions.md
│       ├── ui-patterns.md
│       └── api-conventions.md
├── CLAUDE.md                       # Atta AI routing index (Summon pattern)
├── README.md                       # Atta AI ecosystem overview
├── package.json                    # name: "atta-ai"
├── turbo.json
├── biome.json
├── commitlint.config.js
├── lint-staged.config.js
├── tsconfig.json
└── .gitignore
```

---

## 2. Package Renaming

### Package names

| Current | New |
|---------|-----|
| `herald` (root) | `atta-ai` |
| `@herald/web` | `@atta/herald-ai-web` |
| `@herald/ui` | `@atta/ui` |
| `@herald/cms` | `@atta/cms` |
| `@herald/mcp` | `@atta/mcp` |
| `@herald/typescript-config` | `@atta/typescript-config` |

### Import updates (global find-and-replace)

| Pattern | Replacement |
|---------|-------------|
| `@herald/ui` | `@atta/ui` |
| `@herald/cms` | `@atta/cms` |
| `@herald/mcp` | `@atta/mcp` |
| `@herald/typescript-config` | `@atta/typescript-config` |

All source files, `package.json` dependencies, and `tsconfig.json` references must be updated.

---

## 3. Root Scripts

```json
{
  "name": "atta-ai",
  "scripts": {
    "dev": "turbo dev",
    "dev:herald": "turbo dev --filter=@atta/herald-ai-web",
    "dev:vitakka": "turbo dev --filter=@atta/vitakka-ai-web",
    "dev:vada": "turbo dev --filter=@atta/vada-ai-web",
    "dev:atta": "turbo dev --filter=@atta/atta-ai-web",
    "build": "turbo build",
    "build:herald": "turbo build --filter=@atta/herald-ai-web",
    "build:vitakka": "turbo build --filter=@atta/vitakka-ai-web",
    "build:vada": "turbo build --filter=@atta/vada-ai-web",
    "build:atta": "turbo build --filter=@atta/atta-ai-web",
    "typecheck": "turbo typecheck",
    "lint": "biome lint .",
    "format": "biome format .",
    "format-and-lint": "biome check .",
    "format-and-lint:fix": "biome check --fix .",
    "check": "turbo typecheck && biome check .",
    "clean": "turbo clean",
    "prepare": "husky"
  }
}
```

The `test:match` script moves to `apps/herald-ai-web/package.json`.

---

## 4. Documentation (Summon Pattern)

### 4.1 Root `README.md` — Ecosystem overview

Content:
- Atta AI description: ecosystem of AI products
- Products table: Herald AI (forensic CV match), Vitakka AI (focus), Vada AI (deliberation), Atta AI (org page)
- Domains: herald.ai, vitakka.ai, vada.ai, atta.ai
- Tech stack table (Turborepo, Bun, Next.js 16, Tailwind v4, shadcn/ui, Sanity, Clerk, Neon, Drizzle, Vercel AI SDK, Biome)
- Shared packages table with descriptions
- Getting started / dev commands
- Links to each app's README

### 4.2 Root `CLAUDE.md` — Routing index

Content:
- Atta AI ecosystem description
- Apps table: name, CLAUDE.md link, README link, purpose
- Packages table: name, CLAUDE.md link, README link, purpose
- Tech stack table
- Monorepo tooling (Turborepo, Bun, Biome, Husky, commitlint)
- Turbo tasks reference
- Shared code style rules (TypeScript strict, named exports, type imports, Biome)
- Git conventions (commit format, types)
- Links to `.claude/rules/*`
- Environment variables (shared ones only)
- No Herald-specific content

### 4.3 `.claude/rules/` — Shared rules

- `git-conventions.md` — Remove Herald branding, keep generic commit format
- `ui-patterns.md` — Keep as shared (theme tokens, typography, layout rules, shadcn/ui)
- `api-conventions.md` — Keep generic API conventions only. Move Herald-specific content (Skeptical Auditor, match API, signal API, rate limiting details) to `apps/herald-ai-web/CLAUDE.md`

### 4.4 App-level docs

**`apps/herald-ai-web/CLAUDE.md`** — Updated from current `apps/herald/CLAUDE.md`:
- All existing Herald-specific instructions stay
- Add Herald-specific API conventions (Skeptical Auditor, match API, signal API)
- Update package references from `@herald/*` to `@atta/*`
- Update doc links to new locations (`docs/BUILD-SPEC.md`, `docs/ARCHITECTURE.md`)

**`apps/herald-ai-web/docs/BUILD-SPEC.md`** — Moved from root `HERALD-BUILD-SPEC.md` (content unchanged)

**`apps/herald-ai-web/docs/ARCHITECTURE.md`** — Moved from `docs/ARCHITECTURE.md` (content unchanged)

**Scaffold apps** (`atta-ai-web`, `vitakka-ai-web`, `vada-ai-web`):
- `CLAUDE.md` — Stub: app name, purpose, "Not yet implemented" status
- `README.md` — Stub: app name, description, placeholder

### 4.5 Package-level docs

Each package keeps its existing `CLAUDE.md` and `README.md`, updated:
- Replace `@herald` references with `@atta`
- Update links to point to new root doc structure

---

## 5. Empty App Scaffolds

Each scaffold app gets:

### `package.json`

```json
{
  "name": "@atta/{app-name}",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@atta/ui": "workspace:*",
    "@atta/typescript-config": "workspace:*",
    "next": "^16.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### `tsconfig.json`

Extends `@atta/typescript-config/nextjs.json`.

### `src/app/layout.tsx`

Minimal root layout with html + body.

### `src/app/page.tsx`

Placeholder page with app name and "Coming soon" message.

---

## 6. What Moves Where

| Current Location | New Location | Notes |
|-----------------|--------------|-------|
| `apps/herald/` | `apps/herald-ai-web/` | Renamed folder |
| `HERALD-BUILD-SPEC.md` | `apps/herald-ai-web/docs/BUILD-SPEC.md` | Moved |
| `docs/ARCHITECTURE.md` | `apps/herald-ai-web/docs/ARCHITECTURE.md` | Moved |
| `tests/match-engine.test.ts` | `apps/herald-ai-web/tests/match-engine.test.ts` | Moved with test:match script |
| `CLAUDE.md` (root) | Rewritten | Atta AI routing index |
| `README.md` (root) | Rewritten | Atta AI ecosystem overview |
| `docs/superpowers/` | Stays at root | Shared design docs |

---

## 7. What Does NOT Change

- Herald's `src/` directory structure and all business logic
- Herald's environment variables and `.env.local`
- Herald's Drizzle config, Next.js config, PostCSS config
- `turbo.json` task definitions (structure stays the same)
- `biome.json` configuration
- `.husky/` hooks
- `commitlint.config.js`
- `lint-staged.config.js`
- Root `tsconfig.json`
- `.gitignore`

---

## 8. Verification

After migration:
1. `bun install` — workspace resolution works with new package names
2. `bun run typecheck` — no broken imports
3. `bun run check` — typecheck + biome passes
4. `bun run dev:herald` — Herald app starts and works
5. `bun run build:herald` — production build succeeds
