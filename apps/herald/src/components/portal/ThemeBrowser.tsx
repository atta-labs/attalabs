'use client'

import type { CMSTheme } from '@herald/cms'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import type { ThemeData } from '@/components/theme/utils'
import { usePortalPreview } from '@/hooks/usePortalPreview'

type ColorScheme = 'dark' | 'light'

function extractColor(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value) return (value as { value: string }).value
  return undefined
}

function hasColors(scheme: Record<string, unknown> | undefined): boolean {
  if (!scheme) return false
  return !!(scheme.primary || scheme.background)
}

function FourSquareSwatch({ colors }: { colors: Record<string, string | undefined> }) {
  return (
    <div className='grid h-8 w-8 grid-cols-2 gap-0.5 overflow-hidden rounded'>
      <div className='rounded-sm' style={{ backgroundColor: colors.primary ?? '#888' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.secondary ?? '#666' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.accent ?? '#aaa' }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.background ?? '#333' }} />
    </div>
  )
}

function buildThemeMessage(theme: CMSTheme, colorScheme: ColorScheme) {
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
  themes: CMSTheme[]
  currentThemeId: string | null
  currentColorScheme: ColorScheme
  username: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId)
  // Track color scheme per theme
  const [schemeByTheme, setSchemeByTheme] = useState<Record<string, ColorScheme>>(() => {
    const initial: Record<string, ColorScheme> = {}
    if (currentThemeId) initial[currentThemeId] = currentColorScheme
    return initial
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null
  const selectedScheme = selectedId ? (schemeByTheme[selectedId] ?? 'dark') : 'dark'

  // Determine which themes have both schemes
  const themeSchemes = useMemo(() => {
    const map: Record<string, { hasDark: boolean; hasLight: boolean }> = {}
    for (const theme of themes) {
      map[theme._id] = {
        hasDark: hasColors(theme.dark),
        hasLight: hasColors(theme.light)
      }
    }
    return map
  }, [themes])

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

  useEffect(() => {
    if (isReady && selectedTheme) {
      sendMessage(buildThemeMessage(selectedTheme, selectedScheme))
    }
  }, [isReady, selectedTheme, selectedScheme, sendMessage])

  function handleSelect(themeId: string) {
    setSelectedId(themeId)
    setSaved(false)
  }

  function handleSchemeChange(themeId: string, scheme: ColorScheme) {
    setSchemeByTheme((prev) => ({ ...prev, [themeId]: scheme }))
    setSaved(false)
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
        <div className='flex items-center justify-between border-b border-border px-4 py-3'>
          <div>
            <h2 className='font-display text-lg tracking-tight'>Themes</h2>
            <p className='font-mono text-[10px] text-muted'>{themes.length} available</p>
          </div>
          {/* Publish button */}
          <button
            type='button'
            onClick={handlePublish}
            disabled={!hasChanges || isPending}
            className='rounded bg-accent px-3 py-1.5 font-mono text-[10px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-30'
          >
            {isPending ? 'Saving...' : saved ? 'Saved!' : 'Publish'}
          </button>
        </div>

        <div className='flex-1 overflow-y-auto'>
          {themes.map((theme) => {
            const isSelected = selectedId === theme._id
            const isApplied = theme._id === currentThemeId
            const thisScheme = schemeByTheme[theme._id] ?? 'dark'
            const schemeData = thisScheme === 'dark' ? theme.dark : theme.light
            const swatchColors = {
              primary: extractColor(schemeData?.primary),
              secondary: extractColor(schemeData?.secondary),
              accent: extractColor(schemeData?.accent),
              background: extractColor(schemeData?.background)
            }
            const schemes = themeSchemes[theme._id]
            const hasBoth = schemes?.hasDark && schemes?.hasLight

            return (
              <div
                key={theme._id}
                className={`border-b border-border/50 transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-foreground/5'
                }`}
              >
                <button
                  type='button'
                  onClick={() => handleSelect(theme._id)}
                  className='flex w-full items-center gap-3 px-4 py-3 text-left'
                >
                  <FourSquareSwatch colors={swatchColors} />
                  <div className='min-w-0 flex-1'>
                    <p
                      className={`truncate font-mono text-xs ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}
                    >
                      {theme.name}
                    </p>
                  </div>
                  {isApplied && <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent' />}
                </button>

                {/* Dark/Light toggle — inline on each card */}
                {isSelected && hasBoth && (
                  <div className='flex gap-1 px-4 pb-3'>
                    <button
                      type='button'
                      onClick={() => handleSchemeChange(theme._id, 'dark')}
                      className={`rounded px-2 py-1 font-mono text-[10px] transition-colors ${
                        thisScheme === 'dark' ? 'bg-foreground/15 text-foreground' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      ● Dark
                    </button>
                    <button
                      type='button'
                      onClick={() => handleSchemeChange(theme._id, 'light')}
                      className={`rounded px-2 py-1 font-mono text-[10px] transition-colors ${
                        thisScheme === 'light' ? 'bg-foreground/15 text-foreground' : 'text-muted hover:text-foreground'
                      }`}
                    >
                      ○ Light
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview — iframe */}
      <div className='flex flex-1 flex-col'>
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
