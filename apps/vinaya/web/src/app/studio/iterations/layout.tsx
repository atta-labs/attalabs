import type { ReactNode } from 'react'

export default function IterationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className='h-full overflow-y-auto px-8 py-8'>
      <div className='mx-auto max-w-4xl'>{children}</div>
    </div>
  )
}
