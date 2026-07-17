import { Card, CardContent } from '@atta/ui/components'
import { Flex, Text } from '@atta/ui/shared'
import Link from 'next/link'

export function CtaSection() {
  return (
    <section className='flex flex-col items-center gap-3'>
      <Card>
        <CardContent>
          <Flex align='center' gap={2}>
            <Text as='span' className='font-mono text-muted-foreground'>
              $
            </Text>
            <Text as='span' weight='bold' className='font-mono text-foreground'>
              npx vinaya init
            </Text>
          </Flex>
        </CardContent>
      </Card>
      <Text as='span' size='xs' className='font-mono uppercase tracking-[0.15em] text-muted-foreground'>
        COMING SOON
      </Text>
      <Text size='sm' className='max-w-[420px] text-center font-sans text-muted-foreground'>
        No CLI exists yet &mdash; this command isn&rsquo;t runnable today. See the{' '}
        <Link href='/install' className='text-foreground underline hover:text-accent'>
          Install
        </Link>{' '}
        page for the full command reference and what&rsquo;s built so far.
      </Text>
    </section>
  )
}
