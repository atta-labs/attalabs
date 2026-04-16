'use client'

import type { CMSTheme } from '@atta/cms'
import { Button } from '@atta/ui/components/button'
import { SidebarMenu, SidebarProvider } from '@atta/ui'
import { Plus } from 'lucide-react'
import { ThemeEntryCard } from './theme-entry-card'

interface ThemesSidebarProps {
  themes: CMSTheme[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewTheme: () => void
}

export function ThemesSidebar({ themes, selectedId, onSelect, onNewTheme }: ThemesSidebarProps) {
  return (
    <div className='flex h-full flex-col border-r border-border'>
      <div className='border-b border-border p-2'>
        <Button variant='outline' size='sm' className='w-full gap-1' onClick={onNewTheme}>
          <Plus className='size-3.5' />
          New Theme
        </Button>
      </div>
      <div className='flex-1 overflow-auto'>
        {themes.length === 0 && <p className='p-4 text-sm text-muted-foreground'>No themes found.</p>}
        <SidebarProvider className='flex-col'>
          <SidebarMenu className='px-2 py-1'>
            {themes.map((theme) => (
              <ThemeEntryCard
                key={theme._id}
                theme={theme}
                isSelected={selectedId === theme._id}
                onSelect={() => onSelect(theme._id)}
              />
            ))}
          </SidebarMenu>
        </SidebarProvider>
      </div>
    </div>
  )
}
