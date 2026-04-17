import { ArrowDown, ArrowRight } from 'lucide-react'

type FlowArrowDirection = 'down' | 'right' | 'responsive'

interface FlowArrowProps {
  direction?: FlowArrowDirection
}

export function FlowArrow({ direction = 'down' }: FlowArrowProps) {
  if (direction === 'responsive') {
    return (
      <div className='flex items-center justify-center'>
        <ArrowRight className='size-4 rotate-90 text-muted-foreground md:rotate-0' aria-hidden />
      </div>
    )
  }
  const Icon = direction === 'right' ? ArrowRight : ArrowDown
  return <Icon className='size-4 text-muted-foreground' aria-hidden />
}
