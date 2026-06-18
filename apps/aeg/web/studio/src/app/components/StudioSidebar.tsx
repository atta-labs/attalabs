'use client'

import { usePathname } from 'next/navigation'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@atta/ui/components/collapsible'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider
} from '@atta/ui/components/sidebar'
import { NextLink } from '@atta/ui/lib/next-link'
import { ChevronDown } from 'lucide-react'
import { getAegNavIcon } from '@/lib/nav-icons'

export type AegNavItem = {
  slug: string
  href: string
  title: string
  indent?: boolean
  matchPrefix?: boolean
  children?: AegNavItem[]
}

export type AegNavGroup = {
  id: string
  label: string
  items: AegNavItem[]
}

function CollapsibleNavItem({ item, pathname }: { item: AegNavItem; pathname: string }) {
  const isChildActive = (child: AegNavItem) =>
    child.matchPrefix ? pathname === child.href || pathname.startsWith(`${child.href}/`) : pathname === child.href
  const hasActiveChild = item.children?.some(isChildActive) ?? false
  const Icon = getAegNavIcon(item.slug)

  return (
    <Collapsible defaultOpen={hasActiveChild} className='group/collapsible'>
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              size='sm'
              isActive={hasActiveChild}
              className='h-auto min-h-8 items-start gap-3 py-1.5 font-sans text-sm font-normal [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug'
            />
          }
        >
          <Icon className='mt-0.5 size-4 shrink-0' />
          <span>{item.title}</span>
          <ChevronDown className='ml-auto size-3.5 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180' />
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent>
        <SidebarMenuSub>
          {item.children?.map((child) => (
            <SidebarMenuSubItem key={child.slug}>
              <SidebarMenuSubButton
                size='sm'
                isActive={isChildActive(child)}
                render={<NextLink variant='unstyled' href={child.href} />}
                className='font-sans text-sm font-normal'
              >
                <span>{child.title}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function StudioSidebar({ groups }: { groups: AegNavGroup[] }) {
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
                {group.items.map((item) => {
                  if (item.children?.length) {
                    return <CollapsibleNavItem key={item.slug} item={item} pathname={pathname} />
                  }
                  const { slug, href, title, indent, matchPrefix } = item
                  const Icon = getAegNavIcon(slug)
                  const isActive = matchPrefix
                    ? pathname === href || pathname.startsWith(`${href}/`)
                    : pathname === href
                  return (
                    <SidebarMenuItem key={slug}>
                      <SidebarMenuButton
                        size='sm'
                        isActive={isActive}
                        render={<NextLink variant='unstyled' href={href} />}
                        className={
                          indent
                            ? 'h-auto min-h-8 items-center gap-3 py-1.5 pl-7 font-mono text-xs font-normal'
                            : 'h-auto min-h-8 items-start gap-3 py-1.5 font-sans text-sm font-normal [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug'
                        }
                      >
                        {!indent && <Icon className='mt-0.5 size-4 shrink-0' />}
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
