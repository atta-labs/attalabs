'use client'

import { Loader2, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@atta/ui/components'

interface PortalPreviewFrameProps {
  isReady: boolean
  portalUrl: string
  onRefresh: () => void
  title?: string
  showLoadingOverlay?: boolean
  enableFullscreen?: boolean
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  toolbar?: React.ReactNode
  children: React.ReactNode
}

export function PortalPreviewFrame({
  isReady,
  portalUrl,
  onRefresh,
  title = 'Portal Preview',
  showLoadingOverlay = true,
  enableFullscreen = true,
  isFullscreen: controlledFullscreen,
  onToggleFullscreen: controlledToggle,
  toolbar,
  children
}: PortalPreviewFrameProps) {
  const [internalFullscreen, setInternalFullscreen] = useState(false)

  const isControlled = controlledToggle !== undefined
  const isFullscreen = isControlled ? (controlledFullscreen ?? false) : internalFullscreen
  const toggleFullscreen = isControlled ? controlledToggle : () => setInternalFullscreen((prev) => !prev)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen && !isControlled) {
        setInternalFullscreen(false)
      }
    },
    [isFullscreen, isControlled]
  )

  useEffect(() => {
    if (!isControlled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isControlled, handleKeyDown])

  const hostname = (() => {
    try {
      return new URL(portalUrl).hostname
    } catch {
      return portalUrl
    }
  })()

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-background'
          : 'relative flex min-h-0 flex-1 flex-col overflow-hidden'
      }
    >
      {/* Fullscreen header */}
      {isFullscreen && (
        <div className='flex shrink-0 items-center justify-between border-b p-4'>
          <div className='flex items-center gap-4'>
            <h3 className='font-display text-sm font-semibold'>{title}</h3>
            <div className='flex items-center gap-2'>
              <div className={`h-2 w-2 rounded-full ${isReady ? 'bg-success' : 'bg-warning'}`} />
              <span className='font-mono text-xs text-muted-foreground'>{isReady ? 'Connected' : 'Connecting...'}</span>
            </div>
          </div>
          <div className='flex gap-2'>
            <Button type='button' variant='ghost' size='sm' onClick={onRefresh} className='h-8 gap-1.5 px-2 text-xs'>
              <RefreshCw className='h-3.5 w-3.5' />
              Refresh
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={toggleFullscreen}
              className='h-8 gap-1.5 px-2 text-xs'
            >
              <Minimize2 className='h-3.5 w-3.5' />
              Exit
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar slot */}
      {toolbar}

      {/* Iframe wrapper */}
      <div className={isFullscreen ? 'relative flex-1' : 'relative h-full w-full flex-1'}>
        {showLoadingOverlay && !isReady && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-background'>
            <div className='flex flex-col items-center gap-3'>
              <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
              <span className='font-mono text-xs text-muted-foreground'>Loading preview...</span>
            </div>
          </div>
        )}

        {children}

        {/* Bottom status pill */}
        {!isFullscreen && (
          <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border bg-background/90 px-3 py-1.5 shadow-sm backdrop-blur-sm'>
            <div className='flex items-center gap-1.5'>
              <div className={`h-1.5 w-1.5 rounded-full ${isReady ? 'bg-success' : 'bg-warning'}`} />
              <span className='font-mono text-xs text-muted-foreground'>{isReady ? 'Connected' : 'Connecting...'}</span>
            </div>
            {portalUrl && (
              <a
                href={portalUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='font-mono text-xs text-muted-foreground hover:text-foreground hover:underline'
              >
                {hostname}
              </a>
            )}
            <div className='flex gap-0.5'>
              <Button type='button' variant='ghost' size='icon' onClick={onRefresh} className='h-6 w-6'>
                <RefreshCw className='h-3 w-3' />
              </Button>
              {enableFullscreen && (
                <Button type='button' variant='ghost' size='icon' onClick={toggleFullscreen} className='h-6 w-6'>
                  <Maximize2 className='h-3 w-3' />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
