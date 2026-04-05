# Atta AI Monorepo Migration — Design Spec

**Date:** 2026-04-05
**Type:** In-place migration (Approach A — rename + restructure, preserve git history)
**Scope:** Restructure the Herald monorepo into the Atta AI ecosystem monorepo

---

## Context

Herald AI is the first product in the Atta AI ecosystem. The monorepo must be restructured so Herald is one app among many. Future products (Vitakka AI, Vada AI) and the organization's own site (Atta AI) will live in the same monorepo. Shared infrastructure (UI, CMS, TypeScript config) stays as shared packages under the `@atta` scope. Product-specific code lives inside the product's folder.

The migration follows the Summon repo pattern: hierarchical docs with a routing-index CLAUDE.md, per-app scripts at root, each app and package has its own README + CLAUDE.md.

**Critical constraint:** This is a migration, not a rewrite. Herald's business logic does not change.

---

## 1. Target Directory Structure

```
atta-ai/
├── apps/
│   ├── herald-ai/                      # Herald AI product
│   │   ├── web/                        # Next.js app — @atta/herald-ai-web
│   │   │   ├── src/                    # All current Herald source (unchanged)
│   │   │   ├── docs/
│   │   │   │   ├── BUILD-SPEC.md       # Moved from root HERALD-BUILD-SPEC.md
│   │   │   │   └── ARCHITECTURE.md     # Moved from docs/ARCHITECTURE.md
│   │   │   ├── tests/
│   │   │   │   └── match-engine.test.ts
│   │   │   ├── CLAUDE.md               # Herald web-specific instructions
│   │   │   ├── README.md
│   │   │   ├── package.json            # @atta/herald-ai-web
│   │   │   ├── drizzle.config.ts
│   │   │   ├── next.config.ts
│   │   │   ├── postcss.config.js
│   │   │   └── tsconfig.json
│   │   ├── mobile/                     # React Native — @atta/herald-ai-mobile (scaffold)
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   └── package.json
│   │   ├── mcp/                        # MCP server — @atta/herald-ai-mcp
│   │   │   ├── src/                    # Moved from packages/mcp/src
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   ├── package.json            # @atta/herald-ai-mcp
│   │   │   └── tsconfig.json
│   │   ├── CLAUDE.md                   # Herald AI product overview
│   │   └── README.md                   # Herald AI product readme
│   │
│   ├── atta-ai/                        # Atta AI — org page (scaffold)
│   │   ├── web/
│   │   │   ├── src/app/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   ├── package.json            # @atta/atta-ai-web
│   │   │   └── tsconfig.json
│   │   ├── mobile/
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   └── package.json            # @atta/atta-ai-mobile
│   │   ├── CLAUDE.md
│   │   └── README.md
│   │
│   ├── vitakka-ai/                     # Vitakka AI — focus product (scaffold)
│   │   ├── web/
│   │   │   ├── src/app/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   ├── package.json            # @atta/vitakka-ai-web
│   │   │   └── tsconfig.json
│   │   ├── mobile/
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   └── package.json            # @atta/vitakka-ai-mobile
│   │   ├── mcp/
│   │   │   ├── CLAUDE.md
│   │   │   ├── README.md
│   │   │   └── package.json            # @atta/vitakka-ai-mcp
│   │   ├── CLAUDE.md
│   │   └── README.md
│   │
│   └── vada-ai/                        # Vada AI — deliberation engine (scaffold)
│       ├── web/
│       │   ├── src/app/
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── CLAUDE.md
│       │   ├── README.md
│       │   ├── package.json            # @atta/vada-ai-web
│       │   └── tsconfig.json
│       ├── mobile/
│       │   ├── CLAUDE.md
│       │   ├── README.md
│       │   └── package.json            # @atta/vada-ai-mobile
│       ├── mcp/
│       │   ├── CLAUDE.md
│       │   ├── README.md
│       │   └── package.json            # @atta/vada-ai-mcp
│       ├── CLAUDE.md
│       └── README.md
│
├── packages/
│   ├── ui/                             # @atta/ui (shared UI + libraries)
│   ├── cms/                            # @atta/cms (shared Sanity CMS)
│   └── typescript-config/              # @atta/typescript-config
│
├── .claude/
│   └── rules/                          # Shared rules (generic, not product-specific)
│       ├── git-conventions.md
│       ├── ui-patterns.md
│       └── api-conventions.md
├── CLAUDE.md                           # Atta AI routing index (Summon pattern)
├── README.md                           # Atta AI ecosystem overview
├── package.json                        # name: "atta-ai"
├── turbo.json
├── biome.json
├── commitlint.config.js
├── lint-staged.config.js
├── tsconfig.json
└── .gitignore
```

---

## 2. App Structure Convention

Each product follows a consistent nested structure:

```
apps/{product-ai}/
├── web/              # Next.js web app
├── mobile/           # React Native (iOS + Android)
├── mcp/              # MCP server (product as a tool for other AI systems)
├── CLAUDE.md         # Product-level overview
└── README.md         # Product-level readme
```

- Not every product needs all three surfaces immediately — scaffolds are created empty
- Product-specific code (like Herald's match engine) lives inside the product folder, not in shared packages
- Shared code that multiple products use lives in `packages/`

Workspace glob: `"apps/*/*"` (matches `apps/herald-ai/web`, `apps/herald-ai/mcp`, etc.)

---

## 3. Package Renaming

### Package names

| Current | New | Location |
|---------|-----|----------|
| `herald` (root) | `atta-ai` | Root |
| `@herald/web` | `@atta/herald-ai-web` | `apps/herald-ai/web` |
| `@herald/ui` | `@atta/ui` | `packages/ui` |
| `@herald/cms` | `@atta/cms` | `packages/cms` |
| `@herald/mcp` | `@atta/herald-ai-mcp` | `apps/herald-ai/mcp` |
| `@herald/typescript-config` | `@atta/typescript-config` | `packages/typescript-config` |

### Import updates (global find-and-replace)

| Pattern | Replacement |
|---------|-------------|
| `@herald/ui` | `@atta/ui` |
| `@herald/cms` | `@atta/cms` |
| `@herald/mcp` | `@atta/herald-ai-mcp` |
| `@herald/typescript-config` | `@atta/typescript-config` |

All source files, `package.json` dependencies, and `tsconfig.json` references must be updated.

---

## 4. Root Scripts

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

The `test:match` script moves to `apps/herald-ai/web/package.json`.

---

## 5. Documentation (Summon Pattern)

### 5.1 Root `README.md` — Ecosystem overview

Content:
- Atta AI description: ecosystem of AI products
- Products table: Herald AI (forensic CV match), Vitakka AI (focus), Vada AI (deliberation), Atta AI (org page)
- Domains: herald.ai, vitakka.ai, vada.ai, atta.ai
- Tech stack table (Turborepo, Bun, Next.js 16, Tailwind v4, shadcn/ui, Sanity, Clerk, Neon, Drizzle, Vercel AI SDK, Biome)
- Shared packages table with descriptions
- Getting started / dev commands
- Links to each product's README

### 5.2 Root `CLAUDE.md` — Routing index

Content:
- Atta AI ecosystem description
- Products table: name, CLAUDE.md link, README link, surfaces (web/mobile/mcp), purpose
- Packages table: name, CLAUDE.md link, README link, purpose
- App structure convention (`apps/{product}/{surface}`)
- Tech stack table
- Monorepo tooling (Turborepo, Bun, Biome, Husky, commitlint)
- Workspace glob: `"apps/*/*"`
- Turbo tasks reference
- Shared code style rules (TypeScript strict, named exports, type imports, Biome)
- Git conventions (commit format, types)
- Links to `.claude/rules/*`
- No product-specific content

### 5.3 `.claude/rules/` — Shared rules

- `git-conventions.md` — Remove Herald branding, keep generic commit format
- `ui-patterns.md` — Keep as shared (theme tokens, typography, layout rules, shadcn/ui)
- `api-conventions.md` — Keep generic API conventions only. Move Herald-specific content (Skeptical Auditor, match API, signal API, rate limiting details) to Herald's CLAUDE.md

### 5.4 Product-level docs

Each product (`apps/{product-ai}/`) gets:
- `CLAUDE.md` — Product overview, surfaces, architecture summary
- `README.md` — Product description, getting started

Each surface (`apps/{product-ai}/{surface}/`) gets:
- `CLAUDE.md` — Surface-specific instructions
- `README.md` — Surface-specific readme

**Herald AI specifics:**
- `apps/herald-ai/web/CLAUDE.md` — Updated from current `apps/herald/CLAUDE.md` with Herald-specific API conventions
- `apps/herald-ai/web/docs/BUILD-SPEC.md` — Moved from root `HERALD-BUILD-SPEC.md`
- `apps/herald-ai/web/docs/ARCHITECTURE.md` — Moved from `docs/ARCHITECTURE.md`
- `apps/herald-ai/mcp/CLAUDE.md` — MCP server instructions (from current `packages/mcp/CLAUDE.md`)

**Scaffold products** (`atta-ai`, `vitakka-ai`, `vada-ai`):
- All CLAUDE.md and README.md files are stubs with product name, purpose, "Not yet implemented" status

### 5.5 Package-level docs

Each package keeps its existing `CLAUDE.md` and `README.md`, updated:
- Replace `@herald` references with `@atta`
- Update links to point to new root doc structure

---

## 6. Empty Scaffolds

### Web surfaces (`{product}/web/`)

```json
{
  "name": "@atta/{product}-web",
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
    "next": "^16.2.1",
    "react": "^19.2.4",
    "react-dom": "^19.2.4"
  },
  "devDependencies": {
    "@atta/typescript-config": "workspace:*",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

Plus: `tsconfig.json` (extends `@atta/typescript-config/nextjs.json`), `src/app/layout.tsx`, `src/app/page.tsx`.

### Mobile surfaces (`{product}/mobile/`)

Minimal `package.json` with name only. No React Native setup yet — just the folder and docs stubs.

### MCP surfaces (`{product}/mcp/`)

Minimal `package.json` with name only (except Herald, which gets the migrated code from `packages/mcp/`).

---

## 7. What Moves Where

| Current Location | New Location | Notes |
|-----------------|--------------|-------|
| `apps/herald/` | `apps/herald-ai/web/` | Moved one level deeper |
| `packages/mcp/` | `apps/herald-ai/mcp/` | Product-specific, not shared |
| `HERALD-BUILD-SPEC.md` | `apps/herald-ai/web/docs/BUILD-SPEC.md` | Moved |
| `docs/ARCHITECTURE.md` | `apps/herald-ai/web/docs/ARCHITECTURE.md` | Moved |
| `tests/match-engine.test.ts` | `apps/herald-ai/web/tests/match-engine.test.ts` | Moved |
| `CLAUDE.md` (root) | Rewritten | Atta AI routing index |
| `README.md` (root) | Rewritten | Atta AI ecosystem overview |
| `docs/superpowers/` | Stays at root | Shared design docs |

---

## 8. What Does NOT Change

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

## 9. Workspace Configuration

Root `package.json` workspaces change from:
```json
"workspaces": ["apps/*", "packages/*"]
```

To:
```json
"workspaces": ["apps/*/*", "packages/*"]
```

This matches the nested `apps/{product}/{surface}` structure.

---

## 10. Verification

After migration:
1. `bun install` — workspace resolution works with new package names and `apps/*/*` glob
2. `bun run typecheck` — no broken imports
3. `bun run check` — typecheck + biome passes
4. `bun run dev:herald` — Herald app starts and works
5. `bun run build:herald` — production build succeeds
