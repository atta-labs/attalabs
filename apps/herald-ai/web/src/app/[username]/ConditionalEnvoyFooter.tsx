'use client'

import { useSearchParams } from 'next/navigation'
import { EnvoyFooter } from '@/components/envoy/EnvoyFooter'

export function ConditionalEnvoyFooter() {
  const searchParams = useSearchParams()
  return searchParams.get('preview') !== 'true' ? <EnvoyFooter /> : null
}
