// Herald's real brand mark — one of the two sanctioned SVG reuses in this hero (the other is
// vada-face.tsx); every other mark is canvas-drawn. What makes both sanctioned is that they
// are real product assets rather than decorative art — this is the
// actual Herald logo asset (Sanity `branding-herald.logoOutlineDark/Light`, both resolve to
// the same file: https://cdn.sanity.io/files/e9gbd2d1/production/
// 2639ff863b31a3b517424274ef4ba000d9586922.svg), not a decorative illustration competing with
// canvas — reused verbatim (path data unchanged), `currentColor` stroke so it inherits the
// mark's color like everything else here. Re-sync from that URL if the Sanity asset changes.

export function HeraldLogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 512 512' role='img' aria-label='Herald' className={className}>
      <g fill='none' stroke='currentColor' strokeWidth={7.68} strokeLinecap='round' strokeLinejoin='round'>
        <path d='M 104.9600 76.8000 Q 89.6000 256.0000, 104.9600 435.2000' />
        <path d='M 161.2800 76.8000 Q 145.9200 256.0000, 161.2800 435.2000' />

        <path d='M 407.0400 76.8000 Q 422.4000 256.0000, 407.0400 435.2000' />
        <path d='M 350.7200 76.8000 Q 366.0800 256.0000, 350.7200 435.2000' />

        <path d='M 143.3600 227.8400 Q 256.0000 215.0400, 368.6400 227.8400' />
        <path d='M 143.3600 284.1600 Q 256.0000 271.3600, 368.6400 284.1600' />

        <path d='M 104.9600 76.8000 Q 133.1200 61.4400, 161.2800 76.8000' />
        <path d='M 350.7200 76.8000 Q 378.8800 61.4400, 407.0400 76.8000' />

        <path d='M 104.9600 435.2000 Q 133.1200 450.5600, 161.2800 435.2000' />
        <path d='M 350.7200 435.2000 Q 378.8800 450.5600, 407.0400 435.2000' />

        <path d='M 215.0400 268.8000 Q 215.0400 261.1200, 222.7200 261.1200 L 289.2800 261.1200 Q 296.9600 261.1200, 296.9600 268.8000 L 296.9600 368.6400 Q 296.9600 373.7600, 291.8400 371.2000 L 256.0000 343.0400 Q 256.0000 340.4800, 253.4400 343.0400 L 220.1600 371.2000 Q 215.0400 373.7600, 215.0400 368.6400 Z' />
      </g>
      <circle cx={256} cy={256} r={7.68} fill='currentColor' />
    </svg>
  )
}
