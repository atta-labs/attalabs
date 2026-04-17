'use client'

import Link from 'next/link'
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
} from '@atta/ui'
import { SCIENCE_NAV } from '../nav'

export function ScienceSidebar() {
  const pathname = usePathname()

  return (
    <SidebarProvider className='h-full w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='gap-0 px-2 py-6'>
        {SCIENCE_NAV.map((group) => (
          <SidebarGroup key={group.id} className='py-2'>
            <SidebarGroupLabel className='font-sans text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-sidebar-foreground/60'>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className='mt-1'>
              <SidebarMenu className='gap-0.5'>
                {group.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        size='sm'
                        isActive={isActive}
                        render={<Link href={href} />}
                        className='h-8 gap-3 font-sans text-sm font-normal'
                      >
                        <Icon className='size-4 shrink-0' />
                        <span className='truncate'>{label}</span>
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
