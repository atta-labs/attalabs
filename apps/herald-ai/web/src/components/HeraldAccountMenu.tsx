'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@atta/ui'
import { useClerk, useUser } from '@atta/auth'
import { LogOut } from 'lucide-react'

/**
 * Herald avatar dropdown — mirrors Vāda's UserTopBar avatar menu.
 * Intentionally contains ONLY the identity label + Sign out.
 * There is NO "Manage account" item: the Clerk account lives in
 * Settings → Account tab (AttaUserProfile), so the avatar must not
 * be a bare Clerk <UserButton/> (which always carries Manage account).
 */
export function HeraldAccountMenu() {
  const { signOut } = useClerk()
  const { user } = useUser()

  if (!user) return null

  const displayName = user.fullName || user.firstName || user.primaryEmailAddress?.emailAddress
  const email = user.primaryEmailAddress?.emailAddress
  const initial = (displayName || email || '?').charAt(0).toUpperCase()

  return (
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
  )
}
