'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToastContext
} from '@atta/ui/components'
import { cn } from '@/lib/utils'

interface PublishToggleProps {
  initialIsPublished: boolean
  /** True if the user has a key for ANY supported vendor. The audit can run
   *  on any vendor with a key (task 3b), so we no longer gate publish on
   *  Anthropic specifically. */
  hasAnyKey: boolean
}

export function PublishToggle({ initialIsPublished, hasAnyKey }: PublishToggleProps) {
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
    if (!published && !hasAnyKey) {
      setShowKeylessConfirm(true)
      return
    }
    void doPublish()
  }

  return (
    <>
      <Button
        type='button'
        variant={published ? 'outline' : 'default'}
        onClick={handleTogglePublish}
        disabled={publishing}
        className={cn(
          'h-auto max-w-[140px] shrink-0 whitespace-normal text-center font-mono text-xs uppercase leading-tight tracking-[0.2em]',
          // At rest, this reads exactly like any other outline button — only
          // the hover accent shifts to destructive, matching the same
          // rest/hover contract every other outline-variant button follows
          // instead of sitting permanently red.
          published && 'hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive'
        )}
      >
        {publishing ? (
          <Loader2 className='h-3.5 w-3.5 animate-spin' />
        ) : published ? (
          'Unpublish profile'
        ) : (
          'Publish profile'
        )}
      </Button>
      <Dialog open={showKeylessConfirm} onOpenChange={setShowKeylessConfirm}>
        <DialogContent className='border-border/60 bg-popover'>
          <DialogHeader>
            <DialogTitle className='font-mono text-sm uppercase tracking-[0.15em]'>Publish without a key?</DialogTitle>
            <DialogDescription>Recruiters won't be able to run the audit until you add an API key.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => setShowKeylessConfirm(false)}
              className='font-mono text-xs uppercase tracking-[0.2em]'
            >
              Cancel
            </Button>
            <Button
              type='button'
              variant='default'
              onClick={() => void doPublish()}
              disabled={publishing}
              className='font-mono text-xs uppercase tracking-[0.2em]'
            >
              {publishing ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : 'Publish anyway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
