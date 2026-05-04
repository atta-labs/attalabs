'use client'

import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { FontPicker } from '@/components/portal/font-picker'

interface PreviewToolbarProps {
  fontSans?: string
  onFontChange: (font: string) => void
  hasChanges: boolean
  isPending: boolean
  saved: boolean
  onPublish: () => void
  editHref?: string | null
}

export function PreviewToolbar({
  fontSans,
  onFontChange,
  hasChanges,
  isPending,
  saved,
  onPublish,
  editHref
}: PreviewToolbarProps) {
  return (
    <div className='flex shrink-0 items-center justify-end gap-2 border-b border-border px-3 py-1.5'>
      <FontPicker value={fontSans} onChange={onFontChange} />
      <span className='mx-1 text-border'>|</span>
      {editHref && (
        <Link
          href={editHref}
          className='flex items-center gap-1.5 rounded border border-border px-2.5 py-1 font-mono text-[10px] font-medium text-foreground transition-colors hover:bg-foreground/5'
        >
          <Pencil className='h-3 w-3' />
          Edit
        </Link>
      )}
      <button
        type='button'
        onClick={onPublish}
        disabled={!hasChanges || isPending}
        className='rounded bg-accent px-3 py-1 font-mono text-[10px] font-medium text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-30'
      >
        {isPending ? 'Saving...' : saved ? 'Saved!' : 'Set Active'}
      </button>
    </div>
  )
}
