'use client'

import { Button } from '@atta/ui/components'

export function LearnMoreAction() {
  const onClick = () => {
    const target = document.getElementById('learn')
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <Button variant='ghost' size='lg' onClick={onClick}>
      Learn More
    </Button>
  )
}
