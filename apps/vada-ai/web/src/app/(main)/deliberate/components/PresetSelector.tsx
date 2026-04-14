'use client'

import { ChevronDown } from 'lucide-react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { PRESETS, type Preset, type PresetId } from '@/schemas'
import { cn } from '@atta/ui/lib/utils'

interface PresetSelectorProps {
  selected: PresetId
  onChange: (preset: Preset) => void
}

export function PresetSelector({ selected, onChange }: PresetSelectorProps) {
  const selectedPreset = PRESETS.find((p) => p.id === selected) ?? PRESETS[0]!
  const displayName = selectedPreset.name.replace('The ', '').toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='h-auto gap-1.5 p-0 text-foreground/70 hover:bg-transparent hover:text-foreground'
        >
          <Text as='span' className='font-mono text-[10px] uppercase tracking-widest'>
            Team: {displayName}
          </Text>
          <ChevronDown className='h-3 w-3' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='start' side='top' className='w-72 border-border/40 bg-card/95 backdrop-blur-md'>
        <DropdownMenuLabel className='font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60'>
          Team Presets
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.id}
            onClick={() => onChange(preset)}
            className={cn('flex-col items-start gap-0.5 py-3', selected === preset.id && 'bg-muted/30')}
          >
            <Text as='span' className='font-mono text-[10px] uppercase tracking-widest text-foreground'>
              {preset.name}
            </Text>
            <Text as='span' className='font-sans text-[11px] leading-snug text-muted-foreground'>
              {preset.subtitle}
            </Text>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
