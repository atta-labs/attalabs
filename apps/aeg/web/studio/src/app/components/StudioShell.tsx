import type { ReactNode } from 'react'

export function StudioShell({ children }: { children: ReactNode }) {
  return <div className='flex h-[calc(100dvh-3.5rem)] overflow-hidden flex-col bg-background'>{children}</div>
}
