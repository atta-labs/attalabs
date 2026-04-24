import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const mcpSessions = pgTable('mcp_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'), // null in V1 — no auth yet
  toolName: text('tool_name').notNull(),
  reviewerProfile: text('reviewer_profile'),
  prompt: text('prompt').notNull(),
  response: text('response').notNull(),
  terminalState: text('terminal_state'), // CLEAN | REVISED | MAX_REVISIONS | null for brokered
  transcript: jsonb('transcript'), // AgentOutput[] for deliberate; null for brokered
  costUsd: numeric('cost_usd'),
  tokensInput: integer('tokens_input').notNull(),
  tokensOutput: integer('tokens_output').notNull(),
  toolCalls: jsonb('tool_calls'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  durationMs: integer('duration_ms').notNull(),
  sessionTitle: text('session_title'),
  context: text('context'),
  currentLeaning: text('current_leaning'),
  stakes: text('stakes'),
  origin: text('origin'),
  isShared: boolean('is_shared').default(false).notNull(),
  shareToken: text('share_token').unique()
})

export type McpSession = typeof mcpSessions.$inferSelect
export type NewMcpSession = typeof mcpSessions.$inferInsert
