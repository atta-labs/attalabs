'use client'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { Maximize2, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

interface StudioShotProps {
  darkSrc: string
  lightSrc: string
  alt: string
  width: number
  height: number
  caption?: string
}

// A single captured Studio screenshot, framed so a dark-scheme shot still reads as an
// embedded artifact on a light page (and vice versa) — see `/the-studio`'s single-theme
// capture note. The frame is not decorative; without it a raw screenshot looks like a
// broken cut-out under the opposite colour scheme. The page always shows the dark capture
// as the thumbnail (the app's own default scheme); clicking it opens a full-size dialog
// where a light/dark toggle switches between the two real captures of that same view.
export function StudioShot({ darkSrc, lightSrc, alt, width, height, caption }: StudioShotProps) {
  const [scheme, setScheme] = useState<'dark' | 'light'>('dark')
  const activeSrc = scheme === 'dark' ? darkSrc : lightSrc

  return (
    <Dialog onOpenChange={(open) => !open && setScheme('dark')}>
      <div className='flex w-full flex-col gap-2'>
        <DialogTrigger
          className='group relative block w-full overflow-hidden rounded-lg border border-border bg-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
          aria-label={`View ${alt} full size`}
        >
          <Image
            src={darkSrc}
            alt={alt}
            width={width}
            height={height}
            sizes='(min-width: 1120px) 1120px, 100vw'
            className='h-auto w-full'
          />
          <div className='pointer-events-none absolute inset-0 flex items-center justify-center bg-foreground/0 transition-colors group-hover:bg-foreground/10'>
            <div className='rounded-full border border-border bg-card p-3 opacity-0 shadow-md transition-opacity group-hover:opacity-100'>
              <Maximize2 className='size-5 text-foreground' aria-hidden />
            </div>
          </div>
        </DialogTrigger>
        {caption && (
          <Text as='span' className='font-mono text-xs text-muted-foreground'>
            {caption}
          </Text>
        )}
      </div>

      <DialogContent className='max-w-[95vw] gap-3 overflow-hidden p-4 sm:max-w-[1400px]'>
        <DialogHeader className='flex-row items-center justify-between gap-4 pr-10'>
          <div className='flex flex-col gap-1'>
            <DialogTitle className='font-sans text-base font-semibold text-foreground'>{alt}</DialogTitle>
            {caption && <DialogDescription className='font-mono text-xs'>{caption}</DialogDescription>}
          </div>
          <div className='flex shrink-0 items-center gap-1 rounded-md border border-border p-1'>
            <Button
              type='button'
              size='sm'
              variant={scheme === 'dark' ? 'default' : 'ghost'}
              onClick={() => setScheme('dark')}
              className={cn(scheme === 'dark' && 'pointer-events-none')}
              aria-pressed={scheme === 'dark'}
            >
              <Moon className='size-4' aria-hidden />
              Dark
            </Button>
            <Button
              type='button'
              size='sm'
              variant={scheme === 'light' ? 'default' : 'ghost'}
              onClick={() => setScheme('light')}
              className={cn(scheme === 'light' && 'pointer-events-none')}
              aria-pressed={scheme === 'light'}
            >
              <Sun className='size-4' aria-hidden />
              Light
            </Button>
          </div>
        </DialogHeader>
        <div className='max-h-[75vh] w-full overflow-auto rounded-lg border border-border bg-card'>
          <Image src={activeSrc} alt={alt} width={width} height={height} className='h-auto w-full' />
        </div>
      </DialogContent>
    </Dialog>
  )
}
