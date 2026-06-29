import { boolean, index, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from '@atta/db'

export { users }

// Mirrors @atta/db schema — these tables live in Herald's own Neon DB (see D-0XX).
// Keeping them here ensures drizzle-kit push doesn't drop them.

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull(),
    name: text('name').notNull(),
    product: text('product').notNull().default('herald'),
    keyHash: text('key_hash').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at')
  },
  (t) => [index('api_keys_clerk_id_idx').on(t.clerkId), index('api_keys_key_hash_idx').on(t.keyHash)]
)

export const userProviderKeys = pgTable('user_provider_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  encryptedPayload: jsonb('encrypted_payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const heraldProfiles = pgTable('herald_profiles', {
  clerkId: varchar('clerk_id', { length: 255 })
    .primaryKey()
    .references(() => users.clerkId, { onDelete: 'cascade' }),
  username: varchar('username', { length: 50 }).unique('herald_profiles_username_key').notNull(),
  githubHandle: varchar('github_handle', { length: 100 }),
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }),
  availability: varchar('availability', { length: 255 }),
  summary: text('summary').notNull(),
  stack: text('stack').notNull().default('[]'),
  projects: text('projects').notNull().default('[]'),
  experience: text('experience').notNull().default('[]'),
  themeId: varchar('theme_id', { length: 255 }),
  colorScheme: varchar('color_scheme', { length: 10 }).default('dark'),
  library: varchar('library', { length: 50 }).default('basic'),
  fontSans: varchar('font_sans', { length: 255 }),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  cvUrl: varchar('cv_url', { length: 500 }),
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  discordHandle: varchar('discord_handle', { length: 100 }),
  bio: text('bio'),
  // Per-user audit-model preference (task 3b). Stores the vendor + model that
  // /api/audit should compile the herald-auditor flow with. When null, the
  // audit falls back to flow.defaults.model (current behavior preserved).
  auditModelVendor: varchar('audit_model_vendor', { length: 50 }),
  auditModelId: varchar('audit_model_id', { length: 100 }),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  isPublished: boolean('is_published').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
