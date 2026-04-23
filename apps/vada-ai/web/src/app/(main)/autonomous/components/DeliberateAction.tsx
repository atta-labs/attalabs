'use client'

import { useClerk } from '@atta/auth'
import { Button } from '@atta/ui'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export function DeliberateAction() {
  const { isSignedIn } = useAuth()
  const { openSignUp } = useClerk()
  const router = useRouter()

  const onClick = () => {
    if (isSignedIn) {
      router.push('/autonomous/deliberate')
      return
    }
    openSignUp()
  }

  return (
    <Button variant='outline' size='lg' onClick={onClick}>
      Deliberate
    </Button>
  )
}
