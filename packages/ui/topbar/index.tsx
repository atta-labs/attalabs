'use client'

import { SignInButton, UserButton, useUser } from '@atta/auth'
import { Menu, X } from 'lucide-react'
import { Button } from '../libraries/basic/components/interactive/button'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../libraries/basic/installed/sheet'
import { ColorSchemeToggle } from '../lib/color-scheme-toggle'
import { NextLink } from '../lib/next-link'

export interface TopBarLink {
  label: string
  href: string
  external?: boolean
}

export interface TopBarProps {
  logoText: string
  logoHref?: string
  signedInLinks?: TopBarLink[]
}

export function TopBar({ logoText, logoHref = '/', signedInLinks = [] }: TopBarProps) {
  const { user } = useUser()

  return (
    <nav className='border-b border-border'>
      <div className='mx-auto flex h-14 max-w-[900px] items-center justify-between px-6'>
        <NextLink variant='unstyled' href={logoHref} className='font-display text-lg tracking-tight'>
          {logoText}
        </NextLink>

        {/* Desktop actions */}
        <div className='hidden items-center gap-4 md:flex'>
          <ColorSchemeToggle />
          {user ? (
            <>
              {signedInLinks.map((link) => (
                <NextLink
                  key={link.href}
                  variant='subtle'
                  href={link.href}
                  {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                >
                  {link.label}
                </NextLink>
              ))}
              <UserButton />
            </>
          ) : (
            <SignInButton mode='modal' />
          )}
        </div>

        {/* Mobile actions */}
        <div className='flex items-center gap-2 md:hidden'>
          <ColorSchemeToggle />
          {user && <UserButton />}
          <Sheet>
            <SheetTrigger render={<Button variant='ghost' size='icon' aria-label='Open menu' />}>
              <Menu className='h-4 w-4' />
              <span className='sr-only'>Open menu</span>
            </SheetTrigger>
            <SheetContent side='top' showCloseButton={false} className='flex flex-col p-0 data-[side=top]:h-dvh'>
              {/* Header — mirrors the topbar */}
              <div className='flex h-14 shrink-0 items-center justify-between border-b border-border px-6'>
                <SheetClose
                  nativeButton={false}
                  render={
                    <NextLink variant='unstyled' href={logoHref} className='font-display text-lg tracking-tight' />
                  }
                >
                  {logoText}
                </SheetClose>
                <SheetClose render={<Button variant='ghost' size='icon' aria-label='Close menu' />}>
                  <X className='h-4 w-4' />
                  <span className='sr-only'>Close menu</span>
                </SheetClose>
              </div>

              {/* Nav items */}
              <nav className='flex flex-col px-6'>
                {user ? (
                  signedInLinks.map((link) => (
                    <SheetClose
                      key={link.href}
                      nativeButton={false}
                      render={
                        <NextLink
                          variant='nav'
                          href={link.href}
                          {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                          className='flex h-14 items-center border-b border-border/30 text-sm'
                        />
                      }
                    >
                      {link.label}
                    </SheetClose>
                  ))
                ) : (
                  <div className='flex h-14 items-center border-b border-border/30'>
                    <SignInButton mode='modal' />
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
