'use client'

import type { CMSTheme } from '@atta/cms'
import { SidebarMenuButton, SidebarMenuItem } from '@atta/ui'
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
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isSelected} onClick={onSelect}>
        <FourSquareSwatch colors={extractSwatchColors(theme)} />
        <span>{theme.name}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
