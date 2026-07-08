import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { Button as InstalledButton, buttonVariants } from '../../installed/button'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// neobrutalism CLI paste) — see basic/components/interactive/button.tsx for
// the leading-none rationale AND the required cn(className, 'leading-none')
// argument order (a caller's text-size class silently wins over a
// leading-none passed BEFORE it in tailwind-merge's conflict resolution).
function Button({ className, ...props }: ComponentProps<typeof InstalledButton>) {
  return (
    <InstalledButton
      className={cn(className, 'leading-none', 'cursor-pointer disabled:cursor-not-allowed')}
      {...props}
    />
  )
}

export { Button, buttonVariants }
