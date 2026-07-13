import { ArrowDown } from 'lucide-react'
import { ScrollButton } from './ScrollButton'

export function GovernanceBadge() {
  return (
    <div className='flex flex-col items-center gap-2'>
      <ScrollButton targetId='protected' className='rounded-xl px-8 py-3.5 text-lg shadow-lg sm:text-xl'>
        Execution Governance
      </ScrollButton>
      <ArrowDown className='size-10 text-foreground' />
    </div>
  )
}
