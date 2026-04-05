export default function Home() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center px-6 text-center'>
      {/* Product name — no studio credit, Atta IS the studio */}
      <h1 className='text-[42px] tracking-tight' style={{ fontFamily: 'var(--font-playfair), serif' }}>
        Attā
      </h1>

      {/* Pali origin */}
      <p
        className='mt-2 text-[13px] italic'
        style={{ fontFamily: 'var(--font-playfair), serif', color: 'var(--muted)' }}
      >
        attā · from the Pāli, self
      </p>

      {/* Divider */}
      <div className='mx-auto my-12 h-px w-10' style={{ background: 'var(--accent)' }} />

      {/* Anchor word */}
      <p className='text-[15px]' style={{ color: 'var(--muted)' }}>
        Yours.
      </p>

      {/* Domain */}
      <p
        className='mt-16 text-[10px] uppercase tracking-[0.25em]'
        style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted-deep)' }}
      >
        atta.ai
      </p>
    </main>
  )
}
