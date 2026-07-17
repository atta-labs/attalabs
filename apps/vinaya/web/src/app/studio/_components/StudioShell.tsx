import type { ReactNode } from 'react'

/**
 * The one layout shell for every Studio page (task 11 #571 follow-up). It owns
 * the scroll container, the page padding, and the centered content column, so
 * every route — projects, iterations, backlog, the dashboard, the board — reads
 * coherently instead of each page inventing (or forgetting) its own spacing.
 * A page renders only its content (`space-y-*`); it never sets `px`/`py`,
 * width, or overflow of its own.
 */
export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <div className='h-[calc(100dvh-3.5rem)] overflow-y-auto bg-background'>
      <div className='mx-auto w-full max-w-6xl px-8 py-8'>{children}</div>
    </div>
  )
}
