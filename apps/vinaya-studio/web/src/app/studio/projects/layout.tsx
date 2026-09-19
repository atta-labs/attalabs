import type { ReactNode } from 'react'

// The per-project nav (previously `ProjectsSubBar`, a sticky in-page tab
// strip) moved into the persistent sidebar's "Projects" children (task 2
// #1054) — this layout no longer fetches the project list or renders a
// sub-bar of its own.
export default function ProjectsLayout({ children }: { children: ReactNode }) {
  // max-w-4xl keeps prose pages (task-detail briefs) at a readable measure. A
  // wide board table that doesn't fit this width scrolls inside its own
  // container (the responsive Table wrapper), so the column width no longer
  // needs the page widened to accommodate it.
  //
  // No `px-8`: StudioShell already applies it, and re-applying it here put
  // the gutter at 4rem and cut the measure to 52rem (vs 56rem elsewhere).
  return <div className='mx-auto max-w-4xl'>{children}</div>
}
