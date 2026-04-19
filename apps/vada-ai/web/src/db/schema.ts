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

export const terminalStateEnum = pgEnum('terminal_state', [
  'CLEAN',
  'REVISED',
  'UNCONVERGED',
  'SPARRING_COMPLETE',
  'ERROR'
])

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

// ── Benchmark metrics ────────────────────────────────────────────────────────
// Optional A/B comparison per session — only populated when the user opts into
// the benchmark checkbox on /deliberate. Captures a single-shot baseline
// response against the deliberation's synthesis, plus an AI judge verdict
// comparing them, plus token/elapsed metrics for both branches. See the
// /deliberation/[id]/benchmark page and the plan doc in specs/v2/plans/.

export const benchmarkMetrics = pgTable('benchmark_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id')
    .references(() => sessions.id)
    .unique()
    .notNull(),

  // Single-shot baseline — same model, same question, no deliberation.
  baselineAnswer: text('baseline_answer'),
  baselineProvider: varchar('baseline_provider'),
  baselineModelId: varchar('baseline_model_id'),
  baselineTokensInput: integer('baseline_tokens_input'),
  baselineTokensOutput: integer('baseline_tokens_output'),
  baselineElapsedMs: integer('baseline_elapsed_ms'),
  baselineCreatedAt: timestamp('baseline_created_at'),

  // AI judge verdict — asked to compare the two outputs. May run on a
  // stronger model than the participants (set NEXT_PUBLIC_VADA_JUDGE_PROVIDER
  // and _MODEL to override). Provider/modelId are captured so the benchmark
  // page can render which model judged which run.
  judgeResponse: text('judge_response'),
  judgeProvider: varchar('judge_provider'),
  judgeModelId: varchar('judge_model_id'),
  judgeDiagnosis: varchar('judge_diagnosis'),
  judgeTokensInput: integer('judge_tokens_input'),
  judgeTokensOutput: integer('judge_tokens_output'),
  judgeElapsedMs: integer('judge_elapsed_ms'),
  judgeCreatedAt: timestamp('judge_created_at'),

  // Deliberation aggregate — summed across every agent/round/conclusion call.
  deliberationTokensInput: integer('deliberation_tokens_input').default(0).notNull(),
  deliberationTokensOutput: integer('deliberation_tokens_output').default(0).notNull(),
  deliberationSumElapsedMs: integer('deliberation_sum_elapsed_ms').default(0).notNull(),
  deliberationCallCount: integer('deliberation_call_count').default(0).notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
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
