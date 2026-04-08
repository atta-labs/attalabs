import { date, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const sessionStateEnum = pgEnum('session_state', [
  'PENDING',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'CONCLUDING',
  'AUDITING',
  'REVISING',
  'TERMINAL'
])

export const terminalStateEnum = pgEnum('terminal_state', ['CLEAN', 'REVISED', 'UNCONVERGED'])

export const interventionTypeEnum = pgEnum('intervention_type', ['WHISPER', 'DIRECTIVE', 'STOP'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: varchar('clerk_id').unique().notNull(),
  email: varchar('email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  question: text('question').notNull(),
  agents: text('agents').array().notNull(),
  state: sessionStateEnum('state').default('PENDING').notNull(),
  terminalState: terminalStateEnum('terminal_state'),
  provider: varchar('provider'),
  modelId: varchar('model_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})

export const transcriptEntries = pgTable('transcript_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => sessions.id)
    .notNull(),
  round: integer('round').notNull(),
  agent: varchar('agent').notNull(),
  content: text('content').notNull(),
  target: varchar('target'),
  orderInRound: integer('order_in_round').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const interventions = pgTable('interventions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => sessions.id)
    .notNull(),
  type: interventionTypeEnum('type').notNull(),
  target: varchar('target'),
  content: text('content'),
  round: integer('round').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})

export const conclusions = pgTable('conclusions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => sessions.id)
    .unique()
    .notNull(),
  originalJson: jsonb('original_json').notNull(),
  criticVerdict: varchar('critic_verdict').notNull(),
  revisedJson: jsonb('revised_json'),
  criticReVerdict: varchar('critic_re_verdict'),
  terminalState: terminalStateEnum('terminal_state').notNull(),
  reviewBy: date('review_by'),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
