export function VitakkaMark({ className }: { className?: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512' className={className} aria-hidden='true'>
      <path
        d='M 51.2,61.44 Q 112.64,230.4 251.904,460.8 L 260.096,460.8 Q 153.6,240.64 110.08,61.44 Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='20.48'
        strokeLinejoin='round'
        strokeLinecap='round'
      />
      <path
        d='M 460.8,61.44 Q 399.36,230.4 260.096,460.8 L 251.904,460.8 Q 358.4,240.64 401.92,61.44 Z'
        fill='currentColor'
        stroke='currentColor'
        strokeWidth='20.48'
        strokeLinejoin='round'
        strokeLinecap='round'
      />
      <circle cx='256' cy='204.8' r='48.64' fill='none' stroke='currentColor' strokeWidth='15.36' />
      <circle cx='256' cy='204.8' r='28.16' fill='none' stroke='currentColor' strokeWidth='13.824' />
      <circle cx='256' cy='204.8' r='11.264' fill='currentColor' />
    </svg>
  )
}
