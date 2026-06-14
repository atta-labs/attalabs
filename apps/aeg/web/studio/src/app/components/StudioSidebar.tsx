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
} from '@atta/ui/components/sidebar'
import { NextLink } from '@atta/ui/lib/next-link'
import { FolderKanban, GitBranch, LayoutGrid, ListChecks, BookOpen } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

type NavItem = {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'governance',
    label: 'Governance',
    items: [
      { href: '/projects', label: 'Projects', Icon: FolderKanban },
      { href: '/iterations', label: 'Iterations', Icon: LayoutGrid },
      { href: '/tasks', label: 'Tasks', Icon: ListChecks }
    ]
  },
  {
    id: 'explore',
    label: 'Explore',
    items: [
      { href: '/graph', label: 'Dependency graph', Icon: GitBranch },
      { href: '/docs', label: 'Docs', Icon: BookOpen }
    ]
  }
]

export function StudioSidebar() {
  const pathname = usePathname()

  return (
    <SidebarProvider className='h-full min-h-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='gap-0 overflow-y-auto px-2 py-4'>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.id} className='py-2'>
            <SidebarGroupLabel className='font-sans text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-sidebar-foreground/60'>
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className='mt-1'>
              <SidebarMenu className='gap-0.5'>
                {group.items.map(({ href, label, Icon }) => {
                  const isActive = pathname === href
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        size='sm'
                        isActive={isActive}
                        render={<NextLink variant='unstyled' href={href} />}
                        className='h-auto min-h-8 items-center gap-3 py-1.5 font-sans text-sm font-normal'
                      >
                        <Icon className='size-4 shrink-0' />
                        <span>{label}</span>
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
