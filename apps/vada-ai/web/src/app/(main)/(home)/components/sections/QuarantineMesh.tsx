'use client'

const NODES: Array<{ x: number; y: number }> = [
  { x: 20, y: 20 },
  { x: 80, y: 30 },
  { x: 140, y: 20 },
  { x: 200, y: 40 },
  { x: 40, y: 80 },
  { x: 100, y: 90 },
  { x: 160, y: 80 },
  { x: 220, y: 100 },
  { x: 20, y: 140 },
  { x: 80, y: 150 },
  { x: 140, y: 140 },
  { x: 200, y: 160 },
  { x: 60, y: 200 },
  { x: 120, y: 210 },
  { x: 180, y: 200 },
  { x: 240, y: 220 }
]

const LINKS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [4, 5],
  [5, 6],
  [6, 7],
  [4, 8],
  [5, 9],
  [6, 10],
  [7, 11],
  [8, 9],
  [9, 10],
  [10, 11],
  [8, 12],
  [9, 13],
  [10, 14],
  [11, 15],
  [12, 13],
  [13, 14],
  [14, 15]
]

export function QuarantineMesh({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 260 240' fill='none' xmlns='http://www.w3.org/2000/svg' aria-hidden className={className}>
      <g stroke='currentColor' strokeWidth={0.6} opacity={0.4}>
        {LINKS.map(([a, b], i) => {
          const from = NODES[a]
          const to = NODES[b]
          if (!from || !to) return null
          return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
        })}
      </g>
      <g fill='currentColor'>
        {NODES.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={2} />
        ))}
      </g>
    </svg>
  )
}
