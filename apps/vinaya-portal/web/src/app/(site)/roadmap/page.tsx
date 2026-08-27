import { getRoadmapMilestones, type RoadmapMilestone } from '@atta/cms'
import { Badge } from '@atta/ui/components'
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
//
// A local `orNull` rather than importing `@atta/cms`'s own (private) one of the same
// name — this task's surface is one new schema + one new query, not a change to the
// existing `product-cms.ts` module other packages' consumers already depend on.
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
    // `w-full`, no `max-w`/`mx-auto` here — this page's fabric backdrop lives on
    // `DeploymentTrack`'s own full-bleed outer box (see its comment), same split as
    // home's full-width sections (`page.tsx`'s `#next-steps`). Constraining THIS element
    // instead would cap the fabric at the reading column's width on any screen wider than
    // it, reproducing the gutter this structure exists to avoid.
    <main className='flex w-full flex-col gap-10 overflow-x-hidden py-8'>
      <section className='mx-auto flex w-full max-w-5xl flex-col gap-4 px-8'>
        <Heading
          level={1}
          className='mx-auto mt-5 max-w-4xl text-center font-serif font-normal text-4xl text-foreground tracking-tight sm:text-5xl lg:text-6xl'
        >
          Toward walk-away complete
        </Heading>
        <Text className='text-center font-mono text-2xl text-muted-foreground'>
          The harness climbs one rung at a time
        </Text>
        {!('fallback' in publishedVersion) && (
          <div className='flex justify-center'>
            <Badge variant='outline' className='font-mono text-xs font-normal text-muted-foreground'>
              @attalabs/vinaya@{publishedVersion.version}
            </Badge>
          </div>
        )}
        <Text
          as='p'
          className='mx-auto max-w-2xl text-center font-mono text-xs text-muted-foreground uppercase tracking-wide'
        >
          No dates, only versions · Three states — Shipped, Planned, Dropped · Nothing drops silently
        </Text>
      </section>

      {items === null && (
        <Text as='p' className='mx-auto w-full max-w-5xl px-8 font-sans text-sm text-muted-foreground'>
          Unable to load the roadmap right now.
        </Text>
      )}

      {items !== null && items.length === 0 && (
        <Text as='p' className='mx-auto w-full max-w-5xl px-8 font-sans text-sm text-muted-foreground'>
          No roadmap items yet.
        </Text>
      )}

      {items !== null && items.length > 0 && <DeploymentTrack items={items} />}

      <section className='mx-auto flex w-full max-w-3xl flex-col gap-3 px-8 pt-6 text-center'>
        <Text as='p' className='font-sans text-sm text-muted-foreground'>
          This is where unshipped capability is allowed to live. Every claim made on the rest of this site is already
          true; what is still coming is tracked here instead — against a real released version, never a date, and never
          removed without being marked Dropped.
        </Text>
      </section>
    </main>
  )
}
