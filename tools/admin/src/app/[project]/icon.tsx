import {
  createProductClient,
  getAttaBranding,
  getAttaConfig,
  getHeraldBranding,
  getHeraldConfig,
  getVadaBranding,
  getVadaConfig,
  getVitakkaBranding,
  getVitakkaConfig
} from '@atta/cms'
import type { CMSTheme, ColorScheme } from '@atta/cms'
import { ImageResponse } from 'next/og'
import { PROJECT_CONFIG, isValidProject } from '@/lib/project-config'

const BRANDING_BY_PROJECT = {
  vada: getVadaBranding,
  atta: getAttaBranding,
  herald: getHeraldBranding,
  vitakka: getVitakkaBranding
} as const

const CONFIG_BY_PROJECT = {
  vada: getVadaConfig,
  atta: getAttaConfig,
  herald: getHeraldConfig,
  vitakka: getVitakkaConfig
} as const

function resolveColor(v: string | { value: string } | undefined): string | undefined {
  if (!v) return undefined
  return typeof v === 'string' ? v : v.value
}

function themeBackground(theme: CMSTheme | null, scheme: ColorScheme): string {
  const colors = scheme === 'dark' ? theme?.dark : theme?.light
  return resolveColor(colors?.background) ?? (scheme === 'dark' ? '#0f172a' : '#ffffff')
}

function themePrimary(theme: CMSTheme | null, scheme: ColorScheme): string {
  const colors = scheme === 'dark' ? theme?.dark : theme?.light
  return resolveColor(colors?.primary) ?? 'rgba(255,255,255,0.3)'
}

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon({ params }: { params: Promise<{ project: string }> }) {
  const { project } = await params
  if (!isValidProject(project)) {
    return new ImageResponse(
      <div style={{ width: 32, height: 32, background: '#0f172a', borderRadius: 6, display: 'flex' }} />,
      { width: 32, height: 32 }
    )
  }

  const client = createProductClient(project)
  const [branding, config] = await Promise.all([
    BRANDING_BY_PROJECT[project](client).catch(() => null),
    CONFIG_BY_PROJECT[project](client).catch(() => null)
  ])

  const scheme: ColorScheme = config?.userInterface?.colorScheme ?? 'dark'
  const theme = config?.userInterface?.theme ?? null
  const bg = themeBackground(theme, scheme)
  const border = themePrimary(theme, scheme)

  // Pick favicon variant that contrasts with the background
  const faviconUrl =
    scheme === 'dark'
      ? (branding?.faviconDark?.png32?.url ?? branding?.faviconLight?.png32?.url)
      : (branding?.faviconLight?.png32?.url ?? branding?.faviconDark?.png32?.url)

  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: bg,
        borderRadius: 6,
        boxShadow: `0 0 0 2px ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {faviconUrl ? (
        <img src={faviconUrl} width={22} height={22} style={{ objectFit: 'contain' }} />
      ) : (
        <div style={{ color: scheme === 'dark' ? 'white' : 'black', fontSize: 16, fontWeight: 700 }}>
          {PROJECT_CONFIG[project].displayName[0]?.toUpperCase()}
        </div>
      )}
    </div>,
    { width: 32, height: 32 }
  )
}
