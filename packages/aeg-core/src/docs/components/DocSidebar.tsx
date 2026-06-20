'use client'

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
import type { Doc, DocNav } from '../types'

export type DocSidebarProps = { nav: DocNav; pathname: string }

export function DocSidebar({ nav, pathname }: DocSidebarProps) {
  return (
    <SidebarProvider className='h-full min-h-0 w-52 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground'>
      <SidebarContent className='gap-0 overflow-y-auto px-2 py-4'>
        {nav.sections.map((section) => (
          <SidebarGroup key={section.id} className='py-1.5'>
            <SidebarGroupLabel className='font-sans text-[10px] font-bold tracking-[0.15em] uppercase text-sidebar-foreground/50'>
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent className='mt-1'>
              <SidebarMenu className='gap-0.5'>
                {section.docs.map((doc) =>
                  doc.children?.length ? (
                    <CollapsibleDocItem key={doc.slug} doc={doc} pathname={pathname} />
                  ) : (
                    <FlatDocItem key={doc.slug} doc={doc} pathname={pathname} />
                  )
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </SidebarProvider>
  )
}

function FlatDocItem({ doc, pathname }: { doc: Doc; pathname: string }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size='sm'
        isActive={pathname === doc.href}
        render={<NextLink variant='unstyled' href={doc.href} />}
        className='h-auto min-h-7 py-1 font-sans text-[13px] tracking-tight font-normal [&>span:last-child]:whitespace-normal [&>span:last-child]:leading-snug'
      >
        <span>{doc.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function CollapsibleDocItem({ doc, pathname }: { doc: Doc; pathname: string }) {
  const hasActiveChild = pathname === doc.href || (doc.children?.some((c) => pathname === c.href) ?? false)

  return (
    <Collapsible defaultOpen={hasActiveChild} className='group/collapsible'>
      <SidebarMenuItem>
        <CollapsibleTrigger
          render={
            <SidebarMenuButton
              size='sm'
              isActive={hasActiveChild}
              className='h-auto min-h-7 py-1 font-sans text-[13px] tracking-tight font-normal'
            />
          }
        >
          <span>{doc.title}</span>
          <ChevronDown className='ml-auto size-3.5 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180' />
        </CollapsibleTrigger>
      </SidebarMenuItem>
      <CollapsibleContent>
        <SidebarMenuSub>
          {doc.children?.map((child) => (
            <SidebarMenuSubItem key={child.slug}>
              <SidebarMenuSubButton
                size='sm'
                isActive={pathname === child.href}
                render={<NextLink variant='unstyled' href={child.href} />}
                className='h-auto min-h-7 py-1 font-sans text-[13px] tracking-tight font-normal'
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
