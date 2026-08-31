import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { NextLink } from '@atta/ui/lib/next-link'
import { Text } from '@atta/ui/shared'
import { cn } from '@atta/ui/lib/utils'
import { Check, HelpCircle, Minus, Puzzle } from 'lucide-react'
import { Fragment } from 'react'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'
import { CAPABILITY_GROUPS, type CapabilityEntry, FRAMEWORKS } from '../_lib/comparison-data'

// Four-state honesty system — icon AND text always together, never colour alone.
// Extension renders as an outlined pill (lighter weight) so it can never be
// mistaken for a native capability at a glance; not-in-core and not-verified
// carry no pill at all, distinguishing "confirmed absent" from "couldn't confirm."
function StatusBadge({ entry }: { entry: CapabilityEntry }) {
  const cell = (() => {
    switch (entry.status) {
      case 'native':
        return (
          <Badge className='gap-1.5 border border-success/40 bg-success/15 font-mono text-[0.6875rem] text-success'>
            <Check className='size-3' aria-hidden />🟢 Native
          </Badge>
        )
      case 'extension':
        return (
          <Badge variant='outline' className='gap-1.5 border-warning/40 font-mono text-[0.6875rem] text-warning'>
            <Puzzle className='size-3' aria-hidden />🟡 Extension
          </Badge>
        )
      case 'not-in-core':
        return (
          <span className='inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-muted-foreground'>
            <Minus className='size-3' aria-hidden />⚪ Not in core
          </span>
        )
      case 'not-verified':
        return (
          <span className='inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-muted-foreground/70 italic'>
            <HelpCircle className='size-3' aria-hidden />❓ Not verified
          </span>
        )
    }
  })()

  if (!entry.evidenceUrl) return cell
  return (
    <NextLink href={entry.evidenceUrl} variant='unstyled' target='_blank' rel='noreferrer' className='hover:opacity-80'>
      {cell}
    </NextLink>
  )
}

export function CapabilityMatrix() {
  return (
    <LandingSection id='matrix' background='bg-card text-card-foreground'>
      <SectionOverline className='text-muted-foreground'>the full matrix</SectionOverline>
      <SectionTitle className='mt-4 max-w-2xl' leading='tight'>
        What each framework actually ships
      </SectionTitle>
      <Text as='p' className='mt-4 max-w-2xl leading-relaxed text-muted-foreground'>
        Every status cell links to the exact doc it was verified against. Not in core is not the same claim as
        impossible — it means the core distribution doesn’t ship it today.
      </Text>

      <div className='mt-10'>
        <Table className='min-w-[880px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='sticky left-0 z-10 bg-card font-semibold text-foreground'>Capability</TableHead>
              {FRAMEWORKS.map((fw) => (
                <TableHead
                  key={fw.key}
                  className={cn('font-semibold', fw.highlight ? 'text-primary' : 'text-foreground')}
                >
                  {fw.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {CAPABILITY_GROUPS.map((group) => (
              <Fragment key={group.label}>
                <TableRow>
                  <TableCell
                    colSpan={FRAMEWORKS.length + 1}
                    className='bg-muted/40 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground'
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className='sticky left-0 z-10 bg-card font-sans text-sm text-foreground'>
                      {row.label}
                    </TableCell>
                    {FRAMEWORKS.map((fw) => (
                      <TableCell key={fw.key} className={cn(fw.highlight && 'bg-primary/5')}>
                        <StatusBadge entry={fw.capabilities[row.key]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </LandingSection>
  )
}
