'use client'

import type { ChatStatus, FileUIPart } from 'ai'
import type { KeyboardEvent } from 'react'
import { Attachment, AttachmentInfo, AttachmentPreview, AttachmentRemove, Attachments } from './vendor/attachments'
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage
} from './vendor/prompt-input'
import { TooltipProvider } from './vendor/ui/tooltip'

export type SmartPromptStatus = 'idle' | 'loading' | 'streaming' | 'error'

export interface SmartPromptInputProps {
  onSubmit: (text: string, files: FileUIPart[]) => void
  placeholder?: string
  submitOn?: 'enter' | 'button'
  ctaLabel?: string
  hint?: string
  accept?: string
  status?: SmartPromptStatus
  onStop?: () => void
  className?: string
}

const statusMap: Record<SmartPromptStatus, ChatStatus> = {
  idle: 'ready',
  loading: 'submitted',
  streaming: 'streaming',
  error: 'error'
}

function AttachmentChips() {
  const { files, remove } = usePromptInputAttachments()
  if (files.length === 0) return null
  return (
    <PromptInputHeader>
      <Attachments variant='inline'>
        {files.map((f) => (
          <Attachment key={f.id} data={f} onRemove={() => remove(f.id)}>
            <AttachmentPreview />
            <AttachmentInfo />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  )
}

export function SmartPromptInput({
  onSubmit,
  placeholder,
  submitOn = 'enter',
  ctaLabel,
  hint,
  accept,
  status = 'idle',
  onStop,
  className
}: SmartPromptInputProps) {
  const chatStatus = statusMap[status]

  const handleKeyDown =
    submitOn === 'button'
      ? (e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
          }
        }
      : undefined

  const handleSubmit = (message: PromptInputMessage) => {
    onSubmit(message.text, message.files)
  }

  return (
    <TooltipProvider>
      <PromptInput accept={accept} onSubmit={handleSubmit} className={className}>
        <AttachmentChips />
        <PromptInputTextarea placeholder={placeholder} onKeyDown={handleKeyDown} />
        <PromptInputFooter>
          <PromptInputTools>
            {accept && (
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            )}
            {hint && <span className='text-xs text-muted-foreground'>{hint}</span>}
          </PromptInputTools>
          <PromptInputSubmit status={chatStatus} onStop={onStop}>
            {ctaLabel}
          </PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
    </TooltipProvider>
  )
}
