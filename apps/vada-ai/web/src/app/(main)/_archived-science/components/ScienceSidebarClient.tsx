'use client'

import { usePathname } from 'next/navigation'
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
import { getScienceIcon } from '../lib/icons'

export type ClientScienceGroup = {
  id: string
  label: string
  items: Array<{
    slug: string
    href: string
    title: string
  }>
}

export function ScienceSidebarClient({ groups }: { groups: ClientScienceGroup[] }) {
  const pathname = usePathname()

  return (
    <SidebarProvider className='h-full min-h-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='gap-0 overflow-y-auto px-2 py-4'>
        {groups.map((group) => (
          <SidebarGroup key={group.id} className='py-2'>
            <SidebarGroupLabel className='font-sans text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-sidebar-foreground/60'>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className='mt-1'>
              <SidebarMenu className='gap-0.5'>
                {group.items.map(({ slug, href, title }) => {
                  const Icon = getScienceIcon(slug)
                  const isActive = pathname === href
                  return (
                    <SidebarMenuItem key={slug}>
                      <SidebarMenuButton
                        size='sm'
                        isActive={isActive}
                        render={<NextLink variant='unstyled' href={href} />}
                        className='h-auto min-h-8 items-start gap-3 py-1.5 font-sans text-sm font-normal [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug'
                      >
                        <Icon className='mt-0.5 size-4 shrink-0' />
                        <span>{title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </SidebarProvider>
  )
}
