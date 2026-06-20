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

  return (
    <div
      className={`sticky top-0 z-20 -mx-12 mb-8 border-b border-border/40 bg-background/80 px-12 py-3 backdrop-blur-md transition-all duration-300 ${
        isSticky ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <Flex align='center' justify='between' className='w-full'>
        <Flex align='center' gap={2} className='text-xs font-mono select-none'>
          {activeHeading ? (
            <>
              <Text as='span' className='text-muted-foreground/60'>
                {title}
              </Text>
              <Text as='span' className='text-muted-foreground/30'>
                /
              </Text>
              <Text as='span' className='text-foreground font-semibold truncate max-w-[400px]'>
                {activeHeading}
              </Text>
            </>
          ) : (
            <>
              <Text as='span' className='text-muted-foreground/60 uppercase tracking-wider'>
                {section}
              </Text>
              <Text as='span' className='text-muted-foreground/30'>
                /
              </Text>
              <Text as='span' className='text-foreground font-semibold truncate max-w-[400px]'>
                {title}
              </Text>
            </>
          )}
        </Flex>
      </Flex>
    </div>
  )
}
