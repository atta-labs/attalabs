'use client'

import type { CMSLibrary, CMSTheme } from '@atta/cms'
import { Button } from '@atta/ui'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import type { ThemeData } from '@atta/ui/lib/preview-theme-utils'
import { usePortalPreview } from '@/hooks/usePortalPreview'
import { PortalPreviewFrame } from './PortalPreviewFrame'
import { PreviewToolbar } from './PreviewToolbar'

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

function buildThemeMessage(theme: CMSTheme, colorScheme: ColorScheme, fontOverride?: string) {
  const typography = fontOverride ? { ...theme.typography, fontSans: fontOverride } : theme.typography
  return {
    type: 'PREVIEW_THEME' as const,
    theme: {
      dark: theme.dark,
      light: theme.light,
      typography,
      spacing: theme.spacing,
      shadows: theme.shadows
    } as ThemeData,
    colorScheme
  }
}

export function ThemeBrowser({
  themes,
  libraries,
  currentThemeId,
  currentColorScheme,
  currentLibrary,
  currentFontSans,
  username
}: {
  themes: CMSTheme[]
  libraries: CMSLibrary[]
  currentThemeId: string | null
  currentColorScheme: ColorScheme
  currentLibrary: string
  currentFontSans: string | null
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
  const [selectedFontSans, setSelectedFontSans] = useState<string | undefined>(currentFontSans ?? undefined)

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
    return buildThemeMessage(selectedTheme, selectedScheme, selectedFontSans)
  }, [selectedTheme, selectedScheme, selectedFontSans])

  const portalUrl = `/${username}`

  const { iframeRef, iframeSrc, iframeKey, isReady, sendMessage, refresh } = usePortalPreview({
    portalUrl,
    onReady: (send) => {
      const msg = buildMessage()
      if (msg) send(msg)
    }
  })

  useEffect(() => {
    if (isReady && selectedTheme) {
      sendMessage(buildThemeMessage(selectedTheme, selectedScheme, selectedFontSans))
    }
  }, [isReady, selectedTheme, selectedScheme, selectedFontSans, sendMessage])

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

  function handleFontChange(font: string) {
    setSelectedFontSans(font)
    setSaved(false)
    if (isReady && selectedTheme) {
      sendMessage(buildThemeMessage(selectedTheme, selectedScheme, font))
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
          library: selectedLibrary,
          fontSans: selectedFontSans ?? null
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  const hasChanges =
    selectedId !== currentThemeId ||
    selectedScheme !== currentColorScheme ||
    selectedLibrary !== currentLibrary ||
    selectedFontSans !== (currentFontSans ?? undefined)

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
              <div
                key={theme._id}
                role='button'
                tabIndex={0}
                onClick={() => handleSelect(theme._id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleSelect(theme._id)
                  }
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-b border-border/50 px-4 py-3 text-left transition-colors ${
                  isSelected ? 'bg-primary/10' : 'hover:bg-foreground/5'
                }`}
              >
                <FourSquareSwatch colors={swatchColors} />
                <div className='min-w-0 flex-1'>
                  <p
                    className={`line-clamp-2 text-sm font-medium leading-snug ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}
                  >
                    {theme.name}
                  </p>
                  {isApplied && <div className='mt-1 h-1.5 w-1.5 rounded-full bg-accent' />}
                </div>
                {hasBoth && (
                  <div
                    className='flex flex-shrink-0 flex-col gap-0.5'
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    {(['dark', 'light'] as const).map((s) => (
                      <Button
                        key={s}
                        variant='ghost'
                        size='sm'
                        onClick={() => handleSchemeChange(theme._id, s)}
                        className={`h-5 px-1.5 font-mono text-[9px] uppercase tracking-widest ${
                          thisScheme === s ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview — iframe with toolbar */}
      <PortalPreviewFrame
        isReady={isReady}
        portalUrl={`/${username}`}
        onRefresh={refresh}
        title='Envoy Preview'
        toolbar={
          <PreviewToolbar
            selectedLibrary={selectedLibrary}
            libraries={libraries}
            onLibraryChange={handleLibrarySelect}
            fontSans={selectedFontSans}
            onFontChange={handleFontChange}
            hasChanges={hasChanges}
            isPending={isPending}
            saved={saved}
            onPublish={handlePublish}
          />
        }
      >
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={iframeSrc}
          className='h-full w-full border-0'
          title='Envoy Preview'
        />
      </PortalPreviewFrame>
    </div>
  )
}
