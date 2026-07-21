import { Button } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { isVercelDeploy } from '@/lib/env'
import { hasForgeConnection } from '@/lib/forge-connection'

type Segment = 'portal' | 'studio'

/**
 * One segment of the switch. The active/inactive skin is the active library's
 * own `Button` — `default` (its filled, committed state) vs `ghost` — rather
 * than a hand-rolled pill, so the control reads as retro chrome under `retro`
 * and as that library's own button under any other. No fill/border class is
 * set here on purpose: the pill belongs to the library, not to this call site.
 *
 * `asChild` keeps the segment a real link. Navigation, not local pressed
 * state, is what this control does, so the active segment announces itself
 * with `aria-current='page'` — the reason this is a Button and not a Toggle,
 * whose primitive stamps `type='button'` and `aria-pressed` onto whatever it
 * renders, neither of which is valid on an anchor (and neither of which a
 * child prop can override back off through Radix's Slot merge).
 */
function SwitchSegment({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Button asChild variant={active ? 'default' : 'ghost'} size='sm'>
      <NextLink href={href} variant='unstyled' aria-current={active ? 'page' : undefined}>
        {label}
      </NextLink>
    </Button>
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
    <div className='flex items-center gap-1 rounded-lg bg-secondary p-1'>
      <SwitchSegment label='Portal' href='/' active={current === 'portal'} />
      <SwitchSegment label='Studio' href='/studio' active={current === 'studio'} />
    </div>
  )
}
