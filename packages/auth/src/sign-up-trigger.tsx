'use client'

import { useClerk } from '@clerk/nextjs'
import type { ReactNode } from 'react'

export function SignUpTrigger({ children }: { children: ReactNode }) {
  const { openSignUp } = useClerk()
  return (
    <button type='button' onClick={() => openSignUp()} className='cursor-pointer'>
      {children}
    </button>
  )
}
