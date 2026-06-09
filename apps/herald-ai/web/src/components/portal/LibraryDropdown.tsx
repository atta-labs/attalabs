'use client'

import type { CMSLibrary } from '@atta/cms'
import { Package } from 'lucide-react'
import {
  Select as BasicSelect,
  SelectContent as BasicSelectContent,
  SelectItem as BasicSelectItem,
  SelectTrigger as BasicSelectTrigger,
  SelectValue as BasicSelectValue
} from '@atta/ui/components/select'
import { useComponents } from '@atta/ui/lib/library-provider'

interface LibraryDropdownProps {
  value: string
  libraries: CMSLibrary[]
  onChange: (libraryId: string) => void
}

export function LibraryDropdown({ value, libraries, onChange }: LibraryDropdownProps) {
  const comps = useComponents()
  const Select = (comps.Select as typeof BasicSelect | undefined) ?? BasicSelect
  const SelectContent = (comps.SelectContent as typeof BasicSelectContent | undefined) ?? BasicSelectContent
  const SelectItem = (comps.SelectItem as typeof BasicSelectItem | undefined) ?? BasicSelectItem
  const SelectTrigger = (comps.SelectTrigger as typeof BasicSelectTrigger | undefined) ?? BasicSelectTrigger
  const SelectValue = (comps.SelectValue as typeof BasicSelectValue | undefined) ?? BasicSelectValue

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
