'use client'

import type { ReactNode } from 'react'
import { SignInButton, UserButton, useUser } from '@atta/auth'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button as BasicButton } from '../libraries/basic/components/interactive/button'
import { useComponents } from '../lib/library-provider'
import { Logo } from '../libraries/shared/components/display/logo'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../libraries/basic/installed/sheet'
import { ColorSchemeToggle } from '../lib/color-scheme-toggle'
import { NextLink } from '../lib/next-link'

export interface TopBarLink {
  label: string
  href: string
  /** Match exact path for active state. Defaults to prefix match. */
  exact?: boolean
  external?: boolean
}

export interface TopBarProps {
  /** Pre-built logo node rendered as-is (no link wrapper added). Takes precedence over logoText/logoUrl. */
  logo?: ReactNode
  logoText?: string
  logoHref?: string
  logoUrl?: string | null
  /** Two-line tagline rendered next to the logo. First element is the top line, second is the bottom. */
  logoTagline?: [string, string]
  /** Links shown to all users. */
  links?: TopBarLink[]
  /** Links shown only to signed-in users. Ignored when withAuth={false}. */
  signedInLinks?: TopBarLink[]
  /** Extra actions rendered in the right section when signed in. Ignored when withAuth={false}. */
  extraActions?: ReactNode
  /**
   * Replaces the default bare <UserButton /> when signed in.
   * Ignored when withAuth={false}.
   */
  accountMenu?: ReactNode
  /**
   * Server-provided signed-in state. Avoids the client-side flash from useUser().
   * Ignored when withAuth={false}.
   */
  isSignedIn?: boolean
  /**
   * When false, skips all Clerk hooks and renders a static nav with no auth UI.
   * Default: true.
   */
  withAuth?: boolean
}

/** Dispatches to TopBarWithAuth or TopBarNoAuth based on withAuth prop. */
export function TopBar({ withAuth = true, ...rest }: TopBarProps) {
  if (!withAuth) return <TopBarNoAuth {...rest} />
  return <TopBarWithAuth {...rest} />
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

type InnerProps = Omit<TopBarProps, 'withAuth'>

function buildDefaultLogo(logoUrl: string | null | undefined, logoText: string, logoTagline?: [string, string]) {
  if (logoUrl) {
    return logoTagline ? (
      <Logo dark={logoUrl} alt={logoText} size='h-10' text={logoTagline} />
    ) : (
      <div className='flex items-center gap-2'>
        <Logo dark={logoUrl} alt={logoText} size='h-6' />
        {logoText && <span className='font-sans text-lg tracking-tight'>{logoText}</span>}
      </div>
    )
  }
  return <span className='font-sans text-lg tracking-tight'>{logoText}</span>
}

// ─── With Clerk auth ───────────────────────────────────────────────────────────

function TopBarWithAuth({
  logo,
  logoText = '',
  logoHref = '/',
  logoUrl,
  logoTagline,
  links = [],
  signedInLinks = [],
  extraActions,
  accountMenu,
  isSignedIn: isSignedInProp
}: InnerProps) {
  const { user } = useUser()
  const pathname = usePathname()
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton

  const isActive = (href: string, exact = false) => (exact ? pathname === href : pathname.startsWith(href))

  const isSignedIn = isSignedInProp ?? !!user
  const visibleLinks = isSignedIn ? [...links, ...signedInLinks] : links

  const defaultLogo = buildDefaultLogo(logoUrl, logoText, logoTagline)

  return (
    <nav className='w-full border-b border-border'>
      <div className='flex h-14 w-full items-center px-6'>
        {/* Logo — pinned left */}
        <div className='flex flex-1 items-center'>
          {logo ? (
            logo
          ) : (
            <NextLink variant='unstyled' href={logoHref} className='flex items-center gap-2'>
              {defaultLogo}
            </NextLink>
          )}
        </div>

        {/* Desktop nav links — truly centered */}
        <div className='hidden items-center gap-8 md:flex'>
          {visibleLinks.map(({ href, label, exact, external }) => (
            <NextLink
              key={href}
              variant='nav'
              active={isActive(href, exact)}
              href={href}
              className='whitespace-nowrap text-xs'
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {label}
            </NextLink>
          ))}
        </div>

        {/* Desktop actions — pinned right */}
        <div className='hidden flex-1 items-center justify-end gap-3 md:flex'>
          <ColorSchemeToggle />
          {isSignedIn ? (
            <>
              {extraActions}
              {accountMenu ?? <UserButton />}
            </>
          ) : (
            <SignInButton mode='modal'>
              <Button variant='outline' className='h-8 px-3 text-xs'>
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>

        {/* Mobile actions */}
        <div className='ml-auto flex items-center gap-2 md:hidden'>
          <ColorSchemeToggle />
          {isSignedIn && (accountMenu ?? <UserButton />)}
          {/* Hamburger only renders when there are links to show. When visibleLinks is empty
              and the user is signed out, the Sign-in button is shown directly in this row instead. */}
          {visibleLinks.length > 0 ? (
            <Sheet>
              <SheetTrigger render={<Button variant='outline' size='icon' aria-label='Open menu' />}>
                <Menu className='h-4 w-4' />
                <span className='sr-only'>Open menu</span>
              </SheetTrigger>
              <SheetContent side='top' showCloseButton={false} className='flex flex-col p-0 data-[side=top]:h-dvh'>
                <div className='flex h-14 shrink-0 items-center justify-between border-b border-border px-6'>
                  {logo ? (
                    logo
                  ) : (
                    <SheetClose
                      nativeButton={false}
                      render={<NextLink variant='unstyled' href={logoHref} className='flex items-center gap-2' />}
                    >
                      {defaultLogo}
                    </SheetClose>
                  )}
                  <SheetClose render={<Button variant='outline' size='icon' aria-label='Close menu' />}>
                    <X className='h-4 w-4' />
                    <span className='sr-only'>Close menu</span>
                  </SheetClose>
                </div>
                <nav className='flex flex-col px-6'>
                  {visibleLinks.map(({ href, label, exact, external }) => (
                    <SheetClose
                      key={href}
                      nativeButton={false}
                      render={
                        <NextLink
                          variant='nav'
                          active={isActive(href, exact)}
                          href={href}
                          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                          className='flex h-14 items-center border-b border-border/30 text-sm'
                        />
                      }
                    >
                      {label}
                    </SheetClose>
                  ))}
                  {!isSignedIn && (
                    <div className='flex h-14 items-center border-b border-border/30'>
                      <SignInButton mode='modal'>
                        <Button variant='outline' className='text-sm'>
                          Sign in
                        </Button>
                      </SignInButton>
                    </div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          ) : (
            !isSignedIn && (
              <SignInButton mode='modal'>
                <Button variant='outline' className='h-8 px-3 text-xs'>
                  Sign in
                </Button>
              </SignInButton>
            )
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Without Clerk auth ────────────────────────────────────────────────────────

function TopBarNoAuth({ logo, logoText = '', logoHref = '/', logoUrl, logoTagline, links = [] }: InnerProps) {
  const pathname = usePathname()
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton

  const isActive = (href: string, exact = false) => (exact ? pathname === href : pathname.startsWith(href))

  const defaultLogo = buildDefaultLogo(logoUrl, logoText, logoTagline)

  return (
    <nav className='w-full border-b border-border'>
      <div className='flex h-14 w-full items-center px-6'>
        {/* Logo — pinned left */}
        <div className='flex flex-1 items-center'>
          {logo ? (
            logo
          ) : (
            <NextLink variant='unstyled' href={logoHref} className='flex items-center gap-2'>
              {defaultLogo}
            </NextLink>
          )}
        </div>

        {/* Desktop nav links — truly centered */}
        <div className='hidden items-center gap-8 md:flex'>
          {links.map(({ href, label, exact, external }) => (
            <NextLink
              key={href}
              variant='nav'
              active={isActive(href, exact)}
              href={href}
              className='whitespace-nowrap text-xs'
              {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              {label}
            </NextLink>
          ))}
        </div>

        {/* Desktop actions — pinned right (no auth UI) */}
        <div className='hidden flex-1 items-center justify-end gap-3 md:flex'>
          <ColorSchemeToggle />
        </div>

        {/* Mobile actions */}
        <div className='ml-auto flex items-center gap-2 md:hidden'>
          <ColorSchemeToggle />
          {links.length > 0 && (
            <Sheet>
              <SheetTrigger render={<Button variant='outline' size='icon' aria-label='Open menu' />}>
                <Menu className='h-4 w-4' />
                <span className='sr-only'>Open menu</span>
              </SheetTrigger>
              <SheetContent side='top' showCloseButton={false} className='flex flex-col p-0 data-[side=top]:h-dvh'>
                <div className='flex h-14 shrink-0 items-center justify-between border-b border-border px-6'>
                  {logo ? (
                    logo
                  ) : (
                    <SheetClose
                      nativeButton={false}
                      render={<NextLink variant='unstyled' href={logoHref} className='flex items-center gap-2' />}
                    >
                      {defaultLogo}
                    </SheetClose>
                  )}
                  <SheetClose render={<Button variant='outline' size='icon' aria-label='Close menu' />}>
                    <X className='h-4 w-4' />
                    <span className='sr-only'>Close menu</span>
                  </SheetClose>
                </div>
                <nav className='flex flex-col px-6'>
                  {links.map(({ href, label, exact, external }) => (
                    <SheetClose
                      key={href}
                      nativeButton={false}
                      render={
                        <NextLink
                          variant='nav'
                          active={isActive(href, exact)}
                          href={href}
                          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                          className='flex h-14 items-center border-b border-border/30 text-sm'
                        />
                      }
                    >
                      {label}
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </nav>
  )
}
