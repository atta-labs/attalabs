import { NextLink } from '@atta/ui/lib/next-link'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

export function UnderlineLink({
  href,
  children,
  icon = <ArrowRight className='size-3.5' />
}: {
  href: string
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <NextLink
      href={href}
      variant='unstyled'
      className='inline-flex items-center gap-2 border-b border-current pb-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.02em]'
    >
      {children}
      {icon}
    </NextLink>
  )
}
