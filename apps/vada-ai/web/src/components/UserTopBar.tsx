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
  SheetClose,
  SheetContent,
  SheetTrigger
} from '@atta/ui'
import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'
import { SignInButton, useClerk, useUser } from '@atta/auth'
import { LogOut, Menu, Settings, X } from 'lucide-react'
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
    <nav className='flex h-full w-full items-center px-4 text-muted-foreground'>
      {/* Left: logo */}
      <div className='flex flex-1 items-center'>{leftLogo}</div>

      {/* Center: nav links — desktop only */}
      <div className='hidden items-center gap-8 md:flex'>
        {allLinks.map(({ href, label, exact }) => (
          <NextLink
            key={href}
            variant='nav'
            active={isActive(href, exact)}
            href={href}
            className='text-xs whitespace-nowrap'
          >
            {label}
          </NextLink>
        ))}
      </div>

      {/* Right: actions */}
      <div className='flex flex-1 items-center justify-end gap-2 md:gap-3'>
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
          <SheetContent side='top' showCloseButton={false} className='flex flex-col p-0 data-[side=top]:h-dvh'>
            {/* Header — mirrors the topbar */}
            <div className='flex h-14 shrink-0 items-center justify-between border-b border-border px-4'>
              {leftLogo}
              <SheetClose render={<Button variant='ghost' size='icon' aria-label='Close menu' />}>
                <X className='h-4 w-4' />
                <span className='sr-only'>Close menu</span>
              </SheetClose>
            </div>

            {/* Nav items — uniform height */}
            <nav className='flex flex-col px-4'>
              {allLinks.map(({ href, label, exact }) => (
                <SheetClose
                  key={href}
                  nativeButton={false}
                  render={
                    <NextLink
                      variant='nav'
                      active={isActive(href, exact)}
                      href={href}
                      className='flex h-14 items-center border-b border-border/30 text-sm'
                    />
                  }
                >
                  {label}
                </SheetClose>
              ))}
              {user && (
                <SheetClose
                  nativeButton={false}
                  render={
                    <NextLink
                      variant='nav'
                      href='/settings'
                      active={isActive('/settings', true)}
                      className='flex h-14 items-center border-b border-border/30 text-sm'
                    />
                  }
                >
                  Settings
                </SheetClose>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
