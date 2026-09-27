'use client'

import { SidebarProvider } from '@atta/ui/components'
import type { CSSProperties, ReactNode } from 'react'
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
 * surface, the wordmark pinned at the top, and a slot below it for the page's own nav.
 * It is content-agnostic — the doctrine tree, the CLI command list and the config section
 * list each own their nav and pass it in as `children`.
 *
 * Provides `SidebarProvider` context, so the slot can use the sidebar primitives
 * (`SidebarContent`, `SidebarMenu`, ...); a `SidebarContent` child fills the height left
 * under the wordmark and scrolls on its own. A plain surface rather than
 * `ChromeFrame variant='rail'`: the rail draws a right border (and under retro a floating
 * inset card), and this shell has neither, without touching the shared frame other apps'
 * rails still use. Hidden below `lg`, where each docs page reaches its nav another way
 * (the doctrine tree's drawer) or not at all.
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

type DocsShellProps = {
  /** The page's sidebar content, rendered in `SidebarShell`'s slot. */
  sidebar: ReactNode
  /** Passed through to `SidebarShell`; omit to size the sidebar to its content. */
  sidebarWidth?: string
  /** The body below the nav strip — normally one scrolling `<main>` pane. */
  children: ReactNode
}

/**
 * The one layout every docs page renders in, except State Machine (see
 * `usesDocsShell`): `SidebarShell` on the left, and on the right a body whose own top
 * strip carries the site nav and theme toggle — scoped to the body's width, no logo from
 * `lg` up — above the page content.
 *
 * Fills `SiteContentPad`'s definite `h-dvh` height (`h-full`, no bar padding on these
 * routes), so the sidebar and the body's own pane each scroll inside it. The strip is in
 * flow, not fixed; `relative z-30` keeps its Docs dropdown painting over the pane's own
 * sticky headers below it.
 */
export function DocsShell({ sidebar, sidebarWidth, children }: DocsShellProps) {
  const { wordmark, topStrip } = useDocsChrome()
  return (
    <div className='flex h-full min-h-0 w-full overflow-hidden'>
      <SidebarShell wordmark={wordmark} width={sidebarWidth}>
        {sidebar}
      </SidebarShell>
      <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
        <div className='relative z-30 shrink-0'>{topStrip}</div>
        {children}
      </div>
    </div>
  )
}
