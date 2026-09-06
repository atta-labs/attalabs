import { buildClerkAppearance } from '@atta/auth'
import { AuthProvider } from '@atta/auth/provider'
import { generateThemeCSS, generateThemeCSSForScheme, getGoogleFontsUrl, transformColorGroup } from '@atta/cms'
import type { CMSBranding, CMSTheme, PortalUiConfig } from '@atta/cms'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import { COLOR_SCHEME_ATTRIBUTE, COLOR_SCHEME_COOKIE, resolveColorScheme, type ColorScheme } from './color-scheme'
import { CookieNameProvider } from './cookie-name-context'
import { LibraryProvider } from './library-provider'
import { ThemeProvider } from './theme-context'
import type { UILibrary } from './library-loader'
import { ActiveToastProvider } from './active-toast-provider'

// Injected as the first <script> in <head> during dev only.
// Runs synchronously before Turbopack's HMR bootstrap — guarantees extension
// errors never reach handleGlobalErrors() or the terminal [browser] log.
const EXTENSION_FILTER_SCRIPT = `(function(){var p=['chrome-extension://','moz-extension://','safari-web-extension://'];function x(s){if(!s)return false;for(var i=0;i<p.length;i++){if(s.indexOf(p[i])!==-1)return true;}return false;}function xRej(ev){var r=ev&&ev.reason;if(!r)return false;if(typeof r==='object'){var c=r.code;if(c===4001||c===4100||c===4200||c===4900||c===4901)return true;}try{return x(r.stack)||x(r.message)||x(String(r));}catch(e){return false;}}var prev=window.onerror;window.onerror=function(m,s,l,c,e){if(x(s)||x(e&&e.stack))return true;return prev?prev(m,s,l,c,e):false;};window.addEventListener('error',function(e){if(x(e.filename)||x(e.error&&e.error.stack)){e.stopImmediatePropagation();e.preventDefault();}},true);var _ael=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(type,cb,opts){if(this===window&&type==='unhandledrejection'&&typeof cb==='function'){var orig=cb;cb=function(ev){if(!xRej(ev))return orig.apply(this,arguments);};}return _ael.call(this,type,cb,opts);};})();`

/**
 * Runs before first paint (synchronous, un-deferred `<script>`, first in
 * `<head>`) on the `staticColorScheme` path only. `<html>`'s `data-theme`
 * attribute is the one piece of NextWebShell's output that structurally
 * cannot live inside a `<Suspense>` boundary — Suspense wraps children, not
 * an ancestor element's own attributes — so under PPR it is baked into the
 * cached static shell using the CMS default, not the request's cookie. This
 * script corrects it from `document.cookie` before anything paints. It only
 * ever needs to set one attribute: the CSS this path emits
 * (`generateThemeCSS`, not `generateThemeCSSForScheme`) already includes both
 * schemes' variables gated behind `[data-theme="dark"]`, so flipping the
 * attribute is the entire correction — no style-tag content to swap.
 */
export function buildColorSchemeCorrectionScript(cookieName: string, attribute: string): string {
  const cookieNameJson = JSON.stringify(cookieName)
  const attributeJson = JSON.stringify(attribute)
  return `(function(){try{var n=${cookieNameJson},m=document.cookie.match(new RegExp('(?:^|; )'+n.replace(/[.*+?^\${}()|[\\]\\\\]/g,'\\\\$&')+'=([^;]*)'));var v=m?decodeURIComponent(m[1]):null;if(v==='light'||v==='dark'){document.documentElement.setAttribute(${attributeJson},v);}}catch(e){}})();`
}

interface NextWebShellProps {
  children: ReactNode
  config: PortalUiConfig | null
  branding?: CMSBranding | null
  styleId: string
  cookieName?: string
  /** When false, skips AuthProvider and Clerk appearance setup. Default: true. */
  withAuth?: boolean
  /**
   * Opt-in for a PPR-enabled consumer only. When true, `<html data-theme>` is
   * rendered from the CMS/DEFAULT_SCHEME fallback (no `cookies()` read, so
   * nothing forces the route dynamic) and corrected client-side, pre-paint,
   * by an inline script — see {@link buildColorSchemeCorrectionScript}.
   * Omitting this prop (the default) preserves the exact prior behavior:
   * a real `await cookies()` read resolves `data-theme` server-side, with no
   * client correction needed or emitted. Default: false.
   */
  staticColorScheme?: boolean
}

export async function NextWebShell({
  children,
  config,
  branding,
  styleId,
  cookieName = COLOR_SCHEME_COOKIE,
  withAuth = true,
  staticColorScheme = false
}: NextWebShellProps) {
  const theme = config?.userInterface?.theme ?? null
  const cmsScheme = config?.userInterface?.colorScheme as ColorScheme | undefined

  let colorScheme: ColorScheme
  if (staticColorScheme) {
    colorScheme = resolveColorScheme(undefined, cmsScheme)
  } else {
    const cookieStore = await cookies()
    const cookieScheme = cookieStore.get(cookieName)?.value
    colorScheme = resolveColorScheme(cookieScheme, cmsScheme)
  }

  const libraryId = (config?.userInterface?.library?.id ?? 'basic') as UILibrary

  // Non-static path: emit only the active scheme as plain :root {} — the
  // ColorSchemeToggle swaps the style tag content on flip rather than relying
  // on attribute-scoped selectors. Static path: emit BOTH schemes gated by
  // `[data-theme="dark"]` so the correction script above only ever has to
  // flip the attribute, never regenerate CSS.
  const themeCSS = theme
    ? staticColorScheme
      ? generateThemeCSS(theme as CMSTheme)
      : generateThemeCSSForScheme(theme as CMSTheme, colorScheme)
    : null
  const fontsUrl = theme?.typography ? getGoogleFontsUrl(theme.typography) : null

  let appearance: ReturnType<typeof buildClerkAppearance> | undefined
  if (withAuth && theme) {
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
    <html lang='en' data-theme={colorScheme} suppressHydrationWarning={staticColorScheme || undefined}>
      {/* biome-ignore lint/style/noHeadElement: root layout renders the document head */}
      <head>
        {staticColorScheme && (
          <script
            dangerouslySetInnerHTML={{
              __html: buildColorSchemeCorrectionScript(cookieName, COLOR_SCHEME_ATTRIBUTE)
            }}
          />
        )}
        {process.env.NODE_ENV === 'development' && (
          <script dangerouslySetInnerHTML={{ __html: EXTENSION_FILTER_SCRIPT }} />
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
        {withAuth ? (
          <AuthProvider appearance={appearance}>
            <ThemeProvider theme={theme as CMSTheme | null} styleId={styleId}>
              <LibraryProvider library={libraryId}>
                <CookieNameProvider cookieName={cookieName}>
                  <ActiveToastProvider defaultPosition='bottom-right'>{children}</ActiveToastProvider>
                </CookieNameProvider>
              </LibraryProvider>
            </ThemeProvider>
          </AuthProvider>
        ) : (
          <ThemeProvider theme={theme as CMSTheme | null} styleId={styleId}>
            <LibraryProvider library={libraryId}>
              <CookieNameProvider cookieName={cookieName}>
                <ActiveToastProvider defaultPosition='bottom-right'>{children}</ActiveToastProvider>
              </CookieNameProvider>
            </LibraryProvider>
          </ThemeProvider>
        )}
      </body>
    </html>
  )
}
