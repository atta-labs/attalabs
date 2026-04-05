import { parseCv } from '@atta/herald-ai-mcp'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('cv')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No CV file provided' }, { status: 400 })
    }

    let cvText: string

    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer()
      const { extractText } = await import('unpdf')
      const result = await extractText(new Uint8Array(arrayBuffer))
      cvText = Array.isArray(result.text) ? result.text.join('\n') : result.text
    } else {
      cvText = await file.text()
    }

    cvText = cvText.trim()

    if (cvText.length < 50) {
      return NextResponse.json({ error: 'CV content is too short or could not be extracted' }, { status: 400 })
    }

    console.info(`[Herald] Parsing CV: ${cvText.length} chars extracted from ${file.name}`)

    const profile = await parseCv(cvText, apiKey)

    console.info(`[Herald] CV parsed: ${profile.name} — ${profile.title} (${profile.stack.length} skills)`)

    return NextResponse.json(profile)
  } catch (err) {
    console.error('[Herald] CV parse error:', err)
    return NextResponse.json({ error: 'Failed to parse CV. Please try again.' }, { status: 500 })
  }
}
