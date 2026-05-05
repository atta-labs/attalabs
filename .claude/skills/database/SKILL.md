---
name: database
description: Drizzle ORM patterns for Neon Postgres — schema, queries, JSON fields, migrations across Atta AI apps
paths:
  - "packages/db/**"
---

# Database — Atta AI

## Context

Each app uses Neon Postgres + Drizzle ORM. Each product maintains its own local `users` table keyed by `clerk_id`. No cross-product data sharing.

---

## Rules

### Schema
- **MUST** use `snake_case` for all column names
- **MUST** store JSON fields as `text` — serialize/deserialize manually
- **MUST** use `clerk_id` as primary key for user tables
- **MUST NOT** share user tables across products — each app has its own

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
- ❌ Sharing user tables across products — each product is isolated
- ❌ Throwing on missing rows — return `null` and handle in caller
- ❌ Forgetting `updatedAt: new Date()` on updates
