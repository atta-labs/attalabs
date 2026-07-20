import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { TabsTrigger as InstalledTabsTrigger } from '../../installed/tabs'

// Wrapper (not a call-site fix, and not an edit to installed/, which stays a
// verbatim retroui CLI paste).
//
// retroui's TabsTrigger carries BOTH `hover:text-foreground` and
// `data-active:text-primary-foreground`. Hovering an ACTIVE tab therefore
// repaints its label `--foreground` while the fill stays `--primary`. That is
// harmless upstream, where primary and foreground are different colours — but
// our light themes deliberately define `primary` AS the ink (`primary` ===
// `foreground`, which is also why the Logo's two words match in light mode).
// The result is near-black text on a near-black fill: the active tab's label
// disappears the moment you point at it.
//
// Re-assert the active label colour at hover specificity so the active state
// wins over the hover rule regardless of how the theme relates the two tokens.
export function TabsTrigger({ className, ...props }: ComponentProps<typeof InstalledTabsTrigger>) {
  return <InstalledTabsTrigger className={cn(className, 'data-active:hover:text-primary-foreground')} {...props} />
}
