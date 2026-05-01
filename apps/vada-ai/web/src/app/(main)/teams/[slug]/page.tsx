import { listPublicSpecs } from '@atta/engine'
import { notFound } from 'next/navigation'
import { TeamHeader } from './components/TeamHeader'
import { AgentGrid } from './components/AgentGrid'
import { CalculatorStats } from './components/CalculatorStats'
import { FlowVisualizer } from './components/FlowVisualizer'

export default async function TeamDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const specs = listPublicSpecs()
  const spec = specs.find((s) => s.id === slug)

  if (!spec) notFound()

  return (
    <div className='mx-auto max-w-5xl space-y-12 px-4 py-12'>
      <TeamHeader spec={spec} />

      <section className='space-y-3'>
        <p className='max-w-2xl text-base text-foreground leading-relaxed'>{spec.description}</p>
      </section>

      <section className='space-y-4'>
        <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Agents</h2>
        <AgentGrid spec={spec} />
      </section>

      <section className='space-y-4'>
        <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Estimated Cost</h2>
        <CalculatorStats spec={spec} />
      </section>

      <section className='space-y-4'>
        <h2 className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>Workflow</h2>
        <FlowVisualizer spec={spec} />
      </section>
    </div>
  )
}
