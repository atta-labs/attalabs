import { listPublicSpecs } from '@atta/engine'
import { Heading } from '@atta/ui/shared'
import { TeamCard } from './components/TeamCard'

export default function TeamsTmpPage() {
  const specs = listPublicSpecs()

  return (
    <div className='mx-auto max-w-5xl space-y-8 px-4 py-12'>
      <div className='space-y-1'>
        <Heading level={1} size='xl' className='font-serif text-foreground'>
          Teams
        </Heading>
        <p className='font-mono text-xs uppercase tracking-widest text-muted-foreground'>
          {specs.length} published · agent configurations
        </p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {specs.map((spec) => (
          <TeamCard key={spec.id} spec={spec} />
        ))}
      </div>
    </div>
  )
}
