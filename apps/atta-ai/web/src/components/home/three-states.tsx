import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui'
import { Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'

export function ThreeStates() {
  return (
    <section className='px-6 py-24'>
      <div className='mx-auto max-w-3xl'>
        <Text as='p' className='mb-10 text-xs uppercase tracking-widest text-muted-foreground/60'>
          The ecosystem
        </Text>

        <div className='grid grid-cols-1 gap-5 md:grid-cols-3'>
          {/* Vāda — live, clickable */}
          <a
            href='https://vada.attalabs.dev'
            target='_blank'
            rel='noopener noreferrer'
            className='group block'
          >
            <Card className='h-full border-border/40 bg-background/40 backdrop-blur-sm transition-colors duration-300 group-hover:border-primary/40'>
              <CardHeader className='pb-3'>
                <CardTitle className='font-serif text-xl text-foreground'>Vāda</CardTitle>
                <Text as='p' className='text-xs text-muted-foreground'>
                  From Pāli: Deliberation
                </Text>
              </CardHeader>
              <CardContent className='flex flex-col justify-between gap-4 pt-0'>
                <Text as='p' className='text-sm leading-relaxed text-muted-foreground'>
                  Multi-agent deliberation. Multiple AI viewpoints reach a reasoned conclusion.
                </Text>
                <div className='flex items-center justify-between'>
                  <Badge className='bg-primary text-primary-foreground text-xs'>Live</Badge>
                  <span className='flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground'>
                    vada.attalabs.dev
                    <ArrowRight className='h-3 w-3' />
                  </span>
                </div>
              </CardContent>
            </Card>
          </a>

          {/* Vitakka — in development, dimmed, not clickable */}
          <div className='opacity-60'>
            <Card className='h-full cursor-default border-border/20 bg-background/20 backdrop-blur-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='font-serif text-xl text-foreground'>Vitakka</CardTitle>
                <Text as='p' className='text-xs text-muted-foreground'>
                  From Pāli: Directed thought
                </Text>
              </CardHeader>
              <CardContent className='flex flex-col justify-between gap-4 pt-0'>
                <Text as='p' className='text-sm leading-relaxed text-muted-foreground'>
                  Stay with one line of thought. Resume where you left off. The focus container for
                  everything else.
                </Text>
                <Badge variant='outline' className='w-fit border-muted-foreground/20 text-xs text-muted-foreground/70'>
                  In development
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Atta — composing, wireframe, not clickable */}
          <Card className='h-full cursor-default border-dashed border-border/30 bg-transparent'>
            <CardHeader className='pb-3'>
              <CardTitle className='font-serif text-xl text-foreground'>Atta</CardTitle>
              <Text as='p' className='text-xs text-muted-foreground'>
                From Pāli: Continuity
              </Text>
            </CardHeader>
            <CardContent className='flex flex-col justify-between gap-4 pt-0'>
              <Text as='p' className='text-sm leading-relaxed text-muted-foreground'>
                The composed wrapper. Use the products separately, or use them together — with
                shared memory across all of them.
              </Text>
              <Badge
                variant='outline'
                className='w-fit border-muted-foreground/10 text-xs text-muted-foreground/40'
              >
                Composing
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
