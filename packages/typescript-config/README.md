# @atta/typescript-config

Shared TypeScript configurations for the Atta AI monorepo.

## Configs

| Config | Purpose |
|--------|---------|
| `base.json` | Strict TypeScript for library packages |
| `nextjs.json` | Next.js app config (extends base) |

## Usage

```json
{
  "extends": "@atta/typescript-config/base.json"
}
```

```json
{
  "extends": "@atta/typescript-config/nextjs.json"
}
```
