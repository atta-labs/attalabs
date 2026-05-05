import 'server-only'
import { and, desc, eq } from 'drizzle-orm'
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http'
import type { EncryptedVendorKeys } from '@atta/crypto'
import { apiKeys, userProviderKeys } from '../schema'

type Db = NeonHttpDatabase<Record<string, unknown>>

// ── Provider Keys ─────────────────────────────────────────────────────────────

export async function getProviderKeys(db: Db, clerkId: string): Promise<typeof userProviderKeys.$inferSelect | null> {
  const rows = await db.select().from(userProviderKeys).where(eq(userProviderKeys.clerkId, clerkId)).limit(1)
  return rows[0] ?? null
}

export async function upsertProviderKeys(
  db: Db,
  clerkId: string,
  encryptedPayload: EncryptedVendorKeys
): Promise<void> {
  await db
    .insert(userProviderKeys)
    .values({ clerkId, encryptedPayload })
    .onConflictDoUpdate({
      target: userProviderKeys.clerkId,
      set: { encryptedPayload, updatedAt: new Date() }
    })
}

export async function deleteProviderKeys(db: Db, clerkId: string): Promise<void> {
  await db.delete(userProviderKeys).where(eq(userProviderKeys.clerkId, clerkId))
}

// ── API Keys ──────────────────────────────────────────────────────────────────

export async function createApiKey(
  db: Db,
  clerkId: string,
  name: string,
  keyHash: string
): Promise<typeof apiKeys.$inferSelect> {
  const rows = await db.insert(apiKeys).values({ clerkId, name, keyHash }).returning()
  const row = rows[0]
  if (!row) throw new Error('Insert returned no row')
  return row
}

export async function listApiKeys(db: Db, clerkId: string): Promise<(typeof apiKeys.$inferSelect)[]> {
  return db.select().from(apiKeys).where(eq(apiKeys.clerkId, clerkId)).orderBy(desc(apiKeys.createdAt))
}

export async function revokeApiKey(db: Db, id: string, clerkId: string): Promise<boolean> {
  const result = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.clerkId, clerkId)))
    .returning({ id: apiKeys.id })
  return result.length > 0
}
