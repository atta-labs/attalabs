'use client'

import type { HTMLAttributes } from 'react'
import { cn } from '../../../lib/utils'
import {
  Card,
  CardAction,
  CardContent as InstalledCardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '../installed/card'

/**
 * animate's installed `CardContent` is `p-6 pt-0` — the old-shadcn model, where the top
 * padding is expected to come from a sibling `CardHeader`. Cards used as `<Card><CardContent>
 * title + body</CardContent></Card>` with no `CardHeader` therefore lose their top padding on
 * animate, while retro (new-shadcn, padding on the Card via `py-…`) keeps it.
 *
 * Any product can be configured onto any library (it's a CMS setting that changes freely), so
 * the library must render correctly on its own terms — not only for whichever product uses it
 * today. This thin wrapper restores symmetric top padding so `CardContent` reads the same in
 * every library. `installed/` stays verbatim; `pt-6` sits BEFORE the caller's className so a
 * caller's explicit `pt-*` still wins via tailwind-merge (and it lands after installed's
 * `pt-0`, overriding it).
 */
function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <InstalledCardContent className={cn('pt-6', className)} {...props} />
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
