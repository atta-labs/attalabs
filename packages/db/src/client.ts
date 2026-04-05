import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

export function createDb(connectionString: string, schema?: Record<string, unknown>) {
  const sql = neon(connectionString)
  return drizzle(sql, { schema: schema ?? {} })
}
