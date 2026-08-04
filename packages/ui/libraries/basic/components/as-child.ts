import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'

/**
 * `asChild` → Base UI `render` bridge.
 *
 * basic's Sheet and Collapsible `installed/*` files are Base UI
 * (`@base-ui/react`), which composes via `render={<El/>}`, NOT Radix's
 * `asChild`. App code writes the cross-library `asChild` idiom — the contract
 * composition idiom (`.claude/skills/ui-library-system/SKILL.md`) that every
 * other flavor accepts — so the wrapper layer for basic's Base UI components
 * accepts `asChild` and resolves the single element child into `render`.
 *
 * Recovered from task 1's retro Button adapter (#537), which used the same
 * `resolveSingleChild` before retro was re-based onto Radix (task 2) and the
 * adapter deleted. Basic is now the Base UI holdout. `installed/*` stays a
 * verbatim upstream paste; the adapter lives here.
 */
export function resolveSingleChild(children: ReactNode): ReactElement | undefined {
  if (isValidElement(children)) return children
  return Children.toArray(children).find(isValidElement) as ReactElement | undefined
}
