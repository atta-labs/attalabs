'use client'

import { Button, Input } from '@atta/ui/components'
import { ChevronDown, Loader2, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  const containerRef = useRef<HTMLDivElement>(null)
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
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={containerRef} className='relative'>
      <Button
        variant='outline'
        size='sm'
        onClick={() => {
          setOpen(!open)
          if (!open) fetchFontsIfNeeded()
        }}
        className='gap-1.5 text-[10px]'
      >
        <span className='font-mono text-muted-foreground'>Aa</span>
        <span className='text-foreground' style={{ fontFamily: fontName ? `"${fontName}", sans-serif` : 'inherit' }}>
          {fontName || 'Font'}
        </span>
        <ChevronDown className='h-3 w-3 text-muted-foreground' />
      </Button>

      {open && (
        <div className='absolute right-0 top-full z-50 mt-1 w-64 rounded-md border bg-popover shadow-md'>
          <div className='border-b p-2'>
            <div className='flex items-center gap-2 rounded-md border px-2'>
              <Search className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Search fonts...'
                className='h-7 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 placeholder:text-muted-foreground'
                autoFocus
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
                <Button
                  key={font}
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    onChange(font)
                    setSearch('')
                    setOpen(false)
                  }}
                  className={`w-full justify-start px-3 py-2 text-sm ${font === fontName ? 'bg-accent/10 text-foreground' : 'text-foreground/80'}`}
                  style={{ fontFamily: `"${font}", sans-serif` }}
                >
                  {font}
                </Button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
