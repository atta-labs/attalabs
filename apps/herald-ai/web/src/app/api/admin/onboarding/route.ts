import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { createUser, isUsernameTaken } from '@/db/queries'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { username, githubHandle, name, title, location, availability, summary, stack, projects, experience } = body

    if (!username || !name || !title || !summary) {
      return NextResponse.json({ error: 'Username, name, title, and summary are required' }, { status: 400 })
    }

    if (!/^[a-z0-9-]+$/.test(username) || username.length < 3) {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }

    const taken = await isUsernameTaken(username)
    if (taken) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
    }

    await createUser({
      clerkId: userId,
      username,
      githubHandle: githubHandle || undefined,
      name,
      title,
      location: location || undefined,
      availability: availability || undefined,
      summary,
      stack: stack ?? [],
      projects: projects ?? [],
      experience: experience ?? []
    })

    return NextResponse.json({ success: true, username })
  } catch (err) {
    console.error('[Herald] Onboarding error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}
