'use client'

import { useState, useTransition } from 'react'

const LIBRARIES = [
  {
    id: 'basic',
    name: 'Standard',
    description: 'Clean, minimal. Soft shadows, rounded corners. The default.',
    style: 'shadow-sm rounded-xl border'
  },
  {
    id: 'retro',
    name: 'Retro',
    description: 'Bold borders, heavy shadows. 80s/cyberpunk aesthetic.',
    style: 'border-2 border-foreground shadow-md hover:shadow-none hover:translate-y-1 transition-all'
  },
  {
    id: 'animate',
    name: 'Animated',
    description: 'Motion-enhanced interactions. Scale on hover, spring on tap.',
    style: 'shadow-sm rounded-xl border hover:scale-[1.02] transition-transform'
  },
  {
    id: 'brutal',
    name: 'Brutal',
    description: 'Neobrutalism. Hard offset shadows, thick borders.',
    style:
      'border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none transition-all'
  }
]

export function LibraryPicker({ currentLibrary }: { currentLibrary: string }) {
  const [selected, setSelected] = useState(currentLibrary)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSelect(libraryId: string) {
    setSelected(libraryId)
    setSaved(false)

    startTransition(async () => {
      const res = await fetch('/api/admin/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ library: libraryId })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div>
      <div className='grid grid-cols-2 gap-4'>
        {LIBRARIES.map((lib) => {
          const isSelected = selected === lib.id

          return (
            <button
              key={lib.id}
              type='button'
              onClick={() => handleSelect(lib.id)}
              className={`p-5 text-left transition-all ${lib.style} ${
                isSelected ? 'ring-2 ring-accent bg-card' : 'bg-card/50 opacity-70 hover:opacity-100'
              }`}
            >
              <p className='font-mono text-sm font-medium'>{lib.name}</p>
              <p className='mt-1 text-xs text-muted-foreground'>{lib.description}</p>
              {isSelected && <div className='mt-3 h-0.5 w-8 bg-accent' />}
            </button>
          )
        })}
      </div>

      <div className='mt-4 flex items-center gap-2'>
        {isPending && <span className='font-mono text-xs text-muted-foreground'>Saving...</span>}
        {saved && !isPending && <span className='font-mono text-xs text-accent'>Library saved</span>}
      </div>
    </div>
  )
}
