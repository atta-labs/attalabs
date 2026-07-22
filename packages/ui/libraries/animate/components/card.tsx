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
 * padding is expected to come from a sibling `CardHeader`. Our cards use `CardContent` as a
 * standalone padded content area (title + body inside, no `CardHeader`), so on animate the
 * top padding disappeared, while retro (new-shadcn, padding on the Card via `py-…`) kept it.
 *
 * This thin wrapper restores symmetric top padding so `CardContent` reads the same in both
 * libraries. `installed/` stays verbatim; `pt-6` is placed BEFORE the caller's className so a
 * caller's explicit `pt-*` still wins via tailwind-merge (and it lands after installed's
 * `pt-0`, overriding it).
 */
function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <InstalledCardContent className={cn('pt-6', className)} {...props} />
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
