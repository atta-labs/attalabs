export function LandingPage() {
  return (
    <div className='mx-auto max-w-[680px] px-6 py-20'>
      <header className='mb-12'>
        <h1 className='font-display text-4xl tracking-tight'>
          Your AI speaks for you
          <br />
          <span className='text-muted-foreground'>when you're not in the room.</span>
        </h1>
        <p className='mt-4 text-sm leading-relaxed text-muted-foreground'>
          Paste a job description. Get an evidence-based forensic match audit — with detected signals, honest gap
          analysis, and hyper-specific interview hooks. No fluff. No marketing. Just facts.
        </p>
      </header>

      <section className='border-t border-border pt-8'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground'>How it works</p>
        <div className='mt-4 space-y-3'>
          <div className='flex items-baseline gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>01</span>
            <span className='text-muted-foreground'>Sign up and claim your username</span>
          </div>
          <div className='flex items-baseline gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>02</span>
            <span className='text-muted-foreground'>Upload your CV — we extract everything automatically</span>
          </div>
          <div className='flex items-baseline gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>03</span>
            <span className='text-muted-foreground'>Share your Herald URL with recruiters</span>
          </div>
          <div className='flex items-baseline gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>04</span>
            <span className='text-muted-foreground'>
              They paste a JD and get a forensic audit — graded, evidence-based, forwardable
            </span>
          </div>
        </div>
      </section>

      <footer className='mt-12 border-t border-border pt-6'>
        <p className='font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground'>
          Herald · Forensic Match Audit · heyherald.com
        </p>
      </footer>
    </div>
  )
}
