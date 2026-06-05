'use client'

import type { CMSLibrary } from '@atta/cms'
import { ChevronDown, Package } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface LibraryDropdownProps {
  value: string
  libraries: CMSLibrary[]
  onChange: (libraryId: string) => void
}

export function LibraryDropdown({ value, libraries, onChange }: LibraryDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentLib = libraries.find((l) => l.id === value) ?? libraries[0]

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className='relative'>
      <button
        type='button'
        onClick={() => setOpen(!open)}
        className='flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm transition-colors hover:bg-foreground/5'
      >
        <Package className='h-3.5 w-3.5 text-muted-foreground' />
        <span className='text-foreground'>{currentLib?.name ?? value}</span>
        <ChevronDown className='h-3 w-3 text-muted-foreground' />
      </button>

      {open && (
        <div className='absolute left-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover shadow-md'>
          <div className='max-h-64 overflow-y-auto'>
            {libraries.map((lib) => {
              const isActive = value === lib.id
              return (
                <button
                  key={lib.id}
                  type='button'
                  onClick={() => {
                    onChange(lib.id)
                    setOpen(false)
                  }}
                  className={`flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-accent/10 ${
                    isActive ? 'bg-accent/10 text-foreground' : 'text-foreground/80'
                  }`}
                >
                  <span>{lib.name}</span>
                  {lib.description && <span className='mt-0.5 text-xs text-muted-foreground'>{lib.description}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
