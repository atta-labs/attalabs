import type { ComponentProps } from 'react'
import { cn } from '../../../../lib/utils'
import { TabsContent as InstalledTabsContent, TabsTrigger as InstalledTabsTrigger } from '../../installed/tabs'

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

// Cross-library "hide when inactive, stay mounted" contract (see
// .claude/skills/ui-library-system/SKILL.md "Flavor matrix" — Tabs). Native
// Radix's `forceMount` keeps an inactive panel MOUNTED, but Radix ships no
// hidden-presence attribute the way Base UI does — the mounted-but-inactive
// panel resolves `data-state="inactive"` and nothing else; Radix's own
// `hidden` DOM attribute stays permanently false once `forceMount` is set; a
// hide rule keyed on `data-state=inactive` is the only thing that actually
// hides it. Bake that CSS default in here (harmless when `forceMount` is
// unset — an inactive panel is unmounted at that point, so the selector never
// matches) and accept Base UI's `keepMounted` name as an alias, so a consumer
// gets the same "pass one prop, no per-call-site CSS" contract basic/animate
// already ship. Radix's own prop type is `forceMount?: true` (literal, not
// `boolean`), hence the ternary below.
export function TabsContent({
  className,
  forceMount,
  keepMounted,
  ...props
}: Omit<ComponentProps<typeof InstalledTabsContent>, 'forceMount'> & {
  forceMount?: boolean
  keepMounted?: boolean
}) {
  return (
    <InstalledTabsContent
      className={cn(className, 'data-[state=inactive]:hidden')}
      forceMount={(forceMount ?? keepMounted) ? true : undefined}
      {...props}
    />
  )
}
