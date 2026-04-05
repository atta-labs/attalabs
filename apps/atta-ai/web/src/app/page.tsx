export default function Home() {
  return (
    <main className='flex min-h-dvh flex-col items-center justify-center px-6 text-center'>
      {/* Product name — no studio credit, Atta IS the studio */}
      <h1 className='font-display text-[96px] tracking-tight'>Attā</h1>

      {/* Pali origin */}
      <h2 className='mt-4 font-display text-[24px] font-normal italic text-foreground/60'>
        attā · from the Pāli, self
      </h2>

      {/* Divider */}
      <div className='mx-auto my-16 h-px w-10 bg-accent' />

      {/* Domain */}
      <p className='mt-24 font-mono text-[10px] uppercase tracking-[0.25em] text-foreground/30'>atta.ai</p>
    </main>
  )
}
