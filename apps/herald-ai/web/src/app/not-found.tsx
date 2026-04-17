import { NextLink } from '@atta/ui/lib/next-link'

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center px-6'>
      <p className='text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>Herald</p>
      <h1 className='mt-2 font-display text-6xl tracking-tight'>404</h1>
      <p className='mt-3 text-sm text-muted-foreground'>This profile doesn't exist yet.</p>
      <NextLink
        variant='unstyled'
        href='/'
        className='mt-6 border border-border px-6 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground'
      >
        Go to Herald
      </NextLink>
    </div>
  )
}
