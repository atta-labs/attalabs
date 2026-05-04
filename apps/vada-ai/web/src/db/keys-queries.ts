import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import type { EncryptedVendorKeys } from '@atta/crypto'
import { db, schema } from './index'

export type { ApiKey, UserProviderKeys } from './schema'

// ── Provider Keys ─────────────────────────────────────────────────────────────

export async function getProviderKeys(clerkId: string): Promise<typeof schema.userProviderKeys.$inferSelect | null> {
  const rows = await db
    .select()
    .from(schema.userProviderKeys)
    .where(eq(schema.userProviderKeys.clerkId, clerkId))
    .limit(1)
  return rows[0] ?? null
}

export async function upsertProviderKeys(clerkId: string, encryptedPayload: EncryptedVendorKeys): Promise<void> {
  await db
    .insert(schema.userProviderKeys)
    .values({ clerkId, encryptedPayload })
    .onConflictDoUpdate({
      target: schema.userProviderKeys.clerkId,
      set: { encryptedPayload, updatedAt: new Date() }
    })
}

export async function deleteProviderKeys(clerkId: string): Promise<void> {
  await db.delete(schema.userProviderKeys).where(eq(schema.userProviderKeys.clerkId, clerkId))
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function createApiKey(
  clerkId: string,
  name: string,
  keyHash: string
): Promise<typeof schema.apiKeys.$inferSelect> {
  const rows = await db.insert(schema.apiKeys).values({ clerkId, name, keyHash }).returning()
  const row = rows[0]
  if (!row) throw new Error('Insert returned no row')
  return row
}

export async function listApiKeys(clerkId: string): Promise<(typeof schema.apiKeys.$inferSelect)[]> {
  return db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.clerkId, clerkId))
    .orderBy(desc(schema.apiKeys.createdAt))
}

export async function revokeApiKey(id: string, clerkId: string): Promise<boolean> {
  const result = await db
    .update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.apiKeys.id, id), eq(schema.apiKeys.clerkId, clerkId)))
    .returning({ id: schema.apiKeys.id })
  return result.length > 0
}
