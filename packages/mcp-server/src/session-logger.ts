import { createDb } from '@atta/db'
import { mcpSessions, type NewMcpSession } from './schema.js'

/**
 * Persist an MCP session row to Postgres.
 * Returns the session ID on success, undefined if DATABASE_URL is unset or insert fails.
 */
export async function logSession(data: NewMcpSession): Promise<string | undefined> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.warn('[MCP] DATABASE_URL not set — session not persisted')
    return undefined
  }

  try {
    const db = createDb(connectionString)
    const [row] = await db.insert(mcpSessions).values(data).returning({ id: mcpSessions.id })
    return row?.id
  } catch (err) {
    console.error('[MCP] Failed to persist session:', err)
    return undefined
  }
}
