import { isVercelDeploy } from '@/lib/env'
import { hasForgeConnection } from '@/lib/forge-connection'
import { ProductSwitchControl } from './ProductSwitchControl'

type Segment = 'portal' | 'studio'

/**
 * Portal↔Studio switch. Reachable only where serving Studio is authorized
 * (D-126) — today that means: not a Vercel deploy (production or preview),
 * and this server can reach GitHub. Order matters: the synchronous env check
 * MUST run first so a deployed request never reaches the async forge check
 * at all (see D-126 — a GitHub token existing is not the same as this
 * visitor being authorized).
 *
 * This component stays a server component precisely so that gate runs on the
 * server and an unauthorized request never ships the control at all; the
 * rendered switch is `ProductSwitchControl`, a client component, because a
 * switch navigates from an event handler rather than from an `href`.
 */
export async function ProductSwitch({ current }: { current: Segment }) {
  if (isVercelDeploy()) return null
  if (!(await hasForgeConnection())) return null

  return <ProductSwitchControl current={current} />
}
