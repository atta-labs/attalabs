import { Heading, Text } from '@atta/ui/shared'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { githubBlobUrl } from '@/lib/github-links'
import { DiagramExplorer } from './_components/DiagramExplorer'
import { deriveContractChords, deriveGroups } from './_lib/groupings'
import { loadDiagramModel } from './_lib/load-diagram'
import { readMoreTarget } from './_lib/read-more'

export const metadata = {
  title: 'How it works — Vinaya',
  description:
    'The enforcement mechanism, rendered at build time from this monorepo’s own doctrine files — nothing hand-transcribed.'
}

export default async function HowItWorksPage() {
  const model = await loadDiagramModel()
  // Derived server-side and passed as plain props — DiagramExplorer is a
  // client component that must never import @atta/aeg-core's value exports,
  // or @/lib/github-links (server-only, reads node:fs), directly (see
  // DiagramExplorer.tsx's and LeafPanel.tsx's own doc comments for why).
  const groups = deriveGroups(model)
  const chords = deriveContractChords(model)
  const readMoreHrefs: Record<string, string> = {}
  for (const node of model.nodes) {
    const target = readMoreTarget(node)
    if (target) readMoreHrefs[node.id] = githubBlobUrl(target.path, target.line)
  }

  return (
    <main className='mx-auto flex max-w-4xl flex-col gap-10 px-6 py-24'>
      <section className='flex flex-col gap-4'>
        <Text className='font-mono text-muted-foreground text-xs uppercase tracking-[0.15em]'>How it works</Text>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Agents obey checkers, not documents.
        </Heading>
        <Text className='max-w-2xl font-sans text-muted-foreground leading-relaxed'>
          Every node below is derived at build time from this monorepo&rsquo;s own doctrine — `enforcement.md`,
          `roles/*.md`, `contracts/*.md` — nothing on this page is hand-typed. Click a ring to drill in, click a node
          for its detail, and follow &ldquo;Read more&rdquo; to the real source line.
        </Text>
      </section>

      <section className='flex flex-col gap-4'>
        <DiagramExplorer groups={groups} chords={chords} findings={model.findings} readMoreHrefs={readMoreHrefs} />
      </section>

      <section className='border-border border-t pt-10'>
        <Text size='xs' className='font-mono text-muted-foreground'>
          This diagram is the model that AEG implements.
        </Text>
        <Link href='/' className='mt-4 inline-flex items-center gap-1 text-foreground text-sm hover:text-accent'>
          <ArrowLeft className='h-3.5 w-3.5' />
          Back to Vinaya
        </Link>
      </section>
    </main>
  )
}
