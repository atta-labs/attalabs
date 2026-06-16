import { ImageResponse } from 'next/og'
import { getUserByUsername } from '@/db/queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default async function Icon({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const user = await getUserByUsername(username)
  const avatarUrl = user?.avatarUrl ?? null
  const displayName = user?.name?.trim() || username
  const initial = displayName.charAt(0).toUpperCase()

  if (avatarUrl) {
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#000'
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* biome-ignore lint/performance/noImgElement: ImageResponse from next/og requires img for OG image generation */}
        <img
          src={avatarUrl}
          alt=''
          width={size.width}
          height={size.height}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>,
      { ...size }
    )
  }

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: '#0D0B08',
        color: '#F5F1E8',
        fontFamily: 'serif',
        fontSize: 42,
        fontWeight: 600
      }}
    >
      {initial}
    </div>,
    { ...size }
  )
}
