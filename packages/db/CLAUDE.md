# @atta/db — Shared Database Tooling

Shared Drizzle ORM utilities for the Atta AI ecosystem. Each product owns its own schema and migrations — this package provides the connection factory and column helpers only.

## Usage

```typescript
import { createDb } from '@atta/db'
import * as schema from './schema'

export const db = createDb(process.env.DATABASE_URL!, schema)
```

## Column Helpers

```typescript
import { primaryId, timestamps } from '@atta/db/helpers'
```

## Key Rules

- Each app has its own Postgres schema (e.g., `vada`, `herald`)
- Drizzle config and migrations stay local to each app
- No shared schema — only shared tooling
