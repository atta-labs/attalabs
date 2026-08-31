import { cn } from '@atta/ui/lib/utils'
import { Text } from '@atta/ui/shared'
import { RevealGrid } from '../../_components/landing/LandingInteractions'
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

const LEDGER_ROW =
  'grid items-baseline gap-8 border-b border-border px-4 py-6 md:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1.2fr)]'

export function WhereEachWins() {
  return (
    <LandingSection id='where-each-wins' background='bg-secondary/70 text-secondary-foreground'>
      <SectionOverline className='text-center text-muted-foreground'>where each wins</SectionOverline>
      <SectionTitle className='mt-4 text-center' leading='tight'>
        No overall score — category leaders only
      </SectionTitle>

      <RevealGrid className='mt-12 border-t border-border'>
        {CATEGORIES.map(({ category, leader }, index) => {
          const isVinaya = leader === 'Vinaya'
          return (
            <div
              key={category}
              className={cn(
                LEDGER_ROW,
                isVinaya && 'bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]',
                'translate-y-3.5 opacity-0 transition-all duration-500 group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:opacity-100',
                index % 3 === 1 && 'delay-[90ms]',
                index % 3 === 2 && 'delay-[180ms]'
              )}
            >
              <Text className='font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-muted-foreground'>
                {category}
              </Text>
              <Text className={cn('font-serif text-2xl leading-tight tracking-tight', isVinaya && 'text-primary')}>
                {leader}
              </Text>
            </div>
          )
        })}
      </RevealGrid>

      <Text as='p' className='mx-auto mt-10 max-w-2xl text-balance leading-relaxed text-muted-foreground'>
        Different frameworks are complete at different layers. Superpowers and BMAD contain broader development-method
        content; Spec Kit and OpenSpec specialize in specification workflows. Among the core distributions reviewed
        here, Vinaya is the only one combining forge-native planning state, managed local and CI gates, authorized
        commit-bound review, evidence freshness and Studio.
      </Text>
    </LandingSection>
  )
}
