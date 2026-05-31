'use client'

import type { ReactNode } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetTrigger
} from '@atta/ui'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { SignInButton, useClerk, useUser } from '@atta/auth'
import { LogOut, Menu, Settings } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { PUBLIC_ROUTES, AUTH_ROUTES } from '@/lib/route-config'

interface UserTopBarProps {
  logo?: ReactNode
}

export function UserTopBar({ logo }: UserTopBarProps) {
  const { signOut } = useClerk()
  const { user } = useUser()
  const pathname = usePathname()

  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href))

  const allLinks = user ? [...PUBLIC_ROUTES, ...AUTH_ROUTES] : PUBLIC_ROUTES
  const leftLogo = logo ?? (
    <NextLink variant='unstyled' href='/' className='text-xs text-foreground'>
      VADA.AI
    </NextLink>
  )

  const displayName = user?.fullName || user?.firstName || user?.primaryEmailAddress?.emailAddress
  const email = user?.primaryEmailAddress?.emailAddress
  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
    <nav className='flex h-full w-full items-center justify-between px-4 py-3 text-muted-foreground md:grid md:grid-cols-3'>
      {/* Left: logo */}
      <div className='flex items-center'>{leftLogo}</div>

      {/* Center: nav links — desktop only */}
      <div className='hidden items-center gap-8 justify-self-center md:flex'>
        {allLinks.map(({ href, label, exact }) => (
          <NextLink key={href} variant='nav' active={isActive(href, exact)} href={href} className='text-xs'>
            {label}
          </NextLink>
        ))}
      </div>

      {/* Right: actions */}
      <div className='flex items-center gap-2 justify-self-end md:gap-3'>
        <ColorSchemeToggle />

        {/* Settings icon — desktop only */}
        {user && (
          <Button variant='ghost' size='icon' asChild aria-label='Settings' title='Settings' className='hidden md:flex'>
            <NextLink variant='unstyled' href='/settings'>
              <Settings className='h-4 w-4' />
            </NextLink>
          </Button>
        )}

        {/* Avatar dropdown / sign-in — always visible */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className='rounded-full outline-none ring-offset-background transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'>
              {user.imageUrl ? (
                // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
                <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
              ) : (
                <span className='flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground'>
                  {initial}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              {(displayName || email) && (
                <>
                  <DropdownMenuLabel className='font-normal'>
                    <div className='flex flex-col gap-0.5'>
                      {displayName && <span className='text-sm text-foreground'>{displayName}</span>}
                      {email && <span className='text-xs text-muted-foreground'>{email}</span>}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onSelect={() => signOut({ redirectUrl: '/' })} className='cursor-pointer'>
                <LogOut className='h-4 w-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <SignInButton mode='modal' fallbackRedirectUrl={pathname}>
            <Button variant='outline' size='sm' className='text-xs'>
              Sign in
            </Button>
          </SignInButton>
        )}

        {/* Hamburger — mobile only */}
        <Sheet>
          <SheetTrigger
            render={<Button variant='ghost' size='icon' aria-label='Open menu' className='flex md:hidden' />}
          >
            <Menu className='h-4 w-4' />
            <span className='sr-only'>Open menu</span>
          </SheetTrigger>
          <SheetContent side='right' className='w-64'>
            <nav className='flex flex-col gap-1 pt-8'>
              {allLinks.map(({ href, label, exact }) => (
                <NextLink
                  key={href}
                  variant='nav'
                  active={isActive(href, exact)}
                  href={href}
                  className='px-2 py-3 text-sm'
                >
                  {label}
                </NextLink>
              ))}
              {user && (
                <>
                  <div className='my-2 border-t border-border' />
                  <NextLink
                    variant='nav'
                    href='/settings'
                    active={isActive('/settings', true)}
                    className='px-2 py-3 text-sm'
                  >
                    Settings
                  </NextLink>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
