'use client'

// State + async handlers for the TranscriptActions row. Component stays dumb.

import { useToastContext } from '@atta/ui/components'
import { useCallback, useState } from 'react'
import { copyTranscriptToClipboard, downloadTranscript, type TranscriptInput } from './transcript-export'

export function useTranscriptActions(input: TranscriptInput) {
  const { successToast, errorToast } = useToastContext()
  const [copying, setCopying] = useState(false)

  const copy = useCallback(async () => {
    setCopying(true)
    try {
      await copyTranscriptToClipboard(input)
      successToast('Copied', 'Full transcript on your clipboard.')
    } catch (e) {
      errorToast('Copy failed', e instanceof Error ? e.message : 'Try download instead.')
    } finally {
      setCopying(false)
    }
  }, [input, successToast, errorToast])

  const download = useCallback(() => {
    try {
      downloadTranscript(input)
      successToast('Downloaded', 'Transcript saved as markdown.')
    } catch (e) {
      errorToast('Download failed', e instanceof Error ? e.message : 'Try again.')
    }
  }, [input, successToast, errorToast])

  return { copy, download, copying }
}
