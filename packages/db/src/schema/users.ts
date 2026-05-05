import { pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  clerkId: varchar('clerk_id', { length: 255 }).primaryKey(),
  email: varchar('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
