import type { ComponentProps } from 'react'
import { Switch as InstalledSwitch } from '../../installed/switch'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// shadcn CLI paste). Unlike interactive/toggle.tsx this one bakes in NO
// className default: shadcn's installed Switch already carries cursor-pointer
// in its own base string, so there is nothing universal left to add. The
// wrapper exists to own the Props type, and to be the place a future default
// would go without reopening installed/.
function Switch(props: ComponentProps<typeof InstalledSwitch>) {
  return <InstalledSwitch {...props} />
}

// Derived from THIS library's own installed component — the per-library Props
// rule (see types/index.ts's note on Button): the size/variant surface diverges
// across libraries by design, so only the NAME is contracted.
type SwitchProps = ComponentProps<typeof InstalledSwitch>

export { Switch }
export type { SwitchProps }
