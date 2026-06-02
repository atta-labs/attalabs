import { put } from '@vercel/blob'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const type = formData.get('type') as string // 'avatar' | 'cv'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  if (type === 'avatar' && !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Avatar must be an image' }, { status: 400 })
  }
  if (type === 'cv' && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'CV must be a PDF' }, { status: 400 })
  }

  const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large' }, { status: 400 })
  }

  try {
    const ext = file.name.split('.').pop() ?? (type === 'avatar' ? 'jpg' : 'pdf')
    const filename = `${type}s/${userId}-${Date.now()}.${ext}`
    const blob = await put(filename, file, { access: 'public' })
    return NextResponse.json({ url: blob.url })
  } catch (err) {
    console.error('[Herald] Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
