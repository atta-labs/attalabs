import type { CMSBranding } from '../types'

type IconEntry = {
  rel: 'icon'
  type: string
  url: string
  sizes?: string
  media: string
}

// Dark browser → light favicon (white logo), light browser → dark favicon
export function buildFaviconIcons(branding: CMSBranding | null): IconEntry[] {
  const icons: IconEntry[] = []

  const add = (url: string | undefined, type: string, media: string, sizes?: string) => {
    if (!url) return
    const entry: IconEntry = { rel: 'icon', type, url, media }
    if (sizes) entry.sizes = sizes
    icons.push(entry)
  }

  add(branding?.faviconLight?.ico?.url, 'image/x-icon', '(prefers-color-scheme: dark)')
  add(branding?.faviconDark?.ico?.url, 'image/x-icon', '(prefers-color-scheme: light)')
  add(branding?.faviconLight?.png32?.url, 'image/png', '(prefers-color-scheme: dark)', '32x32')
  add(branding?.faviconDark?.png32?.url, 'image/png', '(prefers-color-scheme: light)', '32x32')
  add(branding?.faviconLight?.png16?.url, 'image/png', '(prefers-color-scheme: dark)', '16x16')
  add(branding?.faviconDark?.png16?.url, 'image/png', '(prefers-color-scheme: light)', '16x16')

  return icons
}
