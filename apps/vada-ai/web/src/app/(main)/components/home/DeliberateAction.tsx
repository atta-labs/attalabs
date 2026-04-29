'use client'

import { SignInButton, useAuth } from '@atta/auth'
import { Button } from '@atta/ui'
import { usePathname, useRouter } from 'next/navigation'

export function DeliberateAction() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (isSignedIn) {
    return (
      <Button variant='outline' size='lg' onClick={() => router.push('/autonomous/deliberate')}>
        Deliberate
      </Button>
    )
  }

  return (
    <SignInButton mode='modal' fallbackRedirectUrl={pathname}>
      <Button variant='outline' size='lg'>
        Deliberate
      </Button>
    </SignInButton>
  )
}
