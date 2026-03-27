import Link from 'next/link'

export default function HomePage() {
  return (
    <div className='mx-auto max-w-[680px] px-6 py-20'>
      <header className='mb-12'>
        <h1 className='font-display text-4xl tracking-tight'>Herald</h1>
        <p className='mt-2 text-sm leading-relaxed text-muted'>
          Paste your job description. See instantly how well I fit — and why.
        </p>
      </header>

      <section className='mb-12 border-t border-border pt-8'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>Active Envoys</p>

        <Link href='/dani' className='mt-4 block border border-border p-4 transition-colors hover:border-foreground/30'>
          <p className='font-mono text-sm font-medium'>Dani Estevez Martin</p>
          <p className='mt-0.5 font-mono text-xs text-muted'>Senior Frontend Architect · AI Systems · Web3</p>
        </Link>
      </section>

      <footer className='border-t border-border pt-6'>
        <p className='font-mono text-[9px] uppercase tracking-[0.25em] text-muted'>
          Herald · Forensic Match Audit · heyherald.com
        </p>
      </footer>
    </div>
  )
}
