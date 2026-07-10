'use client'

import { Tabs, TabsList, TabsTrigger } from '@atta/ui/components/tabs'
import { Input, Textarea } from '@atta/ui/components'
import type { JdInput, JdInputKind } from '@/lib/audit-input/types'

interface JdInputControlProps {
  value: JdInput
  onChange: (next: JdInput) => void
  index: number
}

export function JdInputControl({ value, onChange, index }: JdInputControlProps) {
  function setKind(next: JdInputKind) {
    if (next === value.kind) return
    onChange({ kind: next, value: '' })
  }

  return (
    <div className='space-y-2'>
      <Tabs value={value.kind} onValueChange={(v) => setKind(v as JdInputKind)}>
        <TabsList className='h-8'>
          <TabsTrigger value='text' className='font-mono text-xs uppercase tracking-[0.2em]'>
            Paste text
          </TabsTrigger>
          <TabsTrigger value='url' className='font-mono text-xs uppercase tracking-[0.2em]'>
            URL
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {value.kind === 'text' ? (
        <Textarea
          value={value.value}
          onChange={(e) => onChange({ kind: 'text', value: e.target.value })}
          placeholder='Paste a job description (min. 20 characters)…'
          className='min-h-[160px] font-sans text-sm'
          aria-label={`Job description ${index + 1} (pasted text)`}
        />
      ) : (
        <div className='space-y-1'>
          <Input
            type='url'
            value={value.value}
            onChange={(e) => onChange({ kind: 'url', value: e.target.value })}
            placeholder='https://example.com/jobs/senior-engineer'
            className='font-sans text-sm'
            aria-label={`Job description ${index + 1} (URL)`}
          />
          <p className='font-mono text-xs text-muted-foreground'>
            Public http(s) URL. Herald fetches the page and extracts the JD text on submit.
          </p>
        </div>
      )}
    </div>
  )
}
