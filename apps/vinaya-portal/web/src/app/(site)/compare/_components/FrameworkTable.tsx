import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Heading, Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { CompareSection } from './CompareSection'
import { type Status, StatusCell } from './StatusCell'

interface FrameworkRow {
  framework: string
  namedRoles: Status
  orderedStages: Status
  handoffExits: Status
  shipsMergeGate: Status
  survivesIgnored: Status
  highlight?: boolean
}

const FRAMEWORKS: FrameworkRow[] = [
  {
    framework: 'Spec Kit',
    namedRoles: 'no',
    orderedStages: 'yes',
    handoffExits: 'no',
    shipsMergeGate: 'no',
    survivesIgnored: 'no'
  },
  {
    framework: 'BMAD',
    namedRoles: 'yes',
    orderedStages: 'yes',
    handoffExits: 'no',
    shipsMergeGate: 'no',
    survivesIgnored: 'no'
  },
  {
    framework: 'OpenSpec',
    namedRoles: 'no',
    orderedStages: 'yes',
    handoffExits: 'yes',
    shipsMergeGate: 'no',
    survivesIgnored: 'no'
  },
  {
    framework: 'Kiro',
    namedRoles: 'no',
    orderedStages: 'no',
    handoffExits: 'no',
    shipsMergeGate: 'no',
    survivesIgnored: 'diy'
  },
  {
    framework: 'Vinaya',
    namedRoles: 'yes',
    orderedStages: 'yes',
    handoffExits: 'yes',
    shipsMergeGate: 'yes',
    survivesIgnored: 'yes',
    highlight: true
  }
]

export function FrameworkTable() {
  return (
    <CompareSection id='frameworks' alt>
      <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>
        workflow-layer frameworks
      </Text>
      <Heading
        level={2}
        weight='normal'
        className='mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl'
      >
        The workflow layer, framework by framework
      </Heading>

      <div className='mt-10'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Framework</TableHead>
              <TableHead className='font-semibold text-foreground'>Named roles</TableHead>
              <TableHead className='font-semibold text-foreground'>Ordered stages</TableHead>
              <TableHead className='font-semibold text-foreground'>Handoff exits 1</TableHead>
              <TableHead className='font-semibold text-foreground'>Ships merge gate</TableHead>
              <TableHead className='font-semibold text-foreground'>Survives being ignored</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FRAMEWORKS.map((row) => (
              <TableRow key={row.framework} className={cn(row.highlight && 'bg-primary/5')}>
                <TableCell
                  className={cn('font-sans text-sm', row.highlight ? 'font-semibold text-primary' : 'text-foreground')}
                >
                  {row.framework}
                </TableCell>
                <TableCell>
                  <StatusCell status={row.namedRoles} />
                </TableCell>
                <TableCell>
                  <StatusCell status={row.orderedStages} />
                </TableCell>
                <TableCell>
                  <StatusCell status={row.handoffExits} />
                </TableCell>
                <TableCell>
                  <StatusCell status={row.shipsMergeGate} />
                </TableCell>
                <TableCell>
                  <StatusCell status={row.survivesIgnored} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className='mt-6 max-w-2xl'>
        <Text className='text-sm leading-relaxed text-muted-foreground'>
          OpenSpec’s own{' '}
          <NextLink href='https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md' variant='subtle'>
            validate --strict
          </NextLink>{' '}
          really does exit 1 on a failing spec — real, and precisely the shape a merge gate needs. Kiro’s{' '}
          <NextLink href='https://kiro.dev/docs/hooks/' variant='subtle'>
            hooks
          </NextLink>{' '}
          can block a tool call mid-session; they were built for runtime intervention, not to gate a merge — a different
          job, not a smaller version of this one.
        </Text>
        <Text className='mt-4 text-sm leading-relaxed text-muted-foreground'>
          We know of no other product that ships an ordered workflow and a required merge gate together. The closest is
          GitHub’s own{' '}
          <NextLink href='https://github.com/github/gh-aw' variant='subtle'>
            Agentic Workflows
          </NextLink>{' '}
          (gh-aw), which can require a workflow run to pass — without shipping the ordered roles/stages layer above it.
        </Text>
      </div>
    </CompareSection>
  )
}
