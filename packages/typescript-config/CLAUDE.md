# TypeScript Config — Claude Code Instructions

Shared TypeScript configurations for the Herald monorepo. This package provides base configs that all other packages and apps extend.

Provides base configs that all other packages and apps extend.

---

## Configs

| File | Extends | Used By |
|------|---------|---------|
| `base.json` | — | `packages/ui`, `packages/cms`, `packages/mcp` |
| `nextjs.json` | `base.json` | `apps/herald` |

### `base.json`

Strict TypeScript for library packages. Key settings:

- `strict: true` — all strict checks enabled
- `noUncheckedIndexedAccess: true` — prevents unsafe array/object index access
- `moduleResolution: "bundler"` — for modern bundler compatibility
- `target: "ES2022"` — modern JavaScript output
- `isolatedModules: true` — required for Turbopack/esbuild

### `nextjs.json`

Extends `base.json` with Next.js-specific settings:

- `jsx: "preserve"` — Next.js handles JSX transformation
- `noEmit: true` — Next.js handles compilation
- `plugins: [{ "name": "next" }]` — Next.js TypeScript plugin

---

## Rules

### NEVER modify these configs without understanding downstream impact

Every package and app in the monorepo extends these configs. A change here affects everything.

### How packages consume these configs

```json
// packages/*/tsconfig.json
{
  "extends": "@herald/typescript-config/base.json",
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

```json
// apps/herald/tsconfig.json
{
  "extends": "@herald/typescript-config/nextjs.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Adding a new config

If a new package type is needed (e.g. a Cloudflare Worker), create a new JSON file here that extends `base.json`.

---

## Related Documentation

- [Root CLAUDE.md](../../CLAUDE.md) — Monorepo routing index
