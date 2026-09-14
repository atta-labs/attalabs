'use client'

import {
  Button,
  ChromeFrame,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
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
} from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getAegNavIcon } from '@/lib/nav-icons'

export type StudioProjectLink = { segment: string; href: string; label: string }

/** Fixed top-level nav — Studio has exactly these five entries; unlike the
 *  docs sidebar this isn't a generic renderer over a CMS/doctrine nav model. */
const NAV_ITEMS = [
  { label: 'Home', href: '/studio', iconSlug: 'overview', exact: true },
  { label: 'Projects', href: '/studio/projects', iconSlug: 'projects', exact: false },
  { label: 'Tranches', href: '/studio/tranches', iconSlug: 'tranches', exact: false },
  { label: 'Backlog', href: '/studio/backlog', iconSlug: 'backlog', exact: false }
] as const

const DOCS_LINK = { label: 'Docs', href: 'https://vinaya.attalabs.dev/docs/reference', iconSlug: 'docs' } as const

function isActivePath(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function NavBody({ pathname, projectLinks }: { pathname: string; projectLinks: StudioProjectLink[] }) {
  return (
    <SidebarContent role='navigation' aria-label='Studio' className='gap-0 overflow-y-auto px-2 py-4'>
      <Text
        as='span'
        className='mb-2 block px-2 font-sans text-sm font-bold uppercase tracking-widest text-sidebar-foreground'
      >
        Vinaya Studio
      </Text>

      <SidebarGroup className='py-1.5'>
        <SidebarGroupContent>
          <SidebarMenu className='gap-0.5'>
            {NAV_ITEMS.map((item) => {
              const Icon = getAegNavIcon(item.iconSlug)
              const active = isActivePath(pathname, item.href, item.exact)
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={active}
                    render={<NextLink variant='unstyled' href={item.href} />}
                    className='font-sans text-sm font-medium'
                  >
                    <Icon className='size-4' aria-hidden />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.label === 'Projects' && projectLinks.length > 0 && (
                    <SidebarMenuSub>
                      {projectLinks.map((p) => (
                        <SidebarMenuSubItem key={p.segment}>
                          {/* `asChild`, not `render`: unlike `SidebarMenuButton`,
                           * `SidebarMenuSubButton` carries no cross-library `render` shim
                           * (`interactive/sidebar-menu-button.tsx`'s own comment names this
                           * gap) — Studio is pinned to `retro` (`ui-library-pins.ts`), whose
                           * native `installed/sidebar.tsx` understands `asChild`/`Slot`, not
                           * `render`. */}
                          <SidebarMenuSubButton
                            asChild
                            isActive={pathname === p.href || pathname.startsWith(`${p.href}/`)}
                            className='font-sans text-sm'
                          >
                            <NextLink variant='unstyled' href={p.href}>
                              <span className='line-clamp-1'>{p.label}</span>
                            </NextLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              )
            })}

            <SidebarMenuItem>
              <SidebarMenuButton
                render={<NextLink variant='unstyled' href={DOCS_LINK.href} target='_blank' rel='noreferrer' />}
                className='font-sans text-sm font-medium'
              >
                {(() => {
                  const DocsIcon = getAegNavIcon(DOCS_LINK.iconSlug)
                  return <DocsIcon className='size-4' aria-hidden />
                })()}
                <span>{DOCS_LINK.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  )
}

/** The fixed desktop rail. Hidden below `lg`, where the same nav body is
 *  reached through the drawer below instead — mirrors
 *  `apps/vinaya-portal/web`'s `DocSidebar`/`DocSidebarHost` split. */
function StudioSidebarRail({ pathname, projectLinks }: { pathname: string; projectLinks: StudioProjectLink[] }) {
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '16rem' } as React.CSSProperties}
      className='hidden h-full min-h-0 w-(--sidebar-width) shrink-0 flex-col text-sidebar-foreground lg:flex'
    >
      <ChromeFrame variant='rail' className='flex min-h-0 flex-1 flex-col'>
        <NavBody pathname={pathname} projectLinks={projectLinks} />
      </ChromeFrame>
    </SidebarProvider>
  )
}

export function StudioSidebarHost({ projectLinks }: { projectLinks: StudioProjectLink[] }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  // Close the drawer once navigation lands — same pattern as the docs sidebar.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <>
      <StudioSidebarRail pathname={pathname} projectLinks={projectLinks} />

      <div className='relative z-10 shrink-0 lg:hidden'>
        <ChromeFrame variant='bar' className='h-11 items-center gap-3 px-4'>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant='outline' size='icon' aria-label='Open Studio navigation'>
                <Menu className='size-4' />
              </Button>
            </SheetTrigger>
            <SheetContent side='left' className='bg-sidebar text-sidebar-foreground p-0'>
              <SheetTitle className='sr-only'>Studio navigation</SheetTitle>
              <SidebarProvider className='flex h-full min-h-0 w-full flex-col'>
                <NavBody pathname={pathname} projectLinks={projectLinks} />
              </SidebarProvider>
            </SheetContent>
          </Sheet>

          <Text as='span' className='font-sans text-sm font-bold uppercase tracking-widest text-foreground'>
            Vinaya Studio
          </Text>
        </ChromeFrame>
      </div>
    </>
  )
}
