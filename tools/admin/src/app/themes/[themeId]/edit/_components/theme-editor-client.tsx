'use client'

import { Button } from '@atta/ui/components/button'
import { Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { PortalPreviewFrame } from '@/components/portal/portal-preview-frame'
import { usePortalPreview } from '@/hooks/use-portal-preview'
import { updateThemeAction } from '../../../actions'
import type { ThemeEditorData } from '../../../_types'
import { ThemeForm } from './theme-form'

type ColorScheme = 'dark' | 'light'

interface ThemeEditorClientProps {
  theme: {
    _id: string
    name: string
    description?: string
    light?: Record<string, string>
    dark?: Record<string, string>
    typography?: { fontSans?: string; fontSerif?: string; fontMono?: string; trackingNormal?: string }
    spacing?: { radius?: string; spacing?: string }
    shadows?: Record<string, string>
  }
}

function toEditorData(theme: ThemeEditorClientProps['theme']): ThemeEditorData {
  return {
    name: theme.name ?? '',
    description: theme.description ?? '',
    light: (theme.light ?? {}) as Record<string, string>,
    dark: (theme.dark ?? {}) as Record<string, string>,
    typography: theme.typography ?? {},
    spacing: theme.spacing ?? {},
    shadows: theme.shadows ?? {}
  }
}

function buildMessage(data: ThemeEditorData, colorScheme: ColorScheme) {
  return {
    type: 'PREVIEW_THEME' as const,
    theme: {
      light: data.light,
      dark: data.dark,
      typography: data.typography,
      spacing: data.spacing,
      shadows: data.shadows
    },
    colorScheme
  }
}

export function ThemeEditorClient({ theme }: ThemeEditorClientProps) {
  const initialData = useMemo(() => toEditorData(theme), [theme])
  const [data, setData] = useState<ThemeEditorData>(initialData)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('dark')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null)

  useEffect(() => {
    setHeaderSlot(document.getElementById('admin-header-slot'))
  }, [])

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(initialData), [data, initialData])

  const { iframeRef, iframeSrc, iframeKey, isReady, sendMessage, refresh, isFullscreen, toggleFullscreen } =
    usePortalPreview({
      portalUrl: 'http://localhost:3003',
      iframeSrc: 'http://localhost:3003?preview=true',
      onReady: (send) => send(buildMessage(data, colorScheme))
    })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isReady) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      sendMessage(buildMessage(data, colorScheme))
    }, 80)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [isReady, data, colorScheme, sendMessage])

  function handleSave() {
    if (!data.name.trim()) {
      setSaveError('Name is required.')
      return
    }
    setSaveError(null)
    startTransition(async () => {
      try {
        await updateThemeAction(theme._id, data)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save.')
      }
    })
  }

  const headerContent = (
    <>
      <div className='flex items-center gap-1 rounded-md border border-border p-0.5'>
        {(['dark', 'light'] as const).map((s) => (
          <button
            key={s}
            type='button'
            onClick={() => setColorScheme(s)}
            className={`rounded px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase transition-colors ${
              colorScheme === s ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {saved && (
        <span className='flex items-center gap-1 font-mono text-[10px] text-success'>
          <Check className='h-3 w-3' /> Saved
        </span>
      )}
      <Button type='button' size='sm' onClick={handleSave} loading={isPending} disabled={!dirty || isPending}>
        Save
      </Button>
    </>
  )

  return (
    <>
      {headerSlot && createPortal(headerContent, headerSlot)}
      <div className='flex h-full flex-col'>
        {saveError && (
          <p className='shrink-0 border-b border-destructive/20 bg-destructive/10 px-4 py-2 font-mono text-xs text-destructive'>
            {saveError}
          </p>
        )}
        <div className='flex min-h-0 flex-1'>
          <div className='flex w-96 shrink-0 flex-col border-r border-border'>
            <div className='flex-1 overflow-y-auto'>
              <ThemeForm data={data} onChange={setData} colorScheme={colorScheme} />
            </div>
          </div>

          <PortalPreviewFrame
            isReady={isReady}
            portalUrl='http://localhost:3003'
            onRefresh={refresh}
            title='Vada Preview'
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          >
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={iframeSrc}
              className='h-full w-full border-0'
              title='Vada Preview'
            />
          </PortalPreviewFrame>
        </div>
      </div>
    </>
  )
}
