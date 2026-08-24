import { Heading, Text } from '@atta/ui/shared'
import { LetterReveal } from '../../_components/LetterReveal'
import { SectionOverline } from '../../_components/landing/SectionHeading'

/** The framing block between the swimlane timeline and the seven stage
 * sections — sets up what each section below is about to show. */
export function FramingBlock() {
  return (
    <div className='mx-auto flex max-w-[50rem] flex-col items-center gap-4 py-14 text-center sm:py-20'>
      <SectionOverline className='text-muted-foreground'>What you are looking at</SectionOverline>
      <Heading level={2} className='font-serif text-3xl font-normal leading-tight text-foreground sm:text-4xl'>
        <LetterReveal text='You have run these seven stages for thirty years. Agents are why they now have to be enforced.' />
      </Heading>
      <Text as='p' size='sm' muted className='font-mono uppercase tracking-widest leading-relaxed'>
        Each stage below shows what your team already calls it, its GitHub object, and where it is checked
      </Text>
      <Text as='p' size='sm' muted className='font-mono uppercase tracking-widest leading-relaxed'>
        You arrive with a feature. You leave with it merged, reviewed, and on the record
      </Text>
      <Text as='p' size='xs' muted className='font-mono uppercase tracking-widest'>
        The seven stages · alternating, diagram-led
      </Text>
    </div>
  )
}
