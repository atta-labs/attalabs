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
import type { Project } from '@atta/aeg-core'
import { BookOpen, FolderKanban, GitBranch } from 'lucide-react'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'

type NavItem = {
  href: string
  label: string
  Icon: ComponentType<{ className?: string }>
}

const EXPLORE_ITEMS: NavItem[] = [
  { href: '/graph', label: 'Dependency graph', Icon: GitBranch },
  { href: '/docs', label: 'Docs', Icon: BookOpen }
]

export function StudioSidebar({ projects }: { projects: Project[] }) {
  const pathname = usePathname()

  return (
    <SidebarProvider className='h-full min-h-0 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='gap-0 overflow-y-auto px-2 py-4'>
        <SidebarGroup className='py-2'>
          <SidebarGroupLabel className='font-sans text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-sidebar-foreground/60'>
            Projects
          </SidebarGroupLabel>
          <SidebarGroupContent className='mt-1'>
            <SidebarMenu className='gap-0.5'>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size='sm'
                  isActive={pathname === '/projects'}
                  render={<NextLink variant='unstyled' href='/projects' />}
                  className='h-auto min-h-8 items-center gap-3 py-1.5 font-sans text-sm font-normal'
                >
                  <FolderKanban className='size-4 shrink-0' />
                  <span>All projects</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {projects.map((project) => {
                const href = `/projects/${project.name}`
                const isActive = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <SidebarMenuItem key={project.name}>
                    <SidebarMenuButton
                      size='sm'
                      isActive={isActive}
                      render={<NextLink variant='unstyled' href={href} />}
                      className='h-auto min-h-8 items-center gap-3 py-1.5 pl-7 font-mono text-xs font-normal'
                    >
                      <span className='truncate'>{project.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              {projects.length === 0 && (
                <SidebarMenuItem>
                  <span className='block px-3 py-1.5 font-sans text-xs text-sidebar-foreground/50'>
                    No projects registered.
                  </span>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className='py-2'>
          <SidebarGroupLabel className='font-sans text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-sidebar-foreground/60'>
            Explore
          </SidebarGroupLabel>
          <SidebarGroupContent className='mt-1'>
            <SidebarMenu className='gap-0.5'>
              {EXPLORE_ITEMS.map(({ href, label, Icon }) => {
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
      </SidebarContent>
    </SidebarProvider>
  )
}
