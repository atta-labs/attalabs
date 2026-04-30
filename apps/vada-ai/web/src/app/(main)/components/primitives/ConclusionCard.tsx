import { Text } from '@atta/ui'

export type ConclusionState = 'Clean' | 'Revised' | 'Unconverged'

export interface ConclusionField {
  label: string
  value?: string
}

interface ConclusionCardProps {
  state: ConclusionState
  fields: ConclusionField[]
  hideTitle?: boolean
}

const STATE_TONE: Record<ConclusionState, { text: string; bullet: string; border: string; bg: string }> = {
  Clean: {
    text: 'text-success',
    bullet: 'bg-success',
    border: 'border-success/40',
    bg: 'bg-success/10'
  },
  Revised: {
    text: 'text-warning',
    bullet: 'bg-warning',
    border: 'border-warning/40',
    bg: 'bg-warning/10'
  },
  Unconverged: {
    text: 'text-destructive',
    bullet: 'bg-destructive',
    border: 'border-destructive/40',
    bg: 'bg-destructive/10'
  }
}

export function ConclusionCard({ state, fields, hideTitle }: ConclusionCardProps) {
  const tone = STATE_TONE[state]
  return (
    <div className='flex flex-col gap-3 rounded-md border border-border bg-card p-5'>
      {hideTitle ? (
        <div className='flex justify-end'>
          <span
            className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${tone.text} ${tone.border} ${tone.bg}`}
          >
            {state}
          </span>
        </div>
      ) : (
        <div className='font-mono uppercase tracking-widest text-xs'>
          <span className='text-muted-foreground'>Conclusion</span>
          <span className='mx-2 text-muted-foreground/60' aria-hidden>
            ·
          </span>
          <span className={tone.text}>{state}</span>
        </div>
      )}
      <ul className='flex flex-col gap-2'>
        {fields.map(({ label, value }) => (
          <li key={label} className='flex items-start gap-2'>
            <span className={`mt-2 size-1.5 shrink-0 rounded-full ${tone.bullet}`} aria-hidden />
            <Text as='small' className='text-sm text-muted-foreground leading-relaxed'>
              {value ? (
                <>
                  <span className='font-medium text-foreground'>{label}:</span> {value}
                </>
              ) : (
                label
              )}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  )
}
