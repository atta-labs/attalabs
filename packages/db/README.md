# @atta/db

Shared database tooling for the Atta AI ecosystem. Provides a Drizzle ORM connection factory and column helpers.

Each product maintains its own database schema and migrations. This package eliminates boilerplate without creating coupling.

## API

- `createDb(connectionString, schema?)` — Returns a typed Drizzle client connected to Neon
- `primaryId()` — UUID primary key column with `gen_random_uuid()` default
- `timestamps()` — `created_at` + `updated_at` timestamp columns
- `createdTimestamp()` — `created_at` only
