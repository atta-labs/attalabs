'use client'

import type { CMSTheme } from '@atta/cms'
import { Button, useToastContext } from '@atta/ui/basic/components'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@atta/ui/components/dialog'
import { Copy, Download, Pencil } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import type { ThemeData } from '@/components/theme/utils'
import { FontPicker } from '@/components/portal/font-picker'
import { usePortalPreview } from '@/hooks/use-portal-preview'
import { PortalPreviewFrame } from '@/components/portal/portal-preview-frame'
import { exportShadcnCss } from '@/lib/export-shadcn-css'
import { setActiveThemeAction } from '../actions'
import { CreateThemeDialog } from './create-theme-dialog'
import { FourSquareSwatch } from './four-square-swatch'
import { PROJECT_CONFIG } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'

type ColorScheme = 'dark' | 'light'

function extractColor(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'value' in value) return (value as { value: string }).value
  return undefined
}

function hasColors(scheme: Record<string, unknown> | undefined): boolean {
  if (!scheme) return false
  return !!(scheme.primary || scheme.background)
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

interface ThemesBrowseClientProps {
  project: ProjectKey
  themes: CMSTheme[]
  currentThemeId: string | null
  currentColorScheme: ColorScheme
}

export function ThemesBrowseClient({ project, themes, currentThemeId, currentColorScheme }: ThemesBrowseClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId ?? themes[0]?._id ?? null)
  const [schemeByTheme, setSchemeByTheme] = useState<Record<string, ColorScheme>>(() => {
    const initial: Record<string, ColorScheme> = {}
    if (currentThemeId) initial[currentThemeId] = currentColorScheme
    return initial
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const { successToast, errorToast } = useToastContext()
  const [selectedFontSans, setSelectedFontSans] = useState<string | undefined>(undefined)
  const [createOpen, setCreateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null)

  useEffect(() => {
    setHeaderSlot(document.getElementById('admin-header-slot'))
  }, [])

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null
  const selectedScheme = selectedId ? (schemeByTheme[selectedId] ?? 'dark') : 'dark'

  const themeSchemes = useMemo(() => {
    const map: Record<string, { hasDark: boolean; hasLight: boolean }> = {}
    for (const theme of themes) {
      map[theme._id] = {
        hasDark: hasColors(theme.dark as Record<string, unknown> | undefined),
        hasLight: hasColors(theme.light as Record<string, unknown> | undefined)
      }
    }
    return map
  }, [themes])

  const exportedCss = useMemo(() => {
    if (!exportOpen || !selectedTheme) return ''
    return exportShadcnCss({
      name: selectedTheme.name ?? '',
      light: (selectedTheme.light ?? {}) as Record<string, string>,
      dark: (selectedTheme.dark ?? {}) as Record<string, string>,
      typography: selectedTheme.typography ?? {},
      spacing: selectedTheme.spacing ?? {},
      shadows: (selectedTheme.shadows ?? {}) as Record<string, string>
    })
  }, [exportOpen, selectedTheme])

  async function handleCopy() {
    if (!exportedCss) return
    try {
      await navigator.clipboard.writeText(exportedCss)
      setCopyState('copied')
      setTimeout(() => setCopyState('idle'), 1500)
    } catch {
      setCopyState('idle')
    }
  }

  const buildMessage = useCallback(() => {
    if (!selectedTheme) return null
    return buildThemeMessage(selectedTheme, selectedScheme, selectedFontSans)
  }, [selectedTheme, selectedScheme, selectedFontSans])

  const { iframeRef, iframeSrc, iframeKey, isReady, sendMessage, refresh, isFullscreen, toggleFullscreen } =
    usePortalPreview({
      portalUrl: PROJECT_CONFIG[project].previewUrl,
      iframeSrc: `${PROJECT_CONFIG[project].previewUrl}?preview=true`,
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
      try {
        await setActiveThemeAction(project, selectedId, selectedScheme)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        successToast('Theme activated', `${selectedTheme?.name ?? 'Theme'} is now the active theme.`)
      } catch {
        errorToast('Activation failed', 'Could not set the active theme. Try again.')
      }
    })
  }

  const hasChanges =
    selectedId !== currentThemeId || selectedScheme !== currentColorScheme || selectedFontSans !== undefined

  const headerContent = (
    <>
      <FontPicker value={selectedFontSans} onChange={handleFontChange} />
      <span className='text-border'>|</span>
      {selectedId && (
        <Button variant='outline' size='sm' asChild className='font-mono text-[10px]'>
          <Link href={`/${project}/themes/${selectedId}/edit`}>Edit Theme</Link>
        </Button>
      )}
      <Button
        variant='outline'
        size='sm'
        onClick={() => setExportOpen(true)}
        disabled={!selectedTheme}
        className='font-mono text-[10px]'
      >
        <Download className='h-3.5 w-3.5' />
        Export
      </Button>
      <Button size='sm' onClick={handlePublish} disabled={!hasChanges || isPending} className='font-mono text-[10px]'>
        {isPending ? 'Saving...' : saved ? 'Saved!' : 'Set Active Theme'}
      </Button>
      <Button variant='outline' size='sm' onClick={() => setCreateOpen(true)} className='font-mono text-[10px]'>
        Create Theme
      </Button>
    </>
  )

  return (
    <>
      {headerSlot && createPortal(headerContent, headerSlot)}
      <CreateThemeDialog open={createOpen} onOpenChange={setCreateOpen} project={project} />
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className='w-[min(44rem,calc(100vw-2rem))]'>
          <DialogHeader>
            <DialogTitle>Export theme</DialogTitle>
            <DialogDescription>shadcn-style CSS — paste into your project&apos;s globals.css.</DialogDescription>
          </DialogHeader>
          <pre className='max-h-[60vh] overflow-auto rounded-md border border-input bg-background/60 p-3 font-mono text-[11px] leading-relaxed text-foreground/90'>
            {exportedCss}
          </pre>
          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => setExportOpen(false)}>
              Close
            </Button>
            <Button type='button' onClick={handleCopy} disabled={!exportedCss}>
              <Copy className='h-3.5 w-3.5' />
              {copyState === 'copied' ? 'Copied!' : 'Copy to clipboard'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className='flex h-full gap-0'>
        <div className='flex w-72 shrink-0 flex-col border-r border-border'>
          <div className='border-b border-border px-4 py-3'>
            <h2 className='font-serif text-lg tracking-tight'>Themes</h2>
            <p className='font-mono text-[10px] text-muted-foreground'>{themes.length} available</p>
          </div>

          <div className='flex-1 overflow-y-auto'>
            {themes.map((theme) => {
              const isSelected = selectedId === theme._id
              const isApplied = theme._id === currentThemeId
              const thisScheme = schemeByTheme[theme._id] ?? 'dark'
              const schemeData = thisScheme === 'dark' ? theme.dark : theme.light
              const swatchColors = {
                primary: extractColor((schemeData as Record<string, unknown> | undefined)?.primary),
                secondary: extractColor((schemeData as Record<string, unknown> | undefined)?.secondary),
                accent: extractColor((schemeData as Record<string, unknown> | undefined)?.accent),
                background: extractColor((schemeData as Record<string, unknown> | undefined)?.background)
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
                  <div className='flex min-w-0 flex-1 items-center gap-2'>
                    <span
                      className={`line-clamp-2 text-sm font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}
                    >
                      {theme.name}
                    </span>
                    {isApplied && <div className='h-1.5 w-1.5 shrink-0 rounded-full bg-accent' />}
                  </div>
                  {hasBoth && (
                    <div
                      className='flex shrink-0 flex-col gap-0.5'
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
                  <Link
                    href={`/${project}/themes/${theme._id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    aria-label={`Edit ${theme.name}`}
                    className='shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground'
                  >
                    <Pencil className='h-3.5 w-3.5' />
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        <PortalPreviewFrame
          isReady={isReady}
          portalUrl={PROJECT_CONFIG[project].previewUrl}
          onRefresh={refresh}
          title='Preview'
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        >
          <iframe ref={iframeRef} key={iframeKey} src={iframeSrc} className='h-full w-full border-0' title='Preview' />
        </PortalPreviewFrame>
      </div>
    </>
  )
}
