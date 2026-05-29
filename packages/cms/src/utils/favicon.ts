import type { CMSBranding } from '../types'

type IconEntry = { rel: 'icon'; type: string; url: string; sizes?: string }

export function buildFaviconIcons(branding: CMSBranding | null): IconEntry[] {
  if (!branding?.faviconIco?.url) return []
  return [{ rel: 'icon', type: 'image/x-icon', url: branding.faviconIco.url, sizes: 'any' }]
}
