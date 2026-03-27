import { SignUpButton } from '@clerk/nextjs'
import Link from 'next/link'

export function LandingPage() {
  return (
    <div className='mx-auto max-w-[680px] px-6 py-20'>
      <header className='mb-12'>
        <h1 className='font-display text-4xl tracking-tight'>
          Your AI speaks for you
          <br />
          <span className='text-muted'>when you're not in the room.</span>
        </h1>
        <p className='mt-4 text-sm leading-relaxed text-muted'>
          Paste a job description. Get an evidence-based forensic match audit — with detected signals, honest gap
          analysis, and hyper-specific interview hooks. No fluff. No marketing. Just facts.
        </p>
      </header>

      <section className='mb-12 flex gap-3'>
        <SignUpButton>
          <button
            type='button'
            className='border border-foreground/20 bg-foreground/5 px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-foreground/10'
          >
            Get Your Envoy
          </button>
        </SignUpButton>
        <Link
          href='/dani'
          className='flex items-center px-4 py-2.5 font-mono text-xs text-muted transition-colors hover:text-foreground'
        >
          See a live example →
        </Link>
      </section>

      <section className='border-t border-border pt-8'>
        <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-muted'>How it works</p>
        <div className='mt-4 space-y-3'>
          <div className='flex gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted'>01</span>
            <span className='text-muted'>Sign up and claim your username</span>
          </div>
          <div className='flex gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted'>02</span>
            <span className='text-muted'>Add your profile — title, stack, experience, GitHub handle</span>
          </div>
          <div className='flex gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted'>03</span>
            <span className='text-muted'>Share your Envoy URL with recruiters</span>
          </div>
          <div className='flex gap-3 text-sm'>
            <span className='shrink-0 font-mono text-[10px] text-muted'>04</span>
            <span className='text-muted'>
              They paste a JD and get a forensic audit — graded, evidence-based, forwardable
            </span>
          </div>
        </div>
      </section>

      <footer className='mt-12 border-t border-border pt-6'>
        <p className='font-mono text-[9px] uppercase tracking-[0.25em] text-muted'>
          Herald · Forensic Match Audit · heyherald.com
        </p>
      </footer>
    </div>
  )
}
