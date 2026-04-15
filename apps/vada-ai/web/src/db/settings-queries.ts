import { and, eq } from 'drizzle-orm'
import { db, schema } from './index'
import { decryptApiKey, encryptApiKey, makeKeyHint } from '@/lib/crypto'
import type { Provider } from '@/lib/models'

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function upsertUserApiKey(userId: string, provider: string, plainKey: string): Promise<string> {
  const encryptedKey = await encryptApiKey(plainKey)
  const keyHint = makeKeyHint(plainKey)
  await db
    .insert(schema.userApiKeys)
    .values({ userId, provider, encryptedKey, keyHint })
    .onConflictDoUpdate({
      target: [schema.userApiKeys.userId, schema.userApiKeys.provider],
      set: { encryptedKey, keyHint, updatedAt: new Date() }
    })
  return keyHint
}

export async function getUserApiKeys(userId: string): Promise<Array<{ provider: string; keyHint: string }>> {
  const rows = await db
    .select({ provider: schema.userApiKeys.provider, keyHint: schema.userApiKeys.keyHint })
    .from(schema.userApiKeys)
    .where(eq(schema.userApiKeys.userId, userId))
  return rows.map((r) => ({ provider: r.provider, keyHint: r.keyHint ?? '' }))
}

export async function deleteUserApiKey(userId: string, provider: string): Promise<void> {
  await db
    .delete(schema.userApiKeys)
    .where(and(eq(schema.userApiKeys.userId, userId), eq(schema.userApiKeys.provider, provider)))
}

/** Server-only — never expose the return value to the client. */
export async function getDecryptedApiKey(userId: string, provider: string): Promise<string | null> {
  const rows = await db
    .select({ encryptedKey: schema.userApiKeys.encryptedKey })
    .from(schema.userApiKeys)
    .where(and(eq(schema.userApiKeys.userId, userId), eq(schema.userApiKeys.provider, provider)))
    .limit(1)
  if (!rows[0]) return null
  return decryptApiKey(rows[0].encryptedKey)
}

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
