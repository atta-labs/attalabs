import { getRoadmapMilestones, orNull } from '@atta/cms'
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

export default async function RoadmapPage() {
  // `orNull` is `@atta/cms`'s own graceful-degradation contract (`getProductCms` uses
  // the same one for config/branding) — reused here instead of a second hand-rolled
  // try/catch/log with its own message format to keep in sync.
  const [milestones, publishedVersion] = await Promise.all([
    orNull('roadmap milestones', getRoadmapMilestones()),
    getPublishedVersion()
  ])

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
    </main>
  )
}
