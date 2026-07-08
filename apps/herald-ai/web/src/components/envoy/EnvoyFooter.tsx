import { Show } from '@clerk/nextjs'
import { NextLink } from '@atta/ui/lib/next-link'

export function EnvoyFooter() {
  return (
    <footer className='border-t border-border/50 py-6 no-print'>
      <div className='mx-auto flex max-w-[680px] items-center justify-between px-6'>
        <NextLink variant='subtle' href='/' className='text-xs'>
          Herald
        </NextLink>
        <Show when='signed-in'>
          <NextLink variant='subtle' href='/bulk-audit' className='text-xs'>
            Dashboard →
          </NextLink>
        </Show>
        <Show when='signed-out'>
          <NextLink variant='subtle' href='/sign-in' className='text-xs'>
            Sign in
          </NextLink>
        </Show>
      </div>
    </footer>
  )
}
