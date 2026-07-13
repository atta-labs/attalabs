import { Card, CardContent } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import Link from 'next/link'

export function CtaSection() {
  return (
    <section className='flex flex-col items-center gap-3'>
      <Card className='w-fit border-none bg-primary'>
        <CardContent className='flex items-center gap-2 px-6 py-4'>
          <Text as='span' className='font-mono text-primary-foreground/60'>
            $
          </Text>
          <Text as='span' weight='bold' className='font-mono text-primary-foreground'>
            npx vinaya init
          </Text>
        </CardContent>
      </Card>
      <Text as='span' size='xs' className='font-mono uppercase tracking-[0.15em] text-muted-foreground'>
        COMING SOON
      </Text>
      <Text size='sm' className='max-w-[420px] text-center font-sans text-muted-foreground'>
        No CLI exists yet &mdash; this command isn&rsquo;t runnable today. See the{' '}
        <Link href='/known-limits' className='text-foreground underline hover:text-accent'>
          Known Limits
        </Link>{' '}
        page for what&rsquo;s built so far.
      </Text>
    </section>
  )
}
