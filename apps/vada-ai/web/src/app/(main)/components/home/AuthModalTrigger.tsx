'use client'

import { useClerk } from '@clerk/nextjs'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export function AuthModalTrigger() {
  const { openSignIn, openSignUp } = useClerk()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const signin = searchParams.get('signin')
    const signup = searchParams.get('signup')
    if (!signin && !signup) return

    if (signup) openSignUp()
    else openSignIn()

    const next = new URLSearchParams(searchParams)
    next.delete('signin')
    next.delete('signup')
    const qs = next.toString()
    router.replace(qs ? `/?${qs}` : '/', { scroll: false })
  }, [searchParams, openSignIn, openSignUp, router])

  return null
}
