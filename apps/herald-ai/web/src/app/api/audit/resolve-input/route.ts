import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

import { resolveCvInput, resolveJdInput } from '@/lib/audit-input/resolve'
import type { CvInput, JdInput, ResolvedCv } from '@/lib/audit-input/types'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MIN_CV_LENGTH = 50

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const contentType = request.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('multipart/form-data')) {
      return await handleFileUpload(request)
    }
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Unsupported content-type' }, { status: 400 })
    }
    return await handleJson(request)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Resolution failed'
    console.warn('[Herald] resolve-input error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function handleJson(request: Request): Promise<NextResponse> {
  let body: { role?: unknown; input?: unknown }
  try {
    body = (await request.json()) as { role?: unknown; input?: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.role === 'jd') {
    const resolved = await resolveJdInput(body.input as JdInput)
    return NextResponse.json({ resolved })
  }
  if (body.role === 'cv') {
    const resolved = await resolveCvInput(body.input as CvInput)
    return NextResponse.json({ resolved })
  }
  return NextResponse.json({ error: "Unknown role; expected 'jd' or 'cv'" }, { status: 400 })
}

async function handleFileUpload(request: Request): Promise<NextResponse> {
  const form = await request.formData()
  const file = form.get('file')
  const kind = form.get('kind')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 413 })
  }
  if (kind !== 'pdf' && kind !== 'markdown') {
    return NextResponse.json({ error: "Invalid file kind; expected 'pdf' or 'markdown'" }, { status: 400 })
  }

  let text: string
  if (kind === 'pdf') {
    if (file.type && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }
    const arrayBuffer = await file.arrayBuffer()
    const { extractText } = await import('unpdf')
    const result = await extractText(new Uint8Array(arrayBuffer))
    text = Array.isArray(result.text) ? result.text.join('\n') : result.text
  } else {
    text = await file.text()
  }

  text = text.trim()
  if (text.length < MIN_CV_LENGTH) {
    return NextResponse.json({ error: 'File content is too short or could not be extracted' }, { status: 400 })
  }

  const baseLabel = file.name || (kind === 'pdf' ? 'CV.pdf' : 'CV.md')
  const resolved: ResolvedCv = {
    kind,
    text,
    username: null,
    candidateLabel: kind === 'pdf' ? `${baseLabel} (PDF)` : `${baseLabel} (markdown)`
  }
  return NextResponse.json({ resolved })
}
