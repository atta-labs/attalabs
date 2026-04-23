'use client'

// Presentational only. Copy + download handlers live in useTranscriptActions.

import { Button } from '@atta/ui'
import { NextLink } from '@atta/ui/lib/next-link'
import { Copy, Download } from 'lucide-react'
import type { TranscriptInput } from './transcript-export'
import { useTranscriptActions } from './useTranscriptActions'

export function TranscriptActions({ input }: { input: TranscriptInput }) {
  const a = useTranscriptActions(input)
  return (
    <div className='mt-4 flex flex-wrap gap-2.5'>
      <Button type='button' variant='outline' onClick={a.copy} disabled={a.copying} className='flex-1'>
        <Copy className='mr-1.5 size-3.5' />
        {a.copying ? 'Copying…' : 'Copy transcript'}
      </Button>
      <Button type='button' variant='outline' onClick={a.download} className='flex-1'>
        <Download className='mr-1.5 size-3.5' />
        Download .md
      </Button>
      <Button type='button' onClick={a.download} className='flex-1'>
        <NextLink variant='unstyled' href='/deliberate'>
          New deliberation
        </NextLink>
      </Button>
    </div>
  )
}
