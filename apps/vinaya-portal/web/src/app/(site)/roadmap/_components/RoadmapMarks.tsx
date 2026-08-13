import { siJira, siLinear } from 'simple-icons'
import type { ReactNode, SVGProps } from 'react'

/**
 * Bespoke concept marks — one per roadmap item. These are **diagrams, not icons**:
 * each draws the SHAPE of the feature rather than a generic glyph standing in
 * for it. RULE 4 bans custom SVG that replaces a STANDARD icon — none of these
 * has a lucide equivalent, and the precedent for bespoke marks in this app is
 * `WorkflowSection.tsx`, whose `simple-icons` brand paths `BoardMark` reuses.
 *
 * Monoline and `currentColor` only, so they inherit the card's text token and
 * stay theme-correct in every library and both color schemes — never a
 * hardcoded palette value.
 *
 * **The two `Configurable *` marks are deliberately one identity**: both render
 * `ConfigRows` — the same three setting rows, track and knob — and differ only
 * in the subject token on the left (a shield for the forge's gates, an agent
 * for the roles). Reading them side by side should say "same control surface,
 * different thing being configured". Keep them in sync: a change to the
 * scaffold belongs in `ConfigRows`, never in one caller.
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

/** Loop Engineering — three stages wired into a closed cycle, one arrow showing it turns. */
export function LoopMark({ className }: MarkProps) {
  return (
    <svg {...FRAME} className={className}>
      <circle cx='24' cy='11' r='3.5' fill='currentColor' stroke='none' />
      <circle cx='35' cy='31' r='3.5' fill='currentColor' stroke='none' />
      <circle cx='13' cy='31' r='3.5' fill='currentColor' stroke='none' />
      <path d='M27.5 13.5Q34 17.5 35 26.5' />
      <path d='M32.5 34Q24 38.5 15.5 34' />
      <path d='M13 26.5Q14 17.5 20.5 13.5' />
      <path d='M18 12.5 20.5 13.5 19.8 16.2' />
    </svg>
  )
}

/** Studio on the web — one deployed window, several people connected to it. */
export function StudioWebMark({ className }: MarkProps) {
  return (
    <svg {...FRAME} className={className}>
      <rect x='8' y='9' width='32' height='21' rx='2.5' />
      <path d='M8 15.5H40' />
      <circle cx='11.8' cy='12.3' r='1' fill='currentColor' stroke='none' />
      <circle cx='15.2' cy='12.3' r='1' fill='currentColor' stroke='none' />
      <path d='M13 21H23M13 25.5H28' />
      <path d='M24 30V33M12 33H36M12 33V36M24 33V36M36 33V36' />
      <circle cx='12' cy='38.5' r='2.4' />
      <circle cx='24' cy='38.5' r='2.4' fill='currentColor' stroke='none' />
      <circle cx='36' cy='38.5' r='2.4' />
    </svg>
  )
}

/**
 * Linear & Jira — both trackers feed ONE board. The real `simple-icons` brand
 * marks (same source `WorkflowSection.tsx` uses) sit above a task board whose
 * card carries the state, so the claim reads "your tool, our state machine".
 */
export function BoardMark({ className }: MarkProps) {
  return (
    <svg {...FRAME} className={className}>
      <g transform='translate(6 3) scale(0.58)' fill='currentColor' stroke='none'>
        <path d={siLinear.path} />
      </g>
      <g transform='translate(28 3) scale(0.58)' fill='currentColor' stroke='none'>
        <path d={siJira.path} />
      </g>
      <path d='M13 19.5v2.5h22v-2.5M24 22v3' />
      <rect x='6' y='25' width='36' height='15' rx='2.5' />
      <path d='M18 25v15M30 25v15' />
      <rect x='9' y='28.5' width='6' height='4' rx='1.25' fill='currentColor' stroke='none' />
    </svg>
  )
}

/**
 * The shared scaffold behind both `Configurable *` marks — three setting rows,
 * each a subject token, a track, and a knob parked at a different value so the
 * set reads as "tunable, not fixed". `Subject` draws one row's token at (11, y);
 * everything else is identical by construction, which is the whole point.
 */
function ConfigRows({ Subject }: { Subject: (p: { y: number }) => ReactNode }) {
  // Knob x varies per row (and the middle one is hollow = off) so the three
  // rows read as independently set rather than as one repeated glyph.
  const ROWS = [
    { y: 12, knob: 34, on: true },
    { y: 24, knob: 23, on: false },
    { y: 36, knob: 31, on: true }
  ]
  return (
    <>
      {ROWS.map((row) => (
        <g key={row.y}>
          <Subject y={row.y} />
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
    </>
  )
}

/** Configurable forge — the subject is a gate: each security check, switchable. */
export function GatesMark({ className }: MarkProps) {
  return (
    <svg {...FRAME} className={className}>
      <ConfigRows
        Subject={({ y }) => (
          <path d={`M11 ${y - 4.2}l3.2 1.4v2.3c0 1.7-1.3 2.9-3.2 3.5-1.9-.6-3.2-1.8-3.2-3.5v-2.3z`} />
        )}
      />
    </svg>
  )
}

/** Configurable roles — same control surface, but the subject is an agent. */
export function RolesMark({ className }: MarkProps) {
  return (
    <svg {...FRAME} className={className}>
      <ConfigRows
        Subject={({ y }) => (
          <>
            <circle cx='11' cy={y - 2} r='1.9' />
            <path d={`M7.6 ${y + 3.4}a3.4 3.4 0 0 1 6.8 0`} />
          </>
        )}
      />
    </svg>
  )
}
