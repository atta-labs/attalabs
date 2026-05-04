'use client'

import { Input } from '@atta/ui/components/input'
import { Slider } from '@atta/ui/components/slider'
import { Textarea } from '@atta/ui/components/textarea'

const FIELD_INPUT_CLASS = 'flex-1 h-8 rounded-md border border-input bg-background/60 px-2 font-mono text-xs'
const FULL_INPUT_CLASS = 'h-9 rounded-md border border-input bg-background/60 px-2 text-sm'
const FULL_TEXTAREA_CLASS = 'rounded-md border border-input bg-background/60 px-2 py-1.5 text-sm'
import { RotateCcw } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import {
  COLOR_GROUPS,
  SHADOW_FIELDS,
  type ColorFieldName,
  type ThemeColors,
  type ThemeEditorData
} from '../../../_types'
import { scaleShadows } from '@/lib/scale-shadow'

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

function shortenColorFieldName(name: string): string {
  return name.replace(/Foreground$/, 'Fore')
}

const TYPOGRAPHY_LABELS: Record<string, string> = {
  fontSans: 'sans',
  fontSerif: 'serif',
  fontMono: 'mono',
  trackingNormal: 'tracking'
}

const SHADOW_LABELS: Record<string, string> = {
  shadow2xs: '2xs',
  shadowXs: 'xs',
  shadowSm: 'sm',
  shadow: 'normal',
  shadowMd: 'md',
  shadowLg: 'lg',
  shadowXl: 'xl',
  shadow2xl: '2xl'
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
    <div className='flex items-center gap-2'>
      <span
        aria-hidden='true'
        className='h-5 w-5 shrink-0 rounded border border-border/50'
        style={displayColor ? ({ background: displayColor } as React.CSSProperties) : undefined}
      />
      <span className='w-24 shrink-0 truncate font-mono text-[11px] text-foreground/80'>
        {shortenColorFieldName(name)}
      </span>
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

  const [intensityPct, setIntensityPct] = useState(100)
  const [areaPct, setAreaPct] = useState(100)
  const baseShadowsRef = useRef<Record<string, string> | null>(null)

  const isSliderDefault = intensityPct === 100 && areaPct === 100

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
    if (baseShadowsRef.current) {
      baseShadowsRef.current = null
      setIntensityPct(100)
      setAreaPct(100)
    }
    update({ shadows: { ...data.shadows, [field]: value } })
  }

  function applySliderScale(nextIntensityPct: number, nextAreaPct: number) {
    setIntensityPct(nextIntensityPct)
    setAreaPct(nextAreaPct)
    const isDefault = nextIntensityPct === 100 && nextAreaPct === 100
    if (isDefault) {
      if (baseShadowsRef.current) {
        update({ shadows: baseShadowsRef.current })
        baseShadowsRef.current = null
      }
      return
    }
    if (!baseShadowsRef.current) {
      baseShadowsRef.current = { ...(data.shadows ?? {}) }
    }
    update({
      shadows: scaleShadows(baseShadowsRef.current, {
        intensity: nextIntensityPct / 100,
        area: nextAreaPct / 100
      })
    })
  }

  function handleResetSliders() {
    applySliderScale(100, 100)
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
          <div key={field} className='flex items-center gap-2'>
            <span className='w-16 shrink-0 font-mono text-[11px] text-foreground/80'>{TYPOGRAPHY_LABELS[field]}</span>
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
          <div key={field} className='flex items-center gap-2'>
            <span className='w-24 shrink-0 font-mono text-[11px] text-foreground/80'>{field}</span>
            <Input
              value={data.spacing?.[field] ?? ''}
              onChange={(e) => updateSpacing(field, e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
        ))}
      </Section>

      <Section title='Shadows'>
        <div className='flex flex-col gap-2.5 rounded-md border border-border/50 bg-background/40 p-3'>
          <div className='flex items-center justify-between'>
            <span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>Scale</span>
            <button
              type='button'
              onClick={handleResetSliders}
              disabled={isSliderDefault}
              className='flex items-center gap-1 rounded border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40'
              aria-label='Reset shadow scale sliders'
            >
              <RotateCcw className='h-3 w-3' />
              Reset
            </button>
          </div>

          <div className='flex items-center gap-3'>
            <span className='w-20 shrink-0 font-mono text-[11px] text-foreground/80'>Intensity</span>
            <Slider
              aria-label='Intensity'
              min={0}
              max={200}
              step={10}
              value={[intensityPct]}
              onValueChange={(v) => applySliderScale(v[0] ?? 100, areaPct)}
            />
            <span className='w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
              {intensityPct}%
            </span>
          </div>

          <div className='flex items-center gap-3'>
            <span className='w-20 shrink-0 font-mono text-[11px] text-foreground/80'>Area</span>
            <Slider
              aria-label='Area'
              min={0}
              max={200}
              step={10}
              value={[areaPct]}
              onValueChange={(v) => applySliderScale(intensityPct, v[0] ?? 100)}
            />
            <span className='w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground'>
              {areaPct}%
            </span>
          </div>
        </div>

        {SHADOW_FIELDS.map((field) => (
          <div key={field} className='flex items-center gap-2'>
            <span className='w-16 shrink-0 font-mono text-[11px] text-foreground/80'>{SHADOW_LABELS[field]}</span>
            <Input
              value={data.shadows?.[field] ?? ''}
              onChange={(e) => updateShadow(field, e.target.value)}
              className={FIELD_INPUT_CLASS}
            />
          </div>
        ))}
      </Section>
    </div>
  )
}
