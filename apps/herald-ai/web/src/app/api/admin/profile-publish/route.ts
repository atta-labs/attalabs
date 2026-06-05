import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getUserByClerkId, updateUserPublished } from '@/db/queries'

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as { isPublished?: boolean }
  if (typeof body.isPublished !== 'boolean') {
    return NextResponse.json({ error: 'isPublished must be a boolean' }, { status: 400 })
  }

  await updateUserPublished(userId, body.isPublished)

  const user = await getUserByClerkId(userId)
  if (user?.username) {
    revalidatePath(`/${user.username}`)
  }

  return NextResponse.json({ ok: true, isPublished: body.isPublished })
}
