'use client'

import { Button, Heading, Text } from '@atta/ui'
import { useRouter } from 'next/navigation'

export function IntroSection() {
  const router = useRouter()
  return (
    <section id='learn' className='bg-background py-24 md:py-32'>
      <div className='mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 text-center'>
        <Heading level={2} className='font-serif text-4xl md:text-6xl text-foreground leading-tight'>
          Vāda. The <em className='italic'>Deliberation</em> Engine.
        </Heading>
        <Text as='p' className='text-lg text-muted-foreground max-w-2xl'>
          A free, ephemeral deliberation engine. Bring Claude, Gemini, and your own API keys into a single room.
          Structured adversarial synthesis without memory.
        </Text>
        <div className='flex flex-row flex-wrap items-center justify-center gap-4'>
          <Button variant='default' size='lg' onClick={() => router.push('/deliberate')}>
            Start Deliberation
          </Button>
          <Button variant='ghost' size='lg' onClick={() => {}}>
            Read the Manifesto
          </Button>
        </div>
      </div>
    </section>
  )
}
