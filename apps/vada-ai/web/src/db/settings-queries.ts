import 'server-only'
import { and, eq } from 'drizzle-orm'
import { db, schema } from './index'

// NOTE: API keys are not stored server-side. They live in the user's browser
// (passkey-encrypted IndexedDB or in-memory). See /trust.

// ── Team Models ───────────────────────────────────────────────────────────────

export interface TeamModelEntry {
  teamId: string
  agentRole: string
  provider: string
  modelId: string
}

export async function upsertUserTeamModel(
  userId: string,
  teamId: string,
  agentRole: string,
  provider: string,
  modelId: string
): Promise<void> {
  await db
    .insert(schema.userTeamModels)
    .values({ userId, teamId, agentRole, provider, modelId })
    .onConflictDoUpdate({
      target: [schema.userTeamModels.userId, schema.userTeamModels.teamId, schema.userTeamModels.agentRole],
      set: { provider, modelId, updatedAt: new Date() }
    })
}

export async function getUserTeamModels(userId: string): Promise<TeamModelEntry[]> {
  return db
    .select({
      teamId: schema.userTeamModels.teamId,
      agentRole: schema.userTeamModels.agentRole,
      provider: schema.userTeamModels.provider,
      modelId: schema.userTeamModels.modelId
    })
    .from(schema.userTeamModels)
    .where(eq(schema.userTeamModels.userId, userId))
}

export async function deleteUserTeamModel(userId: string, teamId: string, agentRole: string): Promise<void> {
  await db
    .delete(schema.userTeamModels)
    .where(
      and(
        eq(schema.userTeamModels.userId, userId),
        eq(schema.userTeamModels.teamId, teamId),
        eq(schema.userTeamModels.agentRole, agentRole)
      )
    )
}

// ── User Settings (face style etc.) ──────────────────────────────────────────

export interface UserSettingsData {
  faceStyle: 'reductive' | 'emblematic'
}

export async function getUserSettings(userId: string): Promise<UserSettingsData> {
  const rows = await db
    .select({ faceStyle: schema.userSettings.faceStyle })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1)
  return { faceStyle: (rows[0]?.faceStyle ?? 'emblematic') as 'reductive' | 'emblematic' }
}

export async function upsertUserSettings(userId: string, data: Partial<UserSettingsData>): Promise<void> {
  await db
    .insert(schema.userSettings)
    .values({ userId, ...data })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: { ...data, updatedAt: new Date() }
    })
}
