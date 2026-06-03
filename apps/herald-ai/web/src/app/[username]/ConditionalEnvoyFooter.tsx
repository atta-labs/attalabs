'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { TopBar } from '@atta/ui/topbar'

export function ConditionalEnvoyNav({ logoUrl }: { logoUrl: string | null }) {
  const searchParams = useSearchParams()
  const [inIframe, setInIframe] = useState(false)

  useEffect(() => {
    try {
      setInIframe(window.self !== window.top)
    } catch {
      setInIframe(true)
    }
  }, [])

  if (searchParams.get('preview') === 'true' || inIframe) return null
  return <TopBar logoText='Herald' logoUrl={logoUrl} signedInLinks={[{ label: 'Dashboard', href: '/admin' }]} />
}
