'use client'

import type { ReactNode } from 'react'
import { SignInButton, UserButton, useUser } from '@atta/auth'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button } from '../libraries/basic/components/interactive/button'
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
  /** Links shown to all users. */
  links?: TopBarLink[]
  /** Links shown only to signed-in users. */
  signedInLinks?: TopBarLink[]
  /** Extra actions rendered in the right section when signed in (e.g. settings icon). */
  extraActions?: ReactNode
}

export function TopBar({
  logo,
  logoText = '',
  logoHref = '/',
  logoUrl,
  links = [],
  signedInLinks = [],
  extraActions
}: TopBarProps) {
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact = false) => (exact ? pathname === href : pathname.startsWith(href))

  const visibleLinks = user ? [...links, ...signedInLinks] : links

  const defaultLogo = logoUrl ? (
    <Logo dark={logoUrl} alt={logoText} size='h-6' />
  ) : (
    <span className='font-sans text-lg tracking-tight'>{logoText}</span>
  )

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
          {user ? (
            <>
              {extraActions}
              <UserButton />
            </>
          ) : (
            <SignInButton mode='modal'>
              <Button variant='outline' size='sm' className='text-xs'>
                Sign in
              </Button>
            </SignInButton>
          )}
        </div>

        {/* Mobile actions */}
        <div className='ml-auto flex items-center gap-2 md:hidden'>
          <ColorSchemeToggle />
          {user && <UserButton />}
          <Sheet>
            <SheetTrigger render={<Button variant='ghost' size='icon' aria-label='Open menu' />}>
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
                <SheetClose render={<Button variant='ghost' size='icon' aria-label='Close menu' />}>
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
                {!user && (
                  <div className='flex h-14 items-center border-b border-border/30'>
                    <SignInButton mode='modal'>
                      <Button variant='ghost' className='px-0 text-sm'>
                        Sign in
                      </Button>
                    </SignInButton>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
