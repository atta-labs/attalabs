'use client'

import { Button as BasicButton } from '../libraries/basic/components/interactive/button'
import { useComponents } from './library-provider'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { COLOR_SCHEME_ATTRIBUTE, COLOR_SCHEME_COOKIE_MAX_AGE, DEFAULT_SCHEME, type ColorScheme } from './color-scheme'
import { useCookieName } from './cookie-name-context'

/**
 * One-click sun/moon toggle. SSR has already set <html data-theme="..."> to
 * the correct scheme; this component reads it on mount, then on click flips
 * the attribute and writes the cookie so the next SSR render agrees.
 *
 * Pure client side — no router refresh, no network round-trip on flip.
 */
export function ColorSchemeToggle() {
  const cookieName = useCookieName()
  const [scheme, setScheme] = useState<ColorScheme>(DEFAULT_SCHEME)
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton

  // Read the SSR-applied attribute after hydration. Doing this in an effect
  // (vs. useState lazy initializer) keeps SSR markup deterministic and avoids
  // hydration mismatches if the server resolved a different default.
  useEffect(() => {
    const initial = document.documentElement.getAttribute(COLOR_SCHEME_ATTRIBUTE)
    if (initial === 'light' || initial === 'dark') setScheme(initial)
  }, [])

  function flip() {
    const next: ColorScheme = scheme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute(COLOR_SCHEME_ATTRIBUTE, next)
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API lacks Safari/Firefox support; document.cookie is the cross-browser write path
    document.cookie = `${cookieName}=${next}; Path=/; Max-Age=${COLOR_SCHEME_COOKIE_MAX_AGE}; SameSite=Lax`
    setScheme(next)
  }

  const Icon = scheme === 'dark' ? Sun : Moon
  const label = scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Button variant='outline' size='icon' onClick={flip} aria-label={label} title={label}>
      <Icon className='h-4 w-4' />
    </Button>
  )
}
