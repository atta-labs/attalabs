'use client'

import { Separator, Text } from '@atta/ui'

export function PullQuoteSection() {
  return (
    <section className='bg-background py-24 md:py-32'>
      <div className='mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 text-center'>
        <Separator orientation='vertical' className='h-10' />
        <Text as='p' className='font-serif text-2xl md:text-4xl text-foreground italic leading-snug max-w-2xl'>
          &ldquo;True knowledge is not found in the prompt, but in the synthesis of opposing intelligence.&rdquo;
        </Text>
        <Separator orientation='vertical' className='h-10' />
      </div>
    </section>
  )
}
