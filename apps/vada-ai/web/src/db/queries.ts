import { and, desc, eq, gte, sql } from 'drizzle-orm'
import { db, schema } from './index'

// --- Users ---

export async function getOrCreateUser(clerkId: string, email: string) {
  const existing = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1)
  if (existing[0]) return existing[0]

  const inserted = await db.insert(schema.users).values({ clerkId, email }).returning()
  return inserted[0]!
}

export async function getDailySessionCount(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), gte(schema.sessions.createdAt, today)))
  return Number(result[0]?.count ?? 0)
}

// --- Sessions ---

export async function createSession(
  userId: string,
  question: string,
  agents: string[],
  provider?: string,
  modelId?: string
) {
  const inserted = await db
    .insert(schema.sessions)
    .values({ userId, question, agents, provider: provider ?? null, modelId: modelId ?? null })
    .returning()
  return inserted[0]!
}

export async function updateSessionState(sessionId: string, state: string) {
  await db
    .update(schema.sessions)
    .set({ state: state as typeof schema.sessions.$inferInsert.state, updatedAt: new Date() })
    .where(eq(schema.sessions.id, sessionId))
}

export async function setSessionTerminalState(sessionId: string, terminalState: string) {
  await db
    .update(schema.sessions)
    .set({
      state: 'TERMINAL' as const,
      terminalState: terminalState as typeof schema.sessions.$inferInsert.terminalState,
      updatedAt: new Date()
    })
    .where(eq(schema.sessions.id, sessionId))
}

export async function listSessions(userId: string) {
  return db
    .select({
      id: schema.sessions.id,
      question: schema.sessions.question,
      state: schema.sessions.state,
      terminalState: schema.sessions.terminalState,
      createdAt: schema.sessions.createdAt
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.userId, userId))
    .orderBy(desc(schema.sessions.createdAt))
}

export async function getSessionWithTranscript(sessionId: string) {
  const session = await db.select().from(schema.sessions).where(eq(schema.sessions.id, sessionId)).limit(1)
  if (!session[0]) return null

  const entries = await db
    .select()
    .from(schema.transcriptEntries)
    .where(eq(schema.transcriptEntries.sessionId, sessionId))
    .orderBy(schema.transcriptEntries.round, schema.transcriptEntries.orderInRound)

  const interv = await db
    .select()
    .from(schema.interventions)
    .where(eq(schema.interventions.sessionId, sessionId))
    .orderBy(schema.interventions.createdAt)

  const conclusion = await db
    .select()
    .from(schema.conclusions)
    .where(eq(schema.conclusions.sessionId, sessionId))
    .limit(1)

  return {
    ...session[0],
    transcriptEntries: entries,
    interventions: interv,
    conclusion: conclusion[0] ?? null
  }
}

// --- Transcript ---

export async function insertTranscriptEntry(data: {
  sessionId: string
  round: number
  agent: string
  content: string
  target?: string
  orderInRound: number
}) {
  return db.insert(schema.transcriptEntries).values(data).returning()
}

// --- Conclusions ---

export async function insertConclusion(data: {
  sessionId: string
  originalJson: unknown
  criticVerdict: string
  terminalState: string
  reviewBy?: string
  revisedJson?: unknown
  criticReVerdict?: string
}) {
  return db
    .insert(schema.conclusions)
    .values({
      sessionId: data.sessionId,
      originalJson: data.originalJson,
      criticVerdict: data.criticVerdict,
      terminalState: data.terminalState as typeof schema.conclusions.$inferInsert.terminalState,
      reviewBy: data.reviewBy ?? null,
      revisedJson: data.revisedJson ?? null,
      criticReVerdict: data.criticReVerdict ?? null
    })
    .returning()
}
