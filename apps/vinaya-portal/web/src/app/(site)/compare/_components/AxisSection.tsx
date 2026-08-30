import { Badge } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { CompareSection } from './CompareSection'

interface Layer {
  name: string
  description: string
  vinaya?: boolean
  note?: string
}

// Order is the binding structure: context/rules is where most frameworks —
// and Vinaya's own doctrine — live; the waterline sits between runtime
// gating and merge gate, the line the evidence above says steering doesn't
// cross on its own.
const ABOVE_WATERLINE: Layer[] = [
  {
    name: 'Context / rules',
    description: 'A prompt, a CLAUDE.md, a cursor rule, a rules file.',
    note: 'Vinaya ships its own doctrine here too — words, same as anyone else’s rules file, until something outside the agent enforces them.'
  },
  {
    name: 'Workflow & spec',
    description: 'Ordered stages, named roles, a structured handoff between them.',
    vinaya: true
  },
  {
    name: 'Runtime gating',
    description: 'A hook that can intercept or block a tool call mid-session.'
  }
]

const BELOW_WATERLINE: Layer[] = [
  {
    name: 'Merge gate',
    description: 'A required check the pull request cannot merge without.',
    vinaya: true
  },
  {
    name: 'Enterprise governance',
    description:
      'Policy frameworks and audit regimes (Credo AI, NIST, ISO, EU AI Act) — out of scope: a different altitude, applied above any single repo.'
  }
]

function LayerRow({ layer }: { layer: Layer }) {
  return (
    <div className='flex flex-col gap-2 border-b border-border py-6 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8'>
      <div className='flex items-center gap-3'>
        <Heading level={3} weight='normal' className='font-serif text-xl tracking-tight text-foreground'>
          {layer.name}
        </Heading>
        {layer.vinaya && (
          <Badge variant='default' className='bg-primary font-mono text-[0.625rem] uppercase tracking-[0.16em]'>
            Vinaya
          </Badge>
        )}
      </div>
      <div className='max-w-xl sm:text-right'>
        <Text className='leading-relaxed text-muted-foreground'>{layer.description}</Text>
        {layer.note && <Text className='mt-2 text-sm leading-relaxed text-muted-foreground/80'>{layer.note}</Text>}
      </div>
    </div>
  )
}

export function AxisSection() {
  return (
    <CompareSection id='axis'>
      <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>five layers</Text>
      <Heading
        level={2}
        weight='normal'
        className='mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl'
      >
        Where governance actually happens
      </Heading>

      <div className='mt-12'>
        {ABOVE_WATERLINE.map((layer) => (
          <LayerRow key={layer.name} layer={layer} />
        ))}

        <div
          className={cn(
            'my-2 flex items-center gap-4 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-center'
          )}
        >
          <span className='h-px flex-1 bg-warning/40' aria-hidden />
          <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-warning'>
            steering stops working below this line
          </Text>
          <span className='h-px flex-1 bg-warning/40' aria-hidden />
        </div>

        {BELOW_WATERLINE.map((layer) => (
          <LayerRow key={layer.name} layer={layer} />
        ))}
      </div>
    </CompareSection>
  )
}
