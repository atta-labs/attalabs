import { Show, UserButton } from '@clerk/nextjs'
import { NextLink } from '@atta/ui/lib/next-link'

export function EnvoyFooter() {
  return (
    <footer className='border-t border-border/50 py-6 no-print'>
      <div className='mx-auto flex max-w-[680px] items-center justify-between px-6'>
        <NextLink variant='subtle' href='/' className='text-[10px]'>
          Herald
        </NextLink>
        <Show when='signed-in'>
          <div className='flex items-center gap-3'>
            <NextLink variant='subtle' href='/candidate' className='text-[10px]'>
              Dashboard →
            </NextLink>
            <UserButton
              appearance={{
                elements: { avatarBox: 'h-5 w-5' }
              }}
            />
          </div>
        </Show>
        <Show when='signed-out'>
          <NextLink variant='subtle' href='/sign-in' className='text-[10px]'>
            Sign in
          </NextLink>
        </Show>
      </div>
    </footer>
  )
}
