import { date, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'

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

export const terminalStateEnum = pgEnum('terminal_state', ['CLEAN', 'REVISED', 'UNCONVERGED', 'SPARRING_COMPLETE'])

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
  agentModels: jsonb('agent_models'),
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

// ── Settings ─────────────────────────────────────────────────────────────────
// Note: there is no user_api_keys table. Keys live only in the user's browser.
// See /trust for the BYOK architecture guarantee.

export const userTeamModels = pgTable(
  'user_team_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    teamId: varchar('team_id').notNull(), // 'crucible' | 'war_room' | 'sparring'
    agentRole: varchar('agent_role').notNull(), // role slug e.g. 'strategist'
    provider: varchar('provider').notNull(),
    modelId: varchar('model_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
  },
  (t) => [unique().on(t.userId, t.teamId, t.agentRole)]
)

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
  faceStyle: varchar('face_style').default('emblematic').notNull(), // 'reductive' | 'emblematic'
  updatedAt: timestamp('updated_at').defaultNow().notNull()
})
