# Atta AI Monorepo Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Herald monorepo into the Atta AI ecosystem monorepo with nested product structure (`apps/{product}/{surface}`), shared packages under `@atta` scope, and scaffolded future products.

**Architecture:** In-place migration preserving git history. Herald moves from `apps/herald/` to `apps/herald-ai/web/`. MCP moves from `packages/mcp/` to `apps/herald-ai/mcp/`. Shared packages rename from `@herald/*` to `@atta/*`. Four products scaffolded: herald-ai, atta-ai, vitakka-ai, vada-ai — each with web/mobile/mcp surfaces.

**Tech Stack:** Turborepo, Bun workspaces, Next.js 16, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-05-atta-ai-monorepo-migration-design.md`

---

## File Map

### Files to move
| From | To |
|------|-----|
| `apps/herald/*` | `apps/herald-ai/web/*` |
| `packages/mcp/*` | `apps/herald-ai/mcp/*` |
| `HERALD-BUILD-SPEC.md` | `apps/herald-ai/web/docs/BUILD-SPEC.md` |
| `docs/ARCHITECTURE.md` | `apps/herald-ai/web/docs/ARCHITECTURE.md` |
| `tests/*` | `apps/herald-ai/web/tests/*` |

### Files to rename (package.json name field)
| File | Old name | New name |
|------|----------|----------|
| `package.json` (root) | `herald` | `atta-ai` |
| `apps/herald-ai/web/package.json` | `@herald/web` | `@atta/herald-ai-web` |
| `packages/ui/package.json` | `@herald/ui` | `@atta/ui` |
| `packages/cms/package.json` | `@herald/cms` | `@atta/cms` |
| `apps/herald-ai/mcp/package.json` | `@herald/mcp` | `@atta/herald-ai-mcp` |
| `packages/typescript-config/package.json` | `@herald/typescript-config` | `@atta/typescript-config` |

### Source files with `@herald/` imports to update
| File | Imports to change |
|------|-------------------|
| `apps/herald-ai/web/src/app/[username]/page.tsx` | `@herald/cms` → `@atta/cms` |
| `apps/herald-ai/web/src/app/layout.tsx` | `@herald/cms` → `@atta/cms` |
| `apps/herald-ai/web/src/app/admin/ui/page.tsx` | `@herald/cms` → `@atta/cms` |
| `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts` | `@herald/mcp` → `@atta/herald-ai-mcp` |
| `apps/herald-ai/web/src/components/portal/AdminSidebar.tsx` | `@herald/ui` → `@atta/ui` |
| `apps/herald-ai/web/src/components/portal/ThemeBrowser.tsx` | `@herald/cms` → `@atta/cms` |
| `apps/herald-ai/web/src/components/theme/utils.ts` | `@herald/cms` → `@atta/cms` |
| `apps/herald-ai/web/src/hooks/useLibraryLoader.ts` | `@herald/ui` → `@atta/ui` |
| `packages/ui/scripts/validate-ui-contract.mjs` | `@herald/ui` → `@atta/ui` |

### Config files with `@herald/` references to update
| File | Change |
|------|--------|
| `apps/herald-ai/web/tsconfig.json` | `@herald/typescript-config` → `@atta/typescript-config` |
| `packages/ui/tsconfig.json` | `@herald/typescript-config` → `@atta/typescript-config` |
| `packages/cms/tsconfig.json` | `@herald/typescript-config` → `@atta/typescript-config` |
| `apps/herald-ai/mcp/tsconfig.json` | `@herald/typescript-config` → `@atta/typescript-config` |
| `apps/herald-ai/web/package.json` | All `@herald/*` workspace deps → `@atta/*` |
| `packages/cms/package.json` | `@herald/typescript-config` → `@atta/typescript-config` |
| `packages/ui/package.json` | `@herald/typescript-config` → `@atta/typescript-config` |

### Docs to rewrite
| File | Content |
|------|---------|
| `CLAUDE.md` (root) | Atta AI routing index |
| `README.md` (root) | Atta AI ecosystem overview |
| `.claude/rules/api-conventions.md` | Remove Herald-specific content |
| `.claude/rules/ui-patterns.md` | Remove Herald branding |
| `.claude/rules/git-conventions.md` | Remove Herald branding |
| `packages/ui/CLAUDE.md` | Replace `@herald` → `@atta` |
| `packages/ui/README.md` | Replace `@herald` → `@atta` |
| `packages/cms/CLAUDE.md` | Replace `@herald` → `@atta` |
| `packages/cms/README.md` | Replace `@herald` → `@atta` |
| `packages/cms/src/index.ts` | Replace comment `@herald/cms` → `@atta/cms` |
| `packages/typescript-config/CLAUDE.md` | Replace `@herald` → `@atta` |
| `packages/typescript-config/README.md` | Replace `@herald` → `@atta` |
| `apps/herald-ai/web/CLAUDE.md` | Update paths and imports |
| `apps/herald-ai/web/README.md` | Update name and paths |
| `apps/herald-ai/mcp/CLAUDE.md` | Update from packages/mcp version |
| `apps/herald-ai/mcp/README.md` | Update from packages/mcp version |

### Files to create (scaffolds)
| File | Purpose |
|------|---------|
| `apps/herald-ai/CLAUDE.md` | Herald AI product overview |
| `apps/herald-ai/README.md` | Herald AI product readme |
| `apps/herald-ai/mobile/package.json` | Scaffold `@atta/herald-ai-mobile` |
| `apps/herald-ai/mobile/CLAUDE.md` | Stub |
| `apps/herald-ai/mobile/README.md` | Stub |
| `apps/atta-ai/CLAUDE.md` | Atta AI product overview |
| `apps/atta-ai/README.md` | Atta AI product readme |
| `apps/atta-ai/web/package.json` | `@atta/atta-ai-web` |
| `apps/atta-ai/web/tsconfig.json` | Extends `@atta/typescript-config` |
| `apps/atta-ai/web/src/app/layout.tsx` | Minimal layout |
| `apps/atta-ai/web/src/app/page.tsx` | Placeholder |
| `apps/atta-ai/web/CLAUDE.md` | Stub |
| `apps/atta-ai/web/README.md` | Stub |
| `apps/atta-ai/mobile/package.json` | `@atta/atta-ai-mobile` |
| `apps/atta-ai/mobile/CLAUDE.md` | Stub |
| `apps/atta-ai/mobile/README.md` | Stub |
| `apps/vitakka-ai/CLAUDE.md` | Vitakka AI product overview |
| `apps/vitakka-ai/README.md` | Vitakka AI product readme |
| `apps/vitakka-ai/web/package.json` | `@atta/vitakka-ai-web` |
| `apps/vitakka-ai/web/tsconfig.json` | Extends `@atta/typescript-config` |
| `apps/vitakka-ai/web/src/app/layout.tsx` | Minimal layout |
| `apps/vitakka-ai/web/src/app/page.tsx` | Placeholder |
| `apps/vitakka-ai/web/CLAUDE.md` | Stub |
| `apps/vitakka-ai/web/README.md` | Stub |
| `apps/vitakka-ai/mobile/package.json` | `@atta/vitakka-ai-mobile` |
| `apps/vitakka-ai/mobile/CLAUDE.md` | Stub |
| `apps/vitakka-ai/mobile/README.md` | Stub |
| `apps/vitakka-ai/mcp/package.json` | `@atta/vitakka-ai-mcp` |
| `apps/vitakka-ai/mcp/CLAUDE.md` | Stub |
| `apps/vitakka-ai/mcp/README.md` | Stub |
| `apps/vada-ai/CLAUDE.md` | Vada AI product overview |
| `apps/vada-ai/README.md` | Vada AI product readme |
| `apps/vada-ai/web/package.json` | `@atta/vada-ai-web` |
| `apps/vada-ai/web/tsconfig.json` | Extends `@atta/typescript-config` |
| `apps/vada-ai/web/src/app/layout.tsx` | Minimal layout |
| `apps/vada-ai/web/src/app/page.tsx` | Placeholder |
| `apps/vada-ai/web/CLAUDE.md` | Stub |
| `apps/vada-ai/web/README.md` | Stub |
| `apps/vada-ai/mobile/package.json` | `@atta/vada-ai-mobile` |
| `apps/vada-ai/mobile/CLAUDE.md` | Stub |
| `apps/vada-ai/mobile/README.md` | Stub |
| `apps/vada-ai/mcp/package.json` | `@atta/vada-ai-mcp` |
| `apps/vada-ai/mcp/CLAUDE.md` | Stub |
| `apps/vada-ai/mcp/README.md` | Stub |

### Files to delete (after move)
| File | Reason |
|------|--------|
| `packages/mcp/` (entire directory) | Moved to `apps/herald-ai/mcp/` |
| `tests/` (root directory) | Moved to `apps/herald-ai/web/tests/` |
| `HERALD-BUILD-SPEC.md` (root) | Moved to `apps/herald-ai/web/docs/` |
| `docs/ARCHITECTURE.md` | Moved to `apps/herald-ai/web/docs/` |

---

## Task 1: Move Herald app to nested product structure

**Files:**
- Move: `apps/herald/` → `apps/herald-ai/web/`
- Move: `HERALD-BUILD-SPEC.md` → `apps/herald-ai/web/docs/BUILD-SPEC.md`
- Move: `docs/ARCHITECTURE.md` → `apps/herald-ai/web/docs/ARCHITECTURE.md`
- Move: `tests/` → `apps/herald-ai/web/tests/`

- [ ] **Step 1: Create the herald-ai product directory and move the web app**

```bash
mkdir -p apps/herald-ai
git mv apps/herald apps/herald-ai/web
```

- [ ] **Step 2: Create the docs directory inside the web app and move Herald-specific docs**

```bash
mkdir -p apps/herald-ai/web/docs
git mv HERALD-BUILD-SPEC.md apps/herald-ai/web/docs/BUILD-SPEC.md
git mv docs/ARCHITECTURE.md apps/herald-ai/web/docs/ARCHITECTURE.md
```

- [ ] **Step 3: Move root tests into the Herald web app**

```bash
git mv tests apps/herald-ai/web/tests
```

- [ ] **Step 4: Commit the file moves**

```bash
git add -A
git commit -m "Refactor: Move Herald app to apps/herald-ai/web/ nested structure

- Move apps/herald to apps/herald-ai/web
- Move HERALD-BUILD-SPEC.md to apps/herald-ai/web/docs/BUILD-SPEC.md
- Move docs/ARCHITECTURE.md to apps/herald-ai/web/docs/ARCHITECTURE.md
- Move root tests to apps/herald-ai/web/tests"
```

---

## Task 2: Move MCP package to Herald product

**Files:**
- Move: `packages/mcp/` → `apps/herald-ai/mcp/`

- [ ] **Step 1: Move the MCP package into Herald's product directory**

```bash
git mv packages/mcp apps/herald-ai/mcp
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "Refactor: Move MCP package to apps/herald-ai/mcp/

- MCP is Herald-specific (CV parsing, match engine types)
- Moves from shared packages to product directory"
```

---

## Task 3: Rename all packages from @herald to @atta

**Files:**
- Modify: `package.json` (root) — name field + workspaces + scripts
- Modify: `apps/herald-ai/web/package.json` — name + dependencies
- Modify: `apps/herald-ai/mcp/package.json` — name + devDependencies
- Modify: `packages/ui/package.json` — name + devDependencies
- Modify: `packages/cms/package.json` — name + devDependencies
- Modify: `packages/typescript-config/package.json` — name

- [ ] **Step 1: Update root `package.json`**

Change `name` from `"herald"` to `"atta-ai"`.

Change `workspaces` from:
```json
"workspaces": [
  "apps/*",
  "packages/*"
]
```
to:
```json
"workspaces": [
  "apps/*/*",
  "packages/*"
]
```

Update scripts:
```json
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
  "lint:fix": "biome lint --fix .",
  "format": "biome format .",
  "format:fix": "biome format --fix .",
  "format-and-lint": "biome check .",
  "format-and-lint:fix": "biome check --fix .",
  "check": "turbo typecheck && biome check .",
  "clean": "turbo clean",
  "prepare": "husky"
}
```

Remove the `test:match` script (moves to Herald's package.json).

- [ ] **Step 2: Update `apps/herald-ai/web/package.json`**

Change `name` from `"@herald/web"` to `"@atta/herald-ai-web"`.

Update dependencies:
- `"@herald/cms": "workspace:*"` → `"@atta/cms": "workspace:*"`
- `"@herald/mcp": "workspace:*"` → `"@atta/herald-ai-mcp": "workspace:*"`
- `"@herald/ui": "workspace:*"` → `"@atta/ui": "workspace:*"`

Update devDependencies:
- `"@herald/typescript-config": "workspace:*"` → `"@atta/typescript-config": "workspace:*"`

Add test script:
```json
"test:match": "bun test tests/match-engine.test.ts"
```

- [ ] **Step 3: Update `apps/herald-ai/mcp/package.json`**

Change `name` from `"@herald/mcp"` to `"@atta/herald-ai-mcp"`.

Update devDependencies:
- `"@herald/typescript-config": "workspace:*"` → `"@atta/typescript-config": "workspace:*"`

- [ ] **Step 4: Update `packages/ui/package.json`**

Change `name` from `"@herald/ui"` to `"@atta/ui"`.

Update devDependencies:
- `"@herald/typescript-config": "workspace:*"` → `"@atta/typescript-config": "workspace:*"`

- [ ] **Step 5: Update `packages/cms/package.json`**

Change `name` from `"@herald/cms"` to `"@atta/cms"`.

Update devDependencies:
- `"@herald/typescript-config": "workspace:*"` → `"@atta/typescript-config": "workspace:*"`

- [ ] **Step 6: Update `packages/typescript-config/package.json`**

Change `name` from `"@herald/typescript-config"` to `"@atta/typescript-config"`.

- [ ] **Step 7: Update all tsconfig.json files**

In `apps/herald-ai/web/tsconfig.json`: change `"extends": "@herald/typescript-config/nextjs.json"` to `"extends": "@atta/typescript-config/nextjs.json"`.

In `packages/ui/tsconfig.json`: change `"extends": "@herald/typescript-config/base.json"` to `"extends": "@atta/typescript-config/base.json"`.

In `packages/cms/tsconfig.json`: change `"extends": "@herald/typescript-config/base.json"` to `"extends": "@atta/typescript-config/base.json"`.

In `apps/herald-ai/mcp/tsconfig.json`: change `"extends": "@herald/typescript-config/base.json"` to `"extends": "@atta/typescript-config/base.json"`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "Refactor: Rename all packages from @herald to @atta scope

- Root package: herald → atta-ai
- @herald/web → @atta/herald-ai-web
- @herald/ui → @atta/ui
- @herald/cms → @atta/cms
- @herald/mcp → @atta/herald-ai-mcp
- @herald/typescript-config → @atta/typescript-config
- Update workspace glob to apps/*/*
- Add per-app dev/build scripts"
```

---

## Task 4: Update all source imports from @herald to @atta

**Files:**
- Modify: `apps/herald-ai/web/src/app/[username]/page.tsx`
- Modify: `apps/herald-ai/web/src/app/layout.tsx`
- Modify: `apps/herald-ai/web/src/app/admin/ui/page.tsx`
- Modify: `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts`
- Modify: `apps/herald-ai/web/src/components/portal/AdminSidebar.tsx`
- Modify: `apps/herald-ai/web/src/components/portal/ThemeBrowser.tsx`
- Modify: `apps/herald-ai/web/src/components/theme/utils.ts`
- Modify: `apps/herald-ai/web/src/hooks/useLibraryLoader.ts`
- Modify: `packages/ui/scripts/validate-ui-contract.mjs`
- Modify: `packages/cms/src/index.ts`

- [ ] **Step 1: Update `apps/herald-ai/web/src/app/[username]/page.tsx`**

Replace all `@herald/cms` with `@atta/cms`:
```typescript
import type { ColorScheme } from '@atta/cms'
import { cmsClient, generateThemeCSSForScheme, getThemeById } from '@atta/cms'
```

- [ ] **Step 2: Update `apps/herald-ai/web/src/app/layout.tsx`**

Replace all `@herald/cms` with `@atta/cms`:
```typescript
import type { ColorScheme } from '@atta/cms'
import { cmsClient, generateThemeCSSForScheme, getHeraldConfig } from '@atta/cms'
```

- [ ] **Step 3: Update `apps/herald-ai/web/src/app/admin/ui/page.tsx`**

Replace all `@herald/cms` with `@atta/cms`:
```typescript
import { cmsClient, getThemes } from '@atta/cms'
```

- [ ] **Step 4: Update `apps/herald-ai/web/src/app/api/admin/parse-cv/route.ts`**

Replace `@herald/mcp` with `@atta/herald-ai-mcp`:
```typescript
import { parseCv } from '@atta/herald-ai-mcp'
```

- [ ] **Step 5: Update `apps/herald-ai/web/src/components/portal/AdminSidebar.tsx`**

Replace `@herald/ui` with `@atta/ui`:
```typescript
import {
  // ... existing imports
} from '@atta/ui/components/sidebar'
```

- [ ] **Step 6: Update `apps/herald-ai/web/src/components/portal/ThemeBrowser.tsx`**

Replace `@herald/cms` with `@atta/cms`:
```typescript
import type { CMSTheme } from '@atta/cms'
```

- [ ] **Step 7: Update `apps/herald-ai/web/src/components/theme/utils.ts`**

Replace `@herald/cms` with `@atta/cms`:
```typescript
import { cssColorToOklch } from '@atta/cms/utils/oklch'
```

- [ ] **Step 8: Update `apps/herald-ai/web/src/hooks/useLibraryLoader.ts`**

Replace all `@herald/ui` with `@atta/ui`:
```typescript
const LIBRARY_LOADERS: Record<string, () => Promise<UILibraryComponents>> = {
  basic: () => import('@atta/ui/basic/components'),
  animate: () => import('@atta/ui/animate/components'),
  retro: () => import('@atta/ui/retro/components'),
  brutal: () => import('@atta/ui/brutal/components')
}
```

- [ ] **Step 9: Update `packages/ui/scripts/validate-ui-contract.mjs`**

Replace all `@herald/ui` with `@atta/ui`:
```javascript
} else if (importPath.startsWith('@atta/ui/')) {
  resolved = resolve(uiRoot, importPath.replace('@atta/ui/', ''))
```

(Two occurrences in this file — both must be updated.)

- [ ] **Step 10: Update `packages/cms/src/index.ts`**

Replace comment:
```typescript
// @atta/cms — Sanity CMS client, types, queries, and theme utilities
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Refactor: Update all source imports from @herald to @atta

- @herald/cms → @atta/cms (6 files)
- @herald/ui → @atta/ui (3 files)
- @herald/mcp → @atta/herald-ai-mcp (1 file)"
```

---

## Task 5: Verify build works

- [ ] **Step 1: Remove node_modules and reinstall**

```bash
rm -rf node_modules apps/herald-ai/web/node_modules apps/herald-ai/web/.next
bun install
```

Expected: Clean install with all `@atta/*` packages resolved.

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: All packages pass typecheck with no `@herald` resolution errors.

- [ ] **Step 3: Run full check (typecheck + biome)**

```bash
bun run check
```

Expected: Same warnings as before (biome console warnings in scripts, unused React import in ui), no new errors.

- [ ] **Step 4: Run Herald dev server**

```bash
bun run dev:herald
```

Expected: Next.js dev server starts on port 3000. Verify it loads in browser.

- [ ] **Step 5: Stop dev server, no commit needed** (verification only)

---

## Task 6: Scaffold Herald AI product-level docs and mobile stub

**Files:**
- Create: `apps/herald-ai/CLAUDE.md`
- Create: `apps/herald-ai/README.md`
- Create: `apps/herald-ai/mobile/package.json`
- Create: `apps/herald-ai/mobile/CLAUDE.md`
- Create: `apps/herald-ai/mobile/README.md`

- [ ] **Step 1: Create `apps/herald-ai/CLAUDE.md`**

```markdown
# Herald AI — Product Overview

Herald AI is a forensic CV-to-job-description match tool. It gives any professional a deployed subdomain with an AI-powered Forensic Match Audit. A recruiter pastes a job description and gets a structured, evidence-based match report.

**Domain:** herald.ai

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/herald-ai-web` | Active |
| Mobile | `mobile/` | `@atta/herald-ai-mobile` | Not yet implemented |
| MCP | `mcp/` | `@atta/herald-ai-mcp` | Active |

---

## Documentation

| Doc | Path | Purpose |
|-----|------|---------|
| Web CLAUDE.md | [web/CLAUDE.md](web/CLAUDE.md) | Web app architecture and rules |
| MCP CLAUDE.md | [mcp/CLAUDE.md](mcp/CLAUDE.md) | MCP server architecture |
| Build Spec | [web/docs/BUILD-SPEC.md](web/docs/BUILD-SPEC.md) | Complete build specification |
| Architecture | [web/docs/ARCHITECTURE.md](web/docs/ARCHITECTURE.md) | Architecture decisions |

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — Atta AI monorepo routing index
```

- [ ] **Step 2: Create `apps/herald-ai/README.md`**

```markdown
# Herald AI

Forensic CV-to-job-description match tool. Part of the [Atta AI](../../README.md) ecosystem.

**Domain:** herald.ai

## Surfaces

- **Web** (`web/`) — Next.js 16 app serving the Herald Portal and Envoy pages
- **Mobile** (`mobile/`) — React Native app (not yet implemented)
- **MCP** (`mcp/`) — MCP server with CV parsing and match engine tools

## Getting Started

```bash
# From monorepo root
bun run dev:herald
```

## Documentation

- [Build Spec](web/docs/BUILD-SPEC.md) — Complete build specification
- [Architecture](web/docs/ARCHITECTURE.md) — Architecture decisions
```

- [ ] **Step 3: Create `apps/herald-ai/mobile/package.json`**

```json
{
  "name": "@atta/herald-ai-mobile",
  "version": "0.1.0",
  "private": true
}
```

- [ ] **Step 4: Create `apps/herald-ai/mobile/CLAUDE.md`**

```markdown
# Herald AI Mobile

React Native app for Herald AI. Not yet implemented.

## Related

- [Herald AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

- [ ] **Step 5: Create `apps/herald-ai/mobile/README.md`**

```markdown
# Herald AI Mobile

React Native app for Herald AI (iOS + Android). Not yet implemented.
```

- [ ] **Step 6: Commit**

```bash
git add apps/herald-ai/CLAUDE.md apps/herald-ai/README.md apps/herald-ai/mobile/
git commit -m "Feat: Add Herald AI product docs and mobile scaffold"
```

---

## Task 7: Scaffold Atta AI product

**Files:**
- Create: `apps/atta-ai/CLAUDE.md`
- Create: `apps/atta-ai/README.md`
- Create: `apps/atta-ai/web/package.json`
- Create: `apps/atta-ai/web/tsconfig.json`
- Create: `apps/atta-ai/web/src/app/layout.tsx`
- Create: `apps/atta-ai/web/src/app/page.tsx`
- Create: `apps/atta-ai/web/CLAUDE.md`
- Create: `apps/atta-ai/web/README.md`
- Create: `apps/atta-ai/mobile/package.json`
- Create: `apps/atta-ai/mobile/CLAUDE.md`
- Create: `apps/atta-ai/mobile/README.md`

- [ ] **Step 1: Create product-level docs**

`apps/atta-ai/CLAUDE.md`:
```markdown
# Atta AI — Product Overview

Atta AI is the organization's own page and hub for the Atta AI ecosystem.

**Domain:** atta.ai

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/atta-ai-web` | Not yet implemented |
| Mobile | `mobile/` | `@atta/atta-ai-mobile` | Not yet implemented |

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — Atta AI monorepo routing index
```

`apps/atta-ai/README.md`:
```markdown
# Atta AI

The Atta AI organization page. Part of the [Atta AI](../../README.md) ecosystem.

**Domain:** atta.ai
```

- [ ] **Step 2: Create web scaffold**

`apps/atta-ai/web/package.json`:
```json
{
  "name": "@atta/atta-ai-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3001",
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

`apps/atta-ai/web/tsconfig.json`:
```json
{
  "extends": "@atta/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`apps/atta-ai/web/src/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Atta AI',
  description: 'All your AI. One ecosystem.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
```

`apps/atta-ai/web/src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main>
      <h1>Atta AI</h1>
      <p>Coming soon.</p>
    </main>
  )
}
```

`apps/atta-ai/web/CLAUDE.md`:
```markdown
# Atta AI Web

Next.js web app for Atta AI. Not yet implemented.

## Related

- [Atta AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/atta-ai/web/README.md`:
```markdown
# Atta AI Web

Next.js web app for the Atta AI organization page. Not yet implemented.
```

- [ ] **Step 3: Create mobile scaffold**

`apps/atta-ai/mobile/package.json`:
```json
{
  "name": "@atta/atta-ai-mobile",
  "version": "0.1.0",
  "private": true
}
```

`apps/atta-ai/mobile/CLAUDE.md`:
```markdown
# Atta AI Mobile

React Native app for Atta AI. Not yet implemented.

## Related

- [Atta AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/atta-ai/mobile/README.md`:
```markdown
# Atta AI Mobile

React Native app for Atta AI (iOS + Android). Not yet implemented.
```

- [ ] **Step 4: Commit**

```bash
git add apps/atta-ai/
git commit -m "Feat: Scaffold Atta AI product (web + mobile)"
```

---

## Task 8: Scaffold Vitakka AI product

**Files:**
- Create: `apps/vitakka-ai/CLAUDE.md`
- Create: `apps/vitakka-ai/README.md`
- Create: `apps/vitakka-ai/web/` (package.json, tsconfig, layout, page, CLAUDE.md, README.md)
- Create: `apps/vitakka-ai/mobile/` (package.json, CLAUDE.md, README.md)
- Create: `apps/vitakka-ai/mcp/` (package.json, CLAUDE.md, README.md)

- [ ] **Step 1: Create product-level docs**

`apps/vitakka-ai/CLAUDE.md`:
```markdown
# Vitakka AI — Product Overview

Vitakka AI is a focus and applied thought tool. "Vitakka" means "applied thought" in Pali.

**Domain:** vitakka.ai

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vitakka-ai-web` | Not yet implemented |
| Mobile | `mobile/` | `@atta/vitakka-ai-mobile` | Not yet implemented |
| MCP | `mcp/` | `@atta/vitakka-ai-mcp` | Not yet implemented |

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — Atta AI monorepo routing index
```

`apps/vitakka-ai/README.md`:
```markdown
# Vitakka AI

Focus and applied thought tool. Part of the [Atta AI](../../README.md) ecosystem.

**Domain:** vitakka.ai

"Vitakka" means "applied thought" in Pali.
```

- [ ] **Step 2: Create web scaffold**

`apps/vitakka-ai/web/package.json`:
```json
{
  "name": "@atta/vitakka-ai-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3002",
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

`apps/vitakka-ai/web/tsconfig.json`:
```json
{
  "extends": "@atta/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`apps/vitakka-ai/web/src/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Vitakka AI',
  description: 'Focus and applied thought.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
```

`apps/vitakka-ai/web/src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main>
      <h1>Vitakka AI</h1>
      <p>Coming soon.</p>
    </main>
  )
}
```

`apps/vitakka-ai/web/CLAUDE.md`:
```markdown
# Vitakka AI Web

Next.js web app for Vitakka AI. Not yet implemented.

## Related

- [Vitakka AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/vitakka-ai/web/README.md`:
```markdown
# Vitakka AI Web

Next.js web app for Vitakka AI. Not yet implemented.
```

- [ ] **Step 3: Create mobile scaffold**

`apps/vitakka-ai/mobile/package.json`:
```json
{
  "name": "@atta/vitakka-ai-mobile",
  "version": "0.1.0",
  "private": true
}
```

`apps/vitakka-ai/mobile/CLAUDE.md`:
```markdown
# Vitakka AI Mobile

React Native app for Vitakka AI. Not yet implemented.

## Related

- [Vitakka AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/vitakka-ai/mobile/README.md`:
```markdown
# Vitakka AI Mobile

React Native app for Vitakka AI (iOS + Android). Not yet implemented.
```

- [ ] **Step 4: Create MCP scaffold**

`apps/vitakka-ai/mcp/package.json`:
```json
{
  "name": "@atta/vitakka-ai-mcp",
  "version": "0.1.0",
  "private": true
}
```

`apps/vitakka-ai/mcp/CLAUDE.md`:
```markdown
# Vitakka AI MCP

MCP server for Vitakka AI. Not yet implemented.

## Related

- [Vitakka AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/vitakka-ai/mcp/README.md`:
```markdown
# Vitakka AI MCP

MCP server for Vitakka AI. Not yet implemented.
```

- [ ] **Step 5: Commit**

```bash
git add apps/vitakka-ai/
git commit -m "Feat: Scaffold Vitakka AI product (web + mobile + mcp)"
```

---

## Task 9: Scaffold Vada AI product

**Files:**
- Create: `apps/vada-ai/CLAUDE.md`
- Create: `apps/vada-ai/README.md`
- Create: `apps/vada-ai/web/` (package.json, tsconfig, layout, page, CLAUDE.md, README.md)
- Create: `apps/vada-ai/mobile/` (package.json, CLAUDE.md, README.md)
- Create: `apps/vada-ai/mcp/` (package.json, CLAUDE.md, README.md)

- [ ] **Step 1: Create product-level docs**

`apps/vada-ai/CLAUDE.md`:
```markdown
# Vada AI — Product Overview

Vada AI is a deliberation engine for structured multi-perspective thinking. "Vada" means "deliberation" in Pali.

**Domain:** vada.ai

---

## Surfaces

| Surface | Path | Package | Status |
|---------|------|---------|--------|
| Web | `web/` | `@atta/vada-ai-web` | Not yet implemented |
| Mobile | `mobile/` | `@atta/vada-ai-mobile` | Not yet implemented |
| MCP | `mcp/` | `@atta/vada-ai-mcp` | Not yet implemented |

---

## Related

- [Root CLAUDE.md](../../CLAUDE.md) — Atta AI monorepo routing index
```

`apps/vada-ai/README.md`:
```markdown
# Vada AI

Deliberation engine for structured multi-perspective thinking. Part of the [Atta AI](../../README.md) ecosystem.

**Domain:** vada.ai

"Vada" means "deliberation" in Pali.
```

- [ ] **Step 2: Create web scaffold**

`apps/vada-ai/web/package.json`:
```json
{
  "name": "@atta/vada-ai-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3003",
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

`apps/vada-ai/web/tsconfig.json`:
```json
{
  "extends": "@atta/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

`apps/vada-ai/web/src/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react'

export const metadata = {
  title: 'Vada AI',
  description: 'Deliberation engine for structured thinking.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
```

`apps/vada-ai/web/src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main>
      <h1>Vada AI</h1>
      <p>Coming soon.</p>
    </main>
  )
}
```

`apps/vada-ai/web/CLAUDE.md`:
```markdown
# Vada AI Web

Next.js web app for Vada AI. Not yet implemented.

## Related

- [Vada AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/vada-ai/web/README.md`:
```markdown
# Vada AI Web

Next.js web app for Vada AI. Not yet implemented.
```

- [ ] **Step 3: Create mobile scaffold**

`apps/vada-ai/mobile/package.json`:
```json
{
  "name": "@atta/vada-ai-mobile",
  "version": "0.1.0",
  "private": true
}
```

`apps/vada-ai/mobile/CLAUDE.md`:
```markdown
# Vada AI Mobile

React Native app for Vada AI. Not yet implemented.

## Related

- [Vada AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/vada-ai/mobile/README.md`:
```markdown
# Vada AI Mobile

React Native app for Vada AI (iOS + Android). Not yet implemented.
```

- [ ] **Step 4: Create MCP scaffold**

`apps/vada-ai/mcp/package.json`:
```json
{
  "name": "@atta/vada-ai-mcp",
  "version": "0.1.0",
  "private": true
}
```

`apps/vada-ai/mcp/CLAUDE.md`:
```markdown
# Vada AI MCP

MCP server for Vada AI. Not yet implemented.

## Related

- [Vada AI Overview](../CLAUDE.md)
- [Root CLAUDE.md](../../../CLAUDE.md)
```

`apps/vada-ai/mcp/README.md`:
```markdown
# Vada AI MCP

MCP server for Vada AI. Not yet implemented.
```

- [ ] **Step 5: Commit**

```bash
git add apps/vada-ai/
git commit -m "Feat: Scaffold Vada AI product (web + mobile + mcp)"
```

---

## Task 10: Rewrite root documentation

**Files:**
- Rewrite: `CLAUDE.md` (root)
- Rewrite: `README.md` (root)

- [ ] **Step 1: Rewrite root `CLAUDE.md`**

```markdown
# Atta AI — Claude Code Instructions

Atta AI is an ecosystem of AI products built as a Turborepo monorepo. Each product has its own surfaces (web, mobile, MCP) and documentation. Shared infrastructure lives in packages.

**Naming:** All product names come from Pali. Atta (self), Herald (announcement), Vitakka (applied thought), Vada (deliberation).

---

## Products

| Product | Path | CLAUDE.md | README | Domain | Status |
|---------|------|-----------|--------|--------|--------|
| Herald AI | [apps/herald-ai/](apps/herald-ai/) | [CLAUDE.md](apps/herald-ai/CLAUDE.md) | [README.md](apps/herald-ai/README.md) | herald.ai | Active |
| Atta AI | [apps/atta-ai/](apps/atta-ai/) | [CLAUDE.md](apps/atta-ai/CLAUDE.md) | [README.md](apps/atta-ai/README.md) | atta.ai | Scaffold |
| Vitakka AI | [apps/vitakka-ai/](apps/vitakka-ai/) | [CLAUDE.md](apps/vitakka-ai/CLAUDE.md) | [README.md](apps/vitakka-ai/README.md) | vitakka.ai | Scaffold |
| Vada AI | [apps/vada-ai/](apps/vada-ai/) | [CLAUDE.md](apps/vada-ai/CLAUDE.md) | [README.md](apps/vada-ai/README.md) | vada.ai | Scaffold |

## App Structure Convention

Each product follows a nested structure:

```
apps/{product-ai}/
├── web/              # Next.js web app
├── mobile/           # React Native (iOS + Android)
├── mcp/              # MCP server
├── CLAUDE.md         # Product overview
└── README.md
```

Not every product needs all surfaces. Scaffolds are created empty and built when needed.

---

## Shared Packages

| Package | Path | CLAUDE.md | README | Purpose |
|---------|------|-----------|--------|---------|
| @atta/ui | [packages/ui/](packages/ui/) | [CLAUDE.md](packages/ui/CLAUDE.md) | [README.md](packages/ui/README.md) | Shared UI components + libraries (shadcn/ui + Tailwind v4) |
| @atta/cms | [packages/cms/](packages/cms/) | [CLAUDE.md](packages/cms/CLAUDE.md) | [README.md](packages/cms/README.md) | Sanity CMS schemas, config, typed queries |
| @atta/typescript-config | [packages/typescript-config/](packages/typescript-config/) | [CLAUDE.md](packages/typescript-config/CLAUDE.md) | [README.md](packages/typescript-config/README.md) | Shared TypeScript configs |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + Bun |
| Framework | Next.js 16 (App Router, TypeScript, React 19) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| CMS | Sanity |
| Auth | Clerk |
| AI | Vercel AI SDK + Claude API |
| Database | Neon Postgres + Drizzle ORM |
| Hosting | Vercel |
| Linting | Biome (formatter + linter) |
| Git Hooks | Husky + lint-staged + commitlint |

---

## Monorepo Tooling

### Workspace

Workspaces defined in root `package.json`:
```json
"workspaces": ["apps/*/*", "packages/*"]
```

### Turbo Tasks

```bash
bun run dev              # Start all dev servers
bun run dev:herald       # Start Herald AI only
bun run dev:vitakka      # Start Vitakka AI only
bun run dev:vada         # Start Vada AI only
bun run dev:atta         # Start Atta AI only
bun run build            # Production build (all)
bun run build:herald     # Build Herald AI only
bun run typecheck        # TypeScript check across all packages
bun run check            # Typecheck + lint + format
bun run clean            # Clean build artifacts
```

### Biome

```bash
bun run lint              # Lint only
bun run format            # Format only
bun run format-and-lint   # Both
bun run check             # Typecheck + lint + format
```

---

## Code Style

- TypeScript strict mode, no `any`
- Prefer named exports over default exports
- Use `type` imports for type-only imports
- Biome for formatting (configured in `biome.json`)
- Use shadcn/ui components — do not build custom primitives
- Use `lucide-react` for icons

---

## Git Conventions

Commit format: `Type: Brief description`
Types: `Build`, `Docs`, `Feat`, `Chore`, `Fix`, `Perf`, `Refactor`, `Revert`, `Style`, `Test`

NEVER include `Generated with [Claude Code]` or `Co-Authored-By: Claude` attribution.

---

## Rule Modules

| Rule | File | Loads When |
|------|------|-----------|
| UI patterns | [.claude/rules/ui-patterns.md](.claude/rules/ui-patterns.md) | `.tsx`/`.jsx` files |
| API conventions | [.claude/rules/api-conventions.md](.claude/rules/api-conventions.md) | `api/`, `route.ts` files |
| Git conventions | [.claude/rules/git-conventions.md](.claude/rules/git-conventions.md) | All files |
```

- [ ] **Step 2: Rewrite root `README.md`**

```markdown
# Atta AI

Ecosystem of AI products. Each product is an independent app with its own domain, sharing infrastructure through common packages.

All names come from Pali: Atta (self), Herald (announcement), Vitakka (applied thought), Vada (deliberation).

---

## Products

| Product | Domain | Description | Status |
|---------|--------|-------------|--------|
| [Herald AI](apps/herald-ai/) | herald.ai | Forensic CV-to-job-description match tool | Active |
| [Atta AI](apps/atta-ai/) | atta.ai | Organization hub | Scaffold |
| [Vitakka AI](apps/vitakka-ai/) | vitakka.ai | Focus and applied thought | Scaffold |
| [Vada AI](apps/vada-ai/) | vada.ai | Deliberation engine | Scaffold |

## Shared Packages

| Package | Description |
|---------|-------------|
| [@atta/ui](packages/ui/) | UI components + libraries (shadcn/ui, Tailwind v4) |
| [@atta/cms](packages/cms/) | Sanity CMS schemas and queries |
| [@atta/typescript-config](packages/typescript-config/) | Shared TypeScript configs |

## Tech Stack

Turborepo + Bun | Next.js 16 | React 19 | Tailwind CSS v4 | shadcn/ui | Sanity | Clerk | Neon Postgres | Drizzle ORM | Vercel AI SDK | Biome

## Getting Started

```bash
# Install dependencies
bun install

# Start a specific product
bun run dev:herald       # Herald AI on port 3000
bun run dev:atta         # Atta AI on port 3001
bun run dev:vitakka      # Vitakka AI on port 3002
bun run dev:vada         # Vada AI on port 3003

# Start all
bun run dev

# Quality checks
bun run check            # Typecheck + lint + format
```

## Monorepo Structure

```
atta-ai/
├── apps/
│   ├── herald-ai/       # web/ + mobile/ + mcp/
│   ├── atta-ai/         # web/ + mobile/
│   ├── vitakka-ai/      # web/ + mobile/ + mcp/
│   └── vada-ai/         # web/ + mobile/ + mcp/
├── packages/
│   ├── ui/              # @atta/ui
│   ├── cms/             # @atta/cms
│   └── typescript-config/
└── turbo.json
```

Each product has surfaces: `web/` (Next.js), `mobile/` (React Native), `mcp/` (MCP server).
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "Docs: Rewrite root CLAUDE.md and README.md for Atta AI ecosystem

- CLAUDE.md is now a routing index for all products and packages
- README.md describes the ecosystem with getting started guide
- No product-specific content at root level"
```

---

## Task 11: Update shared rules and package docs

**Files:**
- Modify: `.claude/rules/git-conventions.md`
- Modify: `.claude/rules/ui-patterns.md`
- Modify: `.claude/rules/api-conventions.md`
- Modify: `packages/ui/CLAUDE.md`
- Modify: `packages/ui/README.md`
- Modify: `packages/cms/CLAUDE.md`
- Modify: `packages/cms/README.md`
- Modify: `packages/typescript-config/CLAUDE.md`
- Modify: `packages/typescript-config/README.md`
- Modify: `apps/herald-ai/web/CLAUDE.md`
- Modify: `apps/herald-ai/web/README.md`
- Modify: `apps/herald-ai/mcp/CLAUDE.md`
- Modify: `apps/herald-ai/mcp/README.md`

- [ ] **Step 1: Update `.claude/rules/git-conventions.md`**

Replace any "Herald" references. The file is already generic — just ensure no Herald-specific branding. Keep the commit format rules as-is.

- [ ] **Step 2: Update `.claude/rules/ui-patterns.md`**

Replace "Herald" with "Atta AI" where it appears (e.g., "UI Patterns — Herald" → "UI Patterns — Atta AI"). Keep all theme tokens and typography rules as shared.

- [ ] **Step 3: Update `.claude/rules/api-conventions.md`**

Remove all Herald-specific sections (Skeptical Auditor, Match API, Signal API, Rate Limiting). Keep only generic API conventions:
- Route handler patterns
- Error handling
- JSON response format

Move the Herald-specific content to `apps/herald-ai/web/CLAUDE.md` (append to existing content).

- [ ] **Step 4: Update `packages/ui/CLAUDE.md`**

Replace all `@herald/ui` with `@atta/ui`. Replace "Herald" with "Atta AI" in descriptions. Update relative links:
- `../../CLAUDE.md` still works (root)
- `../../HERALD-BUILD-SPEC.md` → remove this link (moved to Herald app)
- `../../.claude/rules/ui-patterns.md` still works

- [ ] **Step 5: Update `packages/ui/README.md`**

Replace all `@herald/ui` with `@atta/ui`.

- [ ] **Step 6: Update `packages/cms/CLAUDE.md`**

Replace all `@herald/cms` with `@atta/cms`. Replace "Herald" with "Atta AI" in descriptions. Update relative links.

- [ ] **Step 7: Update `packages/cms/README.md`**

Replace all `@herald/cms` with `@atta/cms`.

- [ ] **Step 8: Update `packages/typescript-config/CLAUDE.md`**

Replace all `@herald/typescript-config` with `@atta/typescript-config`.

- [ ] **Step 9: Update `packages/typescript-config/README.md`**

Replace all `@herald/typescript-config` with `@atta/typescript-config`.

- [ ] **Step 10: Update `apps/herald-ai/web/CLAUDE.md`**

Replace all `@herald/*` imports with `@atta/*`. Update relative links:
- `../../CLAUDE.md` → `../../../CLAUDE.md` (one level deeper now)
- `../../HERALD-BUILD-SPEC.md` → `docs/BUILD-SPEC.md` (local)
- `../../docs/ARCHITECTURE.md` → `docs/ARCHITECTURE.md` (local)

Add Herald-specific API conventions section (moved from root `api-conventions.md`):
- The Skeptical Auditor rules
- Match API contract
- Signal API contract
- Rate limiting rules

- [ ] **Step 11: Update `apps/herald-ai/web/README.md`**

Replace `@herald/web` with `@atta/herald-ai-web`. Update description.

- [ ] **Step 12: Update `apps/herald-ai/mcp/CLAUDE.md`**

Replace all `@herald/*` with `@atta/*`. Update relative links. Change "Herald" to "Herald AI" where appropriate. Update path references from `packages/mcp/` to `apps/herald-ai/mcp/`.

- [ ] **Step 13: Update `apps/herald-ai/mcp/README.md`**

Replace `@herald/mcp` with `@atta/herald-ai-mcp`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "Docs: Update all docs from @herald to @atta scope

- Root rules are now generic (no Herald-specific content)
- Herald-specific API conventions moved to apps/herald-ai/web/CLAUDE.md
- All package docs reference @atta scope
- All relative links updated for new directory depth"
```

---

## Task 12: Final verification and cleanup

- [ ] **Step 1: Remove old empty directories if any remain**

```bash
# Check if packages/mcp still exists (should be gone after git mv)
ls packages/mcp 2>/dev/null && echo "STILL EXISTS" || echo "OK - gone"
# Check if apps/herald still exists
ls apps/herald 2>/dev/null && echo "STILL EXISTS" || echo "OK - gone"
# Check if tests/ root still exists
ls tests 2>/dev/null && echo "STILL EXISTS" || echo "OK - gone"
```

If any still exist, remove them.

- [ ] **Step 2: Reinstall and verify**

```bash
rm -rf node_modules apps/herald-ai/web/node_modules apps/herald-ai/web/.next apps/herald-ai/mcp/node_modules
bun install
```

- [ ] **Step 3: Run full typecheck**

```bash
bun run typecheck
```

Expected: All packages pass. No `@herald` resolution errors.

- [ ] **Step 4: Run full check**

```bash
bun run check
```

Expected: Same pre-existing warnings only. No new errors.

- [ ] **Step 5: Grep for any remaining @herald references in source**

```bash
grep -r "@herald/" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.mjs" . | grep -v node_modules | grep -v .next | grep -v bun.lock | grep -v docs/superpowers/
```

Expected: No results. If any remain, fix them.

- [ ] **Step 6: Test Herald dev server**

```bash
bun run dev:herald
```

Expected: Starts on port 3000. Visit in browser to verify it loads.

- [ ] **Step 7: Commit any final fixes**

If Step 5 found remaining references or anything else needed fixing:
```bash
git add -A
git commit -m "Fix: Clean up remaining @herald references"
```

- [ ] **Step 8: Final commit — migration complete**

```bash
git log --oneline -10
```

Verify the commit history tells a clear migration story.
