'use client'

import type { ConfigField } from '@attalabs/vinaya-sources'
import {
  ChromeFrame,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { useEffect, useMemo, useState } from 'react'
import { CONFIG_ACTIVE_OFFSET, configSections, owningSectionSlug } from './config-navigation'

/**
 * `/docs/config`'s on-page rail — `CliSidebar`'s shape (the
 * cli.github.com/manual pattern: `/docs`' sidebar primitives, active state
 * driven by scroll position rather than the pathname, hidden below `lg`),
 * pointed at config sections instead of commands. Sections only: a nested
 * field (`checks.env.literal`) keeps its own anchor in the content flow but
 * never becomes a rail entry.
 *
 * The scroll-spy is a position scan, NOT `CliSidebar`'s `IntersectionObserver`.
 * That observer only fires when a section's intersection *changes*, which is
 * fine for `/docs/cli`'s short command blocks but wrong here: `checks` alone
 * runs thousands of pixels, so it enters the observer's zone once and never
 * reports again — the rail sticks on the previous section for the whole time
 * a reader is inside it. Scanning positions on every scroll asks the question
 * the rail actually means ("which section am I in"), and asks it with the same
 * rule and the same `CONFIG_ACTIVE_OFFSET` as `StickyDocHeader`, so the two
 * can never disagree.
 */
export function ConfigSidebar({ fields }: { fields: readonly ConfigField[] }) {
  const sections = useMemo(() => configSections(fields), [fields])
  const [activeSlug, setActiveSlug] = useState(() => sections[0]?.slug ?? '')

  useEffect(() => {
    const scrollContainer = document.querySelector('main')
    if (!scrollContainer) return

    const readActiveSection = () => {
      const containerTop = scrollContainer.getBoundingClientRect().top
      let current = sections[0]?.slug ?? ''
      for (const section of sections) {
        const element = document.getElementById(section.slug)
        if (!element) continue
        if (element.getBoundingClientRect().top - containerTop > CONFIG_ACTIVE_OFFSET) break
        current = section.slug
      }
      setActiveSlug(current)
    }

    scrollContainer.addEventListener('scroll', readActiveSection)
    readActiveSection()

    return () => {
      scrollContainer.removeEventListener('scroll', readActiveSection)
    }
  }, [sections])

  // Deep links (`/docs/config#config-checks-env-literal`) land here. The page
  // scrolls inside `main`, not the window, and the target may be a nested
  // field the rail does not list — so the hash is resolved explicitly rather
  // than left to the browser's own anchor jump: scroll the real target into
  // view, and highlight the top-level section that owns it. `hashchange`
  // covers a same-page link arriving after the first paint.
  useEffect(() => {
    const goToHash = () => {
      const slug = window.location.hash.slice(1)
      if (!slug) return
      const target = document.getElementById(slug)
      if (!target) return
      target.scrollIntoView({ block: 'start' })
      // A nested target leaves its parent section scrolled above the offset,
      // which the position scan already resolves to that parent — this only
      // paints it before the scan's own scroll event lands.
      const owner = owningSectionSlug(slug, fields)
      if (owner) setActiveSlug(owner)
    }

    // After the first paint, so the observer's own initial callbacks (which
    // report whatever is on screen pre-jump) cannot land on top of this.
    const frame = requestAnimationFrame(goToHash)
    window.addEventListener('hashchange', goToHash)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('hashchange', goToHash)
    }
  }, [fields])

  const scrollToSection = (slug: string) => (event: React.MouseEvent) => {
    event.preventDefault()
    document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSlug(slug)
  }

  return (
    <SidebarProvider
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
      className='hidden h-full min-h-0 w-(--sidebar-width) shrink-0 text-sidebar-foreground lg:block'
    >
      <ChromeFrame variant='rail'>
        <SidebarContent className='gap-0 overflow-y-auto px-2 py-4'>
          <Text
            as='span'
            size='sm'
            weight='bold'
            className='mb-2 block px-2 font-sans uppercase tracking-widest text-sidebar-foreground'
          >
            Configuration
          </Text>

          <SidebarGroup className='py-1.5'>
            <SidebarGroupContent>
              <SidebarMenu className='gap-0.5'>
                {sections.map((section) => {
                  const isActive = activeSlug === section.slug
                  return (
                    <SidebarMenuItem key={section.slug}>
                      <SidebarMenuButton
                        size='sm'
                        isActive={isActive}
                        render={
                          <NextLink
                            variant='unstyled'
                            href={`#${section.slug}`}
                            onClick={scrollToSection(section.slug)}
                          />
                        }
                        // Active look is owned by the library's SidebarMenuButton
                        // (driven by `isActive`). Consumer only dims inactive items.
                        className={`h-auto min-h-7 py-1 font-mono text-sm tracking-tight [&>span:last-child]:whitespace-normal ${
                          isActive ? '' : 'text-sidebar-foreground/75 hover:text-sidebar-foreground'
                        }`}
                      >
                        <span className='line-clamp-2'>{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </ChromeFrame>
    </SidebarProvider>
  )
}
