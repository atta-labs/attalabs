'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Brain, FlaskConical, Layers } from 'lucide-react'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@atta/ui'

const SCIENCE_NAV = [
  { href: '/science/overview', label: 'Overview', icon: BookOpen },
  { href: '/science/frameworks', label: 'Frameworks', icon: Layers },
  { href: '/science/agents', label: 'Agents', icon: Brain },
  { href: '/science/mechanics', label: 'Mechanics', icon: FlaskConical }
]

export function ScienceSidebar() {
  const pathname = usePathname()

  return (
    <SidebarProvider className='h-full w-56 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='px-2 py-4'>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className='gap-1'>
              {SCIENCE_NAV.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton size='sm' isActive={pathname === href} render={<Link href={href} />}>
                    <Icon className='shrink-0' />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </SidebarProvider>
  )
}
