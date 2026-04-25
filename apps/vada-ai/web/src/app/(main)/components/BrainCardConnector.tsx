'use client'

import { useState, useEffect } from 'react'

// Must match card positions in page.tsx
const CARD_Y_FRACTION = 0.86 // cards at 86vh
const LEFT_CARD_X_FRACTION = 0.3
const RIGHT_CARD_X_FRACTION = 0.7
const SPLIT_Y_FRACTION = 0.76 // where the line branches
const BRAIN_OFFSET_PX = 100 // brain SVG bottom (viewBox y goes to 130, visual content to ~94)

const WIRE_COLOR = 'hsl(185 85% 65%)'

export function BrainCardConnector() {
  const [dims, setDims] = useState({ w: 1440, h: 900 })

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const { w, h } = dims
  const bx = w / 2
  const by = h / 2 + BRAIN_OFFSET_PX
  const splitY = h * SPLIT_Y_FRACTION
  const cardY = h * CARD_Y_FRACTION
  const lx = w * LEFT_CARD_X_FRACTION
  const rx = w * RIGHT_CARD_X_FRACTION

  const downPath = `M${bx},${by} L${bx},${splitY}`
  const leftPath = `M${bx},${splitY} L${lx},${cardY}`
  const rightPath = `M${bx},${splitY} L${rx},${cardY}`

  return (
    <>
      <style>{`
        @keyframes wire-flow {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -60; }
        }
        @keyframes wire-flow-reverse {
          from { stroke-dashoffset: 60; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>

      <svg className='fixed inset-0 pointer-events-none' style={{ zIndex: 9 }} width={w} height={h}>
        {/* ── Base dim lines ── */}
        {[downPath, leftPath, rightPath].map((d, i) => (
          <path key={`base-${i}`} d={d} fill='none' stroke={WIRE_COLOR} strokeWidth={0.8} strokeOpacity={0.12} />
        ))}

        {/* ── Electricity — vertical down ── */}
        <path
          d={downPath}
          fill='none'
          stroke={WIRE_COLOR}
          strokeWidth={1.2}
          strokeOpacity={0.7}
          strokeDasharray='6 14'
          strokeLinecap='round'
          style={{ animation: 'wire-flow 1.8s linear infinite' }}
        />
        <path
          d={downPath}
          fill='none'
          stroke={WIRE_COLOR}
          strokeWidth={0.7}
          strokeOpacity={0.4}
          strokeDasharray='2 20'
          strokeLinecap='round'
          style={{ animation: 'wire-flow 2.6s linear infinite 0.4s' }}
        />

        {/* ── Electricity — left branch ── */}
        <path
          d={leftPath}
          fill='none'
          stroke={WIRE_COLOR}
          strokeWidth={1.2}
          strokeOpacity={0.7}
          strokeDasharray='6 14'
          strokeLinecap='round'
          style={{ animation: 'wire-flow 2.2s linear infinite 0.3s' }}
        />
        <path
          d={leftPath}
          fill='none'
          stroke={WIRE_COLOR}
          strokeWidth={0.7}
          strokeOpacity={0.4}
          strokeDasharray='2 20'
          strokeLinecap='round'
          style={{ animation: 'wire-flow 3.1s linear infinite 0.9s' }}
        />

        {/* ── Electricity — right branch ── */}
        <path
          d={rightPath}
          fill='none'
          stroke={WIRE_COLOR}
          strokeWidth={1.2}
          strokeOpacity={0.7}
          strokeDasharray='6 14'
          strokeLinecap='round'
          style={{ animation: 'wire-flow 2.2s linear infinite 0.6s' }}
        />
        <path
          d={rightPath}
          fill='none'
          stroke={WIRE_COLOR}
          strokeWidth={0.7}
          strokeOpacity={0.4}
          strokeDasharray='2 20'
          strokeLinecap='round'
          style={{ animation: 'wire-flow 3.1s linear infinite 1.2s' }}
        />

        {/* ── Junction dot at split ── */}
        <circle cx={bx} cy={splitY} r={2.5} fill={WIRE_COLOR} fillOpacity={0.5} />
      </svg>
    </>
  )
}
