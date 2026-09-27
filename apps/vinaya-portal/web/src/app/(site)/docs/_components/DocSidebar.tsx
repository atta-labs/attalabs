'use client'

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import type { Doc, DocNav } from '@attalabs/aeg-core/docs'
import { usePathname } from 'next/navigation'
import { DocsSidebarTitle } from './DocsShell'

export type DocSidebarProps = { nav: DocNav; pathname: string }

/** The map at `/docs/reference` — where the "The Harness" title used to link. A
 * plain title reads as decoration, not a link, so the overview is its own item. */
const OVERVIEW_DOC: Doc = {
  slug: 'overview',
  title: 'Overview',
  section: 'Overview',
  order: 0,
  href: '/docs/reference',
  filePath: ''
}

/** The doctrine tree as the sidebar's content — what the doc pages pass into
 * `DocsShell`'s sidebar slot, which owns the outer shell and renders the same
 * content in its drawer below `lg`. */
export function DocSidebar({ nav }: { nav: DocNav }) {
  return <DocSidebarNav nav={nav} pathname={usePathname() ?? ''} />
}

/** The nav body itself, for an explicit `pathname`. Expects `SidebarProvider`
 * context, which both of `DocsShell`'s surfaces provide. */
export function DocSidebarNav({ nav, pathname }: DocSidebarProps) {
  return (
    // The landmark rides on the existing scroll container as attributes rather
    // than a wrapping <nav>: `SidebarContent` carries the flex/overflow that
    // makes the tree scroll, and an extra box between it and its parent breaks
    // that. `role='navigation'` is landmark-equivalent to <nav> for AT.
    <SidebarContent role='navigation' aria-label='The Harness' className='gap-0 overflow-y-auto px-2 py-4'>
      <DocsSidebarTitle className='mb-2 px-2 text-sm'>
        <Text as='span' className='block font-sans text-sm font-bold uppercase tracking-widest text-sidebar-foreground'>
          The Harness
        </Text>
      </DocsSidebarTitle>

      <SidebarGroup className='py-1.5'>
        <SidebarGroupContent>
          <SidebarMenu className='gap-0.5'>
            <FlatDocItem doc={OVERVIEW_DOC} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {nav.sections.map((section) => (
        <SidebarGroup key={section.id} className='py-1.5'>
          <SidebarGroupLabel className='font-sans text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60'>
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent className='mt-1'>
            <SidebarMenu className='gap-0.5'>
              {section.docs.map((doc) => (
                <FlatDocItem key={doc.slug} doc={doc} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )
}

function FlatDocItem({ doc, pathname }: { doc: Doc; pathname: string }) {
  const isActive = pathname === doc.href
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size='sm'
        isActive={isActive}
        render={<NextLink variant='unstyled' href={doc.href} />}
        // The active look is owned by the library's SidebarMenuButton (driven by
        // `isActive`), so it reads as whatever the active library specifies —
        // under retro that's its `bg-primary` fill, not basic's sidebar-accent.
        // The consumer only dims the resting/inactive items via sidebar tokens.
        className={`h-auto min-h-7 py-1 font-sans text-sm font-medium tracking-tight [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug ${
          isActive ? '' : 'text-sidebar-foreground/75 hover:text-sidebar-foreground'
        }`}
      >
        <span className='line-clamp-2'>{doc.sidebarTitle ?? doc.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
