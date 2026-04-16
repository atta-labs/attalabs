'use client'

import type { CMSTheme } from '@atta/cms'
import { Button } from '@atta/ui/components/button'
import { cn } from '@atta/ui/lib/utils'
import { FourSquareSwatch } from './four-square-swatch'

function extractSwatchColors(theme: CMSTheme): [string, string, string, string] {
  const palette = theme.dark ?? theme.light ?? {}
  function getColor(val: string | { value: string } | undefined): string {
    if (!val) return 'transparent'
    return typeof val === 'string' ? val : val.value
  }
  return [
    getColor(palette.primary),
    getColor(palette.secondary ?? palette.accent),
    getColor(palette.accent),
    getColor(palette.background)
  ]
}

interface ThemeEntryCardProps {
  theme: CMSTheme
  isSelected: boolean
  onSelect: () => void
}

export function ThemeEntryCard({ theme, isSelected, onSelect }: ThemeEntryCardProps) {
  return (
    <Button
      variant='ghost'
      className={cn(
        'w-full justify-start gap-2 rounded-none px-3 h-10',
        isSelected && 'bg-accent text-accent-foreground'
      )}
      onClick={onSelect}
    >
      <FourSquareSwatch colors={extractSwatchColors(theme)} />
      <span className='truncate text-sm'>{theme.name}</span>
    </Button>
  )
}
