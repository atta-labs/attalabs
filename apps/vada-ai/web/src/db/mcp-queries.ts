import { db } from './index'
import { mcpSessions } from './schema'
import { and, desc, eq } from 'drizzle-orm'

export async function listBrokeredConsultations(clerkUserId: string) {
  return db
    .select({
      id: mcpSessions.id,
      reviewerProfile: mcpSessions.reviewerProfile,
      prompt: mcpSessions.prompt,
      tokensInput: mcpSessions.tokensInput,
      tokensOutput: mcpSessions.tokensOutput,
      costUsd: mcpSessions.costUsd,
      durationMs: mcpSessions.durationMs,
      createdAt: mcpSessions.createdAt
    })
    .from(mcpSessions)
    .where(and(eq(mcpSessions.toolName, 'vada__deliberate_brokered'), eq(mcpSessions.userId, clerkUserId)))
    .orderBy(desc(mcpSessions.createdAt))
}

export async function getBrokeredConsultation(id: string, clerkUserId: string) {
  const rows = await db
    .select()
    .from(mcpSessions)
    .where(
      and(
        eq(mcpSessions.id, id),
        eq(mcpSessions.toolName, 'vada__deliberate_brokered'),
        eq(mcpSessions.userId, clerkUserId)
      )
    )
    .limit(1)
  return rows[0] ?? null
}
