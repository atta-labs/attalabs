---
name: database
description: Drizzle ORM patterns for Neon Postgres — schema, queries, JSON fields, migrations across Atta AI apps
---

# Database — Atta AI

## Context

Each app uses Neon Postgres + Drizzle ORM. Identity (the `users` table) and ecosystem-shared concerns (provider keys, API keys, MCP sessions) live in `packages/db/` (`@atta/db`) and are shared across products. Product-specific tables stay in each product's app-local schema (`apps/{product}/web/src/db/schema.ts`). The split is documented as a deliberate exception to per-product isolation, driven by hosted MCP (D-029) and the shared keys UI extraction (D-030) — see `apps/vada-ai/docs/vada-decisions-legacy.md` for rationale.

---

## Rules

### Schema
- **MUST** use `snake_case` for all column names
- **MUST** store JSON fields as `text` — serialize/deserialize manually
- **MUST** use `clerk_id` as primary key (or FK) for user-scoped tables
- The `users` table is shared across products in `packages/db/src/schema/users.ts`. Per-product profile tables (e.g., `apps/vada-ai/web/src/db/schema.ts` `userSettings`) reference `users.clerk_id` as a FK.
- Ecosystem-shared key tables (`api_keys`, `user_provider_keys`, `mcp_sessions`) live in `packages/db/src/schema/keys.ts` (per D-030). These are read by any product that exposes hosted MCP or BYOK Settings.

```ts
import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  clerkId: varchar('clerk_id', { length: 255 }).primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  githubHandle: varchar('github_handle', { length: 100 }),

  // JSON stored as text
  stack: text('stack').notNull().default('[]'),
  projects: text('projects').notNull().default('[]'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

### Ecosystem-shared vs product-local schemas

`packages/db/src/schema/`:
- `users.ts` — identity (`users`)
- `keys.ts` — `api_keys`, `user_provider_keys`, `mcp_sessions` (per D-030)

`apps/{product}/web/src/db/schema.ts`:
- product-specific tables (deliberation transcripts, benchmarks, per-product preferences like `userSettings`, etc.)

When adding a new table, ask: "Will any other product in the ecosystem need to read this table?" If yes (or plausibly so within a year), put it in `packages/db/`. If no, app-local. Default to app-local; promote to ecosystem-shared only when the use case is concrete.

### Envelope encryption for sensitive columns

Where a column holds user-provided secrets (e.g., `user_provider_keys.key_ciphertext`), the storage pattern is:
1. Plaintext is encrypted via `@atta/crypto`'s envelope encryption — AES-256-GCM with AAD bound to the user's `clerk_id`.
2. The ciphertext, IV, and a `kms_key_id` version identity are stored.
3. Decryption happens only inside request handlers, never in cron jobs or analytics paths.
4. The `MASTER_ENCRYPTION_KEY` env var holds the master key in V1; the `kms_key_id` column reserves migration to KMS-managed keys for V2.

If you're adding a column that holds a user-provided secret, follow the `user_provider_keys` pattern. Do not store secrets in plaintext columns.

### JSON Fields
- **MUST** serialize before writing, deserialize after reading — never store raw objects

```ts
// Writing
await db.insert(schema.users).values({
  stack: JSON.stringify(stackArray),
})

// Reading
const user = await getUserById(clerkId)
const stack = JSON.parse(user.stack) as StackItem[]
```

### Query Pattern
- **MUST** centralize all queries in `src/db/queries.ts`
- **MUST** use `eq`, `and`, `or` from `drizzle-orm` — never raw SQL strings
- **MUST** return `null` (not throw) when row not found

```ts
import { eq } from 'drizzle-orm'
import { db, schema } from '.'

export async function getUserByClerkId(clerkId: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.clerkId, clerkId))
    .limit(1)
  return rows[0] ?? null
}
```

### Upsert Pattern
```ts
export async function upsertUser(data: NewUser) {
  const existing = await getUserByClerkId(data.clerkId)
  if (existing) {
    await db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.clerkId, data.clerkId))
  } else {
    await db.insert(schema.users).values(data)
  }
}
```

### Migrations
- Generate: `bun run db:generate` (Drizzle Kit)
- Apply: `bun run db:migrate`
- **MUST** review generated SQL before applying
- **MUST NOT** edit generated migration files — regenerate if wrong

---

## File Structure

```
src/db/
├── schema.ts      # Table definitions (Drizzle pgTable)
├── queries.ts     # All query functions (exported named functions)
└── index.ts       # DB client factory + schema re-export
```

---

## Anti-patterns

- ❌ Raw SQL strings — use Drizzle query builder
- ❌ Inline queries in components or route handlers — always use `queries.ts`
- ❌ Storing parsed JSON objects directly — serialize to text first
- ❌ Defining a new product-local `users` table — the shared table in `@atta/db` is canonical; reference it by FK
- ❌ Storing user-provided secrets (API keys, OAuth tokens, etc.) in plaintext columns — follow the `user_provider_keys` envelope encryption pattern
- ❌ Putting product-specific tables in `@atta/db` because they "feel ecosystem-shaped" — defer to app-local; promote later when a second consumer is concrete
- ❌ Throwing on missing rows — return `null` and handle in caller
- ❌ Forgetting `updatedAt: new Date()` on updates
