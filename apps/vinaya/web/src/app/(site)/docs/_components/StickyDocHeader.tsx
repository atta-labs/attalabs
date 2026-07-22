'use client'

import { useEffect, useState } from 'react'
import { Flex, Text } from '@atta/ui/shared'

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

  // Full-width sticky bar spanning the content column, restyled to match the
  // page's carded chrome (opaque bg-card + border-b + subtle shadow) rather than
  // the old translucent strip. Fixed `h-11` height so the sticky table header can
  // offset below it by exactly that amount (`[&_thead_th]:top-11` in DocPage).
  // Fades in once the reader scrolls past the doc title.
  return (
    <div
      className={`sticky top-0 z-20 w-full transition-opacity duration-300 ${
        isSticky ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <Flex
        align='center'
        gap={2}
        className='h-11 w-full border-border border-b bg-card px-4 font-mono text-xs shadow-sm select-none'
      >
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
      </Flex>
    </div>
  )
}
