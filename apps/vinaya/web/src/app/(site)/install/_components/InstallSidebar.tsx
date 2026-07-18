'use client'

import type { Command } from '@atta/vinaya-sources'
import {
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
import { useEffect, useState } from 'react'
import { commandSlug } from './command-slug'

/**
 * Desktop-only command sidebar for `/install` — the cli.github.com/manual
 * shape. Reuses the `/docs` sidebar primitives (SidebarProvider + SidebarMenu),
 * but drives active state from scroll position (an on-page TOC) rather than the
 * pathname, since every command lives on this one page. Hidden below `lg`.
 */
export function InstallSidebar({ commands }: { commands: readonly Command[] }) {
  const [activeSlug, setActiveSlug] = useState(() => (commands[0] ? commandSlug(commands[0].name) : ''))

  useEffect(() => {
    const sections = commands
      .map((command) => document.getElementById(commandSlug(command.name)))
      .filter((el): el is HTMLElement => el !== null)
    if (sections.length === 0) return

    // Scroll-spy: a section becomes active once its top crosses into the upper
    // strip of the viewport. The -70% bottom margin narrows the "active zone"
    // to that top strip so exactly one section highlights at a time instead of
    // every section the tall viewport happens to span.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSlug(entry.target.id)
        }
      },
      { rootMargin: '0px 0px -70% 0px', threshold: 0 }
    )
    for (const section of sections) observer.observe(section)
    return () => observer.disconnect()
  }, [commands])

  const scrollToSection = (slug: string) => (event: React.MouseEvent) => {
    event.preventDefault()
    document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveSlug(slug)
  }

  return (
    <SidebarProvider
      style={{ '--sidebar-width': '15rem' } as React.CSSProperties}
      className='sticky top-0 hidden max-h-dvh w-(--sidebar-width) shrink-0 self-start border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block'
    >
      <SidebarContent className='max-h-dvh gap-0 overflow-y-auto px-2 py-6'>
        <Text
          as='span'
          className='mb-2 block px-2 font-sans text-sm font-bold uppercase tracking-widest text-sidebar-foreground'
        >
          Commands
        </Text>

        <SidebarGroup className='py-1.5'>
          <SidebarGroupContent>
            <SidebarMenu className='gap-0.5'>
              {commands.map((command) => {
                const slug = commandSlug(command.name)
                const isActive = activeSlug === slug
                return (
                  <SidebarMenuItem key={command.name}>
                    <SidebarMenuButton
                      size='sm'
                      isActive={isActive}
                      render={<NextLink variant='unstyled' href={`#${slug}`} onClick={scrollToSection(slug)} />}
                      className={`h-auto min-h-7 py-1 font-mono text-sm tracking-tight [&>span:last-child]:whitespace-normal ${
                        isActive
                          ? 'font-semibold text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/75 hover:text-sidebar-foreground'
                      }`}
                    >
                      <span className='line-clamp-2'>{command.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarProvider>
  )
}
