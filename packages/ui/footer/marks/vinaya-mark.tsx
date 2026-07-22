// A small STATIC version of the landing page's harness emblem — the ring (four segments with
// gaps on the axes, exactly like HarnessStructure), clamp arms reaching in, corner screws, and
// the protected `main` core. SVG (not canvas): crisp at 16–32px, inherits `currentColor`, no
// animation loop. The full animated harness lives on the landing; this is its resting silhouette.
const RING_ROT = [0, 90, 180, 270]
const SCREWS: ReadonlyArray<readonly [number, number]> = [
  [78.3, 78.3],
  [21.7, 78.3],
  [21.7, 21.7],
  [78.3, 21.7]
]

export function VinayaMark({ className }: { className?: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' className={className} aria-hidden='true'>
      <g fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round'>
        {RING_ROT.map((r) => (
          <g key={r} transform={`rotate(${r} 50 50)`}>
            {/* one ring segment on the diagonal — the gaps land on the N/E/S/W axes */}
            <path d='M89.3 57.6 A40 40 0 0 1 57.6 89.3' strokeWidth='6' />
            {/* clamp arm reaching in toward main */}
            <line x1='71.2' y1='71.2' x2='62.7' y2='62.7' strokeWidth='5' />
          </g>
        ))}
        {/* protected main */}
        <circle cx='50' cy='50' r='13' strokeWidth='6' />
      </g>
      {/* corner screws at each segment centre + main's core */}
      {SCREWS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r='4.2' fill='currentColor' />
      ))}
      <circle cx='50' cy='50' r='4' fill='currentColor' />
    </svg>
  )
}
