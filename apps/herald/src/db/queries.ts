import { eq } from 'drizzle-orm'
import { db, schema } from '.'

export async function getUserByClerkId(clerkId: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.clerkId, clerkId)).limit(1)
  return rows[0] ?? null
}

export async function getUserByUsername(username: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1)
  return rows[0] ?? null
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const rows = await db
    .select({ username: schema.users.username })
    .from(schema.users)
    .where(eq(schema.users.username, username))
    .limit(1)
  return rows.length > 0
}

export async function createUser(data: {
  clerkId: string
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
}) {
  // Check if user already exists — update if so, insert if not
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
    onboardingComplete: true,
    updatedAt: new Date()
  }

  if (existing) {
    await db.update(schema.users).set(values).where(eq(schema.users.clerkId, data.clerkId))
  } else {
    await db.insert(schema.users).values({
      clerkId: data.clerkId,
      ...values
    })
  }
}

export async function updateUserTheme(clerkId: string, themeId: string, colorScheme = 'dark') {
  await db
    .update(schema.users)
    .set({ themeId, colorScheme, updatedAt: new Date() })
    .where(eq(schema.users.clerkId, clerkId))
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

  await db.update(schema.users).set(updates).where(eq(schema.users.clerkId, clerkId))
}
