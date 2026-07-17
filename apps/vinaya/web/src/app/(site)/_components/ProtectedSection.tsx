import { Check } from 'lucide-react'
import { Button, Card, CardContent } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import Link from 'next/link'
import { ProtectedCanvasPortrait } from './canvas/ProtectedCanvasPortrait'

const PROTECTION_POINTS = [
  'Blocks force-push to main',
  'Same checks for humans and agents',
  'No merge without review',
  'Deterministic checks, not vibes',
  'Full speed, zero damage',
  'Tech debt stays visible'
]

/** Mirrors HeroSection's PointList — same "icon top-aligned with a wrapping line"
 * layout, but a single always-green list (every point here is a win, not a
 * human-vs-agent contrast), so it takes no icon/color props. */
function PointList() {
  return (
    <Flex direction='column' align='start' justify='start' gap={3}>
      {PROTECTION_POINTS.map((point) => (
        <Flex key={point} align='start' gap={2}>
          <Check className='mt-0.5 size-3.5 shrink-0 text-success' />
          <Text size='sm' className='max-w-[190px] text-left'>
            {point}
          </Text>
        </Flex>
      ))}
    </Flex>
  )
}

export function ProtectedSection() {
  return (
    <section className='flex flex-col items-center gap-6'>
      <Heading
        level={2}
        className='mx-auto max-w-[900px] text-balance text-center font-sans text-2xl font-bold text-foreground sm:text-3xl md:text-4xl'
      >
        Vinaya <div className='rounded-lg bg-accent px-3'>Ultimate Branch Protection</div>
      </Heading>

      <Card>
        <CardContent>
          <Flex align='center' gap={3}>
            <ProtectedCanvasPortrait />
            <PointList />
          </Flex>
        </CardContent>
      </Card>

      <Button asChild size='lg'>
        <Link href='/the-harness'>The Harness</Link>
      </Button>
    </section>
  )
}
