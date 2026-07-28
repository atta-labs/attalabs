'use client'

import { ChromeFrame } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { useEffect, useState } from 'react'

export type StickyDocHeaderProps = {
  title: string
  section: string
}

export function StickyDocHeader({ title, section }: StickyDocHeaderProps) {
  const [isSticky, setIsSticky] = useState(false)
  const [activeHeading, setActiveHeading] = useState<string | null>(null)

  useEffect(() => {
    const scrollContainer = document.querySelector('main')
    if (!scrollContainer) return

    const handleScroll = () => {
      const containerRect = scrollContainer.getBoundingClientRect()

      // Show sticky header after scrolling past 80px
      setIsSticky(scrollContainer.scrollTop > 80)

      // Track active h2 or h3 heading
      const headings = document.querySelectorAll('.doc-page-content h2, .doc-page-content h3')
      let currentActive: string | null = null

      for (const heading of headings) {
        const rect = heading.getBoundingClientRect()
        // If heading has scrolled near or past the sticky header position
        if (rect.top - containerRect.top <= 64) {
          currentActive = heading.textContent
        } else {
          break
        }
      }

      setActiveHeading(currentActive)
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    handleScroll() // Run initial check

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Library-resolved sticky breadcrumb bar via `ChromeFrame variant='bar'`: under
  // the flush libraries it's a `border-b bg-card` strip, under retro it's a
  // floating Card (border-2 + shadow) with a top gap that matches the topbar's
  // own float — so the bar reads as chrome in every library instead of a flat
  // strip jammed under the topbar. The `h-11` content height is fixed; the
  // markdown table's sticky header clears the retro-floated bar via
  // `[&_thead_th]:top-13` in DocPage. Fades in once the reader scrolls past the
  // doc title.
  return (
    <div
      // `-mx-2` cancels the retro ChromeFrame bar's own `px-2` float margin so the
      // card's border lands exactly on the prose/table column's left+right bounds
      // (not inset ~9px inside them). Under the flush libraries `ChromeFrame` has
      // no `px-2`, so `-mx-2` there just bleeds the flush bar 9px into `main`'s
      // `px-6`/`lg:px-12` gutter — still inside the scroll box, no overflow.
      // `h-0 overflow-visible` is unconditional (not toggled by `isSticky`) —
      // this element's own box never contributes flow height, at rest or
      // stuck, so its `h-11` `ChromeFrame` child renders as a pure visual
      // overlay with zero effect on the article's position and no reflow
      // jump when `isSticky` flips. Without this, `sticky` alone reserves a
      // permanent ~44px box even at `opacity-0`, which was the real reason
      // every /docs route (routed through here) read as more heavily padded
      // than /start (which renders no equivalent element) even after their
      // `pt-*` values were unified.
      className={`sticky top-2 z-20 -mx-2 h-0 overflow-visible transition-opacity duration-300 ${
        isSticky ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <ChromeFrame variant='bar' className='h-11 gap-2 px-4 font-mono text-xs select-none'>
        {activeHeading ? (
          <>
            <Text as='span' className='max-w-[160px] truncate text-muted-foreground/70'>
              {title}
            </Text>
            <Text as='span' className='text-muted-foreground/40'>
              /
            </Text>
            <Text as='span' className='truncate font-semibold text-foreground'>
              {activeHeading}
            </Text>
          </>
        ) : (
          <>
            <Text as='span' className='shrink-0 uppercase tracking-wider text-muted-foreground/70'>
              {section}
            </Text>
            <Text as='span' className='text-muted-foreground/40'>
              /
            </Text>
            <Text as='span' className='truncate font-semibold text-foreground'>
              {title}
            </Text>
          </>
        )}
      </ChromeFrame>
    </div>
  )
}
