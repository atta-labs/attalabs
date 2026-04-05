'use client'

import { ChevronDown, Package } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const LIBRARIES = [
  { id: 'basic', name: 'Standard', style: 'shadow-sm rounded-lg border' },
  { id: 'retro', name: 'Retro', style: 'border-2 border-foreground shadow-md' },
  { id: 'animate', name: 'Animated', style: 'shadow-sm rounded-lg border' },
  { id: 'brutal', name: 'Brutal', style: 'border-2 border-border shadow-[3px_3px_0px_0px_var(--border)]' }
]

interface LibraryDropdownProps {
  value: string
  onChange: (libraryId: string) => void
}

export function LibraryDropdown({ value, onChange }: LibraryDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentLib = LIBRARIES.find((l) => l.id === value) ?? LIBRARIES[0]!

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
        className='flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[10px] transition-colors hover:bg-foreground/5'
      >
        <Package className='h-3 w-3 text-muted-foreground' />
        <span className='text-foreground'>{currentLib.name}</span>
        <ChevronDown className='h-3 w-3 text-muted-foreground' />
      </button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover p-3 shadow-md'>
          <p className='mb-2 font-mono text-[10px] text-muted-foreground'>4 styles</p>
          <div className='grid grid-cols-2 gap-2'>
            {LIBRARIES.map((lib) => {
              const isActive = value === lib.id
              return (
                <button
                  key={lib.id}
                  type='button'
                  onClick={() => {
                    onChange(lib.id)
                    setOpen(false)
                  }}
                  className={`px-3 py-2 text-left transition-all ${lib.style} ${
                    isActive ? 'ring-1 ring-accent bg-card' : 'bg-card/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  <p className='font-mono text-[10px] font-medium'>{lib.name}</p>
                  {isActive && <div className='mt-1 h-0.5 w-5 bg-accent' />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
