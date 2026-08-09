'use client'

import {
  ChromeFrame,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import type { Doc, DocNav } from '@atta/aeg-core/docs'

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

/** The fixed desktop rail. Hidden below `lg`, where the same nav body is
 * reached through the drawer in `DocSidebarHost` instead. */
export function DocSidebar({ nav, pathname }: DocSidebarProps) {
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
      className='hidden h-full min-h-0 w-(--sidebar-width) shrink-0 text-sidebar-foreground lg:flex'
    >
      <ChromeFrame variant='rail'>
        <DocSidebarNav nav={nav} pathname={pathname} />
      </ChromeFrame>
    </SidebarProvider>
  )
}

/** The nav body itself — rendered inside both the desktop rail above and the
 * mobile drawer in `DocSidebarHost`. Expects `SidebarProvider` context. */
export function DocSidebarNav({ nav, pathname }: DocSidebarProps) {
  return (
    // The landmark rides on the existing scroll container as attributes rather
    // than a wrapping <nav>: `SidebarContent` carries the flex/overflow that
    // makes the tree scroll, and an extra box between it and its parent breaks
    // that. `role='navigation'` is landmark-equivalent to <nav> for AT.
    <SidebarContent role='navigation' aria-label='The Harness' className='gap-0 overflow-y-auto px-2 py-4'>
      <Text
        as='span'
        className='mb-2 block px-2 font-sans text-sm font-bold uppercase tracking-widest text-sidebar-foreground'
      >
        The Harness
      </Text>

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
