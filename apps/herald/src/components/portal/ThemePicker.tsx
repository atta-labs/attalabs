'use client'

import { useCallback, useState, useTransition } from 'react'

interface ThemeCard {
  _id: string
  name: string
  dark?: Record<string, string>
}

export function ThemePicker({ themes, currentThemeId }: { themes: ThemeCard[]; currentThemeId: string | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(currentThemeId)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSelect = useCallback(
    (themeId: string) => {
      setSelectedId(themeId)
      setSaved(false)

      startTransition(async () => {
        const res = await fetch('/api/admin/theme', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeId, colorScheme: 'dark' })
        })
        if (res.ok) {
          setSaved(true)
          setTimeout(() => setSaved(false), 2000)
        }
      })
    },
    [startTransition]
  )

  return (
    <div>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='font-display text-xl tracking-tight'>Theme</h2>
        {isPending && <span className='font-mono text-xs text-muted'>Saving...</span>}
        {saved && !isPending && <span className='font-mono text-xs text-accent'>Saved</span>}
      </div>

      <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4'>
        {themes.map((theme) => {
          const isSelected = selectedId === theme._id
          const bg = theme.dark?.background ?? '#0D0B08'
          const fg = theme.dark?.foreground ?? '#E8D5B7'
          const primary = theme.dark?.primary ?? '#C8A84B'
          const accent = theme.dark?.accent ?? primary
          const card = theme.dark?.card ?? '#1A1610'

          return (
            <button
              key={theme._id}
              type='button'
              onClick={() => handleSelect(theme._id)}
              className={`group relative overflow-hidden rounded-lg border p-3 text-left transition-all ${
                isSelected ? 'border-accent ring-1 ring-accent' : 'border-border hover:border-foreground/30'
              }`}
            >
              {/* Color preview */}
              <div className='mb-2 flex h-16 overflow-hidden rounded' style={{ backgroundColor: bg }}>
                <div className='flex flex-1 items-end gap-1 p-2'>
                  <div className='h-6 w-6 rounded' style={{ backgroundColor: primary }} />
                  <div className='h-4 w-6 rounded' style={{ backgroundColor: accent }} />
                  <div className='h-8 flex-1 rounded' style={{ backgroundColor: card }} />
                </div>
              </div>

              {/* Name */}
              <p className='truncate font-mono text-[11px] tracking-wide' style={{ color: fg }}>
                {theme.name}
              </p>

              {/* Selected indicator */}
              {isSelected && <div className='absolute right-2 top-2 h-2 w-2 rounded-full bg-accent' />}
            </button>
          )
        })}
      </div>

      {selectedId === null && (
        <p className='mt-3 font-mono text-xs text-muted'>No theme selected — using default Minimal Dark.</p>
      )}
    </div>
  )
}
