'use client'

import type { DiagramNode } from '@attalabs/aeg-core'
import { GitBranch } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { bandCentroid, bandRingPath, CENTER, drillArcs, HUB_RADIUS, overviewBands, VIEW_SIZE } from '../_lib/geometry'
import { humanLabel, ringBadgeLabels, shortLabel } from '../_lib/display-label'
import type { DiagramGroup, GroupKey } from '../_lib/groupings'

type BandKey = GroupKey | 'substrate'

type Props = {
  groups: DiagramGroup[]
  drilledGroup: DiagramGroup | null
  selectedLeafId: string | null
  onDrill: (key: GroupKey) => void
  onBack: () => void
  onSelectLeaf: (node: DiagramNode) => void
}

/**
 * Literal Tailwind class strings (never built by template interpolation —
 * Tailwind's source scanner needs the exact substring present in this
 * file, not assembled at runtime). Real shadcn tokens only.
 *
 * Three "spheres," not seven arbitrary hues — actors reads as the positive
 * outcome (`success`: the actors are the trusted starting point), ring0 as
 * the attention band (`warning`: the last local gate before anything
 * leaves the machine), and "inside GitHub" (substrate + ring1 + ring2
 * together) shares one `chart-1` hue, told apart from each other by
 * opacity alone so the eye reads "one GitHub zone with depth," not three
 * unrelated colors. The two seam rings (contracts, actions) are hand-offs,
 * not mechanisms — they punch through as the `background` token itself (a
 * literal gap in the color wheel), outlined in `border` so the gap still
 * reads as a deliberate band and not a rendering hole.
 *
 * actors/ring0 fills are softened to the same opacity-tier style as the
 * GitHub zone (explicit ask) — full-strength `success`/`warning` read too
 * loud next to the translucent `chart-1` tiers; stroke stays full-opacity
 * so the ring's own edge/identity doesn't go soft too.
 */
const RING_STROKE: Record<BandKey, string> = {
  actors: 'stroke-success',
  contracts: 'stroke-border',
  ring0: 'stroke-warning',
  actions: 'stroke-border',
  substrate: 'stroke-chart-1/50',
  ring1: 'stroke-chart-1/75',
  ring2: 'stroke-chart-1'
}
const RING_FILL: Record<BandKey, string> = {
  actors: 'fill-success/45',
  contracts: 'fill-background',
  ring0: 'fill-warning/45',
  actions: 'fill-background',
  substrate: 'fill-chart-1/45',
  ring1: 'fill-chart-1/70',
  ring2: 'fill-chart-1'
}
/** Wedge fills — the drilled state only (the overview's own bands use
 * `RING_FILL`). The two seam keys break from their `fill-background` band
 * treatment here and take a real `muted` fill: "a gap in the colour wheel"
 * only reads as a gap while a coloured ring sits on either side of it. Drilled,
 * those neighbours are gone, and background-on-background rendered the wedges
 * invisible — a literal blank screen. `muted` keeps them out of the categorical
 * palette (they are still hand-offs, not mechanisms — no `success`/`warning`/
 * `chart-1` hue is claimed) while actually being visible. */
const RING_FILL_SOFT: Record<BandKey, string> = {
  actors: 'fill-success/25',
  contracts: 'fill-muted',
  ring0: 'fill-warning/25',
  actions: 'fill-muted',
  substrate: 'fill-chart-1/20',
  ring1: 'fill-chart-1/32',
  ring2: 'fill-chart-1/45'
}
const RING_FILL_HOVER: Record<BandKey, string> = {
  actors: 'hover:fill-success/65',
  contracts: 'hover:fill-accent/20',
  ring0: 'hover:fill-warning/65',
  actions: 'hover:fill-accent/20',
  substrate: 'hover:fill-chart-1/35',
  ring1: 'hover:fill-chart-1/50',
  ring2: 'hover:fill-chart-1/65'
}
/** The selected wedge's fill — deliberately the same value each key's hover
 * uses, so selection reads as "this one stayed lit". Selection was an outline
 * before: a hairline the eye has to hunt for, on a shape whose neighbours all
 * carry one already. Depth is the property a pie chart has going spare, so
 * selection spends that instead. Kept as its own map rather than reusing
 * `RING_FILL_HOVER` with the prefix stripped, because Tailwind's scanner needs
 * the literal class string present in this file. */
const RING_FILL_SELECTED: Record<BandKey, string> = {
  actors: 'fill-success/65',
  contracts: 'fill-accent/20',
  ring0: 'fill-warning/65',
  actions: 'fill-accent/20',
  substrate: 'fill-chart-1/35',
  ring1: 'fill-chart-1/50',
  ring2: 'fill-chart-1/65'
}

const SUBSTRATE_LABEL = 'GitHub'

/** Seam bands (`contracts`, `actions`) fill as `background` — the same
 * color as the page itself — so their outline is the only thing that makes
 * the band read as a band at all; a 1px stroke disappears at this scale. */
const SEAM_STROKE_WIDTH = 2.5
function bandStrokeWidth(key: BandKey): number {
  return key === 'contracts' || key === 'actions' ? SEAM_STROKE_WIDTH : 1
}

/**
 * Round-4 rule: font size has a hard floor everywhere on this page — a
 * label that doesn't fit truncates with `…`, it never shrinks the font to
 * squeeze in. Used for the hub's center label, the one spot with no other
 * truncation already in place (`shortLabel` handles wedges).
 */
function truncateWithEllipsis(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label
  return `${label.slice(0, maxChars - 1).trimEnd()}…`
}

function wrapLabel(label: string, max: number): string[] {
  const words = label.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > max && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

/** The hub's center label gets 2 rows before it truncates — a 380-radius
 * drilled hub has the room for a second line; there's no reason to ellipsis
 * a label at row 1 that would fit whole across two. */
function hubTitleLines(label: string, maxCharsPerLine = 12): string[] {
  const lines = wrapLabel(label, maxCharsPerLine)
  if (lines.length <= 2) return lines
  return [lines[0] ?? '', truncateWithEllipsis(lines.slice(1).join(' '), maxCharsPerLine)]
}

/**
 * Interactive `<button>` semantics on an SVG shape — no native `<button>`
 * inside `<svg>`, so this is the accessible equivalent for a clickable arc.
 *
 * `outline-none` is load-bearing, not cosmetic: the base layer applies
 * `outline-ring/50` to every element (`globals.css`), and a focusable `path`
 * gets a native focus outline on click same as any other focusable element —
 * but CSS `outline` is always an axis-aligned rectangle around the element's
 * bounding box, never the shape itself, so on a curved wedge it rendered as
 * a rectangle overflowing past the arc's own edges. The real selection
 * indicator is the arc's own `d` re-stroked (`stroke-primary` + thicker
 * `strokeWidth` on the selected node, set at each call site) — never a
 * bounding-box overlay. `focus-visible:stroke-ring` keeps a real (keyboard)
 * focus indicator without reintroducing the rectangle.
 */
function interactiveProps(label: string, onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate()
      }
    }
  }
}

const NO_NATIVE_OUTLINE = 'outline-none focus-visible:outline-none focus-visible:stroke-ring'

export function DiagramCanvas({ groups, drilledGroup, selectedLeafId, onDrill, onBack, onSelectLeaf }: Props) {
  const bands = overviewBands(groups.map((g) => g.key))
  const drilledArcs = drilledGroup ? drillArcs(drilledGroup.children.map((n) => n.id)) : []
  const translate = `translate(${CENTER.x} ${CENTER.y})`
  const hubTitle = drilledGroup ? hubTitleLines(drilledGroup.label) : []
  const hubLegend = drilledGroup ? ringBadgeLabels(drilledGroup.children) : []
  // The hub stacks title → legend → back, each placed off the one above it
  // rather than off `CENTER` — a ring whose title wraps to two lines, or whose
  // nodes carry no badge, must not leave a hole or collide.
  const hubTitleBottom = CENTER.y - 10 + ((hubTitle.length - 1) * 58) / 2
  const hubLegendY = hubTitleBottom + 62
  const hubBackY = hubLegend.length > 0 ? hubLegendY + 52 : hubLegendY

  const bandLabel = (band: (typeof bands)[number]): string =>
    band.key === 'substrate' ? SUBSTRATE_LABEL : (groups.find((g) => g.key === band.key)?.label ?? '')

  return (
    <svg
      // Crop the square viewBox's built-in whitespace — the overview's
      // outermost band tops out at r≈707 in a 770-centred 1540 box, leaving a
      // ~63px dead margin all round that scaled up to a visible gap above the
      // ring. Inset 36 removes most of it while still clearing the drilled
      // ring (DRILL_R_OUT 730 → outer edge at 40/1500, 4px inside this window).
      viewBox={`36 36 ${VIEW_SIZE - 72} ${VIEW_SIZE - 72}`}
      preserveAspectRatio='xMidYMin meet'
      className='h-full max-h-full w-full max-w-full'
      role='img'
      aria-label='Vinaya enforcement mechanism, rendered from the current doctrine'
    >
      <title>Vinaya enforcement mechanism</title>

      {/* d3.arc()-generated ring/sector paths and their labels, all
          origin-centered and translated into place here rather than baked
          per-shape (the idiomatic d3 pattern). Labels are plain horizontal
          text at each shape's own `d3.arc().centroid()` — no curvature,
          no textPath. */}
      <g transform={translate}>
        {drilledGroup === null &&
          bands.map((band) => {
            const group = groups.find((g) => g.key === band.key)
            const disabled = group?.renderState === 'disabled'
            return (
              <path
                key={band.key}
                d={bandRingPath(band.rIn, band.rOut)}
                opacity={disabled ? 0.45 : 1}
                className={`${group ? `cursor-pointer hover:opacity-80 ${NO_NATIVE_OUTLINE}` : ''} ${RING_FILL[band.key]} ${RING_STROKE[band.key]} transition-opacity`}
                strokeWidth={bandStrokeWidth(band.key)}
                {...(group
                  ? interactiveProps(`${group.label} — ${group.children.length} item(s)`, () => onDrill(group.key))
                  : {})}
              />
            )
          })}

        {drilledGroup?.children.map((node) => {
          const arc = drilledArcs.find((a) => a.id === node.id)
          if (!arc) return null
          const selected = node.id === selectedLeafId
          const disabled = node.renderState === 'disabled'
          const key = drilledGroup.key
          return (
            <path
              key={node.id}
              d={arc.d}
              opacity={disabled ? 0.45 : 1}
              className={
                selected
                  ? `cursor-pointer ${RING_STROKE[key]} ${RING_FILL_SELECTED[key]} transition-colors ${NO_NATIVE_OUTLINE}`
                  : `cursor-pointer ${RING_STROKE[key]} ${RING_FILL_SOFT[key]} ${RING_FILL_HOVER[key]} transition-colors ${NO_NATIVE_OUTLINE}`
              }
              strokeWidth={1.5}
              {...interactiveProps(node.label, () => onSelectLeaf(node))}
            />
          )
        })}

        {drilledGroup === null &&
          bands.map((band) => {
            const c = bandCentroid(band.rIn, band.rOut)
            return (
              <text
                key={`label-${band.key}`}
                x={c.x}
                y={c.y}
                textAnchor='middle'
                dominantBaseline='middle'
                className='pointer-events-none fill-foreground font-mono text-2xl font-bold uppercase tracking-wide'
              >
                {bandLabel(band)}
              </text>
            )
          })}

        {drilledGroup?.children.map((node) => {
          const arc = drilledArcs.find((a) => a.id === node.id)
          if (!arc) return null
          // Tailwind size scale, not an arbitrary px value — `text-2xl`. The
          // y-offset between lines (31) scales with the font: left at 26 (its
          // `text-xl` value) or 39 (its `text-3xl` value) the second line of a
          // wrapped label either overlaps or over-spaces the first.
          const lines = wrapLabel(shortLabel(humanLabel(node.label)), 12)
          return (
            <g key={`drill-label-${node.id}`} className='pointer-events-none'>
              {lines.map((line, li) => (
                <text
                  key={`${node.id}-${li}`}
                  x={arc.centroid.x}
                  y={arc.centroid.y + li * 31 - ((lines.length - 1) * 31) / 2}
                  textAnchor='middle'
                  dominantBaseline='middle'
                  className='fill-foreground font-mono text-2xl font-medium'
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
      </g>

      {/* Static hub — "main" is the literal git branch this whole mechanism
          protects; framing only, not a DiagramNode (no fabricated node).
          Drilled radius is way bigger than the +16 it used to be — with
          DRILL_R_IN at 400, a 146px hub left a huge dead ring of empty space
          between it and the wedges; 380 actually uses that space. */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={drilledGroup ? 380 : HUB_RADIUS}
        className='fill-secondary stroke-border'
        strokeWidth={1.5}
      />
      {drilledGroup === null && (
        <GitBranch
          x={CENTER.x - 24}
          y={CENTER.y - 74}
          width={48}
          height={48}
          strokeWidth={2.5}
          className='pointer-events-none fill-none stroke-secondary-foreground'
        />
      )}
      {/* Tailwind size scale only, no arbitrary px. Drilled-state title scaled
          up to match the bigger hub — `text-6xl`, not the old 24px that read
          tiny inside a 380-radius circle. Title wraps to 2 lines before
          truncating — a 380-radius hub has the room, no reason to ellipsis a
          label that would fit on a second row.
          The hub carries title → legend → back. The child count that used to
          sit here is gone: it restated what the wedges already show. The
          circle itself is inert — only the "← Back" text below takes a click. */}
      {drilledGroup ? (
        <>
          {hubTitle.map((line, li) => (
            <text
              key={`hub-title-${li}`}
              x={CENTER.x}
              y={CENTER.y - 10 + li * 58 - ((hubTitle.length - 1) * 58) / 2}
              textAnchor='middle'
              className='fill-muted-foreground font-mono text-6xl'
            >
              {line}
            </text>
          ))}
          {/* Which kinds of thing this ring holds — the union of its own
              children's badges, so it states what the ring HAS rather than
              what a list somewhere claims it should. A ring whose nodes carry
              no badge (actions, contracts) renders nothing here rather than an
              empty rule. */}
          {hubLegend.length > 0 && (
            <text
              x={CENTER.x}
              y={hubLegendY}
              textAnchor='middle'
              className='fill-muted-foreground font-mono text-2xl uppercase tracking-[0.18em]'
            >
              {hubLegend.join(' · ')}
            </text>
          )}
          {/* Back is its own control, not the whole hub. The hub was the click
              target before — a 380-radius bullseye that looked like a label and
              behaved like a button, so the only way to learn it was to click the
              middle and be surprised.
              Underlined, because it has to LOOK clickable and the two other
              options here are worse: a real `Button` would need a
              `foreignObject` (its own font/px scale fighting the viewBox), and
              a rect-plus-text is hand-rolling a button primitive, which the UI
              rules forbid outright. Underlined text is the one option that is
              styling rather than a new primitive. */}
          <text
            x={CENTER.x}
            y={hubBackY}
            textAnchor='middle'
            className={`cursor-pointer fill-muted-foreground font-mono text-2xl uppercase underline decoration-1 underline-offset-[6px] tracking-[0.12em] transition-colors hover:fill-foreground ${NO_NATIVE_OUTLINE}`}
            {...interactiveProps('Back to overview', onBack)}
          >
            ← Back
          </text>
        </>
      ) : (
        <>
          <text
            x={CENTER.x}
            y={CENTER.y + 20}
            textAnchor='middle'
            className='fill-secondary-foreground font-mono font-bold text-5xl'
          >
            main
          </text>
          <text
            x={CENTER.x}
            y={CENTER.y + 46}
            textAnchor='middle'
            className='fill-muted-foreground font-mono text-lg uppercase tracking-wide'
          >
            protected
          </text>
        </>
      )}
    </svg>
  )
}
