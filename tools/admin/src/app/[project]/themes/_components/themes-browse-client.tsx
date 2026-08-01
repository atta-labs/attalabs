'use client'

import type { CMSLibrary, CMSTheme } from '@atta/cms'
import { isThemeCompatible, themesForLibrary } from '@atta/cms'
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToastContext
} from '@atta/ui/components'
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
import { setActiveLibraryAction, setActiveThemeAction, setThemeFontsAction } from '../actions'
import { CreateThemeDialog } from './create-theme-dialog'
import { FourSquareSwatch } from './four-square-swatch'
import { PROJECT_CONFIG } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'

type ColorScheme = 'dark' | 'light'
type FontRole = 'fontSans' | 'fontSerif' | 'fontMono'

const FONT_ROLES: { role: FontRole; label: string }[] = [
  { role: 'fontSans', label: 'Sans' },
  { role: 'fontSerif', label: 'Serif' },
  { role: 'fontMono', label: 'Mono' }
]

// Mirrors actions.ts's FONT_STACK_SUFFIX — kept separate because a 'use server'
// file may only export async functions, so the two can't share one constant.
const FONT_STACK_SUFFIX: Record<FontRole, string> = {
  fontSans: 'sans-serif',
  fontSerif: 'serif',
  fontMono: 'monospace'
}

function composeFontStack(role: FontRole, name: string): string {
  return `${name}, ${FONT_STACK_SUFFIX[role]}`
}

// Referentially stable fallback — a fresh `{}` literal here would change identity
// every render and invalidate buildMessage/the preview-send effect that depend on it.
const EMPTY_FONTS: Partial<Record<FontRole, string>> = {}

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

function buildThemeMessage(
  theme: CMSTheme,
  colorScheme: ColorScheme,
  fontOverrides: Partial<Record<FontRole, string>>
) {
  const composedOverrides: Partial<Record<FontRole, string>> = {}
  for (const role of Object.keys(fontOverrides) as FontRole[]) {
    const name = fontOverrides[role]
    if (name) composedOverrides[role] = composeFontStack(role, name)
  }
  const typography = { ...theme.typography, ...composedOverrides }
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
  libraries: CMSLibrary[]
  currentLibraryId: string | null
}

export function ThemesBrowseClient({
  project,
  themes,
  currentThemeId,
  currentColorScheme,
  libraries,
  currentLibraryId
}: ThemesBrowseClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId ?? themes[0]?._id ?? null)
  const [schemeByTheme, setSchemeByTheme] = useState<Record<string, ColorScheme>>(() => {
    const initial: Record<string, ColorScheme> = {}
    if (currentThemeId) initial[currentThemeId] = currentColorScheme
    return initial
  })
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(currentLibraryId)
  const [isLibraryPending, startLibraryTransition] = useTransition()
  const [librarySaved, setLibrarySaved] = useState(false)
  const { successToast, errorToast } = useToastContext()
  const [fontsByTheme, setFontsByTheme] = useState<Record<string, Partial<Record<FontRole, string>>>>({})
  const [persistedFontsByTheme, setPersistedFontsByTheme] = useState<Record<string, Partial<Record<FontRole, string>>>>(
    {}
  )
  const [createOpen, setCreateOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null)

  useEffect(() => {
    setHeaderSlot(document.getElementById('admin-header-slot'))
  }, [])

  const selectedTheme = themes.find((t) => t._id === selectedId) ?? null
  const selectedScheme = selectedId ? (schemeByTheme[selectedId] ?? 'dark') : 'dark'
  const selectedFonts: Partial<Record<FontRole, string>> = selectedId
    ? (fontsByTheme[selectedId] ?? EMPTY_FONTS)
    : EMPTY_FONTS
  const persistedFonts: Partial<Record<FontRole, string>> = selectedId
    ? (persistedFontsByTheme[selectedId] ?? EMPTY_FONTS)
    : EMPTY_FONTS
  const fontsPending = FONT_ROLES.some(({ role }) => {
    const picked = selectedFonts[role]
    return picked !== undefined && picked !== persistedFonts[role]
  })

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
    return buildThemeMessage(selectedTheme, selectedScheme, selectedFonts)
  }, [selectedTheme, selectedScheme, selectedFonts])

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
      sendMessage(buildThemeMessage(selectedTheme, selectedScheme, selectedFonts))
    }
  }, [isReady, selectedTheme, selectedScheme, selectedFonts, sendMessage])

  function handleSelect(themeId: string) {
    setSelectedId(themeId)
    setSaved(false)
  }

  function handleSchemeChange(themeId: string, scheme: ColorScheme) {
    setSchemeByTheme((prev) => ({ ...prev, [themeId]: scheme }))
    setSaved(false)
  }

  function handleFontChange(role: FontRole, font: string) {
    if (!selectedId) return
    const nextFonts = { ...selectedFonts, [role]: font }
    setFontsByTheme((prev) => ({ ...prev, [selectedId]: nextFonts }))
    setSaved(false)
    if (isReady && selectedTheme) {
      sendMessage(buildThemeMessage(selectedTheme, selectedScheme, nextFonts))
    }
  }

  function handlePublish() {
    if (!selectedId) return
    startTransition(async () => {
      try {
        const result = await setActiveThemeAction(project, selectedId, selectedScheme)
        if (!result.ok) {
          errorToast('Activation failed', result.message, 12000)
          return
        }
        if (fontsPending) {
          const fontResult = await setThemeFontsAction(project, selectedId, selectedFonts)
          if (!fontResult.ok) {
            errorToast('Font save failed', fontResult.message, 12000)
            return
          }
          // Track what was persisted rather than clearing the local pick: the
          // picker/preview keep reading `selectedFonts` unconditionally, so they
          // never fall back to the server's now-stale `typography` prop and never
          // revert. `hasChanges` goes false because `fontsPending` compares against
          // this snapshot, not because the picked value disappears.
          setPersistedFontsByTheme((prev) => ({ ...prev, [selectedId]: selectedFonts }))
        }
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        successToast('Theme activated', `${selectedTheme?.name ?? 'Theme'} is now the active theme.`)
      } catch {
        errorToast('Activation failed', 'Could not reach the admin server. Try again.')
      }
    })
  }

  const hasChanges = selectedId !== currentThemeId || selectedScheme !== currentColorScheme || fontsPending

  // Strict PARTITION (D-131): retro/brutal get only `neobrutalist` themes, the soft
  // libraries only the rest — not a one-way filter. `selectedLibraryId` is a document
  // id (`library-retro`); the helper accepts both that and the bare id.
  const availableThemes = useMemo(() => themesForLibrary(themes, selectedLibraryId), [themes, selectedLibraryId])

  function handleLibrarySelect(libraryId: string) {
    // The partition can be empty — flagging themes is a CMS decision, so unflagging the
    // last one leaves a library with nothing to pair with. Refuse the switch rather than
    // completing it and silently leaving an incompatible theme selected AND publishable.
    const compatible = themesForLibrary(themes, libraryId)
    const first = compatible[0]
    if (!first) {
      errorToast('No compatible themes', 'No theme is currently marked compatible with that library.')
      return
    }

    setSelectedLibraryId(libraryId)
    setLibrarySaved(false)

    // Filtering the list stops NEW bad pairings; an already-selected theme would
    // otherwise survive the switch.
    if (
      !isThemeCompatible(
        themes.find((t) => t._id === selectedId),
        libraryId
      )
    ) {
      setSelectedId(first._id)
    }
  }

  function handlePublishLibrary() {
    if (!selectedLibraryId) return
    startLibraryTransition(async () => {
      try {
        const result = await setActiveLibraryAction(project, selectedLibraryId)
        if (!result.ok) {
          errorToast('Activation failed', result.message, 12000)
          return
        }
        setLibrarySaved(true)
        setTimeout(() => setLibrarySaved(false), 2000)
        successToast(
          'Library activated',
          `${libraries.find((l) => l._id === selectedLibraryId)?.name ?? 'Library'} is now the active library.`
        )
      } catch {
        errorToast('Activation failed', 'Could not reach the admin server. Try again.')
      }
    })
  }

  const hasLibraryChanges = selectedLibraryId !== currentLibraryId

  const headerContent = (
    <>
      {FONT_ROLES.map(({ role, label }) => (
        <div key={role} className='flex items-center gap-1.5'>
          <span className='font-mono text-[9px] uppercase tracking-widest text-muted-foreground'>{label}</span>
          <FontPicker
            value={selectedFonts[role] ?? selectedTheme?.typography?.[role]}
            onChange={(font) => handleFontChange(role, font)}
          />
        </div>
      ))}
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
      <span className='text-border'>|</span>
      <Select value={selectedLibraryId ?? undefined} onValueChange={handleLibrarySelect}>
        <SelectTrigger className='h-8 w-36 font-mono text-[10px]'>
          <SelectValue placeholder='Library' />
        </SelectTrigger>
        <SelectContent>
          {libraries.map((library) => (
            <SelectItem key={library._id} value={library._id}>
              {library.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant='outline'
        size='sm'
        onClick={handlePublishLibrary}
        disabled={!hasLibraryChanges || isLibraryPending}
        className='font-mono text-[10px]'
      >
        {isLibraryPending ? 'Saving...' : librarySaved ? 'Saved!' : 'Set Active Library'}
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
            {availableThemes.map((theme) => {
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
