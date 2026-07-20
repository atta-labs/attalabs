'use client'

import type { CMSLibrary, CMSTheme } from '@atta/cms'
import { isThemeCompatible, themesForLibrary } from '@atta/cms'
import { Button, Card, useToastContext } from '@atta/ui/components'
import { useCallback, useMemo, useRef, useState } from 'react'
import { EnvoyPreview } from './EnvoyPreview'
import { FontPicker } from './FontPicker'
import { LibraryDropdown } from './LibraryDropdown'

type ColorScheme = 'dark' | 'light'
type SendFn = (message: Record<string, unknown>) => void

function extractColor(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value) return (value as { value: string }).value
  return undefined
}

function SwatchTile({ color }: { color: string | undefined }) {
  if (color) return <div className='rounded-sm' style={{ backgroundColor: color }} />
  return <div className='rounded-sm bg-muted' />
}

function ThemeSwatch({ theme, scheme }: { theme: CMSTheme; scheme: ColorScheme }) {
  const schemeData = scheme === 'dark' ? theme.dark : theme.light
  return (
    <div className='grid h-6 w-6 grid-cols-2 gap-px overflow-hidden rounded'>
      <SwatchTile color={extractColor(schemeData?.primary)} />
      <SwatchTile color={extractColor(schemeData?.accent)} />
      <SwatchTile color={extractColor(schemeData?.secondary)} />
      <SwatchTile color={extractColor(schemeData?.background)} />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className='mb-3 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground'>{children}</h2>
}

interface AdminEditorPageProps {
  username: string
  initialProfile: {
    avatarUrl: string | null
  }
  initialTheme: {
    themeId: string | null
    colorScheme: ColorScheme
    library: string
    fontSans: string | null
  }
  themes: CMSTheme[]
  libraries: CMSLibrary[]
}

export function AdminEditorPage({
  username,
  initialProfile: _initialProfile,
  initialTheme,
  themes,
  libraries
}: AdminEditorPageProps) {
  const [themeId, setThemeId] = useState(initialTheme.themeId)
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialTheme.colorScheme)
  const [fontSans, setFontSans] = useState<string | undefined>(initialTheme.fontSans ?? undefined)
  const [library, setLibrary] = useState(initialTheme.library)

  const { successToast, errorToast } = useToastContext()
  const [saving, setSaving] = useState(false)

  const sendToPreviewRef = useRef<SendFn | null>(null)

  const selectedTheme = useMemo(() => themes.find((t) => t._id === themeId) ?? null, [themes, themeId])

  const sendThemePreview = useCallback((t: CMSTheme, scheme: ColorScheme, font: string | undefined) => {
    const typography = font ? { ...t.typography, fontSans: font } : t.typography
    sendToPreviewRef.current?.({
      type: 'PREVIEW_THEME',
      theme: { dark: t.dark, light: t.light, typography, spacing: t.spacing, shadows: t.shadows },
      colorScheme: scheme
    })
  }, [])

  function handleThemeSelect(id: string) {
    setThemeId(id)

    const t = themes.find((x) => x._id === id)
    if (t) sendThemePreview(t, colorScheme, fontSans)
  }

  function handleSchemeToggle(id: string, scheme: ColorScheme) {
    setColorScheme(scheme)

    const t = themes.find((x) => x._id === id)
    if (t) sendThemePreview(t, scheme, fontSans)
  }

  function handleFontChange(font: string) {
    setFontSans(font)

    if (selectedTheme) sendThemePreview(selectedTheme, colorScheme, font)
  }

  // `themesForLibrary` is a strict PARTITION, not a one-way filter: retro/brutal get
  // only `neobrutalist` themes and the soft libraries get only the rest (D-131). A
  // neobrutalist theme is legible under basic/animate but is built around a hard border
  // and offset shadow those libraries never draw, so it reads as a washed-out version of
  // itself.
  const availableThemes = useMemo(() => themesForLibrary(themes, library), [themes, library])

  function handleLibraryChange(libraryId: string) {
    // The partition can be empty — flagging themes is a CMS decision, so unflagging the
    // last one leaves a library with nothing to pair with. Refuse the switch rather than
    // completing it and silently leaving an incompatible theme selected AND publishable.
    const compatible = themesForLibrary(themes, libraryId)
    const first = compatible[0]
    if (!first) {
      errorToast('No compatible themes', 'No theme is currently marked compatible with that style.')
      return
    }

    setLibrary(libraryId)
    sendToPreviewRef.current?.({ type: 'PREVIEW_LIBRARY', library: libraryId })

    // Filtering the list stops NEW bad pairings; an already-selected theme would
    // otherwise survive the switch.
    if (
      !isThemeCompatible(
        themes.find((t) => t._id === themeId),
        libraryId
      )
    ) {
      handleThemeSelect(first._id)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          themeId,
          colorScheme,
          library,
          fontSans: fontSans ?? null
        })
      })
      if (res.ok) {
        successToast('Saved', 'Your appearance settings have been updated.')
      } else {
        errorToast('Save failed', 'Could not save changes. Please try again.')
      }
    } catch {
      errorToast('Save failed', 'Could not save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex h-full overflow-hidden'>
      {/* Sidebar — theme picker only */}
      <div className='w-64 shrink-0 overflow-y-auto border-r border-border'>
        <div className='p-6'>
          <section>
            <SectionLabel>Theme</SectionLabel>
            <div className='flex flex-col gap-2'>
              {availableThemes.map((theme) => {
                const isSelected = themeId === theme._id
                const hasBoth = !!(theme.dark?.primary && theme.light?.primary)
                return (
                  <Card
                    key={theme._id}
                    role='button'
                    tabIndex={0}
                    onClick={() => handleThemeSelect(theme._id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleThemeSelect(theme._id)
                    }}
                    // flex-row: retro/brutal Card bases are `flex flex-col`, which
                    // `items-center` does not override in tailwind-merge.
                    className={`flex cursor-pointer flex-row items-center gap-2 p-2 text-left transition-colors ${
                      isSelected ? 'bg-foreground/5' : 'hover:bg-foreground/5'
                    }`}
                  >
                    <ThemeSwatch theme={theme} scheme={isSelected ? colorScheme : 'dark'} />
                    <div className='min-w-0 flex-1'>
                      <p className='line-clamp-2 font-mono text-xs leading-snug text-foreground/80'>{theme.name}</p>
                    </div>
                    {hasBoth && (
                      <div className='flex shrink-0 flex-col gap-1'>
                        {(['dark', 'light'] as const).map((s) => (
                          <Button
                            key={s}
                            type='button'
                            variant='ghost'
                            size='xs'
                            onClick={(e) => {
                              e.stopPropagation()
                              setThemeId(theme._id)
                              handleSchemeToggle(theme._id, s)
                            }}
                            className={`font-mono uppercase tracking-[0.1em] transition-colors ${
                              isSelected && colorScheme === s
                                ? 'bg-foreground text-background'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Preview column — toolbar + iframe */}
      <div className='flex flex-1 flex-col overflow-hidden'>
        {/* Toolbar: Font + Style + Save */}
        <div className='flex shrink-0 items-center gap-4 border-b border-border px-4 py-2'>
          <div className='flex items-center gap-2'>
            <span className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>Font</span>
            <FontPicker value={fontSans} onChange={handleFontChange} />
          </div>
          {libraries.length > 0 && (
            <div className='flex items-center gap-2'>
              <span className='font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground'>Style</span>
              <LibraryDropdown value={library} libraries={libraries} onChange={handleLibraryChange} />
            </div>
          )}
          <div className='flex-1' />
          <Button
            type='button'
            onClick={handleSave}
            disabled={saving}
            className='h-8 px-3 font-mono text-xs uppercase tracking-[0.2em]'
          >
            {saving ? 'Saving...' : 'Save changes'}
          </Button>
        </div>

        {/* iframe */}
        <div className='flex-1 overflow-hidden'>
          <EnvoyPreview
            username={username}
            onReady={(send) => {
              sendToPreviewRef.current = send
            }}
          />
        </div>
      </div>
    </div>
  )
}
