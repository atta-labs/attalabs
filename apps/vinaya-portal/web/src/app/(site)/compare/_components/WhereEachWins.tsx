import { Card, CardHeader, CardTitle } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { LandingSection } from '../../_components/landing/LandingSection'
import { SectionOverline, SectionTitle } from '../../_components/landing/SectionHeading'

const CATEGORIES = [
  { category: 'Developer practice', leader: 'Superpowers' },
  { category: 'Spec-driven development', leader: 'Spec Kit and OpenSpec' },
  { category: 'Role and methodology breadth', leader: 'BMAD' },
  { category: 'Forge-native lifecycle', leader: 'Vinaya' },
  { category: 'Merge governance and evidence', leader: 'Vinaya' },
  { category: 'Operational visibility', leader: 'Vinaya' }
] as const

export function WhereEachWins() {
  return (
    <LandingSection id='where-each-wins' background='bg-card text-card-foreground'>
      <SectionOverline className='text-muted-foreground'>where each wins</SectionOverline>
      <SectionTitle className='mt-4 max-w-2xl' leading='tight'>
        No overall score — category leaders only
      </SectionTitle>

      <div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {CATEGORIES.map(({ category, leader }) => (
          <Card key={category}>
            <CardHeader>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground'>
                {category}
              </Text>
              <CardTitle className='mt-2 font-serif text-xl font-normal tracking-tight text-primary'>
                {leader}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Text as='p' className='mx-auto mt-10 max-w-2xl text-balance leading-relaxed text-muted-foreground'>
        Different frameworks are complete at different layers. Superpowers and BMAD contain broader development-method
        content; Spec Kit and OpenSpec specialize in specification workflows. Among the core distributions reviewed
        here, Vinaya is the only one combining forge-native planning state, managed local and CI gates, authorized
        commit-bound review, evidence freshness and Studio.
      </Text>
    </LandingSection>
  )
}
