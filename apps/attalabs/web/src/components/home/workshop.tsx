import { Heading, Text } from '@atta/ui/shared'

export function Workshop() {
  return (
    <section className='bg-muted/30 py-24'>
      <div className='mx-auto max-w-2xl px-6'>
        <Text as='p' className='mb-8 font-mono text-xs uppercase tracking-widest text-muted-foreground/60'>
          03 / Workshop
        </Text>
        <Heading level={2} className='mb-8 font-serif text-2xl text-foreground'>
          AttaLabs is the workshop.
        </Heading>
        <Text as='p' className='mb-6 text-base leading-relaxed text-muted-foreground'>
          AttaLabs is where Atta is being built in public. Each component ships when it's useful and remains part of the
          lab. Vāda is in active use. Vitakka is in active build. Atta will move to its own home as the composed product
          ships.
        </Text>
        <Text as='p' className='text-base leading-relaxed text-muted-foreground'>
          The lab stays. The product is what comes out of it.
        </Text>
      </div>
    </section>
  )
}
