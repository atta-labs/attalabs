import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { updateUser } from '@/db/queries'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.name || !body.title || !body.summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await updateUser(userId, {
      name: body.name,
      title: body.title,
      location: body.location,
      availability: body.availability,
      githubHandle: body.githubHandle,
      summary: body.summary,
      stack: body.stack
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Herald] Profile save error:', err)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
