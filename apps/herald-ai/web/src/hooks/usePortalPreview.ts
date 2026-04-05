'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SendMessageFn = (message: Record<string, unknown>) => void

interface UsePortalPreviewOptions {
  portalUrl: string
  iframeSrc?: string
  readyMessageType?: string
  targetOrigin?: string
  onReady?: (sendMessage: SendMessageFn) => void
}

/**
 * Hook for iframe preview communication with the Envoy page.
 * Handles ref, ready state, postMessage, refresh, and fullscreen.
 *
 * Adapted from Summon's usePortalPreview.
 */
export function usePortalPreview({
  portalUrl,
  iframeSrc: customIframeSrc,
  readyMessageType = 'PREVIEW_READY',
  targetOrigin = '*',
  onReady
}: UsePortalPreviewOptions) {
  const [isReady, setIsReady] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const iframeSrc = customIframeSrc ?? `${portalUrl}?preview=true`

  const sendMessage: SendMessageFn = useCallback(
    (message) => {
      iframeRef.current?.contentWindow?.postMessage(message, targetOrigin)
    },
    [targetOrigin]
  )

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === readyMessageType) {
        setIsReady(true)
        if (onReadyRef.current) {
          const sendToSource: SendMessageFn = (message) => {
            ;(event.source as Window)?.postMessage(message, targetOrigin)
          }
          onReadyRef.current(sendToSource)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [readyMessageType, targetOrigin])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  const refresh = useCallback(() => {
    setIsReady(false)
    setIframeKey((k) => k + 1)
  }, [])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev)
  }, [])

  return {
    iframeRef,
    iframeSrc,
    iframeKey,
    isReady,
    isFullscreen,
    sendMessage,
    refresh,
    toggleFullscreen
  }
}
