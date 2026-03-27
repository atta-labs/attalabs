# @herald/typescript-config

Shared TypeScript configurations for the Herald monorepo.

## Configs

| Config | Purpose |
|--------|---------|
| `base.json` | Strict TypeScript for library packages |
| `nextjs.json` | Next.js app config (extends base) |

## Usage

```json
{
  "extends": "@herald/typescript-config/base.json"
}
```

```json
{
  "extends": "@herald/typescript-config/nextjs.json"
}
```
