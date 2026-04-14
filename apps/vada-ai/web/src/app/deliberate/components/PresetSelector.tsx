'use client'

import { BookOpen, Map as MapIcon, Settings, ShieldAlert, Scale, Zap } from 'lucide-react'
import { Button, Card, CardContent } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@atta/ui/lib/utils'

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
    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
      {PRESETS.map((preset) => {
        const isSelected = preset.id === selected
        return (
          <Button
            key={preset.id}
            variant='ghost'
            className='h-auto w-full p-0 text-left focus-visible:ring-1 focus-visible:ring-ring'
            onClick={() => onChange(preset)}
          >
            <Card
              className={cn(
                'w-full cursor-pointer transition-colors',
                isSelected ? 'border-primary/50 bg-card' : 'border-border/30 bg-card/40 hover:bg-card/70'
              )}
            >
              <CardContent className='p-4'>
                <Text as='p' className='text-sm font-medium text-foreground'>
                  {preset.name}
                </Text>
                <Text as='p' size='xs' muted className='mt-1 leading-relaxed'>
                  {preset.subtitle}
                </Text>
                <div className='mt-3 flex flex-wrap gap-1.5'>
                  {preset.agents.map((a) => {
                    const Icon = AGENT_ICONS[a.role]
                    return (
                      <span
                        key={a.role}
                        className='flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 py-0.5'
                      >
                        {Icon && <Icon className='h-2.5 w-2.5 text-muted-foreground' />}
                        <span className='font-mono text-[10px] text-muted-foreground'>{a.name}</span>
                      </span>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </Button>
        )
      })}
    </div>
  )
}
