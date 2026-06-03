'use client'

import type { CMSTheme } from '@atta/cms'
import { Button, useToastContext } from '@atta/ui'
import { Upload } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { EnvoyPreview } from './EnvoyPreview'
import { FontPicker } from './FontPicker'

type ColorScheme = 'dark' | 'light'
type SendFn = (message: Record<string, unknown>) => void

function extractColor(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in value) return (value as { value: string }).value
  return undefined
}

function ThemeSwatch({ theme, scheme }: { theme: CMSTheme; scheme: ColorScheme }) {
  const schemeData = scheme === 'dark' ? theme.dark : theme.light
  const colors = {
    primary: extractColor(schemeData?.primary) ?? '#888',
    secondary: extractColor(schemeData?.secondary) ?? '#666',
    accent: extractColor(schemeData?.accent) ?? '#aaa',
    background: extractColor(schemeData?.background) ?? '#333'
  }
  return (
    <div className='grid h-6 w-6 grid-cols-2 gap-px overflow-hidden rounded'>
      <div className='rounded-sm' style={{ backgroundColor: colors.primary }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.accent }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.secondary }} />
      <div className='rounded-sm' style={{ backgroundColor: colors.background }} />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className='mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>{children}</h2>
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
}

export function AdminEditorPage({ username, initialProfile, initialTheme, themes }: AdminEditorPageProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatarUrl)
  const [themeId, setThemeId] = useState(initialTheme.themeId)
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialTheme.colorScheme)
  const [fontSans, setFontSans] = useState<string | undefined>(initialTheme.fontSans ?? undefined)

  const { successToast, errorToast } = useToastContext()
  const [saving, setSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const sendToPreviewRef = useRef<SendFn | null>(null)

  const selectedTheme = useMemo(() => themes.find((t) => t._id === themeId) ?? null, [themes, themeId])

  const canSave = !!avatarUrl

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

  async function handleAvatarUpload(file: File) {
    setAvatarUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'avatar')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) return
      const { url } = await res.json()
      setAvatarUrl(url)
      sendToPreviewRef.current?.({ type: 'PREVIEW_PROFILE', profile: { avatarUrl: url } })
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatarUrl,
          themeId,
          colorScheme,
          library: initialTheme.library,
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
      <div className='w-72 shrink-0 overflow-y-auto border-r border-border'>
        <div className='space-y-8 p-6'>
          <section>
            <SectionLabel>Avatar</SectionLabel>
            <div className='flex items-center gap-4'>
              <div className='flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card'>
                {avatarUrl ? (
                  // biome-ignore lint/performance/noImgElement: Blob URL, not optimisable via next/image
                  <img src={avatarUrl} alt='' className='h-full w-full object-cover' />
                ) : (
                  <span className='font-mono text-lg text-muted-foreground'>?</span>
                )}
              </div>
              <div className='flex flex-col gap-2'>
                <input
                  ref={avatarInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp'
                  className='hidden'
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleAvatarUpload(file)
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  className='gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em]'
                >
                  <Upload className='h-3 w-3' />
                  {avatarUploading ? 'Uploading...' : 'Upload photo'}
                </Button>
                <p className='font-mono text-[9px] text-muted-foreground'>JPG, PNG, WebP · max 5 MB</p>
              </div>
            </div>
          </section>

          <section>
            <SectionLabel>Font</SectionLabel>
            <FontPicker value={fontSans} onChange={handleFontChange} />
          </section>

          <section>
            <SectionLabel>Theme</SectionLabel>
            <div className='space-y-3'>
              <div className='flex flex-col gap-2'>
                {themes.map((theme) => {
                  const isSelected = themeId === theme._id
                  const hasBoth = !!(theme.dark?.primary && theme.light?.primary)
                  return (
                    <div
                      key={theme._id}
                      role='button'
                      tabIndex={0}
                      onClick={() => handleThemeSelect(theme._id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleThemeSelect(theme._id)
                      }}
                      className={`flex cursor-pointer items-center gap-2 rounded border p-2 text-left transition-colors ${
                        isSelected ? 'border-foreground/40 bg-foreground/5' : 'border-border hover:bg-foreground/5'
                      }`}
                    >
                      <ThemeSwatch theme={theme} scheme={isSelected ? colorScheme : 'dark'} />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate font-mono text-[9px] text-foreground/80'>{theme.name}</p>
                      </div>
                      {hasBoth && (
                        <div className='flex shrink-0 gap-1'>
                          {(['dark', 'light'] as const).map((s) => (
                            <Button
                              key={s}
                              type='button'
                              variant='ghost'
                              size='sm'
                              onClick={(e) => {
                                e.stopPropagation()
                                setThemeId(theme._id)
                                handleSchemeToggle(theme._id, s)
                              }}
                              className={`h-auto rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider transition-colors ${
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
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <div className='border-t border-border pt-6'>
            <div className='flex items-center gap-3'>
              <Button
                type='button'
                onClick={handleSave}
                disabled={saving || !canSave}
                className='font-mono text-[10px] uppercase tracking-[0.2em]'
              >
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              {!canSave && !saving && (
                <span className='font-mono text-[10px] text-muted-foreground'>Required: avatar</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='flex-1 overflow-hidden'>
        <EnvoyPreview
          username={username}
          onReady={(send) => {
            sendToPreviewRef.current = send
          }}
        />
      </div>
    </div>
  )
}
