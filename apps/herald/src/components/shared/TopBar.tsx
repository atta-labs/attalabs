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
            <SignInButton>
              <button type='button' className='font-sans text-xs text-muted transition-colors hover:text-foreground'>
                Sign In
              </button>
            </SignInButton>
            <SignUpButton>
              <button
                type='button'
                className='border border-foreground/20 bg-foreground/5 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground transition-colors hover:bg-foreground/10'
              >
                Get Your Envoy
              </button>
            </SignUpButton>
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
            <UserButton />
          </Show>
        </div>
      </div>
    </nav>
  )
}
