import { cn } from '../../../../lib/utils'
import type { ChromeFrameProps } from '../../../../types'
import { Card } from '../../installed/card'

// Floating chrome frame — retro only. Wraps the chrome in retro's own Card
// (border-2 + hard offset shadow + radius) inside a small margin so the shadow
// has room to breathe: the "detached" look. The margin lives HERE, not on the
// shared topbar/rails, so it is retro's alone and never leaks onto basic/animate
// (which use the flush frame). No `library === 'retro'` branch anywhere.
//
// `className` carries the shared inner layout and is applied to the Card, so the
// consumer tunes the content box while the frame owns the float.
export function ChromeFrame({ variant, className, children, ...props }: ChromeFrameProps) {
  if (variant === 'rail') {
    return (
      <div className='h-full w-full p-2'>
        <Card
          className={cn('flex h-full w-full flex-col overflow-hidden rounded bg-sidebar py-0', className)}
          {...props}
        >
          {children}
        </Card>
      </div>
    )
  }
  if (variant === 'panel') {
    return (
      <div className='h-full w-full p-2'>
        <Card className={cn('flex h-full w-full flex-col overflow-y-auto rounded bg-card py-0', className)} {...props}>
          {children}
        </Card>
      </div>
    )
  }
  if (variant === 'bar') {
    return (
      <div className='w-full px-2 pt-2'>
        <Card className={cn('flex w-full flex-row items-center rounded bg-card py-0', className)} {...props}>
          {children}
        </Card>
      </div>
    )
  }
  return (
    <div className='w-full px-2 pt-2'>
      <Card
        className={cn('relative flex h-14 w-full flex-row items-center gap-0 rounded px-6 py-0', className)}
        {...props}
      >
        {children}
      </Card>
    </div>
  )
}
