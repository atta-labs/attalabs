'use client'

import { Button } from '@atta/ui/components/button'
import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'

export function UserTopBar() {
  const { signOut } = useClerk()
  const { user } = useUser()

  if (!user) return null

  return (
    <nav className='fixed top-0 left-0 right-0 z-20 flex h-16 items-center justify-between px-4'>
      <div className='flex items-center gap-2'>
        {user.imageUrl && (
          // biome-ignore lint/performance/noImgElement: Clerk avatar URL is external
          <img src={user.imageUrl} alt='' className='h-6 w-6 rounded-full' />
        )}
        <span className='text-xs text-muted-foreground'>{user.firstName ?? user.username}</span>
      </div>
      <Button
        variant='outline'
        size='sm'
        onClick={() => signOut({ redirectUrl: '/' })}
        className='gap-1.5 text-xs text-muted-foreground'
      >
        Sign out
        <LogOut className='h-3.5 w-3.5' />
      </Button>
    </nav>
  )
}
