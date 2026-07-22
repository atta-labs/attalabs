import { ArrowDown, Check } from 'lucide-react'
import { Card, CardContent } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import { ProtectedCanvasPortrait } from './canvas/ProtectedCanvasPortrait'
import { ScrollButton } from './ScrollButton'

const PROTECTION_POINTS = [
  'One path for every change: brief → build → review → verify → merge → archive.',
  'Deterministic checks keep quality, context, and standards visible.',
  'Role contracts bound what each contributor can touch.',
  'Failed checks return a concrete fix, not just a red X.',
  'Every merge is on the record: brief, checks, reviewer.'
]

/** Mirrors HeroSection's PointList — a single always-green list (every point here is a
 * capability, not a human-vs-agent contrast), so it takes no icon/color props. The
 * sentences are longer here (real product claims), so they wrap within a wider column. */
function PointList() {
  return (
    <Flex direction='column' align='start' justify='start' gap={4}>
      {PROTECTION_POINTS.map((point) => (
        <Flex key={point} align='start' gap={2}>
          <Check className='mt-1 size-5 shrink-0 text-success' />
          <Text size='lg' className='text-left leading-snug'>
            {point}
          </Text>
        </Flex>
      ))}
    </Flex>
  )
}

export function ProtectedSection() {
  return (
    <section className='flex w-full flex-col items-center gap-6'>
      {/* Same compact headline treatment as the era section (text-2xl→3xl, extrabold,
          accent on the key phrase) so both sections match and the whole thing fits 100vh. */}
      <Heading
        level={2}
        className='max-w-[820px] text-balance text-center font-sans text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl lg:text-3xl'
      >
        Governed execution, from <span className='rounded-lg bg-accent px-2'>brief to merge</span>.
      </Heading>

      {/* Card sized so the ANIMATION is the main character: a big canvas on the left, a
          compact copy column on the right — not a wide text panel with a small diagram. */}
      <Card className='w-full max-w-[860px]'>
        <CardContent>
          {/* Row on md+ (canvas left, copy right); stacks to a column on small screens so
              the sentences drop BELOW the animation instead of squeezing beside it. */}
          <div className='flex flex-col items-center gap-8 md:flex-row md:justify-center'>
            <ProtectedCanvasPortrait />
            <PointList />
          </div>
        </CardContent>
      </Card>

      <ScrollButton targetId='next-steps' variant='outline'>
        Get started
        <ArrowDown className='size-5' />
      </ScrollButton>
    </section>
  )
}
