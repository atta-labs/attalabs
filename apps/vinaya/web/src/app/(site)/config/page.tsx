import { CONFIG_REFERENCE, PLAN_JSON_SCHEMA } from '@atta/vinaya-sources'
import { Badge, Code, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { ConfigFieldSection } from './_components/ConfigFieldSection'

export const metadata: Metadata = {
  title: 'Config Reference · Vinaya',
  description: 'Every vinaya.config.json key, documented by hand — and the vinaya check --plan --json shape.'
}

/**
 * Renders `CONFIG_REFERENCE` (`@atta/vinaya-sources`), an AUTHORED registry —
 * NOT a Zod introspection of `VinayaConfigSchema` (that schema documents
 * shape only, zero `.describe()` calls). `apps/vinaya/cli/tests/checks/
 * config-reference-coverage.test.ts` is what proves this page can never
 * silently drift behind the schema: it walks `VinayaConfigSchema`'s own keys
 * and fails if one has no row here.
 *
 * A flat stacked column, like `/state-machine` — not `/cli`'s two-pane
 * sidebar shape. `CONFIG_REFERENCE` is small enough (four top-level keys)
 * that a scroll-spy TOC would add machinery this page doesn't need.
 */
export default function ConfigPage() {
  return (
    <main className='mx-auto flex max-w-4xl flex-col gap-12 px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Config Reference
        </Heading>
        <Text as='p' className='font-sans text-muted-foreground'>
          Every key <Code>vinaya.config.json</Code> accepts, rendered from the one authored registry that documents the
          schema — never hand-transcribed, and mechanically proven complete against it.
        </Text>
        <Text as='p' className='font-sans text-muted-foreground'>
          An adopter starting from nothing can write a working <Code>vinaya.config.json</Code> from this page alone.
        </Text>
      </section>

      <section className='flex flex-col gap-10'>
        {CONFIG_REFERENCE.map((field) => (
          <ConfigFieldSection key={field.key} field={field} />
        ))}
      </section>

      <section className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <Heading level={2} className='font-serif'>
            vinaya check --plan --json
          </Heading>
          <Text as='p' className='font-sans text-sm text-muted-foreground'>
            The resolved check registry's JSON envelope — what reading the config back out, after override/additive
            resolution, looks like. This page is its documented home.
          </Text>
        </div>

        <Table stickyHeader className='min-w-[640px]'>
          <TableHeader>
            <TableRow>
              <TableHead className='font-semibold text-foreground'>Field</TableHead>
              <TableHead className='font-semibold text-foreground'>Type</TableHead>
              <TableHead className='font-semibold text-foreground'>Meaning</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PLAN_JSON_SCHEMA.map((field) => (
              <TableRow key={field.key}>
                <TableCell className='font-mono text-sm text-foreground'>
                  <Badge variant='outline' className='font-mono text-xs font-normal'>
                    {field.key}
                  </Badge>
                </TableCell>
                <TableCell className='font-mono text-sm text-muted-foreground'>{field.type}</TableCell>
                <TableCell className='font-sans text-sm text-muted-foreground'>{field.semantics.join(' ')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </main>
  )
}
