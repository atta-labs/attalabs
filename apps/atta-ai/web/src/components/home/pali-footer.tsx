import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'

export function PaliFooter() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-2xl'>
        <Heading level={2} className='mb-8 font-serif text-2xl text-foreground'>
          Why Pāli?
        </Heading>
        <Text as='p' className='mb-6 text-base leading-relaxed text-muted-foreground'>
          Each Pāli term is a precise concept from a tradition that thought carefully about minds.
          Vāda is debate. Vitakka is directed thought. Atta is the self that continues. Names that
          already mean what we want them to mean.
        </Text>
        <Text as='p' className='mb-16 text-sm italic text-muted-foreground/60'>
          Pāli name = built by Atta. Anything else plugs in.
        </Text>

        <div className='text-center'>
          <Text as='p' className='mb-2 text-sm text-muted-foreground'>
            Vāda is live today.
          </Text>
          <a
            href='https://vada.attalabs.dev'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 text-sm text-foreground hover:underline'
          >
            vada.attalabs.dev
            <ArrowRight className='h-3 w-3' />
          </a>
        </div>

        <div className='mt-24 text-center'>
          <Text as='p' className='text-xs text-muted-foreground/25'>
            AttaLabs · attalabs.dev
          </Text>
        </div>
      </div>
    </section>
  )
}
