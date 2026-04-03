'use client'

import type { CMSTheme } from '@herald/cms'
import { useCallback, useEffect, useState, useTransition } from 'react'
import type { ThemeData } from '@/components/theme/utils'
import { usePortalPreview } from '@/hooks/usePortalPreview'

type ThemeEntry = CMSTheme

type ColorScheme = 'dark' | 'light'

function extractColor(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value) return (value as { value: string }).value
  return undefined
}

function FourSquareSwatch({ colors, size = 'md' }: { colors: Record<string, string | undefined>; size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  return (
    <div className={`grid grid-cols-2 gap-0.5 overflow-hidden rounded ${s}`}>
      <div className='rounded-sm' style={{ backgroundColor: colors.primary ?? '#888' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.secondary ?? '#666' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.accent ?? '#aaa' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.background ?? '#333' }} />
    </div>
  )
}

function buildThemeMessage(theme: ThemeEntry, colorScheme: ColorScheme) {
  return {
    type: 'PREVIEW_THEME' as const,
    theme: {
      dark: theme.dark,
      light: theme.light,
      typography: theme.typography,
      spacing: theme.spacing,
      shadows: theme.shadows
    } as ThemeData,
    colorScheme
  }
}

export function ThemeBrowser({
  themes,
  currentThemeId,
  currentColorScheme,
  username
}: {
  themes: ThemeEntry[]
  currentThemeId: string | null
  currentColorScheme: ColorScheme
  username: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId)
  const [selectedScheme, setSelectedScheme] = useState<ColorScheme>(currentColorScheme)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null

  const buildMessage = useCallback(() => {
    if (!selectedTheme) return null
    return buildThemeMessage(selectedTheme, selectedScheme)
  }, [selectedTheme, selectedScheme])

  const portalUrl = `/${username}`

  const { iframeRef, iframeSrc, iframeKey, isReady, sendMessage } = usePortalPreview({
    portalUrl,
    onReady: (send) => {
      const msg = buildMessage()
      if (msg) send(msg)
    }
  })

  // Send theme to iframe when selection changes
  useEffect(() => {
    if (isReady && selectedTheme) {
      sendMessage(buildThemeMessage(selectedTheme, selectedScheme))
    }
  }, [isReady, selectedTheme, selectedScheme, sendMessage])

  function handleSelect(themeId: string) {
    setSelectedId(themeId)
    setSaved(false)
  }

  function handleSchemeToggle() {
    setSelectedScheme((s) => (s === 'dark' ? 'light' : 'dark'))
  }

  function handlePublish() {
    if (!selectedId) return
    startTransition(async () => {
      const res = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ themeId: selectedId, colorScheme: selectedScheme })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const hasChanges = selectedId !== currentThemeId || selectedScheme !== currentColorScheme

  return (
    <div className='flex h-full gap-0'>
      {/* Sidebar — theme list */}
      <div className='flex w-72 flex-shrink-0 flex-col border-r border-border'>
        <div className='border-b border-border px-4 py-3'>
          <h2 className='font-display text-lg tracking-tight'>Themes</h2>
          <p className='font-mono text-[10px] text-muted'>{themes.length} themes available</p>
        </div>

        <div className='flex-1 overflow-y-auto'>
          {themes.map((theme) => {
            const isSelected = selectedId === theme._id
            const scheme = selectedScheme === 'dark' ? theme.dark : theme.light
            const swatchColors = {
              primary: extractColor(scheme?.primary),
              secondary: extractColor(scheme?.secondary),
              accent: extractColor(scheme?.accent),
              background: extractColor(scheme?.background)
            }

            return (
              <button
                key={theme._id}
                type='button'
                onClick={() => handleSelect(theme._id)}
                className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-foreground/5'
                }`}
              >
                <FourSquareSwatch colors={swatchColors} />
                <div className='min-w-0 flex-1'>
                  <p className={`truncate font-mono text-xs ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                    {theme.name}
                  </p>
                </div>
                {theme._id === currentThemeId && <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent' />}
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className='border-t border-border p-4'>
          {/* Scheme toggle */}
          <button
            type='button'
            onClick={handleSchemeToggle}
            className='mb-3 flex w-full items-center justify-between rounded border border-border px-3 py-2 font-mono text-xs transition-colors hover:bg-foreground/5'
          >
            <span>Color Scheme</span>
            <span className='text-muted'>{selectedScheme === 'dark' ? '● Dark' : '○ Light'}</span>
          </button>

          {/* Publish */}
          <button
            type='button'
            onClick={handlePublish}
            disabled={!hasChanges || isPending}
            className='w-full rounded bg-accent px-4 py-2 font-mono text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-30'
          >
            {isPending ? 'Saving...' : saved ? 'Saved!' : 'Publish Theme'}
          </button>
        </div>
      </div>

      {/* Preview — iframe */}
      <div className='flex flex-1 flex-col'>
        {/* Status bar */}
        <div className='flex items-center justify-between border-b border-border px-4 py-2'>
          <div className='flex items-center gap-2'>
            <div className={`h-2 w-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className='font-mono text-[10px] text-muted'>{isReady ? 'Preview connected' : 'Connecting...'}</span>
          </div>
          {selectedTheme && (
            <span className='font-mono text-[10px] text-muted'>
              {selectedTheme.name} · {selectedScheme}
            </span>
          )}
        </div>

        {/* iframe */}
        <div className='flex-1 bg-black/50'>
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={iframeSrc}
            className='h-full w-full border-0'
            title='Envoy Preview'
          />
        </div>
      </div>
    </div>
  )
}
