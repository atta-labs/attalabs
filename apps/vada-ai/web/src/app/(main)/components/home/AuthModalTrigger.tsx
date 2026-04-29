'use client'

import { useClerk } from '@atta/auth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function AuthModalTrigger() {
  const { openSignUp } = useClerk()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const signin = searchParams.get('signin')
    const signup = searchParams.get('signup')
    if (!signin && !signup) return

    openSignUp()

    const next = new URLSearchParams(searchParams)
    next.delete('signin')
    next.delete('signup')
    const qs = next.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }, [searchParams, openSignUp, router])

  return null
}
