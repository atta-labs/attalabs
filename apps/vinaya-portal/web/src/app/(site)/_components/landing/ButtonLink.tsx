'use client'

import { buttonVariants } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import Link from 'next/link'
import type { ComponentProps } from 'react'

// buttonVariants() is exported alongside a 'use client' component (animate's Button), so
// it can only be CALLED from client code — a Server Component may render <Button> but not
// invoke buttonVariants() directly. This wrapper is the client boundary that isolates that
// call; a plain <Link> styled with it never routes through Slot/motion.create the way
// <Button asChild> does, so it doesn't inherit that component's dev-mode instability either.
export function ButtonLink({
  variant = 'default',
  size = 'lg',
  className,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: 'default' | 'secondary' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
