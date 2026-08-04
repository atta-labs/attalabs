import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getUserByClerkId, updateUser, updateUserUI } from '@/db/queries'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate profile text fields only when they're being submitted (Settings path)
    if ('name' in body || 'title' in body || 'summary' in body) {
      if (!body.name || !body.title || !body.summary) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
    }

    await updateUser(userId, {
      name: body.name,
      title: body.title,
      location: body.location,
      availability: body.availability,
      githubHandle: body.githubHandle,
      linkedinUrl: body.linkedinUrl,
      discordHandle: body.discordHandle,
      summary: body.summary,
      stack: body.stack,
      bio: body.bio,
      avatarUrl: body.avatarUrl ?? undefined,
      cvUrl: body.cvUrl ?? undefined
    })

    // If theme fields are present, save them too
    if (body.themeId) {
      await updateUserUI(userId, {
        themeId: body.themeId,
        colorScheme: body.colorScheme ?? 'dark',
        library: body.library ?? 'basic',
        fontSans: body.fontSans ?? null
      })
    }

    // Bust Next.js cache so changes appear immediately on all pages.
    // /ui and /settings now live under /{username}/(owner)/, so the
    // owner-segment paths must be revalidated alongside the public profile.
    const user = await getUserByClerkId(userId)
    if (user?.username) {
      revalidatePath(`/${user.username}`)
      revalidatePath(`/${user.username}/ui`)
      revalidatePath(`/${user.username}/settings`)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Herald] Profile save error:', err)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
