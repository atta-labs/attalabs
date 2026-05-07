'use client'

import { AIACanvas, createFabricRenderer } from '@atta/ui/canvas'
import type { BgRenderer } from '@atta/ui/canvas'
import { Text } from '@atta/ui/shared'
import type { CSSProperties, ReactNode } from 'react'
import { DeliberationGlyph, FocusGlyph, MemoryGlyph, OwnershipGlyph } from './glyphs'
import { useHomeCanvas } from './useHomeCanvas'

const renderFabric: BgRenderer = createFabricRenderer({
  approachSpeedMultiplier: 1,
  forceCompleteAtSphereEdge: true,
  shockWaveOnArrival: true,
  gravityMultiplier: 0,
  waterWave: true
})

// Order matches positions[] below: [top, right, bottom, left].
// Cognitive flow: FOCUS (top, entry) → MEMORY + DELIBERATION (right + bottom, parallel
// processes) → OWNERSHIP (left, the result/landing).
const CONCEPTS = ['FOCUS', 'MEMORY', 'DELIBERATION', 'OWNERSHIP'] as const
const CONCEPT_VARS = ['--concept-focus', '--concept-memory', '--concept-deliberation', '--concept-ownership'] as const
const GLYPH_COMPONENTS = [FocusGlyph, MemoryGlyph, DeliberationGlyph, OwnershipGlyph] as const

// Phase at which each diamond becomes visible. Sequential clockwise reveal:
// FOCUS → MEMORY → DELIBERATION → OWNERSHIP, 400ms apart. Cognitive flow framing
// lives in the labels, not in the animation choreography.
const DIAMOND_VISIBLE_PHASE = [1, 2, 3, 4] as const

// Each diamond's label sits OUTSIDE the diamond on its cardinal direction:
// top diamond → label above, right → label right, bottom → label below,
// left → label left. Frees the inner ring area for the wordmark/tagline and
// reinforces the directional flow visually.
type CardinalDirection = 'top' | 'right' | 'bottom' | 'left'
const LABEL_POSITIONS: readonly CardinalDirection[] = ['top', 'right', 'bottom', 'left'] as const

function labelPositionStyle(direction: CardinalDirection, offset: number): CSSProperties {
  switch (direction) {
    case 'top':
      return { top: -offset, left: 0, transform: 'translate(-50%, -100%)' }
    case 'right':
      return { top: 0, left: offset, transform: 'translate(0, -50%)' }
    case 'bottom':
      return { top: offset, left: 0, transform: 'translate(-50%, 0)' }
    case 'left':
      return { top: 0, left: -offset, transform: 'translate(-100%, -50%)' }
  }
}

// CSS custom property injection — set on the ring container so children read the
// concept palette via var(--concept-*). Hue family mirrors Vāda's agent-color pattern
// (see ui-canvas-animation skill: "Agent Colors") so the ecosystem visual language stays coherent.
const RING_COLOR_VARS: CSSProperties = {
  '--concept-focus': 'hsl(207 32% 52%)',
  '--concept-memory': 'hsl(278 35% 63%)',
  '--concept-deliberation': 'hsl(43 52% 54%)',
  '--concept-ownership': 'hsl(175 28% 46%)'
} as CSSProperties

interface HomeCanvasProps {
  render: (state: { animationStarted: boolean; animationComplete: boolean; ringVisible: boolean }) => ReactNode
}

// Inner — lives inside AIACanvas so the fabric context is available, mirrors Vāda's HomeCanvasInner.
function HomeCanvasInner({ render }: HomeCanvasProps) {
  const { phase, animationStarted, animationComplete, ringSize, diamondSize, R, ringDivRef, ringVisible } =
    useHomeCanvas()

  const cx = ringSize / 2
  const cy = ringSize / 2
  const h = diamondSize * 0.46
  const diamondPerimeter = 4 * h * Math.SQRT2
  const strokeWidth = Math.max(0.5, diamondSize / 100)
  const glyphSize = Math.round(diamondSize * 0.56)

  const positions = [
    { cx, cy: cy - R }, // top → FOCUS
    { cx: cx + R, cy }, // right → MEMORY
    { cx, cy: cy + R }, // bottom → DELIBERATION
    { cx: cx - R, cy } // left → OWNERSHIP
  ]

  // Four diagonal connectors, each linking one diamond's outward-pointing tip to
  // the next diamond's tip clockwise. Combined with the 4 diamond outlines they
  // close into a 12-sided ring around the composition.
  //
  //   FOCUS right (cx+h, cy-R)       → MEMORY top (cx+R, cy-h)        [upper-right]
  //   MEMORY bottom (cx+R, cy+h)     → DELIBERATION right (cx+h, cy+R) [lower-right]
  //   DELIBERATION left (cx-h, cy+R) → OWNERSHIP bottom (cx-R, cy+h)   [lower-left]
  //   OWNERSHIP top (cx-R, cy-h)     → FOCUS left (cx-h, cy-R)         [upper-left]
  const diagLen = (R - h) * Math.SQRT2
  const connectorPath = [
    `M ${cx + h} ${cy - R} L ${cx + R} ${cy - h}`,
    `M ${cx + R} ${cy + h} L ${cx + h} ${cy + R}`,
    `M ${cx - h} ${cy + R} L ${cx - R} ${cy + h}`,
    `M ${cx - R} ${cy - h} L ${cx - h} ${cy - R}`
  ].join(' ')
  const connectorPathLen = 4 * diagLen
  const connectorDrawing = phase >= 5

  return (
    <div className='relative flex h-dvh w-full items-center justify-center overflow-hidden'>
      <div ref={ringDivRef} className='relative' style={{ ...RING_COLOR_VARS, width: ringSize, height: ringSize }}>
        {/* SVG layer: closed connector path + 4 diamond outlines. */}
        <svg
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          className='pointer-events-none absolute inset-0 h-full w-full overflow-visible'
          aria-hidden='true'
        >
          <title>Atta cognitive flow</title>
          {/* Connector — single closed path, solid stroke. Draws on continuously
              clockwise during phase 5 via stroke-dashoffset, then stays solid at
              the settled state (no dashed crossfade). */}
          <path
            d={connectorPath}
            fill='none'
            stroke='currentColor'
            strokeOpacity={0.28}
            strokeWidth={1}
            strokeDasharray={`${connectorPathLen} ${connectorPathLen}`}
            strokeDashoffset={connectorDrawing ? 0 : connectorPathLen}
            className='text-foreground transition-[stroke-dashoffset] duration-[1500ms] ease-out'
          />
          {/* 4 diamonds — stroke draws on via dashoffset; fill breathes via @keyframes diamond-breathe. */}
          {CONCEPTS.map((concept, i) => {
            const p = positions[i]!
            const visible = phase >= DIAMOND_VISIBLE_PHASE[i]!
            // Per-element CSS variable lookup — runtime indexing requires inline.
            const colorVar = `var(${CONCEPT_VARS[i]})`
            return (
              <polygon
                key={concept}
                points={`${p.cx},${p.cy - h} ${p.cx + h},${p.cy} ${p.cx},${p.cy + h} ${p.cx - h},${p.cy}`}
                fill={colorVar}
                fillOpacity={0.04}
                stroke={colorVar}
                strokeOpacity={0.7}
                strokeWidth={strokeWidth}
                strokeDasharray={`${diamondPerimeter} ${diamondPerimeter}`}
                strokeDashoffset={visible ? 0 : diamondPerimeter}
                className='transition-[stroke-dashoffset] duration-500 ease-out'
                // Per-diamond runtime delay phase-shifts the breathing animation.
                style={{
                  animation: animationComplete ? `diamond-breathe 6s ease-in-out ${i * 1.5}s infinite` : undefined
                }}
              />
            )
          })}
        </svg>

        {/* DOM glyphs + labels. Each node anchors at the diamond center (p.cx, p.cy);
            the glyph centers itself on that anchor, and the label sits OUTSIDE the
            diamond on its cardinal side (FOCUS=top → above, MEMORY=right → right of,
            DELIBERATION=bottom → below, OWNERSHIP=left → left of). Spacing from
            diamond outer vertex = h + 24px breathing room. */}
        {CONCEPTS.map((concept, i) => {
          const GlyphComp = GLYPH_COMPONENTS[i]!
          const visible = phase >= DIAMOND_VISIBLE_PHASE[i]!
          const p = positions[i]!
          const colorVar = `var(${CONCEPT_VARS[i]})`
          const labelDir = LABEL_POSITIONS[i]!
          const labelOffset = h + 24
          return (
            <div
              key={concept}
              className={`pointer-events-none absolute z-20 transition-opacity delay-200 duration-500 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
              style={{ left: p.cx, top: p.cy, color: colorVar }}
            >
              {/* Glyph centered exactly on the diamond center (parent anchor at 0,0). */}
              <div
                className='-translate-x-1/2 -translate-y-1/2 absolute flex items-center justify-center'
                style={{ width: glyphSize, height: glyphSize }}
              >
                <GlyphComp />
              </div>
              {/* Label outside the diamond on its cardinal side. */}
              <Text
                as='span'
                className='absolute whitespace-nowrap font-mono text-2xl uppercase tracking-widest'
                style={{ ...labelPositionStyle(labelDir, labelOffset), color: colorVar }}
              >
                {concept}
              </Text>
            </div>
          )
        })}

        {/* Center wordmark — constrained to the inner safe zone (between diamond
            inner edges). Width = 2(R - h) = the geometric clear distance between
            the LEFT and RIGHT diamond inner vertices. Content inside wraps
            naturally within this bound — no element-level max-w or whitespace
            tricks needed. */}
        <div
          className='absolute z-30 flex items-center justify-center'
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 2 * (R - h),
            height: 2 * (R - h)
          }}
        >
          {render({ animationStarted, animationComplete, ringVisible })}
        </div>
      </div>
    </div>
  )
}

// Outer — sets up AIACanvas (fixed inset-0 fabric, Vāda's canonical pattern).
export function HomeCanvas({ render }: HomeCanvasProps) {
  return (
    <>
      <section id='hero' className='relative h-dvh w-full' />
      <div className='pointer-events-none fixed inset-0 z-0'>
        <AIACanvas
          bg={renderFabric}
          wanderDuration={30}
          alwaysRenderSpheres
          autoTriggerGravity={false}
          className='h-full w-full'
        >
          <HomeCanvasInner render={render} />
        </AIACanvas>
      </div>
    </>
  )
}
