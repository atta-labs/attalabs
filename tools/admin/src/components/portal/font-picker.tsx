'use client'

import { Button, Input } from '@atta/ui/components'
import { ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * The catalogue this picker offers.
 *
 * It used to fetch the full ~1900-family list from the Google Webfonts API, which requires
 * an API key — and a key read by a client component is a key compiled into the browser
 * bundle, so there was no way to hold one privately here. An environment variable would not
 * have changed that: a `NEXT_PUBLIC_*` value ships to the browser too, and a server-only one
 * is `undefined` in it.
 *
 * A curated list needs no credential at all. If the full catalogue is wanted back, generate
 * it at build time from the public `google/fonts` metadata, or proxy the API through a server
 * route — do not reintroduce a key into this file.
 */
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
  const containerRef = useRef<HTMLDivElement>(null)
  const fontName = extractFontName(value)

  const filteredFonts = useMemo(() => {
    if (!search.trim()) return POPULAR_FONTS.slice(0, 50)
    const searchLower = search.toLowerCase()
    return POPULAR_FONTS.filter((f) => f.toLowerCase().includes(searchLower)).slice(0, 50)
  }, [search])

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
      <Button variant='outline' size='sm' onClick={() => setOpen(!open)} className='gap-1.5 text-[10px]'>
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
            {filteredFonts.length === 0 ? (
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
