'use client'

import type { DiagramNode } from '@atta/aeg-core'
import { GitBranch } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { bandCentroid, bandRingPath, CENTER, drillArcs, HUB_RADIUS, overviewBands, VIEW_SIZE } from '../_lib/geometry'
import { humanLabel } from '../_lib/display-label'
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
const RING_FILL_SOFT: Record<BandKey, string> = {
  actors: 'fill-success/25',
  contracts: 'fill-background',
  ring0: 'fill-warning/25',
  actions: 'fill-background',
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
const RING_LEGEND_DOT: Record<BandKey, string> = {
  actors: 'bg-success/45',
  contracts: 'bg-background border border-border',
  ring0: 'bg-warning/45',
  actions: 'bg-background border border-border',
  substrate: 'bg-chart-1/45',
  ring1: 'bg-chart-1/70',
  ring2: 'bg-chart-1'
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
 * Wedge labels must be short — a verb phrase, not the full descriptive
 * sentence a doctrine row's `action` column can carry (e.g. "Opening a task
 * PR (final self-check before creation)"). Cuts at the first clause
 * boundary, then hard-truncates as a last resort. The FULL, untruncated
 * `node.label` still renders in the leaf panel once that node is clicked —
 * this only shortens what's crammed into a small pie slice.
 */
function shortWedgeLabel(label: string, maxChars = 24): string {
  // `\/` requires surrounding whitespace so it only matches a genuine
  // alternate-phrasing slash ("...brief) / starting Step 0..."), never a
  // slash inside a compound word ("role/contract", "hook/CLI") — those must
  // survive intact, not get chopped down to "role"/"hook".
  const clause = label.split(/ \(| \/ |—|–|: /)[0]?.trim() ?? label
  if (clause.length <= maxChars) return clause
  return `${clause.slice(0, maxChars - 1).trimEnd()}…`
}

/**
 * Round-4 rule: font size has a hard floor everywhere on this page — a
 * label that doesn't fit truncates with `…`, it never shrinks the font to
 * squeeze in. Used for the hub's center label, the one spot with no other
 * truncation already in place (`shortWedgeLabel` handles wedges).
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

  const bandLabel = (band: (typeof bands)[number]): string =>
    band.key === 'substrate' ? SUBSTRATE_LABEL : (groups.find((g) => g.key === band.key)?.label ?? '')

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
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
                  ? `cursor-pointer stroke-primary ${RING_FILL_SOFT[key]} ${NO_NATIVE_OUTLINE}`
                  : `cursor-pointer ${RING_STROKE[key]} ${RING_FILL_SOFT[key]} ${RING_FILL_HOVER[key]} transition-colors ${NO_NATIVE_OUTLINE}`
              }
              strokeWidth={selected ? 2.5 : 1.5}
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
                className='pointer-events-none fill-foreground font-mono text-xl font-bold uppercase tracking-wide'
              >
                {bandLabel(band)}
              </text>
            )
          })}

        {drilledGroup?.children.map((node) => {
          const arc = drilledArcs.find((a) => a.id === node.id)
          if (!arc) return null
          // Tailwind size scale, not an arbitrary px value — `text-xl`.
          const lines = wrapLabel(shortWedgeLabel(humanLabel(node.label)), 12)
          return (
            <g key={`drill-label-${node.id}`} className='pointer-events-none'>
              {lines.map((line, li) => (
                <text
                  key={`${node.id}-${li}`}
                  x={arc.centroid.x}
                  y={arc.centroid.y + li * 26 - ((lines.length - 1) * 26) / 2}
                  textAnchor='middle'
                  dominantBaseline='middle'
                  className='fill-foreground font-mono text-xl font-medium'
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
      </g>

      {/* Static hub — "main" is the literal git branch this whole mechanism
          protects; framing only, not a DiagramNode (D-087: no fabricated node).
          Drilled radius is way bigger than the +16 it used to be — with
          DRILL_R_IN at 400, a 146px hub left a huge dead ring of empty space
          between it and the wedges; 380 actually uses that space. */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={drilledGroup ? 380 : HUB_RADIUS}
        className={`fill-secondary stroke-border ${drilledGroup ? `cursor-pointer ${NO_NATIVE_OUTLINE}` : ''}`}
        strokeWidth={1.5}
        {...(drilledGroup ? interactiveProps('Back to overview', onBack) : {})}
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
      {/* Tailwind size scale only, no arbitrary px. Drilled-state text scaled
          up to match the bigger hub — `text-6xl`/`text-2xl`, not the old
          24px/12px that read tiny inside a 380-radius circle. Title wraps
          to 2 lines before truncating — a 380-radius hub has the room, no
          reason to ellipsis a label that would fit on a second row. */}
      {drilledGroup ? (
        <>
          {hubTitle.map((line, li) => (
            <text
              key={`hub-title-${li}`}
              x={CENTER.x}
              y={CENTER.y - 10 + li * 58 - ((hubTitle.length - 1) * 58) / 2}
              textAnchor='middle'
              className='fill-secondary-foreground font-mono font-bold text-6xl'
            >
              {line}
            </text>
          ))}
          <text
            x={CENTER.x}
            y={CENTER.y - 10 + ((hubTitle.length - 1) * 58) / 2 + 70}
            textAnchor='middle'
            className='fill-muted-foreground font-mono text-2xl uppercase tracking-wide'
          >
            {drilledGroup.children.length} node(s) — back
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
            className='fill-muted-foreground font-mono text-xs uppercase tracking-wide'
          >
            protected
          </text>
        </>
      )}
    </svg>
  )
}

export function DiagramLegend({ groups }: { groups: DiagramGroup[] }) {
  return (
    <div className='flex flex-col gap-2'>
      {groups.map((group) => (
        <div key={group.key} className='flex items-center gap-1.5'>
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${RING_LEGEND_DOT[group.key]}`} />
          <span className='font-mono text-muted-foreground text-xs'>{group.label}</span>
        </div>
      ))}
      <div className='flex items-center gap-1.5'>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${RING_LEGEND_DOT.substrate}`} />
        <span className='font-mono text-muted-foreground text-xs'>{SUBSTRATE_LABEL}</span>
      </div>
    </div>
  )
}
