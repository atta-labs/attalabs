'use client'

import { ArrowDown, Check, X } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@atta/ui'
import { Flex, Heading, Text } from '@atta/ui/shared'
import { LightSpeedEraCanvas } from './canvas/LightSpeedEraCanvas'
import { NormalEraCanvas } from './canvas/NormalEraCanvas'
import { ScrollButton } from './ScrollButton'

const HUMAN_POINTS = [
  'Opens a PR (40 files)',
  'Reads the ticket',
  'Learns the codebase by writing it',
  'Occasional tech debt',
  'Reviews a diff in 20 minutes',
  'Code grows, spec grows with it'
]

const AGENT_POINTS = [
  'Opens a PR (1,200 files)',
  'Copy-pastes the ticket',
  'Ships code nobody has read',
  'Invisible huge tech debt',
  "Can't finish reading - next one lands",
  'Code grows 100x, spec never catches up'
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
    <Flex direction='column' align='start' justify='start' gap={3}>
      {points.map((point) => (
        // align='start' — when a line wraps to two rows, the icon sits on the FIRST
        // row (top-aligned with the text block), not centered between both rows.
        <Flex key={point} align='start' gap={2}>
          <Icon className={`mt-0.5 ${iconClassName}`} />
          {/* max-w forces the longer lines to wrap onto a second row instead of
              stretching the card wider to fit them on one line. */}
          <Text size='sm' className='max-w-[190px] text-left'>
            {point}
          </Text>
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
    <section className='flex min-h-[calc(100vh-64px)] w-full flex-col items-center justify-center gap-12 px-6 py-2 text-center'>
      <Heading
        level={1}
        className='text-balance font-sans text-3xl leading-tight font-extrabold tracking-tight text-foreground sm:text-3xl md:text55xl lg:text-5xl'
      >
        Sustainable software development
        <br />
        for the <span className='rounded-lg bg-accent px-3'>AI era</span>.
      </Heading>

      {/* The only place the HUMANS/AGENTS CODING era canvases render — the standalone
          TwoErasSection this was cloned from is gone, absorbed here.
          inline-grid + grid-cols-2 (both tracks 1fr) is the CSS trick for "both columns
          equal width, sized to whichever content is wider" — NOT stretched to fill the
          page, NOT independently shrink-wrapped (which let the two cards land at
          different widths since the agent/human point lists are different lengths).
          inline-grid gives the whole block a fit-content outer size, same as the
          shrink-wrap look asked for before, but now the two 1fr columns are tied. */}
      <div className='inline-grid grid-cols-1 items-start gap-y-6 sm:grid-cols-2 sm:gap-x-8'>
        <Flex direction='column' align='stretch' gap={3}>
          <Text as='p' className='text-center font-mono text-xl text-primary'>
            HUMANS CODING
          </Text>
          <Card>
            <CardContent>
              {/* align='start' — the canvas and the list are direct row siblings (the
                  label lives above the row now, not inside one side of it), so the list's
                  first line lands at the same y as the canvas's own top edge, which is
                  where the archers' heads sit (the canvas is trimmed tight to its content,
                  "canvas ends where the painting ends" — see NormalEraCanvas). */}
              <Flex align='center' gap={3}>
                <NormalEraCanvas />
                <PointList points={HUMAN_POINTS} icon={Check} iconClassName='size-3.5 shrink-0 text-success' />
              </Flex>
            </CardContent>
          </Card>
        </Flex>

        <Flex direction='column' align='stretch' gap={3}>
          <Text as='p' className='text-center font-mono text-xl text-primary'>
            AGENTS CODING
          </Text>
          <Card>
            <CardContent>
              <Flex align='center' gap={3}>
                <LightSpeedEraCanvas />
                <PointList points={AGENT_POINTS} icon={X} iconClassName='size-3.5 shrink-0 text-destructive' />
              </Flex>
            </CardContent>
          </Card>
        </Flex>
      </div>

      {/* The canvases render immediately (no reveal animation to wait on, unlike the
          random-question text this replaced), so the button just fades in on a short
          fixed delay instead of an onAllRevealed callback. */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }}>
        <ScrollButton targetId='eras'>
          Show me more
          <ArrowDown className='size-5' />
        </ScrollButton>
      </motion.div>
    </section>
  )
}
