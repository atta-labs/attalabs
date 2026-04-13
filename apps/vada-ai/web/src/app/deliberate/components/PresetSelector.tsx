'use client'

import { BookOpen, Map as MapIcon, Settings, ShieldAlert, Scale, Zap } from 'lucide-react'
import { Card, CardContent } from '@atta/ui'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import type { LucideIcon } from 'lucide-react'

const AGENT_ICONS: Record<string, LucideIcon> = {
  strategist: MapIcon,
  critic: ShieldAlert,
  devils_advocate: Zap,
  synthesizer: Scale,
  researcher: BookOpen,
  operator: Settings
}

interface PresetSelectorProps {
  selected: PresetId
  onChange: (preset: Preset) => void
}

export function PresetSelector({ selected, onChange }: PresetSelectorProps) {
  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
      {PRESETS.map((preset) => {
        const isSelected = preset.id === selected
        return (
          <button key={preset.id} type='button' onClick={() => onChange(preset)} className='text-left'>
            <Card
              className='h-full cursor-pointer transition-all'
              style={isSelected ? { borderColor: 'var(--accent)', borderWidth: 2 } : {}}
            >
              <CardContent className='p-4'>
                <p className='text-sm font-medium text-foreground'>{preset.name}</p>
                <p className='mt-1 text-[11px] leading-relaxed '>{preset.subtitle}</p>
                <div className='mt-3 flex flex-wrap gap-1.5'>
                  {preset.agents.map((a) => {
                    const Icon = AGENT_ICONS[a.role]
                    return (
                      <span
                        key={a.role}
                        className='flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5'
                      >
                        {Icon && <Icon className='h-2.5 w-2.5 /70' />}
                        <span className='text-[10px] '>{a.name}</span>
                      </span>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </button>
        )
      })}
    </div>
  )
}
