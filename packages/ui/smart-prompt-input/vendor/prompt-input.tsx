'use client'

// Vendored from ai-elements@1.9.0 — pruned to the surface SmartPromptInput uses.
//
// PRUNED SURFACE:
// - Command / Select / HoverCard / Tabs / Body / Provider / standalone Button +
//   ActionAddScreenshot were vendored for an ai-elements model-picker that no
//   consumer of SmartPromptInput renders. They have been removed.
// - Tooltip / Spinner / HoverCard primitives were vendored to support those
//   pruned exports — they have been removed. Spinner's only live use was inside
//   PromptInputSubmit; it is now lucide `Loader2`.
//
// DEPENDENCY INJECTION (governance — see ui-library-system SKILL.md):
// This file MUST NOT import from `../../libraries/basic/installed/*` or any
// other concrete library. Consumers inject primitives via
// `SmartPromptComponentsProvider`. Vendor surfaces resolve them via the
// `useSmartPromptComponents()` hook with native fallbacks for the
// first-render window mirror of Herald's JDInput `Button ? <Button…> : <button>`
// graceful-fallback pattern.

import type * as React from 'react'
import { InputGroup, InputGroupAddon, InputGroupTextarea } from './ui/input-group'
import { cn } from '../../lib/utils'
import type { ChatStatus, FileUIPart, SourceDocumentUIPart } from 'ai'
import { ArrowDownIcon, ImageIcon, Loader2, PlusIcon, SquareIcon, XIcon } from 'lucide-react'
import { nanoid } from 'nanoid'
import type {
  ChangeEvent,
  ChangeEventHandler,
  ClipboardEventHandler,
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  PropsWithChildren,
  ReactNode,
  RefObject
} from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSmartPromptComponents } from './components-context'

// ============================================================================
// Helpers
// ============================================================================

const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ============================================================================
// Provider Context & Types
// ============================================================================

export interface AttachmentsContext {
  files: (FileUIPart & { id: string })[]
  add: (files: File[] | FileList) => void
  remove: (id: string) => void
  clear: () => void
  openFileDialog: () => void
  fileInputRef: RefObject<HTMLInputElement | null>
}

export interface TextInputContext {
  value: string
  setInput: (v: string) => void
  clear: () => void
}

export interface PromptInputControllerProps {
  textInput: TextInputContext
  attachments: AttachmentsContext
  __registerFileInput: (ref: RefObject<HTMLInputElement | null>, open: () => void) => void
}

const PromptInputController = createContext<PromptInputControllerProps | null>(null)
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(null)

export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController)
  if (!ctx) {
    throw new Error('Wrap your component inside <PromptInputProvider> to use usePromptInputController().')
  }
  return ctx
}

const useOptionalPromptInputController = () => useContext(PromptInputController)

export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext)
  if (!ctx) {
    throw new Error('Wrap your component inside <PromptInputProvider> to use useProviderAttachments().')
  }
  return ctx
}

const useOptionalProviderAttachments = () => useContext(ProviderAttachmentsContext)

export type PromptInputProviderProps = PropsWithChildren<{
  initialInput?: string
}>

// ============================================================================
// Component Context & Hooks
// ============================================================================

const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null)

export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments()
  const local = useContext(LocalAttachmentsContext)
  const context = local ?? provider
  if (!context) {
    throw new Error('usePromptInputAttachments must be used within a PromptInput or PromptInputProvider')
  }
  return context
}

// ============================================================================
// Referenced Sources (Local to PromptInput)
// ============================================================================

export interface ReferencedSourcesContext {
  sources: (SourceDocumentUIPart & { id: string })[]
  add: (sources: SourceDocumentUIPart[] | SourceDocumentUIPart) => void
  remove: (id: string) => void
  clear: () => void
}

export const LocalReferencedSourcesContext = createContext<ReferencedSourcesContext | null>(null)

export const usePromptInputReferencedSources = () => {
  const ctx = useContext(LocalReferencedSourcesContext)
  if (!ctx) {
    throw new Error('usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider')
  }
  return ctx
}

export type PromptInputActionAddAttachmentsProps = {
  label?: string
  className?: string
}

export const PromptInputActionAddAttachments = ({
  label = 'Add photos or files',
  className
}: PromptInputActionAddAttachmentsProps) => {
  const attachments = usePromptInputAttachments()
  const { DropdownMenuItem } = useSmartPromptComponents()

  const handleSelect = useCallback(
    (e: Event) => {
      e.preventDefault()
      attachments.openFileDialog()
    },
    [attachments]
  )

  if (DropdownMenuItem) {
    return (
      <DropdownMenuItem className={className} onSelect={handleSelect}>
        <ImageIcon className='mr-2 size-4' /> {label}
      </DropdownMenuItem>
    )
  }
  // Graceful fallback for first-render window before runtime library loads.
  return (
    <button
      type='button'
      className={cn(
        'flex w-full items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
        className
      )}
      onClick={() => attachments.openFileDialog()}
    >
      <ImageIcon className='mr-2 size-4' /> {label}
    </button>
  )
}

export interface PromptInputMessage {
  text: string
  files: FileUIPart[]
}

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> & {
  accept?: string
  multiple?: boolean
  globalDrop?: boolean
  syncHiddenInput?: boolean
  maxFiles?: number
  maxFileSize?: number
  onError?: (err: { code: 'max_files' | 'max_file_size' | 'accept'; message: string }) => void
  onSubmit: (message: PromptInputMessage, event: FormEvent<HTMLFormElement>) => void | Promise<void>
}

export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  syncHiddenInput,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const controller = useOptionalPromptInputController()
  const usingProvider = !!controller

  const inputRef = useRef<HTMLInputElement | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([])
  const files = usingProvider ? controller.attachments.files : items

  const [referencedSources, setReferencedSources] = useState<(SourceDocumentUIPart & { id: string })[]>([])

  const filesRef = useRef(files)

  useEffect(() => {
    filesRef.current = files
  }, [files])

  const openFileDialogLocal = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const matchesAccept = useCallback(
    (f: File) => {
      if (!accept || accept.trim() === '') {
        return true
      }
      const patterns = accept
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return patterns.some((pattern) => {
        if (pattern.startsWith('.')) {
          return f.name.toLowerCase().endsWith(pattern.toLowerCase())
        }
        if (pattern.endsWith('/*')) {
          const prefix = pattern.slice(0, -1)
          return f.type.startsWith(prefix)
        }
        return f.type === pattern
      })
    },
    [accept]
  )

  const addLocal = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = [...fileList]
      const accepted = incoming.filter((f) => matchesAccept(f))
      if (incoming.length && accepted.length === 0) {
        onError?.({ code: 'accept', message: 'No files match the accepted types.' })
        return
      }
      const withinSize = (f: File) => (maxFileSize ? f.size <= maxFileSize : true)
      const sized = accepted.filter(withinSize)
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({ code: 'max_file_size', message: 'All files exceed the maximum size.' })
        return
      }

      setItems((prev) => {
        const capacity = typeof maxFiles === 'number' ? Math.max(0, maxFiles - prev.length) : undefined
        const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized
        if (typeof capacity === 'number' && sized.length > capacity) {
          onError?.({ code: 'max_files', message: 'Too many files. Some were not added.' })
        }
        const next: (FileUIPart & { id: string })[] = []
        for (const file of capped) {
          next.push({
            filename: file.name,
            id: nanoid(),
            mediaType: file.type,
            type: 'file',
            url: URL.createObjectURL(file)
          })
        }
        return [...prev, ...next]
      })
    },
    [matchesAccept, maxFiles, maxFileSize, onError]
  )

  const removeLocal = useCallback(
    (id: string) =>
      setItems((prev) => {
        const found = prev.find((file) => file.id === id)
        if (found?.url) {
          URL.revokeObjectURL(found.url)
        }
        return prev.filter((file) => file.id !== id)
      }),
    []
  )

  const addWithProviderValidation = useCallback(
    (fileList: File[] | FileList) => {
      const incoming = [...fileList]
      const accepted = incoming.filter((f) => matchesAccept(f))
      if (incoming.length && accepted.length === 0) {
        onError?.({ code: 'accept', message: 'No files match the accepted types.' })
        return
      }
      const withinSize = (f: File) => (maxFileSize ? f.size <= maxFileSize : true)
      const sized = accepted.filter(withinSize)
      if (accepted.length > 0 && sized.length === 0) {
        onError?.({ code: 'max_file_size', message: 'All files exceed the maximum size.' })
        return
      }

      const currentCount = files.length
      const capacity = typeof maxFiles === 'number' ? Math.max(0, maxFiles - currentCount) : undefined
      const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized
      if (typeof capacity === 'number' && sized.length > capacity) {
        onError?.({ code: 'max_files', message: 'Too many files. Some were not added.' })
      }

      if (capped.length > 0) {
        controller?.attachments.add(capped)
      }
    },
    [matchesAccept, maxFileSize, maxFiles, onError, files.length, controller]
  )

  const clearAttachments = useCallback(
    () =>
      usingProvider
        ? controller?.attachments.clear()
        : setItems((prev) => {
            for (const file of prev) {
              if (file.url) {
                URL.revokeObjectURL(file.url)
              }
            }
            return []
          }),
    [usingProvider, controller]
  )

  const clearReferencedSources = useCallback(() => setReferencedSources([]), [])

  const add = usingProvider ? addWithProviderValidation : addLocal
  const remove = usingProvider ? controller.attachments.remove : removeLocal
  const openFileDialog = usingProvider ? controller.attachments.openFileDialog : openFileDialogLocal

  const clear = useCallback(() => {
    clearAttachments()
    clearReferencedSources()
  }, [clearAttachments, clearReferencedSources])

  useEffect(() => {
    if (!usingProvider) {
      return
    }
    controller.__registerFileInput(inputRef, () => inputRef.current?.click())
  }, [usingProvider, controller])

  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = ''
    }
  }, [files, syncHiddenInput])

  useEffect(() => {
    const form = formRef.current
    if (!form) {
      return
    }
    if (globalDrop) {
      return
    }

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
      }
    }
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files)
      }
    }
    form.addEventListener('dragover', onDragOver)
    form.addEventListener('drop', onDrop)
    return () => {
      form.removeEventListener('dragover', onDragOver)
      form.removeEventListener('drop', onDrop)
    }
  }, [add, globalDrop])

  useEffect(() => {
    if (!globalDrop) {
      return
    }

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
      }
    }
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files)
      }
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [add, globalDrop])

  useEffect(
    () => () => {
      if (!usingProvider) {
        for (const f of filesRef.current) {
          if (f.url) {
            URL.revokeObjectURL(f.url)
          }
        }
      }
    },
    [usingProvider]
  )

  const handleChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.currentTarget.files) {
        add(event.currentTarget.files)
      }
      event.currentTarget.value = ''
    },
    [add]
  )

  const attachmentsCtx = useMemo<AttachmentsContext>(
    () => ({
      add,
      clear: clearAttachments,
      fileInputRef: inputRef,
      files: files.map((item) => ({ ...item, id: item.id })),
      openFileDialog,
      remove
    }),
    [files, add, remove, clearAttachments, openFileDialog]
  )

  const refsCtx = useMemo<ReferencedSourcesContext>(
    () => ({
      add: (incoming: SourceDocumentUIPart[] | SourceDocumentUIPart) => {
        const array = Array.isArray(incoming) ? incoming : [incoming]
        setReferencedSources((prev) => [...prev, ...array.map((s) => ({ ...s, id: nanoid() }))])
      },
      clear: clearReferencedSources,
      remove: (id: string) => {
        setReferencedSources((prev) => prev.filter((s) => s.id !== id))
      },
      sources: referencedSources
    }),
    [referencedSources, clearReferencedSources]
  )

  const handleSubmit: FormEventHandler<HTMLFormElement> = useCallback(
    async (event) => {
      event.preventDefault()

      const form = event.currentTarget
      const text = usingProvider
        ? controller.textInput.value
        : (() => {
            const formData = new FormData(form)
            return (formData.get('message') as string) || ''
          })()

      if (!usingProvider) {
        form.reset()
      }

      try {
        const convertedFiles: FileUIPart[] = await Promise.all(
          files.map(async ({ id: _id, ...item }) => {
            if (item.url?.startsWith('blob:')) {
              const dataUrl = await convertBlobUrlToDataUrl(item.url)
              return { ...item, url: dataUrl ?? item.url }
            }
            return item
          })
        )

        const result = onSubmit({ files: convertedFiles, text }, event)

        if (result instanceof Promise) {
          try {
            await result
            clear()
            if (usingProvider) {
              controller.textInput.clear()
            }
          } catch {
            // Don't clear on error
          }
        } else {
          clear()
          if (usingProvider) {
            controller.textInput.clear()
          }
        }
      } catch {
        // Don't clear on error
      }
    },
    [usingProvider, controller, files, onSubmit, clear]
  )

  const inner = (
    <>
      <input
        accept={accept}
        aria-label='Upload files'
        className='hidden'
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title='Upload files'
        type='file'
      />
      <form className={cn('w-full', className)} onSubmit={handleSubmit} ref={formRef} {...props}>
        <InputGroup className='overflow-hidden'>{children}</InputGroup>
      </form>
    </>
  )

  const withReferencedSources = (
    <LocalReferencedSourcesContext.Provider value={refsCtx}>{inner}</LocalReferencedSourcesContext.Provider>
  )

  return (
    <LocalAttachmentsContext.Provider value={attachmentsCtx}>{withReferencedSources}</LocalAttachmentsContext.Provider>
  )
}

export type PromptInputTextareaProps = ComponentProps<typeof InputGroupTextarea> & {
  submitOnCmdEnter?: boolean
  pasteToFileChars?: number
  /**
   * Observe-only callback fired on every input change with the current
   * textarea value. Lets the consumer track text without forcing the input
   * to become a fully controlled component (we never read `value` back).
   *
   * Composes with `onChange` (and the `controlledProps` provider path):
   * `onTextChange` always fires after the existing handlers run. Safe to omit.
   */
  onTextChange?: (text: string) => void
}

export const PromptInputTextarea = ({
  onChange,
  onKeyDown,
  onTextChange,
  className,
  placeholder = 'What would you like to know?',
  submitOnCmdEnter = false,
  pasteToFileChars,
  ...props
}: PromptInputTextareaProps) => {
  const controller = useOptionalPromptInputController()
  const attachments = usePromptInputAttachments()
  const { Textarea } = useSmartPromptComponents()
  const [isComposing, setIsComposing] = useState(false)

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onKeyDown?.(e)

      if (e.defaultPrevented) {
        return
      }

      if (e.key === 'Enter') {
        if (isComposing || e.nativeEvent.isComposing) {
          return
        }
        if (e.shiftKey) {
          return
        }
        if (submitOnCmdEnter && !e.metaKey && !e.ctrlKey) {
          return
        }
        e.preventDefault()

        const { form } = e.currentTarget
        const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null
        if (submitButton?.disabled) {
          return
        }

        form?.requestSubmit()
      }

      if (e.key === 'Backspace' && e.currentTarget.value === '' && attachments.files.length > 0) {
        e.preventDefault()
        const lastAttachment = attachments.files.at(-1)
        if (lastAttachment) {
          attachments.remove(lastAttachment.id)
        }
      }
    },
    [onKeyDown, isComposing, attachments, submitOnCmdEnter]
  )

  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = useCallback(
    (event) => {
      const items = event.clipboardData?.items

      if (!items) {
        return
      }

      const pastedFiles: File[] = []

      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            pastedFiles.push(file)
          }
        }
      }

      if (pastedFiles.length > 0) {
        event.preventDefault()
        attachments.add(pastedFiles)
        return
      }

      if (pasteToFileChars !== undefined) {
        const text = event.clipboardData?.getData('text/plain') ?? ''
        if (text.length >= pasteToFileChars) {
          event.preventDefault()
          const file = new File([text], 'pasted-text.txt', { type: 'text/plain', lastModified: Date.now() })
          attachments.add([file])
          return
        }
      }
    },
    [attachments, pasteToFileChars]
  )

  const handleCompositionEnd = useCallback(() => setIsComposing(false), [])
  const handleCompositionStart = useCallback(() => setIsComposing(true), [])

  // Compose onChange so `onTextChange` fires on every input. This is the
  // "uncontrolled-but-observable" path the consumer relies on: the textarea
  // stays uncontrolled (no `value` prop except in the provider branch), but
  // the consumer can mirror the typed text into its own state in real time
  // without taking ownership of the value. Keeps Herald (no `onTextChange`)
  // byte-identical with the previous behavior.
  const controlledProps = controller
    ? {
        onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
          controller.textInput.setInput(e.currentTarget.value)
          onChange?.(e)
          onTextChange?.(e.currentTarget.value)
        },
        value: controller.textInput.value
      }
    : {
        onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
          onChange?.(e)
          onTextChange?.(e.currentTarget.value)
        }
      }

  // INJECTION CONTRACT — see ui-library-system SKILL.md. The shared input
  // ships NO library. The consuming app injects `Textarea` (Vāda via build-time
  // `@atta/ui`, Herald via runtime `useComponents()`). When the injected
  // component is undefined (e.g. runtime library still loading on first paint),
  // we degrade to a native textarea with vendor styling — exactly mirroring
  // JDInput's `Button ? <Button…> : <button>` pattern. This is the difference
  // between graceful first paint and a crash.
  const baseClassName = cn('field-sizing-content max-h-40 min-h-16 overflow-y-auto', className)

  if (Textarea) {
    return (
      <Textarea
        className={baseClassName}
        name='message'
        onCompositionEnd={handleCompositionEnd}
        onCompositionStart={handleCompositionStart}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={placeholder}
        {...props}
        {...controlledProps}
      />
    )
  }
  return (
    <InputGroupTextarea
      className={baseClassName}
      name='message'
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      {...props}
      {...controlledProps}
    />
  )
}

export type PromptInputHeaderProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>

export const PromptInputHeader = ({ className, ...props }: PromptInputHeaderProps) => (
  <InputGroupAddon align='block-end' className={cn('order-first flex-wrap gap-1', className)} {...props} />
)

export type PromptInputFooterProps = Omit<ComponentProps<typeof InputGroupAddon>, 'align'>

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
  <InputGroupAddon align='block-end' className={cn('justify-between gap-1', className)} {...props} />
)

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>

export const PromptInputTools = ({ className, ...props }: PromptInputToolsProps) => (
  <div className={cn('flex min-w-0 items-center gap-1', className)} {...props} />
)

// ============================================================================
// ActionMenu — uses injected DropdownMenu primitives
// ============================================================================

export type PromptInputActionMenuProps = { children?: ReactNode } & Record<string, unknown>

export const PromptInputActionMenu = ({ children, ...props }: PromptInputActionMenuProps) => {
  const { DropdownMenu } = useSmartPromptComponents()
  if (DropdownMenu) {
    return <DropdownMenu {...props}>{children}</DropdownMenu>
  }
  // Graceful fallback: render children inline so the trigger remains visible.
  // The dropdown won't function until the library loads, but nothing crashes.
  return <>{children}</>
}

export type PromptInputActionMenuTriggerProps = {
  className?: string
  children?: ReactNode
} & Record<string, unknown>

export const PromptInputActionMenuTrigger = ({ className, children, ...props }: PromptInputActionMenuTriggerProps) => {
  const { Button, DropdownMenuTrigger } = useSmartPromptComponents()

  const triggerNode = Button ? (
    <Button type='button' variant='ghost' size='icon' className={className} {...props}>
      {children ?? <PlusIcon className='size-4' />}
    </Button>
  ) : (
    <button
      type='button'
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground',
        className
      )}
      {...props}
    >
      {children ?? <PlusIcon className='size-4' />}
    </button>
  )

  if (DropdownMenuTrigger) {
    return <DropdownMenuTrigger asChild>{triggerNode}</DropdownMenuTrigger>
  }
  return triggerNode
}

export type PromptInputActionMenuContentProps = {
  className?: string
  children?: ReactNode
} & Record<string, unknown>

export const PromptInputActionMenuContent = ({ className, children, ...props }: PromptInputActionMenuContentProps) => {
  const { DropdownMenuContent } = useSmartPromptComponents()
  if (DropdownMenuContent) {
    return (
      <DropdownMenuContent align='start' className={className} {...props}>
        {children}
      </DropdownMenuContent>
    )
  }
  // Render nothing — without DropdownMenu the menu can't be opened anyway.
  return null
}

// ============================================================================
// Submit button — uses injected Button + lucide icons (Spinner removed)
// ============================================================================

export type PromptInputSubmitProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  status?: ChatStatus
  onStop?: () => void
  variant?: string
  size?: string
}

export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon-sm',
  status,
  onStop,
  onClick,
  children,
  ...props
}: PromptInputSubmitProps) => {
  const { Button } = useSmartPromptComponents()
  const isGenerating = status === 'submitted' || status === 'streaming'

  let Icon = <ArrowDownIcon className='size-4' />

  if (status === 'submitted') {
    Icon = <Loader2 className='size-4 animate-spin' />
  } else if (status === 'streaming') {
    Icon = <SquareIcon className='size-4' />
  } else if (status === 'error') {
    Icon = <XIcon className='size-4' />
  }

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isGenerating && onStop) {
        e.preventDefault()
        onStop()
        return
      }
      onClick?.(e)
    },
    [isGenerating, onStop, onClick]
  )

  if (Button) {
    return (
      <Button
        aria-label={isGenerating ? 'Stop' : 'Submit'}
        className={className}
        onClick={handleClick}
        size={size}
        type={isGenerating && onStop ? 'button' : 'submit'}
        variant={variant}
        {...props}
      >
        {children ?? Icon}
      </Button>
    )
  }
  // Graceful fallback during runtime-library load window.
  return (
    <button
      aria-label={isGenerating ? 'Stop' : 'Submit'}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={handleClick}
      type={isGenerating && onStop ? 'button' : 'submit'}
      {...props}
    >
      {children ?? Icon}
    </button>
  )
}
