import type { ReactNode } from 'react'

export default function TranchesLayout({ children }: { children: ReactNode }) {
  // StudioShell owns the scroll container and the page padding (`px-8 py-8`) —
  // this layout adds neither. It previously re-applied both plus its own
  // `h-full overflow-y-auto`, which nested a second scroller inside the shell's
  // and doubled the gutter to 4rem and the top space to 4rem. All this layout
  // contributes is the narrower measure.
  return <div className='mx-auto max-w-4xl'>{children}</div>
}
