import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import type { ReactNode } from 'react'
import type { StateMachineModel } from '../_lib/load-state-machine'

/**
 * The four tables of the state machine, rendered from the model arrays — one
 * row per element, every column a real field. NOT a client component, and it
 * must never become one: it holds `@atta/aeg-core`-sourced data, and a
 * `'use client'` here would drag that package (and `node:child_process` behind
 * it) into the browser bundle. Keeping the data server-side also means it
 * never has to be serialized.
 *
 * There is no hand-authored row anywhere in this file. Adding a fact, a label,
 * a status or a rule to the model changes this page with no edit here — that
 * property is the whole reason the route exists, so a literal row added later
 * is a regression, not a shortcut.
 *
 * `@atta/ui`'s `Table` already ships the responsive horizontal-scroll wrapper
 * (`lib/scrollable-table.tsx` over an `overflow-x-auto` container), so each
 * table gets one from the primitive; a second wrapper here would nest two
 * scroll contexts. `min-w-*` is what makes that scroll engage instead of the
 * prose columns collapsing on a narrow viewport.
 */

const EMPTY_CELL = '—'

function Section({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <section className='flex flex-col gap-4'>
      <Heading level={2} className='font-serif text-2xl text-foreground'>
        {title}
      </Heading>
      <Text as='p' className='max-w-3xl font-sans text-sm text-muted-foreground'>
        {lead}
      </Text>
      {children}
    </section>
  )
}

export function StateMachineTables({ model }: { model: StateMachineModel }) {
  return (
    <>
      <Section
        title='Source of truth'
        lead='Every fact derivation reads, and the GitHub object it is read from. There is no other input — no status field, no state file, nothing a human writes down.'
      >
        <Table stickyHeader className='min-w-[720px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Fact</TableHead>
              <TableHead className='font-semibold text-foreground'>Read from</TableHead>
              <TableHead className='font-semibold text-foreground'>What it means</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.factInputs.map((input) => (
              <TableRow key={input.fact}>
                <TableCell className='font-mono text-sm text-foreground'>
                  <Badge variant='outline' className='font-mono text-xs font-normal'>
                    {input.fact}
                  </Badge>
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>{input.readsFrom}</TableCell>
                <TableCell className='font-sans text-sm text-muted-foreground'>{input.meaning}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title='Labels, and the one fact each carries'
        lead='Labels carry only what the forge cannot express natively. They are orthogonal axes — a task’s tier, its tranche, what it waits on, what has been waived are independent, and no code infers one from another. Status is deliberately absent: a status label would recreate the racing store this model exists to remove.'
      >
        <Table stickyHeader className='min-w-[720px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Label</TableHead>
              <TableHead className='font-semibold text-foreground'>Category</TableHead>
              <TableHead className='font-semibold text-foreground'>Orthogonal fact it carries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.labels.map((label) => (
              <TableRow key={label.key}>
                <TableCell className='font-mono text-sm text-foreground'>
                  <Badge variant='outline' className='font-mono text-xs font-normal'>
                    {label.id}
                  </Badge>
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>{label.category}</TableCell>
                <TableCell className='font-sans text-sm text-muted-foreground'>{label.carries}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title='Derived statuses'
        lead='Every status the type admits, and the rules that conclude it. Backlog is listed and marked underivable rather than dropped: it is a project-level concept consumers still render, but no rule inside a tranche ever concludes it — committed work starts at todo.'
      >
        <Table stickyHeader className='min-w-[720px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Status</TableHead>
              <TableHead className='font-semibold text-foreground'>Derivable</TableHead>
              <TableHead className='font-semibold text-foreground'>Concluded by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.statuses.map((row) => (
              <TableRow key={row.status}>
                <TableCell className='font-mono text-sm text-foreground'>
                  <Badge variant='outline' className='font-mono text-xs font-normal'>
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className='font-sans text-sm text-muted-foreground'>
                  {row.derivable ? 'Yes' : 'No'}
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>
                  {row.concludedBy.length > 0 ? (
                    <div className='flex flex-wrap gap-1.5'>
                      {row.concludedBy.map((ruleId) => (
                        <Badge key={ruleId} variant='outline' className='font-mono text-xs font-normal'>
                          {ruleId}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    EMPTY_CELL
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section
        title='Derivation rules'
        lead='The ordered chain, in the order it executes — first match wins, and the last rule matches unconditionally so derivation always concludes. Order is load-bearing: blocked must beat every other conclusion, and the reopened-after-merge rules must precede the plain merged rule or a reopened Issue would read merged forever.'
      >
        {/* 760, not the 880 this five-column table would prefer: `stickyHeader`
            flips the installed container to `overflow-visible` at a container
            width of 780px (`lib/scrollable-table.tsx`), on the assumption the
            table fits by then. An 880px min-width breaks that assumption in the
            780–879px band — the table would spill its box and scroll the whole
            page column sideways instead of itself. Staying under the threshold,
            like every other Vinaya table, is the contract. */}
        <Table stickyHeader className='min-w-[760px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Rule</TableHead>
              <TableHead className='font-semibold text-foreground'>Step</TableHead>
              <TableHead className='font-semibold text-foreground'>When</TableHead>
              <TableHead className='font-semibold text-foreground'>Status</TableHead>
              <TableHead className='font-semibold text-foreground'>Why here</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {model.rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className='font-mono text-sm text-foreground'>
                  <Badge variant='outline' className='font-mono text-xs font-normal'>
                    {rule.id}
                  </Badge>
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>{rule.chainStep}</TableCell>
                <TableCell className='font-sans text-sm text-muted-foreground'>{rule.when}</TableCell>
                <TableCell className='font-mono text-sm text-foreground'>
                  <Badge variant='outline' className='font-mono text-xs font-normal'>
                    {rule.status}
                  </Badge>
                </TableCell>
                <TableCell className='font-sans text-sm text-muted-foreground'>{rule.why}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>
    </>
  )
}
