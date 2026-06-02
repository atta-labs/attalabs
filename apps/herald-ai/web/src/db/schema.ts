import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import { users } from '@atta/db'

export { users }

export const heraldProfiles = pgTable('herald_profiles', {
  clerkId: varchar('clerk_id', { length: 255 })
    .primaryKey()
    .references(() => users.clerkId, { onDelete: 'cascade' }),
  username: varchar('username', { length: 50 }).unique().notNull(),
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
  bio: text('bio'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
