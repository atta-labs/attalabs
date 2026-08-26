import { getRoadmapMilestones, type RoadmapMilestone } from '@atta/cms'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import { ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import type { ComponentType, SVGProps } from 'react'
import { getPublishedVersion } from '@/lib/published-version'
import { deriveStatus } from './_lib/derive-status'
import MilestoneLayerMark from './_marks/0.19.0-milestone-layer.svg'
import DeterminismHardeningMark from './_marks/0.20.0-determinism-hardening.svg'
import AgenticInterfaceMark from './_marks/0.21.0-agentic-interface.svg'
import ReviewThatAnswersItselfMark from './_marks/0.22.0-review-that-answers-itself.svg'
import TaskFinishesItselfMark from './_marks/0.23.0-task-finishes-itself.svg'
import TrancheFinishesItselfMark from './_marks/0.24.0-tranche-finishes-itself.svg'
import MilestoneFinishesItselfMark from './_marks/1.0.0-milestone-finishes-itself.svg'

export const metadata: Metadata = {
  title: 'Roadmap · Vinaya'
}

// CMS-backed product page — five roadmap items live as `roadmapMilestone`
// documents in Sanity, not as a hardcoded array. A content editor adds,
// edits, or reorders them from Studio without a code change; this route
// just reads and renders `getRoadmapMilestones()`'s manual `order`.
//
// Deliberately NOT derived from forge state (`listTranches()` / Milestones):
// that spawns `gh` subprocesses which 500 in prod on Vercel, the same reason
// `studio/*` pages `notFound()` there. Content comes from Sanity, not from
// GitHub — CMS is not forge, so this route still has NO forge dependency.
//
// That is a data-source property, not a rendering mode: like every route in
// this app it still builds as `ƒ (Dynamic)`, because the root layout fetches
// CMS config. "No forge dependency" — never "statically prerendered".
async function loadMilestones(): Promise<RoadmapMilestone[] | null> {
  try {
    return await getRoadmapMilestones()
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[roadmap] getRoadmapMilestones failed:', err)
    }
    return null
  }
}

const STATUS_LABEL: Record<RoadmapMilestone['status'], string> = {
  shipping: 'Shipping',
  planned: 'Planned',
  dropped: 'Dropped'
}

const STATUS_BADGE_CLASS: Record<RoadmapMilestone['status'], string> = {
  shipping: 'text-success border-success/40',
  planned: 'text-primary border-primary/40',
  dropped: 'border-dashed text-muted-foreground line-through'
}

function StatusBadge({ status }: { status: RoadmapMilestone['status'] }) {
  return (
    <Badge variant='outline' className={`shrink-0 font-mono text-xs font-normal ${STATUS_BADGE_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}

// The designer's marks are keyed by exact release `version`, matching each
// item's own field — SVGR-compiled (`next.config.ts`'s webpack/turbopack
// rules) so the markup lands inline in this page's own DOM, never behind an
// `<img src>`. That inlining is load-bearing, not a style choice: each mark
// themes itself entirely off `--primary`/`--card`/`--border`/`--foreground`
// custom properties, and those do not cross the separate-document boundary
// an `<img>`/`background-image` load creates — inlined, theme changes repaint
// the marks in the same paint as the rest of the UI; loaded as an image
// asset, they'd render in fixed fallback colors regardless of theme.
const MARK_BY_VERSION: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  '0.19.0': MilestoneLayerMark,
  '0.20.0': DeterminismHardeningMark,
  '0.21.0': AgenticInterfaceMark,
  '0.22.0': ReviewThatAnswersItselfMark,
  '0.23.0': TaskFinishesItselfMark,
  '0.24.0': TrancheFinishesItselfMark,
  '1.0.0': MilestoneFinishesItselfMark
}

// Icon-sized, beside the title — `48px`+ is the mark's own sizing floor
// ("line-art detail collapses below that"), and `64px` clears it with room
// to spare. Decorative: the CardTitle right next to it already carries this
// card's accessible name, so the whole visual (including each mark's own
// baked-in `role="img"`/`aria-label`) is hidden from assistive tech at this
// wrapper rather than announced twice. Prefers the inlined, themed mark for
// a known version; falls back to a CMS-uploaded `image` (works, but cannot
// theme — an editor adding a future item without a matching mark file);
// falls back to a placeholder glyph when neither exists.
function MilestoneVisual({ version, image }: { version: string; image: RoadmapMilestone['image'] }) {
  const Mark = MARK_BY_VERSION[version]

  return (
    <div aria-hidden className='relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-accent'>
      {Mark ? (
        // `mm` is re-passed alongside our own sizing class, not just
        // `size-full` alone: the source file's root carries `class="mm"`
        // (scopes each mark's own animation/reduced-motion rules to itself,
        // per the designer's integration brief), and SVGR spreads our
        // `className` prop onto that same root — replacing rather than
        // merging with the literal `class` attribute.
        <Mark className='mm size-full' />
      ) : image ? (
        <Image src={image.url} alt='' fill sizes='64px' className='object-cover' />
      ) : (
        <Flex align='center' justify='center' className='size-full text-accent-foreground'>
          <ImageIcon className='size-6' />
        </Flex>
      )}
    </div>
  )
}

export default async function RoadmapPage() {
  const [milestones, publishedVersion] = await Promise.all([loadMilestones(), getPublishedVersion()])

  return (
    <main className='mx-auto flex max-w-5xl flex-col gap-10 px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading level={1} className='font-serif text-3xl text-foreground sm:text-4xl'>
          Roadmap
        </Heading>
        <Text className='font-sans text-muted-foreground'>
          Where the harness is heading, held to three rules: no dates — items ship when they earn their place, not on a
          schedule; three honest states — every item is <strong>shipping</strong>, <strong>planned</strong>, or{' '}
          <strong>dropped</strong>, never left ambiguous; and no silent drops — an item we walk away from stays listed,
          struck through, instead of quietly disappearing from the page.
        </Text>
      </section>

      {milestones === null && (
        <Text as='p' className='font-sans text-sm text-muted-foreground'>
          Unable to load the roadmap right now.
        </Text>
      )}

      {milestones !== null && milestones.length === 0 && (
        <Text as='p' className='font-sans text-sm text-muted-foreground'>
          No roadmap items yet.
        </Text>
      )}

      {milestones !== null && milestones.length > 0 && (
        <section className='grid gap-6 sm:grid-cols-2'>
          {milestones.map((milestone) => {
            const status = deriveStatus(milestone, publishedVersion)
            return (
              <Card key={milestone._id}>
                <CardHeader>
                  <Flex align='start' justify='between' gap={4}>
                    <Flex align='center' gap={4}>
                      <MilestoneVisual version={milestone.version} image={milestone.image} />
                      <Flex direction='column' gap={1}>
                        <CardTitle
                          className={`font-serif text-xl font-normal text-foreground ${
                            status === 'dropped' ? 'line-through' : ''
                          }`}
                        >
                          {milestone.title}
                        </CardTitle>
                        <Text as='span' className='font-mono text-xs text-muted-foreground'>
                          v{milestone.version}
                        </Text>
                      </Flex>
                    </Flex>
                    <StatusBadge status={status} />
                  </Flex>
                </CardHeader>
                <CardContent className='flex flex-col gap-3'>
                  <Text as='p' className='font-sans text-sm text-muted-foreground'>
                    {milestone.description}
                  </Text>
                  <Text as='p' className='border-l-2 border-border pl-3 font-sans text-sm text-foreground'>
                    {milestone.truth}
                  </Text>
                </CardContent>
              </Card>
            )
          })}
        </section>
      )}

      <section className='flex flex-col gap-2 border-t border-border pt-8'>
        <Heading level={2} className='font-serif text-xl text-foreground'>
          Why this page exists
        </Heading>
        <Text as='p' className='font-sans text-sm text-muted-foreground'>
          A roadmap that only ever lists what shipped isn’t a roadmap — it’s a changelog wearing a roadmap’s name. This
          one holds the misses too, dashed and struck through rather than deleted, because a plan you can trust is one
          that shows its own dead ends.
        </Text>
      </section>
    </main>
  )
}
