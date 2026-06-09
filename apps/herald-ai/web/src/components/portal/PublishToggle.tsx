'use client'

import { useState } from 'react'
import { Button, useToastContext } from '@atta/ui/components'

interface PublishToggleProps {
  initialIsPublished: boolean
  hasAnthropicKey: boolean
}

export function PublishToggle({ initialIsPublished, hasAnthropicKey }: PublishToggleProps) {
  const { successToast, errorToast } = useToastContext()
  const [published, setPublished] = useState(initialIsPublished)
  const [publishing, setPublishing] = useState(false)
  const [showKeylessConfirm, setShowKeylessConfirm] = useState(false)

  async function doPublish() {
    setShowKeylessConfirm(false)
    setPublishing(true)
    try {
      const next = !published
      const res = await fetch('/api/admin/profile-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: next })
      })
      if (res.ok) {
        setPublished(next)
        successToast(
          next ? 'Profile published' : 'Profile unpublished',
          next ? 'Your profile is now publicly accessible.' : 'Your profile is now hidden from public view.'
        )
      } else {
        errorToast('Failed', 'Could not update visibility. Please try again.')
      }
    } catch {
      errorToast('Failed', 'Could not update visibility. Please try again.')
    } finally {
      setPublishing(false)
    }
  }

  function handleTogglePublish() {
    if (!published && !hasAnthropicKey) {
      setShowKeylessConfirm(true)
      return
    }
    void doPublish()
  }

  if (showKeylessConfirm) {
    return (
      <div className='flex shrink-0 flex-col items-end gap-2'>
        <p className='max-w-[240px] text-right font-mono text-[10px] text-muted-foreground'>
          Recruiters won't be able to run the audit until you add an Anthropic API key. Publish anyway?
        </p>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setShowKeylessConfirm(false)}
            className='font-mono text-[10px] uppercase tracking-[0.2em]'
          >
            Cancel
          </Button>
          <Button
            type='button'
            variant='default'
            size='sm'
            onClick={() => void doPublish()}
            disabled={publishing}
            className='font-mono text-[10px] uppercase tracking-[0.2em]'
          >
            {publishing ? '...' : 'Publish anyway'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      type='button'
      variant={published ? 'outline' : 'default'}
      onClick={handleTogglePublish}
      disabled={publishing}
      className='h-auto max-w-[140px] shrink-0 whitespace-normal text-right font-mono text-xs uppercase leading-tight tracking-[0.2em]'
    >
      {publishing ? '...' : published ? 'Unpublish profile' : 'Publish profile'}
    </Button>
  )
}
