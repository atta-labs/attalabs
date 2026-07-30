'use client'

import { Button as BasicButton } from '@atta/ui/basic/components'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@atta/ui/components'
import { useComponents } from '@atta/ui/lib/library-provider'
import { Text } from '@atta/ui/shared'
import { Maximize2, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface StudioShotProps {
  darkSrc: string
  lightSrc: string
  alt: string
  width: number
  height: number
  caption?: string
}

/**
 * The page's own colour scheme, read off the `data-theme` attribute the shell
 * stamps on `<html>` and kept in step with the TopBar's ColorSchemeToggle,
 * which mutates that same attribute (`packages/ui/lib/color-scheme-toggle.tsx`).
 * There is no shared hook for this — the toggle owns its state locally — so the
 * attribute is the only cross-component source of truth. Needed here because
 * the control below has to invert against the *capture*, and every semantic
 * token flips meaning with the scheme: `foreground` is near-black under light
 * and near-white under dark.
 */
function usePageScheme(): 'dark' | 'light' {
  const [pageScheme, setPageScheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const read = () => {
      const value = document.documentElement.getAttribute('data-theme')
      setPageScheme(value === 'light' ? 'light' : 'dark')
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return pageScheme
}

/**
 * Flips which of the two real captures is showing. Deliberately NOT the active
 * library's `Toggle`: retro's Toggle carries `data-[state=on]:bg-primary` at
 * attribute specificity, which beats any plain background utility passed in
 * `className`, so a pressed toggle painted itself primary regardless of what
 * sat behind it. A ghost `Button` has a transparent base, so the caller's
 * background is the one that renders.
 *
 * The control inverts against the SCREENSHOT, not against the page: a
 * screenshot is a fixed-brightness asset, so a light capture needs a dark
 * control under either page scheme (and vice versa). `foreground`/`background`
 * swap meaning between schemes, so the pairing is chosen from both facts at
 * once — `captureIsLight === pageIsLight` is exactly when `bg-foreground` is
 * the dark chip.
 */
function ShotSchemeToggle({
  scheme,
  pageScheme,
  onToggle,
  className
}: {
  scheme: 'dark' | 'light'
  pageScheme: 'dark' | 'light'
  onToggle: () => void
  className?: string
}) {
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton
  const Icon = scheme === 'dark' ? Sun : Moon
  const label = scheme === 'dark' ? 'Show the light capture' : 'Show the dark capture'

  // The capture on screen is light exactly when `scheme` is 'light'; a light
  // capture wants the dark chip.
  const contrast =
    (scheme === 'light') === (pageScheme === 'light')
      ? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'
      : 'bg-background text-foreground hover:bg-background/90 hover:text-foreground'

  return (
    <Button
      variant='ghost'
      size='icon'
      onClick={onToggle}
      aria-label={label}
      title={label}
      className={`border border-border shadow-md ${contrast} ${className ?? ''}`}
    >
      <Icon className='size-4' aria-hidden />
    </Button>
  )
}

// A single captured Studio screenshot, framed so a dark-scheme shot still reads as an
// embedded artifact on a light page (and vice versa) — see `/the-studio`'s single-theme
// capture note. The frame is not decorative; without it a raw screenshot looks like a
// broken cut-out under the opposite colour scheme. One `scheme` state drives both the
// on-page thumbnail and the full-size dialog, and the capture toggle lives ONLY on the
// section thumbnail: the dialog shows whichever capture the section is currently set to.
// A second copy of the control inside the dialog was a third scheme switch on screen at
// once (page theme, section capture, dialog capture) with no way to tell them apart.
export function StudioShot({ darkSrc, lightSrc, alt, width, height, caption }: StudioShotProps) {
  const [scheme, setScheme] = useState<'dark' | 'light'>('dark')
  const pageScheme = usePageScheme()
  const activeSrc = scheme === 'dark' ? darkSrc : lightSrc
  const toggle = () => setScheme((s) => (s === 'dark' ? 'light' : 'dark'))

  return (
    <Dialog>
      <div className='flex w-full flex-col gap-2'>
        <div className='relative'>
          <DialogTrigger
            className='group relative block w-full overflow-hidden rounded-lg border border-border bg-card text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
            aria-label={`View ${alt} full size`}
          >
            <Image
              src={activeSrc}
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
          <div className='absolute top-3 right-3 z-10'>
            <ShotSchemeToggle scheme={scheme} pageScheme={pageScheme} onToggle={toggle} />
          </div>
        </div>
        {caption && (
          <Text as='span' className='font-mono text-xs text-muted-foreground'>
            {caption}
          </Text>
        )}
      </div>

      <DialogContent className='max-w-[95vw] overflow-hidden p-4 sm:max-w-[1400px]'>
        <DialogTitle className='sr-only'>{alt}</DialogTitle>
        {caption && <DialogDescription className='sr-only'>{caption}</DialogDescription>}
        <div className='max-h-[80vh] w-full overflow-auto rounded-lg border border-border bg-card'>
          <Image src={activeSrc} alt={alt} width={width} height={height} className='h-auto w-full' />
        </div>
      </DialogContent>
    </Dialog>
  )
}
