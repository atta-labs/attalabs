import { Badge } from '@atta/ui/components'
import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { RevealGrid } from '../../_components/landing/LandingInteractions'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'
import { StatusCell } from './StatusCell'

interface Layer {
  name: string
  description: string
  examples: string
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
    examples: 'CLAUDE.md, .cursorrules, an agent’s system prompt',
    note: 'Vinaya ships its own doctrine here too — words, same as anyone else’s rules file, until something outside the agent enforces them.'
  },
  {
    name: 'Workflow & spec',
    description: 'Ordered stages, named roles, a structured handoff between them.',
    examples: 'Superpowers, Spec Kit, BMAD, OpenSpec, Vinaya',
    vinaya: true
  },
  {
    name: 'Runtime gating',
    description: 'A hook that can intercept or block a tool call mid-session.',
    examples: 'agent hooks and pre-tool controls'
  }
]

const BELOW_WATERLINE: Layer[] = [
  {
    name: 'Merge gate',
    description: 'A required check the pull request cannot merge without.',
    examples: 'GitHub required status checks, Vinaya’s review gate',
    vinaya: true
  },
  {
    name: 'Enterprise governance',
    description:
      'Policy frameworks and audit regimes — out of scope: a different altitude, applied above any single repo.',
    examples: 'Credo AI, NIST, ISO, EU AI Act'
  }
]

const BAND = 'grid gap-7 py-7 md:grid-cols-[minmax(9rem,14rem)_minmax(12rem,1.1fr)_minmax(14rem,1.4fr)_6rem]'

function LayerBand({ layer, submerged }: { layer: Layer; submerged?: boolean }) {
  return (
    <div className={cn(BAND, 'border-b border-border', submerged && '-mx-4 bg-muted/40 px-4')}>
      <Text className='font-serif text-2xl leading-tight tracking-tight'>{layer.name}</Text>
      <Text className='text-sm leading-relaxed text-muted-foreground'>{layer.description}</Text>
      <div>
        <Text className='text-sm leading-relaxed text-muted-foreground'>{layer.examples}</Text>
        {layer.note && <Text className='mt-2 text-xs leading-relaxed text-muted-foreground/80'>{layer.note}</Text>}
      </div>
      <div>
        {layer.vinaya ? (
          <Badge variant='default' className='bg-primary font-mono text-[0.625rem] uppercase tracking-[0.16em]'>
            Vinaya
          </Badge>
        ) : (
          <StatusCell status='dash' />
        )}
      </div>
    </div>
  )
}

export function AxisSection() {
  return (
    <LandingSection id='axis' background='bg-background text-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>five layers</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        Where governance actually happens
      </SectionTitle>

      <RevealGrid className='mt-12 border-t border-border'>
        {ABOVE_WATERLINE.map((layer, index) => (
          <div
            key={layer.name}
            className={cn(
              'translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100',
              index % 3 === 1 && 'delay-[90ms]',
              index % 3 === 2 && 'delay-[180ms]'
            )}
          >
            <LayerBand layer={layer} />
          </div>
        ))}

        <div className='flex items-center gap-5 border-y-2 border-dashed border-warning/50 bg-warning/10 py-3.5'>
          <span className='h-px flex-1 bg-warning/40' aria-hidden />
          <Text className='whitespace-nowrap font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-warning'>
            steering stops working below this line
          </Text>
          <span className='h-px flex-1 bg-warning/40' aria-hidden />
        </div>

        {BELOW_WATERLINE.map((layer, index) => (
          <div
            key={layer.name}
            className={cn(
              'translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100',
              index % 3 === 1 && 'delay-[90ms]',
              index % 3 === 2 && 'delay-[180ms]'
            )}
          >
            <LayerBand layer={layer} submerged />
          </div>
        ))}
      </RevealGrid>
    </LandingSection>
  )
}
