'use client'

import type { CMSLibrary } from '@atta/cms'
import { Button } from '@atta/ui/components'
import { FontPicker } from './FontPicker'
import { LibraryDropdown } from './LibraryDropdown'

interface PreviewToolbarProps {
  selectedLibrary: string
  libraries: CMSLibrary[]
  onLibraryChange: (libraryId: string) => void
  fontSans?: string
  onFontChange: (font: string) => void
  hasChanges: boolean
  isPending: boolean
  saved: boolean
  onPublish: () => void
}

export function PreviewToolbar({
  selectedLibrary,
  libraries,
  onLibraryChange,
  fontSans,
  onFontChange,
  hasChanges,
  isPending,
  saved,
  onPublish
}: PreviewToolbarProps) {
  return (
    <div className='flex shrink-0 items-center justify-end gap-2 border-b border-border px-3 py-1.5'>
      <LibraryDropdown value={selectedLibrary} libraries={libraries} onChange={onLibraryChange} />
      <FontPicker value={fontSans} onChange={onFontChange} />
      <span className='mx-1 text-border'>|</span>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={onPublish}
        disabled={!hasChanges || isPending}
        className='font-mono text-[10px] uppercase tracking-[0.15em] disabled:opacity-30'
      >
        {isPending ? 'Saving...' : saved ? 'Saved!' : 'Publish'}
      </Button>
    </div>
  )
}
