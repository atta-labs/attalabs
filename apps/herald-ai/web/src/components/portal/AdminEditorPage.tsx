'use client'

import type { CMSTheme } from '@atta/cms'
import { Button, Input, Textarea } from '@atta/ui'
import { Download, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
    name: string
    title: string
    location: string
    availability: string
    summary: string
    stack: string
    github: string
    bio: string
    avatarUrl: string | null
    cvUrl: string | null
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
  const [form, setForm] = useState(initialProfile)
  const [themeId, setThemeId] = useState(initialTheme.themeId)
  const [colorScheme, setColorScheme] = useState<ColorScheme>(initialTheme.colorScheme)
  const [fontSans, setFontSans] = useState<string | undefined>(initialTheme.fontSans ?? undefined)

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [cvUploading, setCvUploading] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const sendToPreviewRef = useRef<SendFn | null>(null)

  const selectedTheme = useMemo(() => themes.find((t) => t._id === themeId) ?? null, [themes, themeId])

  function update(field: keyof typeof form, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  // Send profile preview to iframe (debounced 300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      sendToPreviewRef.current?.({
        type: 'PREVIEW_PROFILE',
        profile: {
          name: form.name,
          title: form.title,
          bio: form.bio,
          avatarUrl: form.avatarUrl
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [form.name, form.title, form.bio, form.avatarUrl])

  // Send theme preview to iframe immediately
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
    setSaved(false)
    const t = themes.find((x) => x._id === id)
    if (t) sendThemePreview(t, colorScheme, fontSans)
  }

  function handleSchemeToggle(id: string, scheme: ColorScheme) {
    setColorScheme(scheme)
    setSaved(false)
    const t = themes.find((x) => x._id === id)
    if (t) sendThemePreview(t, scheme, fontSans)
  }

  function handleFontChange(font: string) {
    setFontSans(font)
    setSaved(false)
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
      update('avatarUrl', url)
    } finally {
      setAvatarUploading(false)
    }
  }

  async function handleCvUpload(file: File) {
    setCvUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'cv')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) return
      const { url } = await res.json()
      update('cvUrl', url)
    } finally {
      setCvUploading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          title: form.title,
          location: form.location,
          availability: form.availability,
          summary: form.summary,
          stack: form.stack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          githubHandle: form.github,
          bio: form.bio,
          avatarUrl: form.avatarUrl,
          cvUrl: form.cvUrl,
          themeId,
          colorScheme,
          library: initialTheme.library,
          fontSans: fontSans ?? null
        })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setSaveError('Save failed')
      }
    } catch {
      setSaveError('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'border-border bg-card focus-visible:border-foreground/30 focus-visible:ring-0 focus-visible:ring-offset-0'

  return (
    <div className='flex h-full overflow-hidden'>
      {/* Left column — 40% */}
      <div className='w-[40%] shrink-0 overflow-y-auto border-r border-border'>
        <div className='space-y-8 p-6'>
          {/* Avatar */}
          <section>
            <SectionLabel>Avatar</SectionLabel>
            <div className='flex items-center gap-4'>
              <div className='flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card'>
                {form.avatarUrl ? (
                  // biome-ignore lint/performance/noImgElement: Blob URL, not optimisable via next/image
                  <img src={form.avatarUrl} alt='' className='h-full w-full object-cover' />
                ) : (
                  <span className='font-mono text-lg text-muted-foreground'>
                    {form.name ? form.name.charAt(0).toUpperCase() : '?'}
                  </span>
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

          {/* Identity */}
          <section>
            <SectionLabel>Identity</SectionLabel>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <label htmlFor='ed-name' className='mb-1 block font-mono text-[10px] text-muted-foreground'>
                  Name
                </label>
                <Input
                  id='ed-name'
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor='ed-title' className='mb-1 block font-mono text-[10px] text-muted-foreground'>
                  Title
                </label>
                <Input
                  id='ed-title'
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                />
              </div>
              <div>
                <label htmlFor='ed-location' className='mb-1 block font-mono text-[10px] text-muted-foreground'>
                  Location
                </label>
                <Input
                  id='ed-location'
                  className={inputClass}
                  value={form.location}
                  onChange={(e) => update('location', e.target.value)}
                  placeholder='e.g. Koh Phangan, Thailand'
                />
              </div>
              <div>
                <label htmlFor='ed-avail' className='mb-1 block font-mono text-[10px] text-muted-foreground'>
                  Availability
                </label>
                <Input
                  id='ed-avail'
                  className={inputClass}
                  value={form.availability}
                  onChange={(e) => update('availability', e.target.value)}
                  placeholder='e.g. Open to remote roles'
                />
              </div>
            </div>
          </section>

          {/* Bio */}
          <section>
            <SectionLabel>Presentation</SectionLabel>
            <Textarea
              className={`${inputClass} min-h-[100px] resize-y font-sans text-sm`}
              value={form.bio}
              onChange={(e) => {
                if (e.target.value.length <= 500) update('bio', e.target.value)
              }}
              placeholder='Your presentation — this appears on your Envoy'
            />
            <p className='mt-1 font-mono text-[9px] text-muted-foreground'>{form.bio.length}/500</p>
          </section>

          {/* CV */}
          <section>
            <SectionLabel>CV</SectionLabel>
            <input
              ref={cvInputRef}
              type='file'
              accept='application/pdf'
              className='hidden'
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCvUpload(file)
                if (cvInputRef.current) cvInputRef.current.value = ''
              }}
            />
            {form.cvUrl ? (
              <div className='flex items-center gap-3'>
                <a
                  href={form.cvUrl}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
                >
                  <Download className='h-3 w-3' />
                  Download current CV
                </a>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onClick={() => cvInputRef.current?.click()}
                  disabled={cvUploading}
                  className='font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground'
                >
                  {cvUploading ? 'Uploading...' : 'Replace'}
                </Button>
              </div>
            ) : (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => cvInputRef.current?.click()}
                disabled={cvUploading}
                className='gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em]'
              >
                <Upload className='h-3 w-3' />
                {cvUploading ? 'Uploading...' : 'Upload CV (PDF)'}
              </Button>
            )}
          </section>

          {/* Theme */}
          <section>
            <SectionLabel>Theme</SectionLabel>
            <div className='space-y-3'>
              <div className='grid grid-cols-3 gap-2'>
                {themes.map((theme) => {
                  const isSelected = themeId === theme._id
                  const hasBoth = !!(theme.dark?.primary && theme.light?.primary)
                  return (
                    <button
                      key={theme._id}
                      type='button'
                      onClick={() => handleThemeSelect(theme._id)}
                      className={`flex items-center gap-2 rounded border p-2 text-left transition-colors ${
                        isSelected ? 'border-foreground/40 bg-foreground/5' : 'border-border hover:bg-foreground/5'
                      }`}
                    >
                      <ThemeSwatch theme={theme} scheme={isSelected ? colorScheme : 'dark'} />
                      <div className='min-w-0'>
                        <p className='truncate font-mono text-[9px] text-foreground/80'>{theme.name}</p>
                        {isSelected && hasBoth && (
                          <div className='mt-1 flex gap-1'>
                            {(['dark', 'light'] as const).map((s) => (
                              <button
                                key={s}
                                type='button'
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSchemeToggle(theme._id, s)
                                }}
                                className={`rounded px-1 font-mono text-[8px] transition-colors ${
                                  colorScheme === s
                                    ? 'bg-foreground/20 text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className='flex items-center gap-2'>
                <span className='font-mono text-[10px] text-muted-foreground'>Font</span>
                <FontPicker value={fontSans} onChange={handleFontChange} />
              </div>
            </div>
          </section>

          {/* Save */}
          <div className='border-t border-border pt-6'>
            <div className='flex items-center gap-3'>
              <Button
                type='button'
                onClick={handleSave}
                disabled={saving}
                className='font-mono text-[10px] uppercase tracking-[0.2em]'
              >
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
              {saved && <span className='font-mono text-[10px] text-muted-foreground'>Saved</span>}
              {saveError && <span className='font-mono text-[10px] text-destructive'>{saveError}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Right column — 60% */}
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
