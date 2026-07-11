import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Heading, Text } from '@atta/ui/shared'
import { githubBlobUrl, githubTreeUrl, loadContracts, loadRings, loadRoles } from '@/lib/aeg'
import { ContractCard } from './_components/ContractCard'
import { MarkdownInline } from './_components/MarkdownInline'
import { RingSection } from './_components/RingSection'
import { RoleCard } from './_components/RoleCard'
import { SourceLinkChip } from './_components/SourceLinkChip'

const INTRO_TEXT =
  "This page is generated at build time directly from this monorepo's own governance files — " +
  '`aeg-root/roles/*.md`, `enforcement.md`, and `aeg-root/contracts/*.md`. Nothing below is hand-transcribed: ' +
  'every quoted line links to the real source line, and every enforcement claim links to the real hook or CI ' +
  'job that runs it — a skeptical reader can click through and check.'

export const metadata = {
  title: 'The AEG Methodology — Vinaya',
  description:
    'Roles, enforcement rings, and hand-off contracts — read straight from the real files at build time, not hand-transcribed.'
}

export default async function AegMethodologyPage() {
  const [roles, contracts, rings] = await Promise.all([loadRoles(), loadContracts(), loadRings()])

  return (
    <main className='mx-auto flex max-w-4xl flex-col gap-20 px-6 py-24'>
      <section className='flex flex-col gap-4'>
        <Text className='font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground'>The AEG Methodology</Text>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Agents obey checkers, not documents.
        </Heading>
        <MarkdownInline text={INTRO_TEXT} className='max-w-2xl font-sans leading-relaxed text-muted-foreground' />
      </section>

      <section className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <Heading level={2} className='font-serif text-2xl text-foreground'>
            Roles
          </Heading>
          <Text as='span' className='block font-sans text-sm text-muted-foreground'>
            One card per file in <SourceLinkChip label='aeg-root/roles/' href={githubTreeUrl('aeg-root/roles')} /> —{' '}
            {roles.length} today.
          </Text>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {roles.map((role) => (
            <RoleCard key={role.slug} role={role} />
          ))}
        </div>
      </section>

      <section className='flex flex-col gap-10'>
        <div className='flex flex-col gap-2'>
          <Heading level={2} className='font-serif text-2xl text-foreground'>
            Rings
          </Heading>
          <Text as='span' className='block font-sans text-sm text-muted-foreground'>
            Sourced from <SourceLinkChip label='enforcement.md' href={githubBlobUrl('aeg-root/enforcement.md')} /> —
            three rings, by where a violation dies. Expand any row for the real quoted rule and its real hook/CI link.
          </Text>
        </div>
        {rings.map((ring) => (
          <RingSection key={ring.id} ring={ring} />
        ))}
      </section>

      <section className='flex flex-col gap-6'>
        <div className='flex flex-col gap-2'>
          <Heading level={2} className='font-serif text-2xl text-foreground'>
            Contracts
          </Heading>
          <Text as='span' className='block font-sans text-sm text-muted-foreground'>
            One card per file in{' '}
            <SourceLinkChip label='aeg-root/contracts/' href={githubTreeUrl('aeg-root/contracts')} /> —{' '}
            {contracts.length} today. Each is the single source of truth for one role-to-role hand-off.
          </Text>
        </div>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          {contracts.map((contract) => (
            <ContractCard key={contract.slug} contract={contract} />
          ))}
        </div>
      </section>

      <section className='border-t border-border pt-10'>
        <Link href='/' className='inline-flex items-center gap-1 text-sm text-foreground hover:text-accent'>
          <ArrowLeft className='h-3.5 w-3.5' />
          Back to Vinaya
        </Link>
      </section>
    </main>
  )
}
