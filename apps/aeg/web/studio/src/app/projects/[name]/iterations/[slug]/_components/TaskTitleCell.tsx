'use client'

import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@atta/ui/components/tooltip'

export function TaskTitleCell({ title }: { title: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <div className='flex min-w-0 items-center gap-1.5'>
          <span className='truncate font-sans text-sm text-card-foreground'>{title}</span>
          <TooltipTrigger className='shrink-0 text-muted-foreground/50 hover:text-muted-foreground'>
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
