'use client'

import { useState } from 'react'
import { Button } from '@atta/ui'
import { Copy, Check } from 'lucide-react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button type='button' variant='ghost' size='sm' onClick={onClick} className='h-7 gap-1.5 text-xs'>
      {copied ? <Check className='size-3.5' /> : <Copy className='size-3.5' />}
      {copied ? 'Copied' : 'Copy'}
    </Button>
  )
}
