import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
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

function LayerRows({ layers }: { layers: Layer[] }) {
  return (
    <>
      {layers.map((layer) => (
        <TableRow key={layer.name}>
          <TableCell className='font-sans text-sm font-medium text-foreground'>{layer.name}</TableCell>
          <TableCell className='text-sm text-muted-foreground'>{layer.description}</TableCell>
          <TableCell className='text-sm text-muted-foreground'>
            {layer.examples}
            {layer.note && <Text className='mt-2 text-xs leading-relaxed text-muted-foreground/80'>{layer.note}</Text>}
          </TableCell>
          <TableCell>
            {layer.vinaya ? (
              <Badge variant='default' className='bg-primary font-mono text-[0.625rem] uppercase tracking-[0.16em]'>
                Vinaya
              </Badge>
            ) : (
              <StatusCell status='dash' />
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export function AxisSection() {
  return (
    <LandingSection id='axis' background='bg-background text-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>five layers</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        Where governance actually happens
      </SectionTitle>

      <div className='mt-10'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Layer</TableHead>
              <TableHead className='font-semibold text-foreground'>What runs there</TableHead>
              <TableHead className='font-semibold text-foreground'>Examples</TableHead>
              <TableHead className='font-semibold text-foreground'>Vinaya</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <LayerRows layers={ABOVE_WATERLINE} />
            <TableRow>
              <TableCell colSpan={4} className='border-y border-warning/40 bg-warning/10 py-3 text-center'>
                <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-warning'>
                  steering stops working below this line
                </Text>
              </TableCell>
            </TableRow>
            <LayerRows layers={BELOW_WATERLINE} />
          </TableBody>
        </Table>
      </div>
    </LandingSection>
  )
}
