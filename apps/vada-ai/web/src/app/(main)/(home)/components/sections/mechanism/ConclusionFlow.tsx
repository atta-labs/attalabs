import { Text } from '@atta/ui'
import { EyeOff } from 'lucide-react'
import { FlowArrow } from '../../primitives/FlowArrow'

const CONCLUSION_FIELDS = ['Recommendation', 'Key condition', 'Unresolved'] as const

interface TerminalState {
  label: string
  body: string
  tone: 'text-success' | 'text-warning' | 'text-destructive'
  border: 'border-success/40' | 'border-warning/40' | 'border-destructive/40'
}

const TERMINAL_STATES: TerminalState[] = [
  { label: 'Clean', body: 'Passed on first review.', tone: 'text-success', border: 'border-success/40' },
  { label: 'Revised', body: 'Caught a problem, fixed it.', tone: 'text-warning', border: 'border-warning/40' },
  {
    label: 'Unconverged',
    body: 'Honest signal, not failure.',
    tone: 'text-destructive',
    border: 'border-destructive/40'
  }
]

function ConclusionCard() {
  return (
    <div className='flex flex-col gap-3 rounded-md border border-border bg-card p-5'>
      <div className='flex items-center justify-between gap-3'>
        <Text as='small' className='font-mono uppercase tracking-widest text-xs text-muted-foreground'>
          Conclusion
        </Text>
        <span className='rounded-sm border border-success/40 bg-success/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-success'>
          Clean
        </span>
      </div>
      <ul className='flex flex-col gap-2'>
        {CONCLUSION_FIELDS.map((field) => (
          <li key={field} className='flex items-center gap-2'>
            <span className='size-1.5 shrink-0 rounded-full bg-success' aria-hidden />
            <Text as='small' className='text-sm text-muted-foreground'>
              {field}
            </Text>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BlindCritic() {
  return (
    <div className='flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background/40 p-6 text-center'>
      <EyeOff className='size-5 text-muted-foreground' aria-hidden />
      <Text as='small' className='font-mono uppercase tracking-widest text-xs text-foreground'>
        Blind Critic
      </Text>
      <Text as='small' className='italic text-xs text-muted-foreground max-w-[200px]'>
        Sees only the initial question and the final conclusion.
      </Text>
    </div>
  )
}

function TerminalStates() {
  return (
    <div className='flex flex-col gap-2'>
      {TERMINAL_STATES.map(({ label, body, tone, border }) => (
        <div key={label} className={`flex flex-col gap-0.5 rounded-md border bg-card/40 px-4 py-3 ${border}`}>
          <Text as='small' className={`font-mono uppercase tracking-widest text-xs ${tone}`}>
            {label}
          </Text>
          <Text as='small' className='text-xs text-muted-foreground'>
            {body}
          </Text>
        </div>
      ))}
    </div>
  )
}

export function ConclusionFlow() {
  return (
    <div className='grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center md:gap-4'>
      <ConclusionCard />
      <FlowArrow direction='responsive' />
      <BlindCritic />
      <FlowArrow direction='responsive' />
      <TerminalStates />
    </div>
  )
}
