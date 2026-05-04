import { Heading, Text } from '@atta/ui/shared'

interface HeroProps {
  logoUrl: string | null
}

export function Hero({ logoUrl }: HeroProps) {
  return (
    <section className='flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center'>
      <div className='flex flex-col items-center gap-4'>
        {logoUrl && <img src={logoUrl} alt='Atta' className='h-24 w-auto opacity-90' />}
        <Heading level={1} className='font-serif text-7xl tracking-tight text-foreground'>
          Atta
        </Heading>
        <Text as='p' className='font-serif text-xl italic text-muted-foreground'>
          Where deep thinking happens — with any AI.
        </Text>
      </div>
    </section>
  )
}
