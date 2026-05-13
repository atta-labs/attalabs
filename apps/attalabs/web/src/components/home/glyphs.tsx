export function DeliberationGlyph() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='w-full h-full'
      aria-hidden='true'
    >
      <circle cx='9.5' cy='12' r='5.5' />
      <circle cx='14.5' cy='12' r='5.5' />
    </svg>
  )
}

export function FocusGlyph() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      className='w-full h-full'
      aria-hidden='true'
    >
      <circle cx='12' cy='12' r='4.5' />
      <circle cx='12' cy='12' r='1.5' fill='currentColor' stroke='none' />
      <line x1='12' y1='4' x2='12' y2='7.5' />
      <line x1='12' y1='16.5' x2='12' y2='20' />
      <line x1='4' y1='12' x2='7.5' y2='12' />
      <line x1='16.5' y1='12' x2='20' y2='12' />
    </svg>
  )
}

export function MemoryGlyph() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      className='w-full h-full'
      aria-hidden='true'
    >
      <line x1='6' y1='8' x2='18' y2='8' />
      <line x1='6' y1='12' x2='18' y2='12' />
      <line x1='6' y1='16' x2='18' y2='16' />
    </svg>
  )
}

// A contained space with a center point — possession, "mine".
// Replaces the abandoned ContinuityGlyph (infinity).
export function OwnershipGlyph() {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='w-full h-full'
      aria-hidden='true'
    >
      <rect x='6' y='6' width='12' height='12' rx='2' ry='2' />
      <circle cx='12' cy='12' r='1.5' fill='currentColor' stroke='none' />
    </svg>
  )
}
