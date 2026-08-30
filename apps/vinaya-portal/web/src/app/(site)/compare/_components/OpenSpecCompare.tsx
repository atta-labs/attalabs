import { Code, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { CompareSection } from './CompareSection'
import { type Status, StatusCell } from './StatusCell'

interface Row {
  capability: string
  openspec: Status | 'text'
  openspecText?: string
  vinaya: Status | 'text'
  vinayaText?: string
  yoursToChange: string
  yoursToChangeCode?: boolean
}

const ROWS: Row[] = [
  { capability: 'Three rings', openspec: 'no', vinaya: 'yes', yoursToChange: 'checks', yoursToChangeCode: true },
  { capability: 'Review gate', openspec: 'no', vinaya: 'yes', yoursToChange: 'principals', yoursToChangeCode: true },
  {
    capability: 'Evidence freshness',
    openspec: 'no',
    vinaya: 'yes',
    yoursToChange: 'Fixed — a guarantee, not a preference'
  },
  {
    capability: 'Forge planning',
    openspec: 'no',
    vinaya: 'yes',
    yoursToChange: '.vinaya/projects.md',
    yoursToChangeCode: true
  },
  { capability: 'Studio', openspec: 'no', vinaya: 'yes', yoursToChange: '—' },
  {
    capability: 'Doc coverage',
    openspec: 'no',
    vinaya: 'yes',
    yoursToChange: '.vinaya/doc-owners',
    yoursToChangeCode: true
  },
  {
    capability: 'Forge-required',
    openspec: 'text',
    openspecText: 'No — works with any repo',
    vinaya: 'text',
    vinayaText: 'GitHub — the one opinion',
    yoursToChange: 'briefSchema',
    yoursToChangeCode: true
  },
  {
    capability: 'Uninstall',
    openspec: 'text',
    openspecText: 'Delete the files',
    vinaya: 'text',
    vinayaText: 'eject',
    yoursToChange: 'hook blocks + eject'
  }
]

function CapabilityCell({ status, text }: { status: Status | 'text'; text?: string }) {
  if (status === 'text') return <Text className='font-mono text-sm text-foreground'>{text}</Text>
  return <StatusCell status={status} />
}

export function OpenSpecCompare() {
  return (
    <CompareSection id='openspec'>
      <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.28em] text-muted-foreground'>
        openspec head-to-head
      </Text>
      <Heading
        level={2}
        weight='normal'
        className='mt-4 max-w-2xl font-serif text-3xl leading-tight tracking-tight sm:text-4xl'
      >
        In the box: OpenSpec vs. Vinaya
      </Heading>

      <div className='mt-10'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>In the box</TableHead>
              <TableHead className='font-semibold text-foreground'>OpenSpec</TableHead>
              <TableHead className='font-semibold text-foreground'>Vinaya</TableHead>
              <TableHead className='font-semibold text-foreground'>Yours to change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.capability}>
                <TableCell className='font-sans text-sm text-foreground'>{row.capability}</TableCell>
                <TableCell>
                  <CapabilityCell status={row.openspec} text={row.openspecText} />
                </TableCell>
                <TableCell>
                  <CapabilityCell status={row.vinaya} text={row.vinayaText} />
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>
                  {row.yoursToChangeCode ? <Code className='text-xs'>{row.yoursToChange}</Code> : row.yoursToChange}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className='bg-primary/10'>
              <TableCell colSpan={4} className={cn('font-serif text-base leading-relaxed text-foreground')}>
                <span className='font-mono text-xs uppercase tracking-[0.16em] text-primary'>Together — </span>
                <Code className='text-xs'>openspec validate</Code> is exactly the shape a Vinaya custom check takes:
                wrap it with <Code className='text-xs'>vinaya new check</Code> and it becomes the merge gate it was
                always one step from being.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CompareSection>
  )
}
