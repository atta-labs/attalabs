export type RoundState = 'orthogonal' | 'adversarial' | 'convergence'

interface RoundGeometryProps {
  state: RoundState
}

const DOTS = [
  { key: 'strategist', x: 24, y: 24, color: 'var(--agent-strategist)' },
  { key: 'critic', x: 76, y: 24, color: 'var(--agent-critic)' },
  { key: 'devils_advocate', x: 24, y: 76, color: 'var(--agent-devils-advocate)' },
  { key: 'synthesizer', x: 76, y: 76, color: 'var(--agent-synthesizer)' }
] as const

export function RoundGeometry({ state }: RoundGeometryProps) {
  return (
    <svg viewBox='0 0 100 100' className='h-full w-full' aria-hidden preserveAspectRatio='xMidYMid meet'>
      <g
        className='text-muted-foreground'
        stroke='currentColor'
        strokeOpacity={0.35}
        strokeWidth={0.5}
        strokeLinecap='round'
      >
        {state === 'adversarial' &&
          DOTS.flatMap((a, i) =>
            DOTS.slice(i + 1).map((b) => <line key={`${a.key}-${b.key}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)
          )}
        {state === 'convergence' && DOTS.map((d) => <line key={d.key} x1={d.x} y1={d.y} x2={50} y2={50} />)}
      </g>
      {state === 'convergence' && (
        <circle
          cx={50}
          cy={50}
          r={2.5}
          fill='none'
          className='text-muted-foreground'
          stroke='currentColor'
          strokeWidth={0.6}
          strokeOpacity={0.6}
        />
      )}
      {DOTS.map(({ key, x, y, color }) => (
        <circle key={key} cx={x} cy={y} r={3.2} fill={color} />
      ))}
    </svg>
  )
}
