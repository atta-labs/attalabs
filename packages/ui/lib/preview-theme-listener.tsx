'use client'

import { useEffect } from 'react'
import type { ThemeData } from './preview-theme-utils'
import { applyColorSchemeToDOM, applyThemeToDOM } from './preview-theme-utils'

interface PreviewThemeMessage {
  type: 'PREVIEW_THEME'
  theme: ThemeData
  colorScheme: 'dark' | 'light'
}

interface PreviewColorSchemeMessage {
  type: 'PREVIEW_COLOR_SCHEME'
  colorScheme: 'dark' | 'light'
}

interface PreviewLibraryMessage {
  type: 'PREVIEW_LIBRARY'
  library: string
}

type PreviewMessage = PreviewThemeMessage | PreviewColorSchemeMessage | PreviewLibraryMessage

function isPreviewMessage(data: unknown): data is PreviewMessage {
  if (!data || typeof data !== 'object') return false
  const msg = data as { type?: string }
  return msg.type === 'PREVIEW_THEME' || msg.type === 'PREVIEW_COLOR_SCHEME' || msg.type === 'PREVIEW_LIBRARY'
}

/**
 * Check if we're in preview mode (URL has ?preview=true).
 * Used to enable postMessage listening in iframe context.
 */
export function isPreviewMode(): boolean {
  if (typeof window === 'undefined') return false
  const urlParams = new URLSearchParams(window.location.search)
  return urlParams.get('preview') === 'true'
}

/**
 * Listens for postMessage events from admin iframe parent
 * to apply theme previews in real-time.
 *
 * Only active when the page is loaded with ?preview=true.
 * Sends PREVIEW_READY to parent on mount.
 *
 * Does NOT use next-themes or localStorage — directly manipulates the DOM.
 */
export function PreviewThemeListener({ onLibraryChange }: { onLibraryChange?: (library: string) => void } = {}) {
  useEffect(() => {
    if (!isPreviewMode()) return

    let currentTheme: ThemeData | null = null

    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!isPreviewMessage(data)) return

      if (data.type === 'PREVIEW_THEME') {
        currentTheme = data.theme
        applyColorSchemeToDOM(data.colorScheme)
        applyThemeToDOM(data.theme, data.colorScheme)
      } else if (data.type === 'PREVIEW_COLOR_SCHEME') {
        applyColorSchemeToDOM(data.colorScheme)
        if (currentTheme) {
          applyThemeToDOM(currentTheme, data.colorScheme)
        }
      } else if (data.type === 'PREVIEW_LIBRARY') {
        onLibraryChange?.(data.library)
      }
    }

    window.addEventListener('message', handleMessage)

    // Signal to parent that preview mode is ready
    const sendReady = () => {
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'PREVIEW_READY' }, '*')
      }
    }

    sendReady()
    const timer = setTimeout(sendReady, 100)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  return null
}
