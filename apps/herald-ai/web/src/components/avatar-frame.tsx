'use client'

import { useLibraryName } from '@atta/ui/lib/library-provider'
import { cn } from '@atta/ui/lib/utils'
import { Pennant } from './pennant'

interface AvatarFrameProps {
  src: string
  alt: string
  /** Frame size in px. Default 104. */
  size?: number
  /** plain = frame only. dossier = + corner registration ticks. */
  variant?: 'plain' | 'dossier'
  /** Hang the brand pennant off the bottom edge. */
  pennant?: boolean
  pennantAnimated?: boolean
  className?: string
}

export function AvatarFrame({
  src,
  alt,
  size = 104,
  variant = 'dossier',
  pennant: showPennant = true,
  pennantAnimated = true,
  className
}: AvatarFrameProps) {
  const library = useLibraryName()
  const isAngular = library === 'retro' || library === 'brutal'

  const initials = alt
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <div
        className={cn(
          'absolute inset-0 overflow-hidden border-[1.5px] border-border bg-card',
          isAngular ? 'rounded-none' : 'rounded-[10px]'
        )}
      >
        {/* biome-ignore lint/performance/noImgElement: dynamic R2/blob URL — not optimisable via next/image */}
        <img src={src} alt={alt} className='h-full w-full object-cover' style={{ imageRendering: 'pixelated' }} />
        {!src && (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground',
              isAngular ? 'rounded-none font-mono' : 'rounded-[10px]'
            )}
          >
            {initials}
          </div>
        )}
        {variant === 'dossier' && (
          <>
            <div className='pointer-events-none absolute right-1.5 top-1.5 z-10 h-[6px] w-[6px] border-r border-t border-muted-foreground' />
            <div className='pointer-events-none absolute bottom-1.5 left-1.5 z-10 h-[6px] w-[6px] border-b border-l border-muted-foreground' />
          </>
        )}
      </div>

      {showPennant && (
        <Pennant
          size={size < 60 ? 'sm' : size < 90 ? 'md' : 'lg'}
          tone='primary'
          animated={pennantAnimated}
          className='absolute bottom-[-14px] left-1/2 -translate-x-1/2'
        />
      )}
    </div>
  )
}
