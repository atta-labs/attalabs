import { Flex } from '@atta/ui/shared'
import type { ReactNode } from 'react'

export function StudioShell({ children }: { children: ReactNode }) {
  return (
    <Flex direction='column' className='h-[calc(100dvh-3.5rem)] overflow-hidden bg-background'>
      {children}
    </Flex>
  )
}
