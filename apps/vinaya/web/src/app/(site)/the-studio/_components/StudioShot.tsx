import { Text } from '@atta/ui/shared'
import Image from 'next/image'

interface StudioShotProps {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
}

// A single captured Studio screenshot, framed so a dark-scheme shot still reads as an
// embedded artifact on a light page (and vice versa) — see `/the-studio`'s single-theme
// capture note. The frame is not decorative; without it a raw screenshot looks like a
// broken cut-out under the opposite colour scheme.
export function StudioShot({ src, alt, width, height, caption }: StudioShotProps) {
  return (
    <div className='flex w-full flex-col gap-2'>
      <div className='w-full overflow-hidden rounded-lg border border-border bg-card'>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes='(min-width: 1120px) 1120px, 100vw'
          className='h-auto w-full'
        />
      </div>
      {caption && (
        <Text as='span' className='font-mono text-xs text-muted-foreground'>
          {caption}
        </Text>
      )}
    </div>
  )
}
