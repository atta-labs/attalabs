'use client'

import { Show, SignInButton, UserButton } from '@atta/auth'
import { Menu } from 'lucide-react'
import { Button } from '../libraries/basic/components/interactive/button'
import { Sheet, SheetContent, SheetTrigger } from '../libraries/basic/installed/sheet'
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
  return (
    <nav className='border-b border-border'>
      <div className='mx-auto flex h-14 max-w-[900px] items-center justify-between px-6'>
        <NextLink variant='unstyled' href={logoHref} className='font-display text-lg tracking-tight'>
          {logoText}
        </NextLink>

        {/* Desktop actions */}
        <div className='hidden items-center gap-4 md:flex'>
          <ColorSchemeToggle />
          <Show when='signed-out'>
            <SignInButton mode='modal' />
          </Show>
          <Show when='signed-in'>
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
          </Show>
        </div>

        {/* Mobile actions */}
        <div className='flex items-center gap-2 md:hidden'>
          <ColorSchemeToggle />
          <Show when='signed-in'>
            <UserButton />
          </Show>
          <Sheet>
            <SheetTrigger render={<Button variant='ghost' size='icon' aria-label='Open menu' />}>
              <Menu className='h-4 w-4' />
              <span className='sr-only'>Open menu</span>
            </SheetTrigger>
            <SheetContent side='right' className='w-64'>
              <nav className='flex flex-col gap-1 pt-8'>
                <Show when='signed-out'>
                  <div className='px-2 py-3'>
                    <SignInButton mode='modal' />
                  </div>
                </Show>
                <Show when='signed-in'>
                  {signedInLinks.map((link) => (
                    <NextLink
                      key={link.href}
                      variant='nav'
                      href={link.href}
                      {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className='px-2 py-3 text-sm'
                    >
                      {link.label}
                    </NextLink>
                  ))}
                </Show>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
