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
import { Input } from '@atta/ui/components/input'
import { Textarea } from '@atta/ui/components/textarea'

const FIELD_INPUT_CLASS = 'flex-1 h-8 rounded-md border border-input bg-background/60 px-2 font-mono text-xs'
const FULL_INPUT_CLASS = 'h-9 rounded-md border border-input bg-background/60 px-2 text-sm'
const FULL_TEXTAREA_CLASS = 'rounded-md border border-input bg-background/60 px-2 py-1.5 text-sm'
import { Clipboard } from 'lucide-react'
import { useId, useState } from 'react'
import {
  COLOR_GROUPS,
  SHADOW_FIELDS,
  type ColorFieldName,
  type ThemeColors,
  type ThemeEditorData
} from '../../../_types'
import { parseShadcnCss } from '@/lib/parse-shadcn-css'

type ColorScheme = 'dark' | 'light'

interface ThemeFormProps {
  data: ThemeEditorData
  onChange: (data: ThemeEditorData) => void
  colorScheme: ColorScheme
}

function isValidCssColor(value: string | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed) return false
  return /^(#|rgb|rgba|hsl|hsla|oklch|oklab|var|[a-z])/i.test(trimmed)
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>{children}</span>
}

function ColorRow({
  name,
  value,
  onChange
}: {
  name: string
  value: string | undefined
  onChange: (next: string) => void
}) {
  const displayColor = isValidCssColor(value) ? value : undefined
  return (
    <div className='flex items-center gap-3'>
      <span
        aria-hidden='true'
        className='h-6 w-6 shrink-0 rounded border border-border/50'
        style={displayColor ? ({ background: displayColor } as React.CSSProperties) : undefined}
      />
      <span className='w-40 shrink-0 font-mono text-[11px] text-foreground/80'>{name}</span>
      <Input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder='oklch(…) / #hex / rgba(…)'
        className={FIELD_INPUT_CLASS}
      />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='flex flex-col gap-3 border-b border-border/50 px-4 py-4'>
      <h3 className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>{title}</h3>
      <div className='flex flex-col gap-2'>{children}</div>
    </section>
  )
}

export function ThemeForm({ data, onChange, colorScheme }: ThemeFormProps) {
  const nameId = useId()
  const descId = useId()
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteMessage, setPasteMessage] = useState<string | null>(null)

  const currentColors = (colorScheme === 'dark' ? data.dark : data.light) ?? {}

  function update(next: Partial<ThemeEditorData>) {
    onChange({ ...data, ...next })
  }

  function updateColor(field: ColorFieldName, value: string) {
    const key = colorScheme === 'dark' ? 'dark' : 'light'
    const nextColors: ThemeColors = { ...(data[key] ?? {}), [field]: value }
    if (!value) delete nextColors[field]
    update({ [key]: nextColors })
  }

  function updateTypography(field: keyof NonNullable<ThemeEditorData['typography']>, value: string) {
    update({ typography: { ...data.typography, [field]: value } })
  }

  function updateSpacing(field: 'radius' | 'spacing', value: string) {
    update({ spacing: { ...data.spacing, [field]: value } })
  }

  function updateShadow(field: string, value: string) {
    update({ shadows: { ...data.shadows, [field]: value } })
  }

  function handlePasteApply() {
    const parsed = parseShadcnCss(pasteText)
    const hasAny =
      Object.keys(parsed.light).length > 0 ||
      Object.keys(parsed.dark).length > 0 ||
      Object.keys(parsed.shadows).length > 0 ||
      Object.keys(parsed.typography).length > 0 ||
      Object.keys(parsed.spacing).length > 0
    if (!hasAny) {
      setPasteMessage('No recognizable shadcn tokens found.')
      return
    }
    onChange({
      ...data,
      light: { ...(data.light ?? {}), ...parsed.light },
      dark: { ...(data.dark ?? {}), ...parsed.dark },
      typography: { ...data.typography, ...parsed.typography },
      spacing: { ...data.spacing, ...parsed.spacing },
      shadows: { ...data.shadows, ...parsed.shadows }
    })
    const unknownNote = parsed.unknownTokens.length
      ? ` (${parsed.unknownTokens.length} unknown token${parsed.unknownTokens.length === 1 ? '' : 's'} ignored)`
      : ''
    setPasteMessage(`Applied.${unknownNote}`)
    setTimeout(() => {
      setPasteOpen(false)
      setPasteText('')
      setPasteMessage(null)
    }, 1200)
  }

  return (
    <div className='flex flex-col'>
      <section className='flex flex-col gap-3 border-b border-border/50 px-4 py-4'>
        <label className='flex flex-col gap-1.5' htmlFor={nameId}>
          <FieldLabel>Name</FieldLabel>
          <Input
            id={nameId}
            value={data.name}
            onChange={(e) => update({ name: e.target.value })}
            className={FULL_INPUT_CLASS}
          />
        </label>
        <label className='flex flex-col gap-1.5' htmlFor={descId}>
          <FieldLabel>Description</FieldLabel>
          <Textarea
            id={descId}
            value={data.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
            rows={2}
            className={FULL_TEXTAREA_CLASS}
          />
        </label>
        <div>
          <Button type='button' variant='outline' size='sm' onClick={() => setPasteOpen(true)}>
            <Clipboard className='h-3.5 w-3.5' />
            Paste shadcn CSS
          </Button>
        </div>
      </section>

      {COLOR_GROUPS.map((group) => (
        <Section key={group.title} title={`${colorScheme} · ${group.title}`}>
          {group.fields.map((field) => (
            <ColorRow key={field} name={field} value={currentColors[field]} onChange={(v) => updateColor(field, v)} />
          ))}
        </Section>
      ))}

      <Section title='Typography'>
        {(['fontSans', 'fontSerif', 'fontMono', 'trackingNormal'] as const).map((field) => (
          <div key={field} className='flex items-center gap-3'>
            <span className='w-40 shrink-0 font-mono text-[11px] text-foreground/80'>{field}</span>
            <Input
              value={data.typography?.[field] ?? ''}
              onChange={(e) => updateTypography(field, e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
        ))}
      </Section>

      <Section title='Spacing & Radius'>
        {(['radius', 'spacing'] as const).map((field) => (
          <div key={field} className='flex items-center gap-3'>
            <span className='w-40 shrink-0 font-mono text-[11px] text-foreground/80'>{field}</span>
            <Input
              value={data.spacing?.[field] ?? ''}
              onChange={(e) => updateSpacing(field, e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
        ))}
      </Section>

      <Section title='Shadows'>
        {SHADOW_FIELDS.map((field) => (
          <div key={field} className='flex items-center gap-3'>
            <span className='w-40 shrink-0 font-mono text-[11px] text-foreground/80'>{field}</span>
            <Input
              value={data.shadows?.[field] ?? ''}
              onChange={(e) => updateShadow(field, e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
        ))}
      </Section>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className='w-[min(40rem,calc(100vw-2rem))]'>
          <DialogHeader>
            <DialogTitle>Paste shadcn CSS</DialogTitle>
            <DialogDescription>
              Paste a shadcn theme export. Both <code>:root</code> and <code>.dark</code> blocks are parsed. Matched
              tokens fill the form; unknown ones are ignored.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={14}
            placeholder=':root {&#10;  --background: oklch(1 0 0);&#10;  --foreground: oklch(0.15 0 0);&#10;  ...&#10;}&#10;&#10;.dark {&#10;  --background: oklch(0.15 0 0);&#10;  ...&#10;}'
            className='rounded-md border border-input bg-background/60 px-2 py-1.5 font-mono text-xs'
          />
          {pasteMessage && <p className='font-mono text-xs text-muted-foreground'>{pasteMessage}</p>}
          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={handlePasteApply} disabled={!pasteText.trim()}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
