export default function Home() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center px-6 text-center'>
      {/* Studio credit */}
      <p
        className='mb-10 text-[10px] uppercase tracking-[0.3em]'
        style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted)' }}
      >
        An Attā product
      </p>

      {/* Product name */}
      <h1 className='text-[42px] tracking-tight' style={{ fontFamily: 'var(--font-playfair), serif' }}>
        Vitakka
      </h1>

      {/* Pali origin */}
      <p
        className='mt-2 text-[13px] italic'
        style={{ fontFamily: 'var(--font-playfair), serif', color: 'var(--muted)' }}
      >
        vitakka · from the Pāli, directed thought
      </p>

      {/* Divider */}
      <div className='mx-auto my-12 h-px w-10' style={{ background: 'var(--accent)' }} />

      {/* Anchor word */}
      <p className='text-[15px]' style={{ color: 'var(--muted)' }}>
        Focus.
      </p>

      {/* Domain */}
      <p
        className='mt-16 text-[10px] uppercase tracking-[0.25em]'
        style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--muted-deep)' }}
      >
        vitakka.ai
      </p>
    </main>
  )
}
