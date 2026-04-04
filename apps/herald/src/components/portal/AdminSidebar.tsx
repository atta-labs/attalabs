'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider
} from '@/components/ui/sidebar'

interface NavChild {
  href: string
  label: string
  comingSoon?: boolean
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  children?: NavChild[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/admin/theme',
    label: 'User Interface',
    icon: <span className='text-sm'>◐</span>,
    children: [
      { href: '/admin/theme', label: 'Themes' },
      { href: '/admin/libraries', label: 'Libraries', comingSoon: true }
    ]
  }
]

function CollapsibleNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const hasActiveChild = item.children?.some((child) => pathname === child.href) ?? false
  const isExpanded = pathname.startsWith(item.href) || hasActiveChild
  const [open, setOpen] = useState(isExpanded)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='group/collapsible'>
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              isActive={isExpanded}
              className={`cursor-pointer border py-5 ${
                isExpanded
                  ? 'border-sidebar-border bg-sidebar-accent font-bold text-sidebar-accent-foreground'
                  : 'border-transparent text-sidebar-foreground/50 hover:bg-sidebar-accent/50'
              }`}
            />
          }
        >
          {item.icon}
          <span>{item.label}</span>
          <ChevronDown className='ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180' />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children?.map((child) => {
              const childActive = pathname === child.href

              return (
                <SidebarMenuSubItem key={child.href}>
                  {child.comingSoon ? (
                    <SidebarMenuSubButton className='cursor-not-allowed opacity-50'>
                      {child.label}
                      <span className='ml-2 rounded bg-sidebar-accent px-1.5 py-0.5 font-mono text-[9px]'>Soon</span>
                    </SidebarMenuSubButton>
                  ) : (
                    <SidebarMenuSubButton isActive={childActive} render={<Link href={child.href} />}>
                      {child.label}
                    </SidebarMenuSubButton>
                  )}
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AdminSidebar({ username }: { username: string }) {
  const pathname = usePathname()
  const { signOut } = useClerk()
  const { user } = useUser()

  return (
    <SidebarProvider className='!min-h-0 w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='flex h-full flex-col'>
        {/* Header */}
        <div className='border-b border-sidebar-border px-4 py-4'>
          <p className='font-display text-sm tracking-tight'>Herald</p>
          <p className='mt-0.5 font-mono text-[10px] text-sidebar-foreground/50'>{username}.heyherald.com</p>
        </div>

        {/* Navigation */}
        <SidebarGroup className='flex-1 px-4 pt-4'>
          <SidebarGroupContent>
            <SidebarMenu className='gap-2'>
              {NAV_ITEMS.map((item) =>
                item.children && item.children.length > 0 ? (
                  <CollapsibleNavItem key={item.href} item={item} />
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={pathname.startsWith(item.href)}
                      render={<Link href={item.href} />}
                      className={`cursor-pointer border py-5 ${
                        pathname.startsWith(item.href)
                          ? 'border-sidebar-border bg-sidebar-accent font-bold text-sidebar-accent-foreground'
                          : 'border-transparent text-sidebar-foreground/50 hover:bg-sidebar-accent/50'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className='border-t border-sidebar-border px-4 py-3 space-y-2'>
          <Link
            href='/admin/settings'
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 font-mono text-xs transition-colors ${
              pathname.startsWith('/admin/settings')
                ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
          >
            <span className='text-sm'>⚙</span>
            <span>Settings</span>
          </Link>
          <div className='flex items-center justify-between px-3'>
            <div className='flex items-center gap-2'>
              {user?.imageUrl && <img src={user.imageUrl} alt='' className='h-5 w-5 rounded-full' />}
              <span className='font-mono text-[10px] text-sidebar-foreground/50'>{user?.firstName ?? username}</span>
            </div>
            <button
              type='button'
              onClick={() => signOut({ redirectUrl: '/' })}
              className='font-mono text-[10px] text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground'
            >
              Sign out
            </button>
          </div>
        </div>
      </SidebarContent>
    </SidebarProvider>
  )
}
