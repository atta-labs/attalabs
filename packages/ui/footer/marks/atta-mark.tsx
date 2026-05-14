export function AttaMark({ className }: { className?: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' className={className} aria-hidden='true'>
      <path
        d='M 51.2,450.56 Q 112.64,281.6 251.904,51.2 L 260.096,51.2 Q 153.6,271.36 110.08,450.56 Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='20.48'
        strokeLinejoin='round'
        strokeLinecap='round'
      />
      <path
        d='M 460.8,450.56 Q 399.36,281.6 260.096,51.2 L 251.904,51.2 Q 358.4,271.36 401.92,450.56 Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='20.48'
        strokeLinejoin='round'
        strokeLinecap='round'
      />
      <ellipse cx='256' cy='281.6' rx='66.56' ry='33.28' fill='none' stroke='currentColor' strokeWidth='12.8' />
      <circle cx='256' cy='281.6' r='12.8' fill='currentColor' />
    </svg>
  )
}
