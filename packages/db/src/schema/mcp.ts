import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { apiKeys } from './keys'

// ── MCP sessions ──────────────────────────────────────────────────────────────
// Written by the MCP server (packages/mcp-server). Read-only from the web app.
// userId is the Clerk user ID string (not a UUID FK) — set via VADA_USER_ID env.

export const mcpSessions = pgTable(
  'mcp_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id'),
    toolName: text('tool_name').notNull(),
    reviewerProfile: text('reviewer_profile'),
    prompt: text('prompt').notNull(),
    response: text('response').notNull(),
    terminalState: text('terminal_state'),
    transcript: jsonb('transcript'),
    costUsd: text('cost_usd'),
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
    shareToken: text('share_token').unique(),
    mcpApiKeyId: uuid('mcp_api_key_id').references(() => apiKeys.id)
  },
  (t) => [index('mcp_sessions_user_id_idx').on(t.userId)]
)

export type McpSession = typeof mcpSessions.$inferSelect
