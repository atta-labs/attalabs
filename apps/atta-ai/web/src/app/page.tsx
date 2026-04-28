import { cmsClient, getAttaBranding } from '@atta/cms'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui'
import { Heading, Text } from '@atta/ui/shared'
import { ArrowRight } from 'lucide-react'
import { HomeCanvas } from '@/components/home-canvas'

export default async function HomePage() {
  const branding = await getAttaBranding(cmsClient).catch(() => null)
  const logoUrl = branding?.logoSolidDark?.url ?? branding?.logoSolidLight?.url ?? null
  const productName = branding?.productName ?? 'Atta'

  return (
    <>
      <HomeCanvas />

      <div className='relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-24'>
        {/* Logo + wordmark */}
        <div className='mb-16 flex flex-col items-center gap-6 text-center'>
          {logoUrl && <img src={logoUrl} alt={productName} className='h-24 w-auto opacity-90' />}
          <div className='flex flex-col items-center gap-1'>
            <Heading level={1} className='font-serif text-7xl tracking-tight text-foreground'>
              Atta
            </Heading>
            <Text as='p' className='font-serif text-3xl italic text-muted-foreground'>
              Yours.
            </Text>
          </div>
        </div>

        {/* Product cards */}
        <div className='grid w-full max-w-3xl grid-cols-1 gap-5 md:grid-cols-3'>
          {/* Vāda — active */}
          <a href='https://vada.attalabs.dev' target='_blank' rel='noopener noreferrer' className='group block'>
            <Card className='h-full border-border/40 bg-background/40 backdrop-blur-sm transition-all duration-300 group-hover:border-primary/40 group-hover:bg-background/60'>
              <CardHeader className='pb-3'>
                <CardTitle className='font-serif text-2xl text-foreground'>Vāda</CardTitle>
                <Text as='p' className='text-xs text-muted-foreground'>
                  From Pāli: Deliberation
                </Text>
              </CardHeader>
              <CardContent className='flex items-end justify-between pt-0'>
                <Text as='span' className='font-serif text-xl text-foreground'>
                  Conclude.
                </Text>
                <ArrowRight className='h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground' />
              </CardContent>
            </Card>
          </a>

          {/* Vitakka — coming soon */}
          <div className='opacity-40'>
            <Card className='h-full cursor-default border-border/20 bg-background/20 backdrop-blur-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='font-serif text-2xl text-muted-foreground'>Vitakka</CardTitle>
                <Text as='p' className='text-xs text-muted-foreground/70'>
                  From Pāli: Applied Thought
                </Text>
              </CardHeader>
              <CardContent className='flex items-end justify-between pt-0'>
                <Text as='span' className='font-serif text-xl text-muted-foreground'>
                  Focus.
                </Text>
                <Badge variant='outline' className='border-muted-foreground/20 text-xs text-muted-foreground/60'>
                  Soon
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Sati — coming soon */}
          <div className='opacity-40'>
            <Card className='h-full cursor-default border-border/20 bg-background/20 backdrop-blur-sm'>
              <CardHeader className='pb-3'>
                <CardTitle className='font-serif text-2xl text-muted-foreground'>Sati</CardTitle>
                <Text as='p' className='text-xs text-muted-foreground/70'>
                  From Pāli: Mindfulness
                </Text>
              </CardHeader>
              <CardContent className='flex items-end justify-between pt-0'>
                <Text as='span' className='font-serif text-xl text-muted-foreground'>
                  Remember.
                </Text>
                <Badge variant='outline' className='border-muted-foreground/20 text-xs text-muted-foreground/60'>
                  Soon
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <Text as='p' className='mt-16 text-sm text-muted-foreground/40'>
          AttaLabs · attalabs.dev
        </Text>
      </div>
    </>
  )
}
