'use client'

import {
  Button,
  ChromeFrame,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SidebarProvider
} from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { PanelLeft, XIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  type CSSProperties,
  createContext,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useState
} from 'react'
import { useDocsChrome } from '../../_components/DocsChrome'

/** True inside `SidebarDrawer`'s drawer only — how `DocsSidebarTitle` knows to carry the close control. */
const InDrawerContext = createContext(false)

type DocsSidebarTitleProps = {
  /**
   * The row's box and type: padding, margin, any rule under it, and the title's own
   * font size. The close control is centred on one line of this row's text, so the
   * font size set here must be the title's.
   */
  className?: string
  /** The sidebar's title — a heading, a label, a breadcrumb trail. */
  children: ReactNode
}

/**
 * The row every docs sidebar puts its title in. On the desktop sidebar it is the title
 * and nothing more. Inside the drawer it also carries the drawer's close control, on the
 * same row, centred on the title's first line (`h-[1lh]` — one line box of the row's own
 * font) — so the X lines up with whatever title a sidebar shows by construction, however
 * much padding that sidebar puts above it, and a title that wraps keeps the X on its
 * first line.
 */
export function DocsSidebarTitle({ className, children }: DocsSidebarTitleProps) {
  const inDrawer = useContext(InDrawerContext)
  return (
    <div className={cn('flex items-start gap-2', className)}>
      <div className='min-w-0 flex-1'>{children}</div>
      {inDrawer && (
        <div className='flex h-[1lh] shrink-0 items-center'>
          <SheetClose asChild>
            <Button variant='ghost' size='icon-sm' className='-mr-1.5'>
              <XIcon />
              <span className='sr-only'>Close</span>
            </Button>
          </SheetClose>
        </div>
      )}
    </div>
  )
}

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
 * body whose sidebar-panel button opens the page's sidebar content in a left-hand drawer.
 * Like the shell, it knows nothing about that content — it renders whatever it is given,
 * inside the same `SidebarProvider` context and the same flex column the desktop slot
 * gives it, so a nav list and a panel of prose both fill and scroll the drawer. The one
 * thing the content supplies is its title row, as `DocsSidebarTitle`, which draws the
 * drawer's close X beside the title (Escape and a click outside close it regardless).
 *
 * The drawer closes itself on the two things that mean "the reader went somewhere":
 * the pathname changing (a doc link landing) and a click on any link inside it (which
 * also covers same-page anchors, whose `preventDefault`-plus-scroll never changes the
 * pathname). Watching both from here keeps every page's items identical on both
 * surfaces — no `SheetClose` wrapping, since the desktop sidebar has no drawer to close.
 * Buttons inside the drawer (a drill-level back control, say) leave it open.
 *
 * Rendered through `ChromeFrame variant='bar'` — the same canonical sticky as the docs
 * breadcrumb (`StickyDocHeader`) — for its surface and content box, with the frame's edge
 * (a bottom rule, or retro's card border and shadow) taken off: neither the bar nor the
 * open drawer draws a border. The outer div owns placement and visibility.
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
      {/* `px-6` and the `size-10` (`icon-lg`) trigger mirror the top strip's logo above:
       * the strip's `px-6` inset and the logo's `h-10` mark box, so the sidebar icon sits
       * centred under the mark, and `gap-1` (the lockup's own gap) puts the label on the
       * wordmark text's left edge. No border on the bar (the flush frame's bottom rule,
       * retro's card edge and shadow) nor on the trigger (`ghost`, not `outline`). */}
      <ChromeFrame variant='bar' className='h-11 items-center gap-1 border-0 px-6 shadow-none'>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant='ghost' size='icon-lg' aria-label={`Open ${label} navigation`}>
              <PanelLeft className='size-5' />
            </Button>
          </SheetTrigger>
          {/* `data-[side=left]:border-r-0` drops the sheet's own right edge — the same
           * variant as the class it overrides, so it wins under any library's sheet.
           * `showCloseButton={false}`: the sheet's own X is absolutely placed and cannot
           * know where a sidebar's title sits; `DocsSidebarTitle` draws it in the title row. */}
          <SheetContent
            side='left'
            showCloseButton={false}
            className='bg-sidebar p-0 text-sidebar-foreground data-[side=left]:border-r-0'
            onClick={closeOnLink}
          >
            <SheetTitle className='sr-only'>{label}</SheetTitle>
            {/* No `--sidebar-width` here: `SheetContent`'s `w-3/4 sm:max-w-sm` sizes the
             * drawer — viewport-relative, so it holds on a 320px phone where a fixed
             * width would not. `closeOnLink` only observes the click as it bubbles; it
             * never stops it, so a link's own handler has already run. Keyboard
             * activation of a link dispatches the same click. `pt-2` stands in for the
             * wordmark row the desktop sidebar has above the same content, so a title
             * set close to the top still leaves the close X (and its focus ring) room. */}
            <InDrawerContext.Provider value={true}>
              <SidebarProvider className='h-full min-h-0 w-full flex-col pt-2'>{children}</SidebarProvider>
            </InDrawerContext.Provider>
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
 * drawer for whatever it passes, with nothing of its own to wire beyond putting its
 * title in `DocsSidebarTitle`.
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
