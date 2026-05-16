export function HeraldMark({ className }: { className?: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' className={className} aria-hidden='true'>
      <g fill='none' stroke='currentColor' strokeWidth='22' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M 52 30 Q 46 100, 52 170' />
        <path d='M 148 30 Q 154 100, 148 170' />
        <path d='M 56 100 Q 100 95, 144 100' />
      </g>
      <path
        d='M 84 105 Q 84 102, 87 102 L 113 102 Q 116 102, 116 105 L 116 144 Q 116 146, 114 145 L 100 134 Q 100 133, 99 134 L 86 145 Q 84 146, 84 144 Z'
        fill='currentColor'
      />
      <circle cx='100' cy='100' r='2.5' fill='currentColor' />
    </svg>
  )
}
