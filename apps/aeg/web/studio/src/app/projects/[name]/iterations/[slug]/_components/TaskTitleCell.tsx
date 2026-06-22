'use client'

import type { DerivedStatus } from '@atta/aeg-core'
import { Badge } from '@atta/ui/components/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@atta/ui/components/tooltip'
import { Info } from 'lucide-react'
import { statusVisual } from '../_lib/status-display'

export function TaskTitleCell({ title, status }: { title: string; status?: DerivedStatus }) {
  const visual = status ? statusVisual(status) : null
  return (
    <TooltipProvider>
      <Tooltip>
        <div className='flex items-start gap-1.5'>
          <div className='space-y-1.5'>
            <span className='line-clamp-5 font-sans text-sm text-card-foreground'>{title}</span>
            {visual && <Badge className={`${visual.badgeClass} font-mono text-[0.65rem]`}>{visual.label}</Badge>}
          </div>
          <TooltipTrigger className='mt-0.5 shrink-0 text-muted-foreground/50 hover:text-muted-foreground'>
            <Info className='size-3.5' aria-label='Full task description' />
          </TooltipTrigger>
        </div>
        <TooltipContent side='top' className='max-w-sm text-wrap'>
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
