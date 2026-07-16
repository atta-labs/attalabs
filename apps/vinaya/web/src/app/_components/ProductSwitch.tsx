import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { isVercelDeploy } from '@/lib/env'
import { hasForgeConnection } from '@/lib/forge-connection'

type Segment = 'portal' | 'studio'

function SwitchSegment({ label, href, active }: { label: string; href: string; active: boolean }) {
  if (active) {
    return (
      <Text as='span' className='rounded-full bg-accent px-3 py-1 font-sans text-xs font-medium text-accent-foreground'>
        {label}
      </Text>
    )
  }
  return (
    <NextLink
      href={href}
      variant='unstyled'
      className='rounded-full px-3 py-1 font-sans text-xs text-muted-foreground transition-colors hover:text-foreground'
    >
      {label}
    </NextLink>
  )
}

/**
 * Portal↔Studio switch. Reachable only where serving Studio is authorized
 * (D-126) — today that means: not a Vercel deploy (production or preview),
 * and this server can reach GitHub. Order matters: the synchronous env check
 * MUST run first so a deployed request never reaches the async forge check
 * at all (see D-126 — a GitHub token existing is not the same as this
 * visitor being authorized).
 */
export async function ProductSwitch({ current }: { current: Segment }) {
  if (isVercelDeploy()) return null
  if (!(await hasForgeConnection())) return null

  return (
    <div className='flex items-center gap-0.5 rounded-full border border-border bg-muted/50 p-0.5'>
      <SwitchSegment label='Portal' href='/' active={current === 'portal'} />
      <SwitchSegment label='Studio' href='/studio' active={current === 'studio'} />
    </div>
  )
}
