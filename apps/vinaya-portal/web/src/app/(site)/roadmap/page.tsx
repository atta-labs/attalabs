import { getRoadmapMilestones, type RoadmapMilestone } from '@atta/cms'
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@atta/ui/components'
import { Flex, Heading, Text } from '@atta/ui/shared'
import { ImageIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'

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

// Decorative — the CardTitle carries the meaning, same convention the
// hand-authored marks this replaces used (`aria-hidden` on the glyph).
function MilestoneVisual({ image, title }: { image: RoadmapMilestone['image']; title: string }) {
  return (
    <div className='relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-accent'>
      {image ? (
        <Image src={image.url} alt='' aria-hidden fill sizes='64px' className='object-cover' />
      ) : (
        <Flex align='center' justify='center' className='size-full text-accent-foreground'>
          <ImageIcon className='size-6' aria-hidden />
        </Flex>
      )}
      <span className='sr-only'>{title}</span>
    </div>
  )
}

export default async function RoadmapPage() {
  const milestones = await loadMilestones()

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
          {milestones.map((milestone) => (
            <Card key={milestone._id}>
              <CardHeader>
                <Flex align='start' justify='between' gap={4}>
                  <Flex align='center' gap={4}>
                    <MilestoneVisual image={milestone.image} title={milestone.title} />
                    <CardTitle
                      className={`font-serif text-xl font-normal text-foreground ${
                        milestone.status === 'dropped' ? 'line-through' : ''
                      }`}
                    >
                      {milestone.title}
                    </CardTitle>
                  </Flex>
                  <StatusBadge status={milestone.status} />
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
          ))}
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
