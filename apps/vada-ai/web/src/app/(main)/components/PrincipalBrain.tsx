'use client'

type BN = { x: number; y: number; d: number }

// [x, y, depth]  depth: 0=deep/back → 1=surface/front
const L: [number, number, number][] = [
  // ── Outer surface (d 0.80–0.95) ─────────────────────────────────────────
  [-13, -108, 0.92],
  [-30, -118, 0.88],
  [-52, -124, 0.85],
  [-76, -120, 0.83],
  [-100, -106, 0.8],
  [-120, -86, 0.82],
  [-138, -58, 0.86],
  [-146, -22, 0.92],
  [-146, 14, 0.92],
  [-138, 46, 0.86],
  [-124, 70, 0.8],
  [-104, 86, 0.82],
  [-76, 94, 0.82],
  [-46, 92, 0.86],
  [-18, 82, 0.9],
  // Extra surface bumps (gyral crests)
  [-20, -95, 0.88],
  [-42, -112, 0.86],
  [-66, -116, 0.84],
  [-88, -110, 0.82],
  [-110, -96, 0.8],
  [-128, -72, 0.84],
  [-142, -38, 0.9],
  [-144, 32, 0.88],
  [-130, 58, 0.82],
  [-110, 78, 0.8],
  [-80, 92, 0.84],
  [-54, 96, 0.88],

  // ── Sub-surface (d 0.62–0.80) ─────────────────────────────────────────
  [-25, -90, 0.78],
  [-48, -102, 0.72],
  [-74, -98, 0.68],
  [-98, -82, 0.66],
  [-118, -60, 0.7],
  [-130, -28, 0.74],
  [-134, 6, 0.78],
  [-128, 36, 0.72],
  [-114, 60, 0.68],
  [-90, 76, 0.65],
  [-62, 80, 0.68],
  [-34, 74, 0.72],
  // Sulcal walls (just inside surface bumps)
  [-35, -95, 0.75],
  [-58, -108, 0.7],
  [-84, -104, 0.66],
  [-106, -90, 0.64],
  [-124, -68, 0.68],
  [-136, -42, 0.76],
  [-136, 20, 0.76],
  [-120, 50, 0.68],
  [-96, 70, 0.64],
  [-68, 76, 0.68],
  [-42, 80, 0.72],

  // ── Mid-depth gyral folds (d 0.40–0.62) ───────────────────────────────
  [-38, -72, 0.6],
  [-64, -80, 0.55],
  [-90, -68, 0.52],
  [-112, -46, 0.5],
  [-118, -10, 0.58],
  [-114, 24, 0.54],
  [-100, 48, 0.5],
  [-78, 60, 0.48],
  [-52, 62, 0.52],
  [-30, 52, 0.56],
  // Inner gyral ridge
  [-54, -52, 0.6],
  [-78, -40, 0.56],
  [-94, -14, 0.52],
  [-86, 20, 0.5],
  [-65, 36, 0.54],
  [-40, 24, 0.58],
  // Additional fold texture
  [-45, -60, 0.58],
  [-70, -62, 0.52],
  [-96, -48, 0.48],
  [-108, -22, 0.54],
  [-104, 10, 0.52],
  [-92, 36, 0.48],
  [-72, 48, 0.5],
  [-50, 50, 0.54],
  [-32, 40, 0.58],

  // ── Interior (d 0.20–0.40) ────────────────────────────────────────────
  [-42, -42, 0.38],
  [-64, -25, 0.35],
  [-78, -2, 0.32],
  [-70, 24, 0.3],
  [-50, 34, 0.34],
  [-35, 16, 0.38],
  [-56, 8, 0.28],
  [-70, -15, 0.32],
  [-46, -12, 0.36],
  [-60, -35, 0.36],
  [-80, -18, 0.3],
  [-82, 10, 0.28],
  [-64, 18, 0.32],

  // ── Deep core (d 0.05–0.20) ──────────────────────────────────────────
  [-50, -20, 0.18],
  [-62, -8, 0.14],
  [-58, 12, 0.12],
  [-45, 4, 0.1],
  [-52, -4, 0.08],
  [-60, 4, 0.06],
  [-48, -10, 0.16],
  [-56, 0, 0.1]
]

const LEFT_NODES: BN[] = L.map(([x, y, d]) => ({ x, y, d }))
const RIGHT_NODES: BN[] = L.map(([x, y, d]) => ({ x: -x, y, d }))

function buildEdges(nodes: BN[], maxDist: number): [number, number][] {
  const edges: [number, number][] = []
  const counts = new Array<number>(nodes.length).fill(0)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (counts[i]! >= 7 || counts[j]! >= 7) continue
      const a = nodes[i]!
      const b = nodes[j]!
      const dx = a.x - b.x
      const dy = a.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < maxDist && Math.abs(a.d - b.d) < 0.48) {
        edges.push([i, j])
        counts[i]!++
        counts[j]!++
      }
    }
  }
  return edges
}

const LEFT_EDGES = buildEdges(LEFT_NODES, 54)
const RIGHT_EDGES = buildEdges(RIGHT_NODES, 54)

const ACTIVE = 'hsl(185 85% 65%)'
const DIM = 'hsl(210 15% 30%)'

function nr(d: number) {
  return 1.4 + d * 5.2
}
function nodeIdleOp(d: number) {
  return 0.04 + d * 0.16
}
function nodeActiveOp(d: number) {
  return 0.65 + d * 0.3
}
function edgeIdleOp(d: number) {
  return 0.03 + d * 0.12
}
function edgeActiveOp(d: number) {
  return 0.18 + d * 0.62
}
function ew(d: number) {
  return 0.3 + d * 1.2
}

// Sort by depth ascending so front nodes render on top in SVG
const LEFT_SORTED = [...LEFT_NODES].map((n, i) => ({ ...n, i })).sort((a, b) => a.d - b.d)

export function PrincipalBrain({ leftActive }: { leftActive: boolean }) {
  return (
    <>
      <style>{`
        @keyframes bn-fire {
          0%   { fill-opacity: var(--ni); }
          12%  { fill-opacity: 1.0; }
          50%  { fill-opacity: var(--na); }
          100% { fill-opacity: var(--na); }
        }
        @keyframes be-fire {
          0%   { stroke-opacity: var(--ei); }
          12%  { stroke-opacity: var(--ep); }
          100% { stroke-opacity: var(--ea); }
        }
      `}</style>

      <svg width={320} height={260} viewBox='-160 -130 320 260' style={{ overflow: 'visible' }}>
        <defs>
          <filter id='pb-glow' x='-80%' y='-80%' width='260%' height='260%'>
            <feGaussianBlur stdDeviation='3.5' result='blur' />
            <feMerge>
              <feMergeNode in='blur' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
          <filter id='pb-glow-hi' x='-120%' y='-120%' width='340%' height='340%'>
            <feGaussianBlur stdDeviation='6' result='blur' />
            <feMerge>
              <feMergeNode in='blur' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>

        {/* ── Right hemisphere — always dim, renders behind left ── */}
        {RIGHT_EDGES.map(([a, b], i) => {
          const na = RIGHT_NODES[a]!
          const nb = RIGHT_NODES[b]!
          const d = (na.d + nb.d) / 2
          return (
            <line
              key={`re-${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              style={{ stroke: DIM, strokeWidth: ew(d) * 0.55, strokeOpacity: edgeIdleOp(d) * 0.45 }}
            />
          )
        })}
        {RIGHT_NODES.map(({ x, y, d }, i) => (
          <circle
            key={`rn-${i}`}
            cx={x}
            cy={y}
            r={nr(d) * 0.65}
            style={{ fill: DIM, fillOpacity: nodeIdleOp(d) * 0.45 }}
          />
        ))}

        {/* ── Center fissure ── */}
        <line
          x1={0}
          y1={-122}
          x2={0}
          y2={86}
          style={{ stroke: DIM, strokeWidth: 0.5, strokeOpacity: 0.18, strokeDasharray: '3 8' }}
        />

        {/* ── Left hemisphere edges ── */}
        {LEFT_EDGES.map(([a, b], i) => {
          const na = LEFT_NODES[a]!
          const nb = LEFT_NODES[b]!
          const d = (na.d + nb.d) / 2
          const delay = `${Math.round((1 - d) * 220 + ((a + b) % 7) * 18)}ms`
          const ei = edgeIdleOp(d)
          const ea = edgeActiveOp(d)
          const ep = Math.min(0.95, ea * 1.4)
          return (
            <line
              key={`le-${i}`}
              x1={na.x}
              y1={na.y}
              x2={nb.x}
              y2={nb.y}
              style={
                leftActive
                  ? ({
                      '--ei': ei,
                      '--ep': ep,
                      '--ea': ea,
                      stroke: ACTIVE,
                      strokeWidth: ew(d),
                      animation: `be-fire 0.9s ease ${delay} both`
                    } as React.CSSProperties)
                  : {
                      stroke: DIM,
                      strokeWidth: ew(d) * 0.75,
                      strokeOpacity: ei,
                      transition: 'stroke 0.6s ease, stroke-opacity 0.6s ease'
                    }
              }
            />
          )
        })}

        {/* ── Left hemisphere nodes — back-to-front depth order ── */}
        {LEFT_SORTED.map(({ x, y, d, i }) => {
          const r = nr(d)
          const ni = nodeIdleOp(d)
          const na = nodeActiveOp(d)
          // Front fires first (small delay), back fires later (larger delay)
          const delay = `${Math.round((1 - d) * 240 + ((i * 11) % 80))}ms`
          const glowFilter = d > 0.82 ? 'url(#pb-glow-hi)' : d > 0.5 ? 'url(#pb-glow)' : 'none'
          return (
            <circle
              key={`ln-${i}`}
              cx={x}
              cy={y}
              r={r}
              style={
                leftActive
                  ? ({
                      '--ni': ni,
                      '--na': na,
                      fill: ACTIVE,
                      filter: glowFilter,
                      animation: `bn-fire 0.9s ease ${delay} both`
                    } as React.CSSProperties)
                  : {
                      fill: DIM,
                      fillOpacity: ni,
                      filter: 'none',
                      transition: 'fill 0.5s ease, fill-opacity 0.5s ease, filter 0.4s ease'
                    }
              }
            />
          )
        })}
      </svg>
    </>
  )
}
