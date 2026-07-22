'use client'

import { ArrowDown, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
// One canvas, two eras — same layout, `kind` picks humans-at-desks vs robot swarm.
import { TwoErasCanvas } from './canvas/TwoErasCanvas'
import { ScrollButton } from './ScrollButton'

const HUMAN_POINTS = [
  'Opens a PR (40 files)',
  'Reads the ticket, gets context',
  'Learns the codebase by writing it',
  'Occasional tech debt',
  'Reviews a diff in ~20 min',
  'Code + specs grow together'
]

const AGENT_POINTS = [
  'Opens massive PRs (1,200+ files)',
  'Copy-pastes the ticket, no context',
  'Ships code nobody has read',
  'Invisible, compounding tech debt',
  'Reviewers give up — next PR lands',
  'Code grows 100× faster than the spec'
]

/** Green check for the humans column, red X for the agents column — a quick visual
 * "good habit / bad habit" read before anyone reads the actual line. */
function PointList({
  points,
  icon: Icon,
  iconClassName
}: {
  points: string[]
  icon: typeof Check
  iconClassName: string
}) {
  return (
    <Flex direction='column' align='start' justify='start' gap={2}>
      {points.map((point) => (
        // align='start' — when a line wraps to two rows, the icon sits on the FIRST
        // row (top-aligned with the text block), not centered between both rows.
        <Flex key={point} align='center' gap={2}>
          <Icon className={iconClassName} />
          {/* One line each (copy trimmed to fit) — no wrap, so the rows stay compact and
              the whole section fits one screen. */}
          <Text className='whitespace-nowrap text-left'>{point}</Text>
        </Flex>
      ))}
    </Flex>
  )
}

export function HeroSection() {
  return (
    // Every section is exactly one screen (100vh minus the one-time topbar height that
    // only the hero sits under) with its content vertically centered — "Show me more"
    // scrolls to the next full screen, never a peek of it. gap-2/py-2 (down from
    // gap-6/py-8) claw back the vertical room the two era-canvas cards need — they're
    // taller than the random-question text block they replaced, and at gap-4/py-4 the
    // block still overflowed a typical ~900px viewport by ~20px.
    <section className='flex min-h-[calc(100vh-64px)] w-full flex-col items-center justify-center gap-6 px-6 py-2 text-center'>
      {/* The cards' HUMANS/AGENTS labels + bullets already make the "context vs scale"
          contrast — so the headline drops those setup sentences and leads with the thesis
          alone. Less text, more space, bigger type. */}
      <Heading
        level={1}
        className='max-w-[760px] text-balance font-sans text-2xl leading-tight font-extrabold tracking-tight text-foreground sm:text-2xl md:text-3xl lg:text-3xl'
      >
        AI agents move fast. Your standards should not disappear.
      </Heading>

      {/* A DEFINITE-width grid (max-w + w-full) with two `minmax(0,1fr)` tracks — equal
          columns regardless of content. `inline-grid` (fit-content) sized each track to its
          own bullet widths, which is why the two cards landed different widths. Cards are
          `w-full` so each fills its equal cell exactly. */}
      <div className='grid w-full max-w-[880px] grid-cols-1 items-stretch gap-y-6 sm:grid-cols-2 sm:gap-x-8'>
        <Card className='w-full'>
          <CardContent>
            {/* Label lives INSIDE the card now, on top, above the canvas+bullets row.
                Both columns render the SAME TwoErasCanvas, `kind` apart — identical layout,
                sphere, row baseline and cadence, so the two stay pixel-aligned side by side. */}
            <Flex direction='column' align='center' gap={3}>
              <Text as='p' className='text-center font-mono text-xl text-primary'>
                HUMANS CODING
              </Text>
              <TwoErasCanvas kind='human' layout='landscape' />
              <PointList points={HUMAN_POINTS} icon={Check} iconClassName='size-5 shrink-0 text-success' />
            </Flex>
          </CardContent>
        </Card>

        <Card className='w-full'>
          <CardContent>
            <Flex direction='column' align='center' gap={3}>
              <Text as='p' className='text-center font-mono text-xl text-primary'>
                AGENTS CODING
              </Text>
              <TwoErasCanvas kind='agent' layout='landscape' />
              <PointList points={AGENT_POINTS} icon={X} iconClassName='size-5 shrink-0 text-destructive' />
            </Flex>
          </CardContent>
        </Card>
      </div>

      {/* The canvases render immediately (no reveal animation to wait on, unlike the
          random-question text this replaced), so the button just fades in on a short
          fixed delay instead of an onAllRevealed callback. */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
        <ScrollButton targetId='protected'>
          Meet Vinaya
          <ArrowDown className='size-5' />
        </ScrollButton>
      </motion.div>
    </section>
  )
}
