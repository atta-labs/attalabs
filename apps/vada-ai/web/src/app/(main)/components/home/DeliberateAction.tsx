'use client'

import { SignInButton, useAuth } from '@atta/auth'
import { Button } from '@atta/ui/components'
import { usePathname, useRouter } from 'next/navigation'

export function DeliberateAction({
  label = 'Deliberate',
  variant = 'outline'
}: {
  label?: string
  variant?: 'outline' | 'default'
}) {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  if (isSignedIn) {
    return (
      <Button variant={variant} size='lg' onClick={() => router.push('/deliberate')}>
        {label}
      </Button>
    )
  }

  return (
    <SignInButton mode='modal' fallbackRedirectUrl={pathname}>
      <Button variant={variant} size='lg'>
        {label}
      </Button>
    </SignInButton>
  )
}
