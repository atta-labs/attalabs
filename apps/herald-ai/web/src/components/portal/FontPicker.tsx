'use client'

import { ChevronDown, Loader2, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@atta/ui/components'

const POPULAR_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Oswald',
  'Raleway',
  'Nunito',
  'Playfair Display',
  'Merriweather',
  'Ubuntu',
  'Rubik',
  'Work Sans',
  'Quicksand',
  'Barlow',
  'Mulish',
  'Karla',
  'Inconsolata',
  'Fira Code',
  'Source Code Pro',
  'JetBrains Mono',
  'Anton',
  'Bebas Neue',
  'Orbitron',
  'Righteous',
  'Pacifico',
  'Dancing Script',
  'Lobster',
  'Permanent Marker',
  'DM Sans',
  'DM Mono',
  'Geist'
]

function extractFontName(fontFamily: string | undefined): string {
  if (!fontFamily) return ''
  return (fontFamily.split(',')[0] ?? '').trim().replace(/['"]/g, '')
}

function loadFontForPreview(fontName: string) {
  if (typeof document === 'undefined' || !fontName) return
  const linkId = `font-preview-${fontName.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(linkId)) return
  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700&display=swap`
  document.head.appendChild(link)
}

interface FontPickerProps {
  value?: string
  onChange: (font: string) => void
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [allFonts, setAllFonts] = useState<string[]>(POPULAR_FONTS)
  const [isLoading, setIsLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const fontName = extractFontName(value)

  const fetchFontsIfNeeded = useCallback(async () => {
    if (hasFetched) return
    setHasFetched(true)
    setIsLoading(true)
    try {
      const res = await fetch(
        'https://www.googleapis.com/webfonts/v1/webfonts?key=AIzaSyBwIX97bVWr3-6AIUvGkcNnmFgirefZ6Sw&sort=popularity'
      )
      if (res.ok) {
        const data = (await res.json()) as { items?: { family: string }[] }
        const fontNames = data.items?.map((f) => f.family) || []
        setAllFonts(fontNames.length > 0 ? fontNames : POPULAR_FONTS)
      }
    } catch {
      // Keep popular fonts on error
    } finally {
      setIsLoading(false)
    }
  }, [hasFetched])

  const filteredFonts = useMemo(() => {
    if (!search.trim()) return allFonts.slice(0, 50)
    const searchLower = search.toLowerCase()
    return allFonts.filter((f) => f.toLowerCase().includes(searchLower)).slice(0, 50)
  }, [search, allFonts])

  useEffect(() => {
    filteredFonts.forEach(loadFontForPreview)
  }, [filteredFonts])

  useEffect(() => {
    if (fontName) loadFontForPreview(fontName)
  }, [fontName])

  useEffect(() => {
    if (open) {
      void fetchFontsIfNeeded()
      setTimeout(() => searchRef.current?.focus(), 50)
    } else {
      setSearch('')
    }
  }, [open, fetchFontsIfNeeded])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant='outline' className='h-8 gap-1.5 px-3 text-xs'>
          <span className='font-mono text-muted-foreground'>Aa</span>
          <span style={{ fontFamily: fontName ? `"${fontName}", sans-serif` : 'inherit' }}>{fontName || 'Font'}</span>
          <ChevronDown className='h-3 w-3 text-muted-foreground' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-64 p-0' align='start'>
        <div className='border-b p-2'>
          <div className='flex items-center gap-2 rounded-md border border-border px-2'>
            <Search className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search fonts...'
              className='h-7 w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground'
            />
          </div>
        </div>
        <div className='max-h-64 overflow-y-auto'>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          ) : filteredFonts.length === 0 ? (
            <div className='py-6 text-center text-xs text-muted-foreground'>No fonts found</div>
          ) : (
            filteredFonts.map((font) => (
              <button
                key={font}
                type='button'
                onClick={() => {
                  onChange(font)
                  setOpen(false)
                }}
                className={`flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent/10 ${font === fontName ? 'bg-accent/10 text-foreground' : 'text-foreground'}`}
                style={{ fontFamily: `"${font}", sans-serif` }}
              >
                {font}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
