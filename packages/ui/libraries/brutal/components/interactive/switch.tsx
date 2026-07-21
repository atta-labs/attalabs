import type { ComponentProps } from 'react'
import { Switch as InstalledSwitch } from '../../installed/switch'

// Wrapper (not a call-site extension of installed/, which stays a verbatim
// neobrutalism CLI paste). Unlike Toggle — where neobrutalism's registry ships
// nothing and brutal falls back to basic's wrapper — neobrutalism DOES ship a
// switch (`https://www.neobrutalism.dev/r/switch.json`), so brutal gets its own
// installed paste and its own wrapper. That paste already carries
// cursor-pointer, so no universal default is merged here.
function Switch(props: ComponentProps<typeof InstalledSwitch>) {
  return <InstalledSwitch {...props} />
}

// Derived from THIS library's own installed component — per-library Props rule.
type SwitchProps = ComponentProps<typeof InstalledSwitch>

export { Switch }
export type { SwitchProps }
