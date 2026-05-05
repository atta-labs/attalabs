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
- No shared schema — only shared tooling (exception below)

## Ecosystem Schemas (Exception to the "no shared schema" rule)

Some tables are shared across all products and live in `packages/db/src/schema/`:
- `users` — canonical user identity (Clerk ID + email)
- `apiKeys` — bearer tokens for MCP and external integrations
- `userProviderKeys` — AES-256-GCM encrypted vendor keys (Anthropic, Google, OpenAI, xAI)
- `mcpSessions` — sessions written by the MCP server

These are distinct from product-specific tables (e.g., Vāda's sessions, transcripts) which remain in each product's local schema.

Query helpers for these tables are in `src/queries/keys.ts`. All query functions accept `db` as first parameter (dependency injection) — each product passes its own db instance.
