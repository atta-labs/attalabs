import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

// ── API keys ──────────────────────────────────────────────────────────────────
// Bearer tokens issued to users for MCP and external integrations.
// Plaintext is shown once at creation time; only the SHA-256 hash is stored.

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull(),
    name: text('name').notNull(),
    product: text('product').notNull().default('vada'),
    keyHash: text('key_hash').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at')
  },
  (t) => [index('api_keys_clerk_id_idx').on(t.clerkId), index('api_keys_key_hash_idx').on(t.keyHash)]
)

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert

// ── User provider keys ────────────────────────────────────────────────────────
// Server-side encrypted vendor API keys (Anthropic, Google, OpenAI, xAI).
// One row per user. Payload is AES-256-GCM envelope from @atta/crypto.

export const userProviderKeys = pgTable('user_provider_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  encryptedPayload: jsonb('encrypted_payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export type UserProviderKeys = typeof userProviderKeys.$inferSelect
export type NewUserProviderKeys = typeof userProviderKeys.$inferInsert
