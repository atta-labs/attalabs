/** Concentric rings — the same orbit-ring motif the landing page's own "protected main"
 * diagram uses, reused here as Vinaya's mark rather than inventing an unrelated glyph. */
export function VinayaMark({ className }: { className?: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' className={className} aria-hidden='true'>
      <g fill='none' stroke='currentColor' strokeWidth='10'>
        <circle cx='100' cy='100' r='90' strokeDasharray='14 10' />
        <circle cx='100' cy='100' r='60' strokeDasharray='14 10' />
      </g>
      <circle cx='100' cy='100' r='16' fill='currentColor' />
    </svg>
  )
}
