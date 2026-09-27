'use client'

import {
  Button,
  ChromeFrame,
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SidebarProvider
} from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { Menu } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { type CSSProperties, type MouseEvent, type ReactNode, useEffect, useState } from 'react'
import { useDocsChrome } from '../../_components/DocsChrome'

type SidebarShellProps = {
  /** Pinned at the top of the sidebar, above the content slot. */
  wordmark: ReactNode
  /**
   * A fixed sidebar width, any CSS length. Omitted, the sidebar sizes to its own
   * content, no narrower than 16rem and no wider than 20rem.
   */
  width?: string
  /** Whatever the page's sidebar shows. The shell knows nothing about it. */
  children: ReactNode
}

/**
 * The docs sidebar's outer shell, and nothing else: full height, no border, the sidebar
 * surface, the wordmark pinned at the top, and a slot below it for the page's own content.
 * It is content-agnostic — the doctrine tree, the CLI command list, the config section
 * list and the harness page's own explanation panel each own what they show and pass it
 * in as `children`.
 *
 * Provides `SidebarProvider` context, so the slot can use the sidebar primitives
 * (`SidebarContent`, `SidebarMenu`, ...); the slot is a flex column under the wordmark, so
 * a `SidebarContent` child (or any `min-h-0 flex-1 overflow-y-auto` box) fills the height
 * left and scrolls on its own. A plain surface rather than `ChromeFrame variant='rail'`:
 * the rail draws a right border (and under retro a floating inset card), and this shell
 * has neither, without touching the shared frame other apps' rails still use. Hidden below
 * `lg`, where `DocsShell` opens the same content in `SidebarDrawer` instead.
 */
export function SidebarShell({ wordmark, width, children }: SidebarShellProps) {
  const sizing = width ? 'w-(--sidebar-width)' : 'w-max min-w-64 max-w-80'
  return (
    <SidebarProvider
      style={width ? ({ '--sidebar-width': width } as CSSProperties) : undefined}
      className={`hidden h-full min-h-0 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex ${sizing}`}
    >
      <div className='flex h-14 shrink-0 items-center px-4'>{wordmark}</div>
      {children}
    </SidebarProvider>
  )
}

type SidebarDrawerProps = {
  /** Names the drawer: the bar's visible label and the dialog's accessible title. */
  label: string
  /** The same content the desktop sidebar shows. */
  children: ReactNode
}

/**
 * The sidebar below `lg`, where `SidebarShell` is hidden: a bar at the top of the docs
 * body whose menu button opens the page's sidebar content in a left-hand drawer. Like
 * the shell, it knows nothing about that content — it renders whatever it is given,
 * inside the same `SidebarProvider` context and the same flex column the desktop slot
 * gives it, so a nav list and a panel of prose both fill and scroll the drawer.
 *
 * The drawer closes itself on the two things that mean "the reader went somewhere":
 * the pathname changing (a doc link landing) and a click on any link inside it (which
 * also covers same-page anchors, whose `preventDefault`-plus-scroll never changes the
 * pathname). Watching both from here keeps every page's items identical on both
 * surfaces — no `SheetClose` wrapping, since the desktop sidebar has no drawer to close.
 * Buttons inside the drawer (a drill-level back control, say) leave it open.
 *
 * Rendered through `ChromeFrame variant='bar'` — the same canonical sticky as the docs
 * breadcrumb (`StickyDocHeader`) — so it reads as a floating inset card under retro and a
 * flush strip under the flush libraries. The outer div owns placement and visibility;
 * the frame owns the content box.
 */
function SidebarDrawer({ label, children }: SidebarDrawerProps) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const closeOnLink = (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest('a[href]')) setOpen(false)
  }

  return (
    <div className='relative z-10 shrink-0 lg:hidden'>
      <ChromeFrame variant='bar' className='h-11 items-center gap-3 px-4'>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant='outline' size='icon' aria-label={`Open ${label} navigation`}>
              <Menu className='size-4' />
            </Button>
          </SheetTrigger>
          <SheetContent side='left' className='bg-sidebar p-0 text-sidebar-foreground' onClick={closeOnLink}>
            <SheetTitle className='sr-only'>{label}</SheetTitle>
            {/* No `--sidebar-width` here: `SheetContent`'s `w-3/4 sm:max-w-sm` sizes the
             * drawer — viewport-relative, so it holds on a 320px phone where a fixed
             * width would not. `closeOnLink` only observes the click as it bubbles; it
             * never stops it, so a link's own handler has already run. Keyboard
             * activation of a link dispatches the same click. */}
            <SidebarProvider className='h-full min-h-0 w-full flex-col'>{children}</SidebarProvider>
          </SheetContent>
        </Sheet>

        <Text as='span' className='font-sans text-sm font-bold uppercase tracking-widest text-foreground'>
          {label}
        </Text>
      </ChromeFrame>
    </div>
  )
}

type DocsShellProps = {
  /** The page's sidebar content: `SidebarShell`'s slot from `lg` up, the drawer below. */
  sidebar: ReactNode
  /** Names the sidebar content below `lg` — the drawer bar's label and the drawer's title. */
  sidebarLabel: string
  /** Passed through to `SidebarShell`; omit to size the sidebar to its content. */
  sidebarWidth?: string
  /** The body below the nav strip — normally one scrolling `<main>` pane. */
  children: ReactNode
}

/**
 * The one layout every docs page renders in, except State Machine (see
 * `usesDocsShell`): `SidebarShell` on the left, and on the right a body whose own top
 * strip carries the site nav and theme toggle — scoped to the body's width, no logo from
 * `lg` up — above the page content. Below `lg` the sidebar is hidden and
 * `SidebarDrawer`'s bar sits between the strip and the content instead, opening the
 * same `sidebar` content as a drawer — so every page that renders here gets the mobile
 * drawer for whatever it passes, with nothing of its own to wire.
 *
 * Fills `SiteContentPad`'s definite `h-dvh` height (`h-full`, no bar padding on these
 * routes), so the sidebar and the body's own pane each scroll inside it. The strip is in
 * flow, not fixed; `relative z-30` keeps its Docs dropdown painting over the pane's own
 * sticky headers below it.
 */
export function DocsShell({ sidebar, sidebarLabel, sidebarWidth, children }: DocsShellProps) {
  const { wordmark, topStrip } = useDocsChrome()
  return (
    <div className='flex h-full min-h-0 w-full overflow-hidden'>
      <SidebarShell wordmark={wordmark} width={sidebarWidth}>
        {sidebar}
      </SidebarShell>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
        <div className='relative z-30 shrink-0'>{topStrip}</div>
        <SidebarDrawer label={sidebarLabel}>{sidebar}</SidebarDrawer>
        {children}
      </div>
    </div>
  )
}
