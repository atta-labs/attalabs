import { buildClerkAppearance } from '@atta/auth'
import { AuthProvider } from '@atta/auth/provider'
import { generateThemeCSSForScheme, getGoogleFontsUrl, transformColorGroup } from '@atta/cms'
import type { CMSBranding, CMSTheme, PortalUiConfig } from '@atta/cms'
import { cookies } from 'next/headers'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { COLOR_SCHEME_COOKIE, resolveColorScheme, type ColorScheme } from './color-scheme'
import { CookieNameProvider } from './cookie-name-context'
import { LibraryProvider } from './library-provider'
import { ThemeProvider } from './theme-context'
import type { UILibrary } from './library-loader'
import { ToastProvider } from '../libraries/basic/components/display/toast'

// Injected as an early <script> in dev only.
// Runs before HMR bootstrap — guarantees extension errors never reach
// handleGlobalErrors() or the terminal [browser] log.
//
// Delivered via next/script with strategy="beforeInteractive" rather than a raw
// <script dangerouslySetInnerHTML> tag: in Next 16 / React 19, a raw inline
// <script> rendered inside a Server Component throws "Encountered a script tag
// while rendering React component". next/script is the supported escape hatch
// for early inline scripts and renders without that error.
const EXTENSION_FILTER_SCRIPT = `(function(){var p=['chrome-extension://','moz-extension://','safari-web-extension://'];function x(s){if(!s)return false;for(var i=0;i<p.length;i++){if(s.indexOf(p[i])!==-1)return true;}return false;}function xRej(ev){var r=ev&&ev.reason;if(!r)return false;if(typeof r==='object'){var c=r.code;if(c===4001||c===4100||c===4200||c===4900||c===4901)return true;}try{return x(r.stack)||x(r.message)||x(String(r));}catch(e){return false;}}var prev=window.onerror;window.onerror=function(m,s,l,c,e){if(x(s)||x(e&&e.stack))return true;return prev?prev(m,s,l,c,e):false;};window.addEventListener('error',function(e){if(x(e.filename)||x(e.error&&e.error.stack)){e.stopImmediatePropagation();e.preventDefault();}},true);var _ael=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,cb,opts){if(this===window&&type==='unhandledrejection'&&typeof cb==='function'){var orig=cb;cb=function(ev){if(!xRej(ev))return orig.apply(this,arguments);};}return _ael.call(this,type,cb,opts);};})();`

interface NextWebShellProps {
  children: ReactNode
  config: PortalUiConfig | null
  branding?: CMSBranding | null
  styleId: string
  cookieName?: string
}

export async function NextWebShell({
  children,
  config,
  branding,
  styleId,
  cookieName = COLOR_SCHEME_COOKIE
}: NextWebShellProps) {
  const theme = config?.userInterface?.theme ?? null
  const cmsScheme = config?.userInterface?.colorScheme as ColorScheme | undefined

  const cookieStore = await cookies()
  const cookieScheme = cookieStore.get(cookieName)?.value
  const colorScheme: ColorScheme = resolveColorScheme(cookieScheme, cmsScheme)

  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  // Emit only the active scheme as plain :root {} — the ColorSchemeToggle swaps the
  // style tag content on flip rather than relying on attribute-scoped selectors.
  const themeCSS = theme ? generateThemeCSSForScheme(theme as CMSTheme, colorScheme) : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

  let appearance: ReturnType<typeof buildClerkAppearance> | undefined
  if (theme) {
    const colorGroup = colorScheme === 'dark' ? theme.dark : theme.light
    const resolved = transformColorGroup(colorGroup)
    appearance = buildClerkAppearance(
      {
        background: resolved.get('background')!,
        foreground: resolved.get('foreground')!,
        card: resolved.get('card')!,
        border: resolved.get('border')!,
        primary: resolved.get('primary')!,
        primaryForeground: resolved.get('primary-foreground')!,
        muted: resolved.get('muted')!,
        mutedForeground: resolved.get('muted-foreground')!,
        destructive: resolved.get('destructive')!
      },
      colorScheme,
      theme.typography?.fontSans ?? undefined
    )
  }

  return (
    <html lang='en' data-theme={colorScheme}>
      {/* biome-ignore lint/style/noHeadElement: root layout renders the document head */}
      <head>
        {process.env.NODE_ENV === 'development' && (
          <Script id='extension-error-filter' strategy='beforeInteractive'>
            {EXTENSION_FILTER_SCRIPT}
          </Script>
        )}
        {fontsUrl && (
          <>
            <link rel='preconnect' href='https://fonts.googleapis.com' />
            <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
            <link rel='stylesheet' href={fontsUrl} />
          </>
        )}
        {branding?.faviconIco?.url && <link rel='icon' type='image/x-icon' href={branding.faviconIco.url} />}
        {branding?.appleTouchIcon?.url && <link rel='apple-touch-icon' href={branding.appleTouchIcon.url} />}
      </head>
      <body className='min-h-screen bg-background text-foreground'>
        {themeCSS && <style id={styleId} dangerouslySetInnerHTML={{ __html: themeCSS }} />}
        <AuthProvider appearance={appearance}>
          <ThemeProvider theme={theme as CMSTheme | null} styleId={styleId}>
            <LibraryProvider library={libraryId}>
              <CookieNameProvider cookieName={cookieName}>
                <ToastProvider defaultPosition='bottom-right'>{children}</ToastProvider>
              </CookieNameProvider>
            </LibraryProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
