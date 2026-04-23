/**
 * Creates the mcp_sessions table if it does not already exist.
 * Run once before using the MCP server with Postgres persistence:
 *
 *   DATABASE_URL=... bun packages/mcp-server/scripts/migrate.ts
 */
import { createDb } from '@atta/db'
import { sql } from 'drizzle-orm'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL required')
  process.exit(1)
}

const db = createDb(connectionString)

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS mcp_sessions (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         TEXT,
    tool_name       TEXT      NOT NULL,
    reviewer_profile TEXT,
    prompt          TEXT      NOT NULL,
    response        TEXT      NOT NULL,
    terminal_state  TEXT,
    transcript      JSONB,
    cost_usd        NUMERIC,
    tokens_input    INTEGER   NOT NULL,
    tokens_output   INTEGER   NOT NULL,
    tool_calls      JSONB,
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    duration_ms     INTEGER   NOT NULL
  )
`)

// Add columns for existing tables created before Phase 3b.2
await db.execute(sql`ALTER TABLE mcp_sessions ADD COLUMN IF NOT EXISTS terminal_state TEXT`)
await db.execute(sql`ALTER TABLE mcp_sessions ADD COLUMN IF NOT EXISTS transcript JSONB`)

console.info('[migrate] mcp_sessions table ready')
