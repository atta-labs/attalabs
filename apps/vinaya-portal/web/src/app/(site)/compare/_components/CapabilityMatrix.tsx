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
            <Check className='size-3' aria-hidden />
            Native
          </Badge>
        )
      case 'extension':
        return (
          <Badge variant='outline' className='gap-1.5 border-warning/40 font-mono text-[0.6875rem] text-warning'>
            <Puzzle className='size-3' aria-hidden />
            Extension
          </Badge>
        )
      case 'not-in-core':
        return (
          <span className='inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-muted-foreground'>
            <Minus className='size-3' aria-hidden />
            Not in core
          </span>
        )
      case 'not-verified':
        return (
          <span className='inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-muted-foreground/70 italic'>
            <HelpCircle className='size-3' aria-hidden />
            Not verified
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
    <LandingSection id='matrix' background='bg-background text-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>the full matrix</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        What each framework actually ships
      </SectionTitle>
      <Text as='p' className='mx-auto mt-4 max-w-2xl text-center leading-relaxed text-muted-foreground'>
        Every status cell links to the exact doc it was verified against. Not in core is not the same claim as
        impossible — it means the core distribution doesn’t ship it today.
      </Text>

      <div className='mt-8 flex flex-wrap justify-center gap-6 font-mono text-[0.6875rem] text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5 text-success'>
          <Check className='size-3' aria-hidden />
          Native
        </span>
        <span className='inline-flex items-center gap-1.5 text-warning'>
          <Puzzle className='size-3' aria-hidden />
          Extension
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <Minus className='size-3' aria-hidden />
          Not in core
        </span>
        <span className='inline-flex items-center gap-1.5 italic'>
          <HelpCircle className='size-3' aria-hidden />
          Not verified
        </span>
      </div>

      <div className='mt-10'>
        {/* 760, not the natural 880: `stickyHeader` flips the installed container to
            `overflow-visible` at a container width of 780px — a wider min-width breaks
            that assumption in the 780–879px band, where the table would spill its box
            and scroll the page sideways instead of itself. Matches every other Vinaya
            table's own stickyHeader contract (see StateMachineTables.tsx). */}
        <Table stickyHeader className='min-w-[760px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Capability</TableHead>
              {FRAMEWORKS.map((fw) => (
                <TableHead
                  key={fw.key}
                  className={cn(
                    'font-semibold',
                    fw.highlight ? 'bg-primary/5 font-bold text-primary' : 'text-foreground'
                  )}
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
                    className='border-t border-border bg-muted/40 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-muted-foreground'
                  >
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className='font-sans text-sm text-foreground'>{row.label}</TableCell>
                    {FRAMEWORKS.map((fw) => (
                      <TableCell key={fw.key} className={cn(fw.highlight && 'bg-primary/5')}>
                        <StatusBadge entry={fw.capabilities[row.key]} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {group.label === 'Method & workflow' && (
                  <TableRow>
                    <TableCell colSpan={FRAMEWORKS.length + 1} className='border-t border-border py-4'>
                      <Text className='text-sm leading-relaxed text-muted-foreground'>
                        The groups below aren’t neutral in the same way. Method &amp; workflow are criteria any of these
                        five products could reasonably be judged on. Forge lifecycle, Enforcement &amp; evidence, and
                        Customization &amp; operation are Vinaya’s own architectural choices, scored the same way —
                        included because they’re the argument this page makes, not because every framework should be
                        expected to ship them.
                      </Text>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </LandingSection>
  )
}
