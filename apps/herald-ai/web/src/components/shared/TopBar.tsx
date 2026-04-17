import { Show, SignInButton, UserButton } from '@clerk/nextjs'

import { ColorSchemeToggle } from '@atta/ui/lib/color-scheme-toggle'
import { NextLink } from '@atta/ui/lib/next-link'

export function TopBar({ username }: { username?: string }) {
  return (
    <nav className='border-b border-border'>
      <div className='mx-auto flex h-14 max-w-[900px] items-center justify-between px-6'>
        <NextLink variant='unstyled' href='/' className='font-display text-lg tracking-tight'>
          Herald
        </NextLink>

        <div className='flex items-center gap-4'>
          <ColorSchemeToggle />
          <Show when='signed-out'>
            <SignInButton mode='modal' />
          </Show>

          <Show when='signed-in'>
            {username && (
              <NextLink variant='subtle' href={`/${username}`} target='_blank'>
                /{username} ↗
              </NextLink>
            )}
            <NextLink variant='subtle' href='/admin'>
              Dashboard
            </NextLink>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  )
}
