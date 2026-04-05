import Link from 'next/link'

export default function Home() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center gap-8 px-6'>
      <h1 className='text-4xl font-light tracking-tight' style={{ color: 'var(--foreground)' }}>
        Vāda
      </h1>
      <p className='text-sm' style={{ color: 'var(--muted)' }}>
        Deliberation engine. Coming soon.
      </p>
      <Link href='/sign-in' className='text-sm underline' style={{ color: 'var(--accent)' }}>
        Sign in
      </Link>
    </main>
  )
}
