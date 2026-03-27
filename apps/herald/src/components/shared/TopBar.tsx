import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export function TopBar({ username }: { username?: string }) {
  return (
    <nav className='border-b border-border'>
      <div className='mx-auto flex h-14 max-w-[900px] items-center justify-between px-6'>
        <Link href='/' className='font-display text-lg tracking-tight'>
          Herald
        </Link>

        <div className='flex items-center gap-4'>
          <Show when='signed-out'>
            <Link href='/home' className='font-sans text-xs text-muted transition-colors hover:text-foreground'>
              About
            </Link>
            <SignInButton mode='modal' />
            <SignUpButton mode='modal' />
          </Show>

          <Show when='signed-in'>
            {username && (
              <Link
                href={`/${username}`}
                target='_blank'
                className='font-mono text-xs text-muted transition-colors hover:text-foreground'
              >
                /{username} ↗
              </Link>
            )}
            <Link href='/admin' className='font-mono text-xs text-muted transition-colors hover:text-foreground'>
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  )
}
