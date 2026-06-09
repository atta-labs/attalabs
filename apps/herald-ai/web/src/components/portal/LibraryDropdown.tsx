'use client'

import type { CMSLibrary } from '@atta/cms'
import { Package } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@atta/ui/components'

interface LibraryDropdownProps {
  value: string
  libraries: CMSLibrary[]
  onChange: (libraryId: string) => void
}

export function LibraryDropdown({ value, libraries, onChange }: LibraryDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className='h-8 w-36 gap-1.5 px-3 text-xs'>
        <Package className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {libraries.map((lib) => (
          <SelectItem key={lib.id} value={lib.id}>
            {lib.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
