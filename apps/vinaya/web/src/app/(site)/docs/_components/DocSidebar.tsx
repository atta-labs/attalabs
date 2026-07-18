'use client'

import {
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

export function DocSidebar({ nav, pathname }: DocSidebarProps) {
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
      className='h-full min-h-0 w-(--sidebar-width) shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'
    >
      <SidebarContent className='gap-0 overflow-y-auto px-2 py-4'>
        <NextLink
          href='/docs'
          variant='unstyled'
          className='mb-3 block px-2 py-1 hover:opacity-80'
          aria-current={pathname === '/docs' ? 'page' : undefined}
        >
          <Text as='span' className='font-sans text-sm font-bold uppercase tracking-widest text-sidebar-foreground'>
            The Harness
          </Text>
        </NextLink>

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
    </SidebarProvider>
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
        className={`h-auto min-h-7 py-1 font-sans text-sm font-medium tracking-tight [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug ${
          isActive
            ? 'text-sidebar-accent-foreground font-semibold'
            : 'text-sidebar-foreground/75 hover:text-sidebar-foreground'
        }`}
      >
        <span className='line-clamp-2'>{doc.sidebarTitle ?? doc.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
