'use client'

import type { DiagramNode } from '@atta/aeg-core'
import { Text } from '@atta/ui/shared'
import type { KeyboardEvent } from 'react'
import { CENTER, HUB_RADIUS, VIEW_SIZE, chordPath, drillArcs, overviewBands, polarPoint } from '../_lib/geometry'
import type { ContractChord, DiagramGroup, GroupKey } from '../_lib/groupings'

type Props = {
  groups: DiagramGroup[]
  chords: ContractChord[]
  drilledGroup: DiagramGroup | null
  selectedLeafId: string | null
  onDrill: (key: GroupKey) => void
  onBack: () => void
  onSelectLeaf: (node: DiagramNode) => void
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

/** Interactive `<button>` semantics on an SVG shape — no native `<button>`
 * inside `<svg>`, so this is the accessible equivalent for a clickable arc. */
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

export function DiagramCanvas({ groups, chords, drilledGroup, selectedLeafId, onDrill, onBack, onSelectLeaf }: Props) {
  const bands = overviewBands(groups.map((g) => g.key))
  const drilledArcs = drilledGroup ? drillArcs(drilledGroup.children.map((n) => n.id)) : []

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className='h-auto w-full max-w-[640px]'
      role='img'
      aria-label='Vinaya enforcement mechanism, rendered from the current doctrine'
    >
      <title>Vinaya enforcement mechanism</title>

      {/* Static substrate hub — framing only, not a DiagramNode (D-087: no fabricated node) */}
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={drilledGroup ? HUB_RADIUS + 18 : HUB_RADIUS}
        className='fill-secondary stroke-border'
        strokeWidth={1.5}
        {...(drilledGroup ? interactiveProps('Back to overview', onBack) : {})}
      />
      <text
        x={CENTER.x}
        y={CENTER.y - 4}
        textAnchor='middle'
        className='fill-secondary-foreground font-mono text-[12px] font-bold'
      >
        {drilledGroup ? drilledGroup.label.slice(0, 18) : 'the forge'}
      </text>
      <text x={CENTER.x} y={CENTER.y + 12} textAnchor='middle' className='fill-muted-foreground font-mono text-[9px]'>
        {drilledGroup ? `${drilledGroup.children.length} node(s) — click to return` : 'source of truth'}
      </text>

      {drilledGroup === null &&
        groups.map((group, i) => {
          const band = bands.find((b) => b.key === group.key)
          if (!band) return null
          const disabled = group.renderState === 'disabled'
          const angle = -150 + i * 60
          const pos = polarPoint(band.rMid, angle)
          const lines = wrapLabel(group.label, 14)
          return (
            <g key={group.key} opacity={disabled ? 0.5 : 1}>
              <circle
                cx={CENTER.x}
                cy={CENTER.y}
                r={band.rMid}
                fill='none'
                strokeWidth={band.rOut - band.rIn}
                className='cursor-pointer stroke-secondary transition-colors hover:stroke-accent/60'
                {...interactiveProps(`${group.label} — ${group.children.length} item(s)`, () => onDrill(group.key))}
              />
              {lines.map((line, li) => (
                <text
                  key={line}
                  x={pos.x}
                  y={pos.y + li * 11 - ((lines.length - 1) * 11) / 2}
                  textAnchor='middle'
                  className='pointer-events-none fill-foreground font-mono text-[9px] font-medium'
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}

      {drilledGroup?.children.map((node) => {
        const arc = drilledArcs.find((a) => a.id === node.id)
        if (!arc) return null
        const selected = node.id === selectedLeafId
        const disabled = node.renderState === 'disabled'
        const pos = polarPoint(arc.midRadius, arc.midAngle)
        const lines = wrapLabel(node.label, 14)
        return (
          <g key={node.id} opacity={disabled ? 0.5 : 1}>
            <path
              d={arc.d}
              className={
                selected
                  ? 'cursor-pointer fill-primary/15 stroke-primary'
                  : 'cursor-pointer fill-card stroke-border transition-colors hover:fill-accent/15 hover:stroke-accent'
              }
              strokeWidth={1}
              {...interactiveProps(node.label, () => onSelectLeaf(node))}
            />
            {lines.map((line, li) => (
              <text
                key={line}
                x={pos.x}
                y={pos.y + li * 12 - ((lines.length - 1) * 12) / 2}
                textAnchor='middle'
                className='pointer-events-none fill-card-foreground font-mono text-[10px]'
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}

      {drilledGroup?.key === 'actors' &&
        chords.map((chord) => {
          const producerArc = drilledArcs.find((a) => a.id === chord.producerRoleId)
          const consumerArc = drilledArcs.find((a) => a.id === chord.consumerRoleId)
          if (!producerArc || !consumerArc) return null
          const a = polarPoint(producerArc.midRadius - 4, producerArc.midAngle)
          const b = polarPoint(consumerArc.midRadius - 4, consumerArc.midAngle)
          const selected = chord.id === selectedLeafId
          return (
            <path
              key={chord.id}
              d={chordPath(a, b)}
              fill='none'
              className={
                selected
                  ? 'cursor-pointer stroke-primary'
                  : 'cursor-pointer stroke-muted-foreground/50 transition-colors hover:stroke-accent'
              }
              strokeWidth={selected ? 2 : 1}
              strokeDasharray='2 4'
              {...interactiveProps(`Contract: ${chord.contractNode.label}`, () => onSelectLeaf(chord.contractNode))}
            />
          )
        })}
    </svg>
  )
}

export function DiagramLegendHint() {
  return (
    <Text size='xs' className='font-mono text-muted-foreground'>
      Click a ring to drill in; click a node for its detail. Dashed lines inside Actors are contract hand-offs.
    </Text>
  )
}
