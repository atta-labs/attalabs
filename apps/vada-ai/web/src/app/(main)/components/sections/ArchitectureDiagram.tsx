'use client'

export function ArchitectureDiagram() {
  return (
    <div className='space-y-4 w-full max-w-2xl mx-auto'>
      {/* Header */}
      <div className='flex items-baseline justify-between border-b border-border pb-2'>
        <div className='font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground'>
          Section A — A' · Vāda Stack
        </div>
        <div className='font-serif text-sm font-medium text-foreground italic'>Vāda</div>
      </div>

      {/* Main Grid */}
      <div className='grid grid-cols-[85px_1fr_110px] gap-0'>
        {/* ================= ROW 1: DELIBERATION ================= */}

        {/* Left Tick (z-20 ensures the vertical line is never covered) */}
        <div className='relative flex items-center justify-end pr-2 border-r border-border z-20'>
          <div className='font-mono text-[8px] uppercase tracking-wider text-muted-foreground whitespace-nowrap'>
            L1 · Deliberation
          </div>
          <div className='absolute -right-[1px] top-1/2 w-2 h-px bg-foreground z-10' />
        </div>

        {/* Center Stratum */}
        <div
          className='relative p-4 sm:p-5 border border-foreground border-b-[3px] -ml-px z-0 flex flex-col justify-center min-h-[120px]'
          style={{
            backgroundImage:
              'repeating-linear-gradient(-45deg, transparent, transparent 6px, hsl(var(--foreground) / 0.15) 6px, hsl(var(--foreground) / 0.15) 7px)'
          }}
        >
          <div className='font-mono text-xs tracking-[0.2em] font-medium text-foreground uppercase bg-background/80 inline-block w-max px-1 -ml-1'>
            Deliberation
          </div>
          <div className='font-serif italic text-base sm:text-lg mt-1 tracking-tight text-foreground bg-background/80 inline-block px-1 -ml-1 leading-snug'>
            Argue the strategy. Attack the assumptions. Find the blind spots.
          </div>
          <div className='flex flex-wrap gap-1.5 mt-3 relative z-10'>
            {['Closed-Room', 'No Web', 'No Tools', 'Friction Preserved'].map((tag) => (
              <div
                key={tag}
                className='border border-foreground/30 bg-background px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground'
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Right Callout */}
        <div className='relative flex flex-col justify-center pl-3'>
          <div className='absolute left-0 top-1/2 w-2 h-px bg-muted-foreground z-10' />
          <div className='font-mono text-[8px] uppercase tracking-wider font-bold text-foreground mb-0.5'>Intake</div>
          <div className='font-mono text-[8px] uppercase tracking-wider text-muted-foreground leading-relaxed'>
            The decision enters here,
            <br />
            unexamined.
          </div>
        </div>

        {/* ================= ROW 2: SEAM ================= */}

        {/* Left Tick (z-20 protects the vertical line) */}
        <div className='relative flex items-center justify-end pr-2 border-r border-border z-20'>
          <div className='font-mono text-[8px] uppercase tracking-wider text-muted-foreground whitespace-nowrap'>
            Seam · Conclusion
          </div>
          <div className='absolute -right-[1px] top-1/2 w-2 h-px bg-muted-foreground z-10' />
        </div>

        {/* Center Seam (Transparent gap, no background or borders overlapping) */}
        <div className='relative flex items-center justify-center py-4 z-10'>
          <div className='font-mono text-[9px] uppercase tracking-[0.2em] text-foreground'>— Conclusion ↓ —</div>
        </div>

        {/* Right Callout */}
        <div className='relative flex flex-col justify-center pl-3'>
          <div className='absolute left-0 top-1/2 w-2 h-px bg-muted-foreground z-10' />
          <div className='font-mono text-[8px] uppercase tracking-wider font-bold text-foreground mb-0.5'>Seam</div>
          <div className='font-mono text-[8px] uppercase tracking-wider text-muted-foreground leading-relaxed'>
            One-way. Conclusions pass
            <br />
            down; execution noise
            <br />
            cannot pass up.
          </div>
        </div>

        {/* ================= ROW 3: EXECUTION ================= */}

        {/* Left Tick (z-20 finishes the spine) */}
        <div className='relative flex items-center justify-end pr-2 border-r border-border pb-4 z-20'>
          <div className='font-mono text-[8px] uppercase tracking-wider text-muted-foreground whitespace-nowrap'>
            L2 · Execution
          </div>
          <div className='absolute -right-[1px] top-1/2 w-2 h-px bg-foreground/30 z-10' />
        </div>

        {/* Center Stratum (Fully enclosed border restored) */}
        <div className='relative p-4 sm:p-5 border border-foreground -ml-px bg-foreground text-background z-0 flex flex-col justify-center min-h-[120px]'>
          <div className='font-mono text-xs tracking-[0.2em] font-medium uppercase'>Execution</div>
          <div className='font-serif italic text-base sm:text-lg mt-1 tracking-tight text-background/90 leading-snug'>
            Build, browse, run, ship — once the question is known to be the right one.
          </div>
          <div className='flex flex-wrap gap-1.5 mt-3'>
            {['Skills', 'Swarms', 'Plugins', 'Mcp', 'Browsers', 'Runners'].map((tag) => (
              <div
                key={tag}
                className='border border-background/40 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-background/80'
              >
                {tag}
              </div>
            ))}
          </div>
        </div>

        {/* Right Callout */}
        <div className='relative flex flex-col justify-center pl-3'>
          <div className='absolute left-0 top-1/2 w-2 h-px bg-muted-foreground z-10' />
          <div className='font-mono text-[8px] uppercase tracking-wider font-bold text-foreground mb-0.5'>Output</div>
          <div className='font-mono text-[8px] uppercase tracking-wider text-muted-foreground leading-relaxed'>
            Action, scaled across
            <br />
            the swarm.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-between border-t border-border mt-6 pt-3 font-mono text-[8px] uppercase tracking-[0.15em] text-muted-foreground'>
        <div>Drawing · Sec-A-01</div>
        <div>Rev · 04</div>
        <div className='hidden sm:block'>{'Sys.V1_Stable // No_Exit_Traffic'}</div>
      </div>
    </div>
  )
}
