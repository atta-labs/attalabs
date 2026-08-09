'use client'

import type { ReactNode } from 'react'
import { SignInButton, UserButton, useUser } from '@atta/auth'
import { LogIn, Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Button as BasicButton } from '../libraries/basic/components/interactive/button'
import { ChromeFrame as BasicChromeFrame } from '../libraries/basic/components/chrome/chrome-frame'
import { useComponents } from '../lib/library-provider'
import { Logo } from '../libraries/shared/components/display/logo'
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '../libraries/basic/installed/sheet'
import {
  NavigationMenu as BasicNavigationMenu,
  NavigationMenuContent as BasicNavigationMenuContent,
  NavigationMenuItem as BasicNavigationMenuItem,
  NavigationMenuLink as BasicNavigationMenuLink,
  NavigationMenuList as BasicNavigationMenuList,
  NavigationMenuTrigger as BasicNavigationMenuTrigger
} from '../libraries/basic/installed/navigation-menu'
import { ColorSchemeToggle } from '../lib/color-scheme-toggle'
import { NextLink } from '../lib/next-link'
import { cn } from '../lib/utils'

export interface TopBarLink {
  /**
   * A plain string renders exactly as before (`{label}` inside the same
   * `NextLink`). Passing a `ReactNode` instead renders that node in the same
   * slot — e.g. a decorated label with its own animation — fully
   * backward-compatible since every existing caller already passes a string.
   */
  label: ReactNode
  href: string
  /** Match exact path for active state. Defaults to prefix match. */
  exact?: boolean
  external?: boolean
  /** Rendered before the label, both in the desktop row and the mobile sheet row. */
  icon?: ReactNode
}

export interface TopBarGroupItem extends TopBarLink {
  /** Muted one-line description shown under the label inside a group's dropdown panel. */
  description?: ReactNode
}

export interface TopBarLinkGroup {
  label: ReactNode
  icon?: ReactNode
  /** Items shown in the dropdown panel (desktop) / nested rows (mobile sheet). */
  items: TopBarGroupItem[]
}

/** A group is discriminated by carrying `items` — flat links never do. */
export type TopBarNavItem = TopBarLink | TopBarLinkGroup

function isTopBarGroup(item: TopBarNavItem): item is TopBarLinkGroup {
  return 'items' in item
}

/** Stable React key for a nav item — groups have no `href` to key on. */
function navItemKey(item: TopBarNavItem): string {
  return isTopBarGroup(item) ? (item.items[0]?.href ?? String(item.label)) : item.href
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
  links?: TopBarNavItem[]
  /** Links shown only to signed-in users. Ignored when withAuth={false}. */
  signedInLinks?: TopBarNavItem[]
  /**
   * Extra actions rendered in the right section, next to `ColorSchemeToggle`.
   * When `withAuth`, shown only when signed in. When `withAuth={false}`,
   * always shown (there is no signed-in state to gate on).
   */
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

type DesktopNavComponents = {
  NavigationMenu: typeof BasicNavigationMenu
  NavigationMenuList: typeof BasicNavigationMenuList
  NavigationMenuItem: typeof BasicNavigationMenuItem
  NavigationMenuTrigger: typeof BasicNavigationMenuTrigger
  NavigationMenuContent: typeof BasicNavigationMenuContent
  NavigationMenuLink: typeof BasicNavigationMenuLink
}

/** Trigger styled to sit alongside a plain `NextLink variant='nav'` — same size/color metrics, no button chrome. */
function groupTriggerClassName(active: boolean) {
  return cn(
    'h-auto shrink-0 gap-1.5 whitespace-nowrap rounded-none bg-transparent px-0 py-0 text-xs font-normal text-muted-foreground',
    'hover:bg-transparent hover:text-primary focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-primary',
    active && 'text-primary font-medium'
  )
}

/** A group's desktop dropdown — its own NavigationMenu instance sitting inline among the flat NextLinks. */
function DesktopNavGroup({
  item,
  isActive,
  nav
}: {
  item: TopBarLinkGroup
  isActive: (href: string, exact?: boolean) => boolean
  nav: DesktopNavComponents
}) {
  const {
    NavigationMenu,
    NavigationMenuList,
    NavigationMenuItem,
    NavigationMenuTrigger,
    NavigationMenuContent,
    NavigationMenuLink
  } = nav
  const groupActive = item.items.some((groupItem) => isActive(groupItem.href, groupItem.exact))

  return (
    <NavigationMenu className='max-w-none flex-none'>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className={groupTriggerClassName(groupActive)}>
            {item.icon && <span className='size-4'>{item.icon}</span>}
            {item.label}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className='grid w-64 gap-1 p-2'>
              {item.items.map((groupItem) => (
                <li key={groupItem.href}>
                  <NavigationMenuLink asChild active={isActive(groupItem.href, groupItem.exact)}>
                    <NextLink
                      variant='unstyled'
                      href={groupItem.href}
                      className='flex items-start gap-2 rounded-sm p-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
                      {...(groupItem.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    >
                      {groupItem.icon && (
                        <span className='mt-0.5 size-4 shrink-0 text-muted-foreground'>{groupItem.icon}</span>
                      )}
                      <span className='flex flex-col gap-0.5'>
                        <span>{groupItem.label}</span>
                        {groupItem.description && (
                          <span className='text-xs text-muted-foreground'>{groupItem.description}</span>
                        )}
                      </span>
                    </NextLink>
                  </NavigationMenuLink>
                </li>
              ))}
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

/** A group's mobile sheet rows — a non-navigating header row, then its items indented below. No dropdown inside the sheet. */
function SheetNavGroup({
  item,
  isActive
}: {
  item: TopBarLinkGroup
  isActive: (href: string, exact?: boolean) => boolean
}) {
  return (
    <>
      <div className='flex h-14 items-center gap-1.5 border-b border-border/30 text-sm text-muted-foreground'>
        {item.icon && <span className='size-4'>{item.icon}</span>}
        {item.label}
      </div>
      {item.items.map((groupItem) => (
        <SheetClose
          key={groupItem.href}
          nativeButton={false}
          render={
            <NextLink
              variant='nav'
              active={isActive(groupItem.href, groupItem.exact)}
              href={groupItem.href}
              {...(groupItem.external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className='flex h-14 items-center gap-1.5 border-b border-border/30 pl-4 text-sm'
            />
          }
        >
          {groupItem.icon && <span className='size-4'>{groupItem.icon}</span>}
          {groupItem.label}
        </SheetClose>
      ))}
    </>
  )
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
  // Library-resolved chrome edge: retro floats (Card + margin), the flush
  // libraries render a full-width bar. Falls back to basic's flush frame while
  // the runtime library import is still resolving.
  const ChromeFrame = (comps.ChromeFrame as typeof BasicChromeFrame | undefined) ?? BasicChromeFrame
  // Library-resolved NavigationMenu for grouped nav dropdowns — same fallback
  // precedent as Button/ChromeFrame above.
  const navComponents: DesktopNavComponents = {
    NavigationMenu: (comps.NavigationMenu as typeof BasicNavigationMenu | undefined) ?? BasicNavigationMenu,
    NavigationMenuList:
      (comps.NavigationMenuList as typeof BasicNavigationMenuList | undefined) ?? BasicNavigationMenuList,
    NavigationMenuItem:
      (comps.NavigationMenuItem as typeof BasicNavigationMenuItem | undefined) ?? BasicNavigationMenuItem,
    NavigationMenuTrigger:
      (comps.NavigationMenuTrigger as typeof BasicNavigationMenuTrigger | undefined) ?? BasicNavigationMenuTrigger,
    NavigationMenuContent:
      (comps.NavigationMenuContent as typeof BasicNavigationMenuContent | undefined) ?? BasicNavigationMenuContent,
    NavigationMenuLink:
      (comps.NavigationMenuLink as typeof BasicNavigationMenuLink | undefined) ?? BasicNavigationMenuLink
  }

  const isActive = (href: string, exact = false) => (exact ? pathname === href : pathname.startsWith(href))

  const isSignedIn = isSignedInProp ?? !!user
  const visibleLinks = isSignedIn ? [...links, ...signedInLinks] : links

  const defaultLogo = buildDefaultLogo(logoUrl, logoText, logoTagline)

  return (
    <nav className='w-full'>
      <ChromeFrame variant='topbar'>
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

        {/* Desktop nav links — absolutely centered */}
        <div className='absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex'>
          {visibleLinks.map((item) => {
            if (isTopBarGroup(item)) {
              return <DesktopNavGroup key={navItemKey(item)} item={item} isActive={isActive} nav={navComponents} />
            }
            const { href, label, exact, external } = item
            return (
              <NextLink
                key={navItemKey(item)}
                variant='nav'
                active={isActive(href, exact)}
                href={href}
                className='whitespace-nowrap text-xs'
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {label}
              </NextLink>
            )
          })}
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
              <Button variant='outline' className='h-8 gap-2 px-2.5 text-xs md:px-3'>
                <LogIn className='h-4 w-4' />
                <span>Sign in</span>
              </Button>
            </SignInButton>
          )}
        </div>

        {/* Mobile actions.
            Below md the topbar collapses to logo · ColorSchemeToggle · hamburger.
            Everything else — nav links, signed-in `extraActions`, the `accountMenu`
            (Sign out), and the signed-out Sign-in — lives inside the hamburger sheet,
            so the bar stays uncluttered at narrow widths. The hamburger therefore
            renders unconditionally below md: there is always at least Sign-in or
            account UI to surface. */}
        <div className='ml-auto flex items-center gap-2 md:hidden'>
          <ColorSchemeToggle />
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
                {visibleLinks.map((item) => {
                  if (isTopBarGroup(item)) {
                    return <SheetNavGroup key={navItemKey(item)} item={item} isActive={isActive} />
                  }
                  const { href, label, exact, external } = item
                  return (
                    <SheetClose
                      key={navItemKey(item)}
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
                  )
                })}
                {isSignedIn && extraActions && (
                  <div className='flex h-14 items-center border-b border-border/30'>{extraActions}</div>
                )}
                {isSignedIn && (
                  <div className='flex h-14 items-center border-b border-border/30'>
                    {accountMenu ?? <UserButton />}
                  </div>
                )}
                {!isSignedIn && (
                  <div className='flex h-14 items-center border-b border-border/30'>
                    <SignInButton mode='modal'>
                      <Button variant='outline' className='gap-2 text-sm'>
                        <LogIn className='h-4 w-4' />
                        <span>Sign in</span>
                      </Button>
                    </SignInButton>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </ChromeFrame>
    </nav>
  )
}

// ─── Without Clerk auth ────────────────────────────────────────────────────────

function TopBarNoAuth({
  logo,
  logoText = '',
  logoHref = '/',
  logoUrl,
  logoTagline,
  links = [],
  extraActions
}: InnerProps) {
  const pathname = usePathname()
  const comps = useComponents()
  const Button = (comps.Button as typeof BasicButton | undefined) ?? BasicButton
  // Library-resolved chrome edge: retro floats (Card + margin), the flush
  // libraries render a full-width bar. Falls back to basic's flush frame while
  // the runtime library import is still resolving.
  const ChromeFrame = (comps.ChromeFrame as typeof BasicChromeFrame | undefined) ?? BasicChromeFrame
  // Library-resolved NavigationMenu for grouped nav dropdowns — same fallback
  // precedent as Button/ChromeFrame above.
  const navComponents: DesktopNavComponents = {
    NavigationMenu: (comps.NavigationMenu as typeof BasicNavigationMenu | undefined) ?? BasicNavigationMenu,
    NavigationMenuList:
      (comps.NavigationMenuList as typeof BasicNavigationMenuList | undefined) ?? BasicNavigationMenuList,
    NavigationMenuItem:
      (comps.NavigationMenuItem as typeof BasicNavigationMenuItem | undefined) ?? BasicNavigationMenuItem,
    NavigationMenuTrigger:
      (comps.NavigationMenuTrigger as typeof BasicNavigationMenuTrigger | undefined) ?? BasicNavigationMenuTrigger,
    NavigationMenuContent:
      (comps.NavigationMenuContent as typeof BasicNavigationMenuContent | undefined) ?? BasicNavigationMenuContent,
    NavigationMenuLink:
      (comps.NavigationMenuLink as typeof BasicNavigationMenuLink | undefined) ?? BasicNavigationMenuLink
  }

  const isActive = (href: string, exact = false) => (exact ? pathname === href : pathname.startsWith(href))

  const defaultLogo = buildDefaultLogo(logoUrl, logoText, logoTagline)

  return (
    <nav className='w-full'>
      <ChromeFrame variant='topbar'>
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

        {/* Desktop nav links — absolutely centered */}
        <div className='absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex'>
          {links.map((item) => {
            if (isTopBarGroup(item)) {
              return <DesktopNavGroup key={navItemKey(item)} item={item} isActive={isActive} nav={navComponents} />
            }
            const { href, label, exact, external } = item
            return (
              <NextLink
                key={navItemKey(item)}
                variant='nav'
                active={isActive(href, exact)}
                href={href}
                className='whitespace-nowrap text-xs'
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                {label}
              </NextLink>
            )
          })}
        </div>

        {/* Desktop actions — pinned right (no auth UI) */}
        <div className='hidden flex-1 items-center justify-end gap-3 md:flex'>
          <ColorSchemeToggle />
          {extraActions}
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
                  {links.map((item) => {
                    if (isTopBarGroup(item)) {
                      return <SheetNavGroup key={navItemKey(item)} item={item} isActive={isActive} />
                    }
                    const { href, label, exact, external } = item
                    return (
                      <SheetClose
                        key={navItemKey(item)}
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
                    )
                  })}
                  {extraActions && (
                    <div className='flex h-14 items-center border-b border-border/30'>{extraActions}</div>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </ChromeFrame>
    </nav>
  )
}
