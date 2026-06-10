'use client'

import { useClerk } from '@atta/auth'
import { Button } from '@atta/ui/components'

export function SignUpAction() {
  const { openSignUp } = useClerk()

  return (
    <Button variant='outline' size='lg' onClick={() => openSignUp()}>
      Sign Up
    </Button>
  )
}
