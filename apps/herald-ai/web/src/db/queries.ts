import { eq } from 'drizzle-orm'
import { cache } from 'react'
import { db, schema } from '.'

export async function getUserByClerkId(clerkId: string) {
  const rows = await db.select().from(schema.heraldProfiles).where(eq(schema.heraldProfiles.clerkId, clerkId)).limit(1)
  return rows[0] ?? null
}

export const getUserByUsername = cache(async (username: string) => {
  try {
    const rows = await db
      .select()
      .from(schema.heraldProfiles)
      .where(eq(schema.heraldProfiles.username, username))
      .limit(1)
    return rows[0] ?? null
  } catch (err) {
    // Log before returning null so schema drift / connection failures don't
    // masquerade as "user not found" 404s (cost an hour during the
    // audit_model_vendor incident on 2026-06-15).
    console.error('[getUserByUsername] DB error:', err instanceof Error ? err.message : err)
    return null
  }
})

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await db
    .select({ username: schema.heraldProfiles.username })
    .from(schema.heraldProfiles)
    .where(eq(schema.heraldProfiles.username, username))
    .limit(1)
  return rows.length > 0
}

export async function createUser(data: {
  clerkId: string
  email: string
  username: string
  githubHandle?: string
  name: string
  title: string
  location?: string
  availability?: string
  summary: string
  stack: string[]
  projects?: Array<{ title: string; description: string }>
  experience?: Array<{ company: string; role: string; period: string; highlights: string[] }>
  cvUrl?: string | null
}) {
  // Ensure shared users row exists before inserting profile (FK requirement)
  await db.insert(schema.users).values({ clerkId: data.clerkId, email: data.email }).onConflictDoNothing()

  const existing = await getUserByClerkId(data.clerkId)

  const values = {
    username: data.username,
    githubHandle: data.githubHandle ?? null,
    name: data.name,
    title: data.title,
    location: data.location ?? null,
    availability: data.availability ?? null,
    summary: data.summary,
    stack: JSON.stringify(data.stack),
    projects: JSON.stringify(data.projects ?? []),
    experience: JSON.stringify(data.experience ?? []),
    cvUrl: data.cvUrl ?? null,
    onboardingComplete: true,
    updatedAt: new Date()
  }

  if (existing) {
    await db.update(schema.heraldProfiles).set(values).where(eq(schema.heraldProfiles.clerkId, data.clerkId))
  } else {
    await db.insert(schema.heraldProfiles).values({ clerkId: data.clerkId, ...values })
  }
}

export async function updateUserUI(
  clerkId: string,
  ui: { themeId: string; colorScheme: string; library: string; fontSans?: string | null }
) {
  await db
    .update(schema.heraldProfiles)
    .set({
      themeId: ui.themeId,
      colorScheme: ui.colorScheme,
      library: ui.library,
      fontSans: ui.fontSans !== undefined ? ui.fontSans : undefined,
      updatedAt: new Date()
    })
    .where(eq(schema.heraldProfiles.clerkId, clerkId))
}

export async function updateUserPublished(clerkId: string, isPublished: boolean) {
  await db
    .update(schema.heraldProfiles)
    .set({ isPublished, updatedAt: new Date() })
    .where(eq(schema.heraldProfiles.clerkId, clerkId))
}

export async function updateUser(
  clerkId: string,
  data: {
    name?: string
    title?: string
    location?: string
    availability?: string
    summary?: string
    stack?: string[]
    githubHandle?: string
    linkedinUrl?: string
    discordHandle?: string
    bio?: string
    avatarUrl?: string | null
    cvUrl?: string | null
  }
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (data.name !== undefined) updates.name = data.name
  if (data.title !== undefined) updates.title = data.title
  if (data.location !== undefined) updates.location = data.location
  if (data.availability !== undefined) updates.availability = data.availability
  if (data.summary !== undefined) updates.summary = data.summary
  if (data.stack !== undefined) updates.stack = JSON.stringify(data.stack)
  if (data.githubHandle !== undefined) updates.githubHandle = data.githubHandle
  if (data.linkedinUrl !== undefined) updates.linkedinUrl = data.linkedinUrl
  if (data.discordHandle !== undefined) updates.discordHandle = data.discordHandle
  if (data.bio !== undefined) updates.bio = data.bio
  if (data.avatarUrl !== undefined) updates.avatarUrl = data.avatarUrl
  if (data.cvUrl !== undefined) updates.cvUrl = data.cvUrl

  await db.update(schema.heraldProfiles).set(updates).where(eq(schema.heraldProfiles.clerkId, clerkId))
}

/**
 * Set the per-user audit-model preference (task 3b). Both values nullable so
 * passing `null` clears the selection and the audit falls back to the YAML
 * default. The caller is responsible for confirming the user has a key for
 * the chosen vendor — the audit dispatch path also auto-falls-back when a
 * vendor key has been revoked, so a stale selection never breaks an audit.
 */
export async function updateAuditModel(clerkId: string, vendor: string | null, modelId: string | null) {
  await db
    .update(schema.heraldProfiles)
    .set({
      auditModelVendor: vendor,
      auditModelId: modelId,
      updatedAt: new Date()
    })
    .where(eq(schema.heraldProfiles.clerkId, clerkId))
}
