import { Badge, Card, CardContent } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowDown } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DiagramGroups, DiagramInputGroup } from '../_lib/load-state-machine'

/**
 * The state machine in one glance: inputs (facts + labels) → the ordered rule
 * chain → the statuses it concludes. A server component, like everything else
 * on this route — it receives `DiagramGroups` as plain props and must never
 * become a client component (see `StateMachineTables.tsx` for why).
 *
 * Every count here is an array length and every name an array element, derived
 * by `deriveDiagramGroups`. Nothing in this file may state a number or a status
 * name as a literal — that would be a second copy of the model, exactly what
 * the page removes.
 */

function Group({ title, count, children }: { title: string; count: number; children?: ReactNode }) {
  return (
    <div className='flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-4 py-3'>
      <div className='flex items-baseline justify-between gap-3'>
        <Text as='span' className='font-sans text-sm text-foreground'>
          {title}
        </Text>
        <Text as='span' className='font-mono text-lg text-foreground'>
          {count}
        </Text>
      </div>
      {children}
    </div>
  )
}

function SampleGroup({ group }: { group: DiagramInputGroup }) {
  return (
    <Group title={group.label} count={group.count}>
      <Text as='span' className='font-mono text-xs text-muted-foreground'>
        {group.samples.join(' · ')} …
      </Text>
    </Group>
  )
}

function Connector() {
  return (
    <div className='flex justify-center py-1'>
      <ArrowDown className='size-4 text-muted-foreground' aria-hidden />
    </div>
  )
}

export function StateMachineDiagram({ groups }: { groups: DiagramGroups }) {
  return (
    <Card>
      <CardContent className='flex flex-col gap-1'>
        <Heading level={2} className='pb-2 font-sans text-xs uppercase tracking-wider text-muted-foreground'>
          What derivation reads, and what it concludes
        </Heading>

        <div className='flex flex-col gap-2'>
          <SampleGroup group={groups.facts} />
          <SampleGroup group={groups.labels} />
        </div>

        <Connector />

        <Group title={groups.rules.label} count={groups.rules.count}>
          <Text as='span' className='font-sans text-xs text-muted-foreground'>
            Evaluated in order — the first rule that matches decides.
          </Text>
        </Group>

        <Connector />

        <Group title={groups.statuses.label} count={groups.statuses.count}>
          <div className='flex flex-wrap gap-1.5 pt-1'>
            {groups.statuses.names.map((name) => (
              <Badge key={name} variant='outline' className='font-mono text-xs font-normal'>
                {name}
              </Badge>
            ))}
          </div>
        </Group>

        <Text as='p' className='pt-3 font-sans text-xs text-muted-foreground'>
          Every count above is the length of a live model array — nothing here is typed by hand.
        </Text>
      </CardContent>
    </Card>
  )
}
