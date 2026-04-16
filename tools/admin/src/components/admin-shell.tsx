'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Palette, Brush, Library } from 'lucide-react'
import { Button } from '@atta/ui/components/button'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider
} from '@atta/ui'

const navItems = [
  { label: 'Themes', href: '/themes', icon: Palette, disabled: false },
  { label: 'Branding', href: '#', icon: Brush, disabled: true },
  { label: 'Libraries', href: '#', icon: Library, disabled: true }
] as const

interface AdminShellProps {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className='flex h-screen flex-col'>
      {/* Top bar */}
      <header className='flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4'>
        <span className='font-mono text-sm text-muted-foreground'>tools/admin</span>
        <Button variant='outline' size='sm' disabled>
          Vada
        </Button>
      </header>

      {/* Body */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Left sidebar */}
        <SidebarProvider className='h-full w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
          <SidebarContent className='px-2 py-4'>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className='gap-1'>
                  {navItems.map(({ label, href, icon: Icon, disabled }) => (
                    <SidebarMenuItem key={label}>
                      <SidebarMenuButton
                        size='sm'
                        isActive={!disabled && pathname.startsWith(href)}
                        disabled={disabled}
                        render={disabled ? <span /> : <Link href={href} />}
                      >
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

        {/* Main content */}
        <main className='flex-1 overflow-auto'>{children}</main>
      </div>
    </div>
  )
}
