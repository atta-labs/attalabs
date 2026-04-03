import { Show } from '@clerk/nextjs'
import Link from 'next/link'

export function EnvoyFooter() {
  return (
    <footer className='border-t border-border/50 py-6 no-print'>
      <div className='mx-auto flex max-w-[680px] items-center justify-between px-6'>
        <Link href='/' className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'>
          Herald
        </Link>
        <Show when='signed-in'>
          <Link
            href='/admin'
            className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
          >
            Dashboard →
          </Link>
        </Show>
        <Show when='signed-out'>
          <Link
            href='/sign-in'
            className='font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground'
          >
            Sign in
          </Link>
        </Show>
      </div>
    </footer>
  )
}
