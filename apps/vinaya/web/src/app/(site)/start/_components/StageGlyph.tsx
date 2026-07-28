import type { ReactNode, SVGProps } from 'react'
import type { StageId } from '../_lib/stages'

/**
 * One parameterised glyph, not seven bespoke marks — `StageGlyph` draws a
 * single stage's own picture: what it receives (left), what it does
 * (center), what it hands on (right). Each glyph is meaningful read alone,
 * on that stage's own page; the overview (`LoopComposition.tsx`) composes
 * the same seven read-only glyphs into the loop's real shape rather than
 * cropping one master image.
 *
 * Bespoke-SVG precedent: `(site)/roadmap/_components/RoadmapMarks.tsx`.
 * Same two rules apply — these are diagrams, not icons (each draws the
 * SHAPE of the hand-off, not a generic glyph standing in for it), and
 * monoline `currentColor` only, so every glyph inherits the surrounding
 * text token and stays theme-correct in every library and colour scheme.
 *
 * The shapes are hand-authored from `_lib/stages.ts`'s `receives`/`produces`
 * copy, which is itself read from the doctrine's contract files — never
 * derived from a live model at runtime (Issue #696's explicit OUT clause).
 * Where an artifact crosses a seam unchanged, the SAME shape is reused on
 * both sides of it: Brief's output ticket is Develop's input ticket; the
 * open pull request Develop produces is what Review and Security both
 * receive; only Archive's copy of it gains the merged accent.
 */

export type StageGlyphProps = {
  stageId: StageId
  className?: string
}

const FRAME = {
  viewBox: '0 0 132 40',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true
} satisfies SVGProps<SVGSVGElement>

const INPUT_X = 16
const TRANSFORM_X = 66
const OUTPUT_X = 116
const CENTER_Y = 20
const GAP = 11

/** The two connecting arrows sit at the same fixed offsets for every stage —
 * only the input/transform/output shapes change. */
function FlowArrows() {
  return (
    <>
      <path d={`M${INPUT_X + GAP} ${CENTER_Y}H${TRANSFORM_X - GAP}`} />
      <path
        d={`M${TRANSFORM_X - GAP - 3} ${CENTER_Y - 2.5}L${TRANSFORM_X - GAP} ${CENTER_Y}L${TRANSFORM_X - GAP - 3} ${CENTER_Y + 2.5}`}
      />
      <path d={`M${TRANSFORM_X + GAP} ${CENTER_Y}H${OUTPUT_X - GAP}`} />
      <path
        d={`M${OUTPUT_X - GAP - 3} ${CENTER_Y - 2.5}L${OUTPUT_X - GAP} ${CENTER_Y}L${OUTPUT_X - GAP - 3} ${CENTER_Y + 2.5}`}
      />
    </>
  )
}

/** An intent — Plan's input, before there is any tracked artifact yet: a
 * spark, not a document. */
function Intent({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <circle cx='0' cy='0' r='3' />
      <path d='M0 -7V-9.5M0 7V9.5M-7 0H-9.5M7 0H9.5M-4.9 -4.9 -6.7 -6.7M4.9 -4.9 6.7 -6.7M-4.9 4.9 -6.7 6.7M4.9 4.9 6.7 6.7' />
    </g>
  )
}

/** A tracked document — an Issue (`accent='dot'`), a written brief
 * (`accent='diamond'`), or a closed Issue carrying its provenance record
 * (`accent='check'`). Same ticket shape throughout; only the corner accent
 * changes, because the doctrine draws these as the same kind of artifact at
 * different points in its life. */
function Ticket({ x, accent }: { x: number; accent: 'dot' | 'diamond' | 'check' }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <rect x='-9' y='-7' width='18' height='14' rx='2' />
      <path d='M-5.5 -2.5H5.5M-5.5 2H2.5' />
      {accent === 'dot' && <circle cx='6.5' cy='-8.5' r='1.6' fill='currentColor' />}
      {accent === 'diamond' && (
        <rect x='4.9' y='-10.1' width='3.2' height='3.2' fill='currentColor' transform='rotate(45 6.5 -8.5)' />
      )}
      {accent === 'check' && (
        <g transform='translate(7 8.5)'>
          <circle cx='0' cy='0' r='3.4' />
          <path d='M-1.4 0 -0.1 1.4 1.9 -1.3' />
        </g>
      )}
    </g>
  )
}

/** The pull request — the one artifact that crosses three seams unchanged:
 * open when Develop hands it to Review and Security, merged (filled branch
 * node) only in the copy Archive receives. */
function PullRequestMark({ x, merged }: { x: number; merged?: boolean }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-6 -9V9' />
      <circle cx='-6' cy='-9' r='2.2' />
      <circle cx='-6' cy='9' r='2.2' />
      <path d='M-6 0Q1 0 6 -6' />
      <circle cx='6' cy='-6' r='2.2' fill={merged ? 'currentColor' : 'none'} />
      <path d='M9 -9H11.5M9 -6H12.5M9 -3H10.5' strokeWidth='1.1' />
    </g>
  )
}

/** A verdict comment — the same speech-bubble scaffold for Review and
 * Security alike, differing only in the subject inside it: a check for the
 * correctness verdict, a shield for the security one. Two things, one
 * pull request. */
function VerdictBubble({ x, accent }: { x: number; accent: 'check' | 'shield' }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-9 -8H9Q10 -8 10 -7V2Q10 3 9 3H-2L-6 7V3H-9Q-10 3 -10 2V-7Q-10 -8 -9 -8Z' />
      {accent === 'check' ? (
        <path d='M-4 -2.3 -1 0.7 4 -4.3' />
      ) : (
        <path d='M0 -4.3 3 -3 3 -0.4C3 1.8 1.5 3 0 3.7 -1.5 3 -3 1.8 -3 -0.4V-3Z' />
      )}
    </g>
  )
}

/** The tranche itself — a milestone bar over its labeled Issues. Plan
 * produces it freshly open (hollow nodes); Wrap-up receives it finished
 * (filled nodes, every task merged) — the same shape, a different moment. */
function Tranche({ x, done }: { x: number; done?: boolean }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-9 -6H9' />
      <path d='M-6 -6V-1M0 -6V-1M6 -6V-1' />
      <circle cx='-6' cy='2.5' r='2' fill={done ? 'currentColor' : 'none'} />
      <circle cx='0' cy='2.5' r='2' fill={done ? 'currentColor' : 'none'} />
      <circle cx='6' cy='2.5' r='2' fill={done ? 'currentColor' : 'none'} />
      {done && <path d='M-3 8 -1 10 4 5' />}
    </g>
  )
}

/** Retrospective + closed milestone — Wrap-up's own output, deliberately
 * NOT the Tranche shape again: closing the tranche is a distinct act from
 * the finished-but-unclosed state Wrap-up received. */
function Retrospective({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-8 -6H-2L0 -8H8V6H-8Z' />
      <path d='M-5 -1H5M-5 2H2' />
      <path d='M4 5 6 7 9 2.5' />
    </g>
  )
}

/** Distilling an intent into scope — a funnel, narrowing. */
function Funnel({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-8 -8H8L2 2V8H-2V2Z' />
    </g>
  )
}

/** Writing the exact instructions — a pen, mid-stroke. */
function Pen({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-6 8 6 -7' />
      <path d='M6 -7 2.7 -7 2.7 -3.7Z' fill='currentColor' />
    </g>
  )
}

/** Writing the code — angle brackets. */
function AngleBrackets({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-2 -8 -8 0 -2 8' />
      <path d='M2 -8 8 0 2 8' />
    </g>
  )
}

/** Judging it against the brief — a magnifying glass. */
function Magnifier({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <circle cx='-1.5' cy='-2' r='5.5' />
      <path d='M2.6 2.6 8 8' />
    </g>
  )
}

/** Checking what a correctness review does not — a shield. */
function Shield({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M0 -9 7 -6.2V1C7 6 3.5 8.7 0 10 -3.5 8.7 -7 6 -7 1V-6.2Z' />
    </g>
  )
}

/** Making the record permanent — a stamp. */
function Stamp({ x }: { x: number }) {
  const ticks = [0, 60, 120, 180, 240, 300].map((degrees) => {
    const radians = (degrees * Math.PI) / 180
    const x1 = Math.cos(radians) * 6
    const y1 = Math.sin(radians) * 6
    const x2 = Math.cos(radians) * 8.5
    const y2 = Math.sin(radians) * 8.5
    return { degrees, x1, y1, x2, y2 }
  })
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <circle cx='0' cy='0' r='4.5' />
      {ticks.map((tick) => (
        <line key={tick.degrees} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} />
      ))}
    </g>
  )
}

/** Declaring the tranche done — a flag. */
function Flag({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} ${CENTER_Y})`}>
      <path d='M-5 -9V9' />
      <path d='M-5 -9H5L2 -5 5 -1H-5Z' />
    </g>
  )
}

const GLYPHS: Record<StageId, ReactNode> = {
  plan: (
    <>
      <Intent x={INPUT_X} />
      <Funnel x={TRANSFORM_X} />
      <Tranche x={OUTPUT_X} />
    </>
  ),
  brief: (
    <>
      <Ticket x={INPUT_X} accent='dot' />
      <Pen x={TRANSFORM_X} />
      <Ticket x={OUTPUT_X} accent='diamond' />
    </>
  ),
  develop: (
    <>
      <Ticket x={INPUT_X} accent='diamond' />
      <AngleBrackets x={TRANSFORM_X} />
      <PullRequestMark x={OUTPUT_X} />
    </>
  ),
  review: (
    <>
      <PullRequestMark x={INPUT_X} />
      <Magnifier x={TRANSFORM_X} />
      <VerdictBubble x={OUTPUT_X} accent='check' />
    </>
  ),
  security: (
    <>
      <PullRequestMark x={INPUT_X} />
      <Shield x={TRANSFORM_X} />
      <VerdictBubble x={OUTPUT_X} accent='shield' />
    </>
  ),
  archive: (
    <>
      <PullRequestMark x={INPUT_X} merged />
      <Stamp x={TRANSFORM_X} />
      <Ticket x={OUTPUT_X} accent='check' />
    </>
  ),
  'wrap-up': (
    <>
      <Tranche x={INPUT_X} done />
      <Flag x={TRANSFORM_X} />
      <Retrospective x={OUTPUT_X} />
    </>
  )
}

export function StageGlyph({ stageId, className }: StageGlyphProps) {
  return (
    <svg {...FRAME} className={className}>
      <FlowArrows />
      {GLYPHS[stageId]}
    </svg>
  )
}
