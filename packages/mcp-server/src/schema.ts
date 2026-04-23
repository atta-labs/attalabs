import { integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const mcpSessions = pgTable('mcp_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'), // null in V1 — no auth yet
  toolName: text('tool_name').notNull(),
  reviewerProfile: text('reviewer_profile'),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  costUsd: numeric('cost_usd'),
  tokensInput: integer('tokens_input').notNull(),
  tokensOutput: integer('tokens_output').notNull(),
  toolCalls: jsonb('tool_calls'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  durationMs: integer('duration_ms').notNull()
})

export type McpSession = typeof mcpSessions.$inferSelect
export type NewMcpSession = typeof mcpSessions.$inferInsert
