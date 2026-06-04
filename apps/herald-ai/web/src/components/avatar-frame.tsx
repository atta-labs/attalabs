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
  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      {/* Clipping frame — image stays within the rounded border */}
      <div className='absolute inset-0 overflow-hidden rounded-[10px] border-[1.5px] border-border bg-card'>
        {/* biome-ignore lint/performance/noImgElement: dynamic blob/R2 URL — not optimisable via next/image */}
        <img src={src} alt={alt} className='h-full w-full object-cover' style={{ imageRendering: 'pixelated' }} />
        {variant === 'dossier' && (
          <>
            {/* Registration ticks — top-right and bottom-left */}
            <div className='absolute right-1.5 top-1.5 z-10 h-[6px] w-[6px] border-r border-t border-muted-foreground' />
            <div className='absolute bottom-1.5 left-1.5 z-10 h-[6px] w-[6px] border-b border-l border-muted-foreground' />
          </>
        )}
      </div>

      {/* Pennant hangs below the frame — outside the overflow-hidden wrapper */}
      {showPennant && (
        <Pennant
          size='lg'
          tone='primary'
          animated={pennantAnimated}
          className='absolute bottom-[-16px] left-1/2 -translate-x-1/2'
        />
      )}
    </div>
  )
}
