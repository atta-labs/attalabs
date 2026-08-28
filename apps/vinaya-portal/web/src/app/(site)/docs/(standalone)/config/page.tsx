import { CONFIG_REFERENCE, PLAN_JSON_SCHEMA } from '@attalabs/vinaya-sources'
import { Badge, Code, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@atta/ui/components'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { StickyDocHeader } from '../../_components/StickyDocHeader'
import { ConfigFieldSection } from './_components/ConfigFieldSection'
import { CONFIG_ACTIVE_OFFSET, PLAN_JSON_SECTION } from './_components/config-navigation'

export const metadata: Metadata = {
  title: 'Config Reference · Vinaya',
  description: 'Every vinaya.config.json key, documented by hand — and the vinaya check --plan --json shape.'
}

/**
 * Renders `CONFIG_REFERENCE` (`@attalabs/vinaya-sources`), an AUTHORED registry —
 * NOT a Zod introspection of `VinayaConfigSchema` (that schema documents
 * shape only, zero `.describe()` calls). A coverage test in the standalone
 * `atta-labs/vinaya` CLI repo is what proves this page can never silently
 * drift behind the schema: it walks `VinayaConfigSchema`'s own keys and
 * fails if one has no row here.
 *
 * Lives under `docs/(standalone)/` with its own `layout.tsx`: it keeps the
 * `/docs/config` URL and the Docs dropdown entry, but not `DocSidebarHost`'s
 * doctrine tree — belonging under `/docs` is a navigation fact, not a layout
 * one. `ConfigFieldSection` stamps a stable `id="config-<key>"` anchor per
 * field (nested fields included), so `/docs/config#config-<key>` deep-links
 * the way `/docs/rings/ring-1#<anchor>` does; `ConfigSidebar` resolves that
 * hash on arrival.
 *
 * `.config-page-content` scopes `StickyDocHeader`'s heading scan to this
 * page's own `h2`s — the top-level config sections plus the plan-envelope
 * section below — so the sticky context line names exactly what the rail
 * lists. Nested fields render as `h3`/`h4` and stay out of both.
 */
export default function ConfigPage() {
  return (
    <>
      <StickyDocHeader
        title='Config Reference'
        section='Configuration'
        headingSelector='.config-page-content h2'
        // The same rule and number `ConfigSidebar`'s rail resolves its active
        // section with, so the bar and the rail always name the same section.
        activeOffset={CONFIG_ACTIVE_OFFSET}
      />
      <article className='config-page-content flex flex-col gap-12'>
        <section className='flex flex-col gap-4'>
          <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
            Config Reference
          </Heading>
          <Text as='p' className='font-sans text-muted-foreground'>
            Every key <Code>vinaya.config.json</Code> accepts, rendered from the one authored registry that documents
            the schema — never hand-transcribed, and mechanically proven complete against it.
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

        <section id={PLAN_JSON_SECTION.slug} className='flex scroll-mt-16 flex-col gap-6'>
          <div className='flex flex-col gap-2'>
            <Heading level={2} className='font-serif'>
              {PLAN_JSON_SECTION.label}
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
      </article>
    </>
  )
}
