import { Text } from '@atta/ui/shared'

const FEATURES = [
  {
    number: '01',
    title: 'Seamless onboarding of junior developers — human or AI.',
    body: 'every failed check answers with a corrective instruction, not a lecture'
  },
  {
    number: '02',
    title: 'Adopt incrementally.',
    body: 'each ring is opt-in — take one, some, or none'
  },
  {
    number: '03',
    title: 'Review judgment, not compliance.',
    body: 'the ring handles the rules so you can read the ideas'
  },
  {
    number: '04',
    title: 'Redirects, never blocks.',
    body: 'a failed check re-routes the work with the fix attached — nobody’s throughput drops'
  },
  {
    number: '05',
    title: 'One rulebook for humans and agents.',
    body: 'the same deterministic checks gate every merge — no special cases'
  },
  {
    number: '06',
    title: 'Deterministic by design.',
    body: 'the same input always gets the same verdict — no flaky gatekeeping'
  }
] as const

export function FeatureGrid() {
  return (
    <section className='grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-flow-col sm:grid-cols-2 sm:grid-rows-3'>
      {FEATURES.map((feature) => (
        <div key={feature.number} className='flex flex-col gap-1.5'>
          <Text as='span' size='lg' weight='bold' className='font-mono text-warning'>
            {feature.number}
          </Text>
          <Text as='p' weight='bold' size='xl' className='font-sans text-foreground'>
            {feature.title}
          </Text>
          <Text as='p' size='lg' className='font-sans text-muted-foreground'>
            {feature.body}
          </Text>
        </div>
      ))}
    </section>
  )
}
