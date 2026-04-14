'use client'

import { Button } from '@atta/ui'
import { useRouter } from 'next/navigation'

export function StartAction() {
  const router = useRouter()

  return (
    <Button variant='outline' size='lg' onClick={() => router.push('/deliberate')}>
      Start
    </Button>
  )
}
