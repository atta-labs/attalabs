import { getRoadmapMilestones, type RoadmapMilestone } from '@atta/cms'
import { Heading, Text } from '@atta/ui/shared'
import type { Metadata } from 'next'
import { getPublishedVersion } from '@/lib/published-version'
import { DeploymentTrack, type DeploymentTrackItem } from './_components/DeploymentTrack'
import { deriveStatus } from './_lib/derive-status'

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

export default async function RoadmapPage() {
  const [milestones, publishedVersion] = await Promise.all([loadMilestones(), getPublishedVersion()])

  const items: DeploymentTrackItem[] | null =
    milestones === null
      ? null
      : milestones.map((milestone) => ({
          id: milestone._id,
          title: milestone.title,
          version: milestone.version,
          description: milestone.description,
          truth: milestone.truth,
          status: deriveStatus(milestone, publishedVersion),
          image: milestone.image
        }))

  return (
    <main className='mx-auto flex max-w-5xl flex-col gap-10 overflow-x-hidden px-8 py-8'>
      <section className='flex flex-col gap-4'>
        <Heading
          level={1}
          className='mx-auto mt-5 max-w-4xl font-serif font-normal text-4xl text-foreground tracking-tight sm:text-5xl lg:text-6xl'
        >
          Toward walk-away complete
        </Heading>
        <Text className='font-sans text-lg text-muted-foreground sm:text-xl'>
          The harness climbs one rung at a time
        </Text>
      </section>

      {items === null && (
        <Text as='p' className='font-sans text-sm text-muted-foreground'>
          Unable to load the roadmap right now.
        </Text>
      )}

      {items !== null && items.length === 0 && (
        <Text as='p' className='font-sans text-sm text-muted-foreground'>
          No roadmap items yet.
        </Text>
      )}

      {items !== null && items.length > 0 && <DeploymentTrack items={items} />}

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
