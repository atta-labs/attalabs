import { ArrowDown } from 'lucide-react'
import { ScrollButton } from './ScrollButton'

export function GovernanceBadge() {
  return (
    <div className='flex flex-col items-center gap-2'>
      <ScrollButton targetId='protected'>Vinaya</ScrollButton>
      <ArrowDown className='size-10 text-foreground' />
    </div>
  )
}
