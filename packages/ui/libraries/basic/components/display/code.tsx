import * as React from 'react'
import { cn } from '../../../../lib/utils'
import type { CodeBlockProps, CodeProps } from '../../../../types'

// Hand-written in the wrapper layer, NOT in `installed/`: shadcn ships no code
// component (verified against ui.shadcn.com/docs/components — it ships `Kbd`,
// which is keyboard keys, not code display). With no upstream canonical to
// paste there is nothing for `installed/` to hold, and hand-rolling a file
// there is exactly the drift D-065 forbids. `display/badge.tsx` is the same
// shape — our own component, editable layer.
//
// `className` merges LAST so a caller can override the defaults: these are a
// base component's own styling, not a universal default that must always win
// (contrast `Button`'s `leading-none`, which merges last for that reason).

export const Code = React.forwardRef<HTMLElement, CodeProps>(({ className, ...props }, ref) => (
  <code
    ref={ref}
    className={cn('rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground', className)}
    {...props}
  />
))
Code.displayName = 'Code'

export const CodeBlock = React.forwardRef<HTMLPreElement, CodeBlockProps>(({ className, ...props }, ref) => (
  <pre
    ref={ref}
    className={cn('my-4 overflow-x-auto rounded-md bg-muted p-4 font-mono text-sm text-foreground', className)}
    {...props}
  />
))
CodeBlock.displayName = 'CodeBlock'
