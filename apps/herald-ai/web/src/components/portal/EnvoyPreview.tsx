'use client'

import { useEffect, useState } from 'react'
import { usePortalPreview } from '@/hooks/usePortalPreview'

type SendFn = (message: Record<string, unknown>) => void

export function EnvoyPreview({ username, onReady }: { username: string; onReady?: (send: SendFn) => void }) {
  const portalUrl = `/${username}`
  const [host, setHost] = useState<string | null>(null)

  useEffect(() => {
    setHost(window.location.host)
  }, [])

  const { iframeRef, iframeSrc, iframeKey, isReady } = usePortalPreview({
    portalUrl,
    onReady
  })

  const displayUrl = host ? `${host}/${username}` : `/${username}`

  return (
    <div className='flex h-full flex-col'>
      {/* Status bar */}
      <div className='flex items-center justify-between border-b border-border px-4 py-2'>
        <div className='flex items-center gap-2'>
          <div className={`h-2 w-2 rounded-full ${isReady ? 'bg-success' : 'bg-warning'}`} />
          <span className='font-mono text-[10px] text-muted-foreground'>
            {isReady ? 'Preview connected' : 'Loading preview...'}
          </span>
        </div>
        <a
          href={`/${username}`}
          target='_blank'
          rel='noreferrer'
          className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
        >
          {displayUrl} ↗
        </a>
      </div>

      {/* iframe */}
      <div className='flex-1 bg-black/30'>
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={iframeSrc}
          className='h-full w-full border-0'
          title='Envoy Preview'
        />
      </div>
    </div>
  )
}
