import { Show, UserButton } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  return (
    <div className='min-h-screen'>
      <nav className='border-b border-border'>
        <div className='mx-auto flex max-w-[900px] items-center justify-between px-6 py-3'>
          <div className='flex items-center gap-6'>
            <Link href='/' className='font-display text-lg tracking-tight'>
              Herald
            </Link>
            <span className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Admin</span>
          </div>
          <div className='flex items-center gap-4'>
            <Link href='/dani' className='font-mono text-xs text-muted transition-colors hover:text-foreground'>
              View Envoy
            </Link>
            <Show when='signed-in'>
              <UserButton />
            </Show>
          </div>
        </div>
      </nav>
      {children}
    </div>
  )
}
