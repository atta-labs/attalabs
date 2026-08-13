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
import { START_NAV, START_QUICK, type StartNavItem } from './start-nav'

export type StartSidebarProps = { pathname: string }

/** The fixed desktop rail — `/docs`' `DocSidebar` shape exactly, over this
 * section's own two-part nav instead of a model-derived one. Hidden below
 * `lg`, where `StartSidebarNav` is reached through `StartSidebarHost`'s
 * drawer instead. */
export function StartSidebar({ pathname }: StartSidebarProps) {
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
      className='hidden h-full min-h-0 w-(--sidebar-width) shrink-0 text-sidebar-foreground lg:flex'
    >
      <ChromeFrame variant='rail'>
        <StartSidebarNav pathname={pathname} />
      </ChromeFrame>
    </SidebarProvider>
  )
}

/** The nav body — rendered inside both the desktop rail above and the mobile
 * drawer in `StartSidebarHost`. Expects `SidebarProvider` context. */
export function StartSidebarNav({ pathname }: { pathname: string }) {
  return (
    <SidebarContent role='navigation' aria-label='Start' className='gap-0 overflow-y-auto px-2 py-4'>
      <Text
        as='span'
        className='mb-2 block px-2 font-sans text-sm font-bold uppercase tracking-widest text-sidebar-foreground'
      >
        Start
      </Text>

      <SidebarGroup className='py-1.5'>
        <SidebarGroupContent>
          <SidebarMenu className='gap-0.5'>
            <FlatStartItem item={START_QUICK} pathname={pathname} />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {START_NAV.map((section) => (
        <SidebarGroup key={section.label} className='py-1.5'>
          <SidebarGroupLabel className='font-sans text-xs font-bold uppercase tracking-widest text-sidebar-foreground/60'>
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent className='mt-1'>
            <SidebarMenu className='gap-0.5'>
              {section.overview && <FlatStartItem item={section.overview} pathname={pathname} />}
              {section.items.map((item) => (
                <FlatStartItem key={item.slug} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  )
}

function FlatStartItem({ item, pathname }: { item: StartNavItem; pathname: string }) {
  const isActive = pathname === item.href
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size='sm'
        isActive={isActive}
        render={<NextLink variant='unstyled' href={item.href} />}
        className={`h-auto min-h-7 py-1 font-sans text-sm font-medium tracking-tight ${
          isActive ? '' : 'text-sidebar-foreground/75 hover:text-sidebar-foreground'
        }`}
      >
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
