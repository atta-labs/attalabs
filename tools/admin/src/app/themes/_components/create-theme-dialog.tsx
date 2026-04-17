'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@atta/ui/components/dialog'
import { Button } from '@atta/ui/components/button'
import { Input } from '@atta/ui/components/input'
import { Textarea } from '@atta/ui/components/textarea'
import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { createThemeAction } from '../actions'

interface CreateThemeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateThemeDialog({ open, onOpenChange }: CreateThemeDialogProps) {
  const router = useRouter()
  const nameId = useId()
  const descId = useId()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() {
    setName('')
    setDescription('')
    setError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    setError(null)
    startTransition(async () => {
      try {
        const result = await createThemeAction(trimmedName, description.trim() || undefined)
        reset()
        onOpenChange(false)
        router.push(`/themes/${result._id}/edit`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create theme.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='w-[min(28rem,calc(100vw-2rem))]'>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <DialogHeader>
            <DialogTitle>Create theme</DialogTitle>
            <DialogDescription>
              Give your theme a name. You'll be able to paste shadcn CSS and edit tokens on the next screen.
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-col gap-3'>
            <label className='flex flex-col gap-1.5' htmlFor={nameId}>
              <span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>Name</span>
              <Input
                id={nameId}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. Midnight Gold'
                disabled={isPending}
                className='h-9 rounded-md border border-input bg-background/60 px-2 text-sm'
              />
            </label>

            <label className='flex flex-col gap-1.5' htmlFor={descId}>
              <span className='font-mono text-[10px] tracking-widest uppercase text-muted-foreground'>
                Description <span className='normal-case text-muted-foreground/60'>(optional)</span>
              </span>
              <Textarea
                id={descId}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Short note about the theme'
                disabled={isPending}
                rows={2}
                className='rounded-md border border-input bg-background/60 px-2 py-1.5 text-sm'
              />
            </label>

            {error && <p className='font-mono text-xs text-destructive'>{error}</p>}
          </div>

          <DialogFooter>
            <Button type='button' variant='ghost' onClick={() => handleOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type='submit' disabled={isPending || !name.trim()} loading={isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
