import { boolean, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  clerkId: varchar('clerk_id', { length: 255 }).primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  githubHandle: varchar('github_handle', { length: 100 }),
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  location: varchar('location', { length: 255 }),
  availability: varchar('availability', { length: 255 }),
  summary: text('summary').notNull(),
  stack: text('stack').notNull().default('[]'), // JSON array stored as text
  projects: text('projects').notNull().default('[]'), // JSON array stored as text
  experience: text('experience').notNull().default('[]'), // JSON array stored as text
  themeId: varchar('theme_id', { length: 255 }),
  colorScheme: varchar('color_scheme', { length: 10 }).default('dark'),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
