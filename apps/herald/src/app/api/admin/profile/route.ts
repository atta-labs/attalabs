import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.title || !body.summary) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Build the profile TypeScript file content
    const profileContent = `export const DANI_PROFILE = ${JSON.stringify(
      {
        name: body.name,
        title: body.title,
        location: body.location ?? '',
        availability: body.availability ?? '',
        github: body.github ?? '',
        summary: body.summary,
        stack: body.stack ?? [],
        projects: body.projects ?? [],
        experience: body.experience ?? []
      },
      null,
      2
    )}
`

    // Write to the profile.ts file
    const profilePath = join(process.cwd(), 'src/lib/profile.ts')
    await writeFile(profilePath, profileContent, 'utf-8')

    console.info('[Herald] Profile updated by user:', userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Herald] Profile save error:', err)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
