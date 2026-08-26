import type { SVGProps } from 'react'

/**
 * Bespoke concept marks — **diagrams, not icons**: each draws the SHAPE of the
 * thing rather than a generic glyph standing in for it. RULE 4 bans custom SVG
 * that replaces a STANDARD icon — `GatesMark` (nav's Config icon) has no lucide
 * equivalent.
 *
 * Monoline and `currentColor` only, so it inherits the card's text token and
 * stays theme-correct in every library and both color schemes — never a
 * hardcoded palette value.
 */
type MarkProps = { className?: string }

const FRAME = {
  viewBox: '0 0 48 48',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} satisfies SVGProps<SVGSVGElement>

/**
 * Configurable forge — three setting rows (a gate token, a track, a knob parked at a
 * different value per row so the set reads as "tunable, not fixed") — the subject is a
 * gate: each security check, switchable.
 */
export function GatesMark({ className }: MarkProps) {
  // Knob x varies per row (and the middle one is hollow = off) so the three
  // rows read as independently set rather than as one repeated glyph.
  const ROWS = [
    { y: 12, knob: 34, on: true },
    { y: 24, knob: 23, on: false },
    { y: 36, knob: 31, on: true }
  ]
  return (
    <svg {...FRAME} className={className}>
      {ROWS.map((row) => (
        <g key={row.y}>
          <path d={`M11 ${row.y - 4.2}l3.2 1.4v2.3c0 1.7-1.3 2.9-3.2 3.5-1.9-.6-3.2-1.8-3.2-3.5v-2.3z`} />
          <path d={`M18 ${row.y}H39`} />
          <circle
            cx={row.knob}
            cy={row.y}
            r='2.8'
            fill={row.on ? 'currentColor' : 'none'}
            stroke={row.on ? 'none' : 'currentColor'}
          />
        </g>
      ))}
    </svg>
  )
}
