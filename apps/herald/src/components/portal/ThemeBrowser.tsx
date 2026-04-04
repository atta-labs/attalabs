'use client'

import type { CMSTheme } from '@herald/cms'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import type { ThemeData } from '@/components/theme/utils'
import { usePortalPreview } from '@/hooks/usePortalPreview'

type ColorScheme = 'dark' | 'light'

const LIBRARIES = [
  {
    id: 'basic',
    name: 'Standard',
    style: 'shadow-sm rounded-lg border'
  },
  {
    id: 'retro',
    name: 'Retro',
    style: 'border-2 border-foreground shadow-md'
  },
  {
    id: 'animate',
    name: 'Animated',
    style: 'shadow-sm rounded-lg border'
  },
  {
    id: 'brutal',
    name: 'Brutal',
    style: 'border-2 border-border shadow-[3px_3px_0px_0px_var(--border)]'
  }
]

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
  currentLibrary,
  username
}: {
  themes: CMSTheme[]
  currentThemeId: string | null
  currentColorScheme: ColorScheme
  currentLibrary: string
  username: string
}) {
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId)
  const [schemeByTheme, setSchemeByTheme] = useState<Record<string, ColorScheme>>(() => {
    const initial: Record<string, ColorScheme> = {}
    if (currentThemeId) initial[currentThemeId] = currentColorScheme
    return initial
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [selectedLibrary, setSelectedLibrary] = useState(currentLibrary)

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null
  const selectedScheme = selectedId ? (schemeByTheme[selectedId] ?? 'dark') : 'dark'

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

  function handleLibrarySelect(libraryId: string) {
    setSelectedLibrary(libraryId)
    setSaved(false)
    if (isReady) {
      sendMessage({ type: 'PREVIEW_LIBRARY', library: libraryId })
    }
  }

  function handlePublish() {
    if (!selectedId) return
    startTransition(async () => {
      const res = await fetch('/api/admin/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId: selectedId,
          colorScheme: selectedScheme,
          library: selectedLibrary
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const hasChanges =
    selectedId !== currentThemeId || selectedScheme !== currentColorScheme || selectedLibrary !== currentLibrary

  return (
    <div className='flex h-full gap-0'>
      {/* Sidebar — theme list */}
      <div className='flex w-72 flex-shrink-0 flex-col border-r border-border'>
        <div className='border-b border-border px-4 py-3'>
          <h2 className='font-display text-lg tracking-tight'>Themes</h2>
          <p className='font-mono text-[10px] text-muted-foreground'>{themes.length} available</p>
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
              <button
                key={theme._id}
                type='button'
                onClick={() => handleSelect(theme._id)}
                className={`flex w-full items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-foreground/5'
                }`}
              >
                <FourSquareSwatch colors={swatchColors} />
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                  <span
                    className={`line-clamp-2 text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}
                  >
                    {theme.name}
                  </span>
                  {isApplied && <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent' />}
                </div>
                {hasBoth && (
                  <div
                    role='radiogroup'
                    className='flex flex-shrink-0 flex-col gap-1'
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <label
                      className={`flex cursor-pointer items-center gap-1 text-xs ${
                        thisScheme === 'dark' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <input
                        type='radio'
                        name={`scheme-${theme._id}`}
                        checked={thisScheme === 'dark'}
                        onChange={() => handleSchemeChange(theme._id, 'dark')}
                        className='h-3 w-3 accent-primary'
                      />
                      Dark
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-1 text-xs ${
                        thisScheme === 'light' ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      <input
                        type='radio'
                        name={`scheme-${theme._id}`}
                        checked={thisScheme === 'light'}
                        onChange={() => handleSchemeChange(theme._id, 'light')}
                        className='h-3 w-3 accent-primary'
                      />
                      Light
                    </label>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Libraries — fixed bottom */}
        <div className='border-t border-border px-4 py-3'>
          <div className='mb-2'>
            <h2 className='font-display text-lg tracking-tight'>Libraries</h2>
            <p className='font-mono text-[10px] text-muted-foreground'>4 styles</p>
          </div>
          <div className='grid grid-cols-2 gap-2'>
            {LIBRARIES.map((lib) => {
              const isActive = selectedLibrary === lib.id
              return (
                <button
                  key={lib.id}
                  type='button'
                  onClick={() => handleLibrarySelect(lib.id)}
                  className={`px-3 py-2 text-left transition-all ${lib.style} ${
                    isActive ? 'ring-1 ring-accent bg-card' : 'bg-card/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <p className='font-mono text-[10px] font-medium'>{lib.name}</p>
                  {isActive && <div className='mt-1 h-0.5 w-5 bg-accent' />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Preview — iframe */}
      <div className='flex flex-1 flex-col'>
        <div className='flex items-center justify-between border-b border-border px-4 py-2'>
          <div className='flex items-center gap-2'>
            <div className={`h-2 w-2 rounded-full ${isReady ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className='font-mono text-[10px] text-muted-foreground'>
              {isReady ? 'Preview connected' : 'Connecting...'}
            </span>
          </div>
          <div className='flex items-center gap-3'>
            {selectedTheme && (
              <span className='font-mono text-[10px] text-muted-foreground'>
                {selectedTheme.name} · {selectedScheme}
              </span>
            )}
            <button
              type='button'
              onClick={handlePublish}
              disabled={!hasChanges || isPending}
              className='rounded bg-accent px-3 py-1.5 font-mono text-[10px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-30'
            >
              {isPending ? 'Saving...' : saved ? 'Saved!' : 'Publish'}
            </button>
          </div>
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
