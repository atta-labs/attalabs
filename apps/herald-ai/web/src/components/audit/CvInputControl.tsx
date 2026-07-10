'use client'

import { FileText, X } from 'lucide-react'
import { Button } from '@atta/ui/components/button'
import { Tabs, TabsList, TabsTrigger } from '@atta/ui/components/tabs'
import { Input, Textarea } from '@atta/ui/components'

export type CvInputDraftKind = 'text' | 'markdown' | 'pdf' | 'profile'

export type CvInputDraft =
  | { kind: 'text'; value: string }
  | { kind: 'profile'; value: string }
  | { kind: 'markdown'; file: File | null }
  | { kind: 'pdf'; file: File | null }

interface CvInputControlProps {
  value: CvInputDraft
  onChange: (next: CvInputDraft) => void
  index: number
}

const EMPTY: Record<CvInputDraftKind, CvInputDraft> = {
  text: { kind: 'text', value: '' },
  profile: { kind: 'profile', value: '' },
  markdown: { kind: 'markdown', file: null },
  pdf: { kind: 'pdf', file: null }
}

export function CvInputControl({ value, onChange, index }: CvInputControlProps) {
  function setKind(next: CvInputDraftKind) {
    if (next === value.kind) return
    onChange(EMPTY[next])
  }

  return (
    <div className='space-y-2'>
      <Tabs value={value.kind} onValueChange={(v) => setKind(v as CvInputDraftKind)}>
        <TabsList className='h-8'>
          <TabsTrigger value='text' className='font-mono text-xs uppercase tracking-[0.2em]'>
            Paste text
          </TabsTrigger>
          <TabsTrigger value='markdown' className='font-mono text-xs uppercase tracking-[0.2em]'>
            .md
          </TabsTrigger>
          <TabsTrigger value='pdf' className='font-mono text-xs uppercase tracking-[0.2em]'>
            .pdf
          </TabsTrigger>
          <TabsTrigger value='profile' className='font-mono text-xs uppercase tracking-[0.2em]'>
            Profile
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {value.kind === 'text' && (
        <Textarea
          value={value.value}
          onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
          placeholder='Paste a CV (min. 50 characters)…'
          className='min-h-[140px] font-sans text-sm'
          aria-label={`Candidate ${index + 1} (pasted CV)`}
        />
      )}

      {value.kind === 'profile' && (
        <div className='space-y-1'>
          <Input
            type='text'
            value={value.value}
            onChange={(e) => onChange({ kind: 'profile', value: e.target.value })}
            placeholder='dani'
            className='font-mono text-sm'
            aria-label={`Candidate ${index + 1} (Herald profile)`}
          />
          <p className='font-mono text-xs text-muted-foreground'>Username of a published Herald profile.</p>
        </div>
      )}

      {(value.kind === 'markdown' || value.kind === 'pdf') && (
        <FileSlot
          // Remount on kind switch or clear to wipe the underlying uncontrolled
          // file input — file inputs in React can't be controlled.
          key={`${value.kind}-${value.file ? 'set' : 'empty'}`}
          file={value.file}
          accept={value.kind === 'pdf' ? 'application/pdf,.pdf' : '.md,.markdown,text/markdown'}
          onSelect={(file) => onChange({ kind: value.kind, file })}
          onClear={() => onChange({ kind: value.kind, file: null })}
          label={
            value.kind === 'pdf' ? 'Drop a .pdf CV or click to choose' : 'Drop a .md / .markdown CV or click to choose'
          }
          ariaLabel={`Candidate ${index + 1} (${value.kind} upload)`}
        />
      )}
    </div>
  )
}

interface FileSlotProps {
  file: File | null
  accept: string
  onSelect: (file: File) => void
  onClear: () => void
  label: string
  ariaLabel: string
}

function FileSlot({ file, accept, onSelect, onClear, label, ariaLabel }: FileSlotProps) {
  return (
    <div className='space-y-1'>
      <Input
        type='file'
        accept={accept}
        className='font-mono text-xs'
        aria-label={ariaLabel}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onSelect(f)
        }}
      />
      {file ? (
        <div className='flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2'>
          <div className='flex items-center gap-2 overflow-hidden'>
            <FileText className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
            <span className='truncate font-mono text-xs text-foreground'>{file.name}</span>
            <span className='shrink-0 font-mono text-xs text-muted-foreground'>{(file.size / 1024).toFixed(1)} KB</span>
          </div>
          <Button
            variant='ghost'
            size='sm'
            className='h-6 px-2 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground'
            onClick={onClear}
          >
            <X className='h-3 w-3' />
          </Button>
        </div>
      ) : (
        <p className='font-mono text-xs text-muted-foreground'>{label}</p>
      )}
    </div>
  )
}
