import { Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Text } from '@atta/ui/shared'
import { LetterReveal } from '../LetterReveal'
import { RevealGrid } from './LandingInteractions'
import { LandingSection } from './LandingSection'
import { SectionTitle } from './SectionHeading'

// 06 · Who it's for.
export function AudienceSection() {
  const audiences = [
    [
      'for the engineer',
      'You ship the feature',
      'You define the milestone and ground it in tasks. Agents write and review. You control the merge.'
    ],
    ['for the tech lead', 'Your standards, enforced', 'Your standards become checks every pull request must pass.'],
    ['for the founder', 'One process', 'The feature lands through one process, so you can still answer why it shipped.']
  ] as const

  return (
    <LandingSection background='bg-secondary text-secondary-foreground' py='spacious'>
      <SectionTitle size='compact' className='text-center'>
        <LetterReveal text='Who it’s for' />
      </SectionTitle>
      <RevealGrid className='mt-12 grid gap-4 md:grid-cols-3'>
        {audiences.map(([overline, title, body], index) => (
          <Card
            key={overline}
            className={`translate-y-12 scale-[0.96] opacity-0 transition-[opacity,transform] duration-700 ease-out group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:scale-100 group-data-[visible=true]/reveal:opacity-100 motion-reduce:transition-none ${index === 0 ? 'border-2 border-foreground' : 'border border-border'} ${index === 1 ? 'delay-[140ms]' : index === 2 ? 'delay-[280ms]' : ''}`}
          >
            <CardHeader className='px-8'>
              <Text className='font-mono text-[0.625rem] uppercase tracking-[0.02em] text-muted-foreground'>
                {overline}
              </Text>
              <CardTitle className='mt-4 min-h-[2.3em] font-serif text-[1.375rem] font-normal leading-[1.15] tracking-[-0.02em]'>
                {title}
              </CardTitle>
              <span
                aria-hidden='true'
                className={`mt-4 block h-0.5 origin-left scale-x-0 bg-current opacity-25 transition-transform duration-700 ease-out group-data-[visible=true]/reveal:scale-x-100 motion-reduce:transition-none ${index === 1 ? 'delay-[440ms]' : index === 2 ? 'delay-[580ms]' : 'delay-300'}`}
              />
            </CardHeader>
            <CardContent className='px-8'>
              <Text className='leading-[1.65] text-muted-foreground'>{body}</Text>
            </CardContent>
          </Card>
        ))}
      </RevealGrid>
    </LandingSection>
  )
}
