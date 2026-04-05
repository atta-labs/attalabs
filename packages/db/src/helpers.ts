import { timestamp, uuid } from 'drizzle-orm/pg-core'

export function primaryId() {
  return uuid('id').primaryKey().defaultRandom()
}

export function timestamps() {
  return {
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  }
}

export function createdTimestamp() {
  return {
    createdAt: timestamp('created_at').defaultNow().notNull()
  }
}
