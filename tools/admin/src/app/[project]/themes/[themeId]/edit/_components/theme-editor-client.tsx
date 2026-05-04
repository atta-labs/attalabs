'use client'

import { Button } from '@atta/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@atta/ui/components/dialog'
import { Textarea } from '@atta/ui/components/textarea'
import { Clipboard, Copy, Download } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { PortalPreviewFrame } from '@/components/portal/portal-preview-frame'
import { usePortalPreview } from '@/hooks/use-portal-preview'
import { exportShadcnCss } from '@/lib/export-shadcn-css'
import { parseShadcnCss } from '@/lib/parse-shadcn-css'
import { PROJECT_CONFIG } from '@/lib/project-config'
import type { ProjectKey } from '@/lib/project-config'
import { useToastContext } from '@atta/ui/basic/components'
import { updateThemeAction } from '../../../actions'
import type { ThemeEditorData } from '../../../_types'
import { ThemeForm } from './theme-form'

type ColorScheme = 'dark' | 'light'

interface ThemeEditorClientProps {
  project: ProjectKey
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

export function ThemeEditorClient({ theme, project }: ThemeEditorClientProps) {
  const initialData = useMemo(() => toEditorData(theme), [theme])
  const [data, setData] = useState<ThemeEditorData>(initialData)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('dark')
  const [isPending, startTransition] = useTransition()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [headerSlot, setHeaderSlot] = useState<Element | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMessage, setImportMessage] = useState<string | null>(null)

  const { successToast, errorToast } = useToastContext()

  useEffect(() => {
    setHeaderSlot(document.getElementById('admin-header-slot'))
  }, [])

  const exportedCss = useMemo(() => (exportOpen ? exportShadcnCss(data) : ''), [exportOpen, data])

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

  function handleImportApply() {
    const parsed = parseShadcnCss(importText)
    const hasAny =
      Object.keys(parsed.light).length > 0 ||
      Object.keys(parsed.dark).length > 0 ||
      Object.keys(parsed.shadows).length > 0 ||
      Object.keys(parsed.typography).length > 0 ||
      Object.keys(parsed.spacing).length > 0
    if (!hasAny) {
      setImportMessage('No recognizable shadcn tokens found.')
      return
    }
    setData((prev) => ({
      ...prev,
      light: { ...(prev.light ?? {}), ...parsed.light },
      dark: { ...(prev.dark ?? {}), ...parsed.dark },
      typography: { ...prev.typography, ...parsed.typography },
      spacing: { ...prev.spacing, ...parsed.spacing },
      shadows: { ...prev.shadows, ...parsed.shadows }
    }))
    const unknownNote = parsed.unknownTokens.length
      ? ` (${parsed.unknownTokens.length} unknown token${parsed.unknownTokens.length === 1 ? '' : 's'} ignored)`
      : ''
    setImportMessage(`Applied.${unknownNote}`)
    setTimeout(() => {
      setImportOpen(false)
      setImportText('')
      setImportMessage(null)
    }, 1200)
  }

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(initialData), [data, initialData])

  const { iframeRef, iframeSrc, iframeKey, isReady, sendMessage, refresh, isFullscreen, toggleFullscreen } =
    usePortalPreview({
      portalUrl: PROJECT_CONFIG[project].previewUrl,
      iframeSrc: `${PROJECT_CONFIG[project].previewUrl}?preview=true`,
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
        await updateThemeAction(project, theme._id, data)
        successToast('Theme saved', 'Changes persisted to the CMS database.')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save.'
        setSaveError(message)
        errorToast('Save failed', message)
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
      <Button type='button' size='sm' variant='outline' onClick={() => setImportOpen(true)}>
        <Clipboard className='h-3.5 w-3.5' />
        Import
      </Button>
      <Button type='button' size='sm' variant='outline' onClick={() => setExportOpen(true)}>
        <Download className='h-3.5 w-3.5' />
        Export
      </Button>
      <Button type='button' size='sm' onClick={handleSave} loading={isPending} disabled={!dirty || isPending}>
        Save
      </Button>
    </>
  )

  return (
    <>
      {headerSlot && createPortal(headerContent, headerSlot)}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className='w-[min(40rem,calc(100vw-2rem))]'>
          <DialogHeader>
            <DialogTitle>Import shadcn CSS</DialogTitle>
            <DialogDescription>
              Paste a shadcn theme export. Both <code>:root</code> and <code>.dark</code> blocks are parsed. Matched
              tokens fill the form; unknown ones are ignored.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={14}
            placeholder=':root {&#10;  --background: oklch(1 0 0);&#10;  --foreground: oklch(0.15 0 0);&#10;  ...&#10;}&#10;&#10;.dark {&#10;  --background: oklch(0.15 0 0);&#10;  ...&#10;}'
            className='rounded-md border border-input bg-background/60 px-2 py-1.5 font-mono text-xs'
          />
          {importMessage && <p className='font-mono text-xs text-muted-foreground'>{importMessage}</p>}
          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={handleImportApply} disabled={!importText.trim()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className='w-[min(44rem,calc(100vw-2rem))]'>
          <DialogHeader>
            <DialogTitle>Export theme</DialogTitle>
            <DialogDescription>
              shadcn-style CSS — paste this into any Atta AI theme via the "Paste shadcn CSS" dialog to round-trip.
            </DialogDescription>
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
            portalUrl={PROJECT_CONFIG[project].previewUrl}
            onRefresh={refresh}
            title='Theme Preview'
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          >
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={iframeSrc}
              className='h-full w-full border-0'
              title='Theme Preview'
            />
          </PortalPreviewFrame>
        </div>
      </div>
    </>
  )
}
