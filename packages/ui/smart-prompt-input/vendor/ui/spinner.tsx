import type { HTMLAttributes } from 'react'
import { cn } from '../../../lib/utils'

export function Spinner({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn('inline-flex animate-spin', className)} {...props}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='16'
        height='16'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
      >
        <path d='M21 12a9 9 0 1 1-6.219-8.56' />
      </svg>
    </span>
  )
}
